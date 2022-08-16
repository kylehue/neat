const { warn, random } = require("./utils.js");
const config = require("./config.js");
const Population = require("./Population.js");
const Genome = require("./Genome.js");
const Node = require("./Node.js");

class Neat {
	constructor(input, hidden, output, options) {
    options = options || {};
		//Layers
		this.input = input || 0;
		this.hidden = hidden || 0;
		this.output = output || 0;

		//Options
		options = options || {};
		this.populationSize = options.populationSize || 0;
		this.mutationRate = typeof options.mutationRate == "number" ? options.mutationRate : 0.25;
		this.maxStagnation = typeof options.maxStagnation == "number" ? options.maxStagnation : 30;

		warn(this.mutationRate > 1 || this.mutationRate < 0, "Mutation rate should be between 0 and 1.");

    //Init
		this.population = new Population(this, this.populationSize);
	}

  import (genomes, size, fittestOnly) {
		this.population = new Population(this, size);
		this.populationSize = size;
		this.population.genomes = [];
		genomes.sort((a, b) => b.fitness - a.fitness);
		for (var i = 0; i < size; i++) {
			if (fittestOnly) {
				this.population.genomes.push(genomes[0].clone());
			} else {
				let randomIndex = Math.floor(random(0, genomes.length))
				this.population.genomes.push(genomes[randomIndex].clone());
			}
		}
	}

	fromJSON(json) {
		let genomes = [];

		for (let genome of json) {
			let newGenome = new Genome(this, {
				fitness: genome.fitness
			})

			let newNodes = [];
			for (var i = 0; i < genome.nodes.length; i++) {
				let node = genome.nodes[i];

				//Create nodes
				newNodes.push(new Node({
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
}

module.exports = Neat;
