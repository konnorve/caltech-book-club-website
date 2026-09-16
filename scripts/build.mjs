import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
// Explicit public-file list: governance documents must never enter the site output.
const publicFiles = ["index.html", "book.html", "event.html", "announcements.html", "guidelines.html", "styles.css", "books-data.js", "bookshelf.js", "images", "robots.txt", "sitemap.xml"];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of publicFiles) await cp(join(root, file), join(output, file), { recursive: true });
console.log("Website built in dist/; repository-only documents excluded.");
