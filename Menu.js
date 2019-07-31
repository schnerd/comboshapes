/**
 * @param {Game!} game
 * @param {string} title
 * @constructor
 * @extends {GameObject}
 */
function Menu(game, title) {
	GameObject.call(this, game);

	/** @type {string} */
	this.title = title;
	/** @type {Array<Button!>!} */
	this.buttons = [];
	this.visible = false;
}

inherits(Menu, GameObject);

/**
 * @param {string} newTitle
 */
Menu.prototype.setTitle = function(newTitle) {
	this.title = newTitle;
};

/**
 * @param {Button!} button
 * @returns {Button!}
 */
Menu.prototype.addButton = function(button) {
	this.buttons.push(button);
	return button;
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} w
 * @param {number} h
 */
Menu.prototype.draw = function(context, w, h) {
	if (!this.visible) {
		return;
	}
	this.setCoords(0, 0, w, h);
	context.fillStyle = 'rgba(0,0,0,0.8)';
	context.fillRect(0, 0, w, h);

	const itemCount = this.buttons.length + 1; // buttons plus title

	const buttonWidth = w * 0.8;
	const buttonHeight = Math.min(h * 0.1, h * 0.7 / itemCount);
	const buttonPadding = buttonHeight * 0.3;
	const totalItemHeight = itemCount * buttonHeight + (itemCount - 1) * buttonPadding;
	const buttonX = w / 2 - buttonWidth / 2;

	const textX = buttonX + buttonWidth / 2;
	const textY = h / 2 - totalItemHeight / 2 + buttonHeight / 2;
	centerText(context, textX, textY, buttonHeight * 0.66, 'helvetica,arial', '#fff', this.title);

	for (let i = 0; i < this.buttons.length; i++) {
		const buttonY = h / 2 - totalItemHeight / 2 + (i + 1) * (buttonHeight + buttonPadding);
		this.buttons[i].draw(context, buttonX, buttonY, buttonWidth, buttonHeight);
	}
};

/**
 * @param {number} x
 * @param {number} y
 */
Menu.prototype.click = function(x, y) {
	if (!propagateClick(this.buttons, x, y)) {
		//self.hide();
	}
};
