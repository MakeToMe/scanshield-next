import { NextRequest, NextResponse } from 'next/server';
import { supabaseStats } from '@/lib/supabase-stats';


export async function GET(request: NextRequest) {
  try {
    // Consulta usando o client supabaseStats já configurado para schema 'scan'
    const { count, error } = await supabaseStats
      .from('scans')
      .select('uid', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao consultar Supabase:', error);
      return NextResponse.json({ sitesScanned: 0, error: error.message }, { status: 500 });
    }

    console.log(`Total de registros encontrados: ${count}`);
    const response = NextResponse.json({ sitesScanned: count ?? 0 }, { status: 200 });
    
    // Adiciona headers para evitar cache
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error('Erro na consulta:', error);
    // Em caso de erro, retorna 0
    const errorResponse = NextResponse.json({ sitesScanned: 0 }, { status: 200 });
    
    // Adiciona headers para evitar cache
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    
    return errorResponse;
  }
}
