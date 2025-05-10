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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Função para buscar as estatísticas do servidor
    async function fetchStats(retryCount = 0) {
      try {
        setLoading(true);
        const response = await fetch('/api/stats');
        
        if (!response.ok) {
          console.warn(`API retornou status ${response.status}`);
          // Tenta novamente se ainda não atingiu o limite de tentativas
          if (retryCount < 3) {
            setTimeout(() => fetchStats(retryCount + 1), 1000);
            return;
          }
          throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && typeof data.sitesScanned === 'number') {
          setSitesScanned(data.sitesScanned);
        } else {
          console.warn('Dados inválidos recebidos da API:', data);
          throw new Error('Dados inválidos recebidos da API');
        }
      } catch (err: any) {
        console.error('Erro ao carregar estatísticas:', err);
        setError(err.message || 'Erro ao carregar estatísticas');
        
        // Se ainda não atingiu o limite de tentativas, tenta novamente
        if (retryCount < 3) {
          setTimeout(() => fetchStats(retryCount + 1), 1000);
        }
      } finally {
        setLoading(false);
      }
    }

    // Inicia a busca das estatísticas
    fetchStats();
    
    // Função para lidar com o evento de atualização do contador
    function handleSitesCountUpdated(event: SitesCountEvent) {
      const { count } = event.detail;
      if (typeof count === 'number' && count > 0) {
        console.log(`Atualizando contador para: ${count} (via evento)`);
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

  // Sempre exibe o contador, mesmo em caso de erro
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
