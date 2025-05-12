'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ScanResultsBarChartProps {
  chaves: number;
  apis: number;
  urls: number;
  urlsSuspeitas: number;
  tokens: number;
  tabelas: number;
  rpcs: number;
}

const ScanResultsBarChart: React.FC<ScanResultsBarChartProps> = ({
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
        label: 'Quantidade',
        data: [chaves, apis, urls, urlsSuspeitas, tokens, tabelas, rpcs],
        backgroundColor: [
          'rgba(123, 104, 238, 0.8)',  // Chaves - roxo/indigo
          'rgba(168, 85, 247, 0.8)',   // APIs - roxo mais claro
          'rgba(59, 130, 246, 0.8)',   // URLs - azul
          'rgba(239, 68, 68, 0.8)',    // URLs Suspeitas - vermelho
          'rgba(234, 179, 8, 0.8)',    // Tokens JWT - amarelo
          'rgba(16, 185, 129, 0.8)',   // Tabelas - verde
          'rgba(236, 72, 153, 0.8)',   // RPCs - rosa
        ],
        borderColor: [
          'rgba(123, 104, 238, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // Opções do gráfico
  const options = {
    indexAxis: 'y' as const,
    elements: {
      bar: {
        borderWidth: 1,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 13,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
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
            return `Quantidade: ${context.raw}`;
          }
        }
      }
    },
  };

  return (
    <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c] mb-8">
      <h3 className="text-xl font-bold text-white mb-4 text-center">Resumo de Elementos Encontrados</h3>
      <div className="h-[350px] w-full">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default ScanResultsBarChart;
