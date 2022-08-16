const { warn, random } = require("./utils.js");

const Species = require("./Species.js");
const Genome = require("./Genome.js");

class Population {
	constructor(neat, size) {
    this.neat = neat;
		this.genomes = [];
		this.species = [];
		this.generation = 0;
		for (var i = 0; i < size; i++) {
			let genome = new Genome(this.neat);
			this.genomes.push(genome);
		}
		this.fittest = this.genomes[0].clone();
	}

	speciate() {
		//Empty genomes from each species
		for (let species of this.species) {
			species.genomes = [];
		}

		for (let genome of this.genomes) {
			//Find a species group for this genome
			let speciesFound;
			for (let species of this.species) {
				let maxCapacity = this.neat.populationSize * 0.25;
				if (species.genomes.length >= maxCapacity || species.genomes.includes(genome)) continue;
				if (species.isCompatible(genome)) {
					species.genomes.push(genome);
					speciesFound = true;
					break;
				}
			}

			//If no species were found, then create a species for this genome
			if (!speciesFound) {
				this.species.push(new Species(genome));
			}
		}
	}

	mutate() {
		for (var i = 0; i < this.genomes.length; i++) {
			let genome = this.genomes[i];
			if (Math.random() < this.neat.mutationRate) {
				genome.mutate();
			}
		}
	}

	sortSpecies() {
		for (let species of this.species) {
			//Detect best genome in this species
			species.detectFittest(true);

			//Sort the genomes in this species
			species.sort();
		}

		//Sort species by the best genome's fitness
		this.species.sort((a, b) => b.fittest.fitness - a.fittest.fitness);
	}

	snapSpecies() {
		for (let species of this.species) {
			species.snap();
		}
	}

	removeStagnatedSpecies() {
		for (let index in this.species) {
			let species = this.species[index];
			if (species.stagnation > this.neat.maxStagnation) {
				this.species.splice(index, 1);
			}
		}
	}

	removeEmptySpecies() {
		for (let index in this.species) {
			let species = this.species[index];
			if (species.genomes.length == 0) {
				this.species.splice(index, 1);
			}
		}
	}

	resetFitness() {
		//Set all genomes' fitness back to 0
		for (let genome of this.genomes) {
			genome.fitness = 0;
		}
	}

	evolve(callback) {
		this.speciate();
		this.sortSpecies();
		this.snapSpecies();
		this.removeStagnatedSpecies();
		this.removeEmptySpecies();

		warn(neat, this.species.length > 10, "There are too many species.")

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
			while (newGeneration.length < this.neat.populationSize) {
				let offspring = bestSpecies.getOffspring();
				newGeneration.push(offspring);
			}
		}

		warn(neat, !bestSpecies, "Couldn't find best species.");

		//If new generation is incomplete
		if (newGeneration.length < this.neat.populationSize) {
			if (newGeneration.length >= 2) {
				//Fill new generation with random species offspring
				newGeneration.sort((a, b) => b.fitness - a.fitness);
				let offspring = newGeneration[0].crossover(newGeneration[1]);
				while (newGeneration.length < this.neat.populationSize) {
					newGeneration.push(offspring);
				}
			}
		}

		//Replace population with new generation
		//If there are no species, reuse previous population for next generation
		if (this.species.length > 0 && newGeneration.length >= this.neat.populationSize) {
			this.genomes = newGeneration;
		}

		warn(neat, this.species.length == 0, "Reusing previous population.")

		//Mutate the entire population
		this.mutate();

		if (this.neat.populationSize > 3) {
			//If the population has more than 3 genomes, replace random genome with the fittest genome
			let randomIndex = Math.floor(random(0, this.genomes.length));
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

module.exports = Population;
