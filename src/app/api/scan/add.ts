import { NextRequest, NextResponse } from 'next/server';
import { supabaseStats } from '@/lib/supabase-stats';

export async function POST(request: NextRequest) {
  try {
    const { site } = await request.json();

    if (!site) {
      return NextResponse.json({ error: 'O campo site é obrigatório.' }, { status: 400 });
    }

    const { data, error } = await supabaseStats
      .from('scans')
      .insert([{ site }])
      .select('uid, site, criada_em')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scan: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
