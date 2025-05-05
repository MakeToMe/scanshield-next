import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Normaliza a URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Inicia o navegador
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Configura timeout para navegação
      page.setDefaultNavigationTimeout(30000);

      // Intercepta requisições de rede
      const apiUrls: string[] = [];
      const keysFound: string[] = [];
      const urlsFound: string[] = [];

      // Listener para requisições de rede
      page.on('request', (request) => {
        const url = request.url();
        urlsFound.push(url);

        // Detecta URLs de API Supabase
        if (url.includes('supabase.co') || url.includes('supabase.in')) {
          if (!apiUrls.includes(url)) {
            apiUrls.push(url);
          }
        }

        // Detecta chaves potenciais em URLs
        const potentialKeys = [
          { pattern: /key=([a-zA-Z0-9._-]+)/, name: 'API Key' },
          { pattern: /token=([a-zA-Z0-9._-]+)/, name: 'Token' },
          { pattern: /apikey=([a-zA-Z0-9._-]+)/i, name: 'API Key' },
          { pattern: /auth=([a-zA-Z0-9._-]+)/, name: 'Auth' },
          { pattern: /password=([a-zA-Z0-9._-]+)/, name: 'Password' },
        ];

        potentialKeys.forEach(({ pattern, name }) => {
          const match = url.match(pattern);
          if (match && match[1]) {
            const key = `${name}: ${match[1].substring(0, 10)}...`;
            if (!keysFound.includes(key)) {
              keysFound.push(key);
            }
          }
        });
      });

      // Navega para a URL
      try {
        await page.goto(normalizedUrl, { waitUntil: 'networkidle' });
      } catch (error: any) {
        // Verifica se é um erro 404
        if (error.message.includes('404')) {
          await browser.close();
          return NextResponse.json({ error: '404 - Página não encontrada' }, { status: 404 });
        }
        
        // Outros erros de navegação
        console.error('Erro de navegação:', error);
        await browser.close();
        return NextResponse.json({ error: `Erro ao acessar a URL: ${error.message}` }, { status: 500 });
      }

      // Executa script para encontrar tabelas Supabase
      let tableData = await page.evaluate(() => {
        // Função para verificar se um objeto parece uma tabela
        function looksLikeTable(obj: any) {
          return obj && 
                 typeof obj === 'object' && 
                 !Array.isArray(obj) && 
                 obj.data && 
                 Array.isArray(obj.data) && 
                 obj.data.length > 0 && 
                 typeof obj.data[0] === 'object';
        }

        // Função para verificar se um array parece conter dados de tabela
        function looksLikeTableData(arr: any[]) {
          return arr.length > 0 && 
                 typeof arr[0] === 'object' && 
                 arr[0] !== null && 
                 Object.keys(arr[0]).length >= 2;
        }

        const tables: any[] = [];
        const processedObjects = new Set();
        
        // Procura por objetos window que possam conter dados do Supabase
        try {
          // Procura por objetos no escopo global
          for (const key in window) {
            try {
              // @ts-ignore
              const value = window[key];
              
              // Evita processar o mesmo objeto duas vezes
              if (processedObjects.has(value)) continue;
              processedObjects.add(value);
              
              // Verifica arrays que podem ser dados de tabela
              if (Array.isArray(value) && looksLikeTableData(value)) {
                tables.push({
                  name: key,
                  rowCount: value.length,
                  columns: Object.keys(value[0]),
                });
                continue;
              }
              
              // Verifica objetos que podem ser tabelas do Supabase
              if (looksLikeTable(value)) {
                tables.push({
                  name: key,
                  rowCount: value.data.length,
                  columns: Object.keys(value.data[0]),
                });
                continue;
              }
              
              // Procura mais profundamente em objetos
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                for (const subKey in value) {
                  try {
                    const subValue = value[subKey];
                    
                    // Evita processar o mesmo objeto duas vezes
                    if (processedObjects.has(subValue)) continue;
                    processedObjects.add(subValue);
                    
                    // Verifica arrays que podem ser dados de tabela
                    if (Array.isArray(subValue) && looksLikeTableData(subValue)) {
                      tables.push({
                        name: `${key}.${subKey}`,
                        rowCount: subValue.length,
                        columns: Object.keys(subValue[0]),
                      });
                      continue;
                    }
                    
                    // Verifica objetos que podem ser tabelas do Supabase
                    if (looksLikeTable(subValue)) {
                      tables.push({
                        name: `${key}.${subKey}`,
                        rowCount: subValue.data.length,
                        columns: Object.keys(subValue.data[0]),
                      });
                    }
                  } catch (e) {
                    // Ignora erros ao acessar propriedades
                    continue;
                  }
                }
              }
            } catch (e) {
              // Ignora erros ao acessar propriedades
              continue;
            }
          }
          
          // Procura por dados em localStorage
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (!key) continue;
              
              try {
                const value = JSON.parse(localStorage.getItem(key) || '');
                
                // Verifica arrays que podem ser dados de tabela
                if (Array.isArray(value) && looksLikeTableData(value)) {
                  tables.push({
                    name: `localStorage.${key}`,
                    rowCount: value.length,
                    columns: Object.keys(value[0]),
                  });
                }
                
                // Verifica objetos que podem ser tabelas do Supabase
                if (looksLikeTable(value)) {
                  tables.push({
                    name: `localStorage.${key}`,
                    rowCount: value.data.length,
                    columns: Object.keys(value.data[0]),
                  });
                }
              } catch (e) {
                // Ignora erros ao parsear JSON
                continue;
              }
            }
          } catch (e) {
            // Ignora erros ao acessar localStorage
          }
        } catch (e) {
          console.error('Erro ao analisar objetos:', e);
        }
        
        return tables;
      });

      // Captura todo o conteúdo HTML da página para análise
      const htmlContent = await page.content();
      
      // Procura por URLs do Supabase diretamente no HTML
      const supabaseUrlPattern = /(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co[a-zA-Z0-9\/_\-\.\?\=\&\;\%\$\{\}\`\+]*)/gi;
      const supabaseUrlMatches = htmlContent.match(supabaseUrlPattern) || [];
      
      // Adiciona URLs encontradas no HTML
      supabaseUrlMatches.forEach(url => {
        if (!apiUrls.includes(url)) {
          apiUrls.push(url);
        }
      });
      
      // Procura por tokens JWT do Supabase
      const jwtPattern = /(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/gi;
      const jwtMatches = htmlContent.match(jwtPattern) || [];
      
      // Adiciona tokens encontrados
      jwtMatches.forEach(token => {
        const key = `JWT: ${token.substring(0, 20)}...`;
        if (!keysFound.includes(key)) {
          keysFound.push(key);
        }
      });
      
      // Executa script adicional para procurar por tabelas em scripts carregados
      const scriptContent = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.map(script => script.textContent || '').join('\n');
      });
      
      // Procura por referências a tabelas do Supabase
      const tablePatterns = [
        // Padrão SQL
        /(?:from|join|select\s+\*\s+from)\s+(['"`]?)(\w+)\1/gi,
        // Padrão Supabase
        /\.from\((['"`])(\w+)\1\)/gi,
        // Padrão de definição de tabela
        /table[:\s]+(['"`]?)(\w+)\1/gi,
        // Padrão de referência a tabela
        /collection[:\s]+(['"`]?)(\w+)\1/gi
      ];
      
      // Processa cada padrão
      const tableNames = new Set();
      tablePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(scriptContent)) !== null) {
          const tableName = match[2];
          if (tableName && !tableNames.has(tableName)) {
            tableNames.add(tableName);
            
            // Adiciona à lista de tabelas se ainda não existir
            if (!tableData.some(table => table.name === tableName)) {
              tableData.push({
                name: tableName,
                rowCount: 0, // Não podemos determinar o número de linhas
                columns: ['id', 'created_at'], // Colunas padrão do Supabase
              });
            }
          }
        }
      });
      
      // Se encontrou URLs do Supabase e tokens JWT, tenta consultar diretamente a API do Supabase
      const supabaseUrls = apiUrls.filter(url => url.includes('supabase'));
      const jwtTokens = keysFound.filter(key => key.startsWith('JWT:'));
      
      if (supabaseUrls.length > 0 && jwtTokens.length > 0) {
        try {
          // Extrai o primeiro URL do Supabase e o primeiro token JWT
          let supabaseUrl = supabaseUrls[0];
          // Limpa a URL para obter apenas o domínio base
          if (supabaseUrl.includes('/')) {
            const urlObj = new URL(supabaseUrl);
            supabaseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
          }
          
          // Extrai o token JWT completo da string formatada
          const jwtToken = jwtTokens[0].replace('JWT: ', '').split('...')[0];
          const fullToken = jwtMatches.find(token => token.startsWith(jwtToken)) || '';
          
          console.log(`Tentando consultar Supabase em ${supabaseUrl} com token JWT`);
          
          // Consulta a lista de tabelas do Supabase
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': fullToken,
              'Authorization': `Bearer ${fullToken}`,
            },
          });
          
          if (response.ok) {
            // Se conseguiu acessar, tenta obter a lista de tabelas
            const tables = await response.json();
            console.log('Tabelas encontradas:', tables);
            
            // Limpa as tabelas existentes e adiciona as tabelas reais
            tableData = [];
            
            // Para cada tabela, consulta seus dados
            for (const tableName of Object.keys(tables)) {
              try {
                const tableResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=5`, {
                  method: 'GET',
                  headers: {
                    'apikey': fullToken,
                    'Authorization': `Bearer ${fullToken}`,
                  },
                });
                
                if (tableResponse.ok) {
                  const rows = await tableResponse.json();
                  const columns = rows.length > 0 ? Object.keys(rows[0]) : ['id'];
                  
                  tableData.push({
                    name: tableName,
                    rowCount: rows.length,
                    columns: columns,
                  });
                  
                  console.log(`Tabela ${tableName}: ${rows.length} registros encontrados`);
                }
              } catch (error) {
                console.error(`Erro ao consultar tabela ${tableName}:`, error);
              }
            }
          } else {
            console.log('Não foi possível acessar a API do Supabase:', await response.text());
          }
        } catch (error) {
          console.error('Erro ao consultar API do Supabase:', error);
        }
      }
      
      // Se ainda não encontrou tabelas mas tem URLs do Supabase, adiciona uma tabela genérica
      if (apiUrls.some(url => url.includes('supabase')) && tableData.length === 0) {
        tableData.push({
          name: 'default_table',
          rowCount: 0,
          columns: ['id', 'created_at']
        });
      }

      // Fecha o navegador
      await browser.close();

      // Trunca as URLs para segurança
      const truncatedApiUrls = apiUrls.map(url => {
        try {
          const urlObj = new URL(url);
          return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.substring(0, 15)}...`;
        } catch (e) {
          return url.substring(0, 30) + '...';
        }
      });

      // Salva os resultados em um arquivo de texto
      try {
        // Cria um nome de arquivo baseado no domínio
        let domain = normalizedUrl.replace(/https?:\/\//, '').replace(/\//g, '-');
        if (domain.endsWith('-')) domain = domain.slice(0, -1);
        const fileName = `${domain}.txt`;
        const filePath = path.join(process.cwd(), 'public', fileName);
        
        // Cria o diretório public se não existir
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Formata o conteúdo do arquivo
        let fileContent = `🌐 URL(s) de API suspeitas encontradas:\n`;
        apiUrls.forEach((url, index) => {
          fileContent += `[${index + 1}] ${url}\n`;
        });
        
        fileContent += `\n🔑 Possíveis chaves (anon, secret, JWT) encontradas:\n`;
        keysFound.forEach((key, index) => {
          fileContent += `[${index + 1}] ${key}\n`;
        });
        
        fileContent += `\n📊 Tabelas encontradas:\n`;
        tableData.forEach((table, index) => {
          fileContent += `[${index + 1}] ${table.name} (${table.rowCount} registros)\n`;
          fileContent += `    Colunas: ${table.columns.join(', ')}\n`;
        });
        
        // Escreve o arquivo
        fs.writeFileSync(filePath, fileContent);
        console.log(`Resultados salvos em ${filePath}`);
      } catch (error) {
        console.error('Erro ao salvar resultados em arquivo:', error);
      }
      
      // Retorna os resultados
      return NextResponse.json({
        urlsFound: [...new Set(urlsFound)].slice(0, 10).map(url => url.substring(0, 50) + '...'),
        apiUrls: [...new Set(truncatedApiUrls)],
        keysFound: [...new Set(keysFound)],
        tableData,
      });
    } catch (error: any) {
      await browser.close();
      console.error('Erro durante o scan:', error);
      return NextResponse.json({ error: `Erro durante o scan: ${error.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: `Erro ao processar requisição: ${error.message}` }, { status: 500 });
  }
}
