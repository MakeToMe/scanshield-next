import { createClient } from '@supabase/supabase-js';

// Estas variáveis serão definidas no ambiente de produção
// e nunca expostas ao cliente
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Cliente Supabase para uso exclusivo no servidor
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
