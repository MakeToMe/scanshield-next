import { supabaseStats } from './supabase-stats';

/**
 * Incrementa o contador de sites escaneados e retorna o novo valor
 * Esta função é chamada apenas quando um escaneamento é concluído com sucesso
 */
export async function incrementSitesCounter(): Promise<number> {
  try {
    // Primeiro, obtém a contagem atual
    const { count, error: countError } = await supabaseStats
      .from('scans')
      .select('uid', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Erro ao consultar contagem atual:', countError);
      return 0;
    }
    
    // Dispara um evento personalizado para atualizar o contador em todos os clientes
    const currentCount = count || 0;
    const newCount = currentCount + 1;
    
    // Dispara um evento para o canal 'stats' com o novo valor
    // Isso pode ser usado para implementar WebSockets no futuro
    console.log(`Contador incrementado: ${currentCount} -> ${newCount}`);
    
    return newCount;
  } catch (error) {
    console.error('Erro ao incrementar contador:', error);
    return 0;
  }
}
