#!/usr/bin/env node

require('fast-require')({global: true, toRoot:   ['ramda'], require: ['fs'], without: ['chart.js', 'chartjs-plugin-crosshair']})

global.uws = uWebSocketsJs.App()

global.newHash = (x = new Date().getTime() + Math.random()) =>
  jsSha3.sha3_256(`${String(x)}Ködkürt / Foghorn`)

const noLog = /ping|session|station:all/

let start = new Date()
const T = () => {
  const message = `${-(start - new Date())}ms`

  start = new Date()

  return `\u001b[280C\u001b[${message.length}D${colors.grey(message)}\n`
}

global.pp = tap(x =>
  process.stdout.write(`${prettyjson.render(x, {keysColor: 'green', dashColor: 'green'})}${T()}`))
global.pe = tap(x =>
  process.stdout.write(`${prettyjson.render(x, {keysColor: 'red', dashColor: 'red'})}${T()}`))
global.po = tap(x =>
  process.stdout.write(`${prettyjson.render(x, {keysColor: 'yellow', dashColor: 'yellow'})}${T()}`))

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
uws.on("station:create", (ws, station) => pg.insert('station', station))
uws.on('stations', () => pg.exec('SELECT * FROM station'))
uws.on('session', (ws, x) => pg.scan('SELECT * FROM session WHERE created_at > $1 AND created_at < $2 ORDER BY created_at DESC', x, s => uws.emit(ws, 'session', s)))
uws.on('station:all', (ws, x) => pg.exec('SELECT * FROM station'))

const CONNECTION_STRING = 'postgresql://localhost/radioanalysis'

pgLibpq.connect('postgresql://localhost/radioanalysis').then(client => {
  global.pg = client
  pg.insert = (table, data) => pg.execParams(`INSERT INTO "${table}" (${keys(data)}) VALUES(${map(x => `$${x + 1}`, range(0, length(keys(data))))}) RETURNING *;`, values(data))


  pg.scan = (query, params = [], handler, batch = 100) => {
    const cursor = slice(0, 20, newHash(query))

    return pgLibpq.connect(CONNECTION_STRING)
      .then(pool => pool.exec('BEGIN').then(() => pool))
      .then(pool => {
        const close = () => pool.exec(`CLOSE "${cursor}"; COMMIT`).then(() => pool.finish())

        return pool.execParams(`DECLARE "${cursor}" CURSOR FOR ${query};`, params)
          .then(() => {
            const next = () => pool.exec(`FETCH ${batch} "${cursor}"`)
              .then(x => {
                if (isEmpty(x))
                  return close()
                return Promise.resolve(handler(x)).then(next)
              })

            return next()
          })
          .catch(tap(e => {
            console.error(e)
            return close()
          }))
      })
  }


  chokidar.watch('./csv').on('change', (filename, event) => {
    fs.createReadStream(filename)
      .pipe(csvParser(['date', 'time', 'colorcode', 'type', 'cid', 'rid', 'dcc', 'options']))
      .on('data', x =>
        pg.insert('session', mergeWith(identity, omit(['date', 'time'], x), {station: filename, created_at: new Date(Date.parse(`${replace(/(\d+)\.(\d+)\.(\d+)/, '$3-$2-$1', x.date)} ${x.time}`))}))
          .catch(console.error),
      )
      .on('end', () => {})
  })

  pg.exec(`SELECT * FROM station`).catch(e => {
    pg.exec(`DROP TABLE IF EXISTS station;
      CREATE TABLE station (station VARCHAR(255), date TIMESTAMP WITH TIME ZONE NOT NULL, lat REAL, long REAL, address VARCHAR(255), path TEXT);
      CREATE INDEX station_idx ON public."station" (station, date, address);`)
  })

  pg.exec('SELECT created_at FROM session').catch(e => pg.exec(`DROP TABLE IF EXISTS session;
      CREATE TABLE session (station VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE NOT NULL, colorcode INT, type TEXT, cid INT, rid INT, dcc INT, options TEXT);
      CREATE UNIQUE INDEX session_uniq_idx ON public."session" (station, cid, rid, created_at, colorcode);
    `))

  uws.listen('127.0.0.1', 3000, listenSocket => pp({3000: 'listening'}))
})
