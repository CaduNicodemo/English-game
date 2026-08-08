let fullData = {}, currentQ = [], index = 0, mode = 'solo', startTime, score = 0;
let maxPossibleScore = 0;
let gameStartTime = 0; // overall game start timestamp
let correctCount = 0; // track number of correct answers
let currentModule = '';
let currentTest = '';

// Module-specific test exclusions: hide Quiz 1/2/3 for T5 only.
// T2 will keep all quizzes/tests.
const moduleTestExclusions = {
    "T5": ["Quiz 1", "Quiz 2", "Quiz 3"]
};

// Initialize the setup screen selects on page load
async function initSetup() {
    try {
        let res = await fetch('./questions.json?t=' + new Date().getTime());
        fullData = await res.json();
    } catch (e) {
        console.error("Could not load questions.json during init:", e);
        fullData = {};
    }

    // Populate moduleSelect from fullData keys
    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect) return;
    moduleSelect.innerHTML = '';

    const modules = Object.keys(fullData).sort();
    // If no modules in JSON (fallback), provide at least known modules if present in DOM
    if (modules.length === 0) {
        // try to keep existing options if any
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

    // Ensure mode dropdown state is reflected and tests are populated
    toggleTeamDropdown(); // will call updateTests
}

// Build testSelect options based on selected module and mode, applying filters
function updateTests() {
    const moduleSelect = document.getElementById('moduleSelect');
    const testSelect = document.getElementById('testSelect');
    const modeSelect = document.getElementById('modeSelect');

    if (!moduleSelect || !testSelect || !modeSelect) return;

    testSelect.innerHTML = '';
    const mod = moduleSelect.value;
    mode = modeSelect.value;

    if (!fullData[mod]) {
        // If data not loaded or no module in JSON, try to fallback to some reasonable defaults:
        const fallbackTests = ['Past Participle', 'Quiz 1', 'Quiz 2', 'Quiz 3', 'Test 1', 'Test 2'];
        fallbackTests.forEach(t => {
            if (mode === 'teams' && t === 'Past Participle') return; // global rule
            if (moduleTestExclusions[mod] && moduleTestExclusions[mod].includes(t)) return;
            let opt = document.createElement('option');
            opt.value = t;
            opt.text = t;
            testSelect.add(opt);
        });
    } else {
        const tests = Object.keys(fullData[mod]).sort();
        tests.forEach(t => {
            // Global rule: Past Participle is not allowed in teams mode (multiplayer)
            if (mode === 'teams' && t === 'Past Participle') return;

            // Module-specific exclusions (e.g., hide Quiz 1/2/3 for T5)
            if (moduleTestExclusions[mod] && moduleTestExclusions[mod].includes(t)) return;

            let opt = document.createElement('option');
            opt.value = t;
            opt.text = t;
            testSelect.add(opt);
        });
    }

    // If no tests available for this module after filtering, show a placeholder
    if (testSelect.options.length === 0) {
        let opt = document.createElement('option');
        opt.value = '';
        opt.text = 'No groups available';
        testSelect.add(opt);
    }
}

async function loadAndStart() {
    // If for some reason fullData isn't loaded yet, fetch as a fallback
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

    // store current module/test for final results
    currentModule = mod;
    currentTest = test;

    if (!fullData[mod] || !fullData[mod][test]) {
        // If the chosen test is empty (placeholder), notify the user
        if (!test) {
            alert("Please choose a valid group of questions.");
            return;
        }
        // Fallback: if fullData missing, allow the function to continue only when data exists
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

    if (mode === 'teams') setupTeams();

    let scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.style.display = (mode === 'solo') ? 'block' : 'none';

    showQuestion();
}

// ----------------- existing game logic -----------------
// The rest of this file preserves your existing game logic for showing questions,
// rendering options, scoring, teams, final results, and sudden death.
// I preserved function names so integration is seamless.

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

    // Clear media and question initially
    if (mediaArea) mediaArea.innerHTML = "";
    if (qArea) qArea.innerText = "";

    if (mode === 'solo') {
        // Show media immediately for solo
        if (q.type === 'Image' && mediaArea) {
            mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
        } else if (q.type === 'Audio' && mediaArea) {
            mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
        }

        if (qArea) qArea.innerText = q.q;
        startTime = Date.now();
        renderOptions(q);
    } else {
        // Teams mode: no answer options shown (oral answers). Ensure options area is cleared.
        if (optArea) optArea.innerHTML = "";

        // Disable team +Point buttons during countdown (teacher will enable after reveal)
        document.querySelectorAll('#scoreboard .team-point').forEach(b => { b.disabled = true; });

        let count = 3;
        if (timerEl) timerEl.innerText = "Get ready... " + count;
        let interval = setInterval(() => {
            count--;
            if (timerEl) timerEl.innerText = count > 0 ? "Get ready... " + count : "GO!";
            if (count <= 0) { 
                clearInterval(interval); 
                if (timerEl) timerEl.innerText = "";

                // Reveal media and question now
                if (q.type === 'Image' && mediaArea) {
                    mediaArea.innerHTML = `<img src="assets/${q.media}" style="max-width:300px;">`;
                } else if (q.type === 'Audio' && mediaArea) {
                    mediaArea.innerHTML = `<audio controls src="assets/${q.media}"></audio>`;
                }
                if (qArea) qArea.innerText = q.q;

                // Enable team +Point buttons so the teacher can award points
                document.querySelectorAll('#scoreboard .team-point').forEach(b => { b.disabled = false; });
            }
        }, 1000);
    }
}

function renderOptions(q, disableButtons = false) {
    // Only render options for solo mode
    if (mode !== 'solo') return;

    const optArea = document.getElementById('options-area');
    if (!optArea) return;
    optArea.innerHTML = "";
    let opts = [...q.options].sort(() => Math.random() - 0.5);
    opts.forEach(o => {
        let btn = document.createElement('button');
        btn.innerText = o;
        btn.disabled = disableButtons;
        // Only attach solo behavior for solo mode
        // use e.currentTarget to ensure the button element is passed
        btn.addEventListener('click', (e) => checkSolo(e.currentTarget, o, q.answer));
        optArea.appendChild(btn);
    });
}

function checkSolo(btn, sel, corr) {
    // guard: ignore clicks when buttons are already disabled
    if (!btn || btn.disabled) return;

    try {
        const buttons = Array.from(document.querySelectorAll('#options-area button'));
        // disable all buttons immediately to prevent double clicks
        buttons.forEach(b => b.disabled = true);

        const selected = (typeof sel === 'string') ? sel.trim() : sel;
        const correct = (typeof corr === 'string') ? corr.trim() : corr;

        if (selected === correct) {
            let timeTaken = (Date.now() - startTime) / 1000;

            // Scoring parameters (kept from original behavior):
            let grace = 5; // seconds with no penalty
            let maxPenaltyPoints = 90; // maximum points lost due to time
            let maxPenaltyDuration = 60; // seconds at which max penalty applies

            let penalty = 0;
            if (timeTaken > grace) {
                penalty = Math.min(maxPenaltyPoints, Math.round(((timeTaken - grace) / maxPenaltyDuration) * maxPenaltyPoints));
            }
            let points = Math.max(10, 100 - penalty);
            score += points;

            // Visual feedback
            btn.classList.add('correct');
            correctCount++;
        } else {
            // wrong answer: mark selected wrong and reveal correct
            btn.classList.add('wrong');
            let correctBtn = buttons.find(b => (b.innerText || b.textContent).trim() === correct);
            if (correctBtn) correctBtn.classList.add('correct');

            // apply wrong-answer penalty (restore previous behavior):
            const wrongPenalty = 20; // points subtracted for wrong answer
            score = Math.max(0, score - wrongPenalty);
        }

        // Update score display (if present)
        let scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) scoreDisplay.innerText = 'Score: ' + score;

        // Move to next question after brief delay
        setTimeout(() => {
            index++;
            showQuestion();
        }, 800);
    } catch (err) {
        console.error('checkSolo error', err);
        // Re-enable buttons so user can try again
        document.querySelectorAll('#options-area button').forEach(b => b.disabled = false);
    }
}

// Setup teams scoreboard and handlers
function setupTeams() {
    const sb = document.getElementById('scoreboard');
    if (!sb) return;
    sb.innerHTML = '';

    const teamCount = parseInt(document.getElementById('teamCountSelect')?.value) || 2;

    for (let i = 1; i <= teamCount; i++) {
        const teamBox = document.createElement('div');
        teamBox.className = 'team-box';
        teamBox.dataset.team = i;

        const title = document.createElement('div');
        title.innerText = `Team ${i}`;
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';

        const scoreSpan = document.createElement('div');
        scoreSpan.className = 'team-score';
        scoreSpan.innerText = '0';
        scoreSpan.style.fontSize = '18px';
        scoreSpan.style.marginBottom = '8px';

        const btn = document.createElement('button');
        btn.className = 'team-point';
        btn.innerText = '+Point';
        btn.disabled = true; // disabled until reveal in showQuestion for fairness
        btn.addEventListener('click', () => {
            const current = parseInt(scoreSpan.innerText) || 0;
            scoreSpan.innerText = current + 10;
        });

        teamBox.appendChild(title);
        teamBox.appendChild(scoreSpan);
        teamBox.appendChild(btn);
        sb.appendChild(teamBox);
    }
}

// Show final results screen (solo flow and simple team summary)
function showFinalResults() {
    const final = document.getElementById('final-results');
    const resultsText = document.getElementById('results-text');
    const badgeArea = document.getElementById('badge-display-area');

    if (!final || !resultsText) return;

    // Simple solo summary
    if (mode === 'solo') {
        const pct = maxPossibleScore > 0 ? Math.round((correctCount / currentQ.length) * 100) : 0;
        const timeSec = Math.round((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(timeSec / 60);
        const seconds = timeSec % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        resultsText.innerText = `Your score: ${score} / ${maxPossibleScore} (${pct}%)`;

        // Basic badge logic with additional info
        badgeArea.innerHTML = '';
        const badge = document.createElement('div');
        badge.className = 'badge-box badge-bronze';
        if (pct >= 95) badge.className = 'badge-box badge-legendary';
        else if (pct >= 80) badge.className = 'badge-box badge-gold';
        else if (pct >= 50) badge.className = 'badge-box badge-silver';

        // Build badge contents: module/test, pct correct, total time
        const title = document.createElement('div');
        title.style.fontSize = '20px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        title.innerText = `Level: ${currentModule} — ${currentTest}`;

        const pctEl = document.createElement('div');
        pctEl.innerText = `Correct: ${correctCount} / ${currentQ.length} (${pct}%)`;

        const timeEl = document.createElement('div');
        timeEl.innerText = `Time: ${timeStr}`;

        const note = document.createElement('p');
        note.style.fontStyle = 'italic';
        note.style.marginTop = '10px';
        note.innerText = 'Take a screenshot of this badge to show your teacher next class!';

        badge.appendChild(title);
        badge.appendChild(pctEl);
        badge.appendChild(timeEl);
        badge.appendChild(note);
        badgeArea.appendChild(badge);
    } else {
        // Teams: show simple team totals
        const teams = Array.from(document.querySelectorAll('#scoreboard .team-box'));
        let text = 'Team results:\n';
        teams.forEach(tb => {
            const name = tb.querySelector('div').innerText;
            const sc = tb.querySelector('.team-score').innerText;
            text += `${name}: ${sc}\n`;
        });
        resultsText.innerText = text;
    }

    // Clear question UI elements so only results show
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

// Toggle display of team count dropdown and update tests
function toggleTeamDropdown() {
    const modeSelect = document.getElementById('modeSelect');
    const teamArea = document.getElementById('team-dropdown-area');
    if (!modeSelect || !teamArea) return;
    if (modeSelect.value === 'teams') {
        teamArea.classList.remove('hidden');
    } else {
        teamArea.classList.add('hidden');
    }
    // Refresh the tests list to reflect the new mode
    updateTests();
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initSetup();
});
