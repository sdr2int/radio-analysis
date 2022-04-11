#!/usr/bin/env node

require('fast-require')({global: true, toRoot:   ['ramda']})
global.uws = uWebSocketsJs.App()

const noLog = /ping/

let start = new Date()
const T = () => {
  const message = `${-(start - new Date())}ms`

  start = new Date()

  return `\u001b[280C\u001b[${message.length}D${colors.grey(message)}\n`
}

global.pp = tap(x =>
  process.stdout.write(`${prettyjson.render(x, {
    dashColor: 'grey',
  })}${T()}`))

global.pe = tap(x =>
  process.stdout.write(`${prettyjson.render(x, {
    dashColor: 'red',
  })}${T()}`))

const msgpack = msgpack5()
const events = []

uws.on = (message, f) => {
  if (!events[message]) events[message] = []

  events[message].push(compose(Promise.resolve.bind(Promise), f))
}

uws.emit = curry((ws, event, data) => {
  const o = {[event]: data}

  if (ws.readyState == ws.OPEN) {
    ws.send(msgpack.encode(o), true)
    if (!noLog.test(event)) po(o)
    return
  }

  ws.outBuffer.push([event, data])
  return data
})

uws
  .get('/*', uwebsocketServe.serveDir('front'))
  .ws('/*', {
    compression:      uws.DEDICATED_COMPRESSOR_32KB,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout:      28,

    open: ws => {},

    message: (ws, message, isBinary) => {
      try {
        const data = msgpack.decode(Buffer.from(message))

        for (const event in data) {
          if (!events[event]) {
            pe({error: `No handler for "${event}"`, data})
            continue
          }

          for (const f of events[event]) {
            f(ws, data[event])
              .then(x => x && uws.emit(ws, event, x))
              .catch(x => pe(x) && uws.emit(ws, `${event}:error`, x))
          }

          if (!noLog.test(event)) pp({[event]: data[event]})
        }
      } catch (e) {
        pe(e, message)
      }
    },

    close: (ws, code, message) => {},
  })

uws.on('ping', () => {})
uws.listen('127.0.0.1', 3000, listenSocket => pp({3000: 'listening'}))
