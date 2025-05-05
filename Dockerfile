# Estágio de build
FROM node:18-alpine AS build

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM node:18-alpine AS production

WORKDIR /app

# Variáveis de ambiente para produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar dependências e build
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expor porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
