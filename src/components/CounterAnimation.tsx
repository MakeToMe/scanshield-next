'use client';

import { useEffect, useState, useRef } from 'react';

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
  const [displayValue, setDisplayValue] = useState<number>(0);
  const previousValueRef = useRef<number>(0);
  
  useEffect(() => {
    // Se o targetValue for válido e diferente do valor anterior, atualize o displayValue
    if (targetValue !== undefined && targetValue !== previousValueRef.current) {
      console.log(`Atualizando contador para: ${targetValue}`);
      setDisplayValue(targetValue);
      previousValueRef.current = targetValue;
    }
  }, [targetValue]);

  return (
    <span className={className}>
      {prefix}{displayValue !== undefined ? displayValue.toLocaleString() : '0'}{suffix}
    </span>
  );
}
