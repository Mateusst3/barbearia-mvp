# CorteCerto

MVP de agenda e caixa para barbeiros, com autenticação e dados isolados por usuário.

## Stack
- Next.js (App Router)
- NextAuth (Credentials)
- Prisma + PostgreSQL (Neon)
- Tailwind CSS

## Setup

1. Crie `.env` (já existe) e preencha:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

2. Gere o banco (uma vez):

```bash
npx prisma migrate dev --name init
```

3. Rode o app:

```bash
npm run dev
```

## Fluxo principal
- Cadastro em `/register`
- Login em `/login`
- Agenda e caixa em `/dashboard`

## Observações
- Ao concluir um atendimento, uma entrada de caixa é criada automaticamente.
- O resumo financeiro mostra entradas, saídas e saldo líquido.
