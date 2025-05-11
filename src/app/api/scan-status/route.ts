import { NextRequest, NextResponse } from 'next/server';
import { scanStatusMap, cleanupOldScans } from './utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId } = body;

    if (!scanId) {
      return NextResponse.json({ error: 'ID do escaneamento é obrigatório' }, { status: 400 });
    }

    // Verifica se o escaneamento existe
    const status = scanStatusMap.get(scanId);
    
    if (!status) {
      return NextResponse.json({ error: 'Escaneamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      scanId,
      step: status.step,
      progress: status.progress,
      elapsedTime: Math.floor((Date.now() - status.startTime) / 1000) // em segundos
    });
  } catch (error: any) {
    console.error('Erro ao verificar status do escaneamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Limpa escaneamentos antigos a cada 5 minutos
setInterval(cleanupOldScans, 5 * 60 * 1000);
