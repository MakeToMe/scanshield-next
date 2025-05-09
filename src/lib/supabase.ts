import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase a partir de variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Cliente Supabase para uso exclusivo no servidor
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
