export const SOUND_EVENTS = [
  'button-click',
  'token-tap',
  'golden-token',
  'rocket-booster',
  'bomb',
  'life-lost',
  'streak-threshold',
  'score-milestone',
  'new-best',
  'round-over',
  'rank-up',
  'shop-purchase',
  'equip-item',
  'friend-joined',
] as const;

export type SoundEventName = (typeof SOUND_EVENTS)[number];

const audioState = {
  context: null as AudioContext | null,
  muted: false,
  musicEnabled: true,
};

function ensureAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioState.context) {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    audioState.context = new AudioCtor();
  }

  return audioState.context;
}

function playTone({
  frequency,
  duration = 0.12,
  type = 'sine',
  gainValue = 0.06,
  rampTo = 0.0001,
  startAt = 0,
}: {
  frequency: number;
  duration?: number;
  type?: OscillatorType;
  gainValue?: number;
  rampTo?: number;
  startAt?: number;
}) {
  const ctx = ensureAudioContext();
  if (!ctx || audioState.muted) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startAt);

  const now = ctx.currentTime + startAt;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(rampTo, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

export function playSound(eventName: SoundEventName, intensity = 1) {
  const ctx = ensureAudioContext();
  if (!ctx || audioState.muted) return;

  switch (eventName) {
    case 'button-click':
      playTone({ frequency: 660 * intensity, duration: 0.08, type: 'triangle', gainValue: 0.04 });
      playTone({ frequency: 820 * intensity, duration: 0.14, type: 'sine', gainValue: 0.025, startAt: 0.04 });
      break;
    case 'token-tap':
      playTone({ frequency: 430 + intensity * 70, duration: 0.11, type: 'square', gainValue: 0.05 });
      break;
    case 'golden-token':
      playTone({ frequency: 740, duration: 0.12, type: 'triangle', gainValue: 0.05 });
      playTone({ frequency: 890, duration: 0.14, type: 'triangle', gainValue: 0.04, startAt: 0.07 });
      break;
    case 'rocket-booster':
      playTone({ frequency: 240, duration: 0.18, type: 'sawtooth', gainValue: 0.055 });
      playTone({ frequency: 120, duration: 0.24, type: 'triangle', gainValue: 0.028, startAt: 0.08 });
      break;
    case 'bomb':
      playTone({ frequency: 120, duration: 0.2, type: 'sawtooth', gainValue: 0.08 });
      break;
    case 'life-lost':
      playTone({ frequency: 210, duration: 0.16, type: 'triangle', gainValue: 0.05 });
      playTone({ frequency: 150, duration: 0.25, type: 'sine', gainValue: 0.035, startAt: 0.12 });
      break;
    case 'streak-threshold':
      playTone({ frequency: 540, duration: 0.12, type: 'triangle', gainValue: 0.06 });
      playTone({ frequency: 760, duration: 0.13, type: 'triangle', gainValue: 0.05, startAt: 0.08 });
      break;
    case 'score-milestone':
      playTone({ frequency: 520, duration: 0.18, type: 'triangle', gainValue: 0.06 });
      playTone({ frequency: 680, duration: 0.18, type: 'triangle', gainValue: 0.06, startAt: 0.08 });
      playTone({ frequency: 900, duration: 0.22, type: 'triangle', gainValue: 0.06, startAt: 0.16 });
      break;
    case 'new-best':
      playTone({ frequency: 620, duration: 0.18, type: 'triangle', gainValue: 0.06 });
      playTone({ frequency: 880, duration: 0.22, type: 'triangle', gainValue: 0.06, startAt: 0.14 });
      break;
    case 'round-over':
      playTone({ frequency: 220, duration: 0.18, type: 'sine', gainValue: 0.04 });
      break;
    case 'rank-up':
      playTone({ frequency: 460, duration: 0.12, type: 'square', gainValue: 0.05 });
      playTone({ frequency: 620, duration: 0.12, type: 'square', gainValue: 0.05, startAt: 0.09 });
      break;
    case 'shop-purchase':
      playTone({ frequency: 860, duration: 0.15, type: 'triangle', gainValue: 0.05 });
      playTone({ frequency: 1100, duration: 0.18, type: 'triangle', gainValue: 0.04, startAt: 0.08 });
      break;
    case 'equip-item':
      playTone({ frequency: 620, duration: 0.09, type: 'sine', gainValue: 0.04 });
      break;
    case 'friend-joined':
      playTone({ frequency: 680, duration: 0.12, type: 'triangle', gainValue: 0.05 });
      playTone({ frequency: 880, duration: 0.16, type: 'triangle', gainValue: 0.05, startAt: 0.08 });
      break;
    default:
      break;
  }
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlockAudio() {
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function toggleAudioMute(muted: boolean) {
  audioState.muted = muted;
}

export function getAudioState() {
  return { muted: audioState.muted, musicEnabled: audioState.musicEnabled };
}
