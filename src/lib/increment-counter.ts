import { supabaseStats } from './supabase-stats';

/**
 * Consulta o número atual de sites escaneados e retorna o valor
 * Esta função é chamada apenas quando um escaneamento é concluído com sucesso
 */
export async function incrementSitesCounter(): Promise<number> {
  try {
    // Consulta o banco para obter a contagem atual
    const { count, error } = await supabaseStats
      .from('scans')
      .select('uid', { count: 'exact', head: true });
    
    if (error) {
      console.error('Erro ao consultar contagem atual:', error);
      return 0;
    }
    
    // Retorna o valor atual
    const currentCount = count || 0;
    console.log(`Total de sites escaneados: ${currentCount}`);
    
    return currentCount;
  } catch (error) {
    console.error('Erro ao consultar contador:', error);
    return 0;
  }
}
