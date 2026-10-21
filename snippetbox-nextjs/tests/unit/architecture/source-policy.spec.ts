import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ROOT, collectFiles } from "@tests/support/source-files";

const ROOT_CONFIG_FILES = [
  "vitest.config.ts",
  "playwright.config.ts",
  "next.config.ts",
  "eslint.config.mjs",
].map((file) => join(ROOT, file));

const files = [
  ...collectFiles(join(ROOT, "src"), [".ts", ".tsx"]),
  ...collectFiles(join(ROOT, "tests"), [".ts", ".tsx"]),
  ...ROOT_CONFIG_FILES,
];

const scriptKindOf = (path: string): ts.ScriptKind => {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};

const findComments = (path: string): string[] => {
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKindOf(path));
  const found = new Set<number>();

  const record = (ranges: ts.CommentRange[] | undefined) => {
    ranges?.forEach((range) => found.add(range.pos));
  };

  const visit = (node: ts.Node) => {
    if (node.kind !== ts.SyntaxKind.JsxText) {
      record(ts.getLeadingCommentRanges(text, node.getFullStart()));
      record(ts.getTrailingCommentRanges(text, node.getEnd()));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return [...found].map((position) => {
    const { line } = source.getLineAndCharacterOfPosition(position);
    return `${path.replace(`${ROOT}/`, "")}:${line + 1}`;
  });
};

describe("source code policy", () => {
  it("analyses a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(80);
  });

  it("contains no comments anywhere in source, tests or configuration", () => {
    expect(files.flatMap(findComments)).toEqual([]);
  });

  it("detects comments when they exist", () => {
    const sample = ts.createSourceFile("x.ts", "const a = 1; // note\n/* block */ const b = 2;", ts.ScriptTarget.Latest, true);
    const ranges = [
      ...(ts.getTrailingCommentRanges(sample.text, 12) ?? []),
      ...(ts.getLeadingCommentRanges(sample.text, 20) ?? []),
    ];
    expect(ranges.length).toBeGreaterThan(0);
  });
});
