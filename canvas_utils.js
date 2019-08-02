/**
 * @param {Array<Array<number>!>!} coords
 * @param {Array<Array<number>!>!} baseCoords
 * @param {number} perturbRadius
 * @returns {Array<Array<number>!>!}
 */
const perturbCoords = (coords, baseCoords, perturbRadius) => {
	for (let i = 0; i < coords.length; i++) {
		coords[i][0] += Math.random() * perturbRadius / 2 * 2 - perturbRadius / 2;
		coords[i][1] += Math.random() * perturbRadius / 2 * 2 - perturbRadius / 2;
		coords[i][0] = Math.min(baseCoords[i][0] + perturbRadius, Math.max(baseCoords[i][0] - perturbRadius, coords[i][0]));
		coords[i][1] = Math.min(baseCoords[i][1] + perturbRadius, Math.max(baseCoords[i][1] - perturbRadius, coords[i][1]));
	}
	return coords;
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 */
const fillCircle = (context, x, y, radius) => {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI);
	context.fill();
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 */
const strokeCircle = (context, x, y, radius) => {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI);
	context.stroke();
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number=} radius
 */
const fillRect = (context, x, y, width, height, radius) => {
	// since we're using paths and the browser will draw something still even when size should be zero
	if (!width || !height) {
		return;
	}
	radius = radius || 0;
	if (!radius) {
		context.fillRect(x, y, width, height);
		return;
	}
	context.beginPath();
	context.moveTo(x + radius, y);
	context.lineTo(x + width - radius, y);
	context.quadraticCurveTo(x + width, y, x + width, y + radius);
	context.lineTo(x + width, y + height - radius);
	context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	context.lineTo(x + radius, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - radius);
	context.lineTo(x, y + radius);
	context.quadraticCurveTo(x, y, x + radius, y);
	context.closePath();
	context.fill();
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} fontFamily
 * @param {string} fontColor
 * @param {string} text
 */
const centerText = (context, x, y, size, fontFamily, fontColor, text) => {
	context.save();
	context.fillStyle = fontColor;
	context.font = size + 'px ' + fontFamily;
	context.textAlign = 'center';
	context.textBaseline = 'top';
	context.fillText(text, x, y - size / 2);
	context.restore();
};
