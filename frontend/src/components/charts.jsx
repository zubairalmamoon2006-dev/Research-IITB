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
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16, font: { size: 12 } } },
    tooltip: { backgroundColor: '#16203a', padding: 10, cornerRadius: 8 }
  }
};

const num = (v) =>
  typeof v === 'number' && Math.abs(v) >= 1000
    ? v.toLocaleString('en-US')
    : v;

export function ChartBox({ height = 340, children }) {
  return (
    <div className="chart-box" style={{ height }}>
      {children}
    </div>
  );
}

export function BarChart({ labels, data, label = 'Value', color = PALETTE[0], horizontal = false, height = 340, colors, onPick }) {
  return (
    <ChartBox height={height}>
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
    <ChartBox height={height}>
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

export function MultiLineChart({ labels, datasets, height = 380, yPercent = false, fill = false, onPick, trendFlags: flags = false, flagThreshold = 0.15 }) {
  return (
    <ChartBox height={height}>
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
            x: { grid: { display: false }, ticks: { font: { size: 10.5 }, maxRotation: 60, autoSkip: false } },
            y: {
              beginAtZero: true,
              grid: { color: THEME.grid },
              ticks: { font: { size: 11 }, callback: (v) => (yPercent ? `${Math.round(v * 100)}%` : num(v)) }
            }
          }
        }}
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

export function ComboChart({ labels, barData, lineData, barLabel = 'Publications', lineLabel = 'h-index', height = 380, barColor = '#0d86a6', lineColor = CH.navy, onPick }) {
  return (
    <ChartBox height={height}>
      <Bar
        options={{
          ...baseOptions,
          interaction: { mode: 'index', intersect: false },
          ...pickHandlers(labels, onPick),
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10.5 }, maxRotation: 60, autoSkip: false } },
            y: {
              type: 'linear', position: 'left', beginAtZero: true,
              grid: { color: THEME.grid },
              ticks: { font: { size: 11 }, callback: (v) => num(v) },
              title: { display: true, text: barLabel, font: { size: 11 } }
            },
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
              backgroundColor: barColor, borderRadius: 4, yAxisID: 'y', maxBarThickness: 34
            },
            {
              type: 'line', label: lineLabel, data: lineData,
              borderColor: lineColor, backgroundColor: lineColor,
              borderWidth: 2.5, tension: 0.3, yAxisID: 'y1',
              pointRadius: 3.5, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2
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
    <ChartBox height={height}>
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

export function LorenzCurve({ data, equalityLine, height = 360 }) {
  const labels = data.map((d) => `${Math.round(d.cumulative_share_of_authors * 100)}%`);
  return (
    <MultiLineChart
      height={height}
      labels={labels}
      datasets={[
        {
          label: 'Lorenz curve (cumulative publications)',
          data: data.map((d) => d.cumulative_share_of_publications),
          borderColor: '#0d86a6',
          backgroundColor: 'rgba(13,134,166,0.12)',
          fill: true
        },
        {
          label: 'Line of perfect equality',
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
