for (const m in R)
  if (['T', 'F'].indexOf(m) == -1) window[m] = R[m]

window.E = {
  nodebug: ['session'],
}

window.popup = {close: () => {}}
window.msgpack = msgpack5()
window.idb = new IdbKvStore('df')

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5ld3N3YXRjaGVyY29tIiwiYSI6ImNsMW0wejRtbTBiM2QzY3BxYnMzaXR6eXQifQ.gXsA_bB8KJjrsP_bW3OVFQ'

window.pp = tap(x => console.log(JSON.stringify(x, null, ' ')))
window.pe = tap(x => console.error(JSON.stringify(x, null, ' ')))

window.timer = (x, start = window.timer[x]) => {
  if (start) console.log(`${x}: ${new Date().getTime() - start}`)
  window.timer[x] = new Date().getTime()
}

window.M = new mapboxgl.Map({
  container:         'map',
  style:             'mapbox://styles/mapbox/dark-v10',
  zoom:              1,
  boxZoom:           true,
  maxZoom:           17,
  center:    [31, 49],
  zoom:      16,
})

window.I = selector => document.getElementById(replace(/^#/, '', selector))
window.S = selector =>
  Array.from(document.querySelectorAll(selector))
HTMLElement.prototype.S = function (selector) {
  return Array.from(this.querySelectorAll(selector))
}

window.on = Node.prototype.on = (events, f, options) => {
  events.split(/\s+/)
    .map(e => this.addEventListener(e, f, options))

  return this
}

window.ws = {}
window.ws.URL = `ws://${document.location.host}/ws`
window.ws.socket = new WebSocket(window.ws.URL)
window.ws.inBuffer = []
window.ws.socket.binaryType = 'arraybuffer'
window.ws.socket.onmessage = window.ws.inBuffer.push

ws.events = {connect: []}

ws.outBuffer = []

ws.pingInterval = () => {}

ws.checkOffline = () => {
  // I.offline.toggle(!navigator.onLine || ws.socket.readyState !== 1)
  if (ws.socket.readyState < 2) return
  ws.socket.close()
  ws.connect()
}

if (navigator.connection) { //Doesnt' work in Safari
  navigator.connection.addEventListener('change', ws.checkOffline)
}

ws.reconnectionInterval = () => {}

ws.setReconnectInterval = () => {
  clearInterval(ws.reconnectionInterval)
  if (ws.noreconnection) return

  ws.checkOffline()
  ws.reconnectionInterval = setInterval(ws.checkOffline, 500)
}

setTimeout(ws.setReconnectInterval, 100)
ws.connect = () => {
  if (ws.socket.readyState > ws.socket.OPEN)
    ws.socket = new WebSocket(ws.URL)

  window.ws.socket.binaryType = 'arraybuffer'

  ws.socket.onopen = () => {
    timer('connect')
    clearInterval(ws.pingInterval)
    ws.pingInterval = setInterval(() => ws.socket.readyState == ws.socket.OPEN && ws.socket.send(msgpack.encode({ping: new Date()})), 10000)
    ws.checkOffline()
    map(x => x(), ws.events.connect)
  }

  ws.socket.onmessage = message => {
    const data = msgpack.decode(message.data)

    for (const event in data) {
      if (!ws.events[event]) {
        pe({error: `No handler for '${event}'`, data})
        continue
      }

      for (let f of ws.events[event]) {
        if (!contains(event, ['directions', 'spectrogram']))
          console.log(`%c${contains(event, E.nodebug) ? event : JSON.stringify({[event]: data[event]}, null, ' ')}`, 'color: green')
        f(data[event])
      }
    }
  }

  setTimeout(() => map(ws.socket.onmessage, ws.inBuffer), 100)

  ws.socket.onclose = () => console.log('ws:closed')
  ws.socket.onerror = console.error.data
  return ws
}

ws.emit = mapObjIndexed((data, event) => {
  if (ws.socket.readyState == ws.socket.OPEN) {
    if (!contains(event, ['directions', 'spectrogram']))
      console.log(`%c${contains(event, E.nodebug) ? event : JSON.stringify({[event]: data}, null, ' ')}`, 'color: #ee5500')
    ws.socket.send(msgpack.encode({[event]: data}))
  } else {
    ws.outBuffer.push({[event]: data})
    idb.set('buffer', ws.outBuffer)
  }

  return ws
})

ws.on = (message, f) => {
  ws.events[message] = concat(defaultTo([], ws.events[message]), [f])
  return ws
}

ws.off = (message, f) => {
  ws.events[message] = difference(ws.events[message], [f])
  return ws
}

ws.QA = (event, f) => {
  ws.on(event, composeP(ws.emit(event), f))
  return ws
}


ws.sendOfflineBuffer = () => {
  if (!ws.outBuffer.length || ws.socket.readyState !== ws.socket.OPEN) return

  pp({outBuffer: ws.outBuffer})
  map(x => ws.emit(x), ws.outBuffer)
  ws.outBuffer = []
  idb.set('buffer', ws.outBuffer)
}

idb.get('buffer')
  .then((buffer = []) => ws.outBuffer = uniq(reject(isNil, concat(ws.outBuffer, buffer))))
  .then(ws.sendOfflineBuffer)

ws.connect().on('ping', identity)

window.mapLoaded = new Promise(resolve => M.on('load', resolve))

M.onclick = () => {}

mapLoaded.then(() => {
  M.on('click', e => {
    const {lngLat: {lat, lng}} = e

    M.onclick({lat, long: lng})
  })
})

window.Session = {
  list:    [],
  changed: false,
}
window.Station = {
  list: [],
}
ws.on('session', map(s => {
  window.Session.list.push(s)
  window.Session.changed = true
}))

setInterval(() => {
  if (!window.Session.changed) return


  const [f, t] = DateRange.getDates()
  const datasets  = values(addIndex(map)((x, i) => ({
    label:       head(x).station,
    fill:        false,
    borderColor: ['#fc0', 'rgb(75, 192, 192)'][i],
    data:        countBy(x => x.created_at.toISOString().slice(0, 13), x),
    // backgroundColor: [
    //
    //   pattern.draw('square', '#ff6384'),
    //   pattern.draw('circle', '#36a2eb'),
    //   pattern.draw('diamond', '#cc65fe'),
    //   pattern.draw('triangle', '#ffce56'),
    // ],

  }), groupBy(prop('station'), filter(x => x.created_at > f && x.created_at < t, Session.list))))

  if (!window.Graph)
    createGraph(datasets)
  else {
    Graph.data.datasets = datasets
    Graph.update()
  }
}, 1000)
ws.on('station:all', s => Station.list = s)

Datepicker.locales.uk = {
  days:        ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"],
  daysShort:   ["Нед", "Пнд", "Втр", "Срд", "Чтв", "Птн", "Суб"],
  daysMin:     ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  months:      ["Cічень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"],
  monthsShort: ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"],
  today:       "Сьогодні",
  clear:       "Очистити",
  format:      "dd.mm.yyyy",
  weekStart:   1,
}
window.DateRange = new DateRangePicker(I('daterange'), {autohide: true, language: 'uk'})
const now = new Date('2016-08-01')
const from = clone(now)

from.setMonth(from.getMonth() - 3)
DateRange.setDates(from, now)
DateRange.change = () => {
  ws.emit({session: DateRange.getDates()})
}

ws.on('connect', () => ws.emit({session: DateRange.getDates(), 'station:all': {}}))
