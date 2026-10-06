import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
  Title
} from 'chart.js';
import { useEffect, useRef, useState } from 'react';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement, LineElement,
  ArcElement, RadialLinearScale, Tooltip, Legend, Filler, Title
);

export const PALETTE = [
  '#0d86a6', '#17222e', '#f5b301', '#4aa3b8', '#dc3d4b',
  '#12a17b', '#7e8b99', '#e08a3c', '#0a6c87', '#5b7fa6',
  '#9bb7c4', '#33475b'
];

export const CH = { navy: '#17222e' };
const CLOUD_COLORS = ['#0d86a6', '#17222e', '#f5b301', '#4aa3b8', '#dc3d4b', '#12a17b', '#0a6c87', '#e08a3c'];

const FONT = { family: "'Inter', 'Segoe UI', system-ui, sans-serif" };
ChartJS.defaults.font.family = FONT.family;
ChartJS.defaults.color = '#616d7a';

let THEME = { grid: '#eef1f7', radar: '#e4e8f1', tick: '#616d7a' };

export function setChartTheme(dark) {
  THEME = dark
    ? { grid: '#2b3a49', radar: '#2b3a49', tick: '#9fb0bf' }
    : { grid: '#eef1f7', radar: '#e4e8f1', tick: '#616d7a' };
  ChartJS.defaults.color = THEME.tick;
  CH.navy = dark ? '#9fb3c8' : '#17222e';
  PALETTE[1] = CH.navy;
  PALETTE[8] = dark ? '#4db6d0' : '#0a6c87';
  PALETTE[11] = dark ? '#8ba3bd' : '#33475b';
  CLOUD_COLORS[1] = CH.navy;
  CLOUD_COLORS[6] = dark ? '#4db6d0' : '#0a6c87';
}

// Flags points where a series moves sharply (|change| >= threshold)
const trendFlags = {
  id: 'trendFlags',
  afterDatasetsDraw(chart, args, opts) {
    if (!opts || !opts.enabled) return;
    const th = opts.threshold ?? 0.15;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    chart.data.datasets.forEach((ds, di) => {
      const data = ds.data || [];
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const cur = data[i];
        if (typeof prev !== 'number' || typeof cur !== 'number' || prev === 0) continue;
        const chg = (cur - prev) / Math.abs(prev);
        if (Math.abs(chg) < th) continue;
        const pt = meta.data[i];
        if (!pt) continue;
        ctx.fillStyle = chg > 0 ? '#12a17b' : '#dc3d4b';
        ctx.fillText(
          `${chg > 0 ? '▲' : '▼'}${Math.round(Math.abs(chg) * 100)}%`,
          pt.x,
          pt.y - 10
        );
      }
    });
    ctx.restore();
  }
};
ChartJS.register(trendFlags);

// Shared click/hover wiring for drill-down
const pickHandlers = (labels, onPick) => ({
  onClick: (evt, els) => {
    if (els.length && onPick) onPick(labels[els[0].index], els[0].index);
  },
  onHover: (evt, els) => {
    if (evt.native && evt.native.target) {
      evt.native.target.style.cursor = els.length && onPick ? 'pointer' : 'default';
    }
  }
});

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 1100, easing: 'easeOutQuart' },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16, font: { size: 12 } } },
    tooltip: { backgroundColor: '#16203a', padding: 10, cornerRadius: 8 }
  }
};

const num = (v) =>
  typeof v === 'number' && Math.abs(v) >= 1000
    ? v.toLocaleString('en-US')
    : v;

export function ChartBox({ height = 340, wide = false, children }) {
  const ref = useRef(null);
  // Mount the chart the first time it scrolls near the viewport, so Chart.js runs its
  // grow-from-zero animation where the visitor can actually see it.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (visible) return undefined;
    const el = ref.current;
    if (!el) {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setVisible(true);
        }
      },
      { rootMargin: '140px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={`chart-box${wide ? ' chart-box-wide' : ''}`} style={{ height }}>
      <div className="chart-inner">{visible ? children : null}</div>
    </div>
  );
}

export function BarChart({ labels, data, label = 'Value', color = PALETTE[0], horizontal = false, height = 340, colors, onPick }) {
  return (
    <ChartBox height={height} wide={!horizontal}>
      <Bar
        options={{
          ...baseOptions,
          indexAxis: horizontal ? 'y' : 'x',
          ...pickHandlers(labels, onPick),
          plugins: {
            ...baseOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ': ' : ''}${num(c.parsed[horizontal ? 'x' : 'y'])}` }
            }
          },
          scales: {
            x: {
              beginAtZero: horizontal || undefined,
              grid: { display: horizontal, color: horizontal ? THEME.grid : undefined },
              ticks: { font: { size: 11 }, ...(horizontal ? { callback: (v) => num(v) } : {}) }
            },
            y: horizontal
              ? { grid: { display: false }, ticks: { font: { size: 11 } } }
              : {
                  beginAtZero: true,
                  grid: { color: THEME.grid },
                  ticks: {
                    font: { size: 11 },
                    callback: (v) => (typeof v === 'number' && Math.abs(v) >= 1000 ? v.toLocaleString() : v)
                  }
                }
          }
        }}
        data={{
          labels,
          datasets: [{
            label,
            data,
            backgroundColor: colors || color,
            borderRadius: 5,
            maxBarThickness: 46
          }]
        }}
      />
    </ChartBox>
  );
}

export function GroupedBarChart({ labels, datasets, height = 360, horizontal = false, yPercent = false, onPick, log = false }) {
  const opts = {
    ...baseOptions,
    indexAxis: horizontal ? 'y' : 'x',
    ...pickHandlers(labels, onPick),
    scales: {
      x: {
        ...(log && horizontal
          ? { type: 'logarithmic', beginAtZero: false }
          : { beginAtZero: horizontal || undefined }),
        grid: { display: horizontal, color: horizontal ? THEME.grid : undefined },
              ticks: {
                font: { size: horizontal ? 11 : 10.5 },
                maxRotation: horizontal ? 0 : 60,
                autoSkip: true,
                maxTicksLimit: horizontal ? 10 : undefined,
                padding: horizontal ? 6 : 0,
                ...(horizontal ? { callback: (v) => (yPercent ? `${Math.round(v * 100)}%` : num(v)) } : {})
              }
            },
            y: horizontal
              ? { grid: { display: false }, ticks: { font: { size: 11 } } }
              : {
                  beginAtZero: true,
                  grid: { color: THEME.grid },
                  ticks: {
                    font: { size: 11 },
                    callback: (v) => (yPercent ? `${Math.round(v * 100)}%` : num(v))
                  }
                }
      }
    };
  return (
    <ChartBox height={height} wide>
      <Bar
        options={opts}
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            ...d,
            backgroundColor: d.color || PALETTE[i % PALETTE.length],
            borderRadius: 4
          }))
        }}
      />
    </ChartBox>
  );
}

export function MultiLineChart({ labels, datasets, height = 380, yPercent = false, fill = false, onPick, trendFlags: flags = false, flagThreshold = 0.15, xTitle, yTitle, plugins }) {
  return (
    <ChartBox height={height} wide>
      <Line
        options={{
          ...baseOptions,
          interaction: { mode: 'index', intersect: false },
          elements: { point: { radius: 3, hoverRadius: 5 } },
          ...pickHandlers(labels, onPick),
          plugins: {
            ...baseOptions.plugins,
            trendFlags: { enabled: flags, threshold: flagThreshold }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10.5 }, maxRotation: 60, autoSkip: false },
              ...(xTitle ? { title: { display: true, text: xTitle, font: { size: 11 } } } : {})
            },
            y: {
              beginAtZero: true,
              grid: { color: THEME.grid },
              ticks: { font: { size: 11 }, callback: (v) => (yPercent ? `${Math.round(v * 100)}%` : num(v)) },
              ...(yTitle ? { title: { display: true, text: yTitle, font: { size: 11 } } } : {})
            }
          }
        }}
        plugins={plugins}
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            tension: 0.3,
            borderWidth: 2.5,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            fill,
            ...d,
            borderColor: d.borderColor || PALETTE[i % PALETTE.length],
            backgroundColor: d.backgroundColor || (fill ? 'rgba(13,134,166,0.10)' : PALETTE[i % PALETTE.length])
          }))
        }}
      />
    </ChartBox>
  );
}

export function ComboChart({ labels, barData, lineData, barLabel = 'Publications', lineLabel = 'h-index', height = 380, barColor = '#0d86a6', lineColor = CH.navy, onPick, secondAsBar = false, barReverse = false }) {
  // barReverse: for "lower is better" series (QS ranks) the value axis is flipped
  // so a taller bar means a better rank, which is how a negative correlation
  // between the two series should read.
  const nums = (barData || []).filter((v) => typeof v === 'number');
  const bMin = nums.length ? Math.min(...nums) : 0;
  const bMax = nums.length ? Math.max(...nums) : 0;
  // scale maximum sits at the bottom once the axis is reversed; keep it clear of
  // the worst value so that bar still gets a visible height, snapped up to a
  // round 10 so the ticks read as ranks (50, 100 … 350) rather than 347
  const barBase = Math.ceil((bMax + Math.max(1, (bMax - bMin) * 0.08)) / 10) * 10;
  const barScale = {
    type: 'linear', position: 'left',
    beginAtZero: !barReverse,
    ...(barReverse ? { reverse: true, min: bMin, max: barBase } : {}),
    grid: { color: THEME.grid },
    ticks: { font: { size: 11 }, callback: (v) => num(v) },
    title: { display: true, text: barLabel, font: { size: 11 } }
  };
  return (
    <ChartBox height={height} wide>
      <Bar
        options={{
          ...baseOptions,
          interaction: { mode: 'index', intersect: false },
          ...pickHandlers(labels, onPick),
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (context) => {
                  const lbl = context.dataset.label || '';
                  const raw = context.raw;
                  if (barReverse && context.datasetIndex === 0) {
                    if (raw === 125) return `${lbl}: 101–150`;
                    if (raw === 275) return `${lbl}: 251–300`;
                  }
                  return `${lbl}: ${num(raw)}`;
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10.5 }, maxRotation: 60, autoSkip: false } },
            y: barScale,
            y1: {
              type: 'linear', position: 'right', beginAtZero: true,
              grid: { drawOnChartArea: false },
              ticks: { font: { size: 11 }, color: lineColor },
              title: { display: true, text: lineLabel, font: { size: 11 }, color: lineColor }
            }
          }
        }}
        data={{
          labels,
          datasets: [
            {
              type: 'bar', label: barLabel, data: barData,
              backgroundColor: barColor, borderRadius: 4, yAxisID: 'y', maxBarThickness: 34,
              ...(barReverse ? { base: barBase } : {})
            },
            {
              // secondAsBar: for unordered categories (departments) a line wrongly
              // implies continuity, so render a second bar instead.
              type: secondAsBar ? 'bar' : 'line', label: lineLabel, data: lineData,
              backgroundColor: lineColor, yAxisID: 'y1',
              ...(secondAsBar
                ? { borderRadius: 4, maxBarThickness: 34 }
                : {
                    borderColor: lineColor, borderWidth: 2.5, tension: 0.3,
                    pointRadius: 3.5, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2
                  })
            }
          ]
        }}
      />
    </ChartBox>
  );
}

export function PieChart({ labels, data, height = 340, doughnut = true, colors, onPick }) {
  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors || PALETTE,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };
  const opts = {
    ...baseOptions,
    ...pickHandlers(labels, onPick),
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: { label: (c) => ` ${c.label}: ${c.parsed}${typeof c.parsed === 'number' && c.parsed <= 100 ? '%' : ''}` }
      }
    }
  };
  return (
    <ChartBox height={height}>
      {doughnut ? <Doughnut data={chartData} options={opts} /> : <Pie data={chartData} options={opts} />}
    </ChartBox>
  );
}

export function RadarChart({ labels, data, label = 'Value', height = 380, color = PALETTE[0] }) {
  return (
    <ChartBox height={height} wide>
      <Radar
        options={{
          ...baseOptions,
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: THEME.radar },
            angleLines: { color: THEME.radar },
              pointLabels: { font: { size: 11 } },
              ticks: { backdropColor: 'transparent', font: { size: 10 } }
            }
          },
          plugins: { ...baseOptions.plugins, legend: { display: false } }
        }}
        data={{
          labels,
          datasets: [{
            label,
            data,
            backgroundColor: 'rgba(13,134,166,0.16)',
            borderColor: color,
            borderWidth: 2,
            pointBackgroundColor: color
          }]
        }}
      />
    </ChartBox>
  );
}

/* ---------- Non-Chart.js visuals ---------- */

export function WordCloud({ topics, valueKey = 'size' }) {
  const max = Math.max(...topics.map((t) => t[valueKey]), 1);
  return (
    <div className="wordcloud">
      {topics.map((t, i) => {
        const v = t[valueKey];
        const size = 13 + (v / max) * 30;
        return (
          <span
            key={t.topic + i}
            className="w"
            title={`${t.topic}: ${v}`}
            style={{
              fontSize: `${size}px`,
              color: CLOUD_COLORS[i % CLOUD_COLORS.length],
              opacity: 0.55 + (v / max) * 0.45
            }}
          >
            {t.topic}
          </span>
        );
      })}
    </div>
  );
}

// Squarified treemap layout (Bruls et al.)
function worst(row, rowSum, w, h, total) {
  if (rowSum === 0 || total === 0) return Infinity;
  const side = Math.min(w, h);
  const length = (w >= h ? w : h) * (rowSum / total);
  let maxRatio = 0;
  row.forEach((it) => {
    const cellLen = length > 0 ? (it.value / rowSum) * length : 0;
    if (cellLen <= 0) return Infinity;
    const ratio = Math.max(side / cellLen, cellLen / side);
    maxRatio = Math.max(maxRatio, ratio);
  });
  return maxRatio;
}

function squarify(items, x, y, w, h) {
  const valid = items.filter((it) => it.value > 0);
  const total = valid.reduce((s, it) => s + it.value, 0);
  if (total <= 0 || w <= 0 || h <= 0) return [];
  const out = [];
  let list = [...valid];
  let rx = x, ry = y, rw = w, rh = h;

  while (list.length > 0 && rw > 0.1 && rh > 0.1) {
    const remaining = list.reduce((s, it) => s + it.value, 0);
    let row = [];
    let rowSum = 0;

    while (list.length > 0) {
      const candidate = [...row, list[0]];
      const candSum = candidate.reduce((s, it) => s + it.value, 0);
      const candWorst = worst(candidate, candSum, rw, rh, remaining);
      const rowWorst = row.length ? worst(row, rowSum, rw, rh, remaining) : Infinity;
      if (row.length === 0 || candWorst <= rowWorst) {
        row = candidate;
        rowSum = candSum;
        list.shift();
      } else break;
    }

    const rowShare = rowSum / remaining;
    if (rw >= rh) {
      const rowW = rw * rowShare;
      let oy = ry;
      row.forEach((it) => {
        const hh = rh * (it.value / rowSum);
        out.push({ ...it, x: rx, y: oy, w: rowW, h: hh });
        oy += hh;
      });
      rx += rowW;
      rw -= rowW;
    } else {
      const rowH = rh * rowShare;
      let ox = rx;
      row.forEach((it) => {
        const ww = rw * (it.value / rowSum);
        out.push({ ...it, x: ox, y: ry, w: ww, h: rowH });
        ox += ww;
      });
      ry += rowH;
      rh -= rowH;
    }
  }
  return out;
}

export function Treemap({ data, labelKey, valueKey, height = 340 }) {
  const items = data.map((d) => ({ label: d[labelKey], value: d[valueKey] }));
  const cells = squarify(items, 0, 0, 100, 100);
  const colors = PALETTE;
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="treemap" style={{ height }}>
      {cells.map((c, i) => (
        <div
          key={c.label + i}
          className="cell"
          title={`${c.label}: ${((c.value / total) * 100).toFixed(1)}%`}
          style={{
            left: `${c.x}%`, top: `${c.y}%`,
            width: `${c.w}%`, height: `${c.h}%`,
            background: colors[i % colors.length]
          }}
        >
          <span className="t">{c.w > 8 && c.h > 12 ? c.label : c.w > 4 ? c.label.slice(0, 6) : ''}</span>
          {c.w > 7 && c.h > 18 && <span className="v">{((c.value / total) * 100).toFixed(1)}%</span>}
        </div>
      ))}
    </div>
  );
}

// Rings one data point and writes its value next to it, so the headline reading
// is visible without having to decode the axes (reviewer: "hard to understand").
const labelledPoint = ({ datasetIndex = 0, index, label, color = '#0d86a6' }) => ({
  id: 'labelledPoint',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(datasetIndex);
    const pt = meta && meta.data[index];
    if (!pt) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "600 11.5px 'Inter', 'Segoe UI', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(label, pt.x - 10, pt.y + 4);
    ctx.restore();
  }
});

export function LorenzCurve({ data, equalityLine, height = 360 }) {
  const labels = data.map((d) => `${Math.round(d.cumulative_share_of_authors * 100)}%`);
  // mark the point the section is really about: the bottom 80% of authors and
  // their share of all publications
  const marked = data.reduce(
    (found, d, i) => (d.cumulative_share_of_authors === 0.8 ? { d, i } : found),
    null
  );
  const marker = marked
    ? [
        labelledPoint({
          index: marked.i,
          label: `Bottom ${Math.round(marked.d.cumulative_share_of_authors * 100)}% of authors = ${Math.round(marked.d.cumulative_share_of_publications * 100)}% of papers`
        })
      ]
    : [];
  return (
    <MultiLineChart
      height={height}
      labels={labels}
      plugins={marker}
      xTitle="Authors, sorted by output (fewest → most), cumulative %"
      yTitle="Share of all publications, cumulative %"
      datasets={[
        {
          label: 'Actual output (cumulative)',
          data: data.map((d) => d.cumulative_share_of_publications),
          borderColor: '#0d86a6',
          backgroundColor: 'rgba(13,134,166,0.12)',
          fill: true
        },
        {
          label: 'If every author published equally',
          data: equalityLine.map((d) => d.cumulative_share_of_publications),
          borderColor: CH.navy,
          borderDash: [6, 5],
          pointRadius: 0,
          fill: false
        }
      ]}
      yPercent
    />
  );
}
