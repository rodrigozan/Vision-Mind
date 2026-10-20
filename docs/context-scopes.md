# Consulta de contexto por escopo

Configure `CONTEXT_SCOPES_PATH` com um JSON como `context-scopes.example.json`. Cada entrada tem `id`, `kind` (`client` ou `profile`) e lista de caminhos `.md` relativos ao vault. Inclua somente notas aprovadas para o serviço que usa o token. O catálogo pode ficar fora do repositório; não contém credenciais.

```http
POST /context/search
Authorization: Bearer <API_TOKEN>
Content-Type: application/json

{"scopeId":"client:acessibilidade-certa","query":"objetivos do projeto"}
```

A resposta tem `scopeId`, `kind` e `sources: [{ path, revision, excerpt }]`. `revision` é o SHA-256 do conteúdo lido, útil para verificar a fonte mesmo com alterações locais ainda sem commit. A consulta lê somente arquivos explícitos do escopo, rejeita caminhos fora do vault e links simbólicos que escapem da raiz. Limites atuais: 12 arquivos por escopo, 64 KiB por arquivo, 12 mil caracteres por resposta e 3 mil por trecho. Nenhuma escrita é feita nessa rota.

No PhanterClaw, configure `PHANTERCLAW_CONTEXT_ACCESS_PATH` com um mapa `principals` de `canal:usuario` para IDs de escopo. Sem entrada permitida, `/vision with <escopo> <pedido>` é negado antes de consultar a API. O comando devolve as referências junto ao resultado e não delega quando a busca não encontra fonte. O `/vision <pedido>` sem escopo continua disponível apenas para pedidos que não exijam contexto do vault.
