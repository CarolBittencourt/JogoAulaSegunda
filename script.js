// Minimalist Derby - Core Game Logic
// Developed with a high-contrast minimalist aesthetic

const INITIAL_BALANCE = 1000;
const HORSE_COUNT = 6;
const TRACK_FINISH_PERCENT = 95; // % of track width to win

let gameState = {
    balance: parseFloat(localStorage.getItem('derby_balance')) || INITIAL_BALANCE,
    selectedHorse: null,
    betAmount: 0,
    isRacing: false,
    horses: [],
    animationFrame: null,
    lastTickTime: 0
};

const horseNames = ["Midnight", "Iridium", "Onyx", "Eclipse", "Ghost", "Zenith", "Neon", "Shadow"];
const horseColors = [
    "#0080FF", // Electric Blue
    "#10B981", // Emerald Green
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4"  // Cyan
];

// DOM Elements
const balanceText = document.getElementById('balanceText');
const horseSelection = document.getElementById('horseSelection');
const track = document.getElementById('track');
const betInput = document.getElementById('betAmount');
const startBtn = document.getElementById('startRaceBtn');
const resetBtn = document.getElementById('resetBalanceBtn');
const resultModal = document.getElementById('resultModal');
const closeModalBtn = document.getElementById('closeModalBtn');

// --- Initialization ---

function init() {
    updateBalance(0); // Sync text
    generateHorses();
    renderUI();
    setupEventListeners();
}

function generateHorses() {
    gameState.horses = [];
    for (let i = 0; i < HORSE_COUNT; i++) {
        const odds = (Math.random() * 5 + 1.5).toFixed(1);
        gameState.horses.push({
            id: i,
            name: horseNames[i % horseNames.length],
            odds: parseFloat(odds),
            color: horseColors[i % horseColors.length],
            position: 0,
            currentSpeed: 0,
            finished: false
        });
    }
    // Sort logic for "favorites" - Lower odds have slightly higher speed potential
}

function renderUI() {
    // Render Horse Cards
    horseSelection.innerHTML = '';
    gameState.horses.forEach(horse => {
        const card = document.createElement('div');
        card.className = `horse-card ${gameState.selectedHorse === horse.id ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="name">${horse.name}</div>
            <div class="odds">${horse.odds}x</div>
            <div style="width: 20px; height: 3px; background: ${horse.color}; margin: 5px auto; border-radius: 10px;"></div>
        `;
        card.onclick = () => selectHorse(horse.id);
        horseSelection.appendChild(card);
    });

    // Render Track Lanes
    track.innerHTML = '<div class="finish-line-label">Linha de Chegada</div>';
    gameState.horses.forEach(horse => {
        const lane = document.createElement('div');
        lane.className = 'lane';
        lane.innerHTML = `
            <div class="lane-number">${horse.id + 1}</div>
            <div id="horse-${horse.id}" class="horse">
                <svg viewBox="0 0 100 100" style="width: 40px; height: 40px; fill: ${horse.color}; filter: drop-shadow(0 0 3px rgba(255,255,255,0.2));">
                    <path d="M90 60c-2-2-5-3-10-3-2 0-4 1-5 2-2-1-4-2-6-2-5 0-10 4-12 8l-5-2c2-3 3-7 3-10 0-8-6-15-15-15-2 0-4 0-6 1l-3-15c0-2-1-4-3-4-3 0-5 2-5 5l1 15c-1 0-2 0-3 0-10 0-18 8-18 18 0 2 0 4 1 6l-5 5c-2 2-2 5 0 7 1 1 2 1 3 1v20c0 3 2 5 5 5s5-2 5-5v-15l5 5c2 2 4 2 6 0l5-5c1-1 1-2 1-3 2 1 4 2 6 2h20c3 0 5-2 5-5s-2-5-5-5h-5l5-5c2-2 3-5 3-8 4 0 8 1 10 3 2 2 5 3 7 3s5-1 7-3c2-2 2-5 0-7z"/>
                </svg>
            </div>
        `;
        track.appendChild(lane);
    });
}

// --- Interaction Logic ---

function updateBalance(amountChange) {
    gameState.balance += amountChange;
    localStorage.setItem('derby_balance', gameState.balance);
    balanceText.textContent = `$${gameState.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function selectHorse(id) {
    if (gameState.isRacing) return;
    gameState.selectedHorse = id;
    renderUI();
    validateInputs();
}

function validateInputs() {
    const bet = parseFloat(betInput.value);
    const isValid = gameState.selectedHorse !== null && bet > 0 && bet <= gameState.balance;
    startBtn.disabled = !isValid;
}

function setupEventListeners() {
    betInput.oninput = validateInputs;

    startBtn.onclick = () => {
        const bet = parseFloat(betInput.value);
        if (bet > gameState.balance) return;

        gameState.betAmount = bet;
        updateBalance(-bet);
        gameState.isRacing = true;
        startBtn.disabled = true;
        betInput.disabled = true;

        startRace();
    };

    resetBtn.onclick = () => {
        if (confirm("Resetar saldo para $1,000.00?")) {
            gameState.balance = 0;
            updateBalance(1000);
        }
    };

    closeModalBtn.onclick = () => {
        resultModal.style.display = 'none';
        resetRace();
    };
}

// --- Race Logic ---

function startRace() {
    gameState.horses.forEach(h => {
        h.position = 0;
        h.finished = false;
        // Each horse gets a velocity factor based on odds (lower odds = slightly higher potential)
        // range roughly 0.8 (long shot) to 1.1 (favorite)
        h.luckFactor = 1.0 + (5 - h.odds) * 0.05;
    });

    gameState.lastTickTime = Date.now();
    requestAnimationFrame(raceStep);
}

function raceStep() {
    if (!gameState.isRacing) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - gameState.lastTickTime;

    // Update speeds every second (sort of, we do it per frame but randomize values often)
    // Actually per GDD: "sorteado a cada segundo"
    if (deltaTime > 1000) {
        gameState.horses.forEach(h => {
            // Speed between 0.2% and 1.5% of track per frame (randomized per second)
            // Favorites have slight bias
            const baseMin = 0.1;
            const baseMax = 0.8;
            h.currentSpeed = (Math.random() * (baseMax - baseMin) + baseMin) * h.luckFactor;
        });
        gameState.lastTickTime = currentTime;
    }

    let winner = null;

    gameState.horses.forEach(h => {
        if (h.finished) return;

        // Apply speed (X pixels per frame roughly)
        // Here we use percentage for responsiveness
        h.position += h.currentSpeed || (Math.random() * 0.4 * h.luckFactor);

        const horseEl = document.getElementById(`horse-${h.id}`);
        if (horseEl) {
            horseEl.style.left = `${h.position}%`;
        }

        if (h.position >= TRACK_FINISH_PERCENT) {
            h.finished = true;
            if (!winner) {
                winner = h;
            }
        }
    });

    if (winner) {
        finishRace(winner);
    } else {
        requestAnimationFrame(raceStep);
    }
}

function finishRace(winner) {
    gameState.isRacing = false;

    setTimeout(() => {
        const won = gameState.selectedHorse === winner.id;
        const payout = won ? gameState.betAmount * winner.odds : 0;

        if (won) {
            updateBalance(payout);
            document.getElementById('resultTitle').textContent = "VOCÊ VENCEU!";
            document.getElementById('resultTitle').style.color = "var(--accent-green)";
            document.getElementById('resultPayout').textContent = `+$${payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            document.getElementById('resultPayout').style.color = "var(--accent-green)";
        } else {
            document.getElementById('resultTitle').textContent = "VOCÊ PERDEU";
            document.getElementById('resultTitle').style.color = "var(--danger)";
            document.getElementById('resultPayout').textContent = `-$${gameState.betAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            document.getElementById('resultPayout').style.color = "var(--danger)";
        }

        document.getElementById('resultMessage').textContent = `O ${winner.name} (Raia ${winner.id + 1}) cruzou a linha primeiro!`;
        resultModal.style.display = 'flex';
    }, 500);
}

function resetRace() {
    gameState.selectedHorse = null;
    gameState.isRacing = false;
    betInput.disabled = false;
    betInput.value = '';

    generateHorses();
    renderUI();
    validateInputs();
}

// Start the app
init();
