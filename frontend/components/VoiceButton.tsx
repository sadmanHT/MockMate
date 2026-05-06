"use client";

import { Mic } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  interimTranscript?: string;
  finalTranscript?: string;
}

export default function VoiceButton({ 
  isListening, 
  isDisabled = false, 
  onClick,
  interimTranscript = "",
  finalTranscript = ""
}: VoiceButtonProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex justify-center items-center h-32 w-full">
        {isListening && (
          <>
            <div className="absolute w-24 h-24 bg-red-600 rounded-full animate-ping opacity-30"></div>
            <div className="absolute w-32 h-32 bg-red-600 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.2s' }}></div>
          </>
        )}
        
        <button
          onClick={onClick}
          disabled={isDisabled}
          className={`relative z-10 p-6 rounded-full transition-all duration-300 ${
            isListening 
              ? "bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.8)]" 
              : isDisabled 
                ? "bg-gray-700 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50"
          }`}
          title={isListening ? "Stop listening" : "Start speaking"}
        >
          <Mic 
            size={36} 
            className={`transition-colors ${isListening ? "text-white" : "text-gray-100"}`} 
            fill={isListening ? "white" : "none"}
          />
        </button>
      </div>

      <div className="w-full max-w-2xl mt-8 p-6 min-h-[8rem] bg-gray-900 border border-gray-700 rounded-xl text-left shadow-inner flex flex-col justify-center">
        {finalTranscript || interimTranscript || isListening ? (
          <p className="text-white text-lg leading-relaxed">
            {finalTranscript}
            <span className="text-gray-400 italic ml-1">{interimTranscript}</span>
            {isListening && !interimTranscript && (
              <span className="text-blue-400 animate-pulse ml-1 whitespace-pre"> ...</span>
            )}
          </p>
        ) : (
          <p className="text-gray-500 text-lg text-center italic">
            Click the microphone to start speaking...
          </p>
        )}
      </div>
    </div>
  );
}
