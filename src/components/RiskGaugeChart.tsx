'use client';

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Registrar os componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, RadialLinearScale);

interface RiskGaugeChartProps {
  riskLevel: 'Alto' | 'Médio' | 'Baixo' | 'Nulo';
}

const RiskGaugeChart: React.FC<RiskGaugeChartProps> = ({ riskLevel }) => {
  // Definir valores para cada nível de risco
  const riskValues = {
    'Alto': 90,
    'Médio': 50,
    'Baixo': 20,
    'Nulo': 5,
  };

  // Definir cores para cada nível de risco
  const riskColors = {
    'Alto': 'rgba(239, 68, 68, 1)',      // Vermelho
    'Médio': 'rgba(234, 179, 8, 1)',     // Amarelo
    'Baixo': 'rgba(16, 185, 129, 1)',    // Verde
    'Nulo': 'rgba(148, 163, 184, 1)',    // Cinza
  };

  // Definir o valor atual com base no nível de risco
  const value = riskValues[riskLevel] || 0;
  const color = riskColors[riskLevel] || 'rgba(148, 163, 184, 1)';
  
  // Configuração dos dados do gráfico
  const data = {
    datasets: [
      {
        data: [value, 100 - value],
        backgroundColor: [
          color,
          'rgba(30, 29, 60, 0.5)',
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  // Opções do gráfico
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  // Determinar o ícone e a mensagem com base no nível de risco
  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'Alto':
        return '🔴';
      case 'Médio':
        return '🟡';
      case 'Baixo':
        return '🟢';
      case 'Nulo':
        return '⚪';
      default:
        return '⚪';
    }
  };

  const getRiskMessage = () => {
    switch (riskLevel) {
      case 'Alto':
        return 'Alto risco de exposição de dados sensíveis';
      case 'Médio':
        return 'Risco moderado de exposição de dados';
      case 'Baixo':
        return 'Baixo risco de exposição de dados';
      case 'Nulo':
        return 'Nenhum risco detectado';
      default:
        return 'Nível de risco não determinado';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c] mb-8">
      <h3 className="text-xl font-bold text-white mb-4 text-center">Nível de Risco</h3>
      
      <div className="flex flex-col items-center">
        <div className="h-[180px] w-[300px] relative">
          <Doughnut data={data} options={options as any} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl mb-2">{getRiskIcon()}</div>
            <div className="text-2xl font-bold" style={{ color }}>
              {riskLevel}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-gray-300">
          {getRiskMessage()}
        </div>
        
        <div className="mt-6 flex justify-between w-full max-w-xs">
          <div className="flex flex-col items-center">
            <div className="text-green-500 text-xl">🟢</div>
            <div className="text-gray-400 text-sm">Baixo</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-yellow-500 text-xl">🟡</div>
            <div className="text-gray-400 text-sm">Médio</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-red-500 text-xl">🔴</div>
            <div className="text-gray-400 text-sm">Alto</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskGaugeChart;
