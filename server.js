#!/usr/bin/env node

require('fast-require')({global: true, toRoot:   ['ramda']})
global.uws = uWebSocketsJs.App()

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

uws
.get('/*', uwebsocketServe.serveDir('front'))
.ws('/*', {
  compression:      uws.DEDICATED_COMPRESSOR_32KB,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout:      28,

  open: ws => {},

  message: (ws, message, isBinary) => {
    try {
      const data = notepackIo.decode(Buffer.from(message))

      for (const event in data) {
        if (!events[event]) {
          pe({error: `No handler for "${event}"`, data})
          continue
        }

        for (const f of events[event]) {
          f(ws, data[event])
            .then(x => x && emit(ws, event, x))
            .catch(x => pe(x) && emit(ws, `${event}:error`, x))
        }

        if (!noLog.test(event)) pp({[event]: data[event]})
      }
    } catch (e) {
      pe(e, message)
    }
  },

  close: (ws, code, message) => {},
})

uws.listen('127.0.0.1', 3000, listenSocket => pp({[3000]: 'listening'}))
