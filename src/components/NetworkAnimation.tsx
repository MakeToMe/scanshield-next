'use client';

// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Point, ScanLine } from '../types/animation';

export default function NetworkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar o canvas para ocupar toda a tela
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    // Inicializar o tamanho do canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Criar pontos
    const points: Point[] = [];
    const numPoints = Math.min(100, Math.floor(window.innerWidth / 20)); // Densidade adaptativa
    const connectionDistance = Math.min(200, Math.floor(window.innerWidth / 8)); // Distância adaptativa
    
    // Linhas de scan para efeito de escaneamento de segurança
    const scanLines: ScanLine[] = [
      { y: 0, speed: 0.6, direction: 1, color: '#6366f1', width: 30 },
      { y: canvas.height / 2, speed: 0.4, direction: -1, color: '#a855f7', width: 20 },
      { y: canvas.height, speed: 0.5, direction: -1, color: '#38bdf8', width: 25 }
    ];

    // Cores para os pontos e conexões
    const colors = ['#6366f1', '#a855f7', '#38bdf8', '#8b5cf6'];

    // Criar pontos aleatórios
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3, // Velocidade reduzida para movimento mais suave
        vy: (Math.random() - 0.5) * 0.3, // Velocidade reduzida para movimento mais suave
        radius: Math.random() * 1.5 + 0.5, // Tamanho do ponto
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Função de animação
    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      
      // Desenhar as linhas de scan
      scanLines.forEach((scanLine: ScanLine) => {
        const halfWidth = scanLine.width / 2;
        const gradient = ctx.createLinearGradient(0, scanLine.y - halfWidth, 0, scanLine.y + halfWidth);
        
        // Extrair componentes RGB da cor
        let rgb = '99, 102, 241'; // Padrão indigo
        if (scanLine.color === '#a855f7') rgb = '168, 85, 247'; // Roxo
        if (scanLine.color === '#38bdf8') rgb = '56, 189, 248'; // Azul claro
        
        gradient.addColorStop(0, 'rgba(' + rgb + ', 0)');
        gradient.addColorStop(0.5, 'rgba(' + rgb + ', 0.15)');
        gradient.addColorStop(1, 'rgba(' + rgb + ', 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanLine.y - halfWidth, window.innerWidth, scanLine.width);
        
        // Atualizar a posição da linha de scan
        scanLine.y += scanLine.speed * scanLine.direction;
        if (scanLine.y > window.innerHeight || scanLine.y < 0) {
          scanLine.direction *= -1;
        }
      });

      // Desenhar conexões entre pontos primeiro (para que fiquem atrás dos pontos)
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        for (let j = i + 1; j < points.length; j++) {
          const otherPoint = points[j];
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionDistance) {
            // Calcular opacidade baseada na distância
            const opacity = 1 - (distance / connectionDistance);
            
            // Verificar se a linha cruza com alguma linha de scan
            const isScanned = scanLines.some((scanLine) => {
              return (point.y <= scanLine.y && otherPoint.y >= scanLine.y) || 
                     (point.y >= scanLine.y && otherPoint.y <= scanLine.y);
            });
            
            // Desenhar linha
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            
            if (isScanned) {
              ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.6})`;
              ctx.lineWidth = 1;
            } else {
              ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * 0.2})`;
              ctx.lineWidth = 0.5;
            }
            
            ctx.stroke();
          }
        }
      }
      
      // Desenhar pontos depois das conexões
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // Atualizar posição
        point.x += point.vx;
        point.y += point.vy;
        
        // Verificar limites
        if (point.x < 0 || point.x > window.innerWidth) point.vx *= -1;
        if (point.y < 0 || point.y > window.innerHeight) point.vy *= -1;
        
        // Verificar proximidade com linhas de scan
        let minDistance = Infinity;
        let nearestScanLine: ScanLine | null = null;
        
        scanLines.forEach((scanLine: ScanLine) => {
          const distance = Math.abs(point.y - scanLine.y);
          if (distance < scanLine.width * 1.5 && distance < minDistance) {
            minDistance = distance;
            nearestScanLine = scanLine;
          }
        });
        
        // Efeito de escaneamento
        if (nearestScanLine) {
          // Calcular intensidade do efeito baseado na distância
          // Usando type assertion para garantir que o TypeScript reconheça a propriedade width
          const scanLine = nearestScanLine as { width: number, color: string };
          const intensity = 1 - (minDistance / (scanLine.width * 1.5));
          
          // Extrair cor do scan para usar no ponto
          const pointColor = scanLine.color;
          
          // Desenhar ponto com efeito de brilho
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.radius * (1 + intensity * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = pointColor;
          ctx.fill();
          
          // Adicionar halo ao redor do ponto
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.radius * (2 + intensity * 2), 0, Math.PI * 2);
          
          // Extrair componentes RGB da cor do scan
          let rgb = '255, 255, 255';
          if (scanLine.color === '#6366f1') rgb = '99, 102, 241';
          if (scanLine.color === '#a855f7') rgb = '168, 85, 247';
          if (scanLine.color === '#38bdf8') rgb = '56, 189, 248';
          
          ctx.fillStyle = `rgba(${rgb}, ${intensity * 0.3})`;
          ctx.fill();
        } else {
          // Desenhar ponto normal
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
          ctx.fillStyle = point.color;
          ctx.fill();
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    // Iniciar animação
    animate();

    // Limpar ao desmontar
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-20"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
        title="Animação de rede de segurança"
        data-component-name="NetworkAnimation"
      />
    </div>
  );
}
