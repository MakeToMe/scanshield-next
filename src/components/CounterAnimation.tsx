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
  // Usar diretamente o targetValue sem animação para garantir que o valor correto seja sempre exibido
  return (
    <span className={className}>
      {prefix}{targetValue !== undefined ? targetValue.toLocaleString() : '0'}{suffix}
    </span>
  );
}
