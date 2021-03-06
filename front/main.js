const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000']

let interfaceLanguage = 'uk'
let interfaceLanguages = ['en', 'uk']

HTMLElement.prototype.trans = function (language = interfaceLanguage) {
  const placeholder = this.getAttribute('placeholder')
  const value = this.getAttribute('value')

  if (this.getAttribute('translations')) {
    mapObjIndexed((v, k) => this.setAttribute(k, v), JSON.parse(replace(/`/g, '"', this.getAttribute('translations'))))
    this.removeAttribute('translations')
  }

  if (!this.getAttribute('en') && find(x => this.getAttribute(x), interfaceLanguages))
    this.setAttribute('en', placeholder || value || this.innerHTML.replace(/\n.*/gim, ''))

  const translations = reject(isNil, map(this.getAttribute.bind(this), interfaceLanguages))

  if (length(translations) < 2) return

  const f = new RegExp(join('|', map(replace(/([\[\\^$.|?*+()])/gim, '\\$1'), translations)))
  const t = this.getAttribute(language)


  if (placeholder)
    return this.setAttribute('placeholder', placeholder.replace(f, t))

  if (value) //TODO: check it's not text
    return this.setAttribute('value', value.replace(f, t))


  if (isEmpty(adjust(0, x => x.replaceWith(t), this.S('.loader'))))
    this.innerHTML = this.innerHTML.replace(f, t)
}

window.trans = language => {
  console.log(language)
  interfaceLanguage = language || interfaceLanguage
  idb.set('language', interfaceLanguage)
  S('[uk]').map(x => x.trans(interfaceLanguage))
}


for (const m in R)
  if (['T', 'F'].indexOf(m) == -1) window[m] = R[m]

const merge = mergeWith(identity)

window.E = {
  nodebug: ['session'],
}

window.popup = {close: () => {}}
window.msgpack = msgpack5()
window.idb = new IdbKvStore('df')

idb.get('language').then(trans)

window.pp = tap(x => console.log(JSON.stringify(x, null, ' ')))
window.pe = tap(x => console.error(JSON.stringify(x, null, ' ')))

window.timer = (x, start = window.timer[x]) => {
  if (start) console.log(`${x}: ${new Date().getTime() - start}`)
  window.timer[x] = new Date().getTime()
}


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


window.Session = {
  list:    [],
  changed: false,
}
window.Station = {
  list: [],
}

Station.edit = x => {
  I('panel').style.display = 'block'
  Station.position()
  mapObjIndexed((v, k) => {
    if (I(k)) I(k).value = v
  }, x)
  DatePicker.setDate(new Date(x.date))
}

Station.add = x => {
  Station.edit({
    id:       '',
    station:  '',
    address:  '127.0.0.1',
    date:     new Date(),
    path:     '~/*.csv',
    position: '',
  })
}


Station.delete = station => ws.emit({'station:delete': station})

ws.on('station:delete', ([{id}]) => {
  Station.list = reject(x => x.id == id, Station.list)
  M.updateStation()
  I('panel').style.display = 'none'
})

Station.save = () => {
  const station = evolve({date: d => DatePicker.getDate()}, mergeAll(map(x => ({[x.id]: x.value}), I('values').S('input'))))

  if (isEmpty(station.id)) delete station.id

  ws.emit({'station:save': station})
  I('panel').style.display = 'none'
}
Station.sync = name => {
  ws.emit({'station:sync': name})
}
Station.position = () => {
  mode.map()
  M.onclick = ({lat, long}) => {
    I('position').value = `${parseFloat(lat.toFixed(3))},${parseFloat(long.toFixed(3))}`
    M.onclick = () => {}
  }
}

ws.on('session', map(s => {
  window.Session.list.push(s)
  window.Session.changed = true
}))

setInterval(() => {
  if (!window.Session.changed) return
  window.Session.changed = false

  const [f, t] = getDates()

  const datasets  = values(addIndex(map)((x, i) => ({
    label:       head(x).station,
    fill:        false,
    borderColor: colors[i],
    data:        countBy(x => x.created_at.toISOString().slice(0, 13), x),
    sessions:    x,
  }), groupBy(prop('station'), filter(x => x.created_at > f && x.created_at < t, sortBy(prop('created_at'), Session.list)))))

  updateTimeChart(datasets)
  updateGraph(datasets)
}, 300)


ws.on('stations', s => {
  Station.list = s
  M.updateStation()
})
ws.on('station:save', x => {
  ws.emit({stations: {}})
})

Datepicker.locales.uk = {
  days:        ["????????????", "??????????????????", "????????????????", "????????????", "????????????", "??'????????????", "????????????"],
  daysShort:   ["??????", "??????", "??????", "??????", "??????", "??????", "??????"],
  daysMin:     ["????", "????", "????", "????", "????", "????", "????"],
  months:      ["C??????????", "??????????", "????????????????", "??????????????", "??????????????", "??????????????", "????????????", "??????????????", "????????????????", "??????????????", "????????????????", "??????????????"],
  monthsShort: ["??????", "??????", "??????", "??????", "??????", "??????", "??????", "??????", "??????", "??????", "??????", "??????"],
  today:       "????????????????",
  clear:       "????????????????",
  format:      "yyyy-mm-dd",
  weekStart:   1,
}
window.DatePicker = new Datepicker(I('date'), {autohide: true, language: 'uk'})
DatePicker.setDate(new Date())

window.DateRange = new DateRangePicker(I('daterange'), {autohide: true, language: 'uk'})
const now = new Date() || new Date('2015-08-01')
const from = clone(now)

// from.setYear(1990)
from.setMonth(from.getMonth() - 3)
DateRange.setDates(from, now)
const getDates = () => {
  const dates = DateRange.getDates()

  dates[1].setDate(dates[1].getDate() + 1)
  return dates
}

DateRange.change = () => {
  ws.emit({session: getDates()})
  ws.emit({stations: {}})
}

S('.daterange').map(x => x.addEventListener("changeDate", () => {
  M.updateStation()
  DateRange.change()
  Session.changed = true
  console.log('changeDate')
}))

ws.on('connect', DateRange.change)

ws.on('station:sync', status => {
  if (status == 'ok') {
    I('sync').value = `?? ????'????????`
    DateRange.change()
  } else
    I('sync').value = `?????????? ????'????????. ???????????????????? ??????????`
})

const mode = {
  graph: () => {
    S('#mode input').map(x => x.classList.remove('selected'))
    I('graph-mode').classList.add('selected')
    I('map').style.visibility = 'hidden'
    I('graph').style.visibility = 'visible'
  },
  map:   () => {
    S('#mode input').map(x => x.classList.remove('selected'))
    I('map-mode').classList.add('selected')
    I('map').style.visibility = 'visible'
    I('graph').style.visibility = 'hidden'
    // I('graph').style.display = 'none'
    // I('map').style.display = 'block'
  },
}

mode.graph()

const uploadCSV = () => {
  fetch(`csv?fileName=${prompt('?????????????? ?????????? ??????????')}`, {
    method:  'POST',
    headers: {"Content-Type": "multipart/form-data;"},
    body:    document.getElementById('csv').files[0],
  })
}
