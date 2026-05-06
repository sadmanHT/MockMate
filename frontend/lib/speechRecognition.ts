export class MockMateSpeechRecognition {
  private recognition: any = null;
  private isSpeaking: boolean = false;
  private onTranscript: (interim: string, final: string) => void;
  private onErrorCallback: (error: string) => void;
  private onEndCallback: () => void;

  constructor(
    onTranscript: (interim: string, final: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    this.onTranscript = onTranscript;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isSpeaking = true;
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        this.onTranscript(interimTranscript, finalTranscript);
      };

      this.recognition.onerror = (event: any) => {
        this.onErrorCallback(event.error);
      };

      this.recognition.onend = () => {
        this.isSpeaking = false;
        this.onEndCallback();
      };
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start() {
    if (this.recognition && !this.isSpeaking) {
      try {
        this.recognition.start();
      } catch (e: any) {
        this.onErrorCallback(e.message);
      }
    }
  }

  public stop() {
    if (this.recognition && this.isSpeaking) {
      this.recognition.stop();
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
