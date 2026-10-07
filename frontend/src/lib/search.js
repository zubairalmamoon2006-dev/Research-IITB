export const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const tokenize = (s) => norm(s).split(/[^a-z0-9+#]+/).filter(Boolean);

export const stem = (w) =>
  w.replace(/(ies)$/, 'y')
    .replace(/(ing|ed|es|s)$/, '')
    .replace(/([a-z])\1$/, '$1');

export const WEIGHTED = [
  ['Name', 10],
  ['Expertise', 7],
  ['Research_Interest', 5],
  ['Department', 4],
  ['Designation', 3]
];

// Semantic concept expansions for academic & technical queries
export const SEMANTIC_EXPANSIONS = {
  // AI & Data
  ai: ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'reinforcement learning'],
  ml: ['machine learning', 'deep learning', 'supervised', 'unsupervised', 'neural networks'],
  dl: ['deep learning', 'neural networks', 'transformers', 'representation learning'],
  nlp: ['natural language', 'computational linguistics', 'speech', 'text mining', 'language models'],
  cv: ['computer vision', 'image processing', 'object detection', 'pattern recognition'],
  vision: ['computer vision', 'image processing', 'optical', 'visual perception'],
  robotics: ['robotics', 'autonomous', 'manipulators', 'control systems', 'motion planning', 'mechatronics', 'uav', 'drones'],
  autonomous: ['self driving', 'autonomous vehicles', 'robotics', 'navigation', 'control systems'],

  // Healthcare, Bio & Chemistry
  cancer: ['oncology', 'tumor', 'anticancer', 'cytotoxic', 'carcinoma', 'chemotherapy', 'drug delivery'],
  tumor: ['oncology', 'cancer', 'anticancer', 'carcinoma'],
  oncology: ['cancer', 'tumor', 'anticancer', 'theranostics'],
  drugs: ['drug delivery', 'therapeutics', 'synthesis', 'pharmacology', 'biomolecules', 'medicinal'],
  drug: ['drug delivery', 'therapeutics', 'synthesis', 'pharmacology', 'biomolecules', 'medicinal'],
  medicine: ['biomedical', 'clinical', 'therapeutics', 'diagnostics', 'health'],
  dna: ['genomics', 'molecular biology', 'nucleic', 'genetics'],
  protein: ['proteomics', 'crystallography', 'biophysics', 'biothermodynamics', 'peptide'],
  bio: ['biotechnology', 'biological', 'biomedical', 'biophysics', 'biochemical'],

  // Energy, Environment & Materials
  solar: ['photovoltaic', 'pv', 'solar cells', 'perovskite', 'renewable', 'solar energy'],
  battery: ['batteries', 'lithium ion', 'energy storage', 'electrochemistry', 'solid state electrolyte'],
  batteries: ['battery', 'lithium ion', 'energy storage', 'electrochemistry'],
  ev: ['electric vehicles', 'battery', 'powertrain', 'motor drives', 'inverters'],
  renewable: ['solar', 'wind', 'clean energy', 'biofuels', 'hydrogen', 'energy storage'],
  climate: ['climate change', 'atmospheric', 'carbon capture', 'greenhouse', 'sustainability', 'environmental'],
  nano: ['nanotechnology', 'nanomaterials', 'nanostructures', 'nanoparticles', 'nanofabrication'],
  polymers: ['polymer', 'macromolecules', 'soft matter', 'rheology', 'composites'],

  // Electronics, Quantum & Computing
  quantum: ['quantum computing', 'quantum information', 'qubits', 'quantum mechanics', 'spintronics', 'superconductivity'],
  semiconductor: ['vlsi', 'cmos', 'microelectronics', 'devices', 'integrated circuits', 'solid state'],
  vlsi: ['vlsi', 'integrated circuits', 'asic', 'cmos', 'fpga', 'microelectronics'],
  chip: ['integrated circuits', 'vlsi', 'microprocessor', 'semiconductor'],
  security: ['cybersecurity', 'cryptography', 'network security', 'privacy', 'fault tolerance'],
  cloud: ['distributed systems', 'cloud computing', 'parallel computing', 'high performance computing'],
  iot: ['internet of things', 'embedded systems', 'sensors', 'wireless networks'],
  wireless: ['communication systems', '5g', '6g', 'mimo', 'signal processing', 'antennas'],
  sensor: ['sensors', 'biosensors', 'mems', 'actuators', 'transducers'],
  sensors: ['sensor', 'biosensors', 'mems', 'actuators', 'transducers']
};

export function lev(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export function buildFields(p) {
  const fields = [];
  const push = (key, text, w) => text && fields.push({ key, text, w, tokens: tokenize(text) });
  for (const [h, w] of WEIGHTED) push(h, norm(p[h]), w);
  const weighted = new Set(WEIGHTED.map(([h]) => h));
  for (const [k, v] of Object.entries(p)) {
    if (k === 'Profile_URL' || weighted.has(k) || v == null) continue;
    push(k, norm(v), 1);
  }
  return fields;
}

export function fieldTokenScore(qt, f) {
  if (f.text.includes(qt)) return 1;
  if (qt.length > 3) {
    const variants = qt.endsWith('s')
      ? [qt.slice(0, -1)]
      : [`${qt}s`, `${qt}es`, `${qt}ing`, `${qt.slice(0, -1)}ed`];
    for (const v of variants) if (f.text.includes(v)) return 0.9;
  }
  const qs = stem(qt);
  const maxD = qt.length >= 5 ? 2 : qt.length >= 3 ? 1 : 0;
  for (const t of f.tokens) {
    if (qs && stem(t) === qs) return 0.85;
    if (maxD > 0 && Math.abs(t.length - qt.length) <= maxD) {
      const d = lev(qt, t, maxD);
      if (d <= maxD) return d === 1 ? 0.7 : 0.55;
    }
  }
  return 0;
}

// Common English stopwords to ignore in multi-word queries
export const STOP_WORDS = new Set([
  'and', 'or', 'the', 'of', 'in', 'for', 'with', 'to', 'at', 'by', 'a', 'an', 'is', 'on', 'from', 'into'
]);

// Reciprocal Rank Fusion (RRF) helper
// Combines multiple ranked candidate lists: RRF_score = sum( 1 / (k + rank) )
export function reciprocalRankFusion(rankedLists, k = 60) {
  const scoreMap = new Map();
  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      const prev = scoreMap.get(item) || 0;
      scoreMap.set(item, prev + 1 / (k + rank + 1));
    }
  }
  return scoreMap;
}

// Score entries using Hybrid Multi-List Retrieval + Reciprocal Rank Fusion (RRF)
export function scoreEntries(entries, qTokens, rawQuery = '') {
  const allTokens = qTokens && qTokens.length > 0 ? qTokens : tokenize(rawQuery);
  const meaningfulTokens = allTokens.filter((t) => !STOP_WORDS.has(t));
  const tokensToUse = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  if (!tokensToUse || tokensToUse.length === 0) return entries.map((e) => ({ e, total: 0 }));

  const cleanQuery = norm(rawQuery || tokensToUse.join(' '));

  const expByQt = new Map();
  for (const qt of tokensToUse) {
    const s = new Set();
    const direct = SEMANTIC_EXPANSIONS[qt] || [];
    for (const exp of direct) {
      for (const t of tokenize(exp)) s.add(t);
    }
    if (direct.length === 0 && qt.length >= 4) {
      for (const [key, exps] of Object.entries(SEMANTIC_EXPANSIONS)) {
        if (lev(qt, key, 1) <= 1) {
          s.add(key);
          for (const exp of exps) {
            for (const t of tokenize(exp)) s.add(t);
          }
        }
      }
    }
    if (s.size > 0) expByQt.set(qt, s);
  }
  const semanticTokens = new Set();
  for (const s of expByQt.values()) for (const t of s) semanticTokens.add(t);

  const exactRanked = [];
  const semanticRanked = [];
  const fuzzyRanked = [];
  const covOf = new Map();

  for (const e of entries) {
    let exactScore = 0;
    let semanticScore = 0;
    let fuzzyScore = 0;
    const covered = new Set();

    for (const f of e.fields) {
      if (cleanQuery.length > 4 && f.text.includes(cleanQuery)) {
        exactScore += f.w * 8;
        for (const qt of tokensToUse) covered.add(qt);
      }

      for (const qt of tokensToUse) {
        let matchedExact = false;
        let bestTokenFuzzy = 0;

        for (const ft of f.tokens) {
          if (ft === qt) {
            matchedExact = true;
            bestTokenFuzzy = Math.max(bestTokenFuzzy, 1);
          } else if (stem(ft) === stem(qt) && stem(qt)) {
            bestTokenFuzzy = Math.max(bestTokenFuzzy, 0.9);
          } else if (qt.length >= 3 && ft.length > qt.length && ft.startsWith(qt)) {
            bestTokenFuzzy = Math.max(bestTokenFuzzy, 0.9);
          } else if (Math.abs(ft.length - qt.length) <= (qt.length >= 5 ? 2 : 1)) {
            const maxD = qt.length >= 5 ? 2 : 1;
            const d = lev(qt, ft, maxD);
            if (d <= maxD) {
              bestTokenFuzzy = Math.max(bestTokenFuzzy, d === 1 ? 0.8 : 0.6);
            }
          }
        }

        if (matchedExact) {
          const boost = f.key === 'Name' ? 12 : f.key === 'Expertise' ? 8 : f.w * 3;
          exactScore += boost;
        }
        if (bestTokenFuzzy > 0) {
          fuzzyScore += bestTokenFuzzy * f.w;
          covered.add(qt);
        }
        if (matchedExact) covered.add(qt);
      }

      for (const st of semanticTokens) {
        if (f.tokens.includes(st) && (f.key === 'Research_Interest' || f.key === 'Expertise' || f.key === 'Department')) {
          semanticScore += f.key === 'Research_Interest' ? 3 : 2;
        }
      }
      for (const [qt, s] of expByQt) {
        if (f.key !== 'Research_Interest' && f.key !== 'Expertise' && f.key !== 'Department') continue;
        for (const st of s) {
          if (f.tokens.includes(st)) {
            covered.add(qt);
            break;
          }
        }
      }
    }

    if (exactScore > 0) exactRanked.push({ e, s: exactScore });
    if (semanticScore > 0) semanticRanked.push({ e, s: semanticScore });
    if (fuzzyScore > 0) fuzzyRanked.push({ e, s: fuzzyScore });
    if (covered.size > 0) covOf.set(e, covered.size);
  }

  exactRanked.sort((a, b) => b.s - a.s);
  semanticRanked.sort((a, b) => b.s - a.s);
  fuzzyRanked.sort((a, b) => b.s - a.s);

  const rrfMap = reciprocalRankFusion([
    exactRanked.map((x) => x.e),
    semanticRanked.map((x) => x.e),
    fuzzyRanked.map((x) => x.e)
  ], 60);

  const minCov = covOf.size ? Math.max(...covOf.values()) : 0;
  const scored = [];
  for (const [e, total] of rrfMap.entries()) {
    if ((covOf.get(e) || 0) >= minCov) scored.push({ e, total });
  }

  scored.sort((a, b) => b.total - a.total);
  return scored;
}

// Build lightweight fields for arbitrary text (labels, titles).
export const textField = (text, w = 5) => ({ key: 'label', text: norm(text), w, tokens: tokenize(text) });

// Match a short label against a query (for pages/departments).
export function labelScore(query, label) {
  const qTokens = tokenize(query);
  const f = textField(label, 1);
  let total = 0;
  for (const qt of qTokens) {
    const s = fieldTokenScore(qt, f);
    if (s <= 0) return 0;
    total += s;
  }
  return total;
}

// Fuse keyword-ranked results with neural semantic matches using RRF.
// Unlike a pure re-ranker, semantic matches may ADD professors from
// `candidates` (dept/designation/star-filtered entries) that the keyword
// tier missed entirely — that is the point of semantic recall.
export function fuseWithSemanticRRF(keywordRanked, semanticMatches, candidates, k = 60) {
  const pool = candidates && candidates.length ? candidates : (keywordRanked || []).map((x) => x.e);
  const byId = new Map();
  for (const e of pool) {
    const id = String(e.p.Name || '');
    if (!byId.has(id)) byId.set(id, e.p);
  }
  const scores = new Map();
  const bump = (id, rank) => scores.set(id, (scores.get(id) || 0) + 1 / (k + rank + 1));
  (keywordRanked || []).forEach((x, rank) => {
    const id = String(x.e.p.Name || '');
    if (byId.has(id)) bump(id, rank);
  });
  (semanticMatches || []).forEach((m, rank) => {
    const id = String(m.id);
    if (byId.has(id)) bump(id, rank);
  });
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id));
}
