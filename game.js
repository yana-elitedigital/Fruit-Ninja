const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
    score: 0,
    lives: 3,
    isGameOver: false,
    isPaused: false,
    isPlaying: false,
    fruits: [],
    particles: [],
    sliceTrail: [],
    mousePos: { x: 0, y: 0 },
    isSlicing: false,
    effectsCount: 0
};

// Sound system
const soundSystem = {
    audioContext: null,
    sounds: {},
    isMuted: false,
    volume: 0.5,
    
    init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create programmatic sounds
            this.createSounds();
        } catch (e) {
            console.log('Audio not supported');
        }
    },
    
    createSounds() {
        // Create different sound types
        this.sounds = {
            slice: this.createSliceSound(),
            bomb: this.createBombSound(),
            score: this.createScoreSound(),
            gameOver: this.createGameOverSound(),
            button: this.createButtonSound()
        };
    },
    
    createSliceSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.type = 'sawtooth';
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    },
    
    createBombSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.type = 'square';
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    },
    
    createScoreSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(1320, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.type = 'sine';
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    },
    
    createGameOverSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.3);
            oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.8);
            
            gainNode.gain.setValueAtTime(this.volume * 0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
            
            oscillator.type = 'triangle';
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.8);
        };
    },
    
    createButtonSound() {
        return () => {
            if (!this.audioContext || this.isMuted) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            oscillator.type = 'square';
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
        };
    },
    
    play(soundName) {
        if (this.sounds[soundName] && typeof this.sounds[soundName] === 'function') {
            try {
                this.sounds[soundName]();
            } catch (e) {
                console.log('Error playing sound:', e);
            }
        }
    },
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    },
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
};

let gameStats = {
    bestScore: parseInt(localStorage.getItem('fruitNinjaBest')) || 0,
    highScores: JSON.parse(localStorage.getItem('fruitNinjaScores')) || [0, 0, 0, 0, 0]
};

const fruitTypes = [
    { emoji: '🍎', color: '#ff4757', points: 10 },
    { emoji: '🍊', color: '#ff6348', points: 15 },
    { emoji: '🍌', color: '#feca57', points: 12 },
    { emoji: '🍉', color: '#ff3838', points: 20 },
    { emoji: '🍓', color: '#ff4757', points: 18 },
    { emoji: '🥝', color: '#2ed573', points: 25 },
    { emoji: '🍇', color: '#a55eea', points: 22 },
    { emoji: '🥭', color: '#ff9ff3', points: 30 },
    { emoji: '🍑', color: '#ff3838', points: 28 },
    { emoji: '🍒', color: '#ff4757', points: 24 },
    { emoji: '🥥', color: '#8b4513', points: 35 },
    { emoji: '🍍', color: '#ffd700', points: 40 },
    { emoji: '🥑', color: '#2ed573', points: 32 },
    { emoji: '🍈', color: '#2ed573', points: 26 },
    { emoji: '🍋', color: '#feca57', points: 16 },
    { emoji: '🫐', color: '#5352ed', points: 45 },
    { emoji: '🥭', color: '#ff9f43', points: 38 },
    { emoji: '🍐', color: '#2ed573', points: 14 }
];

const bombType = { emoji: '💣', color: '#2f3542', points: -50 };

class GameObject {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.size = 60;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.gravity = 0.5;
        this.sliced = false;
        this.scale = 1;
        this.opacity = 1;
        this.isAnimating = false;
        
        // Animate fruit entrance
        anime({
            targets: this,
            scale: [0.5, 1],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutElastic(1, .8)'
        });
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        
        // Remove fruits that fall below screen
        if (this.y > canvas.height + 100) {
            if (!this.sliced && this.type !== bombType) {
                gameState.lives--;
                // Add a small delay before updating UI to prevent race conditions
                setTimeout(() => {
                    updateUI();
                }, 50);
            }
            return false;
        }
        return true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.emoji, 2, 2);
        
        // Draw main object
        ctx.fillStyle = this.type.color;
        ctx.fillText(this.type.emoji, 0, 0);
        
        ctx.restore();
    }

    checkCollision(mouseX, mouseY, radius = 45) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) < radius;
    }

    slice() {
        if (this.sliced || this.isAnimating) return;
        
        this.sliced = true;
        this.isAnimating = true;
        
        if (this.type === bombType) {
            // Bomb explosion with screen shake
            gameState.lives = 0;
            soundSystem.play('bomb');
            createBombExplosion(this.x, this.y);
            createScreenShake();
        } else {
            // Fruit slice with enhanced effects
            gameState.score += this.type.points;
            soundSystem.play('slice');
            soundSystem.play('score');
            createEnhancedSliceEffect(this.x, this.y, this.type);
            createScorePopup(this.x, this.y, this.type.points);
        }
        
        // Animate fruit destruction
        anime({
            targets: this,
            scale: [1, 0.3],
            opacity: [1, 0],
            rotation: this.rotation + Math.PI * 2,
            duration: 500,
            easing: 'easeOutQuart'
        });
        
        updateUI();
    }
}

class Particle {
    constructor(x, y, vx, vy, color, life = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 8 + 2;
        this.gravity = 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= 0.02;
        this.size *= 0.98;
        return this.life > 0;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Menu System Functions
function showMainMenu() {
    soundSystem.play('button');
    
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('instructionsScreen').style.display = 'none';
    document.getElementById('highScoresScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    gameState.isPlaying = false;
    gameState.isPaused = false;
    
    // Update best score display
    document.getElementById('bestScore').textContent = gameStats.bestScore;
    document.getElementById('currentBest').textContent = gameStats.bestScore;
    
    // Enable cursor for menus
    document.body.style.cursor = 'default';
    
    // Animate menu entrance
    anime({
        targets: '#mainMenu .menu-content',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .8)'
    });
}

function showInstructions() {
    soundSystem.play('button');
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('instructionsScreen').style.display = 'flex';
    
    anime({
        targets: '#instructionsScreen .menu-content',
        translateX: [100, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutQuart'
    });
}

function showHighScores() {
    soundSystem.play('button');
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('highScoresScreen').style.display = 'flex';
    
    // Update high scores display
    gameStats.highScores.forEach((score, index) => {
        document.getElementById(`highScore${index + 1}`).textContent = score;
    });
    
    anime({
        targets: '#highScoresScreen .menu-content',
        translateX: [-100, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutQuart'
    });
}

function startGame() {
    soundSystem.play('button');
    
    // Hide all menu screens
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('instructionsScreen').style.display = 'none';
    document.getElementById('highScoresScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Show game container
    document.getElementById('gameContainer').style.display = 'flex';
    
    // Clear any existing dirty spots
    clearDirtySpots();
    
    // Reset game state
    gameState = {
        score: 0,
        lives: 3,
        isGameOver: false,
        isPaused: false,
        isPlaying: true,
        fruits: [],
        particles: [],
        sliceTrail: [],
        mousePos: { x: 0, y: 0 },
        isSlicing: false,
        effectsCount: 0 // Add effect throttling counter
    };
    
    // Setup canvas with game window dimensions
    const gameWindow = document.querySelector('.game-window');
    canvas.width = gameWindow.offsetWidth;
    canvas.height = gameWindow.offsetHeight;
    
    // Clear any existing canvas content
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Disable cursor for game
    document.body.style.cursor = 'none';
    
    updateUI();
    
    // Animate game UI entrance
    anime({
        targets: '.game-ui',
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutQuart'
    });
}

function pauseGame() {
    if (!gameState.isPlaying || gameState.isGameOver) return;
    
    gameState.isPaused = true;
    document.getElementById('pauseScreen').style.display = 'flex';
    document.body.style.cursor = 'default';
    
    anime({
        targets: '#pauseScreen .pause-content',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutBack'
    });
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('pauseScreen').style.display = 'none';
    document.body.style.cursor = 'none';
}

function toggleMute() {
    const isMuted = soundSystem.toggleMute();
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }
    soundSystem.play('button');
}

function createJuiceExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = Math.random() * 8 + 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - Math.random() * 3;
        gameState.particles.push(new Particle(x, y, vx, vy, color, 1));
    }
}

function createEnhancedSliceEffect(x, y, fruitType) {
    // Throttle effect creation to prevent overwhelming the browser
    if (gameState.effectsCount && gameState.effectsCount > 5) return;
    
    gameState.effectsCount = (gameState.effectsCount || 0) + 1;
    
    // Create animated fruit halves
    createFruitHalves(x, y, fruitType);
    
    // Create juice splash with DOM elements
    createJuiceSplash(x, y, fruitType.color);
    
    // Create slice line effect
    createSliceLine(x, y);
    
    // Create dirty spot/stain on game window
    createDirtySpot(x, y, fruitType.color);
    
    // Create particle explosion
    createJuiceExplosion(x, y, fruitType.color);
    createSliceEffect(x, y);
    
    // Reset counter after a delay
    setTimeout(() => {
        gameState.effectsCount = Math.max(0, (gameState.effectsCount || 1) - 1);
    }, 500);
}

function createFruitHalves(x, y, fruitType) {
    // Create two fruit halves as DOM elements
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return; // Safety check
    
    const rect = gameWindow.getBoundingClientRect();
    
    for (let i = 0; i < 2; i++) {
        const half = document.createElement('div');
        half.className = 'fruit-slice';
        half.textContent = fruitType.emoji;
        half.style.left = (rect.left + x) + 'px';
        half.style.top = (rect.top + y) + 'px';
        half.style.transform = 'translate(-50%, -50%)';
        half.style.zIndex = '1000';
        half.style.pointerEvents = 'none';
        half.style.willChange = 'transform, opacity'; // Optimize for animations
        document.body.appendChild(half);
        
        // Animate the halves flying apart
        anime({
            targets: half,
            translateX: (i === 0 ? -100 : 100) + Math.random() * 50,
            translateY: -50 - Math.random() * 100,
            rotate: (i === 0 ? -180 : 180) + Math.random() * 90,
            scale: [1, 0.3],
            opacity: [1, 0],
            duration: 800, // Reduced duration
            easing: 'easeOutQuart',
            complete: () => {
                try {
                    if (half && half.parentNode) {
                        document.body.removeChild(half);
                    }
                } catch (e) {
                    console.warn('Error removing fruit half:', e);
                }
            }
        });
    }
}

function createJuiceSplash(x, y, color) {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return; // Safety check
    
    const rect = gameWindow.getBoundingClientRect();
    
    // Reduce number of splash particles to improve performance
    for (let i = 0; i < 6; i++) {
        const splash = document.createElement('div');
        splash.className = 'juice-splash';
        splash.style.left = (rect.left + x) + 'px';
        splash.style.top = (rect.top + y) + 'px';
        splash.style.backgroundColor = color;
        splash.style.transform = 'translate(-50%, -50%)';
        splash.style.zIndex = '999';
        splash.style.pointerEvents = 'none';
        splash.style.willChange = 'transform, opacity';
        document.body.appendChild(splash);
        
        const angle = (Math.PI * 2 * i) / 6;
        const distance = 40 + Math.random() * 60; // Reduced distance
        
        anime({
            targets: splash,
            translateX: Math.cos(angle) * distance,
            translateY: Math.sin(angle) * distance,
            scale: [0, Math.random() * 2 + 1, 0],
            opacity: [0, 0.7, 0],
            duration: 600, // Reduced duration
            easing: 'easeOutQuart',
            complete: () => {
                try {
                    if (splash && splash.parentNode) {
                        document.body.removeChild(splash);
                    }
                } catch (e) {
                    console.warn('Error removing splash:', e);
                }
            }
        });
    }
}

function createSliceLine(x, y) {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return; // Safety check
    
    const rect = gameWindow.getBoundingClientRect();
    
    const line = document.createElement('div');
    line.className = 'slice-effect';
    line.style.left = (rect.left + x) + 'px';
    line.style.top = (rect.top + y) + 'px';
    line.style.transform = 'translate(-50%, -100%) rotate(' + (Math.random() * 60 - 30) + 'deg)';
    line.style.zIndex = '998';
    line.style.pointerEvents = 'none';
    line.style.willChange = 'transform, opacity';
    document.body.appendChild(line);
    
    anime({
        targets: line,
        scaleY: [0, 1.5, 0],
        opacity: [0, 1, 0],
        duration: 250, // Reduced duration
        easing: 'easeOutQuart',
        complete: () => {
            try {
                if (line && line.parentNode) {
                    document.body.removeChild(line);
                }
            } catch (e) {
                console.warn('Error removing slice line:', e);
            }
        }
    });
}

function createScorePopup(x, y, points) {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return; // Safety check
    
    const rect = gameWindow.getBoundingClientRect();
    
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    popup.style.left = (rect.left + x) + 'px';
    popup.style.top = (rect.top + y) + 'px';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.color = points > 20 ? '#ffd700' : '#fff';
    popup.style.zIndex = '1001';
    popup.style.pointerEvents = 'none';
    document.body.appendChild(popup);
    
    anime({
        targets: popup,
        translateY: -80,
        scale: [0.5, 1.2, 1],
        opacity: [0, 1, 0],
        duration: 1200,
        easing: 'easeOutQuart',
        complete: () => {
            if (popup.parentNode) {
                document.body.removeChild(popup);
            }
        }
    });
}

function createBombExplosion(x, y) {
    // Create explosion element
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return; // Safety check
    
    const rect = gameWindow.getBoundingClientRect();
    
    const explosion = document.createElement('div');
    explosion.className = 'bomb-explosion';
    explosion.style.left = (rect.left + x) + 'px';
    explosion.style.top = (rect.top + y) + 'px';
    explosion.style.transform = 'translate(-50%, -50%)';
    explosion.style.zIndex = '1002';
    explosion.style.pointerEvents = 'none';
    document.body.appendChild(explosion);
    
    anime({
        targets: explosion,
        scale: [0, 3],
        opacity: [0, 1, 0],
        duration: 600,
        easing: 'easeOutQuart',
        complete: () => {
            if (explosion.parentNode) {
                document.body.removeChild(explosion);
            }
        }
    });
    
    // Create particle explosion
    createExplosion(x, y, '#ff4757', 30);
}

function createScreenShake() {
    document.body.classList.add('screen-shake');
    setTimeout(() => {
        document.body.classList.remove('screen-shake');
    }, 500);
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 8;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        gameState.particles.push(new Particle(x, y, vx, vy, color, 1.5));
    }
}

function createSliceEffect(x, y) {
    // Add sparkles
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        gameState.particles.push(new Particle(x, y, vx, vy, '#ffffff', 0.8));
    }
}

function spawnFruit() {
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = canvas.height + 50;
    const vx = (Math.random() - 0.5) * 8;
    const vy = -(Math.random() * 12 + 18); // Increased from 12 to 18 for higher jumps
    
    // 10% chance for bomb, 90% for fruit
    const type = Math.random() < 0.1 ? bombType : fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    
    gameState.fruits.push(new GameObject(x, y, vx, vy, type));
}

function handleSlicing(mouseX, mouseY) {
    if (!gameState.isSlicing) return;
    
    gameState.fruits.forEach(fruit => {
        if (!fruit.sliced && fruit.checkCollision(mouseX, mouseY)) {
            fruit.slice();
        }
    });
}

function updateSliceTrail(mouseX, mouseY) {
    gameState.sliceTrail.push({ x: mouseX, y: mouseY, life: 1 });
    
    // Limit trail length
    if (gameState.sliceTrail.length > 10) {
        gameState.sliceTrail.shift();
    }
    
    // Update trail life
    gameState.sliceTrail.forEach(point => {
        point.life -= 0.1;
    });
    
    gameState.sliceTrail = gameState.sliceTrail.filter(point => point.life > 0);
}

function drawSliceTrail() {
    if (gameState.sliceTrail.length < 2) return;
    
    ctx.save();
    
    // Create gradient trail
    const gradient = ctx.createLinearGradient(
        gameState.sliceTrail[0].x, gameState.sliceTrail[0].y,
        gameState.sliceTrail[gameState.sliceTrail.length - 1].x, 
        gameState.sliceTrail[gameState.sliceTrail.length - 1].y
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.moveTo(gameState.sliceTrail[0].x, gameState.sliceTrail[0].y);
    
    // Use quadratic curves for smoother trail
    for (let i = 1; i < gameState.sliceTrail.length - 1; i++) {
        const point = gameState.sliceTrail[i];
        const nextPoint = gameState.sliceTrail[i + 1];
        const midX = (point.x + nextPoint.x) / 2;
        const midY = (point.y + nextPoint.y) / 2;
        
        ctx.globalAlpha = point.life * 0.8;
        ctx.quadraticCurveTo(point.x, point.y, midX, midY);
    }
    
    if (gameState.sliceTrail.length > 1) {
        const lastPoint = gameState.sliceTrail[gameState.sliceTrail.length - 1];
        ctx.globalAlpha = lastPoint.life * 0.8;
        ctx.lineTo(lastPoint.x, lastPoint.y);
    }
    
    ctx.stroke();
    ctx.restore();
}

function updateUI() {
    const scoreElement = document.getElementById('score');
    const currentScore = parseInt(scoreElement.textContent);
    const newScore = gameState.score;
    
    if (newScore > currentScore) {
        // Animate score increase
        anime({
            targets: { value: currentScore },
            value: newScore,
            duration: 300,
            easing: 'easeOutQuart',
            update: function(anim) {
                scoreElement.textContent = Math.round(anim.animatables[0].target.value);
            }
        });
        
        // Scale animation for score
        anime({
            targets: '.score-display',
            scale: [1, 1.2, 1],
            duration: 300,
            easing: 'easeOutElastic(1, .8)'
        });
    }
    
    const livesContainer = document.getElementById('lives');
    if (!livesContainer) return; // Safety check
    
    const currentHearts = livesContainer.children.length;
    
    if (gameState.lives < currentHearts) {
        // Animate heart loss
        const lastHeart = livesContainer.lastElementChild;
        if (lastHeart) {
            anime({
                targets: lastHeart,
                scale: [1, 1.5, 0],
                rotate: '1turn',
                opacity: [1, 0],
                duration: 500,
                easing: 'easeOutQuart',
                complete: () => {
                    try {
                        if (lastHeart && lastHeart.parentNode === livesContainer) {
                            livesContainer.removeChild(lastHeart);
                        }
                    } catch (e) {
                        console.warn('Error removing heart:', e);
                    }
                }
            });
        }
    } else if (gameState.lives > currentHearts) {
        // Add hearts if needed
        for (let i = currentHearts; i < gameState.lives; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart';
            heart.textContent = '❤️';
            heart.style.transform = 'scale(0)';
            livesContainer.appendChild(heart);
            
            anime({
                targets: heart,
                scale: [0, 1.3, 1],
                duration: 400,
                delay: i * 100,
                easing: 'easeOutElastic(1, .8)'
            });
        }
    }
    
    // Check for game over with a slight delay to ensure UI updates are complete
    if (gameState.lives <= 0 && !gameState.isGameOver) {
        setTimeout(() => {
            if (gameState.lives <= 0 && !gameState.isGameOver) {
                endGame();
            }
        }, 100);
    }
}

function endGame() {
    gameState.isGameOver = true;
    gameState.isPlaying = false;
    
    // Play game over sound
    soundSystem.play('gameOver');
    
    // Update best score and high scores
    let isNewBest = false;
    if (gameState.score > gameStats.bestScore) {
        gameStats.bestScore = gameState.score;
        localStorage.setItem('fruitNinjaBest', gameStats.bestScore);
        isNewBest = true;
    }
    
    // Update high scores list
    gameStats.highScores.push(gameState.score);
    gameStats.highScores.sort((a, b) => b - a);
    gameStats.highScores = gameStats.highScores.slice(0, 5);
    localStorage.setItem('fruitNinjaScores', JSON.stringify(gameStats.highScores));
    
    // Update display
    document.getElementById('finalScore').textContent = gameState.score;
    
    // Show/hide new best message
    const newBestMessage = document.getElementById('newBestMessage');
    if (isNewBest) {
        newBestMessage.style.display = 'block';
    } else {
        newBestMessage.style.display = 'none';
    }
    
    // Show game over screen
    document.getElementById('gameOverScreen').style.display = 'flex';
    document.body.style.cursor = 'default';
    
    // Animate game over screen
    anime({
        targets: '#gameOverScreen .game-over-content',
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .8)'
    });
}

function gameLoop() {
    // Always clear canvas regardless of game state to prevent black screens
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    if (gameState.isGameOver || gameState.isPaused || !gameState.isPlaying) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Spawn fruits randomly - increased spawn rate for more fruits
    if (Math.random() < 0.035) { // Increased from 0.02 to 0.035
        spawnFruit();
    }
    
    // Update and draw fruits
    gameState.fruits = gameState.fruits.filter(fruit => {
        const alive = fruit.update();
        if (alive) fruit.draw();
        return alive && !fruit.sliced;
    });
    
    // Update and draw particles
    gameState.particles = gameState.particles.filter(particle => {
        const alive = particle.update();
        if (alive) particle.draw();
        return alive;
    });
    
    // Draw slice trail
    drawSliceTrail();
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('mousedown', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    gameState.isSlicing = true;
    gameState.mousePos.x = e.clientX - rect.left;
    gameState.mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mousemove', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    gameState.mousePos.x = e.clientX - rect.left;
    gameState.mousePos.y = e.clientY - rect.top;
    
    if (gameState.isSlicing) {
        updateSliceTrail(gameState.mousePos.x, gameState.mousePos.y);
        handleSlicing(gameState.mousePos.x, gameState.mousePos.y);
    }
});

canvas.addEventListener('mouseup', () => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    gameState.isSlicing = false;
    gameState.sliceTrail = [];
});

// Touch events for mobile
canvas.addEventListener('touchstart', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    gameState.isSlicing = true;
    gameState.mousePos.x = touch.clientX - rect.left;
    gameState.mousePos.y = touch.clientY - rect.top;
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    gameState.mousePos.x = touch.clientX - rect.left;
    gameState.mousePos.y = touch.clientY - rect.top;
    
    if (gameState.isSlicing) {
        updateSliceTrail(gameState.mousePos.x, gameState.mousePos.y);
        handleSlicing(gameState.mousePos.x, gameState.mousePos.y);
    }
});

canvas.addEventListener('touchend', (e) => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;
    e.preventDefault();
    gameState.isSlicing = false;
    gameState.sliceTrail = [];
});

// Handle window resize
window.addEventListener('resize', () => {
    if (gameState.isPlaying) {
        const gameWindow = document.querySelector('.game-window');
        canvas.width = gameWindow.offsetWidth;
        canvas.height = gameWindow.offsetHeight;
    }
});

// Initialize game
soundSystem.init();
showMainMenu();
gameLoop();

function createDirtySpot(x, y, color) {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return;
    
    const rect = gameWindow.getBoundingClientRect();
    
    // Create main dirty spot
    createSingleSpot(x, y, color, 30 + Math.random() * 50, 0.15 + Math.random() * 0.1);
    
    // Create smaller satellite spots around the main impact
    for (let i = 0; i < 3 + Math.random() * 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 60;
        const spotX = x + Math.cos(angle) * distance;
        const spotY = y + Math.sin(angle) * distance;
        const size = 10 + Math.random() * 25;
        const opacity = 0.05 + Math.random() * 0.1;
        
        createSingleSpot(spotX, spotY, color, size, opacity);
    }
}

function createSingleSpot(x, y, color, size, opacity) {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return;
    
    // Create dirty spot element
    const spot = document.createElement('div');
    spot.className = 'dirty-spot';
    
    // Position relative to game window
    const spotX = x + (Math.random() - 0.5) * 20;
    const spotY = y + (Math.random() - 0.5) * 20;
    
    spot.style.left = spotX + 'px';
    spot.style.top = spotY + 'px';
    spot.style.width = size + 'px';
    spot.style.height = size + 'px';
    spot.style.backgroundColor = color;
    spot.style.opacity = '0';
    spot.style.position = 'absolute';
    spot.style.transform = 'translate(-50%, -50%)';
    spot.style.pointerEvents = 'none';
    spot.style.zIndex = '10';
    spot.style.filter = 'blur(' + (1 + Math.random() * 3) + 'px)';
    spot.style.mixBlendMode = 'multiply';
    
    // Random organic shape
    const borderRadius = `${30 + Math.random() * 40}% ${60 + Math.random() * 40}% ${40 + Math.random() * 40}% ${70 + Math.random() * 30}% / ${50 + Math.random() * 30}% ${30 + Math.random() * 40}% ${70 + Math.random() * 30}% ${60 + Math.random() * 40}%`;
    spot.style.borderRadius = borderRadius;
    
    // Append to game window
    gameWindow.appendChild(spot);
    
    // Animate spot appearance
    anime({
        targets: spot,
        scale: [0, 1],
        opacity: [0, opacity],
        duration: 400 + Math.random() * 200,
        easing: 'easeOutQuart'
    });
    
    // Gradually fade out the spot over time
    setTimeout(() => {
        anime({
            targets: spot,
            opacity: [opacity, 0],
            duration: 20000 + Math.random() * 10000, // Random fade duration
            easing: 'linear',
            complete: () => {
                if (spot && spot.parentNode) {
                    spot.parentNode.removeChild(spot);
                }
            }
        });
    }, 8000 + Math.random() * 5000); // Random delay before starting fade
}

function clearDirtySpots() {
    const gameWindow = document.querySelector('.game-window');
    if (!gameWindow) return;
    
    const dirtySpots = gameWindow.querySelectorAll('.dirty-spot');
    dirtySpots.forEach(spot => {
        if (spot.parentNode) {
            spot.parentNode.removeChild(spot);
        }
    });
}
