import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { startScan, updateScanStatus } from '../scan-status/route';

export async function POST(request: NextRequest) {
  try {
    // Verificar se estamos em ambiente Docker sem suporte completo ao Playwright
    let isPlaywrightAvailable = true;
    try {
      // Tenta importar o Playwright para verificar se está disponível
      await import('playwright');
    } catch (playwrightError) {
      console.error('Playwright não está disponível:', playwrightError);
      isPlaywrightAvailable = false;
    }
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Gera um ID único para este escaneamento
    const scanId = uuidv4();
    
    // Inicia o escaneamento no sistema de status
    startScan(scanId);
    
    // Normaliza a URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Atualiza o status para 'extraindo dados'
    updateScanStatus(scanId, 'extracting_data', 10);
    
    // Adiciona o domínio escaneado na tabela scans e obtém o número total de sites
    let sitesScanned = 0;
    try {
      const domain = normalizedUrl.replace(/^https?:\/\//, '');
      const { error: insertError } = await (await import('@/lib/supabase-stats')).supabaseStats
        .from('scans')
        .insert([{ site: domain }]);
      
      if (insertError) {
        console.error('Erro ao registrar site no Supabase:', insertError.message);
      } else {
        // Consulta o número total de sites escaneados
        const { count, error: countError } = await (await import('@/lib/supabase-stats')).supabaseStats
          .from('scans')
          .select('uid', { count: 'exact', head: true });
          
        if (!countError && count !== null) {
          sitesScanned = count;
          console.log(`Total de registros encontrados após inserção: ${sitesScanned}`);
        }
      }
    } catch (e: any) {
      console.error('Erro inesperado ao tentar registrar site no Supabase:', e.message);
    }

    // Se o Playwright não estiver disponível, retorna uma resposta simulada
    if (!isPlaywrightAvailable) {
      console.log('Fornecendo resposta simulada porque o Playwright não está disponível');
      
      // Registra a tentativa de escaneamento no Supabase, se possível
      let sitesScanned = 0;
      try {
        const domain = normalizedUrl.replace(/^https?:\/\//, '');
        const { error: insertError } = await (await import('@/lib/supabase-stats')).supabaseStats
          .from('scans')
          .insert([{ site: domain }]);
        
        if (!insertError) {
          // Consulta o número total de sites escaneados
          const { count, error: countError } = await (await import('@/lib/supabase-stats')).supabaseStats
            .from('scans')
            .select('uid', { count: 'exact', head: true });
            
          if (!countError && count !== null) {
            sitesScanned = count;
            console.log(`Total de registros encontrados após inserção: ${sitesScanned}`);
          }
        }
      } catch (e: any) {
        console.error('Erro ao tentar registrar site no Supabase:', e.message);
      }
      
      // Retorna uma resposta simulada
      return NextResponse.json({
        scanResults: {
          urlsSupabase: [],
          tokensJWT: [],
          urlsApi: [],
          urlsGenericas: [],
          chavesSensiveis: [],
          urlsBancoDados: [],
          urlsSuspeitas: []
        },
        supabaseInfo: null,
        analysisResult: null,
        sitesScanned: sitesScanned,
        message: `Escaneamento simulado concluído. O Playwright não está disponível neste ambiente.`,
        simulatedResponse: true
      });
    }
    
    // Se o Playwright estiver disponível, continua com o escaneamento normal
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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

        // Detecta URLs de API Supabase (incluindo hospedado)
        if (url.includes('supabase.co') || url.includes('supabase.in') || url.includes('studio.rardevops.com')) {
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

      // Executa o código exato fornecido pelo usuário para escaneamento universal
      const scanJsonData = await page.evaluate((): any => {
        async function scanScriptsForSecretsUniversalToJson() {
          const scripts = Array.from(document.getElementsByTagName('script'));
          const results = {
            urls: new Set(),
            apis: new Set(),
            supabaseApis: new Set(),
            dbUrls: new Set(),
            keys: new Set(),
            jwt: new Set(),
          };

          const supabasePaths = [
            '/rest/v1', '/auth/v1', '/realtime/v1', '/storage/v1', '/functions/v1', '/graphql/v1'
          ];

          const regexes = {
            genericUrls: /https?:\/\/[^\s"'<>]+/g,
            jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,

            // Supabase / env keys
            supabaseKeys: /(?:anon|service)_key['"\\s]*[:=]\\s*['"\\s]*[\\w-]{20,}['"\\s]*/gi,
            envVars: /(SUPABASE_[A-Z_]+|DATABASE_URL|JWT_SECRET)=["']?[^"'\\s]+["']?/gi,

            // Bancos populares
            postgres: /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
            mysql: /mysql:\/\/[^\s"'<>]+/gi,
            mongodb: /mongodb\\+srv:\/\/[^\s"'<>]+@[^"'<>]+mongodb\\.net[^\s"'<>]*/gi,
            redis: /redis:\/\/[^\s"'<>]+/gi,
            sqlite: /file:[^\s"'<>]*\\.db/gi,
            mssql: /mssql:\/\/[^\s"'<>]+/gi,
            oracle: /oracle:\/\/[^\s"'<>]+/gi,
            jdbcOracle: /jdbc:oracle:[^\s"'<>]+/gi,

            // Neon e cloud vendors
            neon: /postgres(?:ql)?:\/\/[^\s"'<>]+(neon\\.tech|neon-db\\.net)/gi,
            herokuPg: /postgres(?:ql)?:\/\/[^\s"'<>]*amazonaws\\.com[^\s"'<>]*/gi,
            planetscale: /mysql:\/\/[^\s"'<>]*planetscale\\.com[^\s"'<>]*/gi,

            // API Keys
            stripe: /sk_live_[0-9a-zA-Z]{24,}/g,
            firebase: /AIza[0-9A-Za-z-_]{35}/g,
            google: /AIza[0-9A-Za-z-_]{35}/g,
            aws: /AKIA[0-9A-Z]{16}/g,
            mailgun: /key-[0-9a-zA-Z]{32}/g,
            sendgrid: /SG\\.[a-zA-Z0-9-_]{22,}\\.[a-zA-Z0-9-_]{22,}/g,
          };

          for (const script of scripts) {
            try {
              let text = '';

              if (script.src) {
                const res = await fetch(script.src);
                if (!res.ok) continue;
                text = await res.text();
              } else {
                text = script.innerText;
              }

              if (!text) continue;

              for (const [type, regex] of Object.entries(regexes)) {
                const matches = text.match(regex);
                if (matches) {
                  matches.forEach(match => {
                    if (type === 'genericUrls') {
                      results.urls.add(match);

                      // Detecta Supabase por path típico
                      try {
                        const urlObj = new URL(match);
                        if (supabasePaths.some(path => urlObj.pathname.startsWith(path))) {
                          results.supabaseApis.add(urlObj.origin);
                        }
                      } catch (e) {}
                    } else if (type === 'jwt') {
                      results.jwt.add(match);
                    } else if (type.includes('postgres') || type.includes('mysql') ||
                               type.includes('sqlite') || type.includes('mssql') ||
                               type.includes('mongodb') || type.includes('redis') ||
                               type.includes('oracle')) {
                      results.dbUrls.add(match);
                    } else {
                      results.keys.add(match);
                    }
                  });
                }
              }
            } catch (e) {
              console.warn('Erro ao processar script:', e);
            }
          }
          
          // Inicializa a lista de URLs suspeitas
          const urlsSuspeitas: string[] = [];
          
          const finalJson = {
            urlsSupabase: [...results.supabaseApis],
            tokensJWT: [...results.jwt],
            urlsApi: [...results.apis],
            urlsGenericas: [...results.urls],
            chavesSensiveis: [...results.keys],
            urlsBancoDados: [...results.dbUrls],
            urlsSuspeitas: urlsSuspeitas
          };

          console.log("🔍 Resultado JSON estruturado:");
          console.log(JSON.stringify(finalJson, null, 2));
          return finalJson;
        }

        return scanScriptsForSecretsUniversalToJson();
      });

      // Extrai o domínio da URL para usar no nome do arquivo
      let domainName = '';
      try {
        const urlObj = new URL(normalizedUrl);
        domainName = urlObj.hostname;
      } catch (error) {
        console.error('Erro ao extrair domínio da URL:', error);
        domainName = 'unknown';
      }
      
      // Tenta salvar o JSON completo em um arquivo sem modificações
      // Mas não interrompe o fluxo se falhar
      try {
        // Log do JSON original para verificação no console
        console.log('\n\n🔍 JSON ORIGINAL GERADO PELO BROWSER:');
        console.log(JSON.stringify(scanJsonData, null, 2));
        
        // Verifica se o diretório existe e tem permissões de escrita
        const publicDir = path.join(process.cwd(), 'public');
        try {
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          
          const jsonFilePath = path.join(publicDir, `${domainName}-scan.json`);
          fs.writeFileSync(jsonFilePath, JSON.stringify(scanJsonData, null, 2));
          
          // Log do JSON salvo para verificação
          console.log(`\n\n✅ JSON completo salvo em: ${jsonFilePath}`);
        } catch (fsError) {
          console.error('Aviso: Não foi possível salvar o arquivo JSON no sistema de arquivos:', fsError);
          console.log('Continuando o processamento sem salvar o arquivo...');
        }
      } catch (error) {
        console.error('Erro ao processar o JSON:', error);
        // Continua a execução mesmo com erro
      }

      // Verifica se encontrou URLs do Supabase e tokens JWT
      let supabaseInfo = null;
      if (scanJsonData.urlsSupabase && scanJsonData.urlsSupabase.length > 0 && 
          scanJsonData.tokensJWT && scanJsonData.tokensJWT.length > 0) {
        
        try {
          // Usar a primeira URL do Supabase encontrada
          let supabaseUrl = String(scanJsonData.urlsSupabase[0]);
          
          // Normalizar a URL (remover barra final se existir)
          if (supabaseUrl.endsWith('/')) {
            supabaseUrl = supabaseUrl.slice(0, -1);
          }
          
          // Usar o primeiro token JWT encontrado
          const token = String(scanJsonData.tokensJWT[0]);
          
          // Resultado inicial
          supabaseInfo = {
            baseUrl: supabaseUrl,
            hasKey: true,
            tables: [] as Array<{name: string; rowCount: number; columnCount: number}>,
            rpcs: [] as string[]
          };
          
          // Chamada para obter as tabelas
          const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/?select=*`, {
            method: 'GET',
            headers: {
              'apikey': token,
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (tablesResponse.ok) {
            const tablesData = await tablesResponse.json();
            console.log('Resposta da API de tabelas:', tablesData);
            
            // Tenta salvar o resultado da chamada à API (passo 2) em um arquivo
            try {
              const publicDir = path.join(process.cwd(), 'public');
              if (fs.existsSync(publicDir)) {
                const passo2FilePath = path.join(publicDir, `${domainName}-passo2.json`);
                fs.writeFileSync(passo2FilePath, JSON.stringify(tablesData, null, 2));
                console.log(`\n\n✅ Resultado do passo 2 (chamada à API) salvo em: ${passo2FilePath}`);
              } else {
                console.log('Diretório public não existe, pulando salvamento do arquivo do passo 2');
              }
            } catch (error) {
              console.error('Aviso: Não foi possível salvar o arquivo do passo 2:', error);
              // Continua a execução mesmo com erro
            }
            
            // Processar o documento OpenAPI para extrair tabelas e RPCs
            if (tablesData && typeof tablesData === 'object' && tablesData.paths) {
              // Extrair tabelas dos caminhos da API
              const tables = [];
              const rpcs = [];
              
              // Percorrer os caminhos para encontrar tabelas e RPCs
              for (const path in tablesData.paths) {
                // Ignorar o caminho raiz
                if (path === '/') continue;
                
                // Verificar se é um caminho de RPC
                if (path.startsWith('/rpc/')) {
                  // Extrair o nome da RPC (remover o prefixo '/rpc/')
                  const rpcName = path.substring(5);
                  rpcs.push(rpcName);
                } 
                // Se não for RPC e não for um caminho especial, é uma tabela
                else if (!path.includes('swagger') && !path.includes('openapi')) {
                  // Extrair o nome da tabela (remover a barra inicial)
                  const tableName = path.substring(1);
                  
                  // Verificar se a tabela tem definição no documento
                  const hasDefinition = tablesData.definitions && tablesData.definitions[tableName];
                  
                  // Obter a quantidade de colunas da definição, se disponível
                  let columnCount = 0;
                  if (hasDefinition && tablesData.definitions[tableName].properties) {
                    columnCount = Object.keys(tablesData.definitions[tableName].properties).length;
                  }
                  
                  // Adicionar a tabela à lista (sem a contagem de linhas por enquanto)
                  tables.push({
                    name: tableName,
                    rowCount: 0, // Será atualizado abaixo
                    columnCount: columnCount
                  });
                }
              }
              
              // Obter a contagem de linhas para cada tabela
              for (let i = 0; i < tables.length; i++) {
                const tableName = tables[i].name;
                try {
                  // Fazer uma requisição HEAD para obter a contagem de linhas
                  const countResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count`, {
                    method: 'HEAD',
                    headers: {
                      'apikey': token,
                      'Authorization': `Bearer ${token}`,
                      'Prefer': 'count=exact'
                    }
                  });
                  
                  if (countResponse.ok) {
                    // Extrair a contagem do cabeçalho Content-Range
                    const contentRange = countResponse.headers.get('content-range');
                    if (contentRange) {
                      const match = contentRange.match(/\/(\d+)$/);
                      if (match && match[1]) {
                        tables[i].rowCount = parseInt(match[1], 10);
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Erro ao obter contagem de linhas para ${tableName}:`, error);
                }
              }
              
              // Atualizar as informações do Supabase
              supabaseInfo.tables = tables;
              supabaseInfo.rpcs = rpcs;
              
              // Tenta salvar o resultado da extração de tabelas (passo 3) em um arquivo
              try {
                const publicDir = path.join(process.cwd(), 'public');
                if (fs.existsSync(publicDir)) {
                  const passo3FilePath = path.join(publicDir, `${domainName}-passo3.json`);
                  fs.writeFileSync(passo3FilePath, JSON.stringify({
                    supabaseInfo: supabaseInfo
                  }, null, 2));
                  console.log(`\n\n✅ Resultado do passo 3 (extração de tabelas) salvo em: ${passo3FilePath}`);
                } else {
                  console.log('Diretório public não existe, pulando salvamento do arquivo do passo 3');
                }
              } catch (error) {
                console.error('Aviso: Não foi possível salvar o arquivo do passo 3:', error);
                // Continua a execução mesmo com erro
              }
            }
          } else {
            console.error('Erro ao obter tabelas:', await tablesResponse.text());
          }
          
          // Tentar obter RPCs
          try {
            const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
              method: 'GET',
              headers: {
                'apikey': token,
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (rpcResponse.ok) {
              const rpcData = await rpcResponse.json();
              console.log('Resposta da API de RPCs:', rpcData);
              
              // Processar RPCs conforme o formato retornado
              if (Array.isArray(rpcData)) {
                supabaseInfo.rpcs = rpcData.map(rpc => typeof rpc === 'string' ? rpc : rpc.name || JSON.stringify(rpc));
              } else if (typeof rpcData === 'object') {
                supabaseInfo.rpcs = Object.keys(rpcData);
              }
            }
          } catch (error) {
            console.error('Erro ao obter RPCs:', error);
          }
        } catch (error) {
          console.error('Erro ao acessar a API do Supabase:', error);
        }
      }
      
      // Passo 4: Enviar o JSON para o endpoint e processar a resposta
      let analysisResult = null;
      try {
        console.log('\n\n🔍 Iniciando passo 4: Envio para análise de vulnerabilidade...');
        
        // Preparar as credenciais para Basic Auth
        const credentials = Buffer.from('scan:MakeToMe_scan').toString('base64');
        
        // Enviar o JSON do passo 1 para o endpoint
        const analysisResponse = await fetch('https://rarwhk.rardevops.com/webhook/vulnerabilidade-scanshield', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`
          },
          body: JSON.stringify(scanJsonData)
        });
        
        if (analysisResponse.ok) {
          analysisResult = await analysisResponse.json();
          console.log('Resposta da análise:', analysisResult);
          
          // Tenta salvar o resultado da análise (passo 4) em um arquivo
          try {
            const publicDir = path.join(process.cwd(), 'public');
            if (fs.existsSync(publicDir)) {
              const passo4FilePath = path.join(publicDir, `${domainName}-passo4.json`);
              fs.writeFileSync(passo4FilePath, JSON.stringify(analysisResult, null, 2));
              console.log(`\n\n✅ Resultado do passo 4 (análise de vulnerabilidade) salvo em: ${passo4FilePath}`);
            } else {
              console.log('Diretório public não existe, pulando salvamento do arquivo do passo 4');
            }
          } catch (error) {
            console.error('Aviso: Não foi possível salvar o arquivo do passo 4:', error);
            // Continua a execução mesmo com erro
          }
        } else {
          console.error('Erro na análise de vulnerabilidade:', await analysisResponse.text());
        }
      } catch (error) {
        console.error('Erro ao enviar para análise de vulnerabilidade:', error);
      }
      
      // Fecha o navegador com tratamento de erro
      try {
        await browser.close();
      } catch (browserError) {
        console.error('Erro ao fechar o navegador:', browserError);
      }

      // Atualiza o status para 'gerando diagnóstico'
      updateScanStatus(scanId, 'generating_diagnosis', 70);

      // Função auxiliar para truncar strings com segurança
      const truncateString = (str: any, length: number): string => {
        if (typeof str === 'string' && str.length > length) {
          return str.substring(0, length) + '...';
        }
        return String(str || '');
      };
      
      // Truncar dados sensíveis antes de enviar ao frontend
      const truncatedScanResults = {
        ...scanJsonData,
        urlsSupabase: Array.isArray(scanJsonData.urlsSupabase) 
          ? scanJsonData.urlsSupabase.map((url: string) => truncateString(url, 5)) 
          : [],
        tokensJWT: Array.isArray(scanJsonData.tokensJWT) 
          ? scanJsonData.tokensJWT.map((token: string) => truncateString(token, 5)) 
          : [],
        urlsApi: Array.isArray(scanJsonData.urlsApi) 
          ? scanJsonData.urlsApi.map((url: string) => truncateString(url, 5)) 
          : [],
        urlsGenericas: Array.isArray(scanJsonData.urlsGenericas) 
          ? scanJsonData.urlsGenericas.map((url: string) => truncateString(url, 5)) 
          : [],
        chavesSensiveis: Array.isArray(scanJsonData.chavesSensiveis) 
          ? scanJsonData.chavesSensiveis.map((key: string) => truncateString(key, 5)) 
          : [],
        urlsBancoDados: Array.isArray(scanJsonData.urlsBancoDados) 
          ? scanJsonData.urlsBancoDados.map((url: string) => truncateString(url, 5)) 
          : [],
        urlsSuspeitas: Array.isArray(scanJsonData.urlsSuspeitas) 
          ? scanJsonData.urlsSuspeitas.map((url: string) => truncateString(url, 5)) 
          : []
      };
      
      // Truncar nomes de tabelas e RPCs
      const truncatedSupabaseInfo = supabaseInfo ? {
        ...supabaseInfo,
        baseUrl: truncateString(supabaseInfo.baseUrl, 5),
        tables: Array.isArray(supabaseInfo.tables) 
          ? supabaseInfo.tables.map(table => ({
              ...table,
              name: truncateString(table.name, 3)
            })) 
          : [],
        rpcs: Array.isArray(supabaseInfo.rpcs) 
          ? supabaseInfo.rpcs 
          : []
      } : null;
      
      // Retorna os resultados truncados e o número de sites escaneados
      return NextResponse.json({
        scanResults: truncatedScanResults,
        supabaseInfo: truncatedSupabaseInfo,
        analysisResult: analysisResult,
        sitesScanned: sitesScanned, // Inclui o número de sites escaneados
        message: `Escaneamento concluído. Resultados salvos em ${domainName}-scan.json`
      });
    } catch (error: any) {
      try {
        await browser.close();
      } catch (browserError) {
        console.error('Erro ao fechar o navegador:', browserError);
      }
      console.error('Erro durante o scan:', error);
      return NextResponse.json({ error: `Erro durante o scan: ${error.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ error: `Erro ao processar requisição: ${error.message}` }, { status: 500 });
  }
}
