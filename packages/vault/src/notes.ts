import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import slugify from "slugify";
import { resolveInVault } from "./paths.js";

export interface NoteFrontmatter {
  [key: string]: unknown;
}

export interface Note {
  frontmatter: NoteFrontmatter;
  content: string;
}

export async function writeNote(
  pasta: string,
  titulo: string,
  conteudo: string,
  frontmatter: NoteFrontmatter = {},
): Promise<string> {
  const slug = slugify(titulo, { lower: true, strict: true });
  const relativePath = join(pasta, `${slug}.md`);
  const absolutePath = resolveInVault(relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  resolveInVault(await realpath(dirname(absolutePath)));
  const file = matter.stringify(conteudo, { title: titulo, ...frontmatter });
  await writeFile(absolutePath, file, { encoding: "utf8", flag: "wx" });

  return relativePath;
}

export async function readNote(caminho: string): Promise<Note> {
  const absolutePath = resolveInVault(caminho);
  resolveInVault(await realpath(absolutePath));
  const raw = await readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  return { frontmatter: parsed.data, content: parsed.content.trim() };
}
