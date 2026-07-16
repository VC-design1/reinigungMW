/**
 * Generates the PWA app icons (public/icons/*.png) from a simple inline SVG.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="24"/>
  <path d="M180 265 L235 320 L340 200" fill="none" stroke="#ffffff" stroke-width="28"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const sizes = [
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
  { size: 180, file: "apple-touch-icon.png" },
];

for (const { size, file } of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, file));
  console.log("generated", file);
}
