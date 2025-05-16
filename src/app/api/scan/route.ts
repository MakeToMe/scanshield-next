import { NextRequest, NextResponse } from 'next/server';
import { executeStep1 } from './steps/step1-extraction';
import { executeStep2 } from './steps/step2-api-test';
import { executeStep3, Step3Result, WebhookResult } from './steps/step3-extract-swagger';
import { executeStep4, saveStep4Results, Step4Result, processScanResults } from './steps/step4-send-webhook';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    console.log(`Iniciando escaneamento da URL: ${url}`);
    
    // Gera um ID único para o escaneamento
    const scanId = uuidv4();
    
    try {
      // Executa o passo 1 de extração
      const step1Result = await executeStep1(url, scanId, []);
      
      console.log('Passo 1 concluído com sucesso');
      
      // Executa o passo 2 (teste da API)
      console.log('Iniciando Passo 2: Teste de API');
      const step2Result = await executeStep2(scanId, step1Result.domainName, step1Result.scanJsonData);
      console.log('Passo 2 concluído com sucesso');
      
      // Executa o passo 3 (extração de tabelas e RPCs)
      console.log('Iniciando Passo 3: Extração de tabelas e RPCs');
      let step3Result = null;
      
      // Encontra o primeiro resultado de sucesso com dados do Swagger
      console.log('Buscando resultado do Swagger nos resultados do passo 2:');
      console.log('Total de resultados:', step2Result.results.length);
      
      const swaggerResult = step2Result.results.find(
        (r: any) => {
          console.log(`Verificando resultado:`, {
            status: r.status,
            hasSwagger: r.hasSwagger,
            url: r.url
          });
          return r.status === 'success' && r.hasSwagger;
        }
      );
      
      console.log('Resultado do Swagger encontrado:', swaggerResult ? 'Sim' : 'Não');
      
      if (swaggerResult) {
        console.log('Detalhes do Swagger encontrado:', {
          url: swaggerResult.url,
          hasSwagger: swaggerResult.hasSwagger,
          token: swaggerResult.token ? 'Token presente' : 'Token ausente',
          data: swaggerResult.data ? 'Dados presentes' : 'Sem dados'
        });
        
        // Pega o primeiro token JWT disponível
        const token = step2Result.results[0]?.token || '';
        
        try {
          console.log('Iniciando execução do Passo 3 com token:', token ? 'Token presente' : 'Token ausente');
          
          // Se o swagger não estiver diretamente no resultado, tenta buscar da URL
          if (!swaggerResult.data || typeof swaggerResult.data === 'string') {
            // Tenta construir a URL do Swagger baseada na URL da API
            const baseUrl = new URL(swaggerResult.url);
            const swaggerUrl = `${baseUrl.protocol}//${baseUrl.host}/rest/v1/`;
            
            console.log('Buscando dados completos do Swagger da URL:', swaggerUrl);
            try {
              const response = await axios.get(swaggerUrl, {
                headers: {
                  'Accept': 'application/json',
                  'apikey': token,
                  'Authorization': `Bearer ${swaggerResult.token || token}`
                },
                params: {
                  apikey: token // Algumas APIs podem exigir o token como query param
                }
              });
              
              if (response.data) {
                swaggerResult.data = response.data;
                console.log('Dados do Swagger obtidos com sucesso');
              } else {
                throw new Error('Resposta vazia da API do Swagger');
              }
            } catch (error) {
              console.error('Erro ao buscar dados do Swagger:', error);
              throw new Error(`Não foi possível obter os dados completos do Swagger: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          
          step3Result = await executeStep3(scanId, step1Result.domainName);
          console.log('Passo 3 concluído com sucesso');
          
          // Se o passo 3 foi bem-sucedido, salva os resultados do Passo 4
          if (step3Result?.success) {
            console.log('\n=== TENTANDO SALVAR RESULTADOS DO PASSO 4 ===');
            console.log(`- Domínio: ${step1Result.domainName}`);
            const outputPath = path.join(process.cwd(), 'public', 'scans', `${step1Result.domainName}-passo4.json`);
            console.log(`- Caminho do arquivo: ${outputPath}`);
            
            // Se já temos um resultado do webhook do Passo 3, usamos ele
            if ((step3Result as any)?.step4) {
              console.log('Usando resultado do webhook do Passo 3');
              await saveStep4Results(step1Result.domainName, (step3Result as any).step4);
            } else {
              // Se não, criamos um resultado básico com os dados disponíveis
              console.log('Criando resultado do Passo 4 com dados disponíveis');
              
              // Carrega os dados do passo 1
              const step1Path = path.join(process.cwd(), 'public', 'scans', `${step1Result.domainName}-passo1.json`);
              const step1Data = await fs.readFile(step1Path, 'utf-8');
              const step1Json = JSON.parse(step1Data);
              
              console.log(`Total de tabelas: ${step3Result.tables.length}`);
              step3Result.tables.forEach((table: any, index: number) => {
                console.log(`Tabela ${index + 1}:`, {
                  name: table.name,
                  path: table.path,
                  methods: table.methods,
                  columns: table.columns ? `${table.columns.length} colunas` : 'N/A',
                  rowCount: table.rowCount || 'N/A'
                });
              });
              
              // Prepara o payload com os dados processados
              const tabelasVazadas = step3Result.tables.length; // Número real de tabelas encontradas
              console.log(`Definindo tabelasVazadas como: ${tabelasVazadas}`);
              
              const payload = {
                tecnologiasDetectadas: step1Json.tecnologiasDetectadas || [],
                tokensJWT: step1Json.tokensJWT || [],
                chavesSensiveis: step1Json.chavesSensiveis || [],
                urlsBancoDados: step1Json.urlsBancoDados || [],
                urlsSuspeitas: step1Json.urlsSuspeitas || [],
                tabelasVazadas: tabelasVazadas
              };
              
              console.log('=== PAYLOAD ENVIADO PARA O WEBHOOK ===');
              console.log(JSON.stringify(payload, null, 2));
              
              // Processa os resultados do scan e a resposta do webhook
              const processedResults = processScanResults(
                step1Json, 
                { message: 'Dados processados com sucesso' },
                tabelasVazadas // Usando a mesma variável para garantir consistência
              );
              
              console.log('=== RESULTADO DO PROCESSAMENTO ===');
              console.log('Número de tabelas no processedResults:', processedResults.data?.scanResults.tabelasVazadas);
              
              console.log('Enviando dados para o webhook (Passo 3):', JSON.stringify(payload, null, 2));
              
              // Envia para o webhook
              const response = await axios.post(
                'https://rarwhk.rardevops.com/webhook/vulnerabilidade-scanshield',
                payload,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Scan-Id': scanId,
                    'X-Scan-Source': 'scanshield',
                    'X-Scan-Step': '3' // Indica que veio do passo 3
                  },
                  timeout: 30000 // 30 segundos de timeout
                }
              );
              
              console.log('✅ Dados enviados com sucesso para o webhook (Passo 3)');
              console.log(`Status: ${response.status} ${response.statusText}`);
              
              try {
                // Adiciona o resultado ao resultado do passo 3
                const webhookResult: WebhookResult = {
                  success: true,
                  message: 'Dados enviados com sucesso para o webhook',
                  statusCode: response.status,
                  data: response.data,
                  timestamp: new Date().toISOString()
                };
                
                // Garante que step3Result existe antes de tentar adicionar propriedades
                if (!step3Result) {
                  step3Result = { 
                    success: true, 
                    tables: [], 
                    rpcs: [],
                    scanId,
                    timestamp: new Date().toISOString()
                  } as unknown as Step3Result;
                }
                
                // Adiciona tanto no step4 (para compatibilidade) quanto no webhookResponse (para o Passo 4)
                (step3Result as Step3Result & { step4: WebhookResult }).step4 = webhookResult;
                (step3Result as Step3Result & { webhookResponse: any }).webhookResponse = response.data;
              } catch (error) {
                console.error('Erro ao processar resposta do webhook:', error);
                throw error; // Propaga o erro para ser tratado pelo bloco catch externo
              }
              
            } catch (webhookError) {
              console.error('❌ Erro ao enviar para o webhook (Passo 3):', webhookError);
              
              const errorMessage = webhookError instanceof Error ? webhookError.message : 'Erro desconhecido';
              const statusCode = (webhookError as any)?.response?.status || 500;
              const responseData = (webhookError as any)?.response?.data;
              
              // Adiciona o erro ao resultado do passo 3
              const webhookErrorResult: WebhookResult = {
                success: false,
                message: 'Falha ao enviar para o webhook',
                error: errorMessage,
                statusCode,
                data: responseData,
                timestamp: new Date().toISOString()
              };
              
              // Garante que step3Result existe
              if (!step3Result) {
                step3Result = { 
                  success: false, 
                  tables: [], 
                  rpcs: [],
                  scanId,
                  timestamp: new Date().toISOString()
                } as unknown as Step3Result;
              }
              
              // Atualiza o step3Result com o erro do webhook
              (step3Result as Step3Result & { step4: WebhookResult }).step4 = webhookErrorResult;
            }
          }
        } catch (error) {
          console.error('Erro ao executar Passo 3:', error);
          step3Result = {
            scanId,
            timestamp: new Date().toISOString(),
            success: false,
            error: `Erro ao executar Passo 3: ${error instanceof Error ? error.message : String(error)}`,
            tables: [],
            rpcs: []
          };
        }
      } else {
        console.log('Nenhum resultado de Swagger encontrado para processar no Passo 3');
      }
      
      // Verificação do Passo 4 (fallback)
      // Só executa se o passo 3 falhou e o passo 2 sinalizou para executar
      const shouldRunStep4 = !step3Result?.success && (step2Result as any)?.shouldRunStep4;
      
      console.log('\n=== VERIFICAÇÃO DO PASSO 4 (FALLBACK) ===');
      console.log(`- Deve executar o Passo 4 (fallback)? ${shouldRunStep4 ? '✅ Sim' : '❌ Não'}`);
      console.log(`- Passo 2 sinalizou para executar? ${(step2Result as any)?.shouldRunStep4 ? '✅ Sim' : '❌ Não'}`);
      console.log(`- Passo 3 foi bem-sucedido? ${step3Result?.success ? '✅ Sim' : '❌ Não'}`);
      
      // Garante que step3Result existe para evitar erros
      if (!step3Result) {
        step3Result = { 
          success: false, 
          tables: [], 
          rpcs: [],
          scanId,
          timestamp: new Date().toISOString()
        } as unknown as Step3Result;
      }
      
      // Função auxiliar para enviar para o webhook
      interface WebhookPayload {
        tecnologiasDetectadas: any[];
        tokensJWT: any[];
        chavesSensiveis: any[];
        urlsBancoDados: any[];
        urlsSuspeitas: any[];
        tabelasVazadas: number;
      }
      
      async function sendToWebhook(domainName: string, payload: WebhookPayload, step: '3' | '4' = '3'): Promise<WebhookResult> {
        try {
          console.log(`Enviando dados para o webhook (Passo ${step})...`);
          
          const webhookUrl = 'https://rarwhk.rardevops.com/webhook/vulnerabilidade-scanshield';
          const response = await axios.post(
            webhookUrl,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Scan-Id': scanId,
                'X-Scan-Source': 'scanshield',
                'X-Scan-Step': step
              },
              timeout: 30000
            }
          );
          
          console.log(`✅ Dados enviados com sucesso para o webhook (Passo ${step})`);
          console.log(`Status: ${response.status} ${response.statusText}`);
          
          // Processa os resultados do scan
          const processedResults = processScanResults(
            { 
              tecnologiasDetectadas: payload.tecnologiasDetectadas,
              tokensJWT: payload.tokensJWT,
              chavesSensiveis: payload.chavesSensiveis,
              urlsBancoDados: payload.urlsBancoDados,
              urlsSuspeitas: payload.urlsSuspeitas
            },
            { message: 'Dados processados com sucesso' },
            payload.tabelasVazadas
          );
          
          return {
            success: true,
            message: 'Dados enviados com sucesso para o webhook',
            statusCode: response.status,
            data: {
              ...response.data,
              processedResults
            },
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error(`❌ Erro ao enviar para o webhook (Passo ${step}):`, error);
          
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const statusCode = (error as any)?.response?.status || 500;
          const responseData = (error as any)?.response?.data;
          
          return {
            success: false,
            message: 'Falha ao enviar para o webhook',
            error: errorMessage,
            statusCode,
            data: responseData,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      if (shouldRunStep4) {
        console.log('\n=== INICIANDO EXECUÇÃO DO PASSO 4 (FALLBACK) ===');
        
        try {
          // Carrega os dados do passo 1
          const step1Path = path.join(process.cwd(), 'public', 'scans', `${step1Result.domainName}-passo1.json`);
          const step1Data = await fs.readFile(step1Path, 'utf-8');
          const step1Json = JSON.parse(step1Data);
          
          console.log('Dados do Passo 1 carregados (fallback)');
          
          // Cria um resultado básico para o passo 4 (sem informações de tabelas)
          const step4Result: Step4Result = {
            success: true,
            message: 'Dados processados em modo fallback (sem informações de tabelas)',
            statusCode: 200,
            data: {
              scanResults: {
                tecnologiasDetectadas: step1Json.tecnologiasDetectadas || [],
                tokensJWT: step1Json.tokensJWT || [],
                chavesSensiveis: step1Json.chavesSensiveis || [],
                urlsBancoDados: step1Json.urlsBancoDados || [],
                urlsSuspeitas: step1Json.urlsSuspeitas || [],
                tabelasVazadas: 0
              },
              webhookResponse: {
                message: 'Dados processados em modo fallback',
                tabelasVazadas: 0
              }
            },
            timestamp: new Date().toISOString()
          };
          
          // Salva os resultados do passo 4
          await saveStep4Results(step1Result.domainName, step4Result);
          console.log('✅ Resultados do Passo 4 (fallback) salvos com sucesso');
          
          // Envia para o webhook (opcional, se necessário)
          try {
            const payload = {
              tecnologiasDetectadas: step1Json.tecnologiasDetectadas || [],
              tokensJWT: step1Json.tokensJWT || [],
              chavesSensiveis: step1Json.chavesSensiveis || [],
              urlsBancoDados: step1Json.urlsBancoDados || [],
              urlsSuspeitas: step1Json.urlsSuspeitas || [],
              tabelasVazadas: 0
            };
            
            console.log('Enviando dados para o webhook (fallback)...');
            
            const webhookUrl = (step2Result as any)?.webhookUrl || 'https://rarwhk.rardevops.com/webhook/vulnerabilidade-scanshield';
            const response = await axios.post(
              webhookUrl,
              payload,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Scan-Id': scanId,
                  'X-Scan-Source': 'scanshield',
                  'X-Scan-Step': '4' // Indica que veio do passo 4 (fallback)
                },
                timeout: 30000
              }
            );
            
            console.log('✅ Dados enviados com sucesso para o webhook (fallback)');
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            // Atualiza o resultado com a resposta do webhook
            if (step4Result.data) {
              step4Result.data.webhookResponse = response.data;
              step4Result.statusCode = response.status;
            }
            
          } catch (error) {
            console.error('❌ Erro ao enviar para o webhook (fallback):', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            step4Result.error = errorMessage;
            step4Result.success = false;
            step4Result.message = 'Falha ao enviar para o webhook (fallback)';
            step4Result.statusCode = (error as any)?.response?.status || 500;
          }
          
          // Salva novamente com a resposta do webhook (se houve sucesso ou erro)
          await saveStep4Results(step1Result.domainName, step4Result);
          
          // Adiciona o resultado ao step3Result para retorno
          if (!step3Result) {
            step3Result = { 
              success: false, 
              tables: [], 
              rpcs: [],
              scanId,
              timestamp: new Date().toISOString()
            } as unknown as Step3Result;
          }
          (step3Result as Step3Result & { step4: Step4Result }).step4 = step4Result;
          
        } catch (error) {
          console.error('❌ Erro ao processar Passo 4 (fallback):', error);
        }
      } else {
        console.log('Nenhum dado do Swagger encontrado e passo 4 não foi sinalizado, pulando Passo 4');
      }
      
      // Prepara a resposta final
      const responseData = {
        success: true,
        scanId: step1Result.scanId,
        domainName: step1Result.domainName,
        sitesScanned: step1Result.sitesScanned,
        step1: {
          urlsSupabase: step1Result.scanJsonData.urlsSupabase,
          tokensJWT: step1Result.scanJsonData.tokensJWT,
          urlsApi: step1Result.scanJsonData.urlsApi,
          urlsGenericas: step1Result.scanJsonData.urlsGenericas,
          chavesSensiveis: step1Result.scanJsonData.chavesSensiveis,
          urlsBancoDados: step1Result.scanJsonData.urlsBancoDados,
          urlsSuspeitas: step1Result.scanJsonData.urlsSuspeitas,
          tecnologiasDetectadas: step1Result.scanJsonData.tecnologiasDetectadas
        },
        step2: {
          resultsCount: step2Result.results.length,
          results: step2Result.results,
          timestamp: step2Result.timestamp
        },
        step3: step3Result
      };
      
      console.log('Enviando resposta final:', JSON.stringify(responseData, null, 2));
      return NextResponse.json(responseData);
      
    } catch (error: any) {
      console.error('Erro durante o escaneamento:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro durante o escaneamento', 
          details: error.message 
        }, 
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao processar requisição', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
