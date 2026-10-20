export { resolveInVault, vaultRoot } from "./paths.js";
export { readNote, writeNote } from "./notes.js";
export type { Note, NoteFrontmatter } from "./notes.js";
export { readFocoDaSemana, writeFocoDaSemana, readTodo } from "./foco.js";
export type { VaultFile } from "./foco.js";
export { commitAndPush } from "./git.js";
export type { CommitResult } from "./git.js";
export { readScopedContext } from "./context.js";
export type { ContextResult, ContextSource } from "./context.js";
