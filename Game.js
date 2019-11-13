
const PURPLE = '#9855ff';
const WHITE = '#fff';
const GRAY = '#554f4f';

/**
 * @constructor
 */
function Game() {
	/** @type {HTMLCanvasElement!} */
	const canvas = document.getElementById('game-canvas');
	/** @type {CanvasRenderingContext2D!} */
	const context = canvas.getContext('2d');
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	let canvasStyleWidth;
	let canvasStyleHeight;
	let resolutionMultiplier = 1;
	/** @type {window.AudioContext!} */
	let audioContext; // lazy initialize only after user interacts to avoid browser auto-blocking it
	/** @type {GainNode!} */
	let musicGain;

	const DIFFICULTY_COLORS = {
		'easy': '#4b4',
		'medium': '#aa0',
		'hard': '#f44',
	};
	const SECONDS_PER_LEVEL = 90;
	const CANVAS_WIDTH_RATIO = 5 / 8;
	const MUSIC_VOLUME = 0.2;

	const board = new Board(this);
	const gameMenu = new Menu(this, '');
	const loseMenu = new Menu(this, 'You Lose.');
	const winMenu = new Menu(this, 'You Won!');

	/** @type {Button!} */
	let toggleMusicButton;
	/** @type {Button!} */
	let gameMenuCancelButton;
	/** @type {Button!} */
	let nextLevelButton;
	/** @type {Button!} */
	let menuButton;

	/** @type {number} */
	let level = 0;
	/** @type {number} */
	let levelStartTime;
	/** @type {number} */
	let pauseInitTime;
	/** @type {number} */
	let pauseTotalTime = 0;
	/** @type {boolean} */
	let paused = false;
	let frameCount = 0;
	/** @type {number} */
	let currentFrameTime;
	/** @type {number} */
	let fpsFrameTime;
	/** @type {number} */
	let fpsPreviousFrameTime;
	/** @type {number} */
	let successCount = 0;
	/** @type {number} */
	let failureCount = 0;
	/** @type {number} */
	let pointsNeeded = 0;
	let soundEnabled = true;
	let musicEnabled = false;

	const resizeCanvas = () => {
		// use full screen if screen ratio is close enough to target ratio, aka phones in vertical mode
		if (Math.abs(window.innerWidth / window.innerHeight - CANVAS_WIDTH_RATIO) < 0.1) {
			canvasStyleWidth = window.innerWidth;
			canvasStyleHeight = window.innerHeight;
		} else {
			if (window.innerWidth / window.innerHeight > CANVAS_WIDTH_RATIO) {
				canvasStyleHeight = window.innerHeight;
				canvasStyleWidth = canvasStyleHeight * CANVAS_WIDTH_RATIO;
			} else {
				canvasStyleWidth = window.innerWidth;
				canvasStyleHeight = canvasStyleWidth / CANVAS_WIDTH_RATIO;
			}
		}
		canvas.style.width = canvasStyleWidth + 'px';
		canvas.style.height = canvasStyleHeight + 'px';
		// canvas.style.transformOrigin = '0 0';
		// canvas.style.transform = 'scale(' + (1 / resolutionMultiplier) + ')';
		canvas.width = canvasStyleWidth * resolutionMultiplier;
		canvas.height = canvasStyleHeight * resolutionMultiplier;
	};

	const drawBackground = () => {
		context.save();
		context.fillStyle = PURPLE;
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.restore();
	};

	const update = () => {
		currentFrameTime = Date.now();
		if (frameCount % 10 === 0) {
			fpsPreviousFrameTime = fpsFrameTime;
			fpsFrameTime = currentFrameTime;
		}
		if (!paused && currentFrameTime - levelStartTime - pauseTotalTime > SECONDS_PER_LEVEL * 1000) {
			pause();
			board.clear();
			loseMenu.show();
			playSound(100, 2);
		}
	};

	const tick = () => {
		update();
		this.draw();
		frameCount++;
		window.requestAnimationFrame(tick);
	};

	const pause = () => {
		// use Date.now directly instead of currentFrameTime in case requestAnimationFrame is paused by browser
		// (such as when the window is minimized or browser tab changed which could not count pause time correctly)
		if (!paused) {
			pauseInitTime = Date.now();
			paused = true;
		} else {
			pauseTotalTime += Date.now() - pauseInitTime;
			paused = false;
		}
	};

	/**
	 * @param {number} freq
	 * @param {number=} fadeOutTime
	 */
	const playSound = (freq, fadeOutTime) => {
		if (!soundEnabled || !audioContext) {
			return;
		}
		fadeOutTime = fadeOutTime || 0.5;
		const o = audioContext.createOscillator();
		const g = audioContext.createGain();
		o.connect(g);
		g.connect(audioContext.destination);
		o.frequency.value = freq;
		o.type = 'triangle';
		o.start(0);
		g.gain.value = 0.01;
		g.gain.exponentialRampToValueAtTime(1, audioContext.currentTime + 0.05);
		g.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + fadeOutTime);
		o.stop(audioContext.currentTime + fadeOutTime * 2);
	};
	this.playSound = playSound; // breaks closure advanced optimizations if assigned on same line as function

	/**
	 * @param {Array<number>!} freqs
	 * @param {number} fadeOutTime
	 * @param {number} delay
	 */
	const playSounds = (freqs, fadeOutTime, delay) => {
		let i = 0;
		const play = () => {
			playSound(freqs[i], fadeOutTime);
			i++;
			if (i < freqs.length) {
				setTimeout(play, delay * 1000);
			}
		};
		play();
	};

	const startMusic = () => {
		if (!audioContext) {
			return;
		}
		const o = audioContext.createOscillator();
		musicGain = audioContext.createGain();
		o.connect(musicGain);
		musicGain.connect(audioContext.destination);
		o.type = 'triangle';
		musicGain.gain.value = 0.01;
		o.start(0);
		musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, audioContext.currentTime + 0.05);
		const freqs = [200, 250, 300, 400];
		const lengths = [0.5, 0.25];
		let elapsed = 0;
		let lastFreq;
		while (elapsed < 3600) {
			/** @type {number} */
			const freq = freqs[Math.random() * freqs.length >> 0];
			if (freq === lastFreq) {
				continue;
			}
			lastFreq = freq;
			/** @type {number} */
			const length = lengths[Math.random() * lengths.length >> 0];
			o.frequency.setValueAtTime(freq, audioContext.currentTime + elapsed);
			elapsed += length;
		}
		musicGain.gain.setValueAtTime(MUSIC_VOLUME, audioContext.currentTime + elapsed);
		musicGain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + elapsed + 1);
	};

	const toggleMusic = () => {
		if (musicEnabled) {
			musicEnabled = false;
			toggleMusicButton.text = 'Enable Music';
			musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, audioContext.currentTime);
			musicGain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.05);
		} else {
			musicEnabled = true;
			toggleMusicButton.text = 'Disable Music';
			if (musicGain) {
				musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, audioContext.currentTime + 0.05);
			} else {
				startMusic();
			}
		}
	};

	/**
	 * @returns {boolean} whether the game was one after this successful set
	 */
	this.addSuccess = () => {
		successCount++;
		playSounds([800, 1200, 1600], 0.5, 0.1);
		if (successCount - failureCount >= pointsNeeded) {
			pause();
			nextLevelButton.text = 'Start Level ' + (level + 1);
			winMenu.show();
			return true;
		}
		return false;
	};

	/**
	 * @returns {string}
	 */
	this.getTargetDifficulty = () => {
		const progress = (successCount - failureCount) / pointsNeeded;
		if (progress >= 2/3) {
			return 'hard';
		}
		if (progress >= 1/3) {
			return 'medium';
		}
		return 'easy';
	};

	this.addFailure = () => {
		failureCount++;
		playSounds([900, 600, 400], 0.5, 0.1);
	};

	this.draw = () => {
		drawBackground();

		const panelHeight = canvas.height * 0.1;
		const maxWidth = canvas.width;
		const maxHeight = canvas.height - panelHeight;
		const boardPadding = maxWidth * 0.03;
		const boardWidth = maxWidth - boardPadding * 2;
		const boardHeight = maxHeight - panelHeight;
		board.draw(context, (canvas.width - boardWidth) / 2, (canvas.height - boardHeight - boardPadding), boardWidth, boardHeight);

		const numValidSets = board.numValidSets();
		const difficulty = board.getActualDifficulty();
		const color = DIFFICULTY_COLORS[difficulty];
		let t = 'board contains ' + numValidSets + ' set' + (numValidSets === 1 ? '' : 's') + ' (' + difficulty.toUpperCase() + ')';
		fillRect(context, board.x + boardWidth * 0.2, panelHeight + maxHeight * 0.023, boardWidth * 0.6, maxHeight * 0.05, panelHeight * 0.07);
		centerText(context, board.x + boardWidth / 2, panelHeight + maxHeight * 0.05, panelHeight * 0.2, 'arial', color, t);

		menuButton.draw(context, board.x, panelHeight * 0.25, boardWidth * 0.2, panelHeight * 0.5);

		context.fillStyle = GRAY;
		fillRect(context, board.x + boardWidth * 0.3, panelHeight * 0.15, boardWidth * 0.4, panelHeight * 0.7, panelHeight * 0.07);
		centerText(context, board.x + boardWidth / 2, panelHeight * 0.33, panelHeight * 0.2, 'arial', WHITE, 'Level ' + level);
		const text = (successCount - failureCount) + ' / ' + pointsNeeded + ' sets';
		centerText(context, board.x + boardWidth / 2, panelHeight * 0.66, panelHeight * 0.3, 'arial', WHITE, text);
		if (fpsPreviousFrameTime) {
			const fps = Math.round(10000 / (fpsFrameTime - fpsPreviousFrameTime));
			context.fillStyle = PURPLE;
			fillRect(context, board.x + boardWidth * 0.8, panelHeight * 0.4, boardWidth * 0.2, panelHeight * 0.4);
			centerText(context, board.x + boardWidth * 0.9, panelHeight * 0.5, panelHeight * 0.2, 'monospace', WHITE, fps + ' fps');
		}

		// timer progress bar
		const barWidth = boardWidth * 0.4;
		const barHeight = panelHeight / 20;
		const barX = board.x + boardWidth * 0.3;
		const barY = panelHeight - (panelHeight * 0.15 - barHeight) / 2;
		context.fillStyle = GRAY;
		fillRect(context, barX, barY, barWidth, barHeight, barHeight / 2);
		context.fillStyle = WHITE;
		const percent = Math.max(0, SECONDS_PER_LEVEL - ((paused ? pauseInitTime : currentFrameTime) - levelStartTime - pauseTotalTime) / 1000) / SECONDS_PER_LEVEL;
		fillRect(context, barX, barY, barWidth * percent, barHeight, barHeight / 2);

		gameMenu.draw(context, canvas.width, canvas.height);
		loseMenu.draw(context, canvas.width, canvas.height);
		winMenu.draw(context, canvas.width, canvas.height);
	};

	const init = () => {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// pause and disable music when tab is changed (doesn't work when entire browser window is defocused though)
		/** @type {boolean} */
		let windowBlurPaused = false;
		/** @type {boolean} */
		let windowBlurMusicDisabled = false;
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				if (!paused) {
					pause();
					windowBlurPaused = true;
				}
				if (musicEnabled) {
					toggleMusic();
					windowBlurMusicDisabled = true;
				}
			} else {
				if (paused && windowBlurPaused) {
					pause();
				}
				if (!musicEnabled && windowBlurMusicDisabled) {
					toggleMusic();
				}
				windowBlurPaused = false;
				windowBlurMusicDisabled = false;
			}
		});

		/**
		 * @param {Event!} e
		 */
		const handleKeyup = (e) => {
			if (!audioContext) {
				audioContext = new AudioContext();
			}
			if (e.key === 'Escape') {
				if (level && !winMenu.visible && !loseMenu.visible) {
					pause();
					gameMenu.toggle();
				}
			}
		};
		document.addEventListener('keyup', handleKeyup);
		document.addEventListener('click', (e) => {
			if (!audioContext) {
				audioContext = new AudioContext();
			}
			click(e.clientX, e.clientY);
		});

		menuButton = new Button(this, 'Menu', () => {
			pause();
			gameMenu.toggle();
		});
		menuButton.setColors(WHITE, GRAY);

		gameMenu.addButton(new Button(this, 'New Game', () => {
			startNewGame();
			gameMenu.hide();
			playStartSound();
		}));

		/**
		 * @param {Button!} button
		 */
		const handleSoundButtonClick = (button) => {
			if (button.text === 'Disable Sound Effects') {
				soundEnabled = false;
				button.text = 'Enable Sound Effects';
			} else {
				soundEnabled = true;
				button.text = 'Disable Sound Effects';
				playSounds([800, 1200, 1600], 0.5, 0.1);
			}
		};
		gameMenu.addButton(new Button(this, 'Disable Sound Effects', handleSoundButtonClick));

		toggleMusicButton = gameMenu.addButton(new Button(this, 'Enable Music', toggleMusic));

		/**
		 * @param {Button!} button
		 */
		const handleResolutionButtonClick = (button) => {
			resolutionMultiplier *= 2;
			if (resolutionMultiplier > 4) {
				resolutionMultiplier = 0.25;
			}
			resizeCanvas();
			button.text = 'Resolution: ' + resolutionMultiplier + 'X';
		};
		gameMenu.addButton(new Button(this, 'Resolution: 1X', handleResolutionButtonClick));

		gameMenuCancelButton = gameMenu.addButton(new Button(this, 'Cancel', () => {
			pause();
			gameMenu.hide();
		}));

		loseMenu.addButton(new Button(this, 'New Game', () => {
			startNewGame();
			loseMenu.hide();
			playStartSound();
		}));

		nextLevelButton = winMenu.addButton(new Button(this, 'Start Next Level', () => {
			winMenu.hide();
			startNextLevel();
		}));

		tick();

		gameMenuCancelButton.hide();
		gameMenu.setTitle('Combo Shapes');
		gameMenu.show();
	};

	const playStartSound = () => {
		playSounds([400, 600, 900, 1350, 900, 600, 400], 0.5, 0.1);
	};

	const startNextLevel = () => {
		level++;
		levelStartTime = Date.now();
		pauseTotalTime = 0;
		paused = false;
		successCount = 0;
		failureCount = 0;
		pointsNeeded = level;
		board.clear();
		board.populate();
	};

	const startNewGame = () => {
		level = 0;
		gameMenuCancelButton.show();
		gameMenu.setTitle('Game Paused');
		startNextLevel();
	};

	/**
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	const click = (clientX, clientY) => {
		const x = (clientX - (window.innerWidth - canvasStyleWidth) / 2) / canvasStyleWidth * canvas.width;
		const y = clientY / canvasStyleHeight * canvas.height;
		propagateClick([menuButton, board, gameMenu, loseMenu, winMenu], x, y);
	};

	init();
}
