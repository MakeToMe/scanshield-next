import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, hasVulnerabilities, tablesFound, timestamp } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Registra o scan no Supabase
    const { data, error } = await supabase
      .from('scans')
      .insert([
        {
          url,
          has_vulnerabilities: hasVulnerabilities || false,
          tables_found: tablesFound || 0,
          scanned_at: timestamp || new Date().toISOString(),
          ip_address: request.ip || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      ]);

    if (error) {
      console.error('Erro ao registrar scan no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao registrar scan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Scan registrado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: `Erro ao processar requisição: ${error.message}` }, { status: 500 });
  }
}
