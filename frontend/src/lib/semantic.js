// Neural semantic search: query embedding via transformers.js (lazy-loaded)
// plus precomputed professor embeddings (frontend/public/data/professor-embeddings.json).
// Degrades to keyword-only search whenever the model, the network, or the
// embeddings are unavailable — keyword search never depends on this module.

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMB_URL = '/data/professor-embeddings.json';

export function embedText(p) {
  return [p.Name, p.Department, p.Topic, p.Research_Interest].filter(Boolean).join(' | ');
}

// FNV-1a hash over the exact texts the embeddings were generated from.
// scripts/generate-embeddings.js imports this so the stored hash and the
// in-browser check always agree. If professors are edited in-app the hash
// changes and semantic search disables itself until `npm run embed` runs.
export function fingerprint(profs) {
  let h = 0x811c9dc5;
  for (const p of profs || []) {
    const s = String(p.Expert_ID || p.Name || '') + '\u0000' + embedText(p) + '\n';
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

let model = null;
let embData = null;
let promise = null;
let status = 'idle'; // idle | loading | ready | unavailable
let reason = '';

export function semanticStatus() {
  return { status, reason };
}

async function loadEmbeddings() {
  const res = await fetch(EMB_URL);
  if (!res.ok) throw new Error(`embeddings HTTP ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return { meta: null, embeddings: data };
  if (!data || !Array.isArray(data.embeddings)) throw new Error('bad embeddings file');
  return data;
}

export function teardownSemantic() {
  model = null;
  embData = null;
  promise = null;
  status = 'unavailable';
}

// Load embeddings + model exactly once. `profs` (current report data) is used
// to verify the embeddings are still in sync; safe to call repeatedly.
export async function initSemanticEngine(profs) {
  if (status === 'unavailable') return false;
  if (!promise) {
    status = 'loading';
    promise = (async () => {
      try {
        const [{ pipeline, env }, data] = await Promise.all([
          import('@xenova/transformers'),
          loadEmbeddings()
        ]);
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        const extractor = await pipeline('feature-extraction', MODEL, { quantized: true });
        model = extractor;
        embData = data;
        status = 'ready';
        return true;
      } catch (err) {
        model = null;
        embData = null;
        promise = null;
        status = 'unavailable';
        reason = String((err && err.message) || err);
        console.warn('Semantic search unavailable:', reason);
        return false;
      }
    })();
  }
  const ok = await promise;
  if (!ok) return false;
  if (profs && profs.length && embData.meta) {
    if (fingerprint(profs) !== embData.meta.hash) {
      teardownSemantic();
      reason = 'embeddings stale - re-run npm run embed';
      console.warn('Semantic search disabled:', reason);
      return false;
    }
  }
  status = 'ready';
  return true;
}

export async function semanticSearch(query, minScore = 0.3) {
  const q = String(query || '').trim();
  if (!q) return [];
  if (status === 'loading' && promise) await promise;
  if (status !== 'ready' || !model || !embData) return [];
  try {
    const out = await model(q, { pooling: 'mean', normalize: true });
    const qv = out.data;
    const hits = [];
    for (const item of embData.embeddings) {
      let s = 0;
      const v = item.vector;
      const n = Math.min(v.length, qv.length);
      for (let i = 0; i < n; i++) s += qv[i] * v[i];
      if (s >= minScore) hits.push({ id: item.id, score: s, name: item.name });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  } catch (err) {
    console.warn('Semantic query failed:', String((err && err.message) || err));
    return [];
  }
}
