import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { startScan, updateScanStatus } from '../scan-status/utils';
import { incrementSitesCounter } from '@/lib/increment-counter';

export async function POST(request: NextRequest) {
  // Variável para controlar se o fallback da OpenAPI foi acionado
  let fallbackOpenApiAcionado = false;
  
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

                      // Detecta Supabase por path típico ou domínio .supabase.co
                      try {
                        const urlObj = new URL(match);
                        if (
                          supabasePaths.some(path => urlObj.pathname.startsWith(path)) ||
                          urlObj.hostname.endsWith('.supabase.co')
                        ) {
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
          
          // Lista de URLs a serem ignoradas (frameworks, bibliotecas, namespaces XML, etc.)
          const urlsParaIgnorar = [
            "https://react.dev/errors/",
            "http://www.w3.org/2000/svg",
            "http://www.w3.org/1998/Math/MathML",
            "http://www.w3.org/1999/xlink",
            "http://www.w3.org/XML/1998/namespace",
            "http://n",
            "https://nextjs.org/docs/",
            "http://localhost",
            "https://github.com/zloirock/core-js",
            "https://a",
            "https://a/c%20d?a=1&c=3",
            "https://a@b",
            "https://тест",
            "https://a#б",
            "https://x"
          ];
          
          // Converter o Set de URLs para um array para poder filtrar
          const urlsArray = Array.from(results.urls) as string[];
          
          // Filtrar URLs genéricas para remover as URLs que devem ser ignoradas
          const urlsGenericasFiltradas = urlsArray.filter((url: string) => {
            // Verificar se a URL não está na lista de URLs para ignorar
            // ou se não começa com algum prefixo da lista
            return !urlsParaIgnorar.some(ignoredUrl => 
              url === ignoredUrl || url.startsWith(ignoredUrl)
            );
          });
          
          const finalJson = {
            urlsSupabase: [...results.supabaseApis],
            tokensJWT: [...results.jwt],
            urlsApi: [...results.apis],
            urlsGenericas: [...urlsGenericasFiltradas],
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
      
      // FALLBACK: Se encontrou tokens JWT mas não encontrou URLs do Supabase,
      // tenta testar as URLs genéricas como possíveis endpoints Supabase
      if (scanJsonData.tokensJWT && scanJsonData.tokensJWT.length > 0 &&
          (!scanJsonData.urlsSupabase || scanJsonData.urlsSupabase.length === 0) &&
          scanJsonData.urlsGenericas && scanJsonData.urlsGenericas.length > 0) {
        
        console.log('\n\n🔍 INICIANDO FALLBACK: Testando URLs genéricas como possíveis endpoints Supabase');
        
        // Lista de domínios famosos que sabemos que não são Supabase
        const knownDomains = [
          'react.dev', 'reactjs.org',
          'github.com', 'githubusercontent.com',
          'mozilla.org', 'mdn.io',
          'google.com', 'googleapis.com',
          'cloudflare.com',
          'vercel.app', 'vercel.com',
          'netlify.app', 'netlify.com',
          'npmjs.com', 'unpkg.com',
          'jquery.com',
          'bootstrap.com', 'getbootstrap.com',
          'fontawesome.com',
          'jsdelivr.net',
          'cdnjs.cloudflare.com'
        ];
        
        // Filtrar as URLs genéricas, removendo as URLs de domínios conhecidos
        const potentialSupabaseUrls = scanJsonData.urlsGenericas.filter((url: string) => {
          try {
            const urlObj = new URL(url);
            // Verifica se o domínio não está na lista de domínios conhecidos
            return !knownDomains.some(domain => urlObj.hostname.includes(domain));
          } catch {
            return false; // Se não for uma URL válida, ignora
          }
        });
        
        console.log(`Encontradas ${potentialSupabaseUrls.length} URLs potenciais para testar:`, potentialSupabaseUrls);
        
        // Usar o primeiro token JWT encontrado para testar as URLs
        const token = String(scanJsonData.tokensJWT[0]);
        
        // Testar cada URL potencial
        for (const url of potentialSupabaseUrls) {
          try {
            // Normalizar a URL (remover barra final se existir)
            let testUrl = String(url);
            if (testUrl.endsWith('/')) {
              testUrl = testUrl.slice(0, -1);
            }
            
            console.log(`Testando URL: ${testUrl}`);
            
            // Tentar acessar a OpenAPI do Supabase nesta URL
            const testResponse = await fetch(`${testUrl}/rest/v1/?select=*`, {
              method: 'GET',
              headers: {
                'apikey': token,
                'Authorization': `Bearer ${token}`
              }
            });
            
            // Se a resposta for bem-sucedida, esta é uma URL do Supabase
            if (testResponse.ok) {
              console.log(`✅ URL válida do Supabase encontrada: ${testUrl}`);
              
              // Adicionar à lista de URLs do Supabase
              if (!scanJsonData.urlsSupabase) {
                scanJsonData.urlsSupabase = [];
              }
              scanJsonData.urlsSupabase.push(testUrl);
              
              // Não precisamos testar mais URLs
              break;
            } else {
              console.log(`❌ URL não é um endpoint Supabase válido: ${testUrl}`);
            }
          } catch (error: any) {
            console.error(`Erro ao testar URL ${url}:`, error);
          }
        }
      }
      
      // Continua com a lógica original
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
            
            // VERIFICAÇÃO OBJETIVA: A OpenAPI trouxe resultado válido?
            if (!(tablesData && typeof tablesData === 'object' && tablesData.paths)) {
              console.log('\n\n⚠️ OpenAPI retornou resposta OK mas sem estrutura válida');
              
              // Fechar o navegador
              try {
                await browser.close();
              } catch (error) {
                console.error('Erro ao fechar o navegador:', error);
              }
              
              // Enviar para o webhook de fallback
              console.log('\n\n🔄 Enviando para webhook de fallback...');
              try {
                const fallbackResponse = await fetch('https://rarwhk.rardevops.com/webhook/openapi', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(scanJsonData)
                });
                
                console.log(fallbackResponse.ok ? '✅ Fallback enviado com sucesso' : '❌ Erro ao enviar fallback');
              } catch (error) {
                console.error('❌ Erro ao enviar fallback:', error);
              }
              
              // INTERROMPER o fluxo aqui
              return NextResponse.json({
                success: true,
                message: 'Scan interrompido: OpenAPI inválida, fallback enviado',
                scanId: scanId
              });
            }
            
            // Processar o documento OpenAPI para extrair tabelas e RPCs
            // Só chega aqui se a OpenAPI for válida
            {
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
            
            // Definir a variável de controle para indicar que o fallback foi acionado
            fallbackOpenApiAcionado = true;
            
            console.log('\n\n⚠️ OpenAPI falhou - Interrompendo fluxo normal e enviando para webhook');
            
            // Fechar o navegador antes de enviar o fallback
            try {
              await browser.close();
              console.log('Navegador fechado com sucesso antes do fallback');
            } catch (browserError) {
              console.error('Erro ao fechar o navegador antes do fallback:', browserError);
            }
            
            // Fallback: enviar o JSON do passo 1 para o endpoint quando a chamada OpenAPI falhar
            try {
              console.log('\n\n🔄 Iniciando fallback para OpenAPI...');
              const fallbackResponse = await fetch('https://rarwhk.rardevops.com/webhook/openapi', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(scanJsonData)
              });
              
              if (fallbackResponse.ok) {
                console.log('✅ Fallback OpenAPI enviado com sucesso');
                
                // Tenta salvar o resultado do fallback em um arquivo
                try {
                  const publicDir = path.join(process.cwd(), 'public');
                  if (fs.existsSync(publicDir)) {
                    const fallbackFilePath = path.join(publicDir, `${domainName}-fallback.json`);
                    fs.writeFileSync(fallbackFilePath, JSON.stringify({
                      status: 'fallback_enviado',
                      timestamp: new Date().toISOString(),
                      message: 'Fluxo interrompido após envio do fallback'
                    }, null, 2));
                    console.log(`\n\n✅ Registro de fallback salvo em: ${fallbackFilePath}`);
                  }
                } catch (saveError) {
                  console.error('Aviso: Não foi possível salvar o arquivo de fallback:', saveError);
                }
                
                // Retornar resposta imediatamente, interrompendo o fluxo
                return NextResponse.json({
                  success: true,
                  message: 'Scan concluído com fallback para OpenAPI',
                  scanId: scanId,
                  status: 'fallback_enviado'
                });
                
              } else {
                console.error('❌ Erro ao enviar fallback OpenAPI:', await fallbackResponse.text());
                
                // Retornar resposta de erro, interrompendo o fluxo
                return NextResponse.json({
                  success: false,
                  message: 'Erro ao enviar fallback para OpenAPI',
                  scanId: scanId,
                  status: 'fallback_erro'
                });
              }
            } catch (fallbackError) {
              console.error('❌ Erro ao executar fallback OpenAPI:', fallbackError);
              
              // Retornar resposta de erro, interrompendo o fluxo
              return NextResponse.json({
                success: false,
                message: 'Erro ao executar fallback para OpenAPI',
                scanId: scanId,
                status: 'fallback_erro'
              });
            }
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
      
      // Verificar se o fallback da OpenAPI foi acionado
      // Se foi acionado, não executar o passo 4
      if (fallbackOpenApiAcionado) {
        console.log('\n\n⚠️ Passo 4 ignorado porque o fallback da OpenAPI foi acionado');
        // Fechar o navegador se ainda não foi fechado
        try {
          await browser.close();
        } catch (error) {
          // Ignora erro se o navegador já estiver fechado
        }
        // Encerrar a função aqui
        return;
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
      
      // Incrementa o contador de sites escaneados quando o diagnóstico é concluído
      const newCount = await incrementSitesCounter();
      
      // Retorna os resultados truncados e o número de sites escaneados atualizado
      return NextResponse.json({
        scanResults: truncatedScanResults,
        supabaseInfo: truncatedSupabaseInfo,
        analysisResult: analysisResult,
        sitesScanned: newCount, // Usa o valor atualizado do contador
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
