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
    let mediaArea = document.getElementById('media-container');
    
    if (index >= currentQ.length) {
        qArea.innerText = "Quiz Complete!";
        optArea.innerHTML = "";
        timerEl.innerText = "";
        document.getElementById('scoreboard').classList.add('hidden');
        showFinalResults();
        return;
    }
    let q = currentQ[index];

    // Clear media and question initially
    mediaArea.innerHTML = "";
    qArea.innerText = "";

    if (mode === 'solo') {
        // Show media immediately for solo
        if (q.type === 'Image') {
            mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
        } else if (q.type === 'Audio') {
            mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
        }

        qArea.innerText = q.q;
        startTime = Date.now();
        renderOptions(q);
    } else {
        // Teams mode: no answer options shown (oral answers). Ensure options area is cleared.
        optArea.innerHTML = "";

        // Disable team +Point buttons during countdown (teacher will enable after reveal)
        document.querySelectorAll('#scoreboard .team-point').forEach(b => { b.disabled = true; });

        let count = 3;
        timerEl.innerText = "Get ready... " + count;
        let interval = setInterval(() => {
            count--;
            timerEl.innerText = count > 0 ? "Get ready... " + count : "GO!";
            if (count <= 0) { 
                clearInterval(interval); 
                timerEl.innerText = "";

                // Reveal media and question now
                if (q.type === 'Image') {
                    mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
                } else if (q.type === 'Audio') {
                    mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
                }
                qArea.innerText = q.q;

                // Enable team +Point buttons so the teacher can award points
                document.querySelectorAll('#scoreboard .team-point').forEach(b => { b.disabled = false; });
            }
        }, 1000);
    }
}

function renderOptions(q, disableButtons = false) {
    // Only render options for solo mode
    if (mode !== 'solo') return;

    let optArea = document.getElementById('options-area');
    optArea.innerHTML = "";
    let opts = [...q.options].sort(() => Math.random() - 0.5);
    opts.forEach(o => {
        let btn = document.createElement('button');
        btn.innerText = o;
        btn.disabled = disableButtons;
        // Only attach solo behavior for solo mode
        btn.addEventListener('click', (e) => checkSolo(e.target, o, q.answer));
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
    let num = parseInt(document.getElementById('teamCountSelect').value, 10) || 1;
    let scoreboard = document.getElementById('scoreboard');
    
    // Adiciona uma classe container para alinhar os times lado a lado no PC
    scoreboard.className = "team-container";
    scoreboard.innerHTML = "";
    
    for (let i = 1; i <= num; i++) {
        let box = document.createElement('div');
        box.className = 'team-box';

        let title = document.createElement('strong');
        title.innerText = `Team ${i}`;

        let scoreSpan = document.createElement('span');
        scoreSpan.id = `s${i}`;
        scoreSpan.style.fontSize = '24px';
        scoreSpan.style.fontWeight = 'bold';
        scoreSpan.innerText = '0';

        let btn = document.createElement('button');
        btn.className = 'team-point';
        btn.style.width = '100%';
        btn.style.marginTop = '8px';
        btn.style.padding = '8px';
        btn.disabled = true; // start disabled; enabled after reveal
        btn.innerText = '+ Point';
        btn.addEventListener('click', () => teamPoint(i));

        box.appendChild(title);
        box.appendChild(document.createElement('br'));
        box.appendChild(scoreSpan);
        box.appendChild(document.createElement('br'));
        box.appendChild(btn);

        scoreboard.appendChild(box);
    }
}

function teamPoint(i) {
    document.getElementById('s' + i).innerText = parseInt(document.getElementById('s' + i).innerText) + 1;
    let timerEl = document.getElementById('timer-display');
    timerEl.innerText = "";
    index++;

    // After teacher awards a point and we move to next question, disable +Point buttons until reveal
    document.querySelectorAll('#scoreboard .team-point').forEach(b => { b.disabled = true; });

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
        // Stop any playing media (audio/video) and reset
        document.querySelectorAll('#media-container audio, #media-container video').forEach(m => {
            try { m.pause(); m.currentTime = 0; } catch (e) {}
        });

        // Clear any visible question/media so final results UI doesn't show previous content underneath
        let mediaArea = document.getElementById('media-container');
        let qArea = document.getElementById('q-text');
        let optArea = document.getElementById('options-area');
        let timerEl = document.getElementById('timer-display');

        if (mediaArea) mediaArea.innerHTML = "";
        if (qArea) qArea.innerText = "";
        if (optArea) optArea.innerHTML = "";
        if (timerEl) timerEl.innerText = "";

        // Make sure scoreboard is hidden while showing final results
        document.getElementById('scoreboard').classList.add('hidden');

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
            for (let i = 1; i <= numTeams; i++) {
                teamScores.push({ name: "Team " + i, points: parseInt(document.getElementById('s' + i).innerText) });
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
    for (let i = 1; i <= numTeams; i++) {
        document.getElementById('s' + i).innerText = "0";
    }

    document.getElementById('final-results').classList.add('hidden');
    document.getElementById('scoreboard').classList.remove('hidden');
    showQuestion();
}
