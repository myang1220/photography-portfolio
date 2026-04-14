import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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

// Grid thumbnails: 800px wide, quality 78
const THUMB_WIDTH = 800;
const THUMB_QUALITY = 78;

// Lightbox full-size: max 2400px on longest side, quality 85
const FULL_MAX = 2400;
const FULL_QUALITY = 85;

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

function publicUrl(...segments) {
  return segments.map(encodeURIComponent).join("/");
}

async function processImage(srcPath, thumbPath, fullPath) {
  const src = sharp(srcPath);
  const meta = await src.metadata();
  const { width = 0, height = 0 } = meta;

  // Thumb: resize to THUMB_WIDTH, keep aspect ratio
  if (!fs.existsSync(thumbPath)) {
    await sharp(srcPath)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbPath);
  }

  // Full: cap longest side at FULL_MAX
  if (!fs.existsSync(fullPath)) {
    const isLandscape = width >= height;
    await sharp(srcPath)
      .resize(
        isLandscape
          ? { width: FULL_MAX, withoutEnlargement: true }
          : { height: FULL_MAX, withoutEnlargement: true }
      )
      .webp({ quality: FULL_QUALITY })
      .toFile(fullPath);
  }

  // Read thumb dimensions for layout shift prevention
  const thumbMeta = await sharp(thumbPath).metadata();
  return { width: thumbMeta.width ?? width, height: thumbMeta.height ?? height };
}

async function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const entries = fs.readdirSync(photosDir, { withFileTypes: true });
  const folders = entries
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "thumbs" && d.name !== "full")
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const sets = [];

  for (const folderName of folders) {
    const dir = path.join(photosDir, folderName);
    const thumbDir = path.join(dir, "thumbs");
    const fullDir = path.join(dir, "full");
    fs.mkdirSync(thumbDir, { recursive: true });
    fs.mkdirSync(fullDir, { recursive: true });

    const files = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith("."))
      .map((d) => d.name)
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const images = [];

    for (const fileName of files) {
      const baseName = path.basename(fileName, path.extname(fileName));
      const srcPath = path.join(dir, fileName);
      const thumbPath = path.join(thumbDir, `${baseName}.webp`);
      const fullPath = path.join(fullDir, `${baseName}.webp`);

      process.stdout.write(`  processing ${fileName}...`);
      const { width, height } = await processImage(srcPath, thumbPath, fullPath);
      process.stdout.write(" done\n");

      images.push({
        thumb: `photos/${publicUrl(folderName)}/thumbs/${publicUrl(`${baseName}.webp`)}`,
        full: `photos/${publicUrl(folderName)}/full/${publicUrl(`${baseName}.webp`)}`,
        alt: toAltText(fileName),
        width,
        height,
      });
    }

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
