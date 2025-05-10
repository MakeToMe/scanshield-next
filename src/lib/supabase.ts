import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
// Usa variáveis de ambiente se disponíveis, caso contrário usa valores hardcoded para desenvolvimento local
const supabaseUrl = process.env.SUPABASE_URL || 'https://rarwhk.rardevops.com';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcndoayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzEwNzY5NjQwLCJleHAiOjIwMjYzNDU2NDB9.2QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

// Cliente Supabase para uso exclusivo no servidor
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
