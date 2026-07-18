# Modula Clinic — Frontend (Web)

Web app do Modula Clinic ("Smart Treatment Journey"): React + Vite, Tailwind,
shadcn/ui, Recharts e React Query com hooks gerados a partir do contrato
OpenAPI.

## Requisitos

- Node.js 24+
- pnpm 10+
- Backend do Modula Clinic rodando (repositório do backend)

## Setup

```bash
pnpm install
cp .env.example .env   # ajuste PORT/BASE_PATH se necessário
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/modula-clinic run dev
```

O app espera a API no mesmo domínio, sob `/api`. Em desenvolvimento, faça o
backend rodar atrás de um proxy no mesmo host, ou adicione um proxy no
`artifacts/modula-clinic/vite.config.ts`:

```ts
server: {
  // ...
  proxy: { "/api": "http://localhost:5000" },
}
```

## Scripts

- `pnpm --filter @workspace/modula-clinic run dev` — dev server (requer PORT e BASE_PATH)
- `pnpm --filter @workspace/modula-clinic run build` — build de produção (dist/public)
- `pnpm run typecheck` — typecheck de todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenera os hooks React Query a partir do OpenAPI

## Estrutura

- `artifacts/modula-clinic` — aplicação React (páginas em `src/pages`, tema em `src/index.css`)
- `lib/api-spec` — contrato OpenAPI (copiado do repositório do backend)
- `lib/api-client-react` — hooks React Query gerados (Orval)

## Sincronizando o contrato OpenAPI entre os repositórios

O arquivo `lib/api-spec/openapi.yaml` é a fonte da verdade do contrato da API
e existe nos dois repositórios (backend e frontend). Após a separação:

1. Toda mudança de contrato deve ser feita primeiro no backend (openapi.yaml).
2. Copie o `openapi.yaml` atualizado para o repositório do frontend.
3. Em cada repositório, rode `pnpm --filter @workspace/api-spec run codegen`
   para regenerar os schemas Zod (backend) e os hooks React Query (frontend).
4. Faça commit do spec e do código gerado juntos.

Dica: mantenha a versão do contrato em `info.version` do openapi.yaml e trate
mudanças incompatíveis como breaking changes coordenadas entre os dois repos.
