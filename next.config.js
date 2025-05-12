/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'localhost', 
      'pub-55625ef692bf44f3a5a40fad2cfe6bcb.r2.dev',
      'cartoompersonalizados.com',
      'trackpro.com.br',
      'studio.rardevops.com'
    ],
  },
  // Configuração para o Supabase
  env: {
    // Variáveis públicas (seguras)
    NEXT_PUBLIC_APP_NAME: 'ScanShield',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  // Configuração para o Playwright
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', 'playwright'],
  },
};

module.exports = nextConfig;
