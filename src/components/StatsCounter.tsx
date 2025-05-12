'use client';

import { useEffect, useState, useCallback } from 'react';
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

  // Função para buscar as estatísticas do servidor
  const fetchStats = useCallback(async () => {
    try {
      // Adiciona um parâmetro de timestamp para evitar cache
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/stats?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.sitesScanned === 'number') {
          console.log(`Contador obtido da API: ${data.sitesScanned}`);
          setSitesScanned(data.sitesScanned);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, []);

  useEffect(() => {
    // Busca as estatísticas iniciais
    fetchStats();
    
    // Função para lidar com o evento de atualização do contador
    function handleSitesCountUpdated(event: SitesCountEvent) {
      const { count } = event.detail;
      if (typeof count === 'number' && count > 0) {
        console.log(`Contador atualizado via evento: ${count}`);
        setSitesScanned(count);
      } else {
        // Se o contador do evento não for válido, busca do servidor
        console.log('Contador do evento inválido, buscando do servidor...');
        fetchStats();
      }
    }
    
    // Adiciona o listener para o evento personalizado
    window.addEventListener('sites-count-updated', handleSitesCountUpdated);
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('sites-count-updated', handleSitesCountUpdated);
    };
  }, [fetchStats]);

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
