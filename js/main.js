// On-call — screens, settings, input and the frame loop.

import { Game, SPEEDS, MAX_LEVEL } from './engine.js';
import { KEYMAPS, buildLookup } from './input.js';
import { createRenderer, drawAvatar, PLAYER_COLORS } from './render.js';
import { audio, TRACKS } from './audio.js';
import { pixelText } from './pixelfont.js';

const $ = (sel, el = document) => el.querySelector(sel);
const STORE_KEY = 'on-call-settings-v1';
const DAS_DELAY = 170; // ms a move key is held before it repeats
const DAS_REPEAT = 50;
const ROWS = ['on', 'level', 'speed'];
const ROW_LABELS = { on: 'PLAYER', level: 'BUGS', speed: 'SPEED' };

const menuEl = $('#menu');
const slotsEl = $('#slots');
const arenaEl = $('#arena');
const panelsEl = $('#panels');
const overlayEl = $('#overlay');
const padEl = $('#pad');
const countdownEl = $('#countdown');
const GO_MS = 600; // how long GO! stays up; play starts once it is gone
const COUNTDOWN_MS = 3000 + GO_MS; // 3… 2… 1… GO!
const musicOut = $('#music output');

$('h1').insertAdjacentHTML('beforeend', pixelText([['ON-', 'on'], ['CALL', 'call']]));

// --- settings ---------------------------------------------------------------

// Arrangements of the on-screen buttons, picked with the small buttons above them during play.
// The CSS places the buttons for each id.
const PAD_LAYOUTS = [
  { id: 'split' }, // 1: ◀ ▼ ↻ ▶
  { id: 'row' }, // 2: ◀ ▶ ▼ ↻
  { id: 'lefty' }, // 3: ↻ ▼ ◀ ▶
];

function loadSettings() {
  const settings = {
    players: [0, 1, 2, 3].map((i) => ({ on: i === 0, level: 3, speed: 1 })),
    music: 'hotfix',
    pad: PAD_LAYOUTS[0].id,
    muted: false,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    saved.players.forEach((p, i) => {
      if (!settings.players[i]) return;
      settings.players[i] = {
        on: Boolean(p.on),
        level: Math.max(1, Math.min(MAX_LEVEL, p.level | 0)),
        speed: Math.max(0, Math.min(SPEEDS.length - 1, p.speed | 0)),
      };
    });
    if (TRACKS.some((t) => t.id === saved.music)) settings.music = saved.music;
    if (PAD_LAYOUTS.some((l) => l.id === saved.pad)) settings.pad = saved.pad;
    settings.muted = saved.muted === true;
  } catch {
    // nothing saved yet, or storage is unavailable: defaults are fine
  }
  return settings;
}

function saveSettings() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch {
    // private window etc.
  }
}

const settings = loadSettings();
audio.track = settings.music;
audio.setMuted(settings.muted);

// --- screen size and touch ------------------------------------------------------

// Narrow screens (phones) only have room for one server. Touch screens, and narrow
// windows, get on-screen buttons. The keyboard keeps working in every case.
const narrowQuery = window.matchMedia('(max-width: 700px)');
const coarseQuery = window.matchMedia('(pointer: coarse)');
const isNarrow = () => narrowQuery.matches;
const wantsPad = () => narrowQuery.matches || coarseQuery.matches;

/** Whether a player slot takes part. On a narrow screen that is player 1 alone, whatever is saved. */
const isOn = (i) => (isNarrow() ? i === 0 : settings.players[i].on);
const activeSlots = () => [0, 1, 2, 3].filter(isOn);

// --- settings screen ----------------------------------------------------------

// Pixel-art arrows for the ◀ ▶ buttons (the music row has the same ones in index.html).
const ICON_PREV = '<svg viewBox="0 0 4 7" aria-hidden="true" focusable="false"><path d="M0 3h1v1H0zM1 2h1v3H1zM2 1h1v5H2zM3 0h1v7H3z"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 4 7" aria-hidden="true" focusable="false"><path d="M0 0h1v7H0zM1 1h1v5H1zM2 2h1v3H2zM3 3h1v1H3z"/></svg>';

const focusRow = [0, 0, 0, 0]; // which row each player's keys are on
const menuKeys = buildLookup([0, 1, 2, 3]);

function buildMenu() {
  slotsEl.innerHTML = settings.players
    .map(
      (_, i) => `
      <div class="slot" data-slot="${i}" style="--pc:${PLAYER_COLORS[i][0]}">
        <canvas class="avatar" width="24" height="28" aria-hidden="true"></canvas>
        <h2>PLAYER ${i + 1}</h2>
        ${ROWS.map(
          (row) => `
          <div class="row" data-row="${row}">
            <span class="name">${ROW_LABELS[row]}</span>
            <button type="button" data-dir="-1" aria-label="Player ${i + 1} ${ROW_LABELS[row]} down">${ICON_PREV}</button>
            <output></output>
            <button type="button" data-dir="1" aria-label="Player ${i + 1} ${ROW_LABELS[row]} up">${ICON_NEXT}</button>
          </div>`,
        ).join('')}
        <p class="keys">${KEYMAPS[i].hint}</p>
      </div>`,
    )
    .join('');
  refreshMenu();
}

function refreshMenu() {
  settings.players.forEach((p, i) => {
    const slot = $(`.slot[data-slot="${i}"]`, slotsEl);
    slot.classList.toggle('off', !isOn(i));
    const values = { on: isOn(i) ? 'IN' : 'OUT', level: `LV ${p.level} · ${p.level * 4}`, speed: SPEEDS[p.speed].label };
    ROWS.forEach((row, r) => {
      const el = $(`[data-row="${row}"]`, slot);
      $('output', el).textContent = values[row];
      el.classList.toggle('focus', focusRow[i] === r);
    });
  });
  musicOut.textContent = TRACKS.find((t) => t.id === settings.music).label;
  $('#start').disabled = activeSlots().length === 0;
}

function adjust(i, row, dir) {
  const p = settings.players[i];
  if (row === 'on' && !isNarrow()) p.on = !p.on;
  if (row === 'level') p.level = Math.max(1, Math.min(MAX_LEVEL, p.level + dir));
  if (row === 'speed') p.speed = Math.max(0, Math.min(SPEEDS.length - 1, p.speed + dir));
  audio.sfx('move');
  saveSettings();
  refreshMenu();
}

function cycleMusic(dir) {
  const i = TRACKS.findIndex((t) => t.id === settings.music);
  settings.music = TRACKS[(i + dir + TRACKS.length) % TRACKS.length].id;
  audio.setTrack(settings.music);
  audio.startMusic(); // preview the choice
  saveSettings();
  refreshMenu();
}

slotsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const i = Number(btn.closest('.slot').dataset.slot);
  const row = btn.closest('.row').dataset.row;
  focusRow[i] = ROWS.indexOf(row);
  adjust(i, row, Number(btn.dataset.dir));
});
$('#music').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) cycleMusic(Number(btn.dataset.dir));
});
$('#start').addEventListener('click', () => startMatch());

function menuKey(e) {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (e.target.closest?.('button')) return; // let the focused button do its thing
    e.preventDefault();
    return startMatch();
  }
  if (e.code === 'KeyM') return cycleMusic(1);
  const hit = menuKeys.get(e.code);
  if (!hit) return;
  e.preventDefault();
  const i = hit.player;
  if (hit.action === 'turn') focusRow[i] = (focusRow[i] + ROWS.length - 1) % ROWS.length;
  else if (hit.action === 'down') focusRow[i] = (focusRow[i] + 1) % ROWS.length;
  else if (hit.action === 'left') return adjust(i, ROWS[focusRow[i]], -1);
  else if (hit.action === 'right') return adjust(i, ROWS[focusRow[i]], 1);
  refreshMenu();
}

// --- match ------------------------------------------------------------------

let mode = 'menu'; // 'menu' | 'countdown' | 'play' | 'paused' | 'over'
let countdown = 0; // ms left before a round starts
let players = []; // { slot, game, draw, held, das, wins }
let keyLookup = new Map();
let wins = [0, 0, 0, 0];

function startMatch() {
  const slots = activeSlots();
  if (slots.length === 0) return;
  wins = [0, 0, 0, 0];
  keyLookup = buildLookup(slots);
  panelsEl.innerHTML = slots
    .map(
      (i) => `
      <div class="panel" style="--pc:${PLAYER_COLORS[i][0]}">
        <canvas aria-label="Player ${i + 1}'s server"></canvas>
        <p class="keys">${KEYMAPS[i].hint}</p>
      </div>`,
    )
    .join('');
  arenaEl.style.setProperty('--n', slots.length);
  const canvases = panelsEl.querySelectorAll('canvas');
  players = slots.map((slot, n) => ({ slot, draw: createRenderer(canvases[n], slot), game: null }));
  menuEl.hidden = true;
  arenaEl.hidden = false;
  startRound();
  updateLayout();
}

function startRound() {
  const blockSeed = (Math.random() * 2 ** 32) >>> 0; // everyone gets the same blocks
  for (const p of players) {
    const s = settings.players[p.slot];
    p.game = new Game({ level: s.level, speed: s.speed, blockSeed, bugSeed: (Math.random() * 2 ** 32) >>> 0 });
    p.held = { left: false, right: false, down: false };
    p.das = { dir: 0, t: 0 };
  }
  overlayEl.hidden = true;
  mode = 'countdown';
  countdown = COUNTDOWN_MS;
  showCount(3);
  audio.setPaused(false);
  audio.stopMusic();
}

/** Show a number (or GO!) over the servers, or hide the countdown with null. */
function showCount(n) {
  countdownEl.hidden = n === null;
  if (n === null) return;
  countdownEl.innerHTML = pixelText(n === 0 ? 'GO!' : String(n));
  countdownEl.setAttribute('aria-label', n === 0 ? 'Go!' : String(n));
  audio.sfx(n === 0 ? 'go' : 'count');
}

/** What the countdown shows with `ms` left: 3, 2, 1, then 0 for GO!. */
const countAt = (ms) => Math.max(0, Math.ceil((ms - GO_MS) / 1000));

function tickCountdown(dt) {
  if (mode !== 'countdown') return;
  const before = countAt(countdown);
  countdown -= dt;
  if (countdown <= 0) {
    // the whole countdown, GO! included, is over: clear the screen and play
    countdown = 0;
    showCount(null);
    mode = 'play';
    audio.startMusic();
  } else if (countAt(countdown) !== before) {
    showCount(countAt(countdown));
  }
}

function endRound(winners) {
  mode = 'over';
  audio.stopMusic();
  let title;
  let detail = '';
  let again = 'Next round';
  if (players.length === 1) {
    const s = settings.players[players[0].slot];
    if (winners.length) {
      title = 'INCIDENT RESOLVED!';
      if (s.level < MAX_LEVEL) {
        s.level++;
        saveSettings();
        detail = `Next page: level ${s.level}, ${s.level * 4} bugs.`;
      } else {
        detail = 'That was the buggiest server there is. Legend.';
        again = 'Play again';
      }
    } else {
      title = 'SERVER CRASHED';
      detail = `${players[0].game.bugs} bugs survived. Escalate and try again.`;
      again = 'Try again';
    }
  } else if (winners.length) {
    for (const p of winners) wins[p.slot]++;
    title = `PLAYER ${winners.map((p) => p.slot + 1).join(' & ')} FIXED IT FIRST!`;
    detail = players.map((p) => `P${p.slot + 1}: ${wins[p.slot]}`).join('   ');
  } else {
    title = 'EVERY SERVER CRASHED';
    detail = 'Nobody sleeps tonight.';
    again = 'Try again';
  }
  if (winners.length) audio.sfx('win');
  showOverlay(title, detail, [[again, 'Enter', startRound], ['Settings', 'Esc', toMenu]]);
}

function checkRound() {
  const alive = players.filter((p) => !p.game.ended);
  const won = players.filter((p) => p.game.state === 'won');
  if (players.length === 1) {
    if (alive.length === 0) endRound(won);
  } else if (won.length) {
    for (const p of alive) p.game.forceEnd('out');
    endRound(won);
  } else if (alive.length === 1) {
    alive[0].game.forceEnd('won'); // last server standing
    endRound(alive);
  } else if (alive.length === 0) {
    endRound([]);
  }
}

function showOverlay(title, detail, actions) {
  $('h2', overlayEl).textContent = title;
  $('p', overlayEl).textContent = detail;
  const box = $('.actions', overlayEl);
  box.innerHTML = '';
  for (const [label, key, fn] of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `${label} <kbd>${key}</kbd>`;
    btn.addEventListener('click', fn);
    box.append(btn);
  }
  overlayEl.hidden = false;
}

function setPaused(paused) {
  if (!paused && tooNarrow()) return;
  mode = paused ? 'paused' : countdown > 0 ? 'countdown' : 'play';
  audio.setPaused(paused);
  countdownEl.hidden = paused || countdown <= 0;
  if (paused) showOverlay('PAUSED', 'Coffee break.', [['Resume', 'Esc', () => setPaused(false)], ['Settings', 'Backspace', toMenu]]);
  else overlayEl.hidden = true;
}

function toMenu() {
  mode = 'menu';
  countdown = 0;
  countdownEl.hidden = true;
  audio.setPaused(false);
  audio.stopMusic();
  overlayEl.hidden = true;
  arenaEl.hidden = true;
  menuEl.hidden = false;
  players = [];
  updateLayout();
}

// --- input --------------------------------------------------------------------

/** Apply one control to one player. Releases always go through, so nothing sticks across a pause. */
function act(p, action, down) {
  if (down && mode !== 'play') return;
  const { game, held, das } = p;
  switch (action) {
    case 'left':
    case 'right': {
      const dir = action === 'left' ? -1 : 1;
      held[action] = down;
      if (down) {
        game.move(dir);
        das.dir = dir;
        das.t = -DAS_DELAY;
      } else if (das.dir === dir) {
        // fall back to the opposite control if it is still held
        das.dir = held.left ? -1 : held.right ? 1 : 0;
        das.t = -DAS_DELAY;
      }
      break;
    }
    case 'down':
      held.down = down;
      break;
    case 'turn':
      if (down) game.rotate(-1);
      break;
  }
}

function playKey(e, down) {
  const hit = keyLookup.get(e.code);
  if (!hit) return;
  e.preventDefault();
  const p = players.find((pl) => pl.slot === hit.player);
  if (p?.game) act(p, hit.action, down);
}

// On-screen buttons (solo games only). Pointer events cover touch, pen and mouse,
// and each finger is tracked separately so you can hold "down" while tapping "left".
function padPress(e, down) {
  const btn = e.target.closest?.('button[data-action]');
  if (!btn || btn.classList.contains('held') === down) return;
  e.preventDefault();
  btn.classList.toggle('held', down);
  if (down) {
    btn.setPointerCapture?.(e.pointerId);
    audio.unlock();
  }
  if (players.length === 1 && players[0].game) act(players[0], btn.dataset.action, down);
}
padEl.addEventListener('pointerdown', (e) => padPress(e, true));
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  padEl.addEventListener(type, (e) => padPress(e, false));
}
padEl.addEventListener('contextmenu', (e) => e.preventDefault()); // no long-press menu

const layoutsEl = $('#layouts');
layoutsEl.innerHTML = PAD_LAYOUTS.map(
  (l, i) => `<button type="button" data-layout="${l.id}" aria-label="Layout ${i + 1}">${i + 1}</button>`,
).join('');
function showPadLayout() {
  document.body.dataset.pad = settings.pad;
  for (const btn of layoutsEl.children) btn.setAttribute('aria-pressed', btn.dataset.layout === settings.pad);
}
showPadLayout();
layoutsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-layout]');
  if (!btn) return;
  settings.pad = btn.dataset.layout;
  saveSettings();
  showPadLayout();
});
const muteBtn = $('#mute');
function showMuted() {
  muteBtn.setAttribute('aria-pressed', settings.muted);
}
showMuted();
muteBtn.addEventListener('click', () => {
  settings.muted = !settings.muted;
  audio.setMuted(settings.muted);
  saveSettings();
  showMuted();
});
$('#pause').addEventListener('click', () => {
  if (mode === 'play' || mode === 'countdown') setPaused(true);
});

/** A multi-player match cannot be shown on a narrow screen. */
const tooNarrow = () => players.length > 1 && isNarrow();

/** Re-apply everything that depends on screen width or touch. Runs at start and whenever they change. */
function updateLayout() {
  document.body.classList.toggle('narrow', isNarrow());
  document.body.classList.toggle('touch', wantsPad());
  const pad = wantsPad() && players.length === 1 && mode !== 'menu';
  padEl.hidden = !pad;
  document.body.classList.toggle('pad-on', pad);
  if (mode === 'menu') return refreshMenu();
  if (tooNarrow() && mode !== 'over') {
    mode = 'paused';
    audio.setPaused(true);
    showOverlay('TOO NARROW', 'Make the window wider to carry on.', [['Settings', 'Backspace', toMenu]]);
  } else if (mode === 'paused') {
    setPaused(true); // back to the ordinary pause screen
  }
}
narrowQuery.addEventListener('change', updateLayout);
coarseQuery.addEventListener('change', updateLayout);

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  audio.unlock();
  if (e.repeat) {
    if (mode !== 'menu' && keyLookup.has(e.code)) e.preventDefault();
    return;
  }
  if (mode === 'menu') return menuKey(e);
  if (e.code === 'Escape') {
    if (mode === 'play' || mode === 'countdown') setPaused(true);
    else if (mode === 'paused') setPaused(false);
    else toMenu();
    return;
  }
  if (mode === 'paused' && e.code === 'Backspace') return toMenu();
  if (mode === 'over' && e.code === 'Enter') {
    e.preventDefault();
    return startRound();
  }
  playKey(e, true);
});
window.addEventListener('keyup', (e) => {
  if (mode !== 'menu') playKey(e, false);
});
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('blur', () => {
  for (const p of players) if (p.held) p.held = { left: false, right: false, down: false };
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (mode === 'play' || mode === 'countdown')) setPaused(true);
});

// --- frame loop -----------------------------------------------------------------

const SFX = { move: 'move', rotate: 'rotate', throw: 'throw', lock: 'lock', clear: 'clear', lose: 'lose' };
let last = performance.now();
let clock = 0; // animation time; stands still while paused

function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;

  tickCountdown(dt);
  if (mode === 'play') {
    for (const p of players) {
      const { game, das, held } = p;
      if (das.dir) {
        das.t += dt;
        while (das.t >= DAS_REPEAT) {
          das.t -= DAS_REPEAT;
          game.move(das.dir);
        }
      }
      game.tick(dt, held.down);
      for (const ev of game.events) {
        // A held drop key must not carry over and slam the next block down: press again for each block.
        if (ev.type === 'throw') held.down = false;
        if (SFX[ev.type]) audio.sfx(SFX[ev.type], ev.chain);
      }
      game.events.length = 0;
    }
    checkRound();
  }

  if (mode !== 'paused') clock += dt;
  if (mode === 'menu') {
    slotsEl.querySelectorAll('.avatar').forEach((c, i) => drawAvatar(c, i, clock, isOn(i)));
  } else {
    const multi = players.length > 1;
    for (const p of players) p.draw(p.game, clock, { wins: multi ? wins[p.slot] : 0 });
  }
  requestAnimationFrame(frame);
}

buildMenu();
updateLayout();

// Deep link: ?autostart=2 jumps straight into a two-player match.
const auto = Number(new URLSearchParams(location.search).get('autostart'));
if (auto >= 1 && auto <= 4) {
  settings.players.forEach((p, i) => (p.on = i < auto));
  startMatch();
}

requestAnimationFrame(frame);

// Offline play and home-screen install. Service workers need https or localhost.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // not fatal: the game still works, just not offline
  });
}
