# Lista de Nomes

Um formulário público em que o visitante informa apenas o nome. Os nomes ficam guardados em um banco de dados e só podem ser vistos, pesquisados, removidos e exportados por administradores.

## Telas

- **`/`**: formulário público com um único campo (nome).
- **`/admin`**: área restrita. Login, aceite de convite, redefinição de senha, lista de nomes com busca, total/recebidos hoje, exclusão e exportação (CSV para Excel com `;`, CSV padrão para Google Sheets e TXT só com os nomes).

## Tecnologias

- TanStack Start (React 19) + Tailwind CSS 4 + componentes shadcn/ui
- Netlify Database (Postgres gerenciado) com Drizzle ORM
- Netlify Identity (`@netlify/identity`) para login dos administradores
- Hospedagem na Netlify

## Como adicionar um administrador

1. No painel da Netlify, abra o projeto → **Identity** → **Invite users** e informe o e-mail.
2. A pessoa recebe o convite, clica no link e cria uma senha (o site a leva para `/admin`).
3. Em **Identity**, abra o usuário e adicione o papel (role) **`admin`**.

Só contas com o papel `admin` conseguem ver a lista: a checagem acontece no servidor. Recomendo deixar o cadastro como **Invite only** em *Project configuration → Identity → Registration*.

## Rodando localmente

```bash
pnpm install
netlify dev   # disponibiliza banco de dados e Identity localmente
```

## Banco de dados

O schema fica em `db/schema.ts`. Depois de alterá-lo, gere uma migração:

```bash
npx drizzle-kit generate --name <descricao_da_mudanca>
```

As migrações em `netlify/database/migrations/` são aplicadas automaticamente no deploy.
