// Vice Cover Studio hand-in (Node 22, standard library only).
//
// This program is the entrypoint for the gta6-cover-art-01 bounty. It takes
// the app in this folder (plain static files under app/, plus the screenshots
// in screenshots/) and hands them to the grader: it copies both folders into
// the output directory and writes dossier.json there, using the vendored
// make.fun dossier builder. The grader runs it twice and the two runs must
// produce identical bytes, so nothing here depends on time, order or luck.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and the output goes to /output.
// Serve the app itself with `node serve.ts` (port 8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer: at most 4 screenshots of 256 KiB each, app/ at most
// 993 files and 48 MiB, paths under app/ at most 1000 bytes, and the dossier
// text capped at 160 KiB. An entry over any of these is refused, so the
// program refuses it here instead of writing a dossier the gate rejects.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
