import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SRC,
  importSpecifiers,
  readSources,
  toSrcPath,
  type SourceFile,
} from "@tests/support/source-files";

type Layer =
  | "domain"
  | "application"
  | "infrastructure"
  | "api"
  | "presentation"
  | "module"
  | "index"
  | "client";

interface Location {
  area: "module" | "shared" | "bootstrap" | "shell" | "app" | "other";
  module?: string;
  layer?: Layer;
  sharedPart?: string;
}

const MODULES = ["identity", "snippets", "flash"];

const sources = readSources(SRC).map((file) => ({
  ...file,
  srcPath: file.relativePath.replace(/^src\//, ""),
}));

const locate = (srcPath: string): Location => {
  const parts = srcPath.split("/");
  if (parts[0] === "modules") {
    const [, moduleName, third] = parts;
    const file = third?.replace(/\.(ts|tsx)$/, "");
    const layer: Layer | undefined =
      file === "module" || file === "index" || file === "client"
        ? (file as Layer)
        : (third as Layer);
    return { area: "module", module: moduleName, layer };
  }
  if (parts[0] === "shared") return { area: "shared", sharedPart: parts[1] };
  if (parts[0] === "bootstrap") return { area: "bootstrap" };
  if (parts[0] === "shell") return { area: "shell" };
  if (parts[0] === "app") return { area: "app" };
  return { area: "other" };
};

interface Import {
  file: SourceFile & { srcPath: string };
  specifier: string;
  target: string | null;
}

const imports: Import[] = sources.flatMap((file) =>
  importSpecifiers(file.text).map((specifier) => ({
    file,
    specifier,
    target: toSrcPath(file.path, specifier),
  })),
);

const describeViolation = ({ file, specifier }: Import) =>
  `${file.srcPath} imports ${specifier}`;

const violations = (predicate: (item: Import, from: Location) => boolean): string[] =>
  imports
    .filter((item) => predicate(item, locate(item.file.srcPath)))
    .map(describeViolation);

const normalise = (target: string): string => target.replace(/\/index$/, "");

describe("project structure", () => {
  it("contains the expected feature modules", () => {
    const found = new Set(
      sources.filter((file) => file.srcPath.startsWith("modules/")).map((file) => file.srcPath.split("/")[1]),
    );
    expect([...found].sort()).toEqual([...MODULES].sort());
  });

  it("gives every module the same public entry points", () => {
    for (const moduleName of MODULES) {
      const files = sources.map((file) => file.srcPath);
      expect(files).toContain(`modules/${moduleName}/index.ts`);
      expect(files).toContain(`modules/${moduleName}/module.ts`);
      expect(files).toContain(`modules/${moduleName}/client.ts`);
    }
  });
});

describe("domain layer", () => {
  it("depends only on its own domain and the shared kernel", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "module" || from.layer !== "domain") return false;
        if (target === null) return true;
        const normalised = normalise(target);
        const own = `modules/${from.module}/domain`;
        return !(normalised.startsWith(own) || normalised.startsWith("shared/kernel/"));
      }),
    ).toEqual([]);
  });
});

describe("application layer", () => {
  it("depends only on its own domain and application and the shared kernel", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "module" || from.layer !== "application") return false;
        if (target === null) return true;
        const normalised = normalise(target);
        const own = `modules/${from.module}/`;
        return !(
          normalised.startsWith(`${own}domain`) ||
          normalised.startsWith(`${own}application`) ||
          normalised.startsWith("shared/kernel/")
        );
      }),
    ).toEqual([]);
  });
});

describe("shared code", () => {
  it("never depends on a module, the composition root, the shell or the routes", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "shared" || target === null) return false;
        return /^(modules|bootstrap|shell|app)(\/|$)/.test(target);
      }),
    ).toEqual([]);
  });

  it("keeps the kernel free of framework and infrastructure dependencies", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "shared" || from.sharedPart !== "kernel") return false;
        return target === null || !target.startsWith("shared/kernel/");
      }),
    ).toEqual([]);
  });
});

describe("modules", () => {
  it("never depend on the composition root, the shell or the routes", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "module" || target === null) return false;
        return /^(bootstrap|shell|app)(\/|$)/.test(target);
      }),
    ).toEqual([]);
  });

  it("reach into other modules only through their public entry points", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "module" || target === null || !target.startsWith("modules/")) return false;
        const [, otherModule, rest] = target.split("/");
        if (otherModule === from.module) return false;
        const allowed = from.layer === "presentation" || from.layer === "client" ? ["client"] : ["index", undefined];
        return !allowed.includes(rest);
      }),
    ).toEqual([]);
  });

  it("keep infrastructure independent from presentation", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "module" || from.layer !== "infrastructure" || target === null) return false;
        return normalise(target).startsWith(`modules/${from.module}/presentation`);
      }),
    ).toEqual([]);
  });
});

describe("composition", () => {
  it("lets route files talk only to the composition root, controllers, clients and the shell", () => {
    expect(
      violations(({ target }, from) => {
        if (from.area !== "app" || target === null) return false;
        if (target.startsWith("bootstrap/") || target.startsWith("shell/")) return false;
        if (/^modules\/[a-z]+\/client$/.test(target)) return false;
        if (/^modules\/[a-z]+\/api\/controller$/.test(target)) return false;
        return !target.endsWith(".css");
      }),
    ).toEqual([]);
  });
});

describe("client bundle safety", () => {
  const FORBIDDEN = [/^node:/, /^better-sqlite3$/, /^next\/headers$/, /^fs$/, /^crypto$/];

  const bySrcPath = new Map(sources.map((file) => [file.srcPath, file]));

  const resolveFile = (srcPath: string): string | undefined =>
    [`${srcPath}.ts`, `${srcPath}.tsx`, join(srcPath, "index.ts")].find((candidate) =>
      bySrcPath.has(candidate),
    );

  const closure = (entries: string[]): Set<string> => {
    const seen = new Set<string>();
    const queue = [...entries];
    while (queue.length > 0) {
      const current = queue.pop() as string;
      if (seen.has(current)) continue;
      seen.add(current);
      const file = bySrcPath.get(current);
      if (!file) continue;
      for (const specifier of importSpecifiers(file.text)) {
        const target = toSrcPath(file.path, specifier);
        const resolved = target ? resolveFile(target) : undefined;
        if (resolved) queue.push(resolved);
      }
    }
    return seen;
  };

  const clientEntries = [
    ...MODULES.map((moduleName) => `modules/${moduleName}/client.ts`),
    ...sources
      .map((file) => file.srcPath)
      .filter((path) => path.startsWith("shell/") || /^app\/.*(page|layout|not-found)\.tsx$/.test(path)),
  ];

  it("keeps server only dependencies out of everything reachable from the browser", () => {
    const offenders = [...closure(clientEntries)].flatMap((path) => {
      const file = bySrcPath.get(path);
      if (!file) return [];
      return importSpecifiers(file.text)
        .filter((specifier) => FORBIDDEN.some((pattern) => pattern.test(specifier)))
        .map((specifier) => `${path} imports ${specifier}`);
    });
    expect(offenders).toEqual([]);
  });

  it("never pulls a module wiring file or controller into the browser", () => {
    const reachable = [...closure(clientEntries)];
    const offenders = reachable.filter(
      (path) =>
        /\/module\.ts$/.test(path) ||
        /\/api\//.test(path) ||
        /sqlite|next-cookie-jar|bootstrap\//.test(path),
    );
    expect(offenders).toEqual([]);
  });

  it("includes the files it is supposed to analyse", () => {
    const reachable = closure(clientEntries);
    expect(reachable.has("modules/identity/presentation/login-page.tsx")).toBe(true);
    expect(reachable.has("shared/infrastructure/http/http-client.ts")).toBe(true);
    expect(dirname("modules/identity/client.ts")).toBe("modules/identity");
  });
});
