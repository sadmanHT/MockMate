"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import AvatarFallback from './AvatarFallback';
import { AudioAnalyzer, calculateMouthOpenAmount } from './AudioAnalyzer';

interface InterviewerAvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  audioElement: HTMLAudioElement | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function InterviewerAvatar({ 
  isSpeaking, 
  isThinking, 
  audioElement, 
  size = 'md' 
}: InterviewerAvatarProps) {
  const [hasRiveError, setHasRiveError] = useState(false);
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0); // For fallback and state
  
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const animationFrameRef = useRef<number>();

  // Rive setup
  const { RiveComponent, rive } = useRive({
    src: '/avatar/avatar.riv',
    stateMachines: 'State Machine 1', // Common default state machine name
    autoplay: true,
    onLoadError: () => setHasRiveError(true),
  });

  const mouthInput = useStateMachineInput(rive, 'State Machine 1', 'mouthOpen', 0);

  useEffect(() => {
    // Initialize analyzer
    if (!audioAnalyzerRef.current) {
      audioAnalyzerRef.current = new AudioAnalyzer();
    }

    if (isSpeaking && audioElement) {
      audioAnalyzerRef.current.connectToAudioElement(audioElement);
    }

    const startAnimationLoop = () => {
      if (audioAnalyzerRef.current && isSpeaking) {
        const rms = audioAnalyzerRef.current.getRMS();
        const amount = calculateMouthOpenAmount(rms);
        
        // Pass value 0-100 to Rive if it expects a percentage 
        if (mouthInput) {
          mouthInput.value = amount * 100;
        }
        
        setMouthOpenAmount(amount);
      } else {
        if (mouthInput) mouthInput.value = 0;
        setMouthOpenAmount(0);
      }
      
      animationFrameRef.current = requestAnimationFrame(startAnimationLoop);
    };

    animationFrameRef.current = requestAnimationFrame(startAnimationLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isSpeaking, audioElement, mouthInput]);

  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl mb-6 w-full max-w-sm mx-auto overflow-hidden">
      
      {/* Avatar Container */}
      <div className={`relative ${sizeClasses} mb-5 flex-shrink-0`}>
        {hasRiveError ? (
          <AvatarFallback 
            mouthOpen={mouthOpenAmount > 0.1 || (isSpeaking && !audioElement)} 
            thinking={isThinking} 
          />
        ) : (
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-700 shadow-inner">
            <RiveComponent className="w-full h-full" />
          </div>
        )}
      </div>
      
      {/* Nameplate & Status Indicator */}
      <div className="flex flex-col items-center w-full">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-1">Alex</h3>
        <p className="text-xs text-gray-500 mb-3">MockMate Interviewer</p>
        
        <div className="flex items-center justify-center py-1.5 px-4 rounded-full bg-gray-900 border border-gray-700 min-w-28 transition-all">
          {isSpeaking ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span> 
              <span className="text-green-400 text-xs font-bold tracking-widest">LIVE</span>
            </>
          ) : isThinking ? (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span> 
              <span className="text-yellow-400 text-xs font-bold tracking-widest">THINKING</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-500 mr-2"></span> 
              <span className="text-gray-500 text-xs font-bold tracking-widest">READY</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}