import fs from 'fs';
import path from 'path';

// Interface para representar uma tabela
interface TableData {
  name: string;
  rowCount: number;
  columns: string[];
}

// Verifica se uma URL é do Supabase (incluindo instâncias hospedadas)
function isSupabaseUrl(url: string): boolean {
  try {
    // Verifica domínios conhecidos do Supabase
    if (url.includes('supabase')) return true;
    if (url.includes('studio.rardevops.com')) return true;
    
    // Verifica caminhos típicos da API do Supabase
    const urlObj = new URL(url);
    const supabasePaths = ['/rest/v1', '/auth/v1', '/realtime/v1', '/storage/v1', '/functions/v1'];
    if (supabasePaths.some(path => urlObj.pathname.startsWith(path))) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}

// Verifica se uma URL é especificamente do Supabase hospedado
function isHostedSupabaseUrl(url: string): boolean {
  try {
    return url.includes('studio.rardevops.com');
  } catch (e) {
    return false;
  }
}

// Função para extrair o domínio base de uma URL
function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    console.error(`URL inválida: ${url}`);
    return url;
  }
}

// Função específica para consultar tabelas do Supabase hospedado
async function queryHostedSupabaseTables(baseUrl: string, jwtToken: string): Promise<TableData[]> {
  try {
    console.log(`Consultando tabelas do Supabase hospedado em: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/rest/v1/?select=*`, {
      method: 'GET',
      headers: {
        'apikey': jwtToken,
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    console.log(`Código de status da resposta: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      const tables: TableData[] = [];
      
      if (data && data.paths) {
        for (const path in data.paths) {
          // Ignora o path raiz "/"
          if (path === '/') continue;
          
          // Remove a barra inicial para obter o nome da tabela
          const tableName = path.startsWith('/') ? path.substring(1) : path;
          tables.push({
            name: tableName,
            rowCount: 0,
            columns: ['id', 'created_at']
          });
        }
      }
      
      console.log(`Tabelas encontradas no Supabase hospedado: ${tables.length}`);
      return tables;
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao consultar tabelas do Supabase hospedado:', error);
    return [];
  }
}

// Função principal para processar URLs do Supabase hospedado
export async function processHostedSupabaseUrls(
  apiUrls: string[], 
  jwtMatches: string[]
): Promise<TableData[]> {
  const tableData: TableData[] = [];
  
  // Filtra URLs do Supabase
  console.log('Verificando URLs do Supabase...');
  const supabaseUrls = apiUrls.filter(url => {
    const isSupabase = isSupabaseUrl(url);
    console.log(`URL: ${url} - É Supabase? ${isSupabase}`);
    return isSupabase;
  });
  console.log('URLs do Supabase encontradas:', supabaseUrls);
  
  // Verifica especificamente a URL do Supabase hospedado
  const hostedUrl = supabaseUrls.find(url => isHostedSupabaseUrl(url));
  if (hostedUrl) {
    console.log('URL do Supabase hospedado encontrada:', hostedUrl);
    
    // Cria um arquivo de log específico para a URL do Supabase hospedado
    try {
      const debugDir = path.join(process.cwd(), 'public', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const logContent = `URL DO SUPABASE HOSPEDADO ENCONTRADA\n\nURL: ${hostedUrl}\n\nTOKENS JWT:\n${jwtMatches.join('\n')}\n`;
      
      fs.writeFileSync(
        path.join(debugDir, 'hosted-supabase-detection.txt'),
        logContent,
        'utf8'
      );
    } catch (logError) {
      console.error('Erro ao criar arquivo de log para Supabase hospedado:', logError);
    }
    
    // Tenta consultar as tabelas do Supabase hospedado
    for (const jwtToken of jwtMatches) {
      try {
        // Limpa a URL para obter apenas o domínio base
        const baseUrl = extractBaseUrl(hostedUrl);
        
        console.log(`Tentando consultar tabelas do Supabase hospedado em ${baseUrl} com token JWT`);
        
        // Consulta as tabelas usando a função específica para o Supabase hospedado
        const hostedTables = await queryHostedSupabaseTables(baseUrl, jwtToken);
        
        if (hostedTables.length > 0) {
          console.log(`Encontradas ${hostedTables.length} tabelas no Supabase hospedado`);
          
          // Adiciona as tabelas encontradas ao resultado
          tableData.push(...hostedTables);
          
          // Cria um arquivo com as tabelas encontradas
          try {
            const debugDir = path.join(process.cwd(), 'public', 'debug');
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            const tableNames = hostedTables.map(t => t.name);
            fs.writeFileSync(
              path.join(debugDir, 'hosted-supabase-tables.txt'),
              `TABELAS ENCONTRADAS NO SUPABASE HOSPEDADO\n\nURL: ${baseUrl}\n\nTABELAS:\n${tableNames.join('\n')}\n`,
              'utf8'
            );
          } catch (tableLogError) {
            console.error('Erro ao criar arquivo de log para tabelas do Supabase hospedado:', tableLogError);
          }
          
          // Se encontrou tabelas, não precisa continuar tentando com outros tokens
          break;
        }
      } catch (error) {
        console.error('Erro ao consultar tabelas do Supabase hospedado:', error);
      }
    }
  }
  
  return tableData;
}

// Função para testar a detecção e consulta de tabelas do Supabase hospedado
export async function testHostedSupabaseDetection(): Promise<void> {
  // URLs de teste
  const apiUrls = [
    'https://studio.rardevops.com/rest/v1',
    'https://example.supabase.co/rest/v1',
    'https://api.example.com/data'
  ];
  
  // Tokens JWT de teste (substitua por tokens reais para teste)
  const jwtMatches = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  ];
  
  // Processa as URLs
  const tables = await processHostedSupabaseUrls(apiUrls, jwtMatches);
  
  // Exibe o resultado
  console.log('Tabelas encontradas:', tables);
}

// Executa o teste se este arquivo for executado diretamente
if (require.main === module) {
  testHostedSupabaseDetection()
    .then(() => console.log('Teste concluído!'))
    .catch(error => console.error('Erro no teste:', error));
}
