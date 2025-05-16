import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { ScanJsonData } from '../types';
import { Step4Result, saveStep4Results } from './step4-send-webhook';
import { saveJsonToFile } from '../utils/file-utils';

/**
 * Tipos para a estrutura do Swagger/OpenAPI
 */
export interface SwaggerPathItem {
  get?: any;
  post?: any;
  put?: any;
  delete?: any;
  patch?: any;
  parameters?: any[];
  tags?: string[];
  [key: string]: any;
}

export interface SwaggerDefinition {
  paths: {
    [path: string]: SwaggerPathItem;
  };
  definitions?: {
    [key: string]: any;
  };
  [key: string]: any;
}

export interface TableInfo {
  name: string;
  path: string;
  methods: string[];
  columns?: string[];
  columnCount?: number;
  rowCount?: number;
  isEstimate?: boolean;
  rlsWarning?: string;
  error?: string;
}

export interface RpcInfo {
  name: string;
  path: string;
  method: string;
  parameters?: any[];
}

/**
 * Lista de prefixos que indicam que um path é uma RPC
 */
const RPC_PATH_PREFIXES = [
  '/rpc/',
  '/api/rpc/'
];

/**
 * Lista de prefixos que indicam que um nome é uma RPC
 */
const RPC_NAME_PATTERNS = [
  /^fn_/i,
  /^rpc_/i,
  /^function_/i,
  /^proc_/i,
  /^sp_/i,
  /^usp_/i,
  /^pkg_/i,
  /_fn$/i,
  /_rpc$/i,
  /_function$/i,
  /_proc$/i,
  /_sp$/i,
  /_usp$/
];

/**
 * Lista de tags que indicam que um path é uma RPC
 */
const RPC_TAGS = [
  'rpc',
  'function',
  'procedure',
  'stored-procedure'
];

/**
 * Verifica se um caminho é uma RPC baseado no path
 */
function isRpcPath(path: string): boolean {
  if (!path) return false;
  return RPC_PATH_PREFIXES.some(prefix => path.toLowerCase().startsWith(prefix.toLowerCase()));
}

/**
 * Verifica se um nome parece ser uma RPC
 */
function isRpcName(name: string): boolean {
  if (!name) return false;
  return RPC_NAME_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Verifica se as tags indicam que é uma RPC
 */
function hasRpcTags(tags: string[]): boolean {
  if (!tags || !Array.isArray(tags)) return false;
  return tags.some(tag => RPC_TAGS.includes(tag.toLowerCase()));
}

/**
 * Extrai o nome da tabela ou RPC de um path
 */
function extractNameFromPath(path: string, isRpc: boolean): string {
  if (isRpc) {
    // Para RPCs, pega o último segmento do path
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1];
  } else {
    // Para tabelas, pega o último segmento não-parametrizado
    const parts = path.split('/').filter(p => !p.startsWith('{'));
    return parts[parts.length - 1];
  }
}

/**
 * Extrai colunas da definição da tabela
 */
function extractColumns(definition: any): string[] {
  if (!definition?.properties) return [];
  return Object.keys(definition.properties);
}

export interface WebhookResult {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface Step3Result {
  scanId: string;
  timestamp: string;
  success: boolean;
  tables: TableInfo[];
  rpcs: RpcInfo[];
  error?: string;
  webhookResponse?: any; // Resposta do webhook
  step4?: WebhookResult; // Resultado do webhook (opcional)
}

/**
 * Obtém a contagem de linhas de uma tabela
 */
async function getTableRowCount(apiUrl: string, tablePath: string, token: string): Promise<{ count?: number; error?: string; isEstimate?: boolean }> {
  try {
    // Remove a barra inicial do path se existir
    const cleanPath = tablePath.startsWith('/') ? tablePath.substring(1) : tablePath;
    const tableName = cleanPath.split('?')[0]; // Remove parâmetros de query se existirem
    
    // Tenta primeiro obter a estimativa da visão de estatísticas
    const estimateQuery = `
      SELECT 
        n_live_tup as estimate
      FROM 
        pg_stat_user_tables 
      WHERE 
        schemaname = 'public'
        AND relname = '${tableName}'
    `;
    
    // Constrói a URL para executar a query SQL personalizada
    const url = `${apiUrl.replace(/\/$/, '')}/rest/v1/rpc/pg_query`;
    
    const response = await axios.post<Array<{ estimate: number }>>(
      url,
      { query: estimateQuery },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': token,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'single-object'
        },
        validateStatus: () => true // Aceita todos os códigos de status
      }
    );

    // Verifica se a resposta tem o formato esperado
    if (response.status === 200 && response.data && response.data[0]?.estimate !== undefined) {
      return { 
        count: Math.max(0, Math.round(response.data[0].estimate)),
        isEstimate: true
      };
    }
    
    // Se a estimativa falhar, tenta o método alternativo
    console.log(`Falha ao obter estimativa para ${tableName}, tentando método alternativo...`);
    
    // Tenta obter a estimativa usando a visão pg_statio_user_tables
    const altEstimateQuery = `
      SELECT 
        reltuples::bigint as estimate
      FROM 
        pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE 
        n.nspname = 'public' 
        AND c.relname = '${tableName}'
    `;
    
    try {
      const altResponse = await axios.post<Array<{ estimate: number }>>(
        `${apiUrl.replace(/\/$/, '')}/rest/v1/rpc/pg_query`,
        { query: altEstimateQuery },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'single-object'
          },
          validateStatus: () => true,
          timeout: 2000
        }
      );

      if (altResponse.status === 200 && altResponse.data?.[0]?.estimate) {
        return { 
          count: Math.max(0, Math.round(altResponse.data[0].estimate)),
          isEstimate: true
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Método alternativo falhou para ${tableName}:`, errorMessage);
    }
    
    // Se todos os métodos de estimativa falharem, tenta a contagem direta
    console.log(`Todos os métodos de estimativa falharam para ${tableName}, tentando contagem direta...`);
    const countUrl = `${apiUrl.replace(/\/$/, '')}/rest/v1/${cleanPath}?select=count&limit=1`;
    const countResponse = await axios.get<Array<{ count: number }>>(countUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      },
      validateStatus: () => true,
      timeout: 5000 // Timeout curto para não travar
    });

    // Tenta extrair do header Content-Range como fallback
    const contentRange = countResponse.headers['content-range'];
    if (contentRange) {
      const match = contentRange.match(/(\d+)$/);
      if (match && match[1]) {
        return { 
          count: parseInt(match[1], 10),
          isEstimate: false
        };
      }
    }

    return { 
      error: `Tabela ${tableName}: não foi possível estimar o número de linhas`,
      isEstimate: false
    };
  } catch (error) {
    console.error(`Erro ao estimar linhas da tabela ${tablePath}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      isEstimate: false
    };
  }
}

/**
 * Extrai informações de tabelas e RPCs do JSON do Swagger/OpenAPI
 * @param swaggerData Dados do Swagger/OpenAPI
 * @returns Objeto com tabelas e RPCs encontrados
 */
async function extractFromSwagger(
  swaggerData: SwaggerDefinition,
  apiUrl?: string,
  token?: string
): Promise<{ tables: TableInfo[]; rpcs: RpcInfo[] }> {
  const tables = new Map<string, TableInfo>();
  const rpcs = new Map<string, RpcInfo>();

  // Processa todos os paths
  Object.entries(swaggerData.paths).forEach(([path, pathItem]) => {
    const isRpc = isRpcPath(path);
    
    // Processa cada método HTTP no path
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) return;
      
      const op = operation as any;
      const name = extractNameFromPath(path, isRpc);
      
      // Verifica se é uma RPC baseado em tags ou nome
      const isRpcByTags = hasRpcTags(op.tags || []);
      const isRpcByName = isRpcName(name);
      
      if (isRpc || isRpcByTags || isRpcByName) {
        // É uma RPC
        rpcs.set(`${method.toUpperCase()} ${path}`, {
          name,
          path,
          method: method.toUpperCase(),
          parameters: op.parameters
        });
      } else if (method === 'get' && !isRpc) {
        // É uma possível tabela (GET em um path que não é RPC)
        if (!tables.has(name)) {
          tables.set(name, {
            name,
            path,
            methods: [method.toUpperCase()],
            columns: []
          });
        } else {
          // Adiciona o método à tabela existente
          const table = tables.get(name)!;
          if (!table.methods.includes(method.toUpperCase())) {
            table.methods.push(method.toUpperCase());
          }
        }
      }
    });
  });

  // Tenta extrair colunas das definições (schemas)
  if (swaggerData.definitions) {
    Object.entries(swaggerData.definitions).forEach(([name, schema]) => {
      // Remove sufixos comuns de nomes de tabela
      const cleanName = name.replace(/(_?tbl|_?table|_?entidade|_?entity|_?model)$/i, '');
      
      // Se for uma definição de tabela e não for uma RPC
      if (!isRpcName(cleanName) && schema.type === 'object' && tables.has(cleanName)) {
        const table = tables.get(cleanName)!;
        table.columns = extractColumns(schema);
        table.columnCount = table.columns.length;
      }
    });
  }

  // Converte para arrays e ordena
  let sortedTables = Array.from(tables.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  const sortedRpcs = Array.from(rpcs.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Filtra tabelas sem nome
  sortedTables = sortedTables.filter(table => table.name && table.name.trim() !== '');

  // Se tivermos a URL da API e um token, buscamos a contagem de linhas
  if (apiUrl && token) {
    console.log('\n=== CONTAGEM DE LINHAS DAS TABELAS ===');
    
    // Processa em lotes para não sobrecarregar a API
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < sortedTables.length; i += BATCH_SIZE) {
      const batch = sortedTables.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (table) => {
        const startTime = Date.now();
        const { count, error, isEstimate } = await getTableRowCount(apiUrl, table.path, token);
        const elapsed = Date.now() - startTime;
        
        if (count !== undefined) {
          table.rowCount = count;
          table.isEstimate = isEstimate;
          const estimateSuffix = isEstimate ? ' (estimado)' : '';
          
          // Verifica se pode ser RLS (Row Level Security)
          const possibleRLS = (count === 0 && !isEstimate) ? ' (pode estar protegida por RLS)' : '';
          
          console.log(`✅ ${table.name}: ${count.toLocaleString('pt-BR')} linhas${estimateSuffix}${possibleRLS} (${elapsed}ms)`);
          
          // Adiciona aviso no objeto da tabela se for possível RLS
          if (count === 0 && !isEstimate) {
            table.rlsWarning = 'Esta tabela pode estar protegida por RLS (Row Level Security)';
          }
        } else {
          table.error = error || 'Erro desconhecido';
          console.error(`❌ ${table.name}: ${table.error} (${elapsed}ms)`);
        }
      }));
      
      // Pequena pausa entre lotes
      if (i + BATCH_SIZE < sortedTables.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Estatísticas finais
    const validTables = sortedTables.filter(t => t.rowCount !== undefined);
    const totalRows = validTables.reduce((sum, t) => sum + (t.rowCount || 0), 0);
    const estimatedTables = validTables.filter(t => t.isEstimate).length;
    
    console.log('\n📊 ESTATÍSTICAS DAS TABELAS:');
    validTables.forEach(table => {
      const estimateSuffix = table.isEstimate ? ' (estimado)' : '';
      console.log(`- ${table.name}: ${table.rowCount?.toLocaleString('pt-BR').padEnd(10)} linhas${estimateSuffix}`);
    });
    
    if (estimatedTables > 0) {
      console.log(`\nℹ️  ${estimatedTables} tabela(s) com contagem estimada (para melhorar a precisão, execute VACUUM ANALYZE no banco de dados)`);
    }
    
    console.log(`\n📊 Total de registros nas tabelas: ${totalRows.toLocaleString('pt-BR')}`);
  } else if (apiUrl) {
    console.log('\n⚠️  Token JWT não fornecido, pulando contagem de linhas');
  } else {
    console.log('\n⚠️  URL da API não disponível, pulping contagem de linhas');
  }

  return {
    tables: sortedTables,
    rpcs: sortedRpcs
  };
}

/**
 * Executa o Passo 3: Extrai tabelas e RPCs do JSON do Swagger
 * @param scanId ID do escaneamento
 * @param domainName Nome do domínio (para nome do arquivo)
 * @returns Resultado do Passo 3
 */
export async function executeStep3(scanId: string, domainName: string): Promise<Step3Result> {
  try {
    console.log(`Executando Passo 3 para ${domainName}...`);
    
    // Carrega os resultados do Passo 2
    const step2Path = path.join(process.cwd(), 'public', 'scans', `${domainName}-passo2.json`);
    const step2Data = JSON.parse(await fs.readFile(step2Path, 'utf-8'));
    
    if (!step2Data.success || !step2Data.results?.length) {
      throw new Error('Nenhum resultado válido encontrado no Passo 2');
    }

    // Encontra o primeiro resultado com dados do Swagger
    const swaggerResult = step2Data.results.find((r: any) => r.hasSwagger);
    if (!swaggerResult) {
      throw new Error('Nenhum endpoint com Swagger encontrado no Passo 2');
    }

    // Extrai informações do Swagger
    const { tables, rpcs } = await extractFromSwagger(
      swaggerResult.data as SwaggerDefinition,
      step2Data.results[0]?.url, // URL da API
      step2Data.results[0]?.token // Token JWT
    );

    // Cria o resultado
    const result: Step3Result = {
      scanId,
      timestamp: new Date().toISOString(),
      success: true,
      tables,
      rpcs
    };

    // Salva os resultados do Passo 3
    const fileName = `${domainName}-passo3.json`;
    const filePath = path.join(process.cwd(), 'public', 'scans', fileName);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Resultados do Passo 3 salvos em: ${filePath}`);
    
    // Se o webhook foi chamado com sucesso, salva os resultados do Passo 4
    if (result.webhookResponse) {
      console.log('\n=== SALVANDO RESULTADOS DO WEBHOOK (PASSO 4) ===');
      try {
        // Carrega os dados do passo 1 para incluir no resultado final
        const step1Path = path.join(process.cwd(), 'public', 'scans', `${domainName}-passo1.json`);
        const step1Data = await fs.readFile(step1Path, 'utf-8');
        const step1Json = JSON.parse(step1Data);
        
        const step4Result: Step4Result = {
          success: true,
          message: 'Dados enviados com sucesso para o webhook a partir do Passo 3',
          statusCode: 200,
          data: {
            scanResults: {
              tecnologiasDetectadas: step1Json.tecnologiasDetectadas || [],
              tokensJWT: step1Json.tokensJWT || [],
              chavesSensiveis: step1Json.chavesSensiveis || [],
              urlsBancoDados: step1Json.urlsBancoDados || [],
              urlsSuspeitas: step1Json.urlsSuspeitas || [],
              tabelasVazadas: result.tables?.length || 0
            },
            webhookResponse: result.webhookResponse
          },
          timestamp: new Date().toISOString()
        };
        
        const savedFilePath = await saveStep4Results(domainName, step4Result);
        console.log(`✅ Resultados do webhook (Passo 4) salvos em: ${savedFilePath}`);
      } catch (error) {
        console.error('❌ Erro ao salvar resultados do webhook (Passo 4):', error);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao executar o Passo 3:', error);
    
    const errorResult: Step3Result = {
      scanId,
      timestamp: new Date().toISOString(),
      success: false,
      tables: [],
      rpcs: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };

    // Salva o erro
    await saveJsonToFile(domainName, errorResult, { step: 3 });
    
    return errorResult;
  }
}
