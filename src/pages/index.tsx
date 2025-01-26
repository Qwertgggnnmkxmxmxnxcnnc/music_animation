import React, { useState, useEffect, useRef } from 'react';
import ShaderViewer from '../components/ShaderViewer';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<1 | 2>(1);
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        setDimensions({
          width: Math.min(window.innerWidth - 40, 500),
          height: Math.min(window.innerWidth - 40, 500)
        });
      }
    };

    updateDimensions();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, []);

  const handleAudioFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioRef.current && typeof window !== 'undefined') {
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      
      if (!audioContext) {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audioRef.current);
        const analyserNode = context.createAnalyser();
        
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.6;
        analyserNode.minDecibels = -70;
        analyserNode.maxDecibels = -30;
        
        source.connect(analyserNode);
        analyserNode.connect(context.destination);
        
        setAudioContext(context);
        setAnalyser(analyserNode);
      }
      
      try {
        await audioRef.current.play();
        if (audioContext?.state === 'suspended') {
          await audioContext.resume();
        }
      } catch (err) {
        console.error('Ошибка воспроизведения:', err);
      }
    }
  };

  if (!isMounted) {
    return null; // или возвращаем заглушку/loader
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
      transition: 'background-color 0.3s ease'
    }}>
      <header style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '20px',
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 1000
      }}>
        <select
          value={currentAnimation}
          onChange={(e) => setCurrentAnimation(Number(e.target.value) as 1 | 2)}
          style={{
            padding: '8px 12px',
            borderRadius: '20px',
            border: `2px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
            background: 'transparent',
            color: isDarkMode ? '#ffffff' : '#000000',
            cursor: 'pointer',
            fontSize: '16px',
            outline: 'none'
          }}
        >
          <option value={1}>Анимация 1</option>
          <option value={2}>Анимация 2</option>
        </select>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            padding: '10px',
            background: isDarkMode ? '#ffffff' : '#000000',
            color: isDarkMode ? '#000000' : '#ffffff',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        gap: '40px'
      }}>
        {isMounted && (
          <ShaderViewer 
            isDarkMode={isDarkMode} 
            animationType={currentAnimation}
            width={dimensions.width}
            height={dimensions.height}
            audioAnalyser={analyser}
          />
        )}
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <label 
              htmlFor="audio-input"
              style={{
                padding: '10px',
                background: '#4CAF50',
                color: 'white',
                borderRadius: '50%',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </label>
          </div>
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioFile}
            style={{ display: 'none' }}
            id="audio-input"
          />
          <audio
            ref={audioRef}
            controls
            onPlay={() => {
              if (audioContext?.state === 'suspended') {
                audioContext.resume();
              }
            }}
            style={{
              width: '300px',
              borderRadius: '20px',
              backgroundColor: isDarkMode ? '#333' : '#fff',
              color: isDarkMode ? '#fff' : '#000'
            }}
          />
        </div>
      </main>
    </div>
  );
} 