export class MockMateSpeechRecognition {
  private recognition: any = null;
  private isSpeaking: boolean = false;
  private isIntentionallyStopped: boolean = false;
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
        this.isIntentionallyStopped = false;
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
        console.log("Speech recognition ended. isIntentionallyStopped:", this.isIntentionallyStopped);
        // If the browser stopped it but we didn't intentionally stop it, try continuously restarting it (anti-flicker for continuous speech)
        if (!this.isIntentionallyStopped) {
            setTimeout(() => {
                try {
                    if (!this.isIntentionallyStopped) {
                        console.log("Auto-restarting speech recognition...");
                        this.recognition.start();
                    }
                } catch (err) {
                    this.onEndCallback();
                }
            }, 250);
        } else {
            this.onEndCallback();
        }
      };
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start() {
    this.isIntentionallyStopped = false;
    if (this.recognition && !this.isSpeaking) {
      try {
        this.recognition.start();
      } catch (e: any) {
        this.onErrorCallback(e.message);
      }
    }
  }

  public stop() {
    this.isIntentionallyStopped = true;
    if (this.recognition && this.isSpeaking) {
      this.recognition.stop();
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
