# Motores — comandos reais (confirmados com `--help`)

Verificado em 2026-10-18 na VPS `phanterai`. Todas as CLIs aceitam prompt como argumento (sem shell), compatível com `execa`.

## claude-code

```
claude -p "<prompt>" --output-format json
```

- Binário: `/root/.local/bin/claude` (standalone, não depende do Node do sistema).
- Versão instalada: 2.1.302.
- Autenticação: já logado nesta sessão (plano pago).
- **Smoke test confirmado**: `claude -p "responda apenas: ok" --output-format json` → `"result":"ok"` em ~2.3s.
- Flags úteis: `--permission-mode bypassPermissions` (ou `--dangerously-skip-permissions`) para rodar sem prompts; `--model <id>` para fixar o modelo; `--add-dir` para liberar acesso a outros diretórios.
- `--output-format` aceita `text` (padrão), `json` (resultado único) ou `stream-json`.

## codex

```
codex exec "<prompt>"
```

- Binário: `/root/.local/bin/codex` (standalone).
- Versão instalada: codex-cli 0.162.1.
- Autenticação: já logado via ChatGPT.
- Subcomando correto é `exec` (alias `e`), não uma flag solta. Suporta `-c key=value` para overrides de config (ex.: `-c sandbox_permissions='["disk-full-read-access"]'`), `-m/--model`, `-i/--image`.
- Lê o prompt como argumento ou via stdin (`-`).
- **Importante**: precisa rodar com `cwd` dentro de um repositório Git confiável, senão falha com `Not inside a trusted directory`. Usar `--skip-git-repo-check` se precisar rodar fora de um repo, ou sempre passar `cwd: VAULT_PATH`/pasta do projeto (que são repos Git) no adapter.
- **Smoke test confirmado**: `codex exec "responda apenas: ok"` dentro de `/root/Vision-Mind` → `ok` em poucos segundos. `bubblewrap` foi instalado via apt para o sandboxing nativo (sem ele, o Codex usa um bubblewrap embutido e avisa).

## qwen-code

```
qwen -p "<prompt>" --auth-type <tipo> --output-format text
```

- Pacote: `@qwen-code/qwen-code` (npm), instalado globalmente (versão 0.25.2). Binário: `/usr/local/bin/qwen`.
- **Pendente**: o subcomando `qwen auth` foi removido nesta versão. Autenticação agora é via `--auth-type` (`openai`, `openai-responses`, `anthropic`, `qwen-oauth`, `gemini`, `vertex-ai`) combinado com a chave correspondente (ex.: `--openai-api-key` ou variável de ambiente) ou gravada em `settings.json`. Testei `qwen -p "..."` sem configurar nada e recebi: `No auth type is selected. Please configure an auth type (e.g. via settings or --auth-type) before running in non-interactive mode.`
- **Ação necessária do usuário**: decidir qual provedor/chave usar (ex.: `qwen-oauth` para conta Qwen, ou uma chave OpenRouter/compatível via `--auth-type openai --openai-api-key ... --openai-base-url ...`) e configurar antes do smoke test da Fase 2.
- `--output-format` aceita `text`, `json`, `stream-json`.

## antigravity

```
agy -p "<prompt>" --mode=accept-edits --output-format text
```

- Instalado via script oficial (`curl -fsSL https://antigravity.google/cli/install.sh | bash`). Binário: `/root/.local/bin/agy`, versão 1.4.2.
- **Pendente**: ainda não autenticado. Em máquina sem navegador, o fluxo é: rodar `agy`, copiar a URL de autorização impressa, abrir em outro dispositivo, logar, colar o código de volta no terminal. O token fica em `~/.gemini/antigravity-cli/antigravity-oauth-token`. Alternativa para CI/headless: `echo '{"modelProvider": "gemini"}' > ~/.gemini/antigravity-cli/settings.json` e exportar `GEMINI_API_KEY`.
- **Risco conhecido**: há um bug reportado (issue pública do projeto) em que `agy -p "<prompt>"` pode travar indefinidamente em contexto não-TTY (subprocesso, pipe, job em background) — exatamente o jeito que `packages/engines` vai chamá-lo via `execa`. Antes de usar `antigravity` como motor em produção, validar com um teste real com timeout curto (`timeout 20 agy -p "..."`) e, se travar, usar `qwen-code` como motor primário da rota `research-agent` e manter `antigravity` só com fallback e timeout agressivo configurado em `engines.config.json`.
- Flags confirmadas: `-p/--print`, `--mode <accept-edits|auto|plan>`, `--dangerously-skip-permissions`, `--output-format <text|json|stream-json>`, `--print-timeout`.
- Por segurança, não executei `agy -p` interativamente nesta sessão (bloqueado pelo modo automático do Claude Code, por ser ele mesmo um agente que executa ações) — confirmar o smoke test manualmente ou dentro do `packages/engines` com timeout.

## openrouter

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
```

- HTTP puro, sem CLI. `isAvailable()` verifica apenas se `OPENROUTER_API_KEY` existe no ambiente.

## Correção aplicada em `packages/engines` (Fase 2)

O adapter de CLI (`packages/engines/src/adapters/cli.ts`) chamava `execa` sem fixar `stdin`, herdando o stdin do processo pai. Em job em segundo plano (sem TTY), isso fazia o `codex exec` ficar esperando "input adicional via stdin" mesmo com o prompt já passado como argumento, até dar timeout. Corrigido passando `stdin: "ignore"` em todas as chamadas de `execa` (`isAvailable` e `run`). Confirmado com `yarn engines:smoke`: `codex` passou a responder em ~4s em vez de travar.

## Achado confirmado: `agy -p` trava em modo headless sem autenticação

Com `stdin: "ignore"`, `agy -p` não falha rápido — ele entra no fluxo de OAuth e fica em "Waiting for authentication (timeout 60s)..." até o timeout configurado. Isso confirma o risco já registrado abaixo: em produção, usar `qwen-code` como motor primário de `research-agent` e manter `antigravity` só como fallback com timeout agressivo, até a autenticação ser configurada.

## Bloqueio de root resolvido sem usuário `vision`

`claude -p ... --permission-mode bypassPermissions` (ou `--dangerously-skip-permissions`) falha como root com `cannot be used with root/sudo privileges for security reasons`. A saída óbvia (`IS_SANDBOX=1`) remove uma proteção deliberada contra um agente com bypass total rodando como root — rejeitada.

Em vez disso, `engines.config.json` usa `--permission-mode acceptEdits` para o `claude-code`. Testado como root: funciona sem bloqueio nenhum (`claude -p "responda apenas: ok" --output-format json --permission-mode acceptEdits` retorna normalmente). `acceptEdits` autoaprova edição/criação de arquivo, que é o que as skills precisam para ler o cofre e (quando a skill escrever direto) editar notas, sem liberar bypass geral de Bash/ferramentas perigosas. Decisão: **rodar tudo como root, sem criar o usuário `vision`** — `codex` e `agy` já funcionavam como root sem nenhum bloqueio.

## Status de autenticação dos motores (2026-10-19)

- **claude-code**: ok, roda como root com `acceptEdits` (acima).
- **codex**: ok, roda como root sem bloqueio. Lembrar do `cwd` dentro de repo Git confiável (ver acima).
- **antigravity (agy)**: ok, já autenticado nesta VPS (`agy models` responde normalmente, token OAuth presente em `~/.gemini/antigravity-cli/`). O "pendente" registrado antes já foi resolvido.
- **qwen-code**: **deixado de lado por decisão do Rod.** Sem `--auth-type`/chave configurada. A rota `code-cheap` continua apontando pra ele em `routes.json`, mas o fallback (`qwen-code → openrouter`) cobre a falha automaticamente — cada chamada a essa rota perde um pouco de tempo tentando o qwen antes de cair no OpenRouter, mas não quebra nada. Revisitar quando/se o Rod quiser configurar.
- **openrouter**: precisa de `OPENROUTER_API_KEY` num `.env` real (ainda não existe, só `.env.example`).
