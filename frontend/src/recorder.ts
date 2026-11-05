export class WavRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private chunks: Float32Array[] = [];
  private timer = 0;
  private started = 0;

  async start(onSeconds: (seconds: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext();
    const source = this.context.createMediaStreamSource(this.stream);
    const processor = this.context.createScriptProcessor(4096, 1, 1);
    const silent = this.context.createGain();
    silent.gain.value = 0;
    this.chunks = [];
    processor.onaudioprocess = (event) => {
      this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(silent);
    silent.connect(this.context.destination);
    this.started = performance.now();
    this.timer = window.setInterval(() => {
      onSeconds(Math.floor((performance.now() - this.started) / 1000));
    }, 250);
  }

  async stop(): Promise<Blob> {
    window.clearInterval(this.timer);
    const sampleRate = this.context?.sampleRate ?? 48000;
    const merged = merge(this.chunks);
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.context?.close();
    this.context = null;
    this.stream = null;
    this.chunks = [];
    return encodeWav(merged, sampleRate);
  }
}

function merge(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const pcm = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const sourceIndex = Math.min(samples.length - 1, Math.floor(index * ratio));
    const value = Math.max(-1, Math.min(1, samples[sourceIndex] ?? 0));
    pcm[index] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  write(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(view, 8, "WAVE");
  write(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(view, 36, "data");
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (const sample of pcm) {
    view.setInt16(offset, sample, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function write(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
