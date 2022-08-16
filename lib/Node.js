const config = require("./config.js");
const { random } = require("./utils.js");
const Connection = require("./Connection.js");

function activate(n, activation) {
  return config.activationFunctions[activation](n);
}

class Node {
  constructor(options, callback) {
    options = options || {};
    this.layer = options.layer == undefined ? "none" : options.layer;
    this.type = options.type == undefined ? "normal" : options.type;
    this.connections = options.connections == undefined ? {
      enter: [],
      exit: []
    } : options.connections;
    this.activationIndex = options.activationIndex;
    this.activation = options.activation == undefined ? 0 : options.activation;
    this.genome = options.genome;
    //Callback
    if (callback) callback(this);
  }

  activate(activationFunction) {
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

    this.activation = activate(sum, activationFunction);
  }

  connectTo(node, weight) {
    weight = weight == undefined ? random(-1, 1) : weight;
    let connection = new Connection({
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

module.exports = Node;
