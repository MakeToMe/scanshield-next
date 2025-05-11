// Armazenamento temporário para o status do escaneamento
// Em produção, isso deveria ser armazenado em um banco de dados ou Redis
export const scanStatusMap = new Map<string, {
  step: string;
  progress: number;
  startTime: number;
  lastUpdate: number;
}>();

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
    status.step = step;
    status.progress = progress;
    status.lastUpdate = Date.now();
    scanStatusMap.set(scanId, status);
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
