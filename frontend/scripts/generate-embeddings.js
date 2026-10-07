import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';
import { embedText, fingerprint } from '../src/lib/semantic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(__dirname, '..', '..', 'backend', 'data', 'report.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'professor-embeddings.json');

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const profs = report?.professor_research_interest_database?.professors || [];
  if (profs.length === 0) throw new Error('No professors found in report.json');
  console.log(`Embedding ${profs.length} professors from ${REPORT_PATH}`);

  console.log('Loading Xenova/all-MiniLM-L6-v2 (first run downloads ~23 MB)...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true
  });

  const embeddings = [];
  const BATCH = 32;
  for (let i = 0; i < profs.length; i += BATCH) {
    const batch = profs.slice(i, i + BATCH);
    const out = await extractor(batch.map(embedText), { pooling: 'mean', normalize: true });
    const vecs = out.tolist();
    batch.forEach((p, j) => {
      embeddings.push({
        id: String(p.Name || ''),
        name: p.Name,
        vector: vecs[j].map((v) => Number(v.toFixed(5)))
      });
    });
    console.log(`  ${Math.min(i + BATCH, profs.length)} / ${profs.length}`);
  }

  const payload = {
    meta: {
      model: 'Xenova/all-MiniLM-L6-v2',
      dims: 384,
      count: embeddings.length,
      hash: fingerprint(profs),
      generatedAt: new Date().toISOString()
    },
    embeddings
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload));
  const size = fs.statSync(OUTPUT_FILE).size / 1048576;
  console.log(`Saved ${embeddings.length} embeddings to ${OUTPUT_FILE} (${size.toFixed(2)} MB)`);
  console.log(`Fingerprint: ${payload.meta.hash}`);
}

main().catch((err) => {
  console.error('Embedding generation failed:', err);
  process.exit(1);
});
