/* spelling-bee.js - Single-player spelling practice */

const DATA_PATH = 'questions_spelling.json';
const ASSET_PREFIX = 'assets/spelling-bee/';

let fullData = {};
let currentSet = [];
let idx = 0;
let correct = 0;
let startTime = 0;

async function init() {
  try {
    const r = await fetch(DATA_PATH + '?t=' + Date.now());
    fullData = await r.json();
  } catch (e) {
    console.error('Could not load', DATA_PATH, e);
    fullData = {};
  }

  document.getElementById('startBtn').addEventListener('click', startPractice);
  document.getElementById('play-btn').addEventListener('click', playAudio);
  document.getElementById('submitBtn').addEventListener('click', submitAnswer);
  document.getElementById('skipBtn').addEventListener('click', skipQuestion);
  document.getElementById('backBtn').addEventListener('click', () => location.reload());

  const answerInput = document.getElementById('answerInput');
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });

  // Space plays audio unless focus is in the text input (so students can type spaces)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const active = document.activeElement;
      if (active && active.id === 'answerInput') return; // let input receive spaces
      e.preventDefault();
      playAudio();
    }
  });
}

function startPractice() {
  const level = document.getElementById('levelSelect').value;
  const list = document.getElementById('listSelect').value;
  const study = document.getElementById('studySelect').value;

  if (!fullData[level] || !fullData[level][list] || !fullData[level][list][study]) {
    alert('No questions found for the selected combination. Please check the data file.');
    return;
  }

  currentSet = [...fullData[level][list][study]];
  // Shuffle
  for (let i = currentSet.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentSet[i], currentSet[j]] = [currentSet[j], currentSet[i]];
  }

  idx = 0; correct = 0; startTime = Date.now();

  document.getElementById('setup').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('final').classList.add('hidden');

  document.getElementById('qTotal').innerText = currentSet.length;
  showQuestion();
}

function showQuestion() {
  if (idx >= currentSet.length) return finishPractice();
  const q = currentSet[idx];
  document.getElementById('qIndex').innerText = idx + 1;
  document.getElementById('prompt').innerText = q.prompt || '';

  const audioEl = document.getElementById('audio');
  audioEl.src = ASSET_PREFIX + q.media;
  audioEl.load();

  // Reset UI
  document.getElementById('message').innerText = '';
  const input = document.getElementById('answerInput');
  input.value = '';
  input.focus();
}

function playAudio() {
  const audioEl = document.getElementById('audio');
  if (!audioEl.src) return;
  audioEl.play().catch(e => console.warn('Audio play blocked', e));
}

function submitAnswer() {
  if (idx >= currentSet.length) return;
  const q = currentSet[idx];
  const input = document.getElementById('answerInput');
  const given = input.value === null ? '' : String(input.value).trim();

  // Exact-match: case and punctuation matter. We trim only leading/trailing whitespace.
  const ok = given === q.answer;

  const msg = document.getElementById('message');
  if (ok) {
    correct += 1;
    msg.style.color = '#2ecc71';
    msg.innerText = 'Correct! 🎉';
  } else {
    msg.style.color = '#e74c3c';
    msg.innerText = `Incorrect. Correct spelling: ${q.answer}`;
  }

  // short delay then next
  idx += 1;
  setTimeout(() => {
    if (idx < currentSet.length) showQuestion();
    else finishPractice();
  }, 1000);
}

function skipQuestion() {
  idx += 1;
  if (idx < currentSet.length) showQuestion();
  else finishPractice();
}

function finishPractice() {
  document.getElementById('game').classList.add('hidden');
  document.getElementById('final').classList.remove('hidden');

  const total = currentSet.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const timeSec = Math.round((Date.now() - startTime) / 1000);

  const summaryEl = document.getElementById('final-summary');
  let message = `You answered ${correct} of ${total} correctly (${pct}%). Time: ${timeSec}s.`;
  let congrats = '';
  if (pct === 100) congrats = 'Perfect score! Outstanding work!';
  else if (pct >= 80) congrats = 'Great job — keep it up!';
  else if (pct >= 50) congrats = 'Nice effort — a little more practice will help.';
  else congrats = 'Keep practicing — you will get there!';

  summaryEl.innerHTML = `<div>${message}</div><div style="margin-top:8px;font-weight:bold">${congrats}</div>`;
}

window.addEventListener('DOMContentLoaded', init);
