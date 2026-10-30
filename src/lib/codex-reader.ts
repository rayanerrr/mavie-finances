import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { listCategoriesWithSubs } from "./categories";
import { finishReceipt, receiptPrompt } from "./gemini";
import { getSetting } from "./settings";

/**
 * Lecture d'un reçu par gpt-reserve via la commande `codex` du Mac (compte ChatGPT de l'utilisateur).
 * Même consignes et mêmes vérifications que Gemini.
 */

const nullable = (type: string) => ({ type: [type, "null"] });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["store", "purchaseDate", "purchaseTime", "subtotal", "taxes", "total", "items"],
  properties: {
    store: nullable("string"),
    purchaseDate: nullable("string"),
    purchaseTime: nullable("string"),
    subtotal: nullable("number"),
    taxes: nullable("number"),
    total: nullable("number"),
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "rawText", "quantity", "unit", "amount", "category", "subcategory", "confidence"],
        properties: {
          description: { type: "string" },
          rawText: nullable("string"),
          quantity: nullable("number"),
          unit: nullable("string"),
          amount: { type: "number" },
          category: { type: "string" },
          subcategory: nullable("string"),
          confidence: { type: "number" },
        },
      },
    },
  },
};

// L'app Mac est lancée sans le PATH du terminal : on ajoute les dossiers habituels (codex est un script Node).
const EXTRA_PATH = ["/opt/homebrew/bin", "/usr/local/bin", path.join(os.homedir(), ".local/bin"), "/usr/bin", "/bin"];

function codexBinary() {
  const candidates = [process.env.MAVIE_CODEX_BIN, ...EXTRA_PATH.map((dir) => path.join(dir, "codex"))].filter(Boolean) as string[];
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) throw new Error("La commande codex est introuvable sur ce Mac. Installe Codex puis connecte-toi (codex login).");
  return found;
}

function run(file: string, args: string[], cwd: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const env = { ...process.env, PATH: [...EXTRA_PATH, process.env.PATH ?? ""].join(":") };
    const child = execFile(file, args, { cwd, env, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (error, _stdout, stderr) => {
      if (!error) return resolve();
      const text = `${stderr}\n${error.message}`;
      if (error.killed || /ETIMEDOUT|timed out/i.test(text)) return reject(new Error("gpt-reserve met trop de temps à lire ce reçu."));
      if (/not logged in|login|unauthori[sz]ed|401/i.test(text)) return reject(new Error("Codex n'est pas connecté : lance « codex login » dans le Terminal."));
      if (/usage limit|rate limit|quota|429/i.test(text)) return reject(new Error("Limite d'utilisation de Codex atteinte pour le moment."));
      reject(new Error("gpt-reserve n'a pas pu lire ce reçu."));
    });
    child.stdin?.end();
  });
}

/** Convertit HEIC/HEIF/PDF/WEBP en JPEG (première page pour un PDF) avec l'outil sips de macOS. */
async function asImage(buffer: Buffer, mime: string, dir: string) {
  const direct: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
  if (direct[mime]) {
    const file = path.join(dir, `recu.${direct[mime]}`);
    fs.writeFileSync(file, buffer);
    return file;
  }
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] ?? "img";
  const source = path.join(dir, `source.${ext}`);
  const target = path.join(dir, "recu.jpg");
  fs.writeFileSync(source, buffer);
  await new Promise<void>((resolve, reject) =>
    execFile("/usr/bin/sips", ["-s", "format", "jpeg", source, "--out", target], { timeout: 30000 }, (error) =>
      error ? reject(new Error("Impossible de convertir ce fichier en image.")) : resolve(),
    ),
  );
  return target;
}

export async function readReceiptWithCodex(buffer: Buffer, mime: string, opts: { timeoutMs?: number } = {}) {
  const model = getSetting("codexModel").trim() || "gpt-reserve";
  const binary = codexBinary();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mavie-codex-"));
  try {
    const image = await asImage(buffer, mime, dir);
    const categories = listCategoriesWithSubs();
    fs.writeFileSync(path.join(dir, "schema.json"), JSON.stringify(SCHEMA));
    const prompt = `${receiptPrompt(categories)}\nRéponds uniquement avec le JSON demandé. N'exécute aucune commande et ne lis aucun autre fichier.`;
    await run(
      binary,
      [
        "exec",
        "-m", model,
        "-c", 'model_reasoning_effort="low"',
        "--skip-git-repo-check",
        "--ephemeral",
        "-s", "read-only",
        "-C", dir,
        "-i", image,
        "--output-schema", path.join(dir, "schema.json"),
        "-o", path.join(dir, "resultat.json"),
        prompt,
      ],
      dir,
      opts.timeoutMs ?? 150000,
    );
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, "resultat.json"), "utf8"));
    } catch {
      throw new Error("gpt-reserve n'a pas renvoyé de liste d'articles.");
    }
    return finishReceipt(parsed, model, categories);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
