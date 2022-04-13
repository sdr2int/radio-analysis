const container = document.getElementById("graph")
const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000']

const graph = new Graph()

window.updateGraph = datasets => {
  graph.clear()

  map(station => {
    map(x => {
      // console.log(x)
      try {
        graph.addNode(x.cid, {size: 15, label: x.cid, color: colors[x.colorcode], x: 100, y: 20})
      } catch (e) {}
      try {
        graph.addNode(x.rid, {size: 15, label: x.rid, color: colors[x.colorcode], x: 100, y: 20})
      } catch (e) {}

      try {
        graph.addEdge(x.cid, x.rid, {type: "line", label: "works with", size: 5})
      } catch (e) {}
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
}
const renderer = new Sigma(graph, container, {
  // nodeProgramClasses: {
  //   // image:  getNodeProgramImage(),
  //   // border: NodeProgramBorder,
  // },
  renderEdgeLabels: true,
})

// // Create the spring layout and start it
// const layout = new ForceSupervisor(graph);
// layout.start();
