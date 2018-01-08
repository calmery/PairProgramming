const ws = new WebSocket( `ws://${window.location.host}` )

const connections = {}

const createPeerConnection = id => {
  const peer = new RTCPeerConnection( {
    iceServers: [ {
      urls: 'stun:stun.l.google.com:19302'
    } ]
  } )

  peer.oniceconnectionstatechange = _ => {
    switch( peer.iceConnectionState ){
      case 'closed':
      case 'disconnected':
      case 'failed':
        delete connections[id]
    }
  }

  peer.onicecandidate = e => {
    if( e.candidate === null )
      ws.send( JSON.stringify( { id, description: peer.localDescription } ) )
  }

  // Data Channel

  const dataChannel = peer.createDataChannel( 'sendDataChannel' )

  peer.ondatachannel = e =>
    e.channel.onmessage = event =>
      console.log( event.data )

  return { peer, dataChannel }
}

ws.onmessage = message => {
  const data = JSON.parse( message.data )

  if( data.connections ){
    data.connections.forEach( id => {
      if( !connections[id] ){
        const { peer, dataChannel } = createPeerConnection( id )

        peer.createOffer()
          .then( description => peer.setLocalDescription( description ) )
          .catch( console.error )

        connections[id] = { peer, dataChannel }
      }
    } )
  } else {
    const { id, description } = data

    if( description.type === 'offer' ){
      const { peer, dataChannel } = createPeerConnection( id )

      peer.setRemoteDescription( description )
      peer.createAnswer()
        .then( description => peer.setLocalDescription( description ) )
        .catch( console.error )

      connections[id] = { peer, dataChannel }
    } else if( description.type === 'answer' ){
      if( connections[id] )
        connections[id].peer.setRemoteDescription( description )
    }
  }
}
