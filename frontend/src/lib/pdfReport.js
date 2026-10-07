import { jsPDF } from 'jspdf';

/*
 * Builds the downloadable "RESEARCH @ IITB" report PDF.
 *
 * The reviewer asked for a ready-made PDF instead of printing the website, so
 * nothing here is screenshot-based: every section is re-typeset from the report
 * data (cover, contents, KPIs, tables, bar charts, findings) and jsPDF draws it
 * page by page. Fonts are jsPDF's built-in WinAnsi sets, so typographic
 * characters are mapped to safe ASCII by sanitize().
 */

const TEAL = [13, 134, 166];
const NAVY = [23, 34, 46];
const GOLD = [245, 179, 1];
const INK = [22, 33, 44];
const MUTED = [97, 109, 122];
const LINE = [222, 228, 236];
const SOFT = [245, 248, 251];
const WHITE = [255, 255, 255];

const PAGE_W = 210;
const PAGE_H = 297;
const M = { l: 16, r: 16, t: 16, b: 16 };
const W = PAGE_W - M.l - M.r; // 178 mm of usable width
const BOTTOM = PAGE_H - M.b;
const FONT = 'helvetica';
const LH = 1.35;
const PT = 0.3528; // points -> mm

/* ------------------------------------------------------------------ text -- */

const sanitize = (s) =>
  String(s == null ? '' : s)
    .replace(/[\u2190-\u21FF\u27F0-\u27FF]/g, '->')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u20B9/g, 'Rs ')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2217|\u00D7/g, 'x')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x00-\xFF]/g, '');

const humanize = (key) =>
  String(key)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fmt = (v) => {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  return String(Math.round(v * 100) / 100);
};

const niceCeil = (v) => {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const m = steps.find((s) => n <= s) || 10;
  return m * p;
};

const today = () => {
  const d = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/* --------------------------------------------------- findings extraction -- */

const FINDING_LIST_KEYS = [
  'key_findings',
  'key_insights',
  'key_insight',
  'findings',
  'implications',
  'correlation_description',
  'data_points_description'
];
const FINDING_SCALAR_KEYS = {
  specific_data_point: 'Finding',
  overall_statement: 'Statement',
  key_finding: 'Key finding',
  loudest_voice_department: 'Loudest voice',
  highest_volume_department: 'Highest volume',
  top_performer: 'Top performer',
  correlation_coefficient: 'Correlation'
};
const FINDING_ARRAY_KEYS = {
  outliers: 'Outlier',
  other_strong_performers: 'Competitive performer'
};
/* chart metadata + anything already rendered elsewhere in the section */
const USED_FIELDS = new Set([
  'chart_type', 'title', 'context', 'headers', 'data', 'data_points',
  'x_axis_label', 'y_axis_label', 'y_axis_labels',
  'total_publications', 'total_patents',
  ...FINDING_LIST_KEYS,
  ...Object.keys(FINDING_SCALAR_KEYS),
  ...Object.keys(FINDING_ARRAY_KEYS)
]);

function collectFindings(sec) {
  const out = [];
  for (const k of FINDING_LIST_KEYS) {
    const v = sec[k];
    if (!v) continue;
    if (Array.isArray(v)) out.push(...v.map(String));
    else if (typeof v === 'object') out.push(...Object.values(v).map(String));
    else out.push(String(v));
  }
  for (const [k, prefix] of Object.entries(FINDING_SCALAR_KEYS)) {
    if (sec[k] == null || sec[k] === '') continue;
    out.push(`${prefix}: ${sec[k]}`);
  }
  for (const [k, prefix] of Object.entries(FINDING_ARRAY_KEYS)) {
    const v = sec[k];
    if (!Array.isArray(v)) continue;
    out.push(...v.map((x) => `${prefix}: ${x}`));
  }
  return out.map(String);
}

/* ------------------------------------------------------- section ordering -- */

const ORDER = [
  ['general_statistics', 'Research at a glance'],
  ['qs_vs_nirf_rankings', 'QS and NIRF rankings'],
  ['publications_patents', 'Publications and patents'],
  ['measuring_research_output', 'Research output vs peer institutes'],
  ['research_impact_across_departments', 'Research impact across departments'],
  ['research_impact_across_top_indian_institutes', 'Impact across top Indian institutes'],
  ['faculty_size_citation_averages', 'Faculty size and citation averages'],
  ['open_access_citation_advantage', 'Open access citation advantage'],
  ['access_models_scholarly_publishing', 'Access models in scholarly publishing'],
  ['research_excellence_volume_voice', 'Volume versus voice by department'],
  ['h_index_vs_qs_rankings', 'H-index versus QS rankings'],
  ['h_index_comparison_department_wise', 'H-index versus peer institutes'],
  ['publication_mix_composition', 'Publication mix'],
  ['correlation_academic_rank_research_output', 'Academic rank and research output'],
  ['research_authorship_distribution', 'Authorship distribution'],
  ['changes_in_publication_author_counts', 'Author counts over time'],
  ['concentration_of_research_output_among_authors', 'Concentration of output among authors'],
  ['key_research_topics_yearly', 'Key research topics by year'],
  ['named_research_areas_centres', 'Research areas and centres'],
  ['iit_bombay_collaborations_breakdown', 'Collaborations: domestic versus international'],
  ['iit_bombay_domestic_network', 'Domestic network'],
  ['iit_bombay_global_reach_university_partners', 'Global reach: university partners'],
  ['global_reach_countries_collaborating', 'Countries collaborating'],
  ['funded_research_by_department', 'Funded research by department'],
  ['funding_agency_type_breakdown', 'Funding by type of agency'],
  ['top_funding_agencies', 'Top funding agencies'],
  ['top_funded_research_topics_yearly', 'Top funded research topics'],
  ['professor_research_interest_database', 'Professor research database'],
  ['recommendations', 'Recommendations'],
  ['contact_website_information', 'Contact and sources']
];

/* ------------------------------------------------------------------ doc -- */

class ReportDoc {
  constructor(report) {
    this.r = report || {};
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    this.y = M.t;
    this.toc = [];
  }

  set(style, size, color) {
    this.doc.setFont(FONT, style || 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(color || INK));
  }

  step(size, lh = LH) {
    return size * lh * PT;
  }

  ensure(h) {
    if (this.y + h > BOTTOM) {
      this.doc.addPage();
      this.y = M.t;
    }
  }

  gap(h) {
    this.y += h;
  }

  pageNo() {
    return this.doc.getCurrentPageInfo().pageNumber;
  }

  /* a single line of text, drawn at the cursor */
  line(str, x, size, style, color) {
    this.set(style, size, color);
    this.doc.text(sanitize(str), x, this.y + size * PT * 0.85);
  }

  /* wrapped paragraph; breaks pages as needed */
  para(str, { size = 9.2, style = 'normal', color = MUTED, x = M.l, w = W, lh = LH } = {}) {
    const st = this.step(size, lh);
    this.set(style, size, color);
    const lines = this.doc.splitTextToSize(sanitize(str), w) || [];
    for (const ln of lines) {
      this.ensure(st);
      this.line(ln, x, size, style, color);
      this.y += st;
    }
    return this.y;
  }

  clip(str, maxW) {
    let s = sanitize(str);
    if (this.doc.getTextWidth(s) <= maxW) return s;
    while (s.length > 1 && this.doc.getTextWidth(`${s}...`) > maxW) s = s.slice(0, -1);
    return `${s}...`;
  }

  subLabel(str) {
    this.ensure(9);
    this.set('bold', 7.8, TEAL);
    this.doc.text(sanitize(String(str).toUpperCase()), M.l, this.y + 3);
    this.y += 6.5;
  }

  bullets(items, { size = 9.2, color = INK, gapAfter = 2.6 } = {}) {
    const st = this.step(size);
    for (const raw of items) {
      if (raw == null || raw === '') continue;
      this.set('normal', size, color);
      const lines = this.doc.splitTextToSize(sanitize(raw), W - 7) || [];
      for (let i = 0; i < lines.length; i++) {
        this.ensure(st);
        if (i === 0) {
          this.doc.setFillColor(...TEAL);
          this.doc.circle(M.l + 1.3, this.y + size * PT * 0.5, 1.05, 'F');
        }
        this.line(lines[i], M.l + 6, size, 'normal', color);
        this.y += st;
      }
      this.y += gapAfter;
    }
  }

  numbered(items, { size = 9.2 } = {}) {
    const st = this.step(size);
    items.forEach((raw, i) => {
      if (raw == null || raw === '') return;
      const n = `${i + 1}.`;
      this.set('bold', size, TEAL);
      const nw = this.doc.getTextWidth(`${n} `);
      this.set('normal', size, INK);
      const lines = this.doc.splitTextToSize(sanitize(raw), W - 9) || [];
      for (let k = 0; k < lines.length; k++) {
        this.ensure(st);
        if (k === 0) this.doc.text(n, M.l, this.y + size * PT * 0.85);
        this.line(lines[k], M.l + nw + 3, size, 'normal', INK);
        this.y += st;
      }
      this.y += 3;
    });
  }

  /* ------------------------------------------------------------ blocks -- */

  sectionHead(title, kicker) {
    const st = this.step(14.5, 1.2);
    this.set('bold', 14.5, NAVY);
    const lines = this.doc.splitTextToSize(sanitize(title), W - 7) || [''];
    this.ensure(st * lines.length + (kicker ? 8 : 4) + 6);
    this.doc.setFillColor(...TEAL);
    this.doc.rect(M.l, this.y, 2.4, st * lines.length - 2, 'F');
    lines.forEach((ln, i) => {
      this.set('bold', 14.5, NAVY);
      this.doc.text(ln, M.l + 6, this.y + st * 0.85 + i * st);
    });
    this.y += st * lines.length + 3;
    if (kicker) {
      this.set('italic', 8.4, MUTED);
      this.doc.text(sanitize(kicker), M.l + 6, this.y + 3.4);
      this.y += 7;
    }
    this.y += 2;
  }

  kpiGrid(items) {
    const cols = 2;
    const gapX = 5;
    const gapY = 4;
    const colW = (W - gapX) / cols;
    const cardH = 25;
    items.forEach((it, i) => {
      if (i % cols === 0) this.ensure(cardH + gapY);
      const cx = M.l + (i % cols) * (colW + gapX);
      const cy = this.y;
      this.doc.setFillColor(...SOFT);
      this.doc.rect(cx, cy, colW, cardH, 'F');
      this.doc.setFillColor(...TEAL);
      this.doc.rect(cx, cy, 1.6, cardH, 'F');
      this.set('bold', 7.6, MUTED);
      this.doc.text(this.clip(String(it.metric || '').toUpperCase(), colW - 10), cx + 5, cy + 6.5);
      this.set('bold', 15, TEAL);
      this.doc.text(this.clip(String(it.value ?? ''), colW - 10), cx + 5, cy + 15.5);
      if (it.context) {
        this.set('italic', 7, MUTED);
        const lines = (this.doc.splitTextToSize(sanitize(it.context), colW - 10) || []).slice(0, 2);
        lines.forEach((ln, li) => this.doc.text(ln, cx + 5, cy + 20 + li * 3));
      }
      if (i % cols === cols - 1) this.y += cardH + gapY;
    });
    if (items.length % cols === 1) this.y += cardH + gapY;
    this.y += 3;
  }

  statPair(a, b) {
    const colW = (W - 5) / 2;
    this.ensure(24);
    [a, b].forEach((s, i) => {
      const cx = M.l + i * (colW + 5);
      this.doc.setFillColor(...NAVY);
      this.doc.rect(cx, this.y, colW, 22, 'F');
      this.set('bold', 7.6, GOLD);
      this.doc.text(this.clip(String(s.label || '').toUpperCase(), colW - 10), cx + 5, this.y + 7);
      this.set('bold', 17, WHITE);
      this.doc.text(this.clip(String(s.value ?? ''), colW - 10), cx + 5, this.y + 17);
    });
    this.y += 27;
  }

  bars(labels, values, { valueFmt = fmt } = {}) {
    const labelW = 56;
    const valW = 22;
    const barArea = W - labelW - valW;
    const rowH = 7.4;
    const barH = 4.6;
    const max = niceCeil(Math.max(...values.map((v) => Math.abs(Number(v) || 0)), 1));
    labels.forEach((lb, i) => {
      this.ensure(rowH);
      const top = this.y;
      this.set('normal', 8.4, INK);
      this.doc.text(this.clip(lb, labelW - 5), M.l, top + rowH - 2.3);
      this.doc.setFillColor(...SOFT);
      this.doc.rect(M.l + labelW, top + (rowH - barH) / 2, barArea, barH, 'F');
      const v = Number(values[i]) || 0;
      const bw = Math.max(0.8, (Math.abs(v) / max) * barArea);
      this.doc.setFillColor(...TEAL);
      this.doc.rect(M.l + labelW, top + (rowH - barH) / 2, bw, barH, 'F');
      const vs = valueFmt(values[i]);
      this.set('bold', 8.4, NAVY);
      this.doc.text(vs, M.l + W - this.doc.getTextWidth(vs), top + rowH - 2.3);
      this.y += rowH;
    });
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.3);
    this.doc.line(M.l + labelW, this.y, M.l + labelW, this.y - labels.length * rowH);
    this.y += 4;
  }

  colWidths(headers, rows) {
    this.set('normal', 8.2, INK);
    const sample = rows.slice(0, 30);
    const wants = headers.map((h) => {
      let w = this.doc.getTextWidth(sanitize(h)) + 7;
      for (const row of sample) {
        const v = row[h];
        const s = typeof v === 'number' ? fmt(v) : sanitize(v);
        w = Math.max(w, this.doc.getTextWidth(String(s)) + 7);
      }
      return Math.min(Math.max(w, 16), W * 0.55);
    });
    const sum = wants.reduce((a, b) => a + b, 0);
    const scale = Math.min(W / sum, 1.5);
    return wants.map((w) => w * scale);
  }

  table(headers, rows) {
    if (!rows.length) return;
    const headH = 8;
    const rowH = 6.8;
    const widths = this.colWidths(headers, rows);
    const drawHead = () => {
      this.doc.setFillColor(...NAVY);
      this.doc.rect(M.l, this.y, W, headH, 'F');
      let x = M.l;
      headers.forEach((h, i) => {
        this.set('bold', 8.2, WHITE);
        this.doc.text(this.clip(h, widths[i] - 4), x + 2, this.y + headH - 2.6);
        x += widths[i];
      });
      this.y += headH;
    };
    this.ensure(headH + rowH * 2);
    drawHead();
    rows.forEach((row, ri) => {
      if (this.y + rowH > BOTTOM) {
        this.doc.addPage();
        this.y = M.t;
        drawHead();
      }
      const top = this.y;
      if (ri % 2 === 1) {
        this.doc.setFillColor(...SOFT);
        this.doc.rect(M.l, top, W, rowH, 'F');
      }
      let x = M.l;
      headers.forEach((h, i) => {
        const v = row[h];
        const isNum = typeof v === 'number';
        const txt = isNum ? fmt(v) : sanitize(v == null ? '' : v);
        this.set(i === 0 ? 'bold' : 'normal', 8.2, i === 0 ? NAVY : INK);
        const clipped = this.clip(txt, widths[i] - 4);
        if (isNum) {
          this.doc.text(clipped, x + widths[i] - 2 - this.doc.getTextWidth(clipped), top + rowH - 2.3);
        } else {
          this.doc.text(clipped, x + 2, top + rowH - 2.3);
        }
        x += widths[i];
      });
      this.doc.setDrawColor(...LINE);
      this.doc.setLineWidth(0.2);
      this.doc.line(M.l, top + rowH, M.l + W, top + rowH);
      this.y += rowH;
    });
    this.y += 5;
  }

  columnsList(items, cols = 3) {
    const colW = W / cols;
    const rowsN = Math.ceil(items.length / cols);
    const st = 6.2;
    this.ensure(rowsN * st + 4);
    const startY = this.y;
    items.forEach((it, i) => {
      const c = Math.floor(i / rowsN);
      const r = i % rowsN;
      const x = M.l + c * colW;
      const yy = startY + r * st + 4.6;
      this.set('normal', 8.4, INK);
      this.doc.setFillColor(...TEAL);
      this.doc.circle(x + 1.1, yy - 1.1, 0.8, 'F');
      this.doc.text(this.clip(it, colW - 7), x + 4.5, yy);
    });
    this.y = startY + rowsN * st + 5;
  }

  topicsByYear(list) {
    list.forEach((t) => {
      this.ensure(30);
      this.set('bold', 12, TEAL);
      this.doc.text(String(t.year), M.l, this.y + 5);
      this.set('bold', 9, NAVY);
      const titleTxt = t.title && String(t.title) !== String(t.year) ? sanitize(String(t.title).replace(/^\s*Key research topics from year \d+\s*$/i, '')) : '';
      if (titleTxt) this.doc.text(this.clip(titleTxt, W - 24), M.l + 16, this.y + 5);
      this.y += 8;
      if (Array.isArray(t.topics) && t.topics.length) {
        const s = t.topics
          .slice(0, 12)
          .map((x) => `${x.topic}${x.size != null ? ` (${x.size})` : ''}`)
          .join(' \u00B7 ');
        this.para(s, { size: 8.6, color: INK });
        this.gap(1.5);
      }
      if (t.summary) {
        this.para(t.summary, { size: 8.2, style: 'italic', color: MUTED });
      }
      this.gap(6);
    });
    this.y += 2;
  }

  /* -------------------------------------------------------------- pages -- */

  cover() {
    const d = this.doc;
    const meta = this.r.meta || {};
    d.setFillColor(...TEAL);
    d.rect(0, 0, PAGE_W, 52, 'F');
    d.setFillColor(...GOLD);
    d.rect(0, 52, PAGE_W, 2.2, 'F');
    d.setFont(FONT, 'bold');
    d.setFontSize(9.5);
    d.setTextColor(180, 224, 236);
    d.text('IIT BOMBAY  \u00B7  RESEARCH PORTAL  \u00B7  FULL REPORT', M.l, 16);
    d.setFontSize(30);
    d.setTextColor(255, 255, 255);
    const title = sanitize(meta.title || 'Research @ IITB');
    d.text(d.splitTextToSize(title, W), M.l, 34);

    let y = 68;
    const subtitle = sanitize(meta.subtitle || '');
    if (subtitle) {
      d.setFont(FONT, 'italic');
      d.setFontSize(13);
      d.setTextColor(...NAVY);
      const lines = d.splitTextToSize(subtitle, W) || [];
      lines.forEach((ln) => {
        d.text(ln, M.l, y);
        y += 7;
      });
      y += 6;
    }

    /* report period chip */
    if (meta.report_date_range) {
      d.setFont(FONT, 'bold');
      d.setFontSize(9);
      const label = `REPORT PERIOD:  ${sanitize(meta.report_date_range).toUpperCase()}`;
      const tw = d.getTextWidth(label) + 8;
      d.setFillColor(...SOFT);
      d.rect(M.l, y - 5, tw, 8, 'F');
      d.setFillColor(...GOLD);
      d.rect(M.l, y - 5, 1.6, 8, 'F');
      d.setTextColor(...INK);
      d.text(label, M.l + 5, y + 0.6);
      y += 16;
    }

    /* executive summary box */
    const summary = sanitize(meta.executive_summary || '');
    if (summary) {
      d.setFont(FONT, 'bold');
      d.setFontSize(8);
      d.setTextColor(...TEAL);
      d.text('EXECUTIVE SUMMARY', M.l, y);
      y += 5;
      d.setFont(FONT, 'normal');
      d.setFontSize(10);
      const lines = d.splitTextToSize(summary, W - 14) || [];
      const boxH = lines.length * 10 * PT * LH + 14;
      d.setFillColor(...SOFT);
      d.rect(M.l, y, W, boxH, 'F');
      d.setFillColor(...TEAL);
      d.rect(M.l, y, 2, boxH, 'F');
      d.setTextColor(...INK);
      let ty = y + 9;
      lines.forEach((ln) => {
        d.text(ln, M.l + 8, ty);
        ty += 10 * PT * LH;
      });
      y += boxH + 14;
    }

    /* four headline numbers, to anchor the middle of the cover */
    const picks = ['QS World Ranking', 'Publications', 'Citations', 'Patents'];
    const stats = (Array.isArray(this.r.general_statistics) ? this.r.general_statistics : [])
      .filter((s) => picks.includes(s.metric))
      .sort((a, b) => picks.indexOf(a.metric) - picks.indexOf(b.metric))
      .slice(0, 4);
    if (stats.length) {
      const top = 206;
      const cellW = W / stats.length;
      d.setDrawColor(...LINE);
      d.setLineWidth(0.4);
      d.line(M.l, top, M.l + W, top);
      d.line(M.l, top + 31, M.l + W, top + 31);
      stats.forEach((s, i) => {
        const cx = M.l + i * cellW;
        if (i > 0) d.line(cx, top + 6, cx, top + 26);
        d.setFont(FONT, 'bold');
        d.setFontSize(21);
        d.setTextColor(...TEAL);
        d.text(this.clip(String(s.value), cellW - 10), cx + 5, top + 18);
        d.setFont(FONT, 'bold');
        d.setFontSize(7.4);
        d.setTextColor(...MUTED);
        d.text(this.clip(String(s.metric).toUpperCase(), cellW - 10), cx + 5, top + 25);
      });
    }

    /* footer block */
    d.setDrawColor(...LINE);
    d.setLineWidth(0.4);
    d.line(M.l, PAGE_H - 34, M.l + W, PAGE_H - 34);
    d.setFont(FONT, 'normal');
    d.setFontSize(9);
    d.setTextColor(...MUTED);
    d.text(`Generated on ${today()}`, M.l, PAGE_H - 27);
    d.text('Data sources cited throughout the report (OpenAlex, IRINS, QS, NIRF, Crossref).', M.l, PAGE_H - 21);
    d.setFont(FONT, 'bold');
    d.setTextColor(...NAVY);
    const site = this.r.contact_website_information && this.r.contact_website_information.general_website;
    if (site) d.text(sanitize(site), M.l, PAGE_H - 15);

    d.addPage(); // -> page 2, the contents placeholder
  }

  contentsPlaceholder() {
    const d = this.doc;
    d.setFont(FONT, 'bold');
    d.setFontSize(20);
    d.setTextColor(...NAVY);
    d.text('Contents', M.l, 30);
    d.setFillColor(...GOLD);
    d.rect(M.l, 34, 26, 2, 'F');
  }

  fillContents() {
    const d = this.doc;
    d.setPage(2);
    let y = 48;
    for (const e of this.toc) {
      if (y > BOTTOM - 10) break;
      this.set('normal', 10, INK);
      const t = this.clip(e.title, W - 22);
      d.text(t, M.l, y);
      const tw = d.getTextWidth(t);
      const from = M.l + tw + 3;
      const to = M.l + W - 12;
      if (to > from) {
        d.setDrawColor(...LINE);
        d.setLineWidth(0.35);
        try {
          d.setLineDashPattern([0.7, 1.6], 0);
        } catch {
          /* older jsPDF: plain rule */
        }
        d.line(from, y - 1, to, y - 1);
        try {
          d.setLineDashPattern([], 0);
        } catch {
          /* ignore */
        }
      }
      this.set('bold', 10, TEAL);
      const p = String(e.page);
      d.text(p, M.l + W - d.getTextWidth(p), y);
      y += 7.6;
    }
    this.y = M.t;
  }

  footers() {
    const d = this.doc;
    const n = d.getNumberOfPages();
    const meta = this.r.meta || {};
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      if (i === 1) continue; // keep the cover clean
      d.setDrawColor(...LINE);
      d.setLineWidth(0.35);
      d.line(M.l, PAGE_H - 14, M.l + W, PAGE_H - 14);
      d.setFont(FONT, 'normal');
      d.setFontSize(7.6);
      d.setTextColor(...MUTED);
      d.text(sanitize(`${meta.title || 'Research @ IITB'}  \u00B7  full report`), M.l, PAGE_H - 9);
      d.setFont(FONT, 'bold');
      d.setTextColor(...NAVY);
      const right = `${i} / ${n}`;
      d.text(right, M.l + W - d.getTextWidth(right), PAGE_H - 9);
    }
  }
}

/* -------------------------------------------------------------- render -- */

function renderDataPoints(rd, sec) {
  const dp = sec.data_points;
  const cols = Object.keys(dp[0]);
  const numericCols = cols.filter((c) => dp.every((row) => typeof row[c] === 'number'));
  const labelCol = cols.find((c) => dp.some((row) => typeof row[c] === 'string'));
  if (numericCols.length === 1 && dp.length <= 14 && labelCol) {
    const unit = sec.y_axis_label ? ` \u00B7 ${sec.y_axis_label}` : '';
    rd.subLabel(`${humanize(numericCols[0])}${unit}`);
    rd.bars(
      dp.map((row) => String(row[labelCol])),
      dp.map((row) => row[numericCols[0]])
    );
  } else {
    rd.subLabel('Data');
    rd.table(cols, dp);
  }
}

function renderRest(rd, sec) {
  for (const [k, v] of Object.entries(sec)) {
    if (USED_FIELDS.has(k) || v == null || v === '') continue;
    if (typeof v === 'string') {
      if (!v.trim()) continue;
      rd.subLabel(humanize(k));
      rd.para(v, { size: 9 });
      rd.gap(3);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      rd.bullets([`${humanize(k)}: ${v}`]);
    } else if (Array.isArray(v)) {
      if (!v.length) continue;
      rd.subLabel(humanize(k));
      if (typeof v[0] === 'object' && v[0] !== null) {
        rd.table(Object.keys(v[0]), v);
      } else {
        rd.bullets(v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))));
      }
      rd.gap(2);
    } else if (typeof v === 'object') {
      const entries = Object.entries(v).filter(([, x]) => x != null && x !== '');
      if (!entries.length) continue;
      rd.subLabel(humanize(k));
      rd.bullets(
        entries.map(([kk, vv]) => `${humanize(kk)}: ${typeof vv === 'object' ? JSON.stringify(vv) : vv}`)
      );
      rd.gap(2);
    }
  }
}

function renderProfessorSample(rd, all) {
  const LIMIT = 60;
  const PER_DEPT = 3;
  const byDept = new Map();
  for (const p of all) {
    const d = ((p && p.Department) || 'Department not specified').trim() || 'Department not specified';
    if (!byDept.has(d)) byDept.set(d, []);
    byDept.get(d).push(p);
  }
  const depts = [...byDept.keys()].sort((a, b) => a.localeCompare(b));
  /* take up to PER_DEPT per department so the sample spans the whole roster */
  const sample = [];
  for (let round = 0; round < PER_DEPT && sample.length < LIMIT; round++) {
    for (const d of depts) {
      const list = byDept.get(d);
      if (round < list.length) {
        sample.push(list[round]);
        if (sample.length >= LIMIT) break;
      }
    }
  }
  rd.subLabel(`Faculty roster - showing ${sample.length} of ${all.length}`);
  for (const p of sample) {
    const st = rd.step(8.8, 1.3);
    rd.ensure(st * 2 + 2.4);
    rd.set('bold', 8.8, NAVY);
    const clippedName = rd.clip((p && p.Name) || 'Unnamed', 95);
    rd.doc.text(clippedName, M.l, rd.y + 3.2);
    const nameW = rd.doc.getTextWidth(clippedName) + 4;
    const designation = sanitize((p && p.Designation) || '');
    if (designation) {
      rd.set('normal', 8.2, MUTED);
      rd.doc.text(rd.clip(designation, W - nameW), M.l + nameW, rd.y + 3.2);
    }
    rd.y += st;
    rd.set('normal', 7.4, MUTED);
    const rest = sanitize(
      [p.Department, p.Expertise, p.Research_Interest].filter(Boolean).join('  \u00B7  ')
    );
    rd.doc.text(rd.clip(rest, W - 4), M.l, rd.y + 2.8);
    rd.y += st + 1.6;
  }
}

function renderSection(rd, key, fallbackTitle) {
  const sec = rd.r[key];
  const isArray = Array.isArray(sec);
  const title =
    (!isArray && sec && typeof sec.title === 'string' && sec.title.trim()) || fallbackTitle || humanize(key);

  rd.ensure(76);
  rd.toc.push({ title, page: rd.pageNo() });
  rd.sectionHead(title, !isArray && sec && sec.chart_type ? sec.chart_type : null);

  if (sec == null) {
    rd.para('No data available for this section.', { size: 9 });
    rd.gap(8);
    return;
  }

  /* the roster is large: print a readable cross-department sample
     instead of an unreadable 8-column table, and point to the full database */
  if (key === 'professor_research_interest_database' && Array.isArray(sec.professors)) {
    if (sec.description) {
      rd.para(sec.description, { size: 9.4, color: INK });
      rd.gap(4);
    }
    if (Array.isArray(sec.how_to_use) && sec.how_to_use.length) {
      rd.subLabel('How to explore the full database');
      rd.bullets(sec.how_to_use);
      rd.gap(2);
    }
    if (sec.website) {
      rd.subLabel('Full database');
      rd.para(
        `All ${sec.professors.length} profiles are searchable on the Professors page of this portal and at ${sanitize(sec.website)}.`,
        { size: 9, color: INK }
      );
      rd.gap(4);
    }
    renderProfessorSample(rd, sec.professors);
    if (sec.source) rd.para(`Source: ${sec.source}`, { size: 7.8, color: MUTED });
    rd.gap(10);
    return;
  }

  if (isArray) {
    if (key === 'general_statistics') {
      rd.kpiGrid(sec);
      const impact = rd.r.research_impact_across_departments;
      if (impact && Array.isArray(impact.data_points) && impact.data_points.length) {
        rd.gap(4);
        rd.subLabel('Top 10 departments by publications');
        const top = [...impact.data_points]
          .sort((a, b) => (b.publications || 0) - (a.publications || 0))
          .slice(0, 10);
        rd.bars(top.map((r) => String(r.department)), top.map((r) => r.publications || 0));
      }
    } else if (key === 'key_research_topics_yearly') {
      rd.topicsByYear(sec);
    } else if (key === 'named_research_areas_centres') {
      rd.columnsList(sec.map(String), 3);
    } else if (key === 'recommendations') {
      rd.numbered(sec.map(String));
    } else if (typeof sec[0] === 'object' && sec[0] !== null) {
      rd.table(Object.keys(sec[0]), sec);
    } else {
      rd.bullets(sec.map((x) => String(x)));
    }
    rd.gap(8);
    return;
  }

  const findings = collectFindings(sec);
  if (findings.length) {
    rd.bullets(findings);
    rd.gap(3);
  }
  if (sec.context) {
    rd.para(sec.context, { size: 8.6, style: 'italic', color: MUTED });
    rd.gap(4);
  }

  if (key === 'publications_patents') {
    if (sec.total_publications != null || sec.total_patents != null) {
      rd.statPair(
        { label: 'Total publications', value: fmt(sec.total_publications ?? 0) },
        { label: 'Total patents', value: fmt(sec.total_patents ?? 0) }
      );
    }
  }

  if (Array.isArray(sec.headers) && Array.isArray(sec.data) && sec.data.length) {
    rd.subLabel('Table');
    rd.table(sec.headers, sec.data);
    rd.gap(2);
  }

  if (Array.isArray(sec.data_points) && sec.data_points.length) {
    renderDataPoints(rd, sec);
    rd.gap(2);
  }

  renderRest(rd, sec);
  rd.gap(10);
}

/* --------------------------------------------------------------- public -- */

export function buildReportPdf(report) {
  const rd = new ReportDoc(report);
  rd.cover(); // page 1
  rd.contentsPlaceholder(); // page 2
  rd.doc.addPage(); // page 3 - sections start on their own page
  rd.y = M.t;

  const seen = new Set();
  for (const [key, title] of ORDER) {
    if (!(key in (report || {}))) continue;
    renderSection(rd, key, title);
    seen.add(key);
  }
  /* anything the curated order does not know about is still included */
  for (const key of Object.keys(report || {})) {
    if (key === 'meta' || seen.has(key)) continue;
    renderSection(rd, key, humanize(key));
  }

  rd.fillContents();
  rd.footers();
  rd.doc.setPage(1);
  return rd.doc;
}

export function downloadReportPdf(report) {
  const doc = buildReportPdf(report);
  const base = String((report && report.meta && report.meta.title) || 'Research-at-IITB')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  doc.save(`${base || 'Research-at-IITB'}-full-report.pdf`);
  return doc;
}
