'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface SimpleGaugeChartProps {
  riskLevel: string;
}

const SimpleGaugeChart: React.FC<SimpleGaugeChartProps> = ({ riskLevel }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Converter o nível de risco em um valor numérico para o medidor
  const getRiskValue = (risk: string): number => {
    switch (risk.toLowerCase()) {
      case 'alto':
        return 90;
      case 'médio':
      case 'medio':
        return 60;
      case 'baixo':
        return 30;
      case 'nulo':
        return 5;
      default:
        return 0;
    }
  };

  useEffect(() => {
    // Carregar a biblioteca do Google Charts
    const loadGoogleCharts = () => {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.async = true;
      script.onload = () => {
        if (window.google) {
          window.google.charts.load('current', { 'packages': ['gauge'] });
          window.google.charts.setOnLoadCallback(drawChart);
        }
      };
      document.head.appendChild(script);
    };

    // Função para desenhar o gráfico
    const drawChart = () => {
      if (!chartRef.current || !window.google || !window.google.visualization) return;
      
      const data = window.google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Risco', getRiskValue(riskLevel)]
      ]);

      const options = {
        width: 300,
        height: 200,
        redFrom: 75,
        redTo: 100,
        yellowFrom: 40,
        yellowTo: 75,
        greenFrom: 0,
        greenTo: 40,
        minorTicks: 5,
        majorTicks: ['0', '20', '40', '60', '80', '100'],
        animation: {
          duration: 1000,
          easing: 'out'
        },
        backgroundColor: { fill: 'transparent' },
        chartArea: { 
          width: '100%',
          height: '100%'
        },
      };

      const chart = new window.google.visualization.Gauge(chartRef.current);
      chart.draw(data, options);
    };

    // Verificar se o Google Charts já está carregado
    if (window.google && window.google.visualization) {
      drawChart();
    } else {
      loadGoogleCharts();
    }

    // Redimensionar o gráfico quando a janela for redimensionada
    const handleResize = () => {
      if (window.google && window.google.visualization) {
        drawChart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [riskLevel]);

  // Determinar a cor e o texto com base no nível de risco
  const getRiskColor = (risk: string): string => {
    switch (risk.toLowerCase()) {
      case 'alto':
        return 'text-red-500';
      case 'médio':
      case 'medio':
        return 'text-yellow-500';
      case 'baixo':
        return 'text-green-500';
      case 'nulo':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskMessage = (risk: string): string => {
    switch (risk.toLowerCase()) {
      case 'alto':
        return 'Alto risco de exposição de dados sensíveis';
      case 'médio':
      case 'medio':
        return 'Risco moderado de exposição de dados';
      case 'baixo':
        return 'Baixo risco de exposição de dados';
      case 'nulo':
        return 'Nenhum risco detectado';
      default:
        return 'Nível de risco não determinado';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c] mb-8">
      <h3 className="text-xl font-bold text-white mb-4 text-center">Nível de Risco</h3>
      
      <div className="flex flex-col items-center">
        <div ref={chartRef} className="w-full h-[200px] flex justify-center"></div>
        
        <div className={`mt-2 text-2xl font-bold ${getRiskColor(riskLevel)}`}>
          {riskLevel}
        </div>
        
        <div className="mt-2 text-center text-gray-300">
          {getRiskMessage(riskLevel)}
        </div>
      </div>
    </div>
  );
};

export default SimpleGaugeChart;
