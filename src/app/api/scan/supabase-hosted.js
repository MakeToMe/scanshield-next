// Funções para detecção e consulta de tabelas do Supabase hospedado

/**
 * Verifica se uma URL é do Supabase (incluindo instâncias hospedadas)
 * @param {string} url - URL a ser verificada
 * @returns {boolean} - Verdadeiro se for uma URL do Supabase
 */
function isSupabaseUrl(url) {
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

/**
 * Verifica se uma URL é especificamente do Supabase hospedado
 * @param {string} url - URL a ser verificada
 * @returns {boolean} - Verdadeiro se for uma URL do Supabase hospedado
 */
function isHostedSupabaseUrl(url) {
  try {
    return url.includes('studio.rardevops.com');
  } catch (e) {
    return false;
  }
}

/**
 * Extrai o domínio base de uma URL
 * @param {string} url - URL completa
 * @returns {string} - Domínio base da URL
 */
function extractBaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    console.error(`URL inválida: ${url}`);
    return url;
  }
}

/**
 * Consulta tabelas do Supabase hospedado
 * @param {string} baseUrl - URL base do Supabase
 * @param {string} jwtToken - Token JWT para autenticação
 * @returns {Promise<Array>} - Lista de tabelas encontradas
 */
async function queryHostedSupabaseTables(baseUrl, jwtToken) {
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
      const tables = [];
      
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

/**
 * Processa URLs do Supabase hospedado e consulta suas tabelas
 * @param {Array<string>} apiUrls - Lista de URLs da API
 * @param {Array<string>} jwtMatches - Lista de tokens JWT
 * @param {Array} tableData - Lista de tabelas já encontradas
 * @param {Object} fs - Módulo fs para operações de arquivo
 * @param {Object} path - Módulo path para manipulação de caminhos
 * @returns {Promise<Array>} - Lista atualizada de tabelas
 */
async function processHostedSupabaseUrls(apiUrls, jwtMatches, tableData, fs, path) {
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

module.exports = {
  isSupabaseUrl,
  isHostedSupabaseUrl,
  extractBaseUrl,
  queryHostedSupabaseTables,
  processHostedSupabaseUrls
};
