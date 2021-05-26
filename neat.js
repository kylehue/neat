class Neat {
	constructor(input, hidden, output, options) {
		//Layers
		this.input = input || 0;
		this.hidden = hidden || 0;
		this.output = output || 0;

		//Options
		options = options || {};
		this.populationSize = options.populationSize || 0;
		this.mutationRate = typeof options.mutationRate == "number" ? options.mutationRate : 0.25;
		this.maxStagnation = typeof options.maxStagnation == "number" ? options.maxStagnation : 30;

		if (options.warnings) this.warnings = options.warnings;
		Neat.warn(this, this.mutationRate > 1 || this.mutationRate < 0, "Mutation rate should be between 0 and 1.");

		//Other
		this.population = this.createPopulation(this.populationSize);
	}

	createPopulation(size) {
		let neat = this;

		function Population() {
			this.genomes = [];
			this.species = [];
			this.generation = 0;
			for (var i = 0; i < size; i++) {
				let genome = neat.createGenome();
				this.genomes.push(genome);
			}
			this.fittest = this.genomes[0].clone();
		}

		Population.prototype = {
			speciate: function() {
				//Empty genomes from each species
				for (let species of this.species) {
					species.genomes = [];
				}

				for (let genome of this.genomes) {
					//Find a species group for this genome
					let speciesFound;
					for (let species of this.species) {
						let maxCapacity = neat.populationSize * 0.25;
						if (species.genomes.length >= maxCapacity || species.genomes.includes(genome)) continue;
						if (species.isCompatible(genome)) {
							species.genomes.push(genome);
							speciesFound = true;
							break;
						}
					}

					//If no species were found, then create a species for this genome
					if (!speciesFound) {
						this.species.push(neat.createSpecies(genome));
					}
				}
			},
			mutate: function() {
				let config = Neat.config();
				for (var i = 0; i < this.genomes.length; i++) {
					let genome = this.genomes[i];
					if (Math.random() < neat.mutationRate) {
						genome.mutate();
					}
				}
			},
			sortSpecies: function() {
				for (let species of this.species) {
					//Detect best genome in this species
					species.detectFittest(true);

					//Sort the genomes in this species
					species.sort();
				}

				//Sort species by the best genome's fitness
				this.species.sort((a, b) => b.fittest.fitness - a.fittest.fitness);
			},
			snapSpecies: function() {
				for (let species of this.species) {
					species.snap();
				}
			},
			removeStagnatedSpecies: function() {
				for (let index in this.species) {
					let species = this.species[index];
					if (species.stagnation > neat.maxStagnation) {
						this.species.splice(index, 1);
					}
				}
			},
			removeEmptySpecies: function() {
				for (let index in this.species) {
					let species = this.species[index];
					if (species.genomes.length == 0) {
						this.species.splice(index, 1);
					}
				}
			},
			resetFitness: function() {
				//Set all genomes' fitness back to 0
				for (let genome of this.genomes) {
					genome.fitness = 0;
				}
			},
			evolve: function(callback) {
				this.speciate();
				this.sortSpecies();
				this.snapSpecies();
				this.removeStagnatedSpecies();
				this.removeEmptySpecies();

				Neat.warn(neat, this.species.length > 10, "There are too many species.")

				//Update fittest
				for (var i = 0; i < this.genomes.length; i++) {
					let genome = this.genomes[i];
					if (genome.fitness > this.fittest.fitness) {
						this.fittest = genome.clone();
					}
				}

				//Initialize new generation
				let newGeneration = [];

				//Get offspring from each species
				for (let species of this.species) {
					let offspring = species.getOffspring();
					newGeneration.push(offspring);
				}

				//Get offspring from the best species
				let bestSpecies = this.species[0];
				if (bestSpecies) {
					while (newGeneration.length < neat.populationSize) {
						let offspring = bestSpecies.getOffspring();
						newGeneration.push(offspring);
					}
				}

				Neat.warn(neat, !bestSpecies, "Couldn't find best species.");

				//If new generation is incomplete
				if (newGeneration.length < neat.populationSize) {
					if (newGeneration.length >= 2) {
						//Fill new generation with random species offspring
						newGeneration.sort((a, b) => b.fitness - a.fitness);
						let offspring = newGeneration[0].crossover(newGeneration[1]);
						while (newGeneration.length < neat.populationSize) {
							newGeneration.push(offspring);
						}
					}
				}

				//Replace population with new generation
				//If there are no species, reuse previous population for next generation
				if (this.species.length > 0 && newGeneration.length >= neat.populationSize) {
					this.genomes = newGeneration;
				}

				Neat.warn(neat, this.species.length == 0, "Reusing previous population.")

				//Mutate the entire population
				this.mutate();

				if (neat.populationSize > 3) {
					//If the population has more than 3 genomes, replace random genome with the fittest genome
					let randomIndex = Math.floor(Neat.random(0, this.genomes.length));
					this.genomes[randomIndex] = this.fittest.clone();
				}

				//Reset fitness
				this.resetFitness();

				this.generation++;

				if (callback) {
					for (let genome of this.genomes) {
						callback(genome);
					}
				}
			}
		}

		return new Population;
	}

	createSpecies(genome) {
		let neat = this;

		function Species() {
			this.genomes = [genome];
			this.fittest = genome.clone();
			this.compatibilityThreshold = Neat.config().compatibilityThreshold;
			this.stagnation = 0;
		}

		Species.prototype = {
			isCompatible: function(genome) {
				this.detectFittest();
				let config = Neat.config();
				let excessGeneCount = Neat.getExcessGeneCount(genome, this.fittest);
				let averageWeightDifference = Neat.getAverageWeightDifference(genome, this.fittest);
				let excessCoefficient = config.coefficients.excess;
				let weightCoefficient = config.coefficients.weight;
				let fittestGenes = this.fittest.connections.length;
				fittestGenes = fittestGenes < 20 ? 1 : fittestGenes;
				let compatibilityDistance = (excessCoefficient * excessGeneCount / fittestGenes) + (weightCoefficient * averageWeightDifference);
				return compatibilityDistance < this.compatibilityThreshold;
			},
			detectFittest: function(detectStagnation) {
				this.genomes.sort((a, b) => b.fitness - a.fitness);
				if (this.genomes[0]) {
					if (this.fittest.fitness < this.genomes[0].fitness) {
						this.fittest = this.genomes[0].clone();
						if (detectStagnation) this.stagnation = 0;
					} else {
						if (detectStagnation) this.stagnation++;
					}
				}
			},
			sort: function() {
				this.genomes.sort((a, b) => b.fitness - a.fitness);
			},
			snap: function() {
				if (this.genomes.length >= 2) {
					this.sort();
					this.genomes.splice(Math.round(this.genomes.length / 2))
				}
			},
			getPartners: function() {
				//Check if there's at least 2 genomes in the population
				if (this.genomes.length >= 2) {
					//Sort by fitness
					this.sort();

					let partners = {};

					//50% probability to return best ones
					if (Math.random() < 0.5) {
						partners.parentA = this.genomes[0];
						partners.parentB = this.genomes[1];
					} else {
						//50% probability to return random
						let randomIndex = Math.floor(Neat.random(0, this.genomes.length));
						partners.parentA = this.genomes[randomIndex];
						while (!partners.parentB) {
							randomIndex = Math.round(Neat.random(0, this.genomes.length));
							let parent = this.genomes[randomIndex];
							if (parent != partners.parentA) {
								partners.parentB = parent;
							}
						}
					}

					return partners;
				}

				Neat.warn(neat, true, "Species size is too small to get partners.")
			},
			getOffspring: function() {
				//Check if there's at least 2 genomes in the population
				if (this.genomes.length >= 2) {
					let partners = this.getPartners();
					let parentA = partners.parentA;
					let parentB = partners.parentB;
					let offspring;

					if (Math.random() < Neat.config().mateProbability) {
						offspring = parentA.crossover(parentB);
					} else {
						if (Math.random() < 0.5) {
							offspring = parentA.clone();
						} else {
							offspring = parentB.clone();
						}
					}
					return offspring;
				} else {
					//Return the fittest clone if there's only 1 genome
					return this.fittest.clone();
				}
			}
		}

		return new Species;
	}

	createGenome(options) {
		let neat = this;
		options = options || {};

		//Genome class
		function Genome() {
			//Properties
			this.nodes = options.nodes || [];
			this.connections = options.connections || [];
			this.fitness = options.fitness || Math.round(Math.random() * 100);

			if (!options.cloned) {
				//Create nodes from each layer
				//Input layer
				let inputNodes = [];
				for (var i = 0; i < neat.input; i++) {
					let node = neat.createNode({
						genome: this,
						layer: "input",
						activationIndex: Neat.nextIndex(this)
					});
					inputNodes.push(node);
					this.nodes.push(node);
				}

				//Hidden layer
				let hiddenNodes = [];
				//Check if hidden isn't multi-layered
				if (!Array.isArray(neat.hidden)) {
					for (var i = 0; i < neat.hidden; i++) {
						let node = neat.createNode({
							genome: this,
							layer: "hidden",
							activationIndex: Neat.nextIndex(this)
						});
						hiddenNodes.push(node);
						this.nodes.push(node);
					}
				} else {
					for (var i = 0; i < neat.hidden.length; i++) {
						let hidden = neat.hidden[i];
						let nodeArray = [];
						for (var j = 0; j < hidden; j++) {
							let node = neat.createNode({
								genome: this,
								layer: `hiddenLayer${i+1}`,
								activationIndex: Neat.nextIndex(this)
							});
							nodeArray.push(node);
							this.nodes.push(node);
						}
						hiddenNodes.push(nodeArray)
					}
				}

				//Output layer
				let outputNodes = [];
				for (var i = 0; i < neat.output; i++) {
					let node = neat.createNode({
						genome: this,
						layer: "output",
						activationIndex: Neat.nextIndex(this)
					});
					outputNodes.push(node);
					this.nodes.push(node);
				}

				//Connect all nodes
				//Input to hidden
				//Check if hidden isn't multi-layered
				if (!Array.isArray(neat.hidden)) {
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
				if (!Array.isArray(neat.hidden)) {
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

		Genome.prototype = {
			feedforward: function(inputs) {
				if (!Array.isArray(inputs)) {
					throw new Error("The values must be inside an array.");
				}

				if (inputs.length != neat.input) {
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

					if (!Array.isArray(neat.hidden)) {
						if (node.layer == "hidden") {
							hiddenNodes.push(node);
						}
					}
				}

				if (Array.isArray(neat.hidden)) {
					for (var i = 0; i < neat.hidden.length; i++) {
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

				if (!Array.isArray(neat.hidden)) {
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

				if (!Array.isArray(neat.hidden)) {
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
			},
			clone: function() {
				let copy = neat.createGenome({
					cloned: true,
					nodes: [],
					connections: [],
					fitness: this.fitness
				});

				let nodes = [];
				for (let node of this.nodes) {
					nodes.push(neat.createNode({
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
					data.innovationNumber = Neat.cantor(data.source, data.destination)
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
			},
			crossover: function(partner) {
				let parentA = this;
				let parentB = partner;

				//Create offspring
				let offspring = neat.createGenome();
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
					data.innovationNumber = Neat.cantor(data.source, data.destination)
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
					data.innovationNumber = Neat.cantor(data.source, data.destination)
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
					offspring.nodes[i] = neat.createNode({
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
			},
			getMaxConnections: function() {
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
					innovationNumbers.push(Neat.cantor(source, destination));
					innovationNumbers.push(Neat.cantor(destination, source));
				}

				for (var i = 0; i < this.nodes.length; i++) {
					let nodeA = this.nodes[i];
					for (var j = 0; j < this.nodes.length; j++) {
						let nodeB = this.nodes[j];
						if (nodeA != nodeB) {
							let source = this.nodes.indexOf(nodeA);
							let destination = this.nodes.indexOf(nodeB);
							let innovationNumber = Neat.cantor(source, destination);
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
			},
			mutate: function() {
				let config = Neat.config();
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
			},
			//For mutations
			addConnection: function() {
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
					Neat.warn(neat, true, "Max connections reached.")
				}
			},
			addNode: function() {
				//Pick a random connection
				let randomIndex = Math.floor(Neat.random(0, this.connections.length));
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
				let newNode = neat.createNode({
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

		return new Genome;
	}

	createNode(options, callback) {
		let neat = this;

		function Node() {
			this.layer = options.layer == undefined ? "none" : options.layer;
			this.type = options.type == undefined ? "normal" : options.type;
			this.connections = options.connections == undefined ? {
				enter: [],
				exit: []
			} : options.connections;
			this.activationIndex = options.activationIndex;
			this.activation = options.activation == undefined ? 0 : options.activation;

			//Callback
			if (callback) callback(this);
		}

		Node.prototype = {
			genome: options.genome,
			activate: function(activationFunction) {
				let sum = 0;
				for (var i = 0; i < this.connections.enter.length; i++) {
					let connection = this.connections.enter[i];
					if (!connection.disabled) {
						let nodeSource = connection.nodeSource;
						let input = nodeSource.activation;
						let weight = connection.weight;
						let product = input * weight;
						sum += product;
					}
				}

				this.activation = Neat.activate(sum, activationFunction);
			},
			connectTo: function(node, weight) {
				weight = weight == undefined ? Neat.random(-1, 1) : weight;
				let connection = neat.createConnection({
					nodeSource: this,
					nodeDestination: node,
					weight: weight
				});
				connection.__proto__.genome = this.genome;
				node.connections.enter.push(connection);
				this.connections.exit.push(connection);
				this.genome.connections.push(connection);
				return connection;
			}
		}

		return new Node;
	}

	createConnection(options) {
		let neat = this;
		options = options || {};

		function Connection() {
			this.nodeSource = options.nodeSource;
			this.nodeDestination = options.nodeDestination;
			this.weight = options.weight;
			this.disabled = false;
		}

		Connection.prototype = {
			mutateWeight: function() {
				this.weight += Neat.random(-0.5, 0.5);
				this.weight = Neat.constrain(this.weight, -1, 1);
			}
		}
		return new Connection;
	}

	import (genomes, size, fittestOnly) {
		this.population = this.createPopulation(size);
		this.populationSize = size;
		this.population.genomes = [];
		genomes.sort((a, b) => b.fitness - a.fitness);
		for (var i = 0; i < size; i++) {
			if (fittestOnly) {
				this.population.genomes.push(genomes[0].clone());
			} else {
				let randomIndex = Math.floor(Neat.random(0, genomes.length))
				this.population.genomes.push(genomes[randomIndex].clone());
			}
		}
	}

	fromJSON(json) {
		let genomes = [];

		for (let genome of json) {
			let newGenome = this.createGenome({
				fitness: genome.fitness
			})

			let newNodes = [];
			for (var i = 0; i < genome.nodes.length; i++) {
				let node = genome.nodes[i];

				//Create nodes
				newNodes.push(this.createNode({
					genome: newGenome,
					activation: node.activation,
					activationIndex: node.activationIndex,
					layer: node.layer,
					type: node.type
				}));
			}

			newGenome.nodes = newNodes;

			//Connect nodes
			let newConnections = [];
			for (var i = 0; i < genome.connections.length; i++) {
				let gene = genome.connections[i];
				let nodeSource = newGenome.nodes[gene.source];
				let nodeDestination = newGenome.nodes[gene.destination];
				let newConnection = nodeSource.connectTo(nodeDestination);

				newConnection.disabled = gene.disabled;
				newConnection.weight = gene.weight;
				newConnections.push(newConnection);
			}

			newGenome.connections = newConnections;
			genomes.push(newGenome)
		}

		return genomes;
	}

	toJSON() {
		let json = [];

		for (let genome of this.population.genomes) {
			let data = {
				fitness: genome.fitness,
				nodes: [],
				connections: []
			}

			for (let node of genome.nodes) {
				let nodeData = {
					activation: node.activation,
					type: node.type,
					layer: node.layer,
					activationIndex: node.activationIndex
				}
				data.nodes.push(nodeData);
			}

			for (let connection of genome.connections) {
				let geneData = {
					weight: connection.weight,
					disabled: connection.disabled,
					source: genome.nodes.indexOf(connection.nodeSource),
					destination: genome.nodes.indexOf(connection.nodeDestination)
				}
				data.connections.push(geneData);
			}

			json.push(data);
		}

		return json;
	}

	static nextIndex(genome) {
		return genome.nodes.length + 1;
	}

	static random(min, max) {
		return Math.random() * (max - min) + min;
	}

	static cantor(k1, k2) {
		return 1 / 2 * (k1 + k2) * (k1 + k2 + 1) + k2;
	}

	static constrain(n, min, max) {
		return Math.max(Math.min(n, max), min);
	}

	static activate(n, activation) {
		return Neat.config().activationFunctions[activation](n);
	}

	static getExcessGeneCount(genomeA, genomeB) {
		let matchCount = 0;
		let genomeAGeneCount = genomeA.connections.length;
		let genomeBGeneCount = genomeB.connections.length;
		for (let geneA of genomeA.connections) {
			let geneAInnovationNumber = Neat.cantor(genomeA.nodes.indexOf(geneA.nodeSource), genomeA.nodes.indexOf(geneA.nodeDestination));
			for (let geneB of genomeB.connections) {
				let geneBInnovationNumber = Neat.cantor(genomeB.nodes.indexOf(geneB.nodeSource), genomeB.nodes.indexOf(geneB.nodeDestination));
				if (geneAInnovationNumber == geneBInnovationNumber) {
					matchCount++;
				}
			}
		}

		return genomeAGeneCount + genomeBGeneCount - (matchCount * 2);
	}

	static getAverageWeightDifference(genomeA, genomeB) {
		let differenceSum = 0;
		let matchCount = 0;

		for (let geneA of genomeA.connections) {
			let geneAInnovationNumber = Neat.cantor(genomeA.nodes.indexOf(geneA.nodeSource), genomeA.nodes.indexOf(geneA.nodeDestination));
			for (let geneB of genomeB.connections) {
				let geneBInnovationNumber = Neat.cantor(genomeB.nodes.indexOf(geneB.nodeSource), genomeB.nodes.indexOf(geneB.nodeDestination));
				if (geneAInnovationNumber == geneBInnovationNumber) {
					matchCount++;
					differenceSum += Math.abs(geneA.weight - geneB.weight);
				}
			}
		}

		return differenceSum / matchCount;
	}

	static warn(neat, condition, message) {
		if (neat.warnings) {
			if (condition) {
				console.warn(message);
			}
		}
	}

	static config() {
		return {
			activationFunctions: {
				sigmoid: function(n) {
					return 1 / (1 + Math.exp(-n));
				},
				tanh: function(n) {
					return Math.tanh(n);
				}
			},
			mutationRates: {
				addNode: 0.01, //default: 0.03
				addConnection: 0.015, //default: 0.05
				weight: 0.8,
				weightEach: 0.5
			},
			coefficients: {
				excess: 1.0, //default: 1.0
				weight: 0.5 //default: 0.4
			},
			compatibilityThreshold: 3.0, //default: 3.0
			mateProbability: 0.8
		}
	}
}