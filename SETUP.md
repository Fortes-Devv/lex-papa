# LMS Platform — Setup

## Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + Design System customizado (Linear-inspired)
- Radix UI primitives
- Recharts (analytics)
- Zustand (state)
- React Hook Form + Zod (forms)
- @dnd-kit (drag and drop)

## Instalação

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

## Usuários de demo

| Role      | Email                   | Senha  |
|-----------|-------------------------|--------|
| Admin     | carlos@platform.com     | 123456 |
| Professor | ana@platform.com        | 123456 |
| Aluno     | mariana@email.com       | 123456 |

## Rotas principais

- `/login` — Autenticação
- `/admin/dashboard` — Painel administrativo
- `/student/dashboard` — Área do aluno
- `/teacher/dashboard` — Área do professor
- `/admin/content-studio` — Content Studio (CMS visual)
- `/admin/cms` — CMS (páginas, blog, SEO)
- `/student/player` — Player de vídeo
- `/checkout` — Checkout completo
- `/course` — Página pública de curso

## Estrutura

```
src/
  app/           # Next.js App Router
    (auth)/      # Login, registro, recuperação, 2FA
    (admin)/     # Painel admin completo
    (teacher)/   # Área do professor
    (student)/   # Área do aluno
    (checkout)/  # Checkout e confirmação
    (public)/    # Páginas públicas
  components/
    ui/          # Design System (Button, Card, Dialog, etc.)
    layout/      # Sidebar, Header
    player/      # VideoPlayer com controles
    ...
  lib/
    types/       # Todos os tipos TypeScript
    mock/        # Dados e funções mock (substitua por fetch real)
    utils/       # Utilitários (cn, formatCurrency, etc.)
    constants/   # Constantes globais e rotas
  styles/
    globals.css  # Tokens CSS + Tailwind + temas light/dark
```

## Backend

Todos os dados vêm de `src/lib/mock/data.ts`.
Para conectar ao backend real, substitua as funções em `api.*` por `fetch()`.

```ts
// Antes (mock)
const users = await api.getUsers();

// Depois (real)
const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
const users = await res.json();
```

## Design System

Tokens definidos em `tailwind.config.ts` e `globals.css`.
Tema light/dark automático via classe `.dark` no `<html>`.
