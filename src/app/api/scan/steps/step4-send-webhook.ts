import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { ScanJsonData } from '../types';

const WEBHOOK_URL = 'https://rarwhk.rardevops.com/webhook/vulnerabilidade-scanshield';

export interface Step4Result {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: {
    scanResults: {
      tecnologiasDetectadas: string[];
      tokensJWT: string[];
      chavesSensiveis: string[];
      urlsBancoDados: string[];
      urlsSuspeitas: string[];
      tabelasVazadas: number;
    };
    webhookResponse: any;
  };
  error?: string;
  timestamp: string;
}

/**
 * Envia os resultados do scan para o webhook
 */
export async function executeStep4(domainName: string, scanId: string): Promise<Step4Result> {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('\n=== INICIANDO PASSO 4: ENVIO PARA WEBHOOK ===');
    
    // Carrega os dados do passo 1
    const step1Path = path.join(process.cwd(), 'public', 'scans', `${domainName}-passo1.json`);
    const step1Data = await fs.readFile(step1Path, 'utf-8');
    const step1Json = JSON.parse(step1Data);
    
    // Prepara os dados para envio
    const payload = {
      scanId,
      timestamp,
      domain: domainName,
      data: step1Json
    };
    
    console.log(`Enviando dados para o webhook: ${WEBHOOK_URL}`);
    console.log(`Scan ID: ${scanId}`);
    console.log(`Domínio: ${domainName}`);
    
    // Envia para o webhook
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Scan-Id': scanId,
        'X-Scan-Source': 'scanshield'
      },
      timeout: 30000 // 30 segundos de timeout
    });
    
    console.log('✅ Dados enviados com sucesso para o webhook');
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Processa os resultados do scan e a resposta do webhook
    const processedResults = processScanResults(step1Json, response.data, 0);
    
    // Cria o resultado final
    const result: Step4Result = {
      success: processedResults.success ?? true,
      message: processedResults.message || 'Dados enviados com sucesso para o webhook',
      statusCode: response.status,
      data: processedResults.data,
      error: processedResults.error,
      timestamp: new Date().toISOString()
    };
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Erro ao enviar para o webhook:', error.message);
    
    let errorMessage = 'Erro desconhecido';
    let statusCode: number | undefined;
    let responseData: any;
    
    if (axios.isAxiosError(error)) {
      errorMessage = error.message;
      statusCode = error.response?.status;
      responseData = error.response?.data;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Cria o resultado de erro
    const errorResult: Step4Result = {
      success: false,
      message: 'Falha ao enviar para o webhook',
      error: errorMessage,
      statusCode: statusCode,
      data: {
        scanResults: {
          tecnologiasDetectadas: [],
          tokensJWT: [],
          chavesSensiveis: [],
          urlsBancoDados: [],
          urlsSuspeitas: [],
          tabelasVazadas: 0
        },
        webhookResponse: responseData || null
      },
      timestamp: new Date().toISOString()
    };
    
    return errorResult;
  }
}

/**
 * Processa os resultados do scan e a resposta do webhook para gerar o resultado final
 */
export function processScanResults(
  scanData: any,
  webhookResponse: any,
  tabelasVazadas: number
): Partial<Step4Result> {
  try {
    return {
      success: true,
      message: 'Resultados do scan processados com sucesso',
      data: {
        scanResults: {
          tecnologiasDetectadas: scanData.tecnologiasDetectadas || [],
          tokensJWT: scanData.tokensJWT || [],
          chavesSensiveis: scanData.chavesSensiveis || [],
          urlsBancoDados: scanData.urlsBancoDados || [],
          urlsSuspeitas: scanData.urlsSuspeitas || [],
          tabelasVazadas: tabelasVazadas
        },
        webhookResponse: webhookResponse
      }
    };
  } catch (error) {
    console.error('Erro ao processar resultados do scan:', error);
    return {
      success: false,
      message: 'Erro ao processar resultados do scan',
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar resultados'
    };
  }
}

/**
 * Salva os resultados do Passo 4 em um arquivo JSON
 */
export async function saveStep4Results(domainName: string, result: Step4Result): Promise<string> {
  const fileName = `${domainName}-passo4.json`;
  const scansDir = path.join(process.cwd(), 'public', 'scans');
  const filePath = path.join(scansDir, fileName);
  
  try {
    // Garante que o diretório existe
    await fs.mkdir(scansDir, { recursive: true });
    
    // Salva o arquivo
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    
    // Verifica se o arquivo foi criado
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`O arquivo ${filePath} não foi criado`);
    }
    
    console.log(`✅ Resultados do Passo 4 salvos em: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('❌ Erro ao salvar resultados do Passo 4:', error);
    throw new Error(`Falha ao salvar resultados do Passo 4: ${error instanceof Error ? error.message : String(error)}`);
  }
}
