# Lista de Nomes

Um formulário público em que o visitante escolhe um festival pelo banner, informa o nome, seleciona um ou mais dias da semana e escolhe um horário (18:40 ou 19:10). As inscrições ficam guardadas em um banco de dados e só podem ser vistas, pesquisadas, removidas e exportadas por administradores.

## Telas

- **`/`**: formulário público para escolher o festival pelo banner, informar o nome, escolher dias da semana e selecionar o horário.
- **`/admin`**: área restrita. Login, aceite de convite, redefinição de senha, cadastro de festivais com banners, lista de inscrições com busca, total/recebidos hoje, exclusão e exportação (CSV para Excel com `;`, CSV padrão para Google Sheets e TXT só com os nomes).

## Tecnologias

- TanStack Start (React 19) + Tailwind CSS 4 + componentes shadcn/ui
- Netlify Database (Postgres gerenciado) com Drizzle ORM
- Netlify Blobs para armazenar banners enviados pelos administradores
- Netlify Identity (`@netlify/identity`) para login dos administradores
- Hospedagem na Netlify

## Rodando localmente

```bash
pnpm install
pnpm dev:local   # teste local sem conta ou serviços Netlify
```

Abra `http://localhost:3000`. No modo local, acesse `/admin` para criar festivais e testar inscrições; não é necessário fazer login. Os dados e banners ficam em `.local-test/`, ignorado pelo Git, e persistem entre execuções.

Para testar com os serviços reais da Netlify, use `netlify dev` em um projeto vinculado à sua conta.

## Banco de dados

O schema fica em `db/schema.ts`. Depois de alterá-lo, gere uma migração:

```bash
npx drizzle-kit generate --name <descricao_da_mudanca>
```

As migrações em `netlify/database/migrations/` são aplicadas automaticamente no deploy.
