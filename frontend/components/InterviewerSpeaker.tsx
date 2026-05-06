"use client";

import { useEffect, useState, useRef } from "react";
import { MockMateTTS } from "@/lib/textToSpeech";
import { Volume2, Play, Square } from "lucide-react";

interface InterviewerSpeakerProps {
  text: string;
  autoSpeak: boolean;
  preferredVoiceURI?: string;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
}

export default function InterviewerSpeaker({
  text,
  autoSpeak,
  preferredVoiceURI,
  onSpeakingStart,
  onSpeakingEnd
}: InterviewerSpeakerProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsRef = useRef<MockMateTTS | null>(null);

  useEffect(() => {
    ttsRef.current = new MockMateTTS(
      () => {
        setIsSpeaking(true);
        if (onSpeakingStart) onSpeakingStart();
      },
      () => {
        setIsSpeaking(false);
        if (onSpeakingEnd) onSpeakingEnd();
      }
    );

    return () => {
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (autoSpeak && text && ttsRef.current) {
      // Need a slight delay to ensure voices are loaded on initial render
      const timeout = setTimeout(() => {
         ttsRef.current?.speak(text, preferredVoiceURI);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [text, autoSpeak, preferredVoiceURI]);

  const handlePlay = () => {
    if (ttsRef.current && text) {
      ttsRef.current.speak(text, preferredVoiceURI);
    }
  };

  const handleStop = () => {
    if (ttsRef.current) {
      ttsRef.current.stop();
    }
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      {isSpeaking ? (
        <div className="flex items-center gap-2 bg-blue-900/40 text-blue-400 px-3 py-1.5 rounded-full border border-blue-800/50">
          <Volume2 size={16} className="animate-pulse" />
          <span className="text-sm font-medium">Interviewer speaking...</span>
          <button 
            onClick={handleStop}
            className="ml-2 hover:text-red-400 transition"
            title="Stop speaking"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      ) : (
        <button
          onClick={handlePlay}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-700 transition"
          title="Replay"
        >
          <Play size={14} fill="currentColor" />
          <span className="text-sm">Replay Audio</span>
        </button>
      )}
    </div>
  );
}
