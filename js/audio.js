// Original chiptune music and sound effects, synthesised live with the Web Audio API.
// Two square-ish voices (lead + arpeggio), a triangle bass and a noise drum channel.

export const TRACKS = [
  { id: 'hotfix', label: 'HOTFIX' },
  { id: 'standup', label: 'STAND-UP' },
  { id: 'backlog', label: 'BACKLOG' },
  { id: 'off', label: 'OFF' },
];

const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORDS = {
  C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], F: ['F', 'A', 'C'], E: ['E', 'G#', 'B'],
  Am: ['A', 'C', 'E'], Em: ['E', 'G', 'B'], Dm: ['D', 'F', 'A'],
  Gm: ['G', 'Bb', 'D'], Bb: ['Bb', 'D', 'F'], A: ['A', 'C#', 'E'],
};

export function noteFreq(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`Bad note: ${name}`);
  const midi = 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// Each bar is [chord, lead]. The lead is sixteen steps: a note, '-' to hold it, '.' to rest.
// Bass, arpeggio and drums are generated from the chord and the song's style.
export const SONGS = {
  hotfix: {
    bpm: 150,
    drums: 'k.h.s.h.k.hks.h.',
    bass: [0, 1, 0, 1, 0, 1, 0, 1], // eighth notes: root, octave up, ...
    arp: { every: 1, order: [0, 1, 2, 1], len: 1 },
    bars: [
      ['Am', 'A4 . E5 . D5 C5 . A4 . C5 . E5 - . D5 C5'],
      ['Am', 'B4 . C5 . A4 - . E4 . A4 . C5 B4 A4 G4 .'],
      ['F', 'F4 . A4 . C5 . F5 - E5 . C5 . A4 . C5 .'],
      ['G', 'G4 . B4 . D5 . G5 - F5 E5 D5 . B4 . D5 .'],
      ['Am', 'A4 . E5 . D5 C5 . A4 . C5 . E5 - . D5 C5'],
      ['Am', 'E5 . E5 D5 C5 . A4 . C5 . D5 . E5 - A5 -'],
      ['F', 'A5 - G5 F5 . C5 . F5 . E5 . C5 A4 - . .'],
      ['E', 'G#4 . B4 . E5 . G#5 . B5 - - . E5 D5 B4 .'],
      ['C', 'C5 - E5 . G5 - E5 . C5 . E5 G5 C6 - . .'],
      ['G', 'B5 - G5 . D5 - G5 . B4 . D5 G5 B5 - . .'],
      ['Am', 'A5 - E5 . C5 - E5 . A4 . C5 E5 A5 . G5 .'],
      ['Em', 'G5 - E5 . B4 - E5 . G5 F#5 E5 . B4 - . .'],
      ['F', 'A4 C5 F5 . A4 C5 F5 . E5 - C5 . A4 - C5 .'],
      ['C', 'G4 C5 E5 . G4 C5 E5 . D5 - C5 . G4 - C5 .'],
      ['Dm', 'F4 A4 D5 . F4 A4 D5 . F5 - E5 . D5 - A4 .'],
      ['E', 'E5 . G#5 . B5 . G#5 . E5 D5 B4 G#4 E4 - . .'],
    ],
  },
  standup: {
    bpm: 104,
    drums: 'k...h...s...h.k.',
    bass: [0, null, null, 0, 1, null, 0, null],
    arp: { every: 2, order: [0, 2, 1, 2], len: 2 },
    bars: [
      ['C', 'E5 - - G5 - - E5 - C5 - - - . . D5 -'],
      ['Am', 'E5 - - C5 - - A4 - - - . . A4 - B4 -'],
      ['F', 'C5 - - A4 - - F4 - A4 - C5 - F5 - - -'],
      ['G', 'D5 - - B4 - - G4 - B4 - D5 - . . G4 -'],
      ['C', 'G5 - - E5 - - C5 - E5 - - - . . G5 -'],
      ['Em', 'G5 - - E5 - - B4 - - - . . E5 - F#5 -'],
      ['F', 'A5 - - F5 - - C5 - F5 - A5 - G5 - F5 -'],
      ['G', 'D5 - - G5 - - B4 - D5 - - - . . . .'],
    ],
  },
  // Backlog: D minor, a syncopated bass and a restless lead, for a queue that never empties.
  backlog: {
    bpm: 128,
    drums: 'k..hs..hk.khs.h.',
    bass: [0, 0, null, 0, 0, null, 1, 0],
    arp: { every: 2, order: [0, 1, 2, 1], len: 1 },
    bars: [
      ['Dm', 'D5 - . A4 . D5 . F5 - . E5 . D5 . A4 .'],
      ['Dm', 'D5 - . A4 . D5 . F5 - . G5 . F5 E5 D5 .'],
      ['Bb', 'D5 - . Bb4 . D5 . F5 - . E5 . D5 . Bb4 .'],
      ['C', 'E5 - . C5 . E5 . G5 - . F5 . E5 D5 C5 .'],
      ['Dm', 'A5 - - . F5 . D5 . A5 - - . G5 . F5 .'],
      ['Gm', 'G5 - - . D5 . Bb4 . G5 - - . F5 . D5 .'],
      ['Bb', 'F5 - - . D5 . Bb4 . D5 . F5 . Bb5 - A5 -'],
      ['A', 'A5 - G5 . E5 - C#5 . A4 . C#5 . E5 - - .'],
    ],
  },
};

/** Flatten a song into a list of steps, each a list of { voice, freq?, len } events. */
export function compileSong(song) {
  const steps = [];
  for (const [chordName, lead] of song.bars) {
    const chord = CHORDS[chordName];
    const tokens = lead.split(' ');
    if (!chord || tokens.length !== 16) throw new Error(`Bad bar: ${chordName} | ${lead}`);
    for (let i = 0; i < 16; i++) {
      const events = [];
      const tok = tokens[i];
      if (tok !== '.' && tok !== '-') {
        let len = 1;
        while (tokens[i + len] === '-') len++;
        events.push({ voice: 'lead', freq: noteFreq(tok), len });
      }
      if (i % 2 === 0) {
        const b = song.bass[i / 2];
        if (b !== null) events.push({ voice: 'bass', freq: noteFreq(chord[0] + (2 + b)), len: 2 });
      }
      if (i % song.arp.every === 0) {
        const tone = chord[song.arp.order[(i / song.arp.every) % song.arp.order.length]];
        events.push({ voice: 'arp', freq: noteFreq(tone + 4), len: song.arp.len });
      }
      const d = song.drums[i];
      if (d !== '.') events.push({ voice: d, len: 1 });
      steps.push(events);
    }
  }
  return steps;
}

class ChipAudio {
  constructor() {
    this.ctx = null;
    this.track = 'hotfix';
    this.wantMusic = false;
    this.timer = null;
    this.bus = null;
  }

  /** Must be called from a key press or click: browsers only allow audio after a user gesture. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
        const n = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, n, n);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
    } catch {
      this.ctx = null; // no audio available; the game plays silently
    }
    if (this.wantMusic && !this.timer) this.startMusic();
  }

  setTrack(id) {
    this.track = id;
    if (this.wantMusic) this.startMusic();
  }

  /** Silences everything (effects and music) without stopping anything. */
  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    if (paused) this.ctx.suspend();
    else this.ctx.resume();
  }

  startMusic() {
    this.haltMusic();
    this.wantMusic = true;
    const song = SONGS[this.track];
    if (!this.ctx || !song) return;
    this.steps = compileSong(song);
    this.stepDur = 60 / song.bpm / 4;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.55;
    this.bus.connect(this.master);
    this.timer = setInterval(() => this.pump(), 25);
  }

  stopMusic() {
    this.wantMusic = false;
    this.haltMusic();
  }

  haltMusic() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.bus) {
      const bus = this.bus;
      bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      setTimeout(() => bus.disconnect(), 400);
      this.bus = null;
    }
  }

  /** Schedule any steps that start in the next 120 ms. */
  pump() {
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      for (const ev of this.steps[this.step]) this.playEvent(ev, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % this.steps.length;
    }
  }

  playEvent(ev, t) {
    const dur = ev.len * this.stepDur;
    switch (ev.voice) {
      case 'lead': return this.tone('square', ev.freq, t, dur * 0.9, 0.16, this.bus);
      case 'arp': return this.tone('square', ev.freq, t, dur * 0.6, 0.05, this.bus);
      case 'bass': return this.tone('triangle', ev.freq, t, dur * 0.9, 0.4, this.bus);
      case 'k': return this.tone('triangle', 150, t, 0.11, 0.6, this.bus, 40);
      case 's': return this.hiss(t, 0.11, 0.22, 1800, this.bus);
      case 'h': return this.hiss(t, 0.03, 0.1, 7000, this.bus);
    }
  }

  tone(type, freq, t, dur, vol, dest, slideTo) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.setValueAtTime(vol, t + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  hiss(t, dur, vol, cutoff, dest) {
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }

  sfx(name, chain = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const out = this.master;
    const seq = (type, notes, step, vol) =>
      notes.forEach((n, i) => this.tone(type, noteFreq(n), t + i * step, step * 1.1, vol, out));
    switch (name) {
      case 'move': return this.tone('square', 260, t, 0.03, 0.06, out);
      case 'rotate': return this.tone('square', 390, t, 0.05, 0.07, out, 520);
      case 'throw': return this.tone('triangle', 300, t, 0.12, 0.2, out, 900);
      case 'lock': return this.tone('triangle', 130, t, 0.07, 0.35, out, 70);
      case 'clear': {
        const up = 2 ** ((Math.min(chain, 6) - 1) * 2 / 12); // each chain link rings a tone higher
        return [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone('square', f * up, t + i * 0.05, 0.07, 0.12, out));
      }
      case 'count': return this.tone('square', 440, t, 0.12, 0.14, out);
      case 'go': return this.tone('square', 880, t, 0.3, 0.16, out);
      case 'win': return seq('square', ['C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 0.11, 0.16);
      case 'record': return seq('square', ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'], 0.09, 0.16);
      case 'lose': return seq('sawtooth', ['A4', 'F4', 'D4', 'A3', 'F3'], 0.14, 0.13);
    }
  }
}

export const audio = new ChipAudio();
