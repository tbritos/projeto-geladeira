# Projeto Geladeira Inteligente

Dashboard web + API para monitoramento em tempo real de temperatura, umidade, energia e status de porta.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Fastify + Prisma + SQLite

## Requisitos
- Node.js 18+
- npm

## Como rodar localmente

1. Instalar dependencias do frontend
`npm install`

2. Instalar dependencias do backend
`cd backend && npm install`

3. Configurar variaveis de ambiente do backend
Crie `backend/.env` com:
`DATABASE_URL="file:./prisma/dev.db"`
`JWT_SECRET="troque-essa-chave-em-producao"`
`JWT_REFRESH_SECRET="troque-essa-chave-tambem"` (opcional, padrao usa JWT_SECRET)
`JWT_REFRESH_EXPIRES_IN="7d"` (opcional)
`AUTH_ADMIN_USER="admin"` (opcional)
`AUTH_ADMIN_PASSWORD_HASH="<bcrypt-hash>"` (opcional)
`AUTH_OPERATOR_USER="operador"` (opcional)
`AUTH_OPERATOR_PASSWORD_HASH="<bcrypt-hash>"` (opcional)

4. Gerar client Prisma e aplicar migracao
`cd backend && npm run prisma:generate && npm run prisma:migrate`

5. Subir backend
`cd backend && npm run dev`

6. Subir frontend (em outro terminal)
`npm run dev`

## Variaveis do frontend
Opcionalmente, crie `.env` na raiz com:
`VITE_API_URL=http://localhost:3333/api`

## Credenciais padrao de desenvolvimento
- Admin: usuario `admin`, senha `admin`
- Operador: usuario `operador`, senha `1234`

Para gerar hash bcrypt customizado:
`cd backend && node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"`

## Rotas principais
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3333`
- Health simples: `GET /api/status`
