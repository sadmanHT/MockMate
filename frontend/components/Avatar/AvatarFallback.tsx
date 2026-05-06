import React from 'react';

interface AvatarFallbackProps {
  mouthOpen: boolean;
  thinking?: boolean;
}

export default function AvatarFallback({ mouthOpen, thinking }: AvatarFallbackProps) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-800 overflow-hidden shadow-inner">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes blink {
          0%, 9%, 11%, 100% { transform: scaleY(1); }
          10% { transform: scaleY(0.1); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(2px); }
        }
        .animate-blink { animation: blink 4s infinite; }
        .animate-bob { animation: bob 3s ease-in-out infinite; }
      `}} />
      
      {/* 200x200 viewbox SVG */}
      <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] max-h-[200px] animate-bob">
        {/* Head */}
        <circle cx="100" cy="100" r="80" fill="#f5d0c5" stroke="#e0afa0" strokeWidth="3" />
        
        {/* Eyes (Blinking + Optional Look Up) */}
        <g className={`animate-blink ${thinking ? 'transform -translate-y-2 transition-transform duration-300' : 'transition-transform duration-300'}`}>
          <circle cx="70" cy="85" r="7" fill="#333" />
          <circle cx="130" cy="85" r="7" fill="#333" />
        </g>

        {/* Eyebrows */}
        <g className={thinking ? 'transform -translate-y-3 transition-transform duration-300' : 'transition-transform duration-300'}>
          <path d="M 55 70 Q 70 65 85 70" fill="none" stroke="#6b4c41" strokeWidth="4" strokeLinecap="round" />
          <path d="M 115 70 Q 130 65 145 70" fill="none" stroke="#6b4c41" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Nose */}
        <path d="M 100 90 L 95 110 L 105 110 Z" fill="#e0afa0" opacity="0.7" />

        {/* Mouth */}
        {mouthOpen ? (
          <path d="M 85 130 Q 100 155 115 130 Z" fill="#333" />
        ) : (
          <path d="M 85 135 Q 100 142 115 135" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>

      {/* Thinking Indicator */}
      {thinking && (
        <div className="absolute bottom-6 flex gap-1 items-center">
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
        </div>
      )}
    </div>
  );
}