const ws = new WebSocket( `ws://${window.location.host}` )

const connections = {}

const local = document.getElementById( 'local' )
const remote = document.getElementById( 'remote' )

// Local Editor

const textarea = document.createElement( 'textarea' )
local.appendChild( textarea )

const localEditor = CodeMirror.fromTextArea( textarea, {
  mode: 'javascript',
  lineNumbers: true,
  indentUnit: 2,
  theme: 'solarized dark'
} )

localEditor.setSize( local.clientWidth, window.innerHeight )

localEditor.on( 'change', _ =>
  Object
    .values( connections )
    .forEach( connection =>
      connection.dataChannel.send( localEditor.getDoc().getValue() ) )
)

// Control external sockets

const createPeerConnection = id => {
  const textarea = document.createElement( 'textarea' )
  remote.appendChild( textarea )

  const editor = CodeMirror.fromTextArea( textarea, {
    mode: 'javascript',
    lineNumbers: true,
    indentUnit: 2,
    theme: 'solarized dark'
  } )

  editor.setSize( remote.clientWidth, 200 )

  // WebRTC

  const peer = new RTCPeerConnection( {
    iceServers: [ {
      urls: 'stun:stun.l.google.com:19302'
    } ]
  } )

  peer.ondatachannel = event => {
    event.channel.onmessage = event =>
      editor.getDoc().setValue( event.data )

    event.channel.onopen = _ =>
      dataChannel.send( localEditor.getDoc().getValue() )
  }

  // Data Channel

  const dataChannel = peer.createDataChannel( 'sendDataChannel' )

  dataChannel.onopen = _ =>
    dataChannel.send( localEditor.getDoc().getValue() )

  peer.oniceconnectionstatechange = _ => {
    switch( peer.iceConnectionState ){
      case 'disconnected':
      case 'failed':
      case 'closed':
        remote.removeChild( textarea )
        remote.removeChild( editor.getWrapperElement() )
        delete connections[id]
    }
  }

  peer.onicecandidate = e => {
    if( e.candidate === null )
      ws.send( JSON.stringify( { id, description: peer.localDescription } ) )
  }

  return { editor, textarea, peer, dataChannel }
}

window.addEventListener( 'resize', _ => {
  localEditor.setSize( local.clientWidth, window.innerHeight )
  Object
    .values( connections )
    .forEach( connection =>
      connection.editor.setSize( remote.clientWidth, 125 )
    )
} )

ws.onmessage = message => {
  const data = JSON.parse( message.data )

  if( data.connections ){
    data.connections.forEach( id => {
      if( !connections[id] ){
        const { peer } = connections[id] = createPeerConnection( id )

        peer.createOffer()
          .then( description => peer.setLocalDescription( description ) )
          .catch( console.error )
      }
    } )
  } else {
    const { id, description } = data

    if( description.type === 'offer' ){
      const { peer } = connections[id] = createPeerConnection( id )

      peer.setRemoteDescription( description )
      peer.createAnswer()
        .then( description => peer.setLocalDescription( description ) )
        .catch( console.error )
    } else if( description.type === 'answer' ){
      if( connections[id] )
        connections[id].peer.setRemoteDescription( description )
    }
  }
}
