// Oncall — screens, settings, input and the frame loop.

import { Game, SPEEDS, MAX_LEVEL } from './engine.js';
import { KEYMAPS, buildLookup } from './input.js';
import { createRenderer, drawAvatar, PLAYER_COLORS } from './render.js';
import { audio, TRACKS } from './audio.js';

const $ = (sel, el = document) => el.querySelector(sel);
const STORE_KEY = 'oncall-settings-v1';
const DAS_DELAY = 170; // ms a move key is held before it repeats
const DAS_REPEAT = 50;
const ROWS = ['on', 'level', 'speed'];
const ROW_LABELS = { on: 'PLAYER', level: 'BUGS', speed: 'SPEED' };

const menuEl = $('#menu');
const slotsEl = $('#slots');
const arenaEl = $('#arena');
const panelsEl = $('#panels');
const overlayEl = $('#overlay');
const musicOut = $('#music output');

// --- settings ---------------------------------------------------------------

function loadSettings() {
  const settings = {
    players: [0, 1, 2, 3].map((i) => ({ on: i === 0, level: 3, speed: 1 })),
    music: 'hotfix',
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

// --- settings screen ----------------------------------------------------------

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
            <button type="button" data-dir="-1" aria-label="Player ${i + 1} ${ROW_LABELS[row]} down">◀</button>
            <output></output>
            <button type="button" data-dir="1" aria-label="Player ${i + 1} ${ROW_LABELS[row]} up">▶</button>
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
    slot.classList.toggle('off', !p.on);
    const values = { on: p.on ? 'IN' : 'OUT', level: `LV ${p.level} · ${p.level * 4}`, speed: SPEEDS[p.speed].label };
    ROWS.forEach((row, r) => {
      const el = $(`[data-row="${row}"]`, slot);
      $('output', el).textContent = values[row];
      el.classList.toggle('focus', focusRow[i] === r);
    });
  });
  musicOut.textContent = TRACKS.find((t) => t.id === settings.music).label;
  $('#start').disabled = !settings.players.some((p) => p.on);
}

function adjust(i, row, dir) {
  const p = settings.players[i];
  if (row === 'on') p.on = !p.on;
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

let mode = 'menu'; // 'menu' | 'play' | 'paused' | 'over'
let players = []; // { slot, game, draw, held, das, wins }
let keyLookup = new Map();
let wins = [0, 0, 0, 0];

function startMatch() {
  const slots = settings.players.map((p, i) => (p.on ? i : -1)).filter((i) => i >= 0);
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
  mode = 'play';
  audio.setPaused(false);
  audio.startMusic();
}

function endRound(winners) {
  mode = 'over';
  audio.stopMusic();
  let title;
  let detail = '';
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
      }
    } else {
      title = 'SERVER CRASHED';
      detail = `${players[0].game.bugs} bugs survived. Escalate and try again.`;
    }
  } else if (winners.length) {
    for (const p of winners) wins[p.slot]++;
    title = `PLAYER ${winners.map((p) => p.slot + 1).join(' & ')} FIXED IT FIRST!`;
    detail = players.map((p) => `P${p.slot + 1}: ${wins[p.slot]}`).join('   ');
  } else {
    title = 'EVERY SERVER CRASHED';
    detail = 'Nobody sleeps tonight.';
  }
  if (winners.length) audio.sfx('win');
  showOverlay(title, detail, [['Next round', 'Enter', startRound], ['Settings', 'Esc', toMenu]]);
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
  mode = paused ? 'paused' : 'play';
  audio.setPaused(paused);
  if (paused) showOverlay('PAUSED', 'Coffee break.', [['Resume', 'Esc', () => setPaused(false)], ['Settings', 'Backspace', toMenu]]);
  else overlayEl.hidden = true;
}

function toMenu() {
  mode = 'menu';
  audio.setPaused(false);
  audio.stopMusic();
  overlayEl.hidden = true;
  arenaEl.hidden = true;
  menuEl.hidden = false;
  refreshMenu();
}

// --- input --------------------------------------------------------------------

function playKey(e, down) {
  const hit = keyLookup.get(e.code);
  if (!hit) return;
  e.preventDefault();
  if (mode !== 'play') return;
  const p = players.find((pl) => pl.slot === hit.player);
  const { game, held, das } = p;
  switch (hit.action) {
    case 'left':
    case 'right': {
      const dir = hit.action === 'left' ? -1 : 1;
      held[hit.action] = down;
      if (down) {
        game.move(dir);
        das.dir = dir;
        das.t = -DAS_DELAY;
      } else if (das.dir === dir) {
        // fall back to the opposite key if it is still held
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

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  audio.unlock();
  if (e.repeat) {
    if (mode !== 'menu' && keyLookup.has(e.code)) e.preventDefault();
    return;
  }
  if (mode === 'menu') return menuKey(e);
  if (e.code === 'Escape') {
    if (mode === 'play') setPaused(true);
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
  if (document.hidden && mode === 'play') setPaused(true);
});

// --- frame loop -----------------------------------------------------------------

const SFX = { move: 'move', rotate: 'rotate', throw: 'throw', lock: 'lock', clear: 'clear', lose: 'lose' };
let last = performance.now();
let clock = 0; // animation time; stands still while paused

function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;

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
    slotsEl.querySelectorAll('.avatar').forEach((c, i) => drawAvatar(c, i, clock, settings.players[i].on));
  } else {
    const multi = players.length > 1;
    for (const p of players) p.draw(p.game, clock, { wins: multi ? wins[p.slot] : 0 });
  }
  requestAnimationFrame(frame);
}

buildMenu();

// Deep link: ?autostart=2 jumps straight into a two-player match.
const auto = Number(new URLSearchParams(location.search).get('autostart'));
if (auto >= 1 && auto <= 4) {
  settings.players.forEach((p, i) => (p.on = i < auto));
  startMatch();
}

requestAnimationFrame(frame);
