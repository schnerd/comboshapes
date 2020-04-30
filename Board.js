/**
 * @param {Game!} game
 * @constructor
 * @extends {GameObject}
 */
function Board(game) {
	GameObject.call(this, game);
	/** @type {Array<Card!>!} */
	this.cards = [];
	/** @type {Object<boolean>!} */
	this.cardHashes = {};
	/** @type {Array<Card!>!} */
	this.finishedCards = [];
	/** @type {number} */
	this._numValidSets = -1;
}

const NUM_CARDS = 16;
// percentiles for number of valid sets per board: [1, 5, 5, 6, 7, 7, 8, 8, 9, 10, 15] (0th ... 100th)
const MIN_SETS_EASY = 9; // ~70th percentile
const MAX_SETS_HARD = 5; // ~30th percentile

inherits(Board, GameObject);

Board.prototype.clear = function() {
	for (let i = 0; i < this.cards.length; i++) {
		this.cards[i].spinAway();
	}
	this.finishedCards = this.cards;
	this.cards = [];
	this.cardHashes = {};
};

/**
 * @param {boolean=} removeSelected
 */
Board.prototype.populate = function(removeSelected) {
	let minSets = 1;
	let maxSets = Infinity;
	const difficulty = this.game.getTargetDifficulty();
	if (difficulty === 'hard') {
		maxSets = MAX_SETS_HARD;
	} else if (difficulty === 'medium') {
		minSets = MAX_SETS_HARD + 1;
		maxSets = MIN_SETS_EASY - 1;
	} else {
		minSets = MIN_SETS_EASY;
	}
	/** @type {Array<number>!} */
	let indexes = [];
	for (let i = 0; i < NUM_CARDS; i++) {
		if (!this.cards[i] || (removeSelected && this.cards[i].selected)) {
			indexes.push(i);
		}
	}
	let numSets;
	let tries = 0;
	do {
		for (let i = 0; i < indexes.length; i++) {
			const index = indexes[i];
			if (this.cards[index]) {
				this.cardHashes[this.cards[index].uniqueHash()] = false;
			}
			let found = false;
			while (!found) {
				const card = new Card(game);
				const hash = card.uniqueHash();
				if (!this.cardHashes[hash]) {
					this.cards[index] = card;
					this.cardHashes[hash] = true;
					found = true;
				}
			}
		}
		this._numValidSets = -1;
		numSets = this.numValidSets();
		tries++;
		// it may be impossible to satisfy maxSets if board already has more than the max, so only try 10 times
	} while ((numSets < minSets || numSets > maxSets) && tries < 10);
};

/**
 * @returns {boolean}
 */
Board.prototype.solvable = function() {
	return this.numValidSets(true) > 0;
};

/**
 * @returns {string}
 */
Board.prototype.getActualDifficulty = function() {
	const numSets = this.numValidSets();
	if (numSets <= MAX_SETS_HARD) {
		return 'hard';
	}
	if (numSets < MIN_SETS_EASY) {
		return 'medium';
	}
	return 'easy';
};

/**
 * @param {boolean=} stopIfFound
 * @returns {number}
 */
Board.prototype.numValidSets = function(stopIfFound) {
	if (this._numValidSets !== -1) {
		return this._numValidSets;
	}
	let n = 0;
	for (let a = 0; a < this.cards.length; a++) {
		for (let b = 0; b < this.cards.length; b++) {
			if (b === a) {
				continue;
			}
			for (let c = 0; c < this.cards.length; c++) {
				if (c === a || c === b) {
					continue;
				}
				if (this.isValidSet(this.cards[a], this.cards[b], this.cards[c])) {
					n++;
					if (stopIfFound) {
						return n;
					}
				}
			}
		}
	}
	return n / 6; // because there are 6 permutations for each set of 3 cards, order doesn't matter
};

/**
 * @param {Card!} cardA
 * @param {Card!} cardB
 * @param {Card!} cardC
 * @returns {boolean}
 */
Board.prototype.isValidSet = function(cardA, cardB, cardC) {
	if (!(
		(cardA.colorNum === cardB.colorNum && cardB.colorNum === cardC.colorNum) ||
		(cardA.colorNum !== cardB.colorNum && cardB.colorNum !== cardC.colorNum && cardA.colorNum !== cardC.colorNum)
	)) {
		return false;
	}
	if (!(
		(cardA.shapeNum === cardB.shapeNum && cardB.shapeNum === cardC.shapeNum) ||
		(cardA.shapeNum !== cardB.shapeNum && cardB.shapeNum !== cardC.shapeNum && cardA.shapeNum !== cardC.shapeNum)
	)) {
		return false;
	}
	if (!(
		(cardA.patternNum === cardB.patternNum && cardB.patternNum === cardC.patternNum) ||
		(cardA.patternNum !== cardB.patternNum && cardB.patternNum !== cardC.patternNum && cardA.patternNum !== cardC.patternNum)
	)) {
		return false;
	}
	if (!(
		(cardA.countNum === cardB.countNum && cardB.countNum === cardC.countNum) ||
		(cardA.countNum !== cardB.countNum && cardB.countNum !== cardC.countNum && cardA.countNum !== cardC.countNum)
	)) {
		return false;
	}
	return true;
};

/**
 * @param {CanvasRenderingContext2D!} context
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
Board.prototype.draw = function(context, x, y, w, h) {
	this.setCoords(x, y, w, h);
	context.fillStyle = GRAY;
	fillRect(context, x, y, w, h, 10);

	const dotRadius = w / 20;
	fillCircle(context, x + dotRadius / 2, y + dotRadius / 2, dotRadius);
	fillCircle(context, x + w - dotRadius / 2, y + dotRadius / 2, dotRadius);
	fillCircle(context, x + dotRadius / 2, y + h - dotRadius / 2, dotRadius);
	fillCircle(context, x + w - dotRadius / 2, y + h - dotRadius / 2, dotRadius);

	let cardWidth;
	let cardHeight;
	if (w / h > CARD_WIDTH_RATIO) {
		cardHeight = h * 0.21;
		cardWidth = cardHeight * CARD_WIDTH_RATIO;
	} else {
		cardWidth = w * 0.21;
		cardHeight = cardWidth / CARD_WIDTH_RATIO;
	}
	const cardPadding = (w - cardWidth * 4) / 2 / 3;
	const xPadding = (w - cardWidth * 4 - cardPadding * 3) / 2;
	const yPadding = (h - cardHeight * 4 - cardPadding * 3) / 2;

	for (let i = 0; i < this.cards.length; i++) {
		const row = i / 4 >> 0;
		const column = i % 4;
		this.cards[i].setCoords(x + xPadding + column * (cardWidth + cardPadding), y + yPadding + row * (cardHeight + cardPadding), cardWidth, cardHeight);
		this.cards[i].draw(context);
	}

	for (let i = this.finishedCards.length - 1; i >= 0; i--) {
		this.finishedCards[i].updateMotion();
		this.finishedCards[i].draw(context);
		if (!this.overlaps(this.finishedCards[i])) {
			this.finishedCards.splice(i, 1);
		}
	}
};

/**
 * @param {number} x
 * @param {number} y
 */
Board.prototype.click = function(x, y) {
	let cardChanged = false;
	for (let i = this.cards.length - 1; i >= 0; i--) {
		cardChanged = this.cards[i].click(x, y) || cardChanged;
	}
	/** @type {Array<Card!>!} */
	let selected = [];
	for (let i = 0; i < this.cards.length; i++) {
		if (this.cards[i].selected) {
			selected.push(this.cards[i]);
		}
	}
	if (selected.length === 3) {
		if (this.isValidSet(selected[0], selected[1], selected[2])) {
			const won = game.addSuccess();
			if (won) {
				this.clear();
			} else {
				for (let i = 0; i < selected.length; i++) {
					selected[i].spinAway();
				}
				this.finishedCards = selected;
				this.populate(true);
			}
		} else {
			for (let i = 0; i < selected.length; i++) {
				selected[i].selected = false;
			}
			game.addFailure();
		}
	} else if (cardChanged) {
		game.playSound(800, 1);
	}
};

Board.prototype.serialize = function() {
	return {
		cards: this.cards.map(card => card.serialize()),
	};
};

Board.prototype.load = function(serialized) {
	// We want to keep the same card instance when possible to preserve animations
	const existingCards = {};
	this.cards.forEach(card => {
		existingCards[card.uniqueHash()] = card;
	});

	const cardConfigs = serialized.cards;

	const newCards = [];
	for (let i = 0; i < cardConfigs.length; i++) {
		const card = new Card(game);
		card.load(cardConfigs[i]);
		const hash = card.uniqueHash();
		const existing = existingCards[hash];
		if (existing) {
			delete existingCards[hash];
			newCards.push(existing);
		} else {
			newCards.push(card);
		}
	}

	this.cards = newCards;
	this.cardHashes = {};
	for (let i = 0; i < this.cards.length; i++) {
		const card = this.cards[i];
		this.cardHashes[card.uniqueHash()] = true;
	}

	// Any remaining cards in existingCards should be spun away
	// (cleared by another user)
	this.finishedCards = Object.values(existingCards);
	this.finishedCards.forEach((card) => {
		card.spinAway();
	});
};
