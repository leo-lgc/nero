# Deploy do Nero

## 1. Publicar na Vercel

1. Acesse `https://vercel.com`.
2. Faça login com GitHub.
3. Clique em `Add New...` -> `Project`.
4. Importe o repositório `leo-lgc/nero`.
5. Use estas configurações:
   - Framework Preset: `Other`
   - Root Directory: padrão
   - Build Command: vazio
   - Output Directory: vazio
6. Clique em `Deploy`.

## 2. Testar deploy

Depois do deploy, valide:

- `/`
- `/methodology`
- `/data/signals.json`
- troca de tema `Dark/Light`
- troca de idioma `PT/EN`

## 3. Ativar atualização automática (GitHub Actions)

1. No GitHub, abra o repositório `leo-lgc/nero`.
2. Vá em `Actions`.
3. Abra o workflow `Update signals`.
4. Clique em `Run workflow` uma vez para teste manual.
5. Confirme se o workflow terminou com sucesso.
6. Verifique se houve novo commit automático atualizando `data/signals.json`.

## 4. Alternativa mais precisa: Railway cron + GitHub

Use quando quiser intervalo mais curto e mais previsível que o scheduler do GitHub.

1. Na Railway, crie um novo projeto a partir do repositório `leo-lgc/nero`.
2. Configure variáveis de ambiente do serviço:
   - `GH_PAT` = Personal Access Token com permissão `contents:write` no repositório.
   - `GH_OWNER` = `leo-lgc`
   - `GH_REPO` = `nero`
   - `GH_BRANCH` = `main`
3. Configure o comando de execução do job:
   - `node scripts/railway-sync-signals.js`
4. No scheduler da Railway, defina o cron desejado (ex: a cada 5 minutos).
5. Rode uma execução manual para validar.

Observação: esse fluxo gera commit no GitHub apenas quando `data/signals.json` muda.

## 5. Conferir produção

Depois do workflow rodar:

1. Abra o site publicado.
2. Faça refresh forte.
3. Confirme se o feed continua carregando normalmente.
4. Confirme se `data/signals.json` mostra timestamp recente.

## 6. Domínio próprio depois

Quando quiser remover `vercel.app`:

1. Compre um domínio.
2. Na Vercel, abra o projeto.
3. Vá em `Settings` -> `Domains`.
4. Adicione o domínio.
5. Configure os registros DNS pedidos pela Vercel.
