import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import { Section, Card, Findings, Callout, DataTable, PageIntro } from '../components/ui';
import { ComboChart, GroupedBarChart, CH } from '../components/charts';
import { abbrDept } from '../lib/labels';

export default function Excellence() {
  const { report } = useReport();
  const navigate = useNavigate();
  // Which institutes / departments the H-index comparison chart shows.
  // null = nothing filtered out; once a chip is toggled the explicit list wins.
  const [instSel, setInstSel] = useState(null);
  const [deptSel, setDeptSel] = useState(null);
  if (!report) return null;

  const volume = report.research_excellence_volume_voice || {};
  const hvsq = report.h_index_vs_qs_rankings || {};
  const table = report.qs_vs_nirf_rankings || {};
  const hcmp = report.h_index_comparison_department_wise || {};
  const goDept = (label) => navigate(`/department/${encodeURIComponent(label)}`);
  // charts show short codes on the axis; clicks resolve back to the full name
  const fullNameFor = (section, code) =>
    (section.data_points || []).find((d) => abbrDept(d.department) === code)?.department || code;

  // --- H-index comparison filter state -------------------------------------
  const institutes = hcmp.institutions || [];
  const departments = (hcmp.data_points || []).map((d) => d.department);
  // drop selections that no longer exist after a data refresh
  const activeInst = (instSel ?? institutes).filter((i) => institutes.includes(i));
  const activeDept = (deptSel ?? departments).filter((d) => departments.includes(d));
  const points = (hcmp.data_points || []).filter((d) => activeDept.includes(d.department));
  const togglePick = (setter, all, value) =>
    setter((prev) => {
      const next = new Set(prev ?? all);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return [...next];
    });
  // room for every grouped bar, capped so one huge selection cannot take over
  // the page; small selections get a comfortable minimum height
  const chartHeight = Math.min(880, Math.max(360, points.length * activeInst.length * 9 + 70));

  const tableHeaders = table.headers || ['Institution', 'QS World Ranking (2027)', 'NIRF Ranking (Overall, 2025)'];

  return (
    <>
      <PageIntro title="Rankings & excellence." accent="Volume vs voice." eyebrow="Benchmarks · QS · NIRF · H-index">
        Volume versus voice across departments, H-index vs QS rankings, QS/NIRF institute comparisons, and a department-wise H-index benchmark against peer institutes.
      </PageIntro>

      <Section title="What Defines Research Excellence: Volume or Voice?" note={`${volume.context} - click a bar to open that department's page.`}>
        <div className="grid-2">
          <Card title="Publications vs h-index by department">
            <ComboChart
              labels={(volume.data_points || []).map((d) => abbrDept(d.department))}
              barData={volume.data_points?.map((d) => d.publications) || []}
              lineData={volume.data_points?.map((d) => d.h_index) || []}
              barLabel="Publications"
              lineLabel="h-index"
              secondAsBar
              onPick={(code) => goDept(fullNameFor(volume, code))}
            />
          </Card>
          <Card title="Key findings">
            <Findings
              items={[
                `Loudest voice: ${volume.loudest_voice_department}`,
                `Highest volume: ${volume.highest_volume_department}`,
                ...(volume.y_axis_labels ? [`Y-axes: ${volume.y_axis_labels.join(' / ')}`] : [])
              ]}
              tone="gold"
            />
            <Callout>{volume.context}</Callout>
          </Card>
        </div>
      </Section>

      <Section title={hvsq.title || 'H-Index vs QS Rankings'} note={hvsq.context}>
        <div className="grid-2">
          <Card
            title="QS ranking vs h-index by department"
            note="QS ranking axis is reversed: a taller bar means a better (numerically lower) rank, so both series rise together."
          >
            <ComboChart
              labels={hvsq.data_points?.map((d) => d.department) || []}
              barData={hvsq.data_points?.map((d) => d.qs_ranking) || []}
              lineData={hvsq.data_points?.map((d) => d.h_index) || []}
              barLabel="QS Ranking (reversed)"
              lineLabel="h-index"
              barColor={CH.navy}
              lineColor="#0d86a6"
              secondAsBar
              barReverse
              onPick={goDept}
            />
          </Card>
          <Card title="Analysis">
            <Findings
              items={[
                `Top performer: ${hvsq.top_performer}`,
                `Correlation coefficient: ${hvsq.correlation_coefficient} (negative: a lower QS rank number, i.e. a better rank, goes with a higher h-index)`,
                ...(hvsq.other_strong_performers || []),
                ...(hvsq.outliers || []).map((o) => `Outlier: ${o}`)
              ]}
            />
          </Card>
        </div>
      </Section>

      <Section title="H-Index Comparison - Department Wise" note={hcmp.context}>
        <Card
          title={hcmp.title}
          note="Pick the institutes and departments you want to compare - the bars redraw for your selection."
        >
          <div className="chart-filters">
            <div className="filter-row">
              <span className="filter-label">Institutes</span>
              <div className="chips">
                {institutes.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    className={`btn chip${activeInst.includes(inst) ? ' active' : ''}`}
                    aria-pressed={activeInst.includes(inst)}
                    onClick={() => togglePick(setInstSel, institutes, inst)}
                  >
                    {inst}
                  </button>
                ))}
                <button type="button" className="btn chip" onClick={() => setInstSel(null)}>
                  All
                </button>
              </div>
            </div>
            <div className="filter-row">
              <span className="filter-label">Departments</span>
              <div className="chips">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    className={`btn chip${activeDept.includes(dept) ? ' active' : ''}`}
                    aria-pressed={activeDept.includes(dept)}
                    onClick={() => togglePick(setDeptSel, departments, dept)}
                  >
                    {dept}
                  </button>
                ))}
                <button type="button" className="btn chip" onClick={() => setDeptSel(null)}>
                  All
                </button>
              </div>
            </div>
          </div>

          {activeInst.length === 0 || points.length === 0 ? (
            <p className="chart-empty">
              {activeInst.length === 0
                ? 'Select at least one institute to draw the comparison.'
                : 'Select at least one department to draw the comparison.'}
            </p>
          ) : (
            <GroupedBarChart
              horizontal
              height={chartHeight}
              labels={points.map((d) => d.department)}
              datasets={activeInst.map((inst) => ({ label: inst, data: points.map((d) => d[inst]) }))}
              onPick={goDept}
            />
          )}

          <Findings items={hcmp.key_findings} tone="navy" />
        </Card>
      </Section>

      <Section title={table.context || 'QS vs. NIRF Rankings'}>
        <Card>
          <DataTable
            headers={tableHeaders}
            rows={table.data || []}
            renderCell={(h, row, i) => {
              if (h === tableHeaders[0]) return <strong>{row[h]}</strong>;
              if (h.includes('QS')) return <span className="rank-badge gold">{row[h]}</span>;
              return <span className="rank-badge">{row[h]}</span>;
            }}
          />
        </Card>
      </Section>
    </>
  );
}
