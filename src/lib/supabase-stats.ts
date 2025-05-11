import { createClient } from '@supabase/supabase-js';

// Configuração para acesso ao banco de dados
// Usa variáveis de ambiente se disponíveis, caso contrário usa valores hardcoded para desenvolvimento local
const supabaseStatsUrl = process.env.NEXT_PUBLIC_SUPABASE_STATS_URL || process.env.SUPABASE_STATS_URL || 'https://studio.rardevops.com';
const supabaseStatsKey = process.env.NEXT_PUBLIC_SUPABASE_STATS_KEY || process.env.SUPABASE_STATS_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70';

// Log para debug em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  console.log('Supabase Stats URL:', supabaseStatsUrl);
}

// Cliente Supabase para uso exclusivo no servidor
const supabaseStats = createClient(supabaseStatsUrl, supabaseStatsKey, {
  db: { schema: 'scan' }
});

export { supabaseStats };
