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

      {(interimTranscript || finalTranscript) && (
        <div className="w-full max-w-2xl mt-4 p-4 min-h-[6rem] bg-gray-900 border border-gray-700 rounded-xl text-center">
          <p className="text-white text-lg">
            {finalTranscript}
            <span className="text-gray-400 italic"> {interimTranscript}</span>
          </p>
        </div>
      )}
    </div>
  );
}
