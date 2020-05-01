
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
	const groupMenu = new Menu(this, '');

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

	this.isGroup = false;
	this.isGroupHost = false;
	let hostPeer;
	let clients = [];
	let clientPeer;
	let clientConn;
	let players = {};
	let groupLog = [];

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
			if (this.isGroup) {
				// Ignore pause time in group games
				pauseTotalTime = 0;
			} else {
				pauseTotalTime += Date.now() - pauseInitTime;
			}
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

	this.addSuccess = () => {
		successCount++;
		this.playSuccessSound();
	};

	this.playSuccessSound = () => {
		playSounds([800, 1200, 1600], 0.5, 0.1);
	};

	/**
	 * @returns {boolean} whether the game was won after this successful set
	 */
	this.checkWin = () => {
		if (successCount - failureCount >= pointsNeeded) {
			pause();

			if (this.isGroup) {
				if (this.isGroupHost) {
					nextLevelButton.text = 'Start Level ' + (level + 1);
					nextLevelButton.show();
				} else {
					nextLevelButton.hide();
				}
			}

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
		this.playFailureSound();
	};

	this.playFailureSound = () => {
		playSounds([900, 600, 400], 0.5, 0.1);
	};

	this.incrementHostFailure = () => {
		const player = players[hostPeer.id];
		if (player) {
			player.failure++;
		}
		this.broadcastLog(player.name + ' messed up');
		this.drawGroupPanel();
	};

	this.incrementHostSuccess = () => {
		const player = players[hostPeer.id];
		if (player) {
			player.success++;
		}
		this.broadcastLog(player.name + ' found a set');
		this.drawGroupPanel();
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
		groupMenu.draw(context, canvas.width, canvas.height);
		loseMenu.draw(context, canvas.width, canvas.height);
		winMenu.draw(context, canvas.width, canvas.height);
	};

	const $groupPanel = document.getElementById('group-panel');
	this.drawGroupPanel = () => {
		$groupPanel.style.display = 'block';

		const sorted = Object.values(players).sort((a, b) => {
			return (b.success - b.failure) - (a.success - a.failure);
		});
		const html = `
		<div class="group-scores">
			<h2>Scores</h2>
			${sorted.map(player => {
				return `
				<div class="group-player">
					<div class="group-player-name">${player.name}</div>
					<div class="group-player-success">${player.success}</div>
					<div class="group-player-failure">${player.failure}</div>
				</div>
				`;
			}).join('')}
		</div>
		<div class="group-logs">
			${groupLog.map(log => `<div class="group-log">${log}</div>`).reverse().join('')}
		</div>
		`;

		$groupPanel.innerHTML = html;
	};
	this.hideGroupPanel = () => {
		$groupPanel.style.display = 'none';
	};

	const serializeGameState = () => {
		return {
			type: 'state',
			level,
			pointsNeeded,
			levelStartTime,
			successCount,
			failureCount,
			players,
			board: board.serialize()
		}
	};

	/**
	 * Allows host to broadcast current game state to all clients
	 */
	this.broadcastGameState = () => {
		const state = serializeGameState();
		clients.forEach((conn) => {
			conn.send(state);
		});
	};

	/**
	 * Allows host to broadcast a game log entry to all clients
	 */
	this.broadcastLog = (msg) => {
		// Append for the host to see
		this.appendGroupLog(msg);
		// Then send to all clients
		clients.forEach((conn) => {
			conn.send({type: 'log', msg: msg});
		});
	};

	this.reportSuccess = (set) => {
		console.debug('Sent success to host');
		clientConn.send({type: 'success', set});
	};

	this.reportFailure = () => {
		console.debug('Sent failure to host');
		clientConn.send({type: 'failure'});
	};

	this.resetGroupScores = () => {
		Object.values(players).forEach(player => {
			player.success = 0;
			player.failure = 0;
		});
	};

	this.appendGroupLog = (msg) => {
		groupLog.push(msg);
		if (groupLog.length > 30) {
			groupLog = groupLog.slice(groupLog.length - 30);
		}
		this.drawGroupPanel();
	};

	const loadGameState = (serialized) => {
		level = serialized.level;
		pointsNeeded = serialized.pointsNeeded;
		levelStartTime = serialized.levelStartTime;
		successCount = serialized.successCount;
		failureCount = serialized.failureCount;
		players = serialized.players;
		board.load(serialized.board);
	};

	const init = () => {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		const query = window.location.search || '';
		const roomMatch = /room=(\w+)/.exec(query);
		const room = roomMatch ? roomMatch[1] : null;

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

		gameMenu.addButton(new Button(this, 'New Solo Game', () => {
			this.isGroup = false;
			this.isGroupHost = false;
			startNewGame();
			gameMenu.hide();
			// Just for testing (TODO delete me)
			// board.clear();
			// const state = {"type":"state","level":1,"pointsNeeded":1,"levelStartTime":1588278087467,"successCount":0,"failureCount":0,"board":{"cards":[[2,1,0,1],[1,2,1,0],[1,0,2,2],[1,2,1,2],[1,0,0,0],[2,2,1,0],[2,1,2,0],[1,2,2,1],[2,2,0,1],[0,2,0,0],[0,0,2,1],[2,2,1,1],[0,1,1,2],[1,1,0,1],[1,0,2,0],[1,0,1,1]]}};
			// state.levelStartTime = Date.now();
			// loadGameState(state);
		}));

		gameMenu.addButton(new Button(this, 'New Group Game', (button) => {
			const hostUsername = prompt('Please enter a username').substring(0, 30);

			this.resetGroupScores();
			button.text = 'Creating room...';
			this.isGroup = true;
			this.isGroupHost = true;
			hostPeer = new Peer();

			hostPeer.on('open', id => {
				history.replaceState(null, 'Group Game', "?room=" + id)
				startNewGame();
				gameMenu.hide();
				this.broadcastLog(hostUsername + ' started the game');
				players[id] = {success: 0, failure: 0, name: hostUsername};
				this.drawGroupPanel();
			});

			hostPeer.on('connection', conn => {
				console.debug('Received connection from peer ' + conn.peer);

				conn.on('data', data => {
					const player = players[conn.peer];
					if (!player) {
						return;
					}

					if (data.type === 'failure') {
						// Count the failure from our client
						this.addFailure();
						player.failure++;
						this.broadcastLog(player.name + ' messed up');
						this.drawGroupPanel();
						// Broadcast the game state back to all clients
						this.broadcastGameState();
					} else if (data.type === 'success') {
						const set = data.set;
						// First we need to get the cards from the hashes, then validate that it's still a set
						const cardsByHash = {};
						board.cards.forEach(card => {
							cardsByHash[card.uniqueHash()] = card;
						});
						const setCards = [];
						set.forEach(hash => {
							const card = cardsByHash[hash];
							if (card) {
								setCards.push(card);
							}
						});
						// Still a set on the board we see? If so, count it.
						if (setCards.length === 3 && board.isValidSet(setCards[0], setCards[1], setCards[2])) {
							board.acceptClientSet(setCards);
							player.success++;
							this.broadcastLog(player.name + ' found a set');
							this.drawGroupPanel();
							this.addSuccess();
							const won = this.checkWin();
							if (won) {
								board.clear();
							}
						}
						// Broadcast the game state back to all clients
						this.broadcastGameState();
					}
					console.debug('Received from client', data);
				});
			
				conn.on('open', () => {
					clients.push(conn);
					const meta = conn.metadata;
					this.broadcastLog(meta.username + ' joined the game');
					if (!players[conn.peer]) {
						players[conn.peer] = {success: 0, failure: 0, name: meta.username};
					}
					this.drawGroupPanel();
					conn.send(serializeGameState());
				});

				conn.on('close', () => {
					const player = players[conn.peer];
					clients = clients.filter(clientConn => clientConn.peer === conn.peer);
					this.broadcastLog(player.name + ' left the game');
					if (players[conn.peer]) {
						delete players[conn.peer];
					}
					this.drawGroupPanel();
				});

				conn.on('error', (err) => {
					const player = players[conn.peer];
					this.broadcastLog(player.name + ' had an error');
					this.drawGroupPanel();
				});
			});

			hostPeer.on('disconnected', function() {
				/**
				 * Emitted when the peer is disconnected from the signalling server, either 
				 * manually or because the connection to the signalling server was lost. 
				 * When a peer is disconnected, its existing connections will stay alive, 
				 * but the peer cannot accept or create any new connections. You can reconnect 
				 * to the server by calling peer.reconnect() .
				 */
				console.debug('Host peer disconnected');
			});

			hostPeer.on('error', (err) => {
				console.error('Host peer error', err);
			});

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

			if (this.isGroup) {
				this.resetGroupScores();
				if (this.isGroupHost) {
					this.broadcastGameState();
				}
			}
		}));

		nextLevelButton = winMenu.addButton(new Button(this, 'Start Next Level', () => {
			winMenu.hide();
			startNextLevel();
			if (this.isGroupHost) {
				this.broadcastGameState();
				this.broadcastLog('Starting level ' + level);
			}
		}));

		tick();

		gameMenuCancelButton.hide();
		gameMenu.setTitle('Combo Shapes');

		groupMenu.setTitle('Joining room...');

		if (room) {
			const clientUsername = prompt('Please enter a username').substring(0, 30);
			this.isGroup = true;
			this.isGroupHost = false;
			let isFirstSync = true;
			groupMenu.show();
			clientPeer = new Peer();
			clientPeer.on('open', id => {
				clientConn = clientPeer.connect(room, {
					metadata: {
						username: clientUsername,
					},
				});

				clientConn.on('open', () => {
					// Send messages
					clientConn.send('Hello, I am client peer ' + id);
				});
				// Receive messages
				clientConn.on('data', data => {
					console.debug('Received from host', data);
					if (data.type === 'state') {
						if (isFirstSync) {
							startNewGame();
							gameMenu.hide();
							playStartSound();
							board.clear();
							groupMenu.hide();
						}
						isFirstSync = false;

						if (data.failureCount > failureCount) {
							this.playFailureSound();
						}
						if (data.successCount > successCount) {
							this.playSuccessSound();
						}
						// Test for new level/game
						if (data.levelStartTime !== levelStartTime) {
							loseMenu.hide();
							winMenu.hide();
							paused = false;
							playStartSound();
						} else {
							// Test for rejected success (someone got it first)
							if (data.successCount < successCount) {
								this.playFailureSound();
							}
						}

						loadGameState(data);
						this.drawGroupPanel();

						// Check if game is now in a win state
						const won = this.checkWin();
						if (won) {
							board.clear();
						}
					} else if (data.type === 'log') {
						this.appendGroupLog(data.msg);
					}
				});
			});
		} else {
			gameMenu.show();
		}
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
		playStartSound();
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
