# ScanShield Next.js

Versão moderna do ScanShield usando Next.js, uma aplicação de segurança para detectar vulnerabilidades em APIs Supabase.

## Características

- **Detecção de APIs Supabase**: Identifica automaticamente APIs Supabase expostas em sites
- **Identificação de Tabelas**: Detecta tabelas e seus dados que podem estar expostos publicamente
- **Descoberta de Chaves**: Encontra chaves de API e tokens de autenticação expostos
- **Interface Moderna**: UI com tema de segurança cibernética e animações
- **Arquitetura Unificada**: Backend e frontend em uma única aplicação Next.js

## Tecnologias

- **Next.js**: Framework React para renderização híbrida
- **Playwright**: Para navegação headless e análise de sites
- **Tailwind CSS**: Para estilização e design responsivo
- **Docker**: Configuração para deployment em ambientes de produção

## Como usar

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Produção

```bash
# Construir a aplicação
npm run build

# Iniciar servidor de produção
npm start
```

### Docker

```bash
# Construir imagem Docker
docker build -t scanshield-next .

# Executar contêiner
docker run -p 3000:3000 scanshield-next
```

## Deployment com Docker Swarm

O projeto inclui configurações para deployment em ambientes Docker Swarm usando Traefik como proxy reverso.

```bash
# Deploy usando docker-compose
docker stack deploy -c docker-compose.yml scanshield
```

## Segurança

Esta aplicação foi projetada com segurança em mente:

- Todas as operações sensíveis são realizadas no servidor
- Nenhuma credencial é exposta ao cliente
- Dados sensíveis são truncados antes de serem enviados ao frontend

## Licença

Todos os direitos reservados.
