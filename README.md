## `@kylehue/neat`
:robot: A simple NEAT Algorithm implementation in JavaScript.

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Feedforward & Fitness](#feedforward--fitness)
- [Evolve](#evolve)
- [toJSON](#tojson)
- [fromJSON & import](#fromjson--import)
### Installation
```bash
npm i @kylehue/neat
```
### Usage
```js
const Neat = require("@kylehue/neat");

let neat = new Neat(input, hidden, output, options);
```
### Options
```js
{
  // Total number of genomes
  populationSize: 20, 
  // Determines how many genomes should be mutated in a generation
  mutationRate: 0.25, 
  // Maximum number of generations a species can exist without making any improvements
  maxStagnation: 30 
}
```
### Feedforward & Fitness
```js
let neat = new Neat(6, 1, 3, {
  populationSize: 10
});

class Turtle {
  constructor(genome) {
    this.brain = genome;
  }
  
  eat() {
    this.brain.fitness++; // Add fitness score
  }
}

// Create turtles
let turtles = [];
for (var i = 0; i < neat.populationSize; i++) {
  turtles.push(neat.population.genomes[i]);
}

// Feedforward inputs
for (var i = 0; i < turtles.length; i++) {
  turtles[i].brain.feedforward([...]);
}
```
### Evolve
```js
let neat = new Neat(6, 1, 3, {
  populationSize: 10
});

function evolve() {
  neat.population.evolve();
  nextGen();
}
```
### toJSON
You can create a pre-trained model by using toJSON()
```js
let neat = new Neat(6, 1, 3, {
  populationSize: 10
});

let trained = neat.toJSON();
download(trained);
```
### fromJSON & import
And you can import a pre-trained model by using fromJSON() and import()
```js
let neat = new Neat(6, 1, 3, {
  populationSize: 10
});

let genomes = neat.fromJSON(jsonFile);
neat.import(genomes, neat.populationSize);
```
