import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const ROOT = resolve(__dirname, "../..");
export const SRC = join(ROOT, "src");

export interface SourceFile {
  path: string;
  relativePath: string;
  text: string;
}

const IGNORED = new Set(["node_modules", ".next", "coverage", "playwright-report", "test-results"]);

export const collectFiles = (directory: string, extensions: readonly string[]): string[] =>
  readdirSync(directory).flatMap((entry) => {
    if (IGNORED.has(entry)) return [];
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return collectFiles(path, extensions);
    return extensions.some((extension) => path.endsWith(extension)) ? [path] : [];
  });

export const readSources = (directory: string): SourceFile[] =>
  collectFiles(directory, [".ts", ".tsx"]).map((path) => ({
    path,
    relativePath: relative(ROOT, path),
    text: readFileSync(path, "utf8"),
  }));

const IMPORT_PATTERN = /(?:import|export)\s[^"';]*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

export const importSpecifiers = (text: string): string[] =>
  Array.from(text.matchAll(IMPORT_PATTERN), (match) => match[1] ?? match[2] ?? match[3]);

export const toSrcPath = (fromFile: string, specifier: string): string | null => {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith(".")) {
    const absolute = resolve(fromFile, "..", specifier);
    return relative(SRC, absolute);
  }
  return null;
};
