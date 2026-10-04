import { useState, useMemo } from 'react';
import { useReport } from '../context/ReportContext';
import { Section, Card, Findings, Callout, fmt, PageIntro, DataDetails } from '../components/ui';
import { BarChart, GroupedBarChart, PieChart, MultiLineChart, LorenzCurve, ComboChart, CH } from '../components/charts';
import YearFilter from '../components/YearFilter';

export default function Publications() {
  const { report } = useReport();
  const [range, setRange] = useState({ from: null, to: null });
  const years = useMemo(() => {
    const pts = report?.changes_in_publication_author_counts?.data_points || [];
    return [...new Set(pts.map((d) => d.year))].sort((a, b) => a - b);
  }, [report]);
  if (!report) return null;

  const mix = report.publication_mix_composition || {};
  const output = report.measuring_research_output || {};
  const rank = report.correlation_academic_rank_research_output || {};
  const auth = report.research_authorship_distribution || {};
  const trend = report.changes_in_publication_author_counts || {};
  const lorenz = report.concentration_of_research_output_among_authors || {};
  const totals = report.publications_patents || {};

  const from = range.from ?? years[0];
  const to = range.to ?? years[years.length - 1];
  const trendPoints = (trend.data_points || []).filter((d) => d.year >= from && d.year <= to);

  const pubs = output.publications_data || [];
  const pats = output.patents_data || [];
  const institutions = pubs.map((p) => p.institution);
  const patentsByInst = Object.fromEntries(pats.map((p) => [p.institution, p.patents]));

  return (
    <>
      <PageIntro title="Publications & authors." accent="Who produces the work." eyebrow="Output · Patents · Authorship">
        Publication composition, output compared with peer institutes, how academic rank relates to research output, and how authorship and credit are distributed across the institute.
      </PageIntro>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="value">{fmt(totals.total_publications)}</div>
          <div className="label">Total Publications</div>
        </div>
        <div className="kpi">
          <div className="value">{fmt(totals.total_patents)}</div>
          <div className="label">Total Patents</div>
        </div>
        <div className="kpi">
          <div className="value">{report.general_statistics?.find((s) => s.metric === 'Citations')?.value?.toLocaleString?.() || '909,949'}</div>
          <div className="label">Total Citations</div>
        </div>
      </div>

      <Section title="Publication Mix Composition" note={mix.context}>
        <Card>
          <BarChart
            horizontal
            height={420}
            labels={mix.data_points?.map((d) => d.publication_type) || []}
            data={mix.data_points?.map((d) => d.count) || []}
            label="Publications"
            colors={(mix.data_points || []).map((d) => (d.count > 0 ? '#0d86a6' : '#cbd5e1'))}
          />
          <DataDetails
            headers={['Publication type', 'Publications', 'Share (%)']}
            rows={(mix.data_points || []).map((d) => ({
              'Publication type': d.publication_type,
              Publications: d.count,
              'Share (%)': d.share_pct
            }))}
          />
        </Card>
      </Section>

      <Section title="Measuring Research Output: Publications and Patents" note={output.context}>
        <Card title={output.title}>
          <GroupedBarChart
            height={380}
            labels={institutions}
            datasets={[
              { label: 'Publications', data: institutions.map((i) => pubs.find((p) => p.institution === i)?.publications || 0), color: '#0d86a6' },
              { label: 'Patents (×50 scale)', data: institutions.map((i) => (patentsByInst[i] || 0) * 50), color: CH.navy }
            ]}
          />
          <Findings items={output.key_findings} tone="gold" />
        </Card>
      </Section>

      <div className="grid-2">
        <Section title="Academic Rank & Research Output" note={rank.context}>
          <Card title={rank.title}>
            <PieChart
              doughnut={false}
              labels={rank.data_points?.map((d) => d.designation) || []}
              data={rank.data_points?.map((d) => d.percentage) || []}
            />
            <Findings items={rank.key_insights} />
          </Card>
        </Section>

        <Section title="Authorship Distribution" note={auth.context}>
          <Card title={auth.title}>
            <BarChart
              height={300}
              labels={(auth.data_points || []).map((d) => d.team_size)}
              data={(auth.data_points || []).map((d) => d.papers)}
              label="Papers"
              colors={(auth.data_points || []).map((d) => (d.papers > 0 ? '#0d86a6' : '#cbd5e1'))}
            />
            <Findings items={auth.key_findings} tone="navy" />
            <div className="card-note" style={{ marginTop: 12 }}>Implications</div>
            <Findings items={auth.implications} tone="gold" />
            <Callout>{auth.data_points_description}</Callout>
          </Card>
        </Section>
      </div>

      <Section
        title="Changes in Publication Author Counts"
        note={`${trend.context} - sharp year-on-year moves are flagged with ▲/▼ percentages.`}
      >
        <div style={{ marginBottom: 12 }}>
          <YearFilter years={years} from={from} to={to} onChange={setRange} label="Author-count trend" />
        </div>
        <div className="grid-2">
          <Card title={trend.title}>
            <MultiLineChart
              height={340}
              yPercent
              trendFlags
              flagThreshold={0.12}
              labels={trendPoints.map((d) => String(d.year))}
              datasets={[
                { label: 'Single author', data: trendPoints.map((d) => d.single_author) },
                { label: '2-5 authors', data: trendPoints.map((d) => d['2_5_authors']) },
                { label: '6+ authors', data: trendPoints.map((d) => d['6_plus_authors']) }
              ]}
            />
          </Card>
          <Card title="Key findings">
            <Findings items={trend.key_findings} tone="gold" />
            <Callout>
              {totals.publication_trends_by_team_size &&
                `Team-size summary: ${totals.publication_trends_by_team_size.single_author_proportion} single author · ${totals.publication_trends_by_team_size.small_medium_teams_proportion} small/medium teams · large teams grew from ${totals.publication_trends_by_team_size.large_teams_proportion_2020} (2020) to ${totals.publication_trends_by_team_size.large_teams_proportion_2025} (2025).`}
            </Callout>
          </Card>
        </div>
      </Section>

      <Section title="Concentration of Research Output Among Authors" note={lorenz.context}>
        <div className="grid-2">
          <Card title="Lorenz curve">
            <LorenzCurve
              data={lorenz.data_points || []}
              equalityLine={lorenz.line_of_perfect_equality_points || []}
            />
          </Card>
          <Card title="Top 20% of authors vs the rest">
            <PieChart
              height={300}
              labels={lorenz.pie_chart_data?.map((d) => d.category) || []}
              data={lorenz.pie_chart_data?.map((d) => d.value) || []}
              colors={['#0d86a6', '#cbd5e1']}
            />
            <Findings items={lorenz.key_findings} tone="gold" />
            <Callout><strong>Finding:</strong> {lorenz.specific_data_point}</Callout>
          </Card>
        </div>
      </Section>
    </>
  );
}
