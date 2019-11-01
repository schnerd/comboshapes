const basePerturbCoords = [
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
	[0, 0],
];

/**
 * @param {Game!} game
 * @constructor
 * @extends {GameObject}
 */
function Card(game) {
	GameObject.call(this, game);

	/** @type {number} */
	this.colorNum = Math.random() * 3 >> 0;
	/** @type {number} */
	this.shapeNum = Math.random() * 3 >> 0;
	/** @type {number} */
	this.patternNum = Math.random() * 3 >> 0;
	/** @type {number} */
	this.countNum = Math.random() * 3 >> 0;
	/** @type {number} */
	this.animationPercent = 0;
	/** @type {boolean} */
	this.selected = false;
	/** @type {Array<Array<number>!>!} */
	this.perturbCoords = [];
	if (this.shapeNum === 0) {
		for (let i = 0; i < basePerturbCoords.length; i++) {
			this.perturbCoords.push([0, 0]);
		}
	}
}

inherits(Card, GameObject);

const colors = ['#90f', '#f70', '#07f'];

/**
 * @returns {string}
 */
Card.prototype.uniqueHash = function() {
	return '' + this.colorNum + this.shapeNum + this.patternNum + this.countNum;
};

Card.prototype.spinAway = function() {
	this.lastPositionUpdateTime = Date.now();
	const velocity = 15 * this.w; // pixels per second
	const angle = Math.random() * Math.PI * 2;
	this.xVelocity = Math.sin(angle) * velocity;
	this.yVelocity = Math.cos(angle) * velocity;
	this.rotationVelocity = Math.PI * 6;
};

/**
 * @param {CanvasRenderingContext2D!} context
 */
Card.prototype.draw = function(context) {
	let x = this.x;
	let y = this.y;
	const w = this.w;
	const h = this.h;
	const currentTime = Date.now();

	const animationPeriod = 1000;
	let mod = (currentTime - this.initTime) % animationPeriod;
	mod = mod > animationPeriod / 2 ? (animationPeriod - mod) : mod;
	this.animationPercent = mod / (animationPeriod / 2);

	context.save();
	if (this.rotation) {
		context.translate(x + w / 2, y + h / 2);
		context.rotate(this.rotation);
		x -= x + w / 2;
		y -= y + h / 2;
	}

	const borderRadius = w / 20;
	if (this.selected) {
		context.fillStyle = '#90f';
		let borderWidth = w / 15;
		fillRect(context, x - borderWidth, y - borderWidth, w + borderWidth * 2, h + borderWidth * 2, borderRadius);
		context.fillStyle = '#f70';
		borderWidth = this.animationPercent * w / 15;
		fillRect(context, x - borderWidth, y - borderWidth, w + borderWidth * 2, h + borderWidth * 2, borderRadius);
	}
	context.fillStyle = '#fff';
	fillRect(context, x, y, w, h, borderRadius);

	if (this.shapeNum === 0) {
		this.perturbCoords = perturbCoords(this.perturbCoords, basePerturbCoords, w * 0.01);
	}

	const shapeWidth = h * 0.22;
	const shapeX = x + w / 2 - shapeWidth / 2;
	if (this.countNum === 0) {
		this.drawShape(context, shapeX, y + h * 0.50 - shapeWidth / 2, shapeWidth, shapeWidth);
	} else if (this.countNum === 1) {
		this.drawShape(context, shapeX, y + h * 0.33 - shapeWidth / 2, shapeWidth, shapeWidth);
		this.drawShape(context, shapeX, y + h * 0.66 - shapeWidth / 2, shapeWidth, shapeWidth);
	} else {
		this.drawShape(context, shapeX, y + h * 0.20 - shapeWidth / 2, shapeWidth, shapeWidth);
		this.drawShape(context, shapeX, y + h * 0.50 - shapeWidth / 2, shapeWidth, shapeWidth);
		this.drawShape(context, shapeX, y + h * 0.80 - shapeWidth / 2, shapeWidth, shapeWidth);
	}

	context.restore();
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
Card.prototype.drawShape = function(context, x, y, w, h) {
	context.save();

	if (this.patternNum === 0) {
		context.fillStyle = colors[this.colorNum];
		context.strokeStyle = 'none';
	} else if (this.patternNum === 1) {
		context.fillStyle = 'none';
		context.lineWidth = w / 15;
		context.strokeStyle = colors[this.colorNum];
		x += context.lineWidth / 2;
		y += context.lineWidth / 2;
		w -= context.lineWidth;
		h -= context.lineWidth;
	} else {
		context.fillStyle = 'none';
		context.lineWidth = w / 9;
		context.strokeStyle = colors[this.colorNum];
		x += context.lineWidth / 2;
		y += context.lineWidth / 2;
		w -= context.lineWidth;
		h -= context.lineWidth;
	}
	if (this.shapeNum === 0) {
		// vibrating square
		/** @type {Array<Array<number>!>!} */
		let coords = [
			[x, y],
			[x + w * 0.5, y],
			[x + w, y],
			[x + w, y + h * 0.5],
			[x + w, y + h],
			[x + w * 0.5, y + h],
			[x, y + h],
			[x, y + h * 0.5],
		];
		for (let i = 0; i < this.perturbCoords.length; i++) {
			coords[i][0] += this.perturbCoords[i][0];
			coords[i][1] += this.perturbCoords[i][1];
		}
		let multiples = [1];
		if (this.patternNum === 1) {
			multiples = [1, 0.66, 0.33];
		}
		for (let j = 0; j < multiples.length; j++) {
			context.beginPath();
			// translate outer rectangle coords to origin, scale them down, then translate back
			const coordX = ((coords[0][0] - (x + w / 2)) * multiples[j]) + (x + w / 2);
			const coordY = ((coords[0][1] - (y + h / 2)) * multiples[j]) + (y + h / 2);
			context.moveTo(coordX, coordY);
			for (let i = 1; i < coords.length; i++) {
				const coordX = ((coords[i][0] - (x + w / 2)) * multiples[j]) + (x + w / 2);
				const coordY = ((coords[i][1] - (y + h / 2)) * multiples[j]) + (y + h / 2);
				context.lineTo(coordX, coordY);
			}
			context.closePath();
			if (this.patternNum === 0) {
				context.fill();
			} else {
				context.stroke();
			}
		}
	} else if (this.shapeNum === 1) {
		// pulsating circle
		const radius = w / 2 * (0.9 + this.animationPercent * 0.2);
		if (this.patternNum === 0) {
			fillCircle(context, x + w / 2, y + h / 2, radius);
		} else {
			strokeCircle(context, x + w / 2, y + h / 2, radius);
			if (this.patternNum === 1) {
				strokeCircle(context, x + w / 2, y + h / 2, radius * 0.66);
				strokeCircle(context, x + w / 2, y + h / 2, radius * 0.33);
			}
		}
	} else {
		// tilting triangle
		const outerTriangleH = h * Math.sqrt(3) / 2;
		let multiples = [1];
		if (this.patternNum === 1) {
			multiples = [1, 0.5, 0.04];
		}
		for (let i = 0; i < multiples.length; i++) {
			const newW = w * multiples[i];
			const newH = h * multiples[i];
			const newX = x + (w - newW) / 2;
			const newY = y + (h - newH) / 2;
			const triangleH = newH * Math.sqrt(3) / 2; // equilateral triangle height
			context.save();
			context.translate(newX + newW / 2, newY + newH / 2 + outerTriangleH * 0.15);
			context.rotate(this.animationPercent * Math.PI / 8 - Math.PI / 16);
			context.beginPath();
			context.moveTo(0, -triangleH * 0.65);
			context.lineTo(newW / 2, triangleH * 0.35);
			context.lineTo(-newW / 2, triangleH * 0.35);
			context.closePath();
			if (this.patternNum === 0) {
				context.fill();
			} else {
				context.stroke();
			}
			context.restore();
		}
	}

	context.restore();
};

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
Card.prototype.click = function(x, y) {
	if (x >= this.x && x < this.x + this.w && y >= this.y && y < this.y + this.h) {
		this.selected = !this.selected;
		return true;
	}
	return false;
};
