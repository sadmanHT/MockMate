export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array | null = null;

  constructor() {
    // Initialized on user interaction to abide by browser autoplay policies
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!this.analyserNode) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.6;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    }
  }

  public async connectToAudioElement(element: HTMLAudioElement) {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext || !this.analyserNode) return;

      // Disconnect previous if any
      this.cleanupSource();

      this.sourceNode = this.audioContext.createMediaElementSource(element);
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    } catch (err) {
      console.warn("Audio element already connected or error occurred:", err);
    }
  }

  public async connectToMicrophone() {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext || !this.analyserNode) return;

      this.cleanupSource();

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyserNode);
      // Note: Do not connect microphone source to destination to avoid feedback loops!
    } catch (err) {
      console.error("Microphone access denied or error:", err);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode || !this.frequencyData) {
      return new Uint8Array(0);
    }
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  public getRMS(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = data[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    return rms;
  }

  private cleanupSource() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  public disconnect() {
    this.cleanupSource();
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export function calculateMouthOpenAmount(rms: number): number {
  // Map RMS (audio energy usually between 0.0 and 0.5) to a 0.0 - 1.0 mouth open amount.
  const noiseFloor = 0.05; // Ignore very low background noise
  const maxRms = 0.4;      // Max out the mouth opening fairly early
  
  if (rms < noiseFloor) return 0;
  
  let amount = (rms - noiseFloor) / (maxRms - noiseFloor);
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, amount));
}