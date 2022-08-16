const { warn, random } = require("./utils.js");
const config = require("./config.js");

const Node = require("./Node.js");

function cantor(k1, k2) {
  return 1 / 2 * (k1 + k2) * (k1 + k2 + 1) + k2;
}

class Genome {
	constructor(neat, options) {
    this.neat = neat;
    options = options || {};
		this.nodes = options.nodes || [];
		this.connections = options.connections || [];
		this.fitness = options.fitness || 0;

		if (!options.cloned) {
			//Create nodes from each layer
			//Input layer
			let inputNodes = [];
			for (var i = 0; i < this.neat.input; i++) {
				let node = new Node({
					genome: this,
					layer: "input",
					activationIndex: this.nextIndex()
				});
				inputNodes.push(node);
				this.nodes.push(node);
			}

			//Hidden layer
			let hiddenNodes = [];
			//Check if hidden isn't multi-layered
			if (!Array.isArray(this.neat.hidden)) {
				for (var i = 0; i < this.neat.hidden; i++) {
					let node = new Node({
						genome: this,
						layer: "hidden",
						activationIndex: this.nextIndex()
					});
					hiddenNodes.push(node);
					this.nodes.push(node);
				}
			} else {
				for (var i = 0; i < this.neat.hidden.length; i++) {
					let hidden = this.neat.hidden[i];
					let nodeArray = [];
					for (var j = 0; j < hidden; j++) {
						let node = new Node({
							genome: this,
							layer: `hiddenLayer${i+1}`,
							activationIndex: this.nextIndex()
						});
						nodeArray.push(node);
						this.nodes.push(node);
					}
					hiddenNodes.push(nodeArray)
				}
			}

			//Output layer
			let outputNodes = [];
			for (var i = 0; i < this.neat.output; i++) {
				let node = new Node({
					genome: this,
					layer: "output",
					activationIndex: this.nextIndex()
				});
				outputNodes.push(node);
				this.nodes.push(node);
			}

			//Connect all nodes
			//Input to hidden
			//Check if hidden isn't multi-layered
			if (!Array.isArray(this.neat.hidden)) {
				for (var i = 0; i < inputNodes.length; i++) {
					let inputNode = inputNodes[i];
					for (var j = 0; j < hiddenNodes.length; j++) {
						let hiddenNode = hiddenNodes[j];
						inputNode.connectTo(hiddenNode);
					}
				}
			} else {
				//If hidden is multi-layered
				let firstHiddenLayer = hiddenNodes[0];
				for (var i = 0; i < inputNodes.length; i++) {
					let inputNode = inputNodes[i];
					for (var j = 0; j < firstHiddenLayer.length; j++) {
						let firstHiddenLayerNode = firstHiddenLayer[j];
						inputNode.connectTo(firstHiddenLayerNode);
					}
				}
			}

			//Check if hidden isn't multi-layered
			if (!Array.isArray(this.neat.hidden)) {
				//If not, simply connect hidden to output
				for (var i = 0; i < hiddenNodes.length; i++) {
					let hiddenNode = hiddenNodes[i];
					for (var j = 0; j < outputNodes.length; j++) {
						let outputNode = outputNodes[j];
						hiddenNode.connectTo(outputNode);
					}
				}
			} else {
				//If hidden is multi-layered
				let hiddenLayers = hiddenNodes;
				for (var i = 0; i < hiddenLayers.length; i++) {
					let currentLayer = hiddenLayers[i];
					let nextLayer = hiddenLayers[i + 1];
					//Check if there's a next layer
					if (nextLayer) {
						//Connect the current layer's nodes to the next layer's nodes
						for (var j = 0; j < currentLayer.length; j++) {
							let currentLayerNode = currentLayer[j];
							for (var k = 0; k < nextLayer.length; k++) {
								let nextLayerNode = nextLayer[k];
								currentLayerNode.connectTo(nextLayerNode);
							}
						}
					} else {
						//If there's no next layer, then it means that this is the last layer of multi-layered hidden
						//Connect this last layer's nodes to output layer's nodes
						let lastLayer = hiddenLayers[i];
						for (var j = 0; j < lastLayer.length; j++) {
							let lastLayerNode = lastLayer[j];
							for (var k = 0; k < outputNodes.length; k++) {
								let outputLayerNode = outputNodes[k];
								lastLayerNode.connectTo(outputLayerNode);
							}
						}
					}
				}
			}
		}
	}

  nextIndex() {
    return this.nodes.length + 1;
  }

  feedforward(inputs) {
    if (!Array.isArray(inputs)) {
      throw new Error("The values must be inside an array.");
    }

    if (inputs.length != this.neat.input) {
      throw new Error("Array length should be the same as input length.")
    }

    let inputNodes = [];
    let hiddenNodes = [];
    let outputNodes = [];

    //Seperate nodes by layer
    for (var i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      if (node.layer == "input") {
        inputNodes.push(node);
      } else if (node.layer == "output") {
        outputNodes.push(node);
      }

      if (!Array.isArray(this.neat.hidden)) {
        if (node.layer == "hidden") {
          hiddenNodes.push(node);
        }
      }
    }

    if (Array.isArray(this.neat.hidden)) {
      for (var i = 0; i < this.neat.hidden.length; i++) {
        let currentHiddenNodes = [];
        for (var j = 0; j < this.nodes.length; j++) {
          let node = this.nodes[j];
          if (node.layer.startsWith(`hiddenLayer${i + 1}`)) {
            currentHiddenNodes.push(node);
          }
        }
        hiddenNodes.push(currentHiddenNodes);
      }
    }

    //Feedforward
    for (var i = 0; i < inputNodes.length; i++) {
      inputNodes[i].activation = inputs[i];
    }

    //Sort by activation index
    inputNodes.sort((a, b) => a.activationIndex - b.activationIndex);

    if (!Array.isArray(this.neat.hidden)) {
      hiddenNodes.sort((a, b) => a.activationIndex - b.activationIndex);
    } else {
      for (var i = 0; i < hiddenNodes.length; i++) {
        hiddenNodes[i].sort((a, b) => a.activationIndex - b.activationIndex);
      }
    }

    outputNodes.sort((a, b) => a.activationIndex - b.activationIndex);

    //Activate layer by layer
    for (var i = 0; i < inputNodes.length; i++) {
      if (inputNodes[i].type == "mutation") inputNodes[i].activate("sigmoid");
    }

    if (!Array.isArray(this.neat.hidden)) {
      for (var i = 0; i < hiddenNodes.length; i++) {
        hiddenNodes[i].activate("tanh");
      }
    } else {
      for (var i = 0; i < hiddenNodes.length; i++) {
        let hiddenLayer = hiddenNodes[i];
        for (var j = 0; j < hiddenLayer.length; j++) {
          let hiddenNode = hiddenLayer[j];
          hiddenNode.activate("tanh");
        }
      }
    }

    for (var i = 0; i < outputNodes.length; i++) {
      outputNodes[i].activate("sigmoid");
    }

    //Return the output's nodes' activation
    let resultOutput = [];
    for (var i = 0; i < outputNodes.length; i++) {
      resultOutput.push(outputNodes[i].activation);
    }

    return resultOutput;
  }

  clone() {
    let copy = new Genome(this.neat, {
      cloned: true,
      nodes: [],
      connections: [],
      fitness: this.fitness
    });

    let nodes = [];
    for (let node of this.nodes) {
      nodes.push(new Node({
        activation: node.activation,
        layer: node.layer,
        type: node.type,
        genome: copy,
        activationIndex: node.activationIndex
      }))
    }

    let geneData = {};
    for (var i = 0; i < this.connections.length; i++) {
      let gene = this.connections[i];
      let data = {
        gene: gene,
        source: this.nodes.indexOf(gene.nodeSource),
        destination: this.nodes.indexOf(gene.nodeDestination)
      }
      data.innovationNumber = cantor(data.source, data.destination)
      geneData[data.innovationNumber] = data;
    }

    let connections = [];
    for (var i = 0; i < Object.keys(geneData).length; i++) {
      let gene = Object.values(geneData)[i];
      let nodeSource = nodes[gene.source];
      let nodeDestination = nodes[gene.destination];
      let offspringGene = nodeSource.connectTo(nodeDestination);
      offspringGene.weight = gene.gene.weight;
      connections.push(offspringGene);
    }

    copy.nodes = nodes;
    copy.connections = connections;

    return copy;
  }

  crossover(partner) {
    let parentA = this;
    let parentB = partner;

    //Create offspring
    let offspring = new Genome(this.neat);
    offspring.nodes = [];
    offspring.connections = [];

    //Parent A's gene data
    let geneDataA = {};
    for (var i = 0; i < parentA.connections.length; i++) {
      let gene = parentA.connections[i];
      let data = {
        gene: gene,
        source: parentA.nodes.indexOf(gene.nodeSource),
        destination: parentA.nodes.indexOf(gene.nodeDestination)
      }
      data.innovationNumber = cantor(data.source, data.destination)
      geneDataA[data.innovationNumber] = data;
    }

    //Parent B's gene data
    let geneDataB = {};
    for (var i = 0; i < parentB.connections.length; i++) {
      let gene = parentB.connections[i];
      let data = {
        gene: gene,
        source: parentB.nodes.indexOf(gene.nodeSource),
        destination: parentB.nodes.indexOf(gene.nodeDestination)
      }
      data.innovationNumber = cantor(data.source, data.destination)
      geneDataB[data.innovationNumber] = data;
    }

    //Matching genes from parents
    let matchedGenes = {};
    for (var i = 0; i < Object.keys(geneDataA).length; i++) {
      let geneData = Object.values(geneDataA)[i];
      if (geneData.innovationNumber in geneDataB) {
        let matchedData = geneData;
        if (Math.random() < 0.5) matchedData = geneDataB[geneData.innovationNumber]
        matchedGenes[geneData.innovationNumber] = matchedData;
      }
    }

    //Offspring's genes
    let genes = {};
    for (var i = 0; i < Object.keys(matchedGenes).length; i++) {
      let gene = Object.values(matchedGenes)[i];
      genes[gene.innovationNumber] = gene;
    }

    //Prioritize choosing excess/disjoint genes from the more fit parent
    if (parentA.fitness > parentB.fitness) {
      for (var i = 0; i < Object.keys(geneDataB).length; i++) {
        let gene = Object.values(geneDataB)[i];
        genes[gene.innovationNumber] = gene;
      }

      for (var i = 0; i < Object.keys(geneDataA).length; i++) {
        let gene = Object.values(geneDataA)[i];
        genes[gene.innovationNumber] = gene;
      }
    } else {
      for (var i = 0; i < Object.keys(geneDataA).length; i++) {
        let gene = Object.values(geneDataA)[i];
        genes[gene.innovationNumber] = gene;
      }

      for (var i = 0; i < Object.keys(geneDataB).length; i++) {
        let gene = Object.values(geneDataB)[i];
        genes[gene.innovationNumber] = gene;
      }
    }

    let offspringGenes = [];

    //Offspring nodes will be inherited from the larger parent
    if (parentA.nodes.length > parentB.nodes.length) {
      for (var i = 0; i < parentA.nodes.length; i++) {
        let node = parentA.nodes[i];
        offspring.nodes.push(node);
      }
    } else {
      for (var i = 0; i < parentB.nodes.length; i++) {
        let node = parentB.nodes[i];
        offspring.nodes.push(node);
      }
    }

    //Clone the nodes
    for (var i = 0; i < offspring.nodes.length; i++) {
      let node = offspring.nodes[i];
      offspring.nodes[i] = new Node({
        genome: offspring,
        activation: node.activation,
        activationIndex: node.activationIndex,
        layer: node.layer
      });
    }

    //Connect nodes
    for (var i = 0; i < Object.keys(genes).length; i++) {
      let gene = Object.values(genes)[i];
      let nodeSource = offspring.nodes[gene.source];
      let nodeDestination = offspring.nodes[gene.destination];
      let offspringGene = nodeSource.connectTo(nodeDestination);

      //25% chance of being reenabled
      if (gene.gene.disabled) {
        if (Math.random() < 0.25) {
          gene.gene.disabled = false;
        }
      }

      offspringGene.disabled = gene.gene.disabled;
      offspringGene.weight = gene.gene.weight;
      offspringGenes.push(offspringGene);
    }

    offspring.connections = offspringGenes

    return offspring;
  }

  getMaxConnections() {
    let max = 0;
    let innovationNumbers = [];

    let disabledConnectionCount = 0;
    for (var i = 0; i < this.connections.length; i++) {
      let connection = this.connections[i];
      if (connection.disabled) {
        disabledConnectionCount++;
      }
    }

    for (var i = 0; i < this.connections.length; i++) {
      let connection = this.connections[i];
      let source = this.nodes.indexOf(connection.nodeSource);
      let destination = this.nodes.indexOf(connection.nodeDestination);
      innovationNumbers.push(cantor(source, destination));
      innovationNumbers.push(cantor(destination, source));
    }

    for (var i = 0; i < this.nodes.length; i++) {
      let nodeA = this.nodes[i];
      for (var j = 0; j < this.nodes.length; j++) {
        let nodeB = this.nodes[j];
        if (nodeA != nodeB) {
          let source = this.nodes.indexOf(nodeA);
          let destination = this.nodes.indexOf(nodeB);
          let innovationNumber = cantor(source, destination);
          let isSameLayer = nodeA.layer != nodeB.layer;
          if (isSameLayer || nodeA.type == "mutation" || nodeB.type == "mutation") {
            if (!innovationNumbers.includes(innovationNumber)) {
              max++;
            }
          }
        }
      }
    }

    return max / 2;
  }

  mutate() {
    if (Math.random() < config.mutationRates.addNode) {
      this.addNode();
    }
    if (Math.random() < config.mutationRates.addConnection) {
      this.addConnection();
    }
    if (Math.random() < config.mutationRates.weight) {
      for (let gene of this.connections) {
        if (Math.random() < config.mutationRates.weightEach) {
          gene.mutateWeight();
        }
      }
    }
  }

  //For mutations
  addConnection() {
    //Check if this genome hasn't reached the max connections yet
    if (this.connections.length < this.getMaxConnections() + this.connections.length) {
      //Search for random nodes that can be connected
      let added = false;
      let randomIndex = Math.floor(Math.random() * this.nodes.length);
      let nodeA = this.nodes[randomIndex];
      randomIndex = Math.floor(Math.random() * this.nodes.length);
      let nodeB = this.nodes[randomIndex];

      //Make sure the we're connecting to 2 different layers
      while (nodeA == nodeB || nodeA.layer == nodeB.layer) {
        randomIndex = Math.floor(Math.random() * this.nodes.length);
        nodeB = this.nodes[randomIndex];
        randomIndex = Math.floor(Math.random() * this.nodes.length);
        nodeA = this.nodes[randomIndex];
      }

      //Check if we should swap the 2 nodes
      let _nodeA = nodeA;
      let _nodeB = nodeB;
      if (_nodeA.activationIndex > _nodeB.activationIndex) {
        _nodeA = nodeB;
        _nodeB = nodeA;
      }

      let newConnection = _nodeA.connectTo(_nodeB);
      return newConnection;
    } else {
      warn(true, "Max connections reached.")
    }
  }

  addNode() {
    //Pick a random connection
    let randomIndex = Math.floor(random(0, this.connections.length));
    let connection = this.connections[randomIndex];

    //If connection is disabled, pick another one
    for (var i = 0; i < this.connections.length; i++) {
      if (!connection.disabled) {
        break;
      } else {
        randomIndex = Math.floor(Math.random() * this.connections.length);
        connection = this.connections[randomIndex];
      }
      if (i == this.connections.length - 1) {
        if (connection.disabled) {
          i = 0;
        }
      }
    }

    //Get the random connection's source & destination nodes
    let connectionSourceNode = connection.nodeSource;
    let connectionDestinationNode = connection.nodeDestination;

    let activationIndex = connectionSourceNode.activationIndex + Math.abs(connectionSourceNode.activationIndex - connectionDestinationNode.activationIndex) / 2;
    //Create the new node
    let newNode = new Node({
      type: "mutation",
      activationIndex: activationIndex,
      genome: this
    }, node => {
      connectionSourceNode.connectTo(node, connection.weight);
      node.connectTo(connectionDestinationNode, connection.weight);

      if (connectionSourceNode.layer == "input") {
        node.layer = connectionDestinationNode.layer
      } else {
        node.layer = connectionSourceNode.layer
      }
    });

    this.nodes.push(newNode);

    //Disable the old connection
    connection.disabled = true;
    return newNode;

  }
}

module.exports = Genome;
