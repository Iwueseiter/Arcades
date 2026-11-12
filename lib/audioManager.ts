export const SOUND_EVENTS = [
  'button-click',
  'token-tap',
  'pop-coin',
  'pop-jelly',
  'pop-bubble',
  'pop-candy',
  'golden-token',
  'rocket-booster',
  'bomb',
  'life-lost',
  'streak-threshold',
  'score-milestone',
  'level-up',
  'new-best',
  'round-over',
  'countdown',
  'go',
  'mission-complete',
  'rank-up',
  'shop-purchase',
  'equip-item',
  'friend-joined',
] as const;

export type SoundEventName = (typeof SOUND_EVENTS)[number];

// ------------------------------------------------------------------------------------------------
// Mixer: everything runs through master → compressor so stacked pops never clip.
// ------------------------------------------------------------------------------------------------

type Mixer = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  noise: AudioBuffer;
};

const state = {
  mixer: null as Mixer | null,
  muted: false,
  musicEnabled: true,
};

function getMixer(): Mixer | null {
  if (typeof window === 'undefined') return null;
  if (state.mixer) return state.mixer;

  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const ctx = new AudioCtor();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = state.muted ? 0 : 0.9;
  master.connect(compressor).connect(ctx.destination);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.9;
  sfx.connect(master);
  const music = ctx.createGain();
  music.gain.value = 0;
  music.connect(master);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  state.mixer = { ctx, master, sfx, music, noise };
  return state.mixer;
}

type ToneOptions = {
  frequency: number;
  endFrequency?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  at?: number;
  destination?: AudioNode;
  filter?: { type: BiquadFilterType; frequency: number; q?: number };
};

function tone(m: Mixer, opts: ToneOptions) {
  const { ctx } = m;
  const start = opts.at ?? ctx.currentTime;
  const duration = opts.duration ?? 0.15;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.frequency, start);
  if (opts.endFrequency) osc.frequency.exponentialRampToValueAtTime(opts.endFrequency, start + duration);
  const peak = opts.gain ?? 0.2;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + (opts.attack ?? 0.008));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let node: AudioNode = osc;
  if (opts.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter.type;
    filter.frequency.value = opts.filter.frequency;
    filter.Q.value = opts.filter.q ?? 1;
    node = node.connect(filter);
  }
  node.connect(gain).connect(opts.destination ?? m.sfx);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseHit(
  m: Mixer,
  opts: { duration: number; gain: number; filter: BiquadFilterType; frequency: number; endFrequency?: number; q?: number; at?: number; destination?: AudioNode },
) {
  const { ctx } = m;
  const start = opts.at ?? ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = m.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter;
  filter.frequency.setValueAtTime(opts.frequency, start);
  if (opts.endFrequency) filter.frequency.exponentialRampToValueAtTime(opts.endFrequency, start + opts.duration);
  filter.Q.value = opts.q ?? 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(opts.gain, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  source.connect(filter).connect(gain).connect(opts.destination ?? m.sfx);
  source.start(start, Math.random() * 0.5);
  source.stop(start + opts.duration + 0.05);
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** Plays a sound effect. `intensity` nudges pitch up as combos grow. */
export function playSound(eventName: SoundEventName, intensity = 1) {
  const m = getMixer();
  if (!m || state.muted) return;
  if (m.ctx.state === 'suspended') void m.ctx.resume();
  const t = m.ctx.currentTime;
  const lift = Math.min(intensity, 2.4);

  switch (eventName) {
    case 'button-click':
      tone(m, { frequency: 880, endFrequency: 1320, duration: 0.07, type: 'triangle', gain: 0.12 });
      break;
    case 'token-tap':
    case 'pop-coin': {
      // a bright two-note chime that climbs the scale as the streak grows
      const note = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.floor((lift - 0.8) * 4))];
      tone(m, { frequency: note * 2, duration: 0.22, type: 'triangle', gain: 0.16 });
      tone(m, { frequency: note * 3, duration: 0.18, type: 'sine', gain: 0.08, at: t + 0.04 });
      break;
    }
    case 'pop-bubble':
      tone(m, { frequency: 500 * lift, endFrequency: 1500 * lift, duration: 0.07, type: 'sine', gain: 0.22 });
      noiseHit(m, { duration: 0.03, gain: 0.12, filter: 'highpass', frequency: 4000 });
      break;
    case 'pop-jelly':
      tone(m, { frequency: 320 * lift, endFrequency: 120, duration: 0.16, type: 'sine', gain: 0.28 });
      noiseHit(m, { duration: 0.12, gain: 0.18, filter: 'lowpass', frequency: 1800, endFrequency: 300 });
      break;
    case 'pop-candy':
      tone(m, { frequency: 700 * lift, endFrequency: 1100 * lift, duration: 0.09, type: 'square', gain: 0.07, filter: { type: 'lowpass', frequency: 3000 } });
      tone(m, { frequency: 1400 * lift, duration: 0.12, type: 'triangle', gain: 0.1, at: t + 0.05 });
      break;
    case 'golden-token':
      [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => tone(m, { frequency: f, duration: 0.3, type: 'triangle', gain: 0.12, at: t + i * 0.045 }));
      noiseHit(m, { duration: 0.25, gain: 0.05, filter: 'highpass', frequency: 7000 });
      break;
    case 'rocket-booster':
      tone(m, { frequency: 200, endFrequency: 1200, duration: 0.35, type: 'sawtooth', gain: 0.08, filter: { type: 'lowpass', frequency: 2000 } });
      noiseHit(m, { duration: 0.4, gain: 0.1, filter: 'bandpass', frequency: 800, endFrequency: 4000, q: 2 });
      break;
    case 'bomb':
      tone(m, { frequency: 140, endFrequency: 35, duration: 0.5, type: 'sine', gain: 0.5 });
      noiseHit(m, { duration: 0.45, gain: 0.35, filter: 'lowpass', frequency: 2500, endFrequency: 120 });
      break;
    case 'life-lost':
      tone(m, { frequency: 440, endFrequency: 220, duration: 0.25, type: 'triangle', gain: 0.18 });
      tone(m, { frequency: 330, endFrequency: 150, duration: 0.3, type: 'triangle', gain: 0.12, at: t + 0.12 });
      break;
    case 'streak-threshold':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(m, { frequency: f, duration: 0.16, type: 'square', gain: 0.07, at: t + i * 0.06, filter: { type: 'lowpass', frequency: 3500 } }));
      break;
    case 'score-milestone':
    case 'mission-complete':
      [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(m, { frequency: f, duration: 0.25, type: 'triangle', gain: 0.13, at: t + i * 0.08 }));
      break;
    case 'level-up':
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51].forEach((f, i) =>
        tone(m, { frequency: f, duration: i === 6 ? 0.6 : 0.14, type: 'square', gain: 0.08, at: t + i * 0.09, filter: { type: 'lowpass', frequency: 4000 } }),
      );
      noiseHit(m, { duration: 0.8, gain: 0.06, filter: 'highpass', frequency: 6000, at: t + 0.54 });
      break;
    case 'new-best':
      [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => tone(m, { frequency: f, duration: 0.35, type: 'triangle', gain: 0.14, at: t + i * 0.11 }));
      break;
    case 'round-over':
      [523.25, 440, 349.23, 261.63].forEach((f, i) => tone(m, { frequency: f, duration: 0.3, type: 'triangle', gain: 0.13, at: t + i * 0.12 }));
      break;
    case 'countdown':
      tone(m, { frequency: 660, duration: 0.15, type: 'square', gain: 0.08, filter: { type: 'lowpass', frequency: 2500 } });
      break;
    case 'go':
      tone(m, { frequency: 1320, duration: 0.35, type: 'square', gain: 0.09, filter: { type: 'lowpass', frequency: 3500 } });
      break;
    case 'rank-up':
    case 'shop-purchase':
      tone(m, { frequency: 1046.5, duration: 0.15, type: 'triangle', gain: 0.13 });
      tone(m, { frequency: 1567.98, duration: 0.3, type: 'triangle', gain: 0.12, at: t + 0.08 });
      break;
    case 'equip-item':
    case 'friend-joined':
      tone(m, { frequency: 880, duration: 0.12, type: 'sine', gain: 0.12 });
      break;
  }
}

// ------------------------------------------------------------------------------------------------
// Music: an original, upbeat loop built from a small step sequencer. It adds layers as the
// intensity rises (1 = beat + bass, 2 + hats and chords, 3 + lead melody, 4 + arpeggios, faster).
// ------------------------------------------------------------------------------------------------

const STEPS = 16;
// I – vi – IV – V in C, as [bass root, chord tones]
const PROGRESSION: [number, number[]][] = [
  [130.81, [261.63, 329.63, 392.0]],
  [110.0, [220.0, 261.63, 329.63]],
  [87.31, [174.61, 220.0, 261.63]],
  [98.0, [196.0, 246.94, 293.66]],
];
// Melody as scale-degree offsets into each chord (null = rest), one bar of 16 steps.
const MELODY: (number | null)[] = [2, null, 1, null, 0, null, 1, 2, null, 2, 1, null, 0, null, null, 1];
const KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const HAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1];

const music = {
  timer: null as ReturnType<typeof setInterval> | null,
  step: 0,
  bar: 0,
  nextTime: 0,
  intensity: 1,
};

function scheduleStep(m: Mixer, step: number, bar: number, at: number) {
  const out = m.music;
  const [root, chord] = PROGRESSION[bar % PROGRESSION.length];
  const level = music.intensity;
  const sixteenth = 60 / tempo() / 4;

  if (KICK[step]) {
    tone(m, { frequency: 150, endFrequency: 45, duration: 0.18, type: 'sine', gain: 0.55, at, destination: out, attack: 0.002 });
  }
  if (SNARE[step]) noiseHit(m, { duration: 0.14, gain: 0.22, filter: 'bandpass', frequency: 1800, q: 0.8, at, destination: out });
  if (level >= 2 && HAT[step]) noiseHit(m, { duration: 0.04, gain: 0.1, filter: 'highpass', frequency: 8000, at, destination: out });

  // bass: driving eighths with an octave hop
  if (step % 2 === 0) {
    const f = step % 8 === 6 ? root * 2 : root;
    tone(m, { frequency: f, duration: sixteenth * 1.8, type: 'triangle', gain: 0.28, at, destination: out, filter: { type: 'lowpass', frequency: 900 } });
  }
  // chord stabs on the off-beats
  if (level >= 2 && (step === 2 || step === 6 || step === 10 || step === 14)) {
    chord.forEach((f) => tone(m, { frequency: f, duration: sixteenth * 1.5, type: 'sawtooth', gain: 0.035, at, destination: out, filter: { type: 'lowpass', frequency: 2200 } }));
  }
  if (level >= 3) {
    const degree = MELODY[(step + bar * 3) % STEPS];
    if (degree !== null) {
      tone(m, { frequency: chord[degree] * 2, duration: sixteenth * 1.6, type: 'square', gain: 0.045, at, destination: out, filter: { type: 'lowpass', frequency: 3200 } });
    }
  }
  if (level >= 4) {
    tone(m, { frequency: chord[step % 3] * 4, duration: sixteenth * 0.8, type: 'triangle', gain: 0.03, at, destination: out });
  }
}

function tempo() {
  return 116 + (music.intensity - 1) * 8;
}

export function startMusic() {
  const m = getMixer();
  if (!m || music.timer) return;
  if (m.ctx.state === 'suspended') void m.ctx.resume();
  music.step = 0;
  music.bar = 0;
  music.nextTime = m.ctx.currentTime + 0.08;
  m.music.gain.cancelScheduledValues(m.ctx.currentTime);
  m.music.gain.setTargetAtTime(state.musicEnabled ? 0.55 : 0, m.ctx.currentTime, 0.15);
  music.timer = setInterval(() => {
    while (music.nextTime < m.ctx.currentTime + 0.12) {
      scheduleStep(m, music.step, music.bar, music.nextTime);
      music.nextTime += 60 / tempo() / 4;
      music.step = (music.step + 1) % STEPS;
      if (music.step === 0) music.bar += 1;
    }
  }, 25);
}

export function stopMusic() {
  const m = state.mixer;
  if (!m || !music.timer) return;
  clearInterval(music.timer);
  music.timer = null;
  m.music.gain.setTargetAtTime(0, m.ctx.currentTime, 0.08);
}

/** 1–4: how many layers the soundtrack plays, and how fast. */
export function setMusicIntensity(level: number) {
  music.intensity = Math.max(1, Math.min(4, Math.round(level)));
}

export function setMusicEnabled(enabled: boolean) {
  state.musicEnabled = enabled;
  const m = state.mixer;
  if (m) m.music.gain.setTargetAtTime(enabled && music.timer ? 0.55 : 0, m.ctx.currentTime, 0.1);
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlockAudio() {
  const m = getMixer();
  if (m && m.ctx.state === 'suspended') void m.ctx.resume();
}

export function toggleAudioMute(muted: boolean) {
  state.muted = muted;
  const m = state.mixer;
  if (m) m.master.gain.setTargetAtTime(muted ? 0 : 0.9, m.ctx.currentTime, 0.05);
}

export function getAudioState() {
  return { muted: state.muted, musicEnabled: state.musicEnabled };
}
