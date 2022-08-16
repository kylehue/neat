const { random, constrain } = require("./utils.js");

class Connection {
  constructor(options) {
    options = options || {};
    this.nodeSource = options.nodeSource;
    this.nodeDestination = options.nodeDestination;
    this.weight = options.weight;
    this.disabled = false;
  }

  mutateWeight() {
    this.weight += random(-0.5, 0.5);
    this.weight = constrain(this.weight, -1, 1);
  }
}

module.exports = Connection;
