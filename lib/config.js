module.exports = {
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
