module.exports.random = function random(min, max) {
	return Math.random() * (max - min) + min;
}

module.exports.cantor = function cantor(k1, k2) {
	return 1 / 2 * (k1 + k2) * (k1 + k2 + 1) + k2;
}

module.exports.constrain = function constrain(n, min, max) {
	return Math.max(Math.min(n, max), min);
}

module.exports.warn = function warn(condition, message) {
	if (condition) {
		console.warn(message);
	}
}
