"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
}

export default function AudioVisualizer({ isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      startVisualizer();
    } else {
      stopVisualizer();
    }

    return () => {
      stopVisualizer();
    };
  }, [isActive]);

  const startVisualizer = async () => {
    try {
      if (!canvasRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      draw();
    } catch (err) {
      console.error("Failed to initialize audio visualizer:", err);
    }
  };

  const stopVisualizer = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    // Clear canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;

      // Make it a bit more visually appealing (blue/purple gradient)
      const r = barHeight + (25 * (i / bufferLength));
      const g = 100 * (i / bufferLength);
      const b = 250;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    requestRef.current = requestAnimationFrame(draw);
  };

  return (
    <div className={`flex justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={60} 
        className="rounded-lg"
      />
    </div>
  );
}
