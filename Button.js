/**
 * @param {Game!} game
 * @param {string} text
 * @param {Function!} callback
 * @constructor
 * @extends {GameObject}
 */
function Button(game, text, callback) {
	GameObject.call(this, game);

	/** @type {string} */
	this.text = text;
	this.callback = callback;
	/** @type {string} */
	this.fontColor = '#fff';
	/** @type {string} */
	this.backgroundColor = '#539';
}

inherits(Button, GameObject);

/**
 * @param {string} font
 * @param {string} background
 */
Button.prototype.setColors = function(font, background) {
	this.fontColor = font;
	this.backgroundColor = background;
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
Button.prototype.draw = function(context, x, y, w, h) {
	if (!this.visible) {
		return;
	}
	this.setCoords(x, y, w, h);
	context.fillStyle = this.backgroundColor;
	fillRect(context, x, y, w, h, h / 10);
	centerText(context, x + w / 2, y + h / 2, h * 0.4, 'helvetica, arial', this.fontColor, this.text);
};

/**
 * @param {number} x
 * @param {number} y
 */
Button.prototype.click = function(x, y) {
	this.callback(this);
};
