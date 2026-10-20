# Vision Mind — Roteiro de Implementação

> Roteiro para agentes do Claude Code. Executar fase por fase, na ordem. Cada fase termina com seu critério de aceite validado antes de seguir.

## Contexto

Vision Mind é um assistente pessoal estilo "Jarvis OS" do Rod, hospedado em VPS própria, com:

- **Voz**: STT (faster-whisper) e TTS (Kokoro) rodando na VPS.
- **Cofre**: memória em markdown puro, versionada em Git e sincronizada com o Obsidian local.
- **Jev (TypeSafe)**: classificador via OpenRouter que escolhe **tier** e **motor** de cada pedido a partir de uma lista fixa.
- **Motores**: Claude Code, Codex, OpenRouter, Antigravity CLI e Qwen Code.
- **Cockpit/HUD**: painel web (PWA) acessível do PC e do celular.
- **Skills**: pastas com `SKILL.md`, executadas como jobs em segundo plano.

## Restrições da VPS

- 2 vCPU, 8 GB RAM, 100 GB disco.
- Sem GPU: STT e TTS em CPU, com int8 e **um job de áudio por vez**.
- Motores CLI pesados (Claude Code, Codex, Antigravity, Qwen Code) executam **no máximo 1 em paralelo**. A fila controla isso.
- Nenhuma senha, chave ou token em código. Tudo em `.env`.

## Stack

- Monorepo com Yarn workspaces.
- `apps/api`: Node.js 22 + Fastify + TypeScript.
- `apps/hud`: Next.js (App Router) + Tailwind, PWA.
- `apps/worker`: Node.js + BullMQ.
- `services/voice`: Python 3.12 + FastAPI + faster-whisper + kokoro-onnx.
- Redis para a fila.
- Caddy para HTTPS.
- PM2 para os processos Node e systemd para o serviço de voz.
- Cofre em `/srv/vision-mind/vault` (repositório Git separado).

## Estrutura de pastas

```
vision-mind/
  apps/
    api/
    hud/
    worker/
  services/
    voice/
  packages/
    engines/
    jev/
    vault/
    shared/
  skills/
  infra/
    Caddyfile
    ecosystem.config.cjs
    vision-voice.service
  .env.example
```

O cofre **nao** e uma pasta nova: e o vault real do Rod, em
`/root/obsidian/brainiac` (repositorio Git proprio, remoto
`github.com/rodrigozan/obsidian`). Ele tem sua propria constituicao em
`.claude/CLAUDE.md`, que **proibe explicitamente** inbox, diario e pastas de
fila ("tudo que eu falo vira registro no lugar certo, na hora"). O Vision
Mind escreve dentro dessa estrutura ja existente, nunca por cima dela:

```
brainiac/
  tasks/            # todo.md (fonte unica de tarefas), lessons.md
  memoria/          # MEMORY.md, foco-da-semana.md, perfil.md
  conhecimento/     # raw/ (material bruto) e wiki/ (compilado, interligado)
  negocio/          # produtos/ e conteudo/ (output do content-cascade p/ PhanterAI)
  clientes/         # <slug>/overview.md, e <slug>/conteudo/ quando for conteudo de cliente
  projetos/         # so o indice: <slug>.md por projeto de codigo
  pessoal/, pessoas/, reunioes/, arquivo/, assets/
  .claude/          # constituicao do vault, skill /save, hooks
  .vision-mind/     # pasta tecnica do proprio Vision Mind (ex.: _jev-log.md)
```

**Nao criar `inbox/`, `diario/` ou `wiki/` na raiz** - isso contraria a
constituicao do vault. Mapeamento das skills (Fase 6) pra essa estrutura
real:

| Skill | Le | Escreve em |
|---|---|---|
| `plan-today` | `memoria/foco-da-semana.md`, `tasks/todo.md` | `memoria/foco-da-semana.md` (so as segundas; nos outros dias so responde, sem gravar) |
| `inbox-brief` | `memoria/foco-da-semana.md`, `tasks/todo.md` | nada (so resposta falada/HUD) |
| `content-cascade` | pedido do usuario | `negocio/conteudo/` ou `clientes/<slug>/conteudo/` (a skill decide e declara) |
| `deep-research` | pedido do usuario | `projetos/<slug>.md` (indice; cita `/root/phanterai_creative_agency/<slug>/` quando for codigo) |
| `harvest` | `conhecimento/raw/` | `conhecimento/wiki/` |
| `weekly-review` | `memoria/foco-da-semana.md`, `tasks/todo.md` | `conhecimento/wiki/` |

---

## Fase 0 — Preparação da VPS

Tarefas:

1. Atualizar o sistema. **Decisão (Rod):** rodar tudo como `root`, sem criar usuário `vision` separado. O motivo original (o `claude-code` recusa bypass total de permissões como root) foi resolvido usando `--permission-mode acceptEdits` em vez de `bypassPermissions`/`--dangerously-skip-permissions` (ver `docs/engines.md`) - funciona como root, sem abrir mão da proteção contra bypass total.
2. Configurar o UFW liberando apenas as portas 22, 80 e 443.
3. Criar 4 GB de swap.
4. Instalar Node 22 (via nvm), Yarn, Git, Python 3.12, Redis, Caddy, ffmpeg e PM2.
5. Instalar e autenticar as CLIs:
   - Claude Code (login com plano pago).
   - Codex CLI (login com plano pago).
   - Qwen Code CLI.
   - Antigravity CLI.
6. Registrar em `docs/engines.md` o comando real de execução não interativa de cada CLI e suas flags, confirmado com `--help` de cada uma.

Comandos de referência (um por linha):

```
sudo apt update
sudo apt upgrade -y
sudo apt install -y git redis-server ffmpeg python3.12 python3.12-venv caddy ufw
corepack enable
yarn global add pm2
```

Aceite: `node -v` retorna 22.x, `python3.12 --version` responde, `redis-cli ping` retorna PONG, e cada CLI de motor responde a um prompt simples em modo não interativo.

---

## Fase 1 — Monorepo e cofre

Tarefas:

1. Criar o monorepo com Yarn workspaces e TypeScript compartilhado.
2. Criar o pacote `packages/vault` com:
   - `writeNote(pasta, titulo, conteudo, frontmatter)`.
   - `readNote(caminho)`.
   - `readFocoDaSemana()` / `writeFocoDaSemana(conteudo)`, que leem/sobrescrevem `memoria/foco-da-semana.md` (arquivo fixo, já existente no vault real; nunca criado sob demanda).
   - `readTodo()`, que lê `tasks/todo.md` (fonte única de tarefas; somente leitura).
   - `commitAndPush(mensagem)`, que faz git add, commit e push.
3. O cofre já existe (`/root/obsidian/brainiac`, repositório Git próprio com remoto). Não inicializar um repositório novo.
4. Documentar em `docs/obsidian.md` como sincronizar o cofre no PC com o plugin Obsidian Git (pull a cada 5 min).

Dependências de `packages/vault`:

```
yarn add simple-git gray-matter slugify date-fns
```

```
yarn add -D typescript @types/node vitest
```

Aceite: testes do `vault` passam, e uma nota criada pela VPS aparece no Obsidian local após o pull.

---

## Fase 2 — Adaptadores de motor (`packages/engines`)

Interface única para todos os motores:

```ts
export type EngineId = "claude-code" | "codex" | "openrouter" | "antigravity" | "qwen-code";

export interface EngineRequest {
  prompt: string;
  cwd?: string;
  model?: string;
  timeoutMs?: number;
}

export interface EngineResult {
  engine: EngineId;
  ok: boolean;
  output: string;
  durationMs: number;
  error?: string;
}

export interface Engine {
  id: EngineId;
  isAvailable(): Promise<boolean>;
  run(req: EngineRequest): Promise<EngineResult>;
}
```

Adaptadores:

| Motor | Tipo | Execução |
|---|---|---|
| claude-code | CLI | `claude -p "<prompt>" --output-format json` |
| codex | CLI | `codex exec "<prompt>"` |
| qwen-code | CLI | `qwen -p "<prompt>"` |
| antigravity | CLI | `agy -p "<prompt>" --mode=accept-edits` (usar `--dangerously-skip-permissions` só quando a skill exigir comandos de terminal, via `engines.config.json`) |
| openrouter | HTTP | `POST https://openrouter.ai/api/v1/chat/completions` |

Regras:

- CLIs executadas com `execa`, sem shell, com prompt passado como argumento ou stdin, e timeout configurável.
- O comando e as flags de cada CLI ficam em `engines.config.json` para não exigir mudança de código.
- `isAvailable()` verifica se o binário existe e está autenticado. No caso do OpenRouter, verifica se a chave existe.
- Cada motor tem um fallback configurável (ex.: `antigravity → qwen-code → openrouter`).

Dependências:

```
yarn add execa zod
```

Aceite: um script `yarn engines:smoke` envia o mesmo prompt a cada motor disponível e imprime motor, sucesso e tempo.

---

## Fase 3 — Jev, o roteador (`packages/jev`)

O Jev não gera texto. Ele escolhe **uma** rota de uma lista fixa.

Lista fixa de rotas (`routes.json`):

| Rota | Tier | Motor | Uso |
|---|---|---|---|
| `skill` | 1 | definido pela skill | usuário chamou uma skill pelo nome |
| `quick-answer` | 2 | openrouter | resposta curta, conversa, fato rápido |
| `code-heavy` | 3 | claude-code | código complexo, refatoração, arquitetura |
| `code-fast` | 3 | codex | ajuste pontual de código, script, bug simples |
| `code-cheap` | 3 | qwen-code | tarefa de código simples e barata, em lote |
| `research-agent` | 3 | antigravity | pesquisa e tarefas agênticas longas |
| `vault-write` | 2 | openrouter | registrar nota, tarefa ou ideia no cofre |

Tarefas:

1. Cliente OpenRouter que chama o modelo Jev com o pedido e a lista de rotas e exige como resposta apenas um id da lista.
2. Validação com zod: se a saída não for um id válido, usar a rota `quick-answer`.
3. Detecção determinística antes do Jev: se o pedido citar o nome de uma skill, ir direto para `skill` sem chamar o Jev.
4. Override manual: prefixos `@claude`, `@codex`, `@qwen`, `@antigravity` e `@router` forçam o motor.
5. Fallback: se o motor escolhido estiver indisponível, usar o fallback configurado na Fase 2.
6. Modo sem Jev: variável `JEV_ENABLED=false` faz o roteamento usar regras simples por palavras-chave.
7. Log de cada decisão em `.vision-mind/_jev-log.md` (pasta técnica do próprio Vision Mind, fora da taxonomia de conteúdo do vault) com pedido resumido, rota, motor e tempo.

Variáveis de ambiente:

```
OPENROUTER_API_KEY=
JEV_MODEL=
JEV_ENABLED=true
QUICK_ANSWER_MODEL=
```

Aceite: suíte de testes com 20 pedidos de exemplo atinge 85% ou mais de rotas corretas, e a decisão do Jev leva menos de 1 s.

---

## Fase 4 — Serviço de voz (`services/voice`)

Tarefas:

1. Criar venv com Python 3.12.
2. `POST /stt`: recebe áudio webm/ogg, converte com ffmpeg e transcreve com faster-whisper (`small`, `compute_type=int8`, idioma `pt`).
3. `POST /tts`: recebe texto e devolve áudio gerado pelo Kokoro ONNX com voz em português.
4. Lock global para que apenas um job de áudio rode por vez.
5. Escutar só em `127.0.0.1:8001`.
6. Criar o `vision-voice.service` para o systemd.

Dependências (`requirements.txt`): fastapi, uvicorn, faster-whisper, kokoro-onnx, soundfile, python-multipart.

Aceite: uma frase de 5 s é transcrita em até 5 s, e uma resposta de 2 frases é sintetizada em até 4 s.

---

## Fase 5 — API (`apps/api`)

Endpoints:

| Método | Rota | Função |
|---|---|---|
| POST | `/ask` | recebe texto, passa pelo Jev e enfileira o job |
| POST | `/voice` | recebe áudio, faz STT e segue o fluxo do `/ask` |
| GET | `/jobs/:id` | status e resultado do job |
| GET | `/events` | SSE com estados: idle, listening, working, speaking, error |
| GET | `/skills` | lista as skills disponíveis |
| POST | `/skills/:name/run` | executa uma skill |
| GET | `/vault/today` | foco da semana atual (`memoria/foco-da-semana.md`) |
| GET | `/engines/status` | disponibilidade de cada motor |

Regras:

- Autenticação por token de longa duração no header, definido em `.env`.
- Rate limit simples.
- Respostas do Tier 2 voltam direto. Tier 1 e Tier 3 viram jobs na fila.

Dependências:

```
yarn add fastify @fastify/cors @fastify/multipart @fastify/rate-limit bullmq ioredis zod dotenv
```

```
yarn add -D typescript tsx @types/node
```

Aceite: `/ask` com "quanto é 12 vezes 8" responde pelo Tier 2 em até 3 s, e `/ask` com um pedido de código cria um job visível em `/jobs/:id`.

---

## Fase 6 — Worker e skills (`apps/worker`, `skills/`)

Formato de skill:

```
skills/
  plan-today/
    SKILL.md
  inbox-brief/
    SKILL.md
  deep-research/
    SKILL.md
  content-cascade/
    SKILL.md
  weekly-review/
    SKILL.md
  harvest/
    SKILL.md
```

Frontmatter obrigatório de cada `SKILL.md`:

```yaml
---
name: plan-today
title: Plan Today
engine: claude-code
fallback: openrouter
output: foco-semana
button: true
---
```

`output` indica como o worker trata o resultado: nome de pasta real do vault (grava nota nova ali, ex. `conhecimento/wiki`), `foco-semana` (reescreve `memoria/foco-da-semana.md`, só as segundas-feiras), `conteudo` (a skill declara a pasta final na primeira linha da resposta, `DESTINO: <pasta>`), ou `none` (nada é gravado, é só resposta falada/HUD).

Tarefas:

1. O worker consome a fila com concorrência 1 para motores CLI e concorrência 3 para OpenRouter.
2. Executar a skill montando o prompt a partir do `SKILL.md` e do contexto do cofre (foco da semana em `memoria/foco-da-semana.md` e tarefas pendentes em `tasks/todo.md` - o vault real não tem "nota do dia").
3. Salvar o resultado conforme o `output` da skill (ver tabela acima) e chamar `commitAndPush`.
4. Emitir eventos de estado via Redis pub/sub para o SSE da API.
5. Skill `harvest`: transforma material bruto de `conhecimento/raw/` em artigo dentro de `conhecimento/wiki/`.
6. Agendar `plan-today` (dias úteis, 7h) e `weekly-review` (sexta, 17h) com jobs repetíveis do BullMQ, no fuso America/Sao_Paulo.

Aceite: o botão "Plan Today", numa segunda-feira, reescreve `memoria/foco-da-semana.md` e a mudança aparece no Obsidian local; nos demais dias, só devolve o foco atual sem gravar nada.

---

## Fase 7 — Cockpit/HUD (`apps/hud`)

Telas:

1. **HUD principal**: orbe central animada com os estados (idle, listening, working, speaking, error), relógio e botão "Tap to talk".
2. **Painel de skills**: grade de botões vinda de `/skills` com `button: true`.
3. **Motores**: status de cada motor e a última decisão do Jev.
4. **Hoje**: foco da semana vigente (`memoria/foco-da-semana.md`) e tarefas pendentes de `tasks/todo.md`.
5. **Jobs**: lista de execuções com motor, duração e link para a nota gerada.
6. **Customize dashboard**: escolher quais skills aparecem como botão.

Regras:

- Gravação de voz com MediaRecorder e detecção de pausa para enviar automaticamente. Esc cancela.
- Reprodução do áudio de `/tts` com fallback para `speechSynthesis` do navegador.
- PWA instalável (manifest e service worker).
- Tema escuro no padrão visual do Jarvis: fundo preto, partículas e tipografia monoespaçada.

Dependências:

```
yarn add next react react-dom framer-motion zustand
```

```
yarn add -D typescript tailwindcss postcss autoprefixer @types/react @types/node
```

Aceite: no celular, falar "planeja meu dia" muda a orbe para listening, working e speaking, executa a skill e mostra o resultado.

---

## Fase 8 — Deploy e segurança

Tarefas:

1. Caddyfile com HTTPS automático para o domínio do Vision Mind, fazendo proxy de `/api` para a API e do restante para o HUD.
2. `ecosystem.config.cjs` do PM2 com `api`, `worker` e `hud`, com limite de memória por processo.
3. Ativar `vision-voice.service` no systemd.
4. Opcional e recomendado: acesso só pela rede Tailscale.
5. Backup diário do cofre (push no Git) e do `.env` (cópia criptografada).
6. Script `yarn doctor` que verifica Redis, voz, cada motor, Git do cofre, espaço em disco e RAM livre, e sugere a correção de cada falha.

Aceite: `yarn doctor` aprova todos os itens, o HUD abre via HTTPS e o sistema sobe sozinho após um reboot.

---

## Fase 9 — Atalho no desktop (opcional)

Tarefas:

1. App leve em Tauri com atalho global `Ctrl+Alt+J`.
2. Ao acionar, grava o áudio, envia para `/voice` e toca a resposta.
3. Mostra uma mini orbe flutuante com o estado.

Aceite: de qualquer app no PC, `Ctrl+Alt+J` aciona o Vision Mind e recebe resposta falada.

---

## Variáveis de ambiente (`.env.example`)

```
NODE_ENV=production
API_PORT=3001
HUD_PORT=3000
API_TOKEN=
REDIS_URL=redis://127.0.0.1:6379
VOICE_URL=http://127.0.0.1:8001
VAULT_PATH=/srv/vision-mind/vault
VAULT_GIT_REMOTE=
OPENROUTER_API_KEY=
JEV_ENABLED=true
JEV_MODEL=
QUICK_ANSWER_MODEL=
TZ=America/Sao_Paulo
```

## Ordem de prioridade

Fases 0 → 1 → 2 → 3 → 5 → 6 entregam o núcleo funcional por texto. Depois, 4 → 7 adicionam voz e HUD. Por fim, 8 → 9 tratam deploy e atalho.
