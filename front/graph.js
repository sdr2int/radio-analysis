const container = document.getElementById("graph")
const searchInput = document.getElementById("search-input")
const searchSuggestions = document.getElementById("suggestions")

const graph = new Graph()

window.updateGraph = datasets => {
  graph.clear()

  const c = c => colvertize.convert(c, 'css-hex', colvertize.contrastBrightness({contrast: 2}))


  map(station => {
    map(x => {
      // console.log(x)
      try {
        graph.addNode(x.cid, {size: 30, label: x.cid, color: c(colors[x.colorcode], 20), labelColor: "white", labelWeight: 'bold', count: 1, type: "image", image: "./station.svg"})
      } catch (e) {
        graph.updateNode(x.cid, attr => ({
          ...attr,
          count: attr.count + 1,
        }))
      }
      try {
        graph.addNode(x.rid, {size: 15, label: x.rid, color: colors[x.colorcode], labelColor: 'white', count: 1, type: "image", image: "./user.svg"})
      } catch (e) {
        graph.updateNode(x.rid, attr => ({
          ...attr,
          count: attr.count + 1,
        }))
      }

      try {
        graph.addEdge(x.cid, x.rid, {type: "line", size: 1, count: 1, label: 1})
      } catch (e) {
        graph.updateEdge(x.cid, x.rid, attr => ({
          ...attr,
          count: attr.count + 1,
          label: String(attr.count),
          size:  Math.ceil(Math.sqrt(attr.count) / 3),
        }))
      }
    }, station.sessions)
  }, datasets)


  // graph.addNode(1, {size: 15, label: "John", color: colors[1], x: 100, y: 20})
  // graph.addNode(2, {size: 15, label: "Mary", color: colors[2], x: 10, y: 20})
  // // graph.addNode("Suzan", {size: 15, label: "Suzan", type: "image", image: "./user.svg", color: RED})
  // // graph.addNode("Nantes", {size: 15, label: "Nantes", type: "image", image: "./city.svg", color: BLUE})
  // // graph.addNode("New-York", {size: 15, label: "New-York", type: "image", image: "./city.svg", color: BLUE})
  // // graph.addNode("Sushis", {size: 7, label: "Sushis", type: "border", color: GREEN})
  // // graph.addNode("Falafels", {size: 7, label: "Falafels", type: "border", color: GREEN})
  // // graph.addNode("Kouign Amann", {size: 7, label: "Kouign Amann", type: "border", color: GREEN})
  // graph.addEdge(1, 2, {type: "line", label: "works with", size: 5})

  graph.nodes().forEach((node, i) => {
    const angle = i * 2 * Math.PI / graph.order

    graph.setNodeAttribute(node, "x", 100 * Math.cos(angle))
    graph.setNodeAttribute(node, "y", 100 * Math.sin(angle))
  })

  const layout = new ForceSupervisor(graph, {isNodeFixed: (_, attr) => attr.highlighted})

  layout.start()

  searchSuggestions.innerHTML = graph
    .nodes()
    .map(node => `<option value="${graph.getNodeAttribute(node, "label")}" onclick='setHoveredNode("${node}")'></option>`)
    .join("\n")
}


function setSearchQuery (query) {
  state.searchQuery = query

  if (searchInput.value !== query) searchInput.value = query

  if (query) {
    const lcQuery = query.toLowerCase()
    const suggestions = graph
      .nodes()
      .map(n => ({id: n, label: graph.getNodeAttribute(n, "label")}))
      .filter(({label}) => String(label).toLowerCase()
        .includes(lcQuery))

    // If we have a single perfect match, them we remove the suggestions, and
    // we consider the user has selected a node through the datalist
    // autocomplete:
    if (suggestions.length === 1 && suggestions[0].label == query) {
      state.selectedNode = suggestions[0].id
      state.suggestions = undefined

      state.selectedNodeNeighbors = new Set(graph.neighbors(state.selectedNode))

      // Move the camera to center it on the selected node:
      const nodePosition = renderer.getNodeDisplayData(state.selectedNode)

      renderer.getCamera().animate(nodePosition, {
        duration: 500,
      })
    }
    // Else, we display the suggestions list:
    else {
      state.selectedNode = undefined
      state.suggestions = new Set(suggestions.map(({id}) => id))
    }
  }
  // If the query is empty, then we reset the selectedNode / suggestions state:
  else {
    state.selectedNode = undefined
    state.suggestions = undefined
  }

  // Refresh rendering:
  renderer.refresh()
}

function setHoveredNode (node) {
  if (node) {
    state.hoveredNode = node
    state.hoveredNeighbors = new Set(graph.neighbors(node))
  } else {
    state.hoveredNode = undefined
    state.hoveredNeighbors = undefined
  }

  // Refresh rendering:
  renderer.refresh()
}

searchInput.addEventListener("input", () => {
  setSearchQuery(searchInput.value || "")
})
searchInput.addEventListener("blur", () => {
  setSearchQuery("")
})

function labelRenderer (context, data, settings) {
  if (!data.label) return

  const size = settings.labelSize
  const font = settings.labelFont
  const weight = data.labelWeight || settings.labelWeight

  const color = settings.labelColor.attribute
    ? data[settings.labelColor.attribute] || settings.labelColor.color || "#fff"
    : settings.labelColor.color

  context.fillStyle = color
  context.font = `${weight} ${size}px ${font}`

  context.fillText(`${data.label} [${data.count}]`, data.x + data.size + 3, data.y + size / 3)
}

function hoverRenderer (context, data, settings) {
  const size = settings.labelSize
  const font = settings.labelFont
  const weight = settings.labelWeight

  context.font = `${weight} ${size}px ${font}`

  // Then we draw the label background
  context.fillStyle = "#262422"
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = 8
  context.shadowColor = "#000"

  const PADDING = 2

  if (typeof data.label === "string") {
    const textWidth = context.measureText(data.label).width
    const boxWidth = Math.round(textWidth + 5)
    const boxHeight = Math.round(size + 2 * PADDING)
    const radius = Math.max(data.size, size / 2) + PADDING

    const angleRadian = Math.asin(boxHeight / 2 / radius)
    const xDeltaCoord = Math.sqrt(Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)))

    context.beginPath()
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2)
    context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2)
    context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2)
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2)
    context.arc(data.x, data.y, radius, angleRadian, -angleRadian)
    context.closePath()
    context.fill()
  } else {
    context.beginPath()
    context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2)
    context.closePath()
    context.fill()
  }

  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = 0

  // // And finally we draw the label
  labelRenderer(context, data, settings)
}

// Sigma.settings.
const renderer = new Sigma(graph, container, {
  minEdgeSize:        1,
  maxEdgeSize:        4,
  edgeLabelSize:      'proportional',
  labelColor:         {attribute: "labelColor"},
  // edgeLabelColor:   {color: "#000"},
  hoverRenderer,
  labelRenderer,
  autoRescale:            ["nodePosition", "nodeSize"],
  //   labelThreshold:         0,
  //   adjustSizes:            true,
  //   fixed:                  true,
  //   labelHoverBGColor:      "#f45b3d",
  //   nodeMargin:             50,
  //   nodesPowRatio:          1,
  //   defaultNodeBorderColor: '#000000',
  //   minArrowSize:           7,
  //   drawLabels:             false,
  //   edgeLabelColor:         '#fff',
  nodeProgramClasses: {
    image:  getNodeProgramImage(),
  //   // border: NodeProgramBorder,
  },
  renderEdgeLabels:  true,
})

const state = {
  hoveredNode:           null,
  searchQuery:           "",
  selectedNode:          null,
  selectedNodeNeighbors:     null,
  suggestions:           null,
  hoveredNeighbors:      null,
}

renderer.on("enterNode", ({node}) => {
  setHoveredNode(node)
})
renderer.on("leaveNode", () => {
  setHoveredNode(undefined)
})


renderer.setSetting("nodeReducer", (node, data) => {
  const res = data

  if (state.hoveredNeighbors && !state.hoveredNeighbors.has(node)) {
    if (state.hoveredNode !== node) {
      res.label = ""
      res.color = "#f6f6f6"
    }
  }

  if (state.selectedNode === node)
    res.highlighted = true
  else if (state.selectedNode && state.selectedNodeNeighbors && !state.selectedNodeNeighbors.has(node)) {
    res.label = ""
    res.color = "#f6f6f6"
  } else if (state.suggestions && !state.suggestions.has(node)) {
    res.label = ""
    res.color = "#f6f6f6"
  }

  return res
})

renderer.setSetting("edgeReducer", (edge, data) => {
  const res = data

  if (state.hoveredNode && !graph.hasExtremity(edge, state.hoveredNode))
    res.hidden = true


  if (state.suggestions && (!state.suggestions.has(graph.source(edge)) || !state.suggestions.has(graph.target(edge))))
    res.hidden = true


  return res
})
