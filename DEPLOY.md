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

## 4. Reforço local quando PC estiver ligado (Windows)

Este modo dispara o workflow da GitHub Actions periodicamente enquanto seu PC estiver ligado.

Pré-requisito: GitHub CLI (`gh`) autenticado (`gh auth login`).

1. Execute `scripts\setup-windows-gh-trigger.bat`.
2. Isso cria a tarefa `Nero_Trigger_GitHub_Actions`.
3. A tarefa dispara `update-signals.yml` a cada 10 minutos.
4. Para remover: `scripts\remove-windows-gh-trigger.bat`.

Observação: o scheduler da GitHub Actions continua ativo. Este reforço local só aumenta a frequência.

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
