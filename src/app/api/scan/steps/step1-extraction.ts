import { chromium } from 'playwright';
import { Step1Result, ScanJsonData } from '../types';
import { saveJsonToFile, extractDomainName } from '../utils/file-utils';

/**
 * Executa o Passo 1: Extração de dados com Playwright
 * @param url URL a ser escaneada
 * @param scanId ID único para o scan
 * @param sitesScanned Lista de sites já escaneados (para evitar duplicatas)
 */
export async function executeStep1(
  url: string,
  scanId: string,
  sitesScanned: string[] = []
): Promise<Step1Result> {
  console.log('Iniciando Passo 1 - Extração de dados...');
  
  // Normaliza a URL
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  
  // Extrai o nome do domínio para o nome do arquivo
  const fileName = extractDomainName(normalizedUrl);
  
  console.log(`Iniciando navegador para ${normalizedUrl}...`);
  const browser = await chromium.launch();
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log(`Navegando para ${normalizedUrl}...`);
    await page.goto(normalizedUrl, { waitUntil: 'networkidle' });

    console.log('Iniciando extração de dados...');
    const scanJsonData = await page.evaluate(async (): Promise<ScanJsonData> => {
      // Função fornecida pelo usuário
      async function scanScriptsForSecretsUniversalToJson() {
        const scripts = Array.from(document.getElementsByTagName('script'));
        const results = {
          urls: new Set<string>(),
          apis: new Set<string>(),
          supabaseApis: new Set<string>(),
          dbUrls: new Set<string>(),
          keys: new Set<string>(),
          jwt: new Set<string>(),
        };
      
        const tecnologiasDetectadas = new Set<string>();
        const urlDoSite = location.hostname;
        const dominiosIgnorados = [
          'w3.org', 'example.com', 'nextjs.org', 'reactjs.org', 'mozilla.org',
          'posthog.com', 'vercel.live', 'fonts.googleapis.com', 'googleapis.com',
          'sentry.io', 'typekit.net', 'localhost', 'yandex.com', 'feross.org'
        ];
      
        const supabasePaths = [
          '/rest/v1', '/auth/v1', '/realtime/v1', '/storage/v1', '/functions/v1', '/graphql/v1'
        ];
      
        const regexes = {
          genericUrls: /https?:\/\/[^\s"'<>]+/g,
          jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
          supabaseKeys: /(?:anon|service)_key['"\s]*[:=]\s*['"\s]*[\w-]{20,}['"\s]*/gi,
          envVars: /(SUPABASE_[A-Z_]+|DATABASE_URL|JWT_SECRET)=["']?[^"'\s]+["']?/gi,
          postgres: /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
          mysql: /mysql:\/\/[^\s"'<>]+/gi,
          mongodb: /mongodb\+srv:\/\/[^\s"'<>]+@[^"'<>]+mongodb\.net[^\s"'<>]*/gi,
          redis: /redis:\/\/[^\s"'<>]+/gi,
          sqlite: /file:[^\s"'<>]*\.db/gi,
          mssql: /mssql:\/\/[^\s"'<>]+/gi,
          oracle: /oracle:\/\/[^\s"'<>]+/gi,
          jdbcOracle: /jdbc:oracle:[^\s"'<>]+/gi,
          neon: /postgres(?:ql)?:\/\/[^\s"'<>]+(neon\.tech|neon-db\.net)/gi,
          herokuPg: /postgres(?:ql)?:\/\/[^\s"'<>]*amazonaws\.com[^\s"'<>]*/gi,
          planetscale: /mysql:\/\/[^\s"'<>]*planetscale\.com[^\s"'<>]*/gi,
          stripe: /sk_live_[0-9a-zA-Z]{24,}/g,
          firebase: /AIza[0-9A-Za-z-_]{35}/g,
          google: /AIza[0-9A-Za-z-_]{35}/g,
          aws: /AKIA[0-9A-Z]{16}/g,
          mailgun: /key-[0-9a-zA-Z]{32}/g,
          sendgrid: /SG\.[a-zA-Z0-9-_]{22,}\.[a-zA-Z0-9-_]{22,}/g,
        };
      
        const techMatches = [
          { name: "React", pattern: /react|react-dom/i },
          { name: "Next.js", pattern: /_next\/|\.next\/|next\.js|\/next\./i },
          { name: "Vue.js", pattern: /vue(?:\.runtime)?\.js|vue@|vue-router|vuex/i },
          { name: "Svelte", pattern: /svelte|svelte\//i },
          { name: "Angular", pattern: /angular|ng-|\bng[A-Z]|@angular\//i },
          { name: "jQuery", pattern: /jquery(?:\.[\d.]+)?(?:\.min)?\.js|\$\s*\(|jQuery\./i },
          { name: "Bootstrap", pattern: /bootstrap(?:\.[\d.]+)?(?:\.min)?\.(?:js|css)|data-bs-/i },
          { name: "Vite", pattern: /vite(?:\.(?:config|plugin))?\.(?:js|ts|mjs)|@vitejs\//i },
          { name: "Supabase", pattern: /supabase(?:-js)?(?:\.[\d.]+)?(?:\.min)?\.js|@supabase\//i },
          { name: "Firebase", pattern: /firebase(?:-js)?(?:\.[\d.]+)?(?:\.min)?\.js|@firebase\//i },
          { name: "Lodash", pattern: /lodash(?:\.min)?\.js|_\.[a-z]+\(/i },
          { name: "Axios", pattern: /axios(?:\.min)?\.js|axios\.(get|post|put|delete|patch|head|options|request)\(/i },
          { name: "Webpack", pattern: /webpack(?:\.runtime)?(?:\.min)?\.js|__webpack_require__/i },
          { name: "GraphQL", pattern: /graphql|gql\`|graphql-tag|@apollo\//i },
          { name: "TypeScript", pattern: /typescript|\.[cm]?tsx?$|@types\//i },
          { name: "Tailwind CSS", pattern: /tailwindcss|@tailwind\s|@apply\s+/i },
          { name: "Redux", pattern: /redux|@reduxjs\/|createSlice|createReducer|createAction/i },
        ];
      
        for (const script of scripts) {
          try {
            let text = '';
      
            if (script.src) {
              try {
                const res = await fetch(script.src);
                if (!res.ok) continue;
                text = await res.text();
              } catch (e) {
                console.warn('Erro ao buscar script:', script.src, e);
                continue;
              }
            } else {
              text = script.innerText;
            }
      
            if (!text) continue;
      
            for (const { name, pattern } of techMatches) {
              if (pattern.test(text)) tecnologiasDetectadas.add(name);
            }
      
            for (const [type, regex] of Object.entries(regexes)) {
              const matches = text.match(regex);
              if (matches) {
                matches.forEach(match => {
                  if (type === 'genericUrls') {
                    results.urls.add(match);
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
      
        const urlsSuspeitas = [...new Set(
          [...results.urls]
            .map((urlStr: string) => {
              try {
                const url = new URL(urlStr.replace(/\\+$/, ''));
                return {
                  full: urlStr,
                  base: url.origin,
                  hostname: url.hostname,
                  pathname: url.pathname
                };
              } catch {
                return null;
              }
            })
            .filter((u): u is { full: string; base: string; hostname: string; pathname: string } => u !== null)
            .sort((a, b) => {
              const prioridade = (u: { hostname: string; pathname: string }) => {
                if (u.hostname.includes('supabase')) return 1;
                if (supabasePaths.some(p => u.pathname.startsWith(p))) return 2;
                if (u.hostname === urlDoSite) return 3;
                return 4;
              };
              return prioridade(a) - prioridade(b);
            })
            .filter(u => {
              const hostname = u.hostname.toLowerCase();
              const dominioPrincipal = hostname.split('.')[0];
              const ehDominioIgnorado = dominiosIgnorados.some(domain => hostname.includes(domain));
              const ehCurtoDemais = dominioPrincipal.length < 3;
              const ehSemPonto = !hostname.includes('.');
              return !(ehDominioIgnorado || ehCurtoDemais || ehSemPonto);
            })
            .map(u => u.base)
        )];
      
        const finalJson: ScanJsonData = {
          urlsSupabase: Array.from(results.supabaseApis) as string[],
          tokensJWT: Array.from(results.jwt) as string[],
          urlsApi: Array.from(results.apis) as string[],
          urlsGenericas: Array.from(results.urls) as string[],
          chavesSensiveis: Array.from(results.keys) as string[],
          urlsBancoDados: Array.from(results.dbUrls) as string[],
          urlsSuspeitas: urlsSuspeitas,
          tecnologiasDetectadas: Array.from(tecnologiasDetectadas) as string[]
        };
      
        console.log("🔍 Resultado JSON estruturado:", finalJson);
        return finalJson;
      }

      // Executa a função e retorna o resultado
      return await scanScriptsForSecretsUniversalToJson();
    });

    // Salvar os resultados em arquivo
    saveJsonToFile(fileName, scanJsonData as ScanJsonData, { step: 1 });

    const result: Step1Result = {
      scanId,
      normalizedUrl,
      domainName: fileName,
      scanJsonData: scanJsonData as ScanJsonData,
      sitesScanned: sitesScanned.length + 1 // Conta o site atual
    };

    return result;
  } catch (error) {
    console.error('Erro durante o processo:', error);
    throw error;
  } finally {
    console.log('Fechando navegador...');
    await browser.close();
    console.log('Navegador fechado');
  }
}
