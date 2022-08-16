const { cantor, warn, random } = require("./utils.js");
const config = require("./config.js");

function getExcessGeneCount(genomeA, genomeB) {
	let matchCount = 0;
	let genomeAGeneCount = genomeA.connections.length;
	let genomeBGeneCount = genomeB.connections.length;
	for (let geneA of genomeA.connections) {
		let geneAInnovationNumber = cantor(genomeA.nodes.indexOf(geneA.nodeSource), genomeA.nodes.indexOf(geneA.nodeDestination));
		for (let geneB of genomeB.connections) {
			let geneBInnovationNumber = cantor(genomeB.nodes.indexOf(geneB.nodeSource), genomeB.nodes.indexOf(geneB.nodeDestination));
			if (geneAInnovationNumber == geneBInnovationNumber) {
				matchCount++;
			}
		}
	}

	return genomeAGeneCount + genomeBGeneCount - (matchCount * 2);
}

function getAverageWeightDifference(genomeA, genomeB) {
	let differenceSum = 0;
	let matchCount = 0;

	for (let geneA of genomeA.connections) {
		let geneAInnovationNumber = cantor(genomeA.nodes.indexOf(geneA.nodeSource), genomeA.nodes.indexOf(geneA.nodeDestination));
		for (let geneB of genomeB.connections) {
			let geneBInnovationNumber = cantor(genomeB.nodes.indexOf(geneB.nodeSource), genomeB.nodes.indexOf(geneB.nodeDestination));
			if (geneAInnovationNumber == geneBInnovationNumber) {
				matchCount++;
				differenceSum += Math.abs(geneA.weight - geneB.weight);
			}
		}
	}

	return differenceSum / matchCount;
}

class Species {
	constructor(genome) {
		this.genomes = [genome];
		this.fittest = genome.clone();
		this.compatibilityThreshold = config.compatibilityThreshold;
		this.stagnation = 0;
	}

	isCompatible(genome) {
		this.detectFittest();
		let excessGeneCount = getExcessGeneCount(genome, this.fittest);
		let averageWeightDifference = getAverageWeightDifference(genome, this.fittest);
		let excessCoefficient = config.coefficients.excess;
		let weightCoefficient = config.coefficients.weight;
		let fittestGenes = this.fittest.connections.length;
		fittestGenes = fittestGenes < 20 ? 1 : fittestGenes;
		let compatibilityDistance = (excessCoefficient * excessGeneCount / fittestGenes) + (weightCoefficient * averageWeightDifference);
		return compatibilityDistance < this.compatibilityThreshold;
	}

	detectFittest(detectStagnation) {
		this.genomes.sort((a, b) => b.fitness - a.fitness);
		if (this.genomes[0]) {
			if (this.fittest.fitness < this.genomes[0].fitness) {
				this.fittest = this.genomes[0].clone();
				if (detectStagnation) this.stagnation = 0;
			} else {
				if (detectStagnation) this.stagnation++;
			}
		}
	}

	sort() {
		this.genomes.sort((a, b) => b.fitness - a.fitness);
	}

	snap() {
		if (this.genomes.length >= 2) {
			this.sort();
			this.genomes.splice(Math.round(this.genomes.length / 2))
		}
	}

	getPartners() {
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
				let randomIndex = Math.floor(random(0, this.genomes.length));
				partners.parentA = this.genomes[randomIndex];
				while (!partners.parentB) {
					randomIndex = Math.round(random(0, this.genomes.length));
					let parent = this.genomes[randomIndex];
					if (parent != partners.parentA) {
						partners.parentB = parent;
					}
				}
			}

			return partners;
		}

		warn(neat, true, "Species size is too small to get partners.")
	}

	getOffspring() {
		//Check if there's at least 2 genomes in the population
		if (this.genomes.length >= 2) {
			let partners = this.getPartners();
			let parentA = partners.parentA;
			let parentB = partners.parentB;
			let offspring;

			if (Math.random() < config.mateProbability) {
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

module.exports = Species;
