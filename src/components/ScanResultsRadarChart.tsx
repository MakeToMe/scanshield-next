'use client';

import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface ScanResultsRadarChartProps {
  chaves: number;
  apis: number;
  urls: number;
  urlsSuspeitas: number;
  tokens: number;
  tabelas: number;
  rpcs: number;
}

const ScanResultsRadarChart: React.FC<ScanResultsRadarChartProps> = ({
  chaves,
  apis,
  urls,
  urlsSuspeitas,
  tokens,
  tabelas,
  rpcs,
}) => {
  // Configuração dos dados do gráfico
  const data = {
    labels: [
      'Chaves Sensíveis',
      'APIs',
      'URLs',
      'URLs Suspeitas',
      'Tokens JWT',
      'Tabelas',
      'RPCs',
    ],
    datasets: [
      {
        label: 'Elementos Encontrados',
        data: [chaves, apis, urls, urlsSuspeitas, tokens, tabelas, rpcs],
        backgroundColor: 'rgba(123, 104, 238, 0.2)',
        borderColor: 'rgba(123, 104, 238, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(168, 85, 247, 1)',
        pointRadius: 4,
      },
    ],
  };

  // Opções do gráfico
  const options = {
    scales: {
      r: {
        angleLines: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'rgba(255, 255, 255, 0.7)',
          z: 1,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(19, 18, 43, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(46, 45, 76, 1)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.raw}`;
          }
        }
      }
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c] mb-8">
      <h3 className="text-xl font-bold text-white mb-4 text-center">Resumo de Elementos Encontrados</h3>
      <div className="h-[350px] w-full">
        <Radar data={data} options={options as any} />
      </div>
    </div>
  );
};

export default ScanResultsRadarChart;
