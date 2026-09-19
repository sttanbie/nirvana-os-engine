// CPS v1.4 overlay conformance — init-project.ts must produce the Curated
// Project Standard artifacts on fresh init, stay idempotent on re-run, and
// never overwrite pre-existing files (spec.md §9 preservation, §10 T1-T4).
// Runs the real init-project.ts from this repo (NIRVANA_SKILLS_DIR pinned
// here) against a temp dir.

import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createHash } from "node:crypto";

const REPO = path.resolve(import.meta.dir, "..", "..", "..");
const INIT = path.join(REPO, "skills", "_shared", "scripts", "init-project.ts");

const CPS_FILES = [
  ".cps.yaml",
  "docs/HANDOFF.md",
  "docs/project-conventions.md",
  "docs/stories/.gitkeep",
  "knowledge/raw/README.md",
  "knowledge/raw/assets/.gitkeep",
  "knowledge/wiki/index.md",
  "knowledge/wiki/log.md",
  "output/.gitkeep",
  "PROMPT-CONTINUAR-SERVICO.md",
  "tests/.gitkeep",
];

function runInit(target: string, extra: string[] = []) {
  return spawnSync(process.execPath, [INIT, target, ...extra], {
    env: { ...process.env, NIRVANA_SKILLS_DIR: path.join(REPO, "skills") },
    encoding: "utf8",
  });
}

function dirHash(dir: string): string {
  const entries = fs.readdirSync(dir, { recursive: true }).sort();
  const h = createHash("sha256");
  for (const e of entries) {
    const p = path.join(dir, String(e));
    if (!fs.statSync(p).isFile()) continue;
    h.update(path.relative(dir, p) + "\0" + fs.readFileSync(p));
  }
  return h.digest("hex");
}

function perFileHashes(dir: string): string[] {
  return fs.readdirSync(dir, { recursive: true }).sort()
    .map((e) => path.join(dir, String(e)))
    .filter((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } })
    .map((p) => path.relative(dir, p) + "=" + createHash("md5").update(fs.readFileSync(p)).digest("hex"));
}

function diffHashes(a: string[], b: string[]): string {
  const setA = new Set(a), setB = new Set(b);
  return [...a.filter((x) => !setB.has(x)), ...b.filter((x) => !setA.has(x))].slice(0, 6).join(" | ");
}

test("T1 greenfield: CPS v1.4 artifacts created on fresh init", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cps-t1-"));
  const r = runInit(t);
  expect(r.status).toBe(0);
  for (const f of CPS_FILES) expect(fs.existsSync(path.join(t, f))).toBe(true);
  const cps = fs.readFileSync(path.join(t, ".cps.yaml"), "utf8");
  expect(cps).toContain("schema_version: cps-project/v1");
  expect(cps).toContain("runtime_required: false");
  expect(cps).toContain("privacy_default: local_only");
  expect(cps).toContain(`project_id: ${path.basename(t)}`);
  const log = fs.readFileSync(path.join(t, "knowledge/wiki/log.md"), "utf8");
  expect(log).toMatch(/^## \[\d{4}-\d{2}-\d{2}\] init \|/m);
  expect(fs.existsSync(path.join(t, "knowledge/wiki/sources"))).toBe(false);
  expect(fs.existsSync(path.join(t, ".mempalace"))).toBe(false);
  fs.rmSync(t, { recursive: true, force: true });
}, 60000);

test("T2 idempotency: second identical run is a no-op", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cps-t2-"));
  runInit(t);
  const h1 = dirHash(t);
  const f1 = perFileHashes(t);
  const r = runInit(t);
  expect(r.status).toBe(0);
  // log.warn (copyFile/overlay "exists, kept") writes to stderr
  expect(r.stderr + r.stdout).toContain("exists, kept");
  const f2 = perFileHashes(t);
  expect(diffHashes(f1, f2)).toBe("");
  expect(dirHash(t)).toBe(h1);
  fs.rmSync(t, { recursive: true, force: true });
}, 60000);

test("T3 preservation: custom README/HANDOFF kept byte-identical", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cps-t3-"));
  fs.mkdirSync(path.join(t, "docs"), { recursive: true });
  fs.writeFileSync(path.join(t, "README.md"), "conteudo custom");
  fs.writeFileSync(path.join(t, "docs/HANDOFF.md"), "handoff custom");
  const r = runInit(t);
  expect(r.status).toBe(0);
  expect(fs.readFileSync(path.join(t, "README.md"), "utf8")).toBe("conteudo custom");
  expect(fs.readFileSync(path.join(t, "docs/HANDOFF.md"), "utf8")).toBe("handoff custom");
  for (const f of CPS_FILES) expect(fs.existsSync(path.join(t, f))).toBe(true);
  fs.rmSync(t, { recursive: true, force: true });
}, 60000);

test("T4 legacy alias: PROMPT-CLAUDE-* preserved; canonical created", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cps-t4-"));
  fs.writeFileSync(path.join(t, "PROMPT-CLAUDE-CONTINUAR-SERVICO.md"), "alias legado");
  const r = runInit(t);
  expect(r.status).toBe(0);
  expect(fs.readFileSync(path.join(t, "PROMPT-CLAUDE-CONTINUAR-SERVICO.md"), "utf8")).toBe("alias legado");
  expect(fs.existsSync(path.join(t, "PROMPT-CONTINUAR-SERVICO.md"))).toBe(true);
  fs.rmSync(t, { recursive: true, force: true });
}, 60000);

test("T5 --template=none: overlay skipped entirely", () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cps-t5-"));
  const r = runInit(t, ["--template=none"]);
  expect(r.status).toBe(0);
  for (const f of CPS_FILES) expect(fs.existsSync(path.join(t, f))).toBe(false);
  expect(fs.existsSync(path.join(t, "AGENTS.md"))).toBe(true);
  fs.rmSync(t, { recursive: true, force: true });
}, 60000);

