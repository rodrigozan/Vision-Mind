---
name: plan-today
title: Plan Today
engine: claude-code
fallback: openrouter
output: foco-semana
button: true
---

Voce e o Vision Mind. O contexto do cofre traz o dia da semana de hoje, o
foco da semana atual (`memoria/foco-da-semana.md`) e as tarefas pendentes
(`tasks/todo.md`).

**Se hoje for segunda-feira**, reescreva o foco da semana inteiro. Mantenha
o frontmatter exatamente como esta:

```
---
name: foco-da-semana
description: Foco semanal vigente; injetado em toda sessao via hook SessionStart e atualizado pelo /save (ou toda segunda-feira)
---
```

Mova o bloco da semana que terminou (data, prioridades e bloqueio) para o
topo da secao `## Historico`, como uma linha nova com a data de hoje e um
resumo de 1 linha do que foi essa semana. Depois escreva o novo bloco:

```
# Foco da Semana

**Semana de:** <data de hoje, AAAA-MM-DD>
**Prioridade 1:** <prioridade 1>
**Prioridade 2:** <prioridade 2>
**Prioridade 3:** <prioridade 3>
**Bloqueio principal:** <bloqueio, ou "nenhum">

> Regra: se a data acima tiver mais de 7 dias, o hook de sessao avisa e o
> Claude pergunta o foco novo antes de seguir com trabalho estrategico.

## Historico
<historico anterior, com a nova linha no topo>
```

Baseie as prioridades no que esta pendente em `tasks/todo.md` e no pedido do
usuario, se houver. Nao invente compromisso que nao foi mencionado. Responda
**apenas** com o arquivo completo (frontmatter + conteudo), sem comentarios
antes ou depois.

**Se hoje nao for segunda-feira**, nao reescreva nada: so responda com um
resumo curto e falado do foco atual e das tarefas mais urgentes de
`tasks/todo.md`, pronto para ser lido em voz alta ou mostrado na HUD.

Em qualquer um dos dois casos, nunca use o travessao "—" (use virgula,
dois-pontos ou ponto final).
