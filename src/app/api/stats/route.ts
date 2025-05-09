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
    return NextResponse.json({ sitesScanned: count ?? 0 }, { status: 200 });
  } catch (error: any) {
    console.error('Erro na consulta:', error);
    // Em caso de erro, retorna 0
    return NextResponse.json({ sitesScanned: 0 }, { status: 200 });
  }
}
