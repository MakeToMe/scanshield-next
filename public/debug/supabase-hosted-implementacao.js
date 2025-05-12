/**
 * SOLUÇÃO PARA DETECÇÃO E CONSULTA DE TABELAS DO SUPABASE HOSPEDADO
 * 
 * Este arquivo contém a implementação completa das funções necessárias para
 * detectar e consultar tabelas do Supabase hospedado (studio.rardevops.com).
 * 
 * Instruções de implementação:
 * 1. Copie as funções abaixo para o arquivo route.ts
 * 2. Substitua a função isSupabaseUrl existente pela versão melhorada
 * 3. Adicione a lógica específica para o Supabase hospedado no código de detecção
 */

// Verifica se uma URL é do Supabase (incluindo instâncias hospedadas)
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

// Verifica se uma URL é especificamente do Supabase hospedado
function isHostedSupabaseUrl(url) {
  try {
    return url.includes('studio.rardevops.com');
  } catch (e) {
    return false;
  }
}

// Função específica para consultar tabelas do Supabase hospedado
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
          tables.push(tableName);
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
 * IMPLEMENTAÇÃO NO CÓDIGO PRINCIPAL
 * 
 * Adicione o seguinte código no bloco onde são detectadas as URLs do Supabase:
 */

/*
// Se encontrou URLs do Supabase e tokens JWT, tenta consultar diretamente a API do Supabase
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
    
    const logContent = `URL DO SUPABASE HOSPEDADO ENCONTRADA\n\nURL: ${hostedUrl}\n\nTOKENS JWT:\n${jwtTokensRaw.join('\n')}\n`;
    
    fs.writeFileSync(
      path.join(debugDir, 'hosted-supabase-detection.txt'),
      logContent,
      'utf8'
    );
  } catch (logError) {
    console.error('Erro ao criar arquivo de log para Supabase hospedado:', logError);
  }
  
  // Tenta consultar as tabelas do Supabase hospedado
  for (const jwtToken of jwtTokensRaw) {
    try {
      // Limpa a URL para obter apenas o domínio base
      let baseUrl = hostedUrl;
      try {
        const urlObj = new URL(hostedUrl);
        baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      } catch (e) {
        console.error(`URL inválida: ${hostedUrl}`);
        continue;
      }
      
      console.log(`Tentando consultar tabelas do Supabase hospedado em ${baseUrl} com token JWT`);
      
      // Consulta as tabelas usando a função específica para o Supabase hospedado
      const tables = await queryHostedSupabaseTables(baseUrl, jwtToken);
      
      if (tables.length > 0) {
        console.log(`Encontradas ${tables.length} tabelas no Supabase hospedado`);
        
        // Adiciona as tabelas encontradas ao resultado
        const tableData = tables.map(table => ({
          name: table,
          type: 'table',
          source: baseUrl
        }));
        
        // Adiciona as tabelas ao resultado
        results.tables.push(...tableData);
        
        // Cria um arquivo com as tabelas encontradas
        try {
          fs.writeFileSync(
            path.join(debugDir, 'hosted-supabase-tables.txt'),
            `TABELAS ENCONTRADAS NO SUPABASE HOSPEDADO\n\nURL: ${baseUrl}\n\nTABELAS:\n${tables.join('\n')}\n`,
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
*/
