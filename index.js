const path = require( 'path' )
const express = require( 'express' )
const { Server } = require( 'ws' )
const uuid = require( 'uuid' )

const app = express()

app.use( express.static( path.resolve( __dirname, 'public' ) ) )

const server = app.listen( process.env.PORT || 3000, _ =>
  console.log( `localhost:${server.address().port}` )
)

const wss = new Server( { server } )

const connections = {}

wss.on( 'connection', ws => {
  ws.id = uuid()
  connections[ws.id] = ws

  ws.send( JSON.stringify( { connections: Object.keys( connections ).filter( id => ws.id !== id ) } ) )

  ws.on( 'message', data => {
    const { id, description } = JSON.parse( data )

    if( id && description && connections[id] )
      connections[id].send( JSON.stringify( { id: ws.id, description } ) )
  } )

  ws.on( 'close', _ => delete connections[ws.id] )

  ws.on( 'error', _ => _ )
} )
