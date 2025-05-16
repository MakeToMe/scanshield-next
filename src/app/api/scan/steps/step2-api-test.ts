import { ScanJsonData, ApiTestResult, Step2Result, Step1Result } from '../types';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { saveJsonToFile } from '../utils/file-utils';
import { saveStep4Results } from './step4-send-webhook';

const API_TIMEOUT = 10000; // 10 segundos
const SWAGGER_PATH = '/rest/v1/?select=*';

/**
 * Testa uma combinação de URL e token contra a API do Supabase
 */
async function testApiEndpoint(url: string, token: string): Promise<ApiTestResult> {
  const startTime = Date.now();
  const apiUrl = `${url}${SWAGGER_PATH}`.replace(/([^:]\/)\/+/g, '$1'); // Remove barras duplicadas
  
  console.log(`\n=== Testando API ===`);
  console.log(`URL: ${apiUrl}`);
  console.log(`Token: ${token.substring(0, 10)}...`);
  
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      timeout: API_TIMEOUT
    });

    // Verifica se a resposta contém dados e é um objeto JSON
    const hasValidData = response.data && typeof response.data === 'object';
    
    // Verifica se parece ser um Swagger/OpenAPI válido
    const isLikelySwagger = hasValidData && 
      (response.data.info?.title ||
       response.data.swagger || 
       response.data.openapi ||
       response.data.definitions ||
       response.data.paths);

    // Retorna os dados completos da resposta, independente do formato
    return {
      url,
      token: token, // Mantém o token completo para uso posterior
      tokenDisplay: token.substring(0, 10) + '...', // Versão encurtada apenas para exibição
      status: 'success',
      data: response.data, // Retorna o JSON completo da resposta
      statusCode: response.status,
      responseTime: Date.now() - startTime,
      hasSwagger: !!isLikelySwagger
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status === 404 ? 'not_found' : 'error';
      
      return {
        url,
        token: token,
        tokenDisplay: token.substring(0, 10) + '...',
        status,
        error: error.message,
        statusCode: error.response?.status,
        responseTime: Date.now() - startTime,
        data: error.response?.data || 'swagger: falha' // Retorna os dados do erro, se disponíveis
      };
    }
    
    // Se não for um erro do Axios, retorna um erro genérico
    // Em caso de erro desconhecido, retorna os dados do erro se disponíveis
    const errorData = error && typeof error === 'object' && 'data' in error 
      ? error.data 
      : (error instanceof Error ? { error: error.message } : 'Erro desconhecido');
      
    return {
      url,
      token: token,
      tokenDisplay: token.substring(0, 10) + '...',
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      data: errorData
    };
  }
}

/**
 * Executa o Passo 2: Testa as combinações de URLs e tokens
 * @param scanId ID único do escaneamento
 * @param domainName Nome do domínio escaneado (para nome do arquivo)
 * @param scanData Dados extraídos do Passo 1
 */
export async function executeStep2(scanId: string, domainName: string, scanData: ScanJsonData): Promise<Step2Result> {
  const { urlsSupabase, tokensJWT } = scanData;
  const results: ApiTestResult[] = [];

  console.log(`\n=== INÍCIO DO PASSO 2 ===`);
  console.log(`Scan ID: ${scanId}`);
  console.log(`Domínio recebido: ${domainName}`);
  console.log(`URLs Supabase encontradas: ${urlsSupabase.length}`);
  console.log(`Tokens JWT encontrados: ${tokensJWT.length}`);
  
  if (urlsSupabase.length === 0) {
    console.error('Nenhuma URL do Supabase encontrada para teste');
  }
  
  if (tokensJWT.length === 0) {
    console.error('Nenhum token JWT encontrado para teste');
  }

  // Se não houver tokens, retorna resultado vazio
  if (tokensJWT.length === 0) {
    const errorMsg = 'Nenhum token disponível para teste';
    console.error(errorMsg);
    
    const result: Step2Result = {
      scanId,
      results: [],
      timestamp: new Date().toISOString(),
      success: false,
      error: errorMsg,
      shouldRunStep4: true  // Flag para indicar que o passo 4 deve ser executado
    };
    
    // Salva os resultados em um arquivo
    const filePath = await saveStep2Results(domainName, result);
    return result;
  }

  // Testa todas as combinações de URLs e tokens em paralelo
  const testPromises: Promise<ApiTestResult>[] = [];
  
  console.log('\nIniciando testes de API...');
  
  // Função para testar uma URL com todos os tokens
  const testUrlWithTokens = (url: string) => {
    if (tokensJWT.length > 0) {
      // Testa com cada token
      for (const token of tokensJWT) {
        console.log(`\n--- Testando combinação ---`);
        console.log(`URL: ${url}`);
        console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'Nenhum'}`);
        testPromises.push(testApiEndpoint(url, token));
      }
    } else {
      // Se não houver tokens, testa sem token
      console.log('\n--- Testando sem token ---');
      console.log(`URL: ${url}`);
      testPromises.push(testApiEndpoint(url, ''));
    }
  };
  
  // Testa as URLs do Supabase, se houver
  if (urlsSupabase.length > 0) {
    console.log('\nTestando URLs do Supabase...');
    for (const url of urlsSupabase) {
      testUrlWithTokens(url);
    }
  } else {
    console.log('\nNenhuma URL do Supabase encontrada, apenas URLs suspeitas serão testadas');
  }

  try {
    // Aguarda todas as requisições serem concluídas
    console.log('\nAguardando resultados dos testes...');
    const testResults = await Promise.all(testPromises);
    results.push(...testResults);
    
    console.log(`\nTotal de testes concluídos: ${testResults.length}`);
    
    // Conta quantos testes tiveram sucesso
    const successCount = testResults.filter(r => r.status === 'success').length;
    console.log(`Testes bem-sucedidos: ${successCount}`);
    
    // Conta quantos encontraram o Swagger
    const swaggerCount = testResults.filter(r => r.hasSwagger).length;
    console.log(`Swagger encontrado em: ${swaggerCount} testes`);

    // Verifica se algum teste foi bem-sucedido
    const hasSuccess = results.some(r => r.status === 'success' && r.hasSwagger);
    
    // Tenta as URLs suspeitas se não houve sucesso ou se não havia URLs do Supabase
    const shouldTrySuspectUrls = !hasSuccess || urlsSupabase.length === 0;
    if (shouldTrySuspectUrls && scanData.urlsSuspeitas && scanData.urlsSuspeitas.length > 0) {
      console.log('\nNenhuma URL do Supabase funcionou, tentando URLs suspeitas...');
      
      // Filtra URLs suspeitas que não são do Supabase (já testadas)
      const urlsToTest = scanData.urlsSuspeitas.filter(url => 
        !urlsSupabase.includes(url) && 
        !url.includes('supabase')
      );
      
      console.log(`URLs suspeitas a testar: ${urlsToTest.length}`);
      
      // Testa cada URL suspeita
      for (const url of urlsToTest) {
        console.log(`\nTestando URL suspeita: ${url}`);
        const testResult = await testApiEndpoint(url, tokensJWT[0] || '');
        results.push(testResult);
        
        // Se encontrar o Swagger, para de testar
        if (testResult.hasSwagger) {
          console.log(`✅ Swagger encontrado em: ${url}`);
          break;
        }
      }
    }
    
    // Verifica novamente se algum teste foi bem-sucedido
    const finalSuccess = results.some(r => r.status === 'success' && r.hasSwagger);
    
    // Se ainda não encontrou, sinaliza para executar o passo 4
    if (!finalSuccess) {
      console.log('\n⚠️ Nenhuma URL com Swagger encontrada, sinalizando para executar o Passo 4...');
      const failResult: Step2Result = {
        scanId,
        results: [],
        timestamp: new Date().toISOString(),
        success: false,
        error: 'Não foi possível encontrar tabelas ou funções',
        urlsTestadas: [...urlsSupabase, ...(scanData.urlsSuspeitas || [])].filter((v, i, a) => a.indexOf(v) === i),
        shouldRunStep4: true  // Flag para indicar que o passo 4 deve ser executado
      };
      
      const failPath = await saveStep2Results(`${domainName}-passo2.5`, failResult);
      console.log(`Arquivo de falha salvo em: ${failPath}`);
      return failResult;
    }
    
    // Filtra apenas os resultados com sucesso e que têm dados do Swagger
    const successfulResults = results.filter(r => r.status === 'success' && r.hasSwagger);
    
    // Se não houver resultados de sucesso, mantém o último resultado para referência
    const finalResults = successfulResults.length > 0 ? successfulResults : results.slice(-1);
    
    // Mantém os dados completos da resposta da API
    const cleanResults: ApiTestResult[] = finalResults.map(result => ({
      url: result.url,
      token: result.token, // Mantém o token original para uso interno
      tokenDisplay: result.tokenDisplay,
      status: result.status,
      responseTime: result.responseTime,
      data: result.data, // Mantém os dados completos da resposta
      statusCode: result.statusCode,
      error: result.error,
      hasSwagger: result.hasSwagger
    }));
    
    // Salva os resultados finais
    const result: Step2Result = {
      scanId,
      results: cleanResults,
      timestamp: new Date().toISOString(),
      success: finalSuccess
    };
    
    // Adiciona as URLs testadas apenas se houver falha
    if (!finalSuccess) {
      result.urlsTestadas = [...urlsSupabase, ...(scanData.urlsSuspeitas || [])].filter((v, i, a) => a.indexOf(v) === i);
    }

    const savedPath = await saveStep2Results(domainName, result);
    console.log(`\n=== FIM DO PASSO 2 ===`);
    console.log(`Resultados finais salvos em: ${savedPath}`);
    
    return result;
    
  } catch (error) {
    console.error('Erro durante os testes de API:', error);
    
    // Retorna um resultado de erro
    const errorResult: Step2Result = {
      scanId,
      results: [],
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido durante os testes de API'
    };
    
    await saveStep2Results(domainName, errorResult);
    throw error;
  }
}

/**
 * Salva os resultados do Passo 2 em um arquivo
 * @param domainName Nome do domínio (usado como base para o nome do arquivo)
 * @param result Resultados a serem salvos
 */
async function saveStep2Results(domainName: string, result: Step2Result): Promise<string> {
  try {
    console.log('Salvando resultados do Passo 2...');
    console.log(`Domínio para nome do arquivo: ${domainName}`);
    
    // Usa a função saveJsonToFile padronizada com o nome do domínio
    const filePath = saveJsonToFile(domainName, result, { step: 2 });
    
    if (!filePath) {
      throw new Error('Não foi possível salvar o arquivo de resultados');
    }
    
    console.log(`Arquivo salvo em: ${filePath}`);
    return filePath;
    
  } catch (error) {
    const errorMsg = 'Erro ao salvar resultados do Passo 2';
    console.error(errorMsg, error);
    throw new Error(`${errorMsg}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Carrega os resultados do Passo 1 para um scan específico
 */
export async function loadStep1Results(scanId: string): Promise<Step1Result> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'scans', `${scanId}-passo1.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Valida se o objeto tem a estrutura esperada
    if (!data.scanJsonData || !data.domainName) {
      throw new Error('Formato de dados inválido no arquivo do Passo 1');
    }
    
    return data as Step1Result;
  } catch (error) {
    console.error(`Erro ao carregar resultados do Passo 1 para scanId: ${scanId}`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha ao carregar dados do Passo 1: ${errorMessage}`);
  }
}
