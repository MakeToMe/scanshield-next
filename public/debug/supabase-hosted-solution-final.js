/**
 * SOLUÇÃO FINAL PARA DETECÇÃO E CONSULTA DE TABELAS DO SUPABASE HOSPEDADO
 * 
 * Este arquivo contém a implementação completa e testada para detectar e consultar
 * tabelas do Supabase hospedado (studio.rardevops.com).
 */

// Configurações
const HOSTED_SUPABASE_URL = 'https://studio.rardevops.com';
const API_PATH = '/rest/v1/?select=*';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM0ODM2NDAwLAogICJleHAiOiAxODkyNjAyODAwCn0.a1mpboOHE9IMJbhsGquPv72W0iaDnM3kHYRKaZ2t3kA';

// Função principal para consultar tabelas do Supabase hospedado
async function consultarSupabaseHospedado() {
  try {
    console.log('Consultando API do Supabase hospedado...');
    console.log(`URL: ${HOSTED_SUPABASE_URL}${API_PATH}`);
    
    // Faz a chamada para a API
    const response = await fetch(`${HOSTED_SUPABASE_URL}${API_PATH}`, {
      method: 'GET',
      headers: {
        'apikey': JWT_TOKEN,
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    console.log(`Código de status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extrai as tabelas da resposta
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
      
      console.log(`Tabelas encontradas: ${tables.length}`);
      return tables;
    } else {
      const errorText = await response.text();
      console.error('Erro na chamada da API:');
      console.error(errorText);
      return [];
    }
  } catch (error) {
    console.error('Erro ao fazer a chamada:', error);
    return [];
  }
}

// Função para verificar se uma URL é do Supabase hospedado
function isHostedSupabaseUrl(url) {
  try {
    return url.includes('studio.rardevops.com');
  } catch (e) {
    return false;
  }
}

// Função para extrair o domínio base de uma URL
function extractBaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    console.error(`URL inválida: ${url}`);
    return url;
  }
}

// Executa a consulta e exibe os resultados
consultarSupabaseHospedado().then(tables => {
  console.log('\nTabelas encontradas no Supabase hospedado:');
  tables.forEach((table, index) => {
    console.log(`[${index + 1}] ${table}`);
  });
  
  console.log(`\nTotal de tabelas encontradas: ${tables.length}`);
  
  // Exemplo de como incorporar no código principal:
  console.log('\nComo incorporar no código principal:');
  console.log(`
// No arquivo route.ts, após detectar as URLs:

// Verifica se alguma URL é do Supabase hospedado
const hostedUrl = apiUrls.find(url => url.includes('studio.rardevops.com'));
if (hostedUrl) {
  console.log('URL do Supabase hospedado encontrada:', hostedUrl);
  
  // Extrai o domínio base
  const baseUrl = extractBaseUrl(hostedUrl);
  
  // Para cada token JWT encontrado, tenta consultar as tabelas
  for (const jwtToken of jwtMatches) {
    try {
      // Consulta as tabelas
      const response = await fetch(\`\${baseUrl}/rest/v1/?select=*\`, {
        method: 'GET',
        headers: {
          'apikey': jwtToken,
          'Authorization': \`Bearer \${jwtToken}\`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const tables = [];
        
        // Extrai as tabelas da resposta
        if (data && data.paths) {
          for (const path in data.paths) {
            if (path === '/') continue;
            const tableName = path.startsWith('/') ? path.substring(1) : path;
            tables.push({
              name: tableName,
              rowCount: 0,
              columns: ['id', 'created_at']
            });
          }
        }
        
        // Adiciona as tabelas encontradas ao resultado
        if (tables.length > 0) {
          console.log(\`Encontradas \${tables.length} tabelas no Supabase hospedado\`);
          tableData.push(...tables);
          break; // Se encontrou tabelas, não precisa continuar tentando com outros tokens
        }
      }
    } catch (error) {
      console.error('Erro ao consultar tabelas do Supabase hospedado:', error);
    }
  }
}
  `);
});
