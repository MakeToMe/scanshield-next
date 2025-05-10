import { NextRequest, NextResponse } from 'next/server';

// Armazenamento temporário para o status do escaneamento
// Em produção, isso deveria ser armazenado em um banco de dados ou Redis
const scanStatusMap = new Map<string, {
  step: string;
  progress: number;
  startTime: number;
  lastUpdate: number;
}>();

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

// Função para iniciar um novo escaneamento
export function startScan(scanId: string) {
  scanStatusMap.set(scanId, {
    step: 'url_submitted',
    progress: 0,
    startTime: Date.now(),
    lastUpdate: Date.now()
  });
}

// Função para atualizar o status de um escaneamento
export function updateScanStatus(scanId: string, step: string, progress: number) {
  const status = scanStatusMap.get(scanId);
  
  if (status) {
    scanStatusMap.set(scanId, {
      ...status,
      step,
      progress,
      lastUpdate: Date.now()
    });
  }
}

// Função para limpar escaneamentos antigos (mais de 30 minutos)
export function cleanupOldScans() {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  
  for (const [scanId, status] of scanStatusMap.entries()) {
    if (status.lastUpdate < thirtyMinutesAgo) {
      scanStatusMap.delete(scanId);
    }
  }
}

// Limpa escaneamentos antigos a cada 5 minutos
setInterval(cleanupOldScans, 5 * 60 * 1000);
