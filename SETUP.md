# LEX Concursos — Setup

Plataforma de cursos para concursos: venda de cursos (Mercado Pago), aulas em vídeo (Bunny Stream) e, em breve, área de questões.

## Stack

- Next.js 15 (App Router) + React 18 + TypeScript
- Auth.js v5 (Credentials + JWT)
- Prisma 7 + Neon Postgres (adapter WebSocket)
- Mercado Pago (API de Orders — cartão, PIX, boleto)
- Bunny Stream (vídeo HLS com URL assinada) e Cloudinary (imagens e PDFs)
- Resend (e-mail) · Tailwind + Radix UI
- Deploy na Vercel

## Rodar localmente

```bash
npm install            # também roda "prisma generate"
cp .env.example .env   # preencha as variáveis (ver abaixo)
npm run db:deploy      # aplica as migrations no banco do .env
npm run dev            # http://localhost:3000
```

> Atenção: o `.env` aponta para o banco que você configurar. Se for o banco de produção, tudo o que fizer localmente vale em produção.

### Primeiro admin

Não existem usuários de demonstração. Para criar (ou redefinir) o admin:

```powershell
$env:ADMIN_EMAIL="voce@email.com"; $env:ADMIN_PASSWORD="uma-senha-forte"; npm run db:seed
```

## Variáveis de ambiente

Todas estão documentadas em `.env.example`. As principais:

| Variável | Para quê |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon (pooled para o app, direta para as migrations) |
| `AUTH_SECRET` | Auth.js (`npx auth secret`) |
| `APP_URL` | URL pública (links de e-mail, SEO). Ex.: `https://lexcursos.site` |
| `MERCADOPAGO_*`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Pagamentos e assinatura do webhook |
| `BUNNY_STREAM_*` | Upload e reprodução de vídeo. `BUNNY_STREAM_TOKEN_KEY` assina os links (ative "CDN token authentication" no Bunny **depois** de configurar) |
| `CLOUDINARY_*` | Capas, avatares e PDFs |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mails (redefinir senha) |

## Banco de dados

- Alterar o schema: `npx prisma migrate dev --name <nome>` (em um banco de desenvolvimento).
- Produção: `npm run db:deploy` **antes** de publicar o código que depende da migration.
- Não edite migrations antigas.

## Áreas e rotas

| Rota | Quem |
|---|---|
| `/` | Vitrine pública (quem está logado vai para o painel) |
| `/login`, `/register`, `/forgot-password` | Público |
| `/cursos/[slug]` | Página de venda do curso (pública) |
| `/checkout`, `/checkout/success` | Aluno logado |
| `/student/*` | Aluno (início, meu curso, progresso, player, perfil) |
| `/admin/*` | Admin e moderador (professor não tem login: é só crédito nos módulos) |
| `/termos`, `/privacidade` | Público (preencher os dados da empresa) |

## Regras importantes

- **Módulos compartilhados:** um módulo pode estar em vários cursos (tabela `course_modules`). Só o dono do módulo e o admin editam as aulas. O progresso do aluno é separado por curso.
- **Acesso a conteúdo pago:** checado no servidor. Aula bloqueada não envia vídeo, PDF nem quiz ao navegador, e o vídeo usa URL assinada com expiração.
- **Pagamento:** a liberação de acesso é atômica (webhook, polling e reconciliação podem rodar juntos sem duplicar). Um cupom de 100% libera sem passar pelo Mercado Pago.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção (roda o type-check)
npm run type-check   # TypeScript
npm run db:deploy    # aplica migrations
npm run db:studio    # Prisma Studio
npm run db:seed      # cria/atualiza o admin
```

O plano de ação do projeto fica em `docs/plano-de-acao-lex.html`.
