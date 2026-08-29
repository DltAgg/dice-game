/**
 * Tiny Web Audio synth for match feedback. No binary assets.
 * Fails silently when AudioContext is blocked until a user gesture.
 */

let ctx: AudioContext | null = null;
let gestureHooked = false;

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

function getCtx(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (Ctor === null) return null;
  if (ctx === null) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

async function resumeCtx(audio: AudioContext): Promise<boolean> {
  try {
    if (audio.state !== "running") {
      await audio.resume();
    }
    return (audio.state as AudioContextState) === "running";
  } catch {
    return false;
  }
}

/** Install one-shot listeners so the first click/key can unlock audio. */
export function hookMatchSfxGestureUnlock(): void {
  if (gestureHooked || typeof window === "undefined") return;
  gestureHooked = true;
  const unlock = () => {
    const audio = getCtx();
    if (audio !== null) void resumeCtx(audio);
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

function tone(
  audio: AudioContext,
  opts: {
    readonly frequency: number;
    readonly duration: number;
    readonly type: OscillatorType;
    readonly gain: number;
    readonly when?: number;
    readonly slideTo?: number;
  },
): void {
  const start = opts.when ?? audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.frequency, start);
  if (opts.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.slideTo, 1), start + opts.duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.02);
}

function softNoiseBurst(audio: AudioContext, duration: number, gainLevel: number, when: number): void {
  const sampleRate = audio.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = audio.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / length;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 280;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(gainLevel, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  src.start(when);
  src.stop(when + duration + 0.02);
}

async function withRunningCtx(play: (audio: AudioContext) => void): Promise<void> {
  hookMatchSfxGestureUnlock();
  const audio = getCtx();
  if (audio === null) return;
  if (!(await resumeCtx(audio))) return;
  try {
    play(audio);
  } catch {
    // Audio must never interrupt play.
  }
}

/** Soft low thunk — end of turn / pass the table. */
export function playEndTurnSfx(): void {
  void withRunningCtx((audio) => {
    const t = audio.currentTime;
    softNoiseBurst(audio, 0.09, 0.045, t);
    tone(audio, {
      frequency: 140,
      slideTo: 70,
      duration: 0.14,
      type: "triangle",
      gain: 0.07,
      when: t,
    });
  });
}

/** Brighter alert — your seat gained reaction priority. */
export function playPrioritySfx(): void {
  void withRunningCtx((audio) => {
    const t = audio.currentTime;
    tone(audio, {
      frequency: 660,
      duration: 0.07,
      type: "sine",
      gain: 0.055,
      when: t,
    });
    tone(audio, {
      frequency: 990,
      duration: 0.1,
      type: "sine",
      gain: 0.05,
      when: t + 0.06,
    });
  });
}
