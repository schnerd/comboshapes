/**
 * @param {Function!} child
 * @param {Function!} parent
 */
const inherits = (child, parent) => {
	/**
	 * @constructor
	 */
	let tmp = function(){};
	tmp.prototype = parent.prototype;
	child.prototype = new tmp();
	child.prototype.constructor = child;
};

/**
 * @param {Array<GameObject!>!} gameObjects
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
const propagateClick = (gameObjects, x, y) => {
	for (let i = gameObjects.length - 1; i >= 0; i--) {
		if (gameObjects[i].visible && gameObjects[i].containsCoord(x, y)) {
			gameObjects[i].click(x, y);
			return true; // only allow the topmost element to be clicked so that elements can "cover" one another
		}
	}
	return false;
};
