mapboxgl.accessToken = 'pk.eyJ1IjoiYW5ld3N3YXRjaGVyY29tIiwiYSI6ImNsMW0wejRtbTBiM2QzY3BxYnMzaXR6eXQifQ.gXsA_bB8KJjrsP_bW3OVFQ'

window.M = new mapboxgl.Map({
  container:         'map',
  style:             'mapbox://styles/mapbox/dark-v10',
  zoom:              1,
  boxZoom:           true,
  maxZoom:           17,
  minZoom:   3,
  center:    [31, 49],
  zoom:      9,
})

M.onclick = () => {}

window.mapLoaded = new Promise(resolve => M.on('load', resolve))

mapLoaded.then(() => {
  M.on('click', e => {
    const {lngLat: {lat, lng}} = e

    M.onclick({lat, long: lng})
  })
})

M.on('load', () => {
  M.addSource('station', {
    type:           'geojson',
    cluster:        true,
    clusterMaxZoom: 14,
    clusterRadius:  50,
    data:           {
      type:     "FeatureCollection",
      features: [],
    },

  })

  M.addLayer({
    id:     'clusters',
    type:   'circle',
    source: 'station',
    filter: ['has', 'point_count'],
    paint:  {
      // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
      // with three steps to implement three types of circles:
      //   * Blue, 20px circles when point count is less than 100
      //   * Yellow, 30px circles when point count is between 100 and 750
      //   * Pink, 40px circles when point count is greater than or equal to 750
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#fb0',
        100,
        '#fff',
        750,
        '#fb0',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        100,
        30,
        750,
        40,
      ],
    },
  })

  M.addLayer({
    id:     'cluster-count',
    type:   'symbol',
    source: 'station',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count}',
      'text-size':  12,
    },
  })

  // inspect a cluster on click
  M.on('click', 'clusters', e => {
    const features = M.queryRenderedFeatures(e.point, {
      layers: ['clusters'],
    })

    Station.edit(path([0, 'properties'], features))
  })

  M.on('mouseenter', 'clusters', () => {
    M.getCanvas().style.cursor = 'pointer'
  })
  M.on('mouseleave', 'clusters', () => {
    M.getCanvas().style.cursor = ''
  })
})

M.updateStation = () => mapLoaded.then(() => {
  const C = []
  let previousDate = null
  const features = reject(isNil, map(x => {
    if (!x.position) return

    // debugger
    const [f, t] = DateRange.getDates()
    const sessions = filter(
      y => y.station == x.station
      && (previousDate ? y.created_at < previousDate : true)
      && y.created_at > x.date
      && y.created_at > f
      && y.created_at < t,
      sortBy(prop('created_at'), Session.list))

    previousDate = x.date

    const coordinates = map(parseFloat, split(',', x.position))

    C.push(coordinates)

    return {
      type:       "Feature",
      properties: merge({point_count: length(sessions)}, x),
      geometry:   {
        type: "Point", coordinates: reverse(coordinates),
      },
    }
  }, sortBy(x => -x.date, Station.list)))

  const bboxes = [sortBy(x => x[0], C), sortBy(x => x[1], C)]

  if (length(bboxes[0])) {
    M.fitBounds([[
      head(bboxes[1])[1],
      head(bboxes[0])[0],
    ], [
      last(bboxes[1])[1],
      last(bboxes[0])[0],
    ]], {padding: {top: 30, bottom: 30 + 300, left: 30, right: 30}}), {maxZoom: 10}
  }

  M.getSource('station').setData({
    type:     "FeatureCollection",
    features,
  })
})
