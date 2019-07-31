/**
 * @param {Game!} game
 * @constructor
 */
function GameObject(game) {
	this.game = game;

	/** @type {boolean} */
	this.visible = true;
	/** @type {number} */
	this.x = 0;
	/** @type {number} */
	this.y = 0;
	/** @type {number} */
	this.w = 0;
	/** @type {number} */
	this.h = 0;
	/** @type {number} */
	this.rotation = 0;
	/** @type {number} */
	this.xVelocity = 0; // pixels per second
	/** @type {number} */
	this.yVelocity = 0; // pixels per second
	/** @type {number} */
	this.rotationVelocity = 0;
	/** @type {number} */
	this.initTime = Date.now();
	/** @type {number} */
	this.lastPositionUpdateTime = 0;
}

GameObject.prototype = {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	setCoords: function(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	},
	updateMotion: function() {
		const currentTime = Date.now();
		const multiplier = (currentTime - this.lastPositionUpdateTime) / 1000;
		this.x += this.xVelocity * multiplier;
		this.y += this.yVelocity * multiplier;
		this.rotation += this.rotationVelocity * multiplier;
		this.lastPositionUpdateTime = currentTime;
	},
	/**
	 * @param {GameObject!} other
	 * @returns {boolean}
	 */
	overlaps: function(other) {
		return other.x + other.w > this.x
			&& other.y + other.h > this.y
			&& other.x < this.x + this.w
			&& other.y < this.y + this.h;
	},
	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {boolean}
	 */
	containsCoord: function(x, y) {
		return x >= this.x
			&& x < this.x + this.w
			&& y >= this.y
			&& y < this.y + this.h;
	},
	show: function() {
		this.visible = true;
	},
	hide: function() {
		this.visible = false;
	},
	/**
	 * @param {boolean=} on
	 */
	toggle: function(on) {
		this.visible = on !== undefined ? !!on : !this.visible;
	},
};
