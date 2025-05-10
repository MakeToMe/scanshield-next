'use client';

import { useEffect, useState } from 'react';

interface CounterAnimationProps {
  targetValue: number;
  duration?: number; // duração em milissegundos
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function CounterAnimation({
  targetValue,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = ''
}: CounterAnimationProps) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (targetValue <= 0) {
      setCount(0);
      return;
    }
    
    // Valor inicial (10% do valor alvo)
    const startValue = Math.floor(targetValue * 0.1);
    setCount(startValue);
    
    // Número de etapas para a animação
    const steps = 30;
    const increment = (targetValue - startValue) / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(startValue + (increment * currentStep)));
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [targetValue, duration]);
  
  return (
    <span className={className}>
      {prefix}{count !== undefined ? count.toLocaleString() : '0'}{suffix}
    </span>
  );
}
