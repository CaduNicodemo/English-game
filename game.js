let fullData = {}, currentQ = [], index = 0, mode = 'solo', startTime, score = 0;
let maxPossibleScore = 0;

async function loadAndStart() {
    let res = await fetch('./questions.json?t=' + new Date().getTime());
    fullData = await res.json(); 

    let mod = document.getElementById('moduleSelect').value;
    let test = document.getElementById('testSelect').value;
    mode = document.getElementById('modeSelect').value;
        
    if (!fullData[mod] || !fullData[mod][test]) {
        alert("Error: Could not find " + mod + " -> " + test + " in your JSON.");
        return;
    }

    currentQ = [...fullData[mod][test]].sort(() => Math.random() - 0.5);
    maxPossibleScore = currentQ.length * 100;
    score = 0;
    index = 0;

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    if (mode === 'teams') setupTeams();

    let scoreDisplay = document.getElementById('score-display');
    scoreDisplay.style.display = (mode === 'solo') ? 'block' : 'none';

    showQuestion();
}

function showQuestion() {
    let optArea = document.getElementById('options-area');
    let timerEl = document.getElementById('timer-display');
    let qArea = document.getElementById('q-text');
    
    if (index >= currentQ.length) {
        qArea.innerText = "Quiz Complete!";
        optArea.innerHTML = "";
        timerEl.innerText = "";
        document.getElementById('scoreboard').classList.add('hidden');
        showFinalResults();
        return;
    }
    let q = currentQ[index];
    let mediaArea = document.getElementById('media-container');
    mediaArea.innerHTML = "";

    if (q.type === 'Image') {
        mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
    } else if (q.type === 'Audio') {
        mediaArea.innerHTML = `<audio controls source src="assets/${q.media}"></audio>`;
    }
    qArea.innerText = q.q;

    if (mode === 'solo') {
        startTime = Date.now();
        renderOptions(q);
    } else {
        let count = 3;
        timerEl.innerText = "Get ready... " + count;
        let interval = setInterval(() => {
            count--;
            timerEl.innerText = count > 0 ? "Get ready... " + count : "GO!";
            if(count <= 0) { 
                clearInterval(interval); 
                timerEl.innerText = "";
            }
        }, 1000);
    }
}

function renderOptions(q) {
    let optArea = document.getElementById('options-area');
    optArea.innerHTML = "";
    let opts = [...q.options].sort(() => Math.random() - 0.5);
    opts.forEach(o => {
        let btn = document.createElement('button');
        btn.innerText = o;
        btn.onclick = (e) => (mode === 'solo') ? checkSolo(e.target, o, q.answer) : null;
        optArea.appendChild(btn);
    });
}

function checkSolo(btn, sel, corr) {
    let buttons = document.querySelectorAll('#options-area button');

    if (sel === corr) {
        let timeTaken = (Date.now() - startTime) / 1000;
        let earned = Math.max(10, Math.round(100 - (timeTaken * 10)));
        score += earned;

        btn.classList.add('correct');
        buttons.forEach(b => b.disabled = true);
        document.getElementById('score-display').innerText = "Score: " + score;

        setTimeout(() => { 
            index++; 
            showQuestion(); 
        }, 1000);
    } else {
        score = Math.max(0, score - 5);
        document.getElementById('score-display').innerText = "Score: " + score;

        btn.classList.add('wrong');
        btn.disabled = true;

        let originalText = btn.innerText;
        btn.innerText = "-5 Penalty!";

        setTimeout(() => { 
            btn.classList.remove('wrong'); 
            btn.innerText = originalText;
            btn.disabled = false;
        }, 1000);
    }
}

function setupTeams() {
    let num = document.getElementById('teamCountSelect').value;
    let scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = "";
    for(let i = 1; i <= num; i++) {
        scoreboard.innerHTML += `<div class="team-box">T${i}: <span id="s${i}">0</span><br><button onclick="teamPoint(${i})">+ Point</button></div>`;
    }
}

function teamPoint(i) {
    document.getElementById('s'+i).innerText = parseInt(document.getElementById('s'+i).innerText) + 1;
    let timerEl = document.getElementById('timer-display');
    timerEl.innerText = "";
    index++;
    showQuestion();
}

function toggleTeamDropdown() { 
    document.getElementById('team-dropdown-area').style.display = (document.getElementById('modeSelect').value === 'teams') ? 'block' : 'none'; 
}

function calcularBadge(scoreAtual, scoreMaximo) {
    let porcentagem = scoreMaximo > 0 ? (scoreAtual / scoreMaximo) * 100 : 0;
    
    if (porcentagem >= 90) {
        return { nome: "🌟 Legendary Badge", classe: "badge-legendary", desc: "Legendary performance! Total mastery." };
    } else if (porcentagem >= 75) {
        return { nome: "🥇 Gold Badge", classe: "badge-gold", desc: "Great job! Above 75% accuracy." };
    } else if (porcentagem >= 50) {
        return { nome: "🥈 Silver Badge", classe: "badge-silver", desc: "Good effort! Over 50% accuracy." };
    } else {
        return { nome: "🥉 Bronze Badge", classe: "badge-bronze", desc: "Keep practicing to improve!" };
    }
}

function showFinalResults() {
    setTimeout(() => {
        let resArea = document.getElementById('final-results');
        resArea.classList.remove('hidden');

        let textContainer = document.getElementById('results-text');
        let badgeArea = document.getElementById('badge-display-area');
        let singleControls = document.getElementById('single-player-controls');

        if (mode === 'solo') {
            singleControls.style.display = 'block';

            let badge = calcularBadge(score, maxPossibleScore);
            let porcentagemReal = ((score / maxPossibleScore) * 100).toFixed(1);

            textContainer.innerHTML = `<h3>Your Final Score: ${score} / ${maxPossibleScore} (${porcentagemReal}%)</h3>`;
            
            badgeArea.innerHTML = `
                <div class="badge-box ${badge.classe}">
                    <h3>${badge.nome}</h3>
                    <p>${badge.desc}</p>
                </div>
            `;
        } else {
            singleControls.style.display = 'none';
            badgeArea.innerHTML = "";

            let teamScores = [];
            let numTeams = document.getElementById('teamCountSelect').value;
            for(let i = 1; i <= numTeams; i++) {
                teamScores.push({ name: "Team " + i, points: parseInt(document.getElementById('s'+i).innerText) });
            }
            teamScores.sort((a, b) => b.points - a.points);
            
            let isTie = teamScores.length > 1 && teamScores[0].points === teamScores[1].points;

            let podium = `<h3>Results:</h3>`;
            teamScores.forEach((t, i) => {
                podium += `<p><strong>${i + 1}º Place:</strong> ${t.name} with ${t.points} points</p>`;
            });
    
            textContainer.innerHTML = podium;

            if (isTie) {
                let btn = document.createElement('button');
                btn.innerText = "Sudden Death Tie-Breaker!";
                btn.style.backgroundColor = "orange";
                btn.onclick = startSuddenDeath;
                textContainer.appendChild(btn);
            }
        }
    }, 100);
}

function startSuddenDeath() {
    index = 0;
    currentQ = [currentQ[Math.floor(Math.random() * currentQ.length)]];
    
    let numTeams = document.getElementById('teamCountSelect').value;
    for(let i = 1; i <= numTeams; i++) {
        document.getElementById('s'+i).innerText = "0";
    }

    document.getElementById('final-results').classList.add('hidden');
    document.getElementById('scoreboard').classList.remove('hidden');
    showQuestion();
}