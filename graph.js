import Sigma from "sigma";
import Graph from "graphology";

const container = document.querySelector("#sigma")

const graph = new Graph()

graph.addNode("John", {x: 0, y: 10, size: 5, label: "John", color: "blue"})
graph.addNode("Mary", {x: 10, y: 0, size: 3, label: "Mary", color: "red"})

graph.addEdge("John", "Mary")

const renderer = new Sigma(graph, container)
