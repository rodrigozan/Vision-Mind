import type { RouteId } from "./types.js";

export const EXAMPLE_SUITE: Array<[text: string, expectedRoute: RouteId]> = [
  ["Quanto e 12 vezes 8?", "quick-answer"],
  ["Que dia da semana e hoje?", "quick-answer"],
  ["Me conta uma curiosidade sobre o sistema solar", "quick-answer"],
  ["Qual e a capital da Mongolia?", "quick-answer"],
  ["Refatora o modulo de autenticacao da API para usar JWT em vez de sessao", "code-heavy"],
  ["Preciso reestruturar a arquitetura do worker pra separar fila de retry", "code-heavy"],
  ["Reescreve esse servico inteiro em TypeScript seguindo a nova arquitetura de plugins", "code-heavy"],
  ["Esse codigo de paginacao ta com um bug bobo, corrige rapido", "code-fast"],
  ["Ajusta esse script pra aceitar um argumento opcional", "code-fast"],
  ["Conserta esse erro de tipagem no arquivo router.ts", "code-fast"],
  ["Roda essa tarefa simples de renomear variavel em lote nesses 10 arquivos", "code-cheap"],
  ["Faz essa mudanca repetitiva e barata em massa nos componentes", "code-cheap"],
  ["Atualiza o texto desse botao em todos os componentes, tarefa simples", "code-cheap"],
  ["Pesquisa os concorrentes do Vision Mind no mercado de assistentes pessoais", "research-agent"],
  ["Investiga por que o Redis esta consumindo tanta memoria, isso pode levar um tempo", "research-agent"],
  ["Levanta informacoes sobre as melhores praticas de STT em portugues", "research-agent"],
  ["Anota uma ideia: criar modo noturno pro HUD", "vault-write"],
  ["Registra essa tarefa pra eu revisar amanha: configurar backup do cofre", "vault-write"],
  ["Lembra de eu renovar o dominio em dezembro", "vault-write"],
  ["Cria uma nota sobre o que discutimos na reuniao de hoje", "vault-write"],
];
