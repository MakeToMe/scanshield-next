'use client';

import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiProps {
  duration?: number;
}

export default function Confetti({ duration = 5000 }: ConfettiProps) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Atualizar tamanho da janela
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Adicionar listener para redimensionamento
    window.addEventListener('resize', handleResize);
    
    // Configurar timer para remover o confete após a duração
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, duration);

    // Limpar listeners e timers
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [duration]);

  if (!showConfetti) return null;

  return (
    <ReactConfetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={500}
      gravity={0.1}
      colors={['#00BFFF', '#FF1493', '#32CD32', '#FFD700', '#FF4500', '#9400D3']}
    />
  );
}
