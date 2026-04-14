import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const photosDir = path.join(root, "public", "photos");
const outFile = path.join(root, "src", "generated", "gallery-manifest.json");

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".tif",
  ".tiff",
]);

function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toAltText(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publicUrl(folderName, fileName) {
  const a = encodeURIComponent(folderName);
  const b = encodeURIComponent(fileName);
  return `/photos/${a}/${b}`;
}

function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const entries = fs.readdirSync(photosDir, { withFileTypes: true });
  const folders = entries
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const sets = [];

  for (const folderName of folders) {
    const dir = path.join(photosDir, folderName);
    const files = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith("."))
      .map((d) => d.name)
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const images = files.map((fileName) => ({
      src: publicUrl(folderName, fileName),
      alt: toAltText(fileName),
    }));

    sets.push({
      id: slugify(folderName) || "set",
      title: folderName,
      images,
    });
  }

  const manifest = { generatedAt: new Date().toISOString(), sets };
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(
    `[gallery] Wrote ${sets.length} set(s) to ${path.relative(root, outFile)}`
  );
}

main();
