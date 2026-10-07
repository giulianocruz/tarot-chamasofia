export type RitualSfx = "portal" | "step" | "shuffle" | "cut" | "select" | "reveal";

export type RitualAudioEngine = {
  context: AudioContext;
  master: GainNode;
  sources: AudioScheduledSourceNode[];
  timers: number[];
};

function createImpulse(context: AudioContext, seconds = 2.6, decay = 3.2) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const impulse = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

function createNoiseBuffer(context: AudioContext, seconds = 3) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.985 + white * 0.015;
    data[i] = previous;
  }
  return buffer;
}

function oneShotTone(
  engine: RitualAudioEngine,
  frequency: number,
  duration: number,
  gainValue: number,
  delay = 0,
  type: OscillatorType = "sine",
  destination?: AudioNode,
) {
  const { context } = engine;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  const end = start + duration;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + Math.min(0.04, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(destination ?? engine.master);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function noiseBurst(engine: RitualAudioEngine, duration: number, gainValue: number, cutoff = 2200) {
  const { context } = engine;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;
  source.buffer = createNoiseBuffer(context, Math.max(0.2, duration));
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(cutoff, now);
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(engine.master);
  source.start(now);
  source.stop(now + duration + 0.03);
}

export function createRitualAudio(AudioCtor: typeof AudioContext): RitualAudioEngine {
  const context = new AudioCtor();
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const reverb = context.createConvolver();
  const reverbGain = context.createGain();
  const dryGain = context.createGain();
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];

  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 2.2);
  compressor.threshold.value = -26;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.03;
  compressor.release.value = 0.7;
  dryGain.gain.value = 0.72;
  reverbGain.gain.value = 0.26;
  reverb.buffer = createImpulse(context);

  master.connect(compressor);
  compressor.connect(dryGain);
  compressor.connect(reverb);
  reverb.connect(reverbGain);
  dryGain.connect(context.destination);
  reverbGain.connect(context.destination);

  const droneFrequencies = [55, 82.41, 110, 164.81];
  droneFrequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    oscillator.type = index < 2 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index % 2 ? -5 : 4;
    filter.type = "lowpass";
    filter.frequency.value = index < 2 ? 520 : 900;
    gain.gain.value = index === 0 ? 0.028 : index === 1 ? 0.018 : 0.009;

    lfo.type = "sine";
    lfo.frequency.value = 0.045 + index * 0.013;
    lfoGain.gain.value = 0.0035;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscillator.start();
    lfo.start();
    sources.push(oscillator, lfo);
  });

  const air = context.createBufferSource();
  const airFilter = context.createBiquadFilter();
  const airGain = context.createGain();
  air.buffer = createNoiseBuffer(context, 4);
  air.loop = true;
  airFilter.type = "lowpass";
  airFilter.frequency.value = 780;
  airGain.gain.value = 0.035;
  air.connect(airFilter);
  airFilter.connect(airGain);
  airGain.connect(master);
  air.start();
  sources.push(air);

  const bellPattern = () => {
    if (context.state === "closed") return;
    const frequencies = [440, 659.25, 880];
    frequencies.forEach((frequency, index) => {
      oneShotTone({ context, master, sources, timers }, frequency, 1.8 + index * 0.22, 0.012 - index * 0.002, index * 0.22, "sine");
    });
  };
  bellPattern();
  timers.push(window.setInterval(bellPattern, 17000));

  return { context, master, sources, timers };
}

export async function resumeRitualAudio(engine: RitualAudioEngine) {
  if (engine.context.state === "suspended") {
    try {
      await engine.context.resume();
    } catch {}
  }
}

export function playRitualSfx(engine: RitualAudioEngine | null, type: RitualSfx) {
  if (!engine || engine.context.state === "closed") return;
  void resumeRitualAudio(engine);

  if (type === "shuffle") {
    noiseBurst(engine, 0.22, 0.055, 1600);
    window.setTimeout(() => noiseBurst(engine, 0.18, 0.045, 2100), 75);
    return;
  }
  if (type === "cut") {
    noiseBurst(engine, 0.12, 0.04, 1350);
    oneShotTone(engine, 246.94, 0.42, 0.022, 0.02, "triangle");
    return;
  }
  if (type === "select") {
    oneShotTone(engine, 523.25, 0.55, 0.026, 0, "sine");
    oneShotTone(engine, 783.99, 0.8, 0.016, 0.045, "sine");
    return;
  }
  if (type === "reveal") {
    [392, 523.25, 659.25, 987.77].forEach((frequency, index) => {
      oneShotTone(engine, frequency, 1.15 + index * 0.12, 0.024 - index * 0.002, index * 0.11, "sine");
    });
    return;
  }
  if (type === "portal") {
    [110, 164.81, 220, 329.63].forEach((frequency, index) => {
      oneShotTone(engine, frequency, 1.7, 0.018, index * 0.08, index < 2 ? "triangle" : "sine");
    });
    return;
  }
  oneShotTone(engine, 329.63, 0.28, 0.012, 0, "sine");
}

export function stopRitualAudio(engine: RitualAudioEngine) {
  if (engine.context.state === "closed") return;
  const now = engine.context.currentTime;
  engine.timers.forEach((timer) => window.clearInterval(timer));
  engine.master.gain.cancelScheduledValues(now);
  engine.master.gain.setTargetAtTime(0.0001, now, 0.18);
  window.setTimeout(() => {
    engine.sources.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    void engine.context.close();
  }, 900);
}
