export class MockMateTTS {
  private synth: SpeechSynthesis;
  private onStartCallback: () => void;
  private onEndCallback: () => void;
  private voicesLoadedPromise: Promise<void> | null = null;
  private resolveVoicesLoaded: (() => void) | null = null;

  constructor(onStart: () => void, onEnd: () => void) {
    this.synth = window.speechSynthesis;
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;

    // Handle asynchronous voice loading in Chrome
    this.voicesLoadedPromise = new Promise((resolve) => {
      this.resolveVoicesLoaded = resolve;
      
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        resolve();
      }
    });

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        if (this.resolveVoicesLoaded) {
          this.resolveVoicesLoaded();
          this.resolveVoicesLoaded = null; // resolve only once
        }
      };
    }
  }

  public isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  public async waitForVoices(): Promise<void> {
    if (this.voicesLoadedPromise) {
      await this.voicesLoadedPromise;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  public stop() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }

  public async speak(text: string, preferredVoiceURI?: string) {
    if (!this.isSupported()) return;

    this.stop(); // Cancel any ongoing speech

    await this.waitForVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.getVoices();

    if (voices.length > 0) {
      let voiceToUse = null;

      if (preferredVoiceURI) {
        voiceToUse = voices.find(v => v.voiceURI === preferredVoiceURI);
      }
      
      if (!voiceToUse) {
         // Prefer English female
        voiceToUse = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'))
        );
      }

      if (!voiceToUse) {
        voiceToUse = voices.find(v => v.lang.startsWith('en'));
      }

      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }
    }

    utterance.onstart = () => {
      this.onStartCallback();
    };

    utterance.onend = () => {
      this.onEndCallback();
    };

    utterance.onerror = (e) => {
      console.error("TTS Error", e);
      this.onEndCallback();
    };

    this.synth.speak(utterance);
  }
}
