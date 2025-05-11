'use client';

import { useEffect, useState } from 'react';
import CounterAnimation from './CounterAnimation';

// Evento personalizado para atualizar o contador
type SitesCountEvent = CustomEvent<{ count: number }>;

// Declaração para TypeScript reconhecer o evento personalizado
declare global {
  interface WindowEventMap {
    'sites-count-updated': SitesCountEvent;
  }
}

export default function StatsCounter() {
  // Inicializa com 0 e atualiza quando os dados forem carregados
  const [sitesScanned, setSitesScanned] = useState(0);

  useEffect(() => {
    // Função para buscar as estatísticas do servidor uma única vez ao carregar
    async function fetchStats() {
      try {
        // Busca as estatísticas uma única vez ao carregar
        const response = await fetch('/api/stats');
        
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.sitesScanned === 'number') {
            console.log(`Contador inicial: ${data.sitesScanned}`);
            setSitesScanned(data.sitesScanned);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas iniciais:', error);
      }
    }
    
    // Busca as estatísticas iniciais
    fetchStats();
    
    // Função para lidar com o evento de atualização do contador
    function handleSitesCountUpdated(event: SitesCountEvent) {
      const { count } = event.detail;
      if (typeof count === 'number' && count > 0) {
        console.log(`Contador atualizado via evento: ${count}`);
        setSitesScanned(count);
      }
    }
    
    // Adiciona o listener para o evento personalizado
    window.addEventListener('sites-count-updated', handleSitesCountUpdated);
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('sites-count-updated', handleSitesCountUpdated);
    };
  }, []);

  return (
    <div className="text-center">
      <h2 className="text-6xl font-bold">
        <CounterAnimation 
          targetValue={sitesScanned} 
          duration={3000} 
          suffix=" sites escaneados"
          className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
        />
      </h2>
    </div>
  );
}
