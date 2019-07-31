
const CARD_WIDTH_RATIO = 5 / 7; // poker playing card ratio
const BOARD_WIDTH_RATIO = 6 / 8;

const game = new Game();

document.getElementById('game-canvas').addEventListener('click', () => {
	document.getElementById('game-description').style.display = 'none';
});
