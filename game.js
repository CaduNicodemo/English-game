let fullData = {}, currentQ = [], index = 0, mode = 'solo', startTime, score = 0;
let maxPossibleScore = 0;
let gameStartTime = 0;
let correctCount = 0;
let currentModule = '';
let currentTest = '';

const moduleTestExclusions = {
    "T5": ["Quiz 1", "Quiz 2", "Quiz 3"]
};

async function initSetup() {
    try {
        let res = await fetch('./questions.json?t=' + new Date().getTime());
        fullData = await res.json();
    } catch (e) {
        console.error("Could not load questions.json during init:", e);
        fullData = {};
    }

    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect) return;
    moduleSelect.innerHTML = '';

    const modules = Object.keys(fullData).sort();
    if (modules.length === 0) {
        const existing = ['T2', 'T5'];
        existing.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m;
            opt.text = m;
            moduleSelect.add(opt);
        });
    } else {
        modules.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m;
            opt.text = m;
            moduleSelect.add(opt);
        });
    }

    toggleTeamDropdown();
}

function updateTests() {
    const moduleSelect = document.getElementById('moduleSelect');
    const testSelect = document.getElementById('testSelect');
    const modeSelect = document.getElementById('modeSelect');

    if (!moduleSelect || !testSelect || !modeSelect) return;

    testSelect.innerHTML = '';
    const mod = moduleSelect.value;
    mode = modeSelect.value;

    if (!fullData[mod]) {
        const fallbackTests = ['Past Participle', 'Quiz 1', 'Quiz 2', 'Quiz 3', 'Test 1', 'Test 2'];
        fallbackTests.forEach(t => {
            if (mode === 'teams' && t === 'Past Participle') return;
            if (moduleTestExclusions[mod] && moduleTestExclusions[mod].includes(t)) return;
            let opt = document.createElement('option');
            opt.value = t;
            opt.text = t;
            testSelect.add(opt);
        });
    } else {
        const tests = Object.keys(fullData[mod]).sort();
        tests.forEach(t => {
            if (mode === 'teams' && t === 'Past Participle') return;
            if (moduleTestExclusions[mod] && moduleTestExclusions[mod].includes(t)) return;

            let opt = document.createElement('option');
            opt.value = t;
            opt.text = t;
            testSelect.add(opt);
        });
    }

    if (testSelect.options.length === 0) {
        let opt = document.createElement('option');
        opt.value = '';
        opt.text = 'No groups available';
        testSelect.add(opt);
    }
}

async function loadAndStart() {
    if (!fullData || Object.keys(fullData).length === 0) {
        try {
            let res = await fetch('./questions.json?t=' + new Date().getTime());
            fullData = await res.json();
        } catch (e) {
            alert("Error loading question data. See console for details.");
            console.error(e);
            return;
        }
    }

    const mod = document.getElementById('moduleSelect').value;
    const test = document.getElementById('testSelect').value;
    mode = document.getElementById('modeSelect').value;

    currentModule = mod;
    currentTest = test;

    if (!fullData[mod] || !fullData[mod][test]) {
        if (!test) {
            alert("Please choose a valid group of questions.");
            return;
        }
        if (!fullData[mod] || !fullData[mod][test]) {
            alert("Error: Could not find " + mod + " -> " + test + " in your JSON.");
            return;
        }
    }

    currentQ = [...fullData[mod][test]].sort(() => Math.random() - 0.5);
    maxPossibleScore = currentQ.length * 100;
    score = 0;
    index = 0;
    correctCount = 0;
    gameStartTime = Date.now();

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    const sb = document.getElementById('scoreboard');

    if (mode === 'teams') {
        setupTeams();
        window.removeEventListener('keydown', handleTeacherKeyboard);
        window.addEventListener('keydown', handleTeacherKeyboard);
    } else {
        // Garante que o placar de times FICA OCULTO no modo Solo
        if (sb) sb.classList.add('hidden');
    }

    let scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.style.display = (mode === 'solo') ? 'block' : 'none';

    showQuestion();
}

function showQuestion() {
    const optArea = document.getElementById('options-area');
    const timerEl = document.getElementById('timer-display');
    const qArea = document.getElementById('q-text');
    const mediaArea = document.getElementById('media-container');
    
    if (index >= currentQ.length) {
        if (qArea) qArea.innerText = "Quiz Complete!";
        if (optArea) optArea.innerHTML = "";
        if (timerEl) timerEl.innerText = "";
        const sb = document.getElementById('scoreboard');
        if (sb) sb.classList.add('hidden');
        showFinalResults();
        return;
    }

    const q = currentQ[index];

    if (mediaArea) mediaArea.innerHTML = "";
    if (qArea) qArea.innerText = "";

    if (mode === 'solo') {
        if (q.type === 'Image' && mediaArea) {
            mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
        } else if (q.type === 'Audio' && mediaArea) {
            mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
        }

        if (qArea) qArea.innerText = q.q;
        startTime = Date.now();
        renderOptions(q);
    } else {
        if (optArea) optArea.innerHTML = "";

        // Desabilita botões durante a contagem regressiva
        setTeamButtonsState(true);

        let count = 3;
        if (timerEl) timerEl.innerText = "Get ready... " + count;
        let interval = setInterval(() => {
            count--;
            if (timerEl) timerEl.innerText = count > 0 ? "Get ready... " + count : "GO!";
            if (count <= 0) { 
                clearInterval(interval); 
                if (timerEl) timerEl.innerText = "";

                if (q.type === 'Image' && mediaArea) {
                    mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
                } else if (q.type === 'Audio' && mediaArea) {
                    mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
                }
                
                // Exibe APENAS a pergunta (a resposta fica escondida até a ativação dos botões)
                if (qArea) {
                    qArea.innerText = q.q;
                }

                // Habilita os botões de controle para o professor
                setTeamButtonsState(false);
            }
        }, 1000);
    }
}

function renderOptions(q, disableButtons = false) {
    if (mode !== 'solo') return;

    const optArea = document.getElementById('options-area');
    if (!optArea) return;
    optArea.innerHTML = "";
    let opts = [...q.options].sort(() => Math.random() - 0.5);
    opts.forEach(o => {
        let btn = document.createElement('button');
        btn.innerText = o;
        btn.disabled = disableButtons;
        btn.addEventListener('click', (e) => checkSolo(e.currentTarget, o, q.answer));
        optArea.appendChild(btn);
    });
}

function checkSolo(btn, sel, corr) {
    if (!btn || btn.disabled) return;

    try {
        const buttons = Array.from(document.querySelectorAll('#options-area button'));
        buttons.forEach(b => b.disabled = true);

        const selected = (typeof sel === 'string') ? sel.trim() : sel;
        const correct = (typeof corr === 'string') ? corr.trim() : corr;

        if (selected === correct) {
            let timeTaken = (Date.now() - startTime) / 1000;
            let grace = 5;
            let maxPenaltyPoints = 90;
            let maxPenaltyDuration = 60;

            let penalty = 0;
            if (timeTaken > grace) {
                penalty = Math.min(maxPenaltyPoints, Math.round(((timeTaken - grace) / maxPenaltyDuration) * maxPenaltyPoints));
            }
            let points = Math.max(10, 100 - penalty);
            score += points;

            btn.classList.add('correct');
            correctCount++;
        } else {
            btn.classList.add('wrong');
            let correctBtn = buttons.find(b => (b.innerText || b.textContent).trim() === correct);
            if (correctBtn) correctBtn.classList.add('correct');

            const wrongPenalty = 20;
            score = Math.max(0, score - wrongPenalty);
        }

        let scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) scoreDisplay.innerText = 'Score: ' + score;

        setTimeout(() => {
            index++;
            showQuestion();
        }, 800);
    } catch (err) {
        console.error('checkSolo error', err);
        document.querySelectorAll('#options-area button').forEach(b => b.disabled = false);
    }
}

// --- MODO TEAMS: PAINEL DO PROFESSOR ---

function setupTeams() {
    const sb = document.getElementById('scoreboard');
    if (!sb) return;
    sb.classList.remove('hidden');
    sb.innerHTML = '';

    const teamCount = parseInt(document.getElementById('teamCountSelect')?.value) || 2;

    // 1. Botão "Ninguém Pontuou"
    const teacherControl = document.createElement('div');
    teacherControl.className = 'teacher-controls';
    teacherControl.style.width = '100%';
    teacherControl.style.display = 'flex';
    teacherControl.style.justifyContent = 'center';
    teacherControl.style.marginBottom = '15px';

    const btnNoPoints = document.createElement('button');
    btnNoPoints.id = 'btn-no-points';
    btnNoPoints.innerText = '⚠️ No Points / Reveal Answer [Spacebar]';
    btnNoPoints.style.backgroundColor = '#e67e22';
    btnNoPoints.style.color = '#fff';
    btnNoPoints.style.padding = '10px 20px';
    btnNoPoints.style.fontSize = '16px';
    btnNoPoints.style.borderRadius = '6px';
    btnNoPoints.style.cursor = 'pointer';
    btnNoPoints.onclick = handleNoPoints;

    teacherControl.appendChild(btnNoPoints);
    sb.appendChild(teacherControl);

    // 2. Placar dos Times
    const teamsWrapper = document.createElement('div');
    teamsWrapper.style.display = 'flex';
    teamsWrapper.style.justifyContent = 'center';
    teamsWrapper.style.gap = '15px';
    teamsWrapper.style.flexWrap = 'wrap';

    for (let i = 1; i <= teamCount; i++) {
        const teamBox = document.createElement('div');
        teamBox.className = 'team-box';
        teamBox.id = `team-box-${i}`;
        teamBox.style.border = '2px solid #ccc';
        teamBox.style.padding = '12px';
        teamBox.style.borderRadius = '8px';
        teamBox.style.minWidth = '120px';
        teamBox.style.textAlign = 'center';

        const title = document.createElement('div');
        title.innerText = `Team ${i}`;
        title.style.fontWeight = 'bold';

        const keyHint = document.createElement('small');
        keyHint.innerText = `(Key: ${i})`;
        keyHint.style.color = '#777';

        const scoreSpan = document.createElement('div');
        scoreSpan.className = 'team-score';
        scoreSpan.id = `team-score-${i}`;
        scoreSpan.innerText = '0';
        scoreSpan.style.fontSize = '24px';
        scoreSpan.style.fontWeight = 'bold';
        scoreSpan.style.margin = '8px 0';

        const addPointBtn = document.createElement('button');
        addPointBtn.className = 'team-point-btn';
        addPointBtn.id = `btn-add-team-${i}`;
        addPointBtn.innerText = '➕ +10 Pts';
        addPointBtn.style.backgroundColor = '#2ecc71';
        addPointBtn.style.color = '#fff';
        addPointBtn.style.padding = '6px 12px';
        addPointBtn.style.cursor = 'pointer';
        addPointBtn.onclick = () => awardTeamPoint(i);

        teamBox.appendChild(title);
        teamBox.appendChild(keyHint);
        teamBox.appendChild(scoreSpan);
        teamBox.appendChild(addPointBtn);
        teamsWrapper.appendChild(teamBox);
    }

    sb.appendChild(teamsWrapper);
}

function setTeamButtonsState(disabled) {
    const noPointsBtn = document.getElementById('btn-no-points');
    if (noPointsBtn) noPointsBtn.disabled = disabled;

    const teamCount = parseInt(document.getElementById('teamCountSelect')?.value) || 2;
    for (let i = 1; i <= teamCount; i++) {
        const btn = document.getElementById(`btn-add-team-${i}`);
        if (btn) btn.disabled = disabled;
    }
}

// Atribui ponto para um time, revela a resposta e aguarda 2s
function awardTeamPoint(teamId) {
    const q = currentQ[index];
    const qArea = document.getElementById('q-text');

    // Desabilita botões para evitar múltiplos cliques
    setTeamButtonsState(true);

    const scoreSpan = document.getElementById(`team-score-${teamId}`);
    if (scoreSpan) {
        const current = parseInt(scoreSpan.innerText) || 0;
        scoreSpan.innerText = current + 10;
    }

    // Exibe qual time pontuou e revela a resposta correta
    if (qArea && q) {
        qArea.innerHTML = `<div style="color: #27ae60; font-size: 22px; font-weight: bold;">🎉 Team ${teamId} +10 Pts!</div>
                           <div style="font-size: 20px; margin-top: 10px;">Correct Answer: <strong>${q.answer}</strong></div>`;
    }

    // Exibe por 2 segundos antes de avançar
    setTimeout(() => {
        index++;
        showQuestion();
    }, 2000);
}

// Ação de "Ninguém Pontuou"
function handleNoPoints() {
    const q = currentQ[index];
    const qArea = document.getElementById('q-text');

    setTeamButtonsState(true);

    if (qArea && q) {
        qArea.innerHTML = `<div style="color: #e74c3c; font-size: 22px; font-weight: bold;">⚠️ No team scored!</div>
                           <div style="font-size: 20px; margin-top: 10px;">Correct Answer: <strong>${q.answer}</strong></div>`;
    }

    setTimeout(() => {
        index++;
        showQuestion();
    }, 2000);
}

function handleTeacherKeyboard(e) {
    if (mode !== 'teams') return;

    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const noPointsBtn = document.getElementById('btn-no-points');
        if (noPointsBtn && !noPointsBtn.disabled) {
            handleNoPoints();
        }
        return;
    }

    const key = parseInt(e.key);
    const teamCount = parseInt(document.getElementById('teamCountSelect')?.value) || 2;
    if (key >= 1 && key <= teamCount) {
        const teamBtn = document.getElementById(`btn-add-team-${key}`);
        if (teamBtn && !teamBtn.disabled) {
            awardTeamPoint(key);
        }
    }
}

// --- TELA DE RESULTADOS FINAIS ---

function showFinalResults() {
    const final = document.getElementById('final-results');
    const resultsText = document.getElementById('results-text');
    const badgeArea = document.getElementById('badge-display-area');
    const spControls = document.getElementById('single-player-controls');

    if (!final || !resultsText) return;

    if (mode === 'solo') {
        if (spControls) spControls.style.display = 'block';

        const pct = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
        const correctPct = maxPossibleScore > 0 ? Math.round((correctCount / currentQ.length) * 100) : 0;
        const timeSec = Math.round((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(timeSec / 60);
        const seconds = timeSec % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        resultsText.innerText = `Your score: ${score} / ${maxPossibleScore} (${pct}%)`;

        badgeArea.innerHTML = '';
        const canvas = document.createElement('canvas');
        const w = 800, h = 420;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');

        let bgGradient;
        let emblemColor = '#ffffff';
        if (pct >= 95) {
            bgGradient = ctx.createLinearGradient(0,0,w,0);
            bgGradient.addColorStop(0,'#2d1a47'); bgGradient.addColorStop(1,'#bc77a5');
            emblemColor = '#f59d34';
        } else if (pct >= 80) {
            bgGradient = ctx.createLinearGradient(0,0,w,0);
            bgGradient.addColorStop(0,'#c99a3e'); bgGradient.addColorStop(1,'#f7d165');
            emblemColor = '#a56827';
        } else if (pct >= 50) {
            bgGradient = ctx.createLinearGradient(0,0,w,0);
            bgGradient.addColorStop(0,'#666b7d'); bgGradient.addColorStop(1,'#ccd2de');
            emblemColor = '#545966';
        } else {
            bgGradient = ctx.createLinearGradient(0,0,w,0);
            bgGradient.addColorStop(0,'#713221'); bgGradient.addColorStop(1,'#f7b585');
            emblemColor = '#79402f';
        }

        ctx.fillStyle = bgGradient; ctx.fillRect(0,0,w,h);
        roundRect(ctx, 20, 20, w-40, h-40, 30, true, false);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        roundRect(ctx, 40, 40, w-80, h-80, 20, true, false);

        const panelX = 40, panelY = 40, panelW = w - 80, panelH = h - 80;
        const emblemW = 250, emblemH = 250;

        let emblemSrc = 'bronze.png';
        if (pct >= 95) emblemSrc = 'legendary.png';
        else if (pct >= 80) emblemSrc = 'gold.png';
        else if (pct >= 50) emblemSrc = 'silver.png';

        const emblemImg = new Image();
        emblemImg.crossOrigin = 'anonymous';
        emblemImg.onload = function() {
            const centerY = panelY + panelH / 2;
            const emblemX = panelX + 30;
            const emblemY = panelY + Math.round((panelH - emblemH) / 2);
            ctx.drawImage(emblemImg, emblemX, emblemY, emblemW, emblemH);

            const textX = emblemX + emblemW + 30;
            const levelFontSize = 30, scoreFontSize = 26, timeFontSize = 24;
            const levelFont = `bold ${levelFontSize}px "Train One", sans-serif`;
            const scoreFont = `${scoreFontSize}px sans-serif`;
            const timeFont = `${timeFontSize}px sans-serif`;
            const gap = 8;
            const levelLH = Math.round(levelFontSize * 1.2);
            const scoreLH = Math.round(scoreFontSize * 1.2);
            const correctLH = Math.round(scoreFontSize * 1.2);
            const timeLH = Math.round(timeFontSize * 1.2);
            const totalTextH = levelLH + gap + scoreLH + gap + timeLH;
            const startY = Math.round(centerY - (totalTextH / 2));

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#222';

            ctx.font = levelFont;
            ctx.fillText(`Level: ${currentModule} - ${currentTest}`, textX, startY + levelLH / 2);
            ctx.font = scoreFont;
            ctx.fillText(`Score: ${score} / ${maxPossibleScore} (${pct}%)`, textX, startY + levelLH + gap + scoreLH / 2);
            ctx.fillText(`Correct: ${correctCount} / ${currentQ.length} (${correctPct}%)`, textX, startY + levelLH + gap + scoreLH + gap + correctLH / 2);
            ctx.font = timeFont;
            ctx.fillText(`Time: ${timeStr}`, textX, startY + levelLH + gap + scoreLH + gap + correctLH + gap + timeLH / 2);

            const dataUrl = canvas.toDataURL('image/png');
            const img = document.createElement('img'); img.src = dataUrl;
            img.alt = 'Your badge';
            img.style.maxWidth = '100%';
            img.className = 'badge-image';

            let tierClass = 'bronze';
            if (pct >= 95) tierClass = 'legendary';
            else if (pct >= 80) tierClass = 'gold';
            else if (pct >= 50) tierClass = 'silver';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `download-btn badge-${tierClass}`;
            btn.innerHTML = `<span>Download Badge (PNG)</span>`;
            btn.onclick = () => {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `${currentModule}-${currentTest}-${tierClass}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            };

            badgeArea.appendChild(img); badgeArea.appendChild(btn);
        };

        emblemImg.onerror = function() {
            const centerY = panelY + panelH / 2;
            const emblemX = panelX + 30;
            const emblemY = panelY + Math.round((panelH - emblemH) / 2);
            ctx.fillStyle = emblemColor;
            ctx.fillRect(emblemX, emblemY, emblemW, emblemH);
        };

        emblemImg.src = emblemSrc;

    } else {
        if (spControls) spControls.style.display = 'none';

        const teams = Array.from(document.querySelectorAll('#scoreboard .team-box'));
        let text = '🏆 Final Standings:\n\n';
        teams.forEach(tb => {
            const name = tb.querySelector('div').innerText;
            const sc = tb.querySelector('.team-score').innerText;
            text += `${name}: ${sc} pts\n`;
        });
        resultsText.innerText = text;
        if (badgeArea) badgeArea.innerHTML = '';
    }

    const optionsArea = document.getElementById('options-area');
    const qText = document.getElementById('q-text');
    const timerDisplay = document.getElementById('timer-display');
    const mediaContainer = document.getElementById('media-container');

    if (optionsArea) optionsArea.innerHTML = '';
    if (qText) qText.innerText = '';
    if (timerDisplay) timerDisplay.innerText = '';
    if (mediaContainer) mediaContainer.innerHTML = '';

    const finalResults = document.getElementById('final-results');
    if (finalResults) finalResults.classList.remove('hidden');
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof fill === 'undefined') fill = true;
    if (typeof stroke === 'undefined') stroke = true;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function toggleTeamDropdown() {
    const modeSelect = document.getElementById('modeSelect');
    const teamArea = document.getElementById('team-dropdown-area');
    if (!modeSelect || !teamArea) return;
    if (modeSelect.value === 'teams') {
        teamArea.classList.remove('hidden');
    } else {
        teamArea.classList.add('hidden');
    }
    updateTests();
}

window.addEventListener('DOMContentLoaded', () => {
    initSetup();
});
