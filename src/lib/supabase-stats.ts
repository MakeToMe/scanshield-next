import { createClient } from '@supabase/supabase-js';

// Configuração para acesso ao banco de dados a partir de variáveis de ambiente
const supabaseStatsUrl = process.env.SUPABASE_STATS_URL || 'http://localhost:3000';
const supabaseStatsKey = process.env.SUPABASE_STATS_KEY || '';

// Cliente Supabase para uso exclusivo no servidor
const supabaseStats = createClient(supabaseStatsUrl, supabaseStatsKey, {
  db: { schema: 'scan' }
});

export { supabaseStats };
