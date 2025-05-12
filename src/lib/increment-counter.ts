import { supabaseStats } from './supabase-stats';

// Variável para armazenar em cache o último valor conhecido do contador
let lastKnownCount = 0;

/**
 * Consulta o número atual de sites escaneados e retorna o valor
 * Esta função é chamada apenas quando um escaneamento é concluído com sucesso
 */
export async function incrementSitesCounter(): Promise<number> {
  try {
    // Consulta o banco para obter a contagem atual com cache-busting
    const timestamp = new Date().getTime();
    const { count, error } = await supabaseStats
      .from('scans')
      .select('uid', { count: 'exact', head: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao consultar contagem atual:', error);
      // Se houver erro, retorna o último valor conhecido ou 0
      return lastKnownCount || 0;
    }
    
    // Atualiza o cache e retorna o valor atual
    const currentCount = count || 0;
    
    // Só atualiza o cache se o valor for maior que o anterior
    if (currentCount > lastKnownCount) {
      lastKnownCount = currentCount;
    }
    
    console.log(`Total de sites escaneados (timestamp: ${timestamp}): ${currentCount}`);
    
    return currentCount;
  } catch (error) {
    console.error('Erro ao consultar contador:', error);
    // Em caso de erro, retorna o último valor conhecido ou 0
    return lastKnownCount || 0;
  }
}
