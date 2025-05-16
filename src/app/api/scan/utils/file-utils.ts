import fs from 'fs';
import path from 'path';

/**
 * Garante que o diretório de saída existe
 * @param outputDir Diretório base (padrão: 'public/scans')
 * @returns Caminho completo do diretório
 */
function ensureOutputDir(outputDir = 'public/scans'): string {
  const fullPath = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Diretório criado: ${fullPath}`);
  }
  return fullPath;
}

/**
 * Salva dados em um arquivo JSON no diretório especificado
 * @param fileName Nome do arquivo a ser salvo (sem extensão)
 * @param data Dados a serem salvos
 * @param options Opções adicionais
 * @returns Caminho do arquivo salvo ou null se falhar
 */
export function saveJsonToFile(
  fileName: string,
  data: any,
  options: { dir?: string; step?: number } = {}
): string | null {
  try {
    // Remove a extensão .json se existir
    const baseName = fileName.replace(/\.json$/, '');
    
    // Adiciona o número do passo ao nome do arquivo, se fornecido
    const fullFileName = options.step 
      ? `${baseName}-passo${options.step}.json`
      : `${baseName}.json`;
    
    // Define o diretório de saída
    const outputDir = options.dir || 'public/scans';
    const fullDir = ensureOutputDir(outputDir);
    
    const filePath = path.join(fullDir, fullFileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Arquivo salvo em: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Erro ao salvar o arquivo:', error);
    return null;
  }
}

/**
 * Extrai o domínio de uma URL para usar como nome de arquivo
 * @param url URL para extrair o domínio
 * @returns Nome do domínio ou 'unknown' se não for possível extrair
 */
export function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.error('Erro ao extrair domínio da URL:', error);
    return 'unknown';
  }
}
