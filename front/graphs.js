Chart.defaults.color = 'white'
const createGraph = datasets => {
  window.Graph = new Chart('graph', {
    type:    'line',
    data:    {
      datasets,
    },
    options:             {
      responsive:          true,
      // maintainAspectRatio: false,
      animation:           false,
      plugins:    {
        // legend: {
        //   display: false,
        // },
        tooltip: {
          mode:      'interpolate',
          intersect: false,
        },
        crosshair: {
          line:     {
            color: '#Fc0', // crosshair line color
            width: 1, // crosshair line width
          },
          // sync: {
          //   enabled:          true, // enable trace line syncing with other charts
          //   group:            1, // chart group
          //   suppressTooltips: false, // suppress tooltips when showing a synced tracer
          // },
          zoom: {
            enabled:                false, // enable zooming
          },
          //   zoomboxBackgroundColor: 'rgba(66,133,244,0.2)', // background color of zoom box
          //   zoomboxBorderColor:     '#48F', // border color of zoom box
          //   zoomButtonText:         'Reset Zoom', // reset zoom button text
          //   zoomButtonClass:        'reset-zoom', // reset zoom button class
          // },
          // callbacks: {
          //   beforeZoom: () => function (start, end) { // called before zoom, return false to prevent zoom
          //     console.log(start, end)
          //     return true
          //   },
          //   afterZoom: () => function (start, end) { // called after zoom
          //     console.log(start, end)
          //     Graph.update()
          //   },
          // },
        },
      },
    },
  })
}
