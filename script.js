// Minimalist Derby - Core Game Logic
// v1.2 - Focus on UX and Validation

const INITIAL_BALANCE = 1000;
const HORSE_COUNT = 6;
const TRACK_FINISH_PERCENT = 95;

const horseNames = ["Midnight", "Iridium", "Onyx", "Eclipse", "Ghost", "Zenith"];
const horseColors = ["#0080FF", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

let gameState = {
    balance: parseFloat(localStorage.getItem('derby_balance')) || INITIAL_BALANCE,
    selectedHorse: null,
    betAmount: 0,
    isRacing: false,
    horses: [],
    timerSeconds: 60,
    timerInterval: null,
    lastTickTime: 0
};

// DOM Elements
const balanceText = document.getElementById('balanceText');
const timerText = document.getElementById('timerText');
const horseSelection = document.getElementById('horseSelection');
const track = document.getElementById('track');
const betInput = document.getElementById('betAmount');
const errorMsgText = document.getElementById('betErrorMessage');
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const resultPayout = document.getElementById('resultPayout');
const closeModalBtn = document.getElementById('closeModalBtn');
const exitBtn = document.getElementById('exitBtn');

function init() {
    updateBalanceDisplay();
    generateHorses();
    renderUI();
    setupEventListeners();
}

function generateHorses() {
    gameState.horses = horseColors.map((color, i) => ({
        id: i,
        name: horseNames[i],
        color: color,
        position: 0,
        currentSpeed: 0,
        finished: false
    }));
}

function renderUI() {
    // Render Track
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

    // Render Horse Cards
    horseSelection.innerHTML = '';
    gameState.horses.forEach(horse => {
        const isSelected = gameState.selectedHorse === horse.id;
        const card = document.createElement('div');
        card.className = `horse-card ${isSelected ? 'selected' : ''}`;

        if (isSelected) {
            card.style.borderColor = horse.color;
            card.style.boxShadow = `0 0 15px ${horse.color}66`;
        }

        card.innerHTML = `
            <div class="name" style="font-weight: 700; font-size: 1.2rem;">${horse.name}</div>
            <div class="odds" style="color: ${horse.color}; font-weight: 700; font-size: 0.9rem; margin-top: 5px;">PAGA 2.0x</div>
            <div style="width: 40px; height: 5px; background: ${horse.color}; margin: 10px auto; border-radius: 10px;"></div>
        `;

        card.onclick = () => handleHorseSelection(horse.id);
        horseSelection.appendChild(card);
    });
}

function handleHorseSelection(id) {
    if (gameState.isRacing) return;

    const bet = parseFloat(betInput.value);

    // Validation
    if (isNaN(bet) || bet <= 0) {
        errorMsgText.textContent = "🚨 Por favor, insira um valor!";
        return;
    }

    if (bet > gameState.balance) {
        errorMsgText.textContent = "⚠️ Saldo insuficiente!";
        return;
    }

    // Success - Clear error and start
    errorMsgText.textContent = "";
    gameState.selectedHorse = id;
    gameState.betAmount = bet;
    updateBalance(-bet);

    renderUI();
    startRace();
}

function startRace() {
    gameState.isRacing = true;
    betInput.disabled = true;

    // Reset horses to start
    gameState.horses.forEach(h => {
        h.position = 0;
        h.finished = false;
        h.currentSpeed = 0;
    });

    // Chronometer (60s)
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
    requestAnimationFrame(raceLoop);
}

function updateTimerDisplay() {
    const min = Math.floor(gameState.timerSeconds / 60);
    const sec = gameState.timerSeconds % 60;
    timerText.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function raceLoop() {
    if (!gameState.isRacing) return;

    const now = Date.now();
    const delta = now - gameState.lastTickTime;

    if (delta > 1000 || gameState.lastTickTime === 0) {
        gameState.horses.forEach(h => {
            const baseMin = 0.015;
            const baseMax = 0.038;
            h.currentSpeed = Math.random() * (baseMax - baseMin) + baseMin;
        });
        gameState.lastTickTime = now;
    }

    let winnerFound = null;
    gameState.horses.forEach(h => {
        if (h.finished) return;

        h.position += h.currentSpeed || 0.02;
        const el = document.getElementById(`horse-${h.id}`);
        if (el) el.style.left = `${h.position}%`;

        if (h.position >= TRACK_FINISH_PERCENT) {
            h.finished = true;
            if (!winnerFound) winnerFound = h;
        }
    });

    if (winnerFound) {
        finishRace(winnerFound);
    } else {
        requestAnimationFrame(raceLoop);
    }
}

function finishRace(winner) {
    gameState.isRacing = false;
    clearInterval(gameState.timerInterval);

    setTimeout(() => {
        const won = gameState.selectedHorse === winner.id;
        const totalPayout = won ? gameState.betAmount * 2 : 0;

        resultModal.style.display = 'flex';

        if (won) {
            updateBalance(totalPayout);
            resultTitle.textContent = "PARABÉNS!";
            resultTitle.style.color = "var(--accent-green)";
            resultMessage.innerHTML = `Seu cavalo <strong>${winner.name}</strong> ganhou!<br>Você receberá:`;
            resultPayout.textContent = `$${totalPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            resultPayout.style.color = "var(--accent-green)";
        } else {
            resultTitle.textContent = "QUE PENA!";
            resultTitle.style.color = "var(--danger)";
            resultMessage.textContent = "Não foi dessa vez! Mais sorte na próxima.";
            resultPayout.textContent = `-$${gameState.betAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            resultPayout.style.color = "var(--danger)";
        }
    }, 800);
}

function updateBalance(change) {
    gameState.balance += change;
    localStorage.setItem('derby_balance', gameState.balance);
    updateBalanceDisplay();
}

function updateBalanceDisplay() {
    balanceText.textContent = `$${gameState.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function resetGame() {
    gameState.selectedHorse = null;
    gameState.isRacing = false;
    gameState.timerSeconds = 60;
    updateTimerDisplay();
    betInput.disabled = false;
    betInput.value = '';
    errorMsgText.textContent = "";
    generateHorses();
    renderUI();
}

function setupEventListeners() {
    betInput.oninput = () => {
        errorMsgText.textContent = "";
    };

    closeModalBtn.onclick = () => {
        resultModal.style.display = 'none';
        resetGame();
    };

    exitBtn.onclick = () => {
        resultModal.style.display = 'none';
        resetGame();
    };
}

init();
