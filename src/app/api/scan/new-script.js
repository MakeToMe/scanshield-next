async function scanScriptsForSecretsUniversal() {
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
    '/rest/v1', '/auth/v1', '/realtime/v1', '/storage/v1', '/functions/v1'
  ];

  const regexes = {
    genericUrls: /https?:\/\/[^\s"'<>]+/g,
    jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,

    // Supabase / env keys
    supabaseKeys: /(?:anon|service)_key['"]?\s*[:=]\s*['"][\w-]{20,}['"]/gi,
    envVars: /(SUPABASE_[A-Z_]+|DATABASE_URL|JWT_SECRET)=["']?[^"'\s]+["']?/gi,

    // Bancos populares
    postgres: /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
    mysql: /mysql:\/\/[^\s"'<>]+/gi,
    mongodb: /mongodb\+srv:\/\/[^\s"'<>]+@[^"'<>]+mongodb\.net[^\s"'<>]*/gi,
    redis: /redis:\/\/[^\s"'<>]+/gi,
    sqlite: /file:[^\s"'<>]*\.db/gi,
    mssql: /mssql:\/\/[^\s"'<>]+/gi,
    oracle: /oracle:\/\/[^\s"'<>]+/gi,
    jdbcOracle: /jdbc:oracle:[^\s"'<>]+/gi,

    // Neon e cloud vendors
    neon: /postgres(?:ql)?:\/\/[^\s"'<>]+(neon\.tech|neon-db\.net)/gi,
    herokuPg: /postgres(?:ql)?:\/\/[^\s"'<>]*amazonaws\.com[^\s"'<>]*/gi,
    planetscale: /mysql:\/\/[^\s"'<>]*planetscale\.com[^\s"'<>]*/gi,

    // API Keys
    stripe: /sk_live_[0-9a-zA-Z]{24,}/g,
    firebase: /AIza[0-9A-Za-z-_]{35}/g,
    google: /AIza[0-9A-Za-z-_]{35}/g,
    aws: /AKIA[0-9A-Z]{16}/g,
    mailgun: /key-[0-9a-zA-Z]{32}/g,
    sendgrid: /SG\.[a-zA-Z0-9-_]{22,}\.[a-zA-Z0-9-_]{22,}/g,
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

              // Detecta Supabase por path
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

  results.apis = [...results.urls].filter(u => u.toLowerCase().includes('api'));

  // Exibição
  console.log('🔍 ESCANEAMENTO UNIVERSAL DE SEGREDOS\n');

  console.log('🌐 URLs genéricas encontradas:', results.urls.size);

  if (results.apis.length) {
    console.log('\n🔧 URLs com "api":');
    results.apis.forEach((u, i) => console.log(`[${i + 1}] ${u}`));
  }

  if (results.supabaseApis.size) {
    console.log('\n🟢 Supabase APIs detectadas via path típico:');
    [...results.supabaseApis].forEach((u, i) => console.log(`[${i + 1}] ${u}`));
  }

  if (results.dbUrls.size) {
    console.log('\n🛢️ URLs de Banco de Dados (Postgres, MySQL, Mongo, etc):');
    [...results.dbUrls].forEach((u, i) => console.log(`[${i + 1}] ${u}`));
  }

  if (results.keys.size) {
    console.log('\n🔑 Chaves e tokens potencialmente sensíveis (API keys, secrets):');
    [...results.keys].forEach((k, i) => console.log(`[${i + 1}] ${k}`));
  }

  if (results.jwt.size) {
    console.log('\n🪙 JWTs encontrados:');
    [...results.jwt].forEach((k, i) => console.log(`[${i + 1}] ${k}`));
  }

  if (results.urls.size) {
    console.log('\n📄 Todas as URLs genéricas encontradas:');
    [...results.urls].forEach((u, i) => console.log(`[${i + 1}] ${u}`));
  }
  
  // Retorna os resultados para uso no Node.js, mantendo a estrutura compatível com o código anterior
  return {
    urlsFound: [...results.supabaseApis, ...results.apis].filter(url => url.includes('supabase')),
    keysFound: [...results.keys, ...results.jwt],
    paths: [] // Mantemos a estrutura compatível com o código anterior
  };
}
