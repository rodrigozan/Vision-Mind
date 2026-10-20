import { isAbsolute, relative, resolve, sep } from "node:path";
import { env } from "@vision-mind/shared";

export const vaultRoot = resolve(process.cwd(), env.VAULT_PATH);

export function resolveInVault(relativeOrAbsolute: string): string {
  const target = isAbsolute(relativeOrAbsolute) ? resolve(relativeOrAbsolute) : resolve(vaultRoot, relativeOrAbsolute);
  const within = relative(vaultRoot, target);
  if (within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)) {
    throw new Error("caminho fora do vault");
  }
  return target;
}
