// Minimalist Derby - Core Game Logic
// Developed with a high-contrast minimalist aesthetic

const INITIAL_BALANCE = 1000;
const HORSE_COUNT = 6;
const TRACK_FINISH_PERCENT = 95; // % of track width to win

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
const timerText = document.getElementById('timerText');
const horseSelection = document.getElementById('horseSelection');
const track = document.getElementById('track');
const betInput = document.getElementById('betAmount');
const startBtn = document.getElementById('startRaceBtn');
const resetBtn = document.getElementById('resetBalanceBtn');
const resultModal = document.getElementById('resultModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const exitBtn = document.getElementById('exitBtn');

let gameState = {
    balance: parseFloat(localStorage.getItem('derby_balance')) || INITIAL_BALANCE,
    selectedHorse: null,
    betAmount: 0,
    isRacing: false,
    horses: [],
    lastTickTime: 0,
    timerSeconds: 60,
    timerInterval: null
};

// --- Initialization ---

function init() {
    updateBalance(0);
    generateHorses();
    renderUI();
    setupEventListeners();
}

function generateHorses() {
    gameState.horses = [];
    for (let i = 0; i < HORSE_COUNT; i++) {
        gameState.horses.push({
            id: i,
            name: horseNames[i % horseNames.length],
            color: horseColors[i % horseColors.length],
            position: 0,
            currentSpeed: 0,
            finished: false
        });
    }
}

function renderUI() {
    // Render Horse Cards
    horseSelection.innerHTML = '';
    gameState.horses.forEach(horse => {
        const isSelected = gameState.selectedHorse === horse.id;
        const card = document.createElement('div');
        card.className = `horse-card ${isSelected ? 'selected' : ''}`;

        if (isSelected) {
            card.style.borderColor = horse.color;
            card.style.boxShadow = `0 0 15px ${horse.color}44`;
        } else {
            card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }

        card.innerHTML = `
            <div class="name" style="font-weight: 700; font-size: 1.1rem;">${horse.name}</div>
            <div class="odds" style="color: ${horse.color}; font-weight: 600;">Paga 2x</div>
            <div style="width: 30px; height: 4px; background: ${horse.color}; margin: 8px auto; border-radius: 10px;"></div>
        `;
        card.onclick = () => selectHorseAndStart(horse.id);
        horseSelection.appendChild(card);
    });

    // Render Track Lanes
    track.innerHTML = '<div class="finish-line-label">Linha de Chegada</div>';
    gameState.horses.forEach(horse => {
        const lane = document.createElement('div');
        lane.className = 'lane';
        lane.innerHTML = `
            <div class="lane-number">${horse.id + 1}</div>
            <div id="horse-${horse.id}" class="horse" style="left: 0;">
                <svg viewBox="0 0 100 100" style="width: 40px; height: 40px; fill: ${horse.color};">
                    <path d="M90 60c-2-2-5-3-10-3-2 0-4 1-5 2-2-1-4-2-6-2-5 0-10 4-12 8l-5-2c2-3 3-7 3-10 0-8-6-15-15-15-2 0-4 0-6 1l-3-15c0-2-1-4-3-4-3 0-5 2-5 5l1 15c-1 0-2 0-3 0-10 0-18 8-18 18 0 2 0 4 1 6l-5 5c-2 2-2 5 0 7 1 1 2 1 3 1v20c0 3 2 5 5 5s5-2 5-5v-15l5 5c2 2 4 2 6 0l5-5c1-1 1-2 1-3 2 1 4 2 6 2h20c3 0 5-2 5-5s-2-5-5-5h-5l5-5c2-2 3-5 3-8 4 0 8 1 10 3 2 2 5 3 7 3s5-1 7-3c2-2 2-5 0-7z"/>
                </svg>
            </div>
        `;
        track.appendChild(lane);
    });
}

function updateBalance(amountChange) {
    gameState.balance += amountChange;
    localStorage.setItem('derby_balance', gameState.balance);
    balanceText.textContent = `$${gameState.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function selectHorseAndStart(id) {
    if (gameState.isRacing) return;

    const bet = parseFloat(betInput.value);
    if (isNaN(bet) || bet <= 0) {
        alert("Por favor, insira um valor de aposta válido primeiro!");
        return;
    }
    if (bet > gameState.balance) {
        alert("Saldo insuficiente!");
        return;
    }

    gameState.selectedHorse = id;
    gameState.betAmount = bet;
    updateBalance(-bet);

    renderUI();
    startRace();
}

function startRace() {
    gameState.isRacing = true;
    betInput.disabled = true;
    startBtn.disabled = true;

    gameState.horses.forEach(h => {
        h.position = 0;
        h.finished = false;
        h.currentSpeed = 0;
    });

    // Start Timer
    gameState.timerSeconds = 60;
    updateTimerDisplay();
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.timerSeconds--;
        updateTimerDisplay();
        if (gameState.timerSeconds <= 0) {
            clearInterval(gameState.timerInterval);
        }
    }, 1000);

    gameState.lastTickTime = Date.now();
    requestAnimationFrame(raceStep);
}

function updateTimerDisplay() {
    const min = Math.floor(gameState.timerSeconds / 60);
    const sec = gameState.timerSeconds % 60;
    timerText.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function raceStep() {
    if (!gameState.isRacing) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - gameState.lastTickTime;

    if (deltaTime > 1000 || gameState.lastTickTime === 0) {
        gameState.horses.forEach(h => {
            const baseMin = 0.015;
            const baseMax = 0.040;
            h.currentSpeed = (Math.random() * (baseMax - baseMin) + baseMin);
        });
        gameState.lastTickTime = currentTime;
    }

    let winnerFound = null;
    gameState.horses.forEach(h => {
        if (h.finished) return;

        h.position += h.currentSpeed || 0.02;
        const horseEl = document.getElementById(`horse-${h.id}`);
        if (horseEl) horseEl.style.left = `${h.position}%`;

        if (h.position >= TRACK_FINISH_PERCENT) {
            h.finished = true;
            if (!winnerFound) winnerFound = h;
        }
    });

    if (winnerFound) {
        finishRace(winnerFound);
    } else {
        requestAnimationFrame(raceStep);
    }
}

function finishRace(winner) {
    gameState.isRacing = false;
    clearInterval(gameState.timerInterval);

    setTimeout(() => {
        const won = gameState.selectedHorse === winner.id;
        const payout = won ? gameState.betAmount * 2 : 0;

        const resTitle = document.getElementById('resultTitle');
        const resMsg = document.getElementById('resultMessage');
        const resPayout = document.getElementById('resultPayout');

        if (won) {
            updateBalance(payout);
            resTitle.textContent = "VOCÊ VENCEU!";
            resTitle.style.color = "var(--accent-green)";
            resMsg.textContent = `Parabéns, seu cavalo ganhou! Você receberá: $${payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            resPayout.textContent = `+$${payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            resPayout.style.color = "var(--accent-green)";
        } else {
            resTitle.textContent = "VOCÊ PERDEU";
            resTitle.style.color = "var(--danger)";
            resMsg.textContent = "Que pena! Não foi dessa vez! Mais sorte na próxima";
            resPayout.textContent = `-$${gameState.betAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            resPayout.style.color = "var(--danger)";
        }

        resultModal.style.display = 'flex';
    }, 500);
}

function resetRace() {
    gameState.selectedHorse = null;
    gameState.isRacing = false;
    gameState.timerSeconds = 60;
    updateTimerDisplay();

    betInput.disabled = false;
    betInput.value = '';

    generateHorses();
    renderUI();
}

function setupEventListeners() {
    startBtn.onclick = () => {
        if (gameState.selectedHorse !== null) startRace();
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

    exitBtn.onclick = () => {
        resultModal.style.display = 'none';
        resetRace();
    };
}

init();
