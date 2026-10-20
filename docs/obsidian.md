# Sincronizar o cofre com o Obsidian local

O cofre (`VAULT_PATH`) é um repositório Git próprio, separado do monorepo. Em dev, ele vive em `vault-dev/` (já inicializado localmente). Em produção, vive em `/srv/vision-mind/vault`, com um remoto Git privado configurado em `VAULT_GIT_REMOTE`.

## No servidor (Vision Mind)

- `POST /context/search` exige `API_TOKEN` e `CONTEXT_SCOPES_PATH`. O catálogo JSON lista arquivos Markdown exatos por escopo `client` ou `profile`; a chamada informa apenas `scopeId` e `query`. A resposta contém trechos limitados, caminho e `sha256` do conteúdo. Sem catálogo, o acesso é negado. Veja `context-scopes.example.json`.
- Escrita automática começa desligada (`VAULT_AUTOMATED_WRITES=false`). Ao habilitar, `writeNote` cria somente notas novas e falha se o slug já existe. `writeFocoDaSemana` exige a revisão SHA-256 lida antes e falha se o arquivo mudou.
- `commitAndPush(mensagem, paths)` inclui somente os arquivos informados. Só faz `git push` quando `VAULT_AUTO_PUSH=true` **e** `VAULT_GIT_REMOTE` está configurado. Se o push for rejeitado, o commit local permanece para reconciliação; não repita a skill antes de resolver a divergência.
- Motores CLI executam a partir do diretório do worker, separado do vault. A saída `DESTINO:` de `content-cascade` só pode indicar `negocio/conteudo` ou `clientes/<slug>/conteudo`.
- Antes de ligar `VAULT_AUTO_PUSH=true` em produção, crie um repositório Git privado (GitHub, Gitea, ou outro) e aponte `VAULT_GIT_REMOTE` para ele.

## No PC (Obsidian)

1. Abra a pasta do cofre (clone do mesmo repositório remoto) como vault no Obsidian.
2. Instale o plugin **Obsidian Git** (community plugin).
3. Nas configurações do plugin:
   - **Vault backup**: desativado (o commit já é feito pelo Vision Mind).
   - **Pull updates on startup**: ativado.
   - **Auto pull interval (minutes)**: `5` — assim o PC busca as notas novas que o Vision Mind escreveu na VPS a cada 5 minutos.
   - **Auto push**: opcional. Se você também edita notas no PC e quer que voltem pra VPS, ative com um intervalo curto; senão, deixe desativado e empurre manualmente.
4. Como o cofre é compartilhado (VPS escreve, PC lê e às vezes escreve), prefira sempre `pull --rebase` a merges manuais — o plugin já faz isso por padrão.

## Conflitos

Se a nota já existir, se o foco semanal mudar após a leitura ou se o push Git for rejeitado, a tarefa falha de forma explícita. Examine o estado do vault em ambos os lados, faça pull/rebase ou resolva o conflito manualmente, confirme que o conteúdo foi preservado e só então reexecute a tarefa. Não faça `git reset --hard` para recuperar uma fila.
