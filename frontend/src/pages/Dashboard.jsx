import { Link } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import { KPI, Section, Card, Findings, Callout, Chips, fmt, PageIntro } from '../components/ui';
import { BarChart, PieChart } from '../components/charts';

export default function Dashboard() {
  const { report, isAdmin } = useReport();
  if (!report) return null;

  const stats = report.general_statistics || [];
  const pubMix = report.publication_mix_composition?.data_points || [];
  const collab = report.iit_bombay_collaborations_breakdown?.data_points || [];
  const areas = report.named_research_areas_centres || [];
  const recs = report.recommendations || [];

  const quickLinks = [
    { to: '/impact', label: 'Research Impact by Department' },
    { to: '/excellence', label: 'Rankings & H-Index' },
    { to: '/publications', label: 'Publications & Authors' },
    { to: '/topics', label: 'Key Research Topics 2020-2026' },
    { to: '/collaborations', label: 'Domestic & Global Network' },
    { to: '/funding', label: 'Funding Agencies & Departments' },
    { to: '/professors', label: 'Professor Research Database' },
    ...(isAdmin ? [{ to: '/admin', label: 'Update Report Data' }] : [])
  ];

  return (
    <>
      <PageIntro
        title="Seven years of research."
        accent="One live portal."
        eyebrow="Research @ IITB"
        eyebrowClass="eyebrow-hero"
      >
        {report.meta?.executive_summary}
      </PageIntro>

      <div className="kpi-grid">
        {stats.map((s, i) => (
          <KPI
            key={i}
            label={s.metric}
            value={typeof s.value === 'number' ? fmt(s.value) : s.value}
          />
        ))}
      </div>

      <div className="grid-2">
        <Card
          title="Publication Mix Composition"
          note={report.publication_mix_composition?.context}
        >
          <BarChart
            horizontal
            height={420}
            labels={pubMix.map((p) => p.publication_type)}
            data={pubMix.map((p) => p.count)}
            label="Publications"
          />
        </Card>

        <Card
          title={report.iit_bombay_collaborations_breakdown?.title}
          note={report.iit_bombay_collaborations_breakdown?.context}
        >
          <PieChart
            height={300}
            labels={collab.map((c) => c.collaboration_type)}
            data={collab.map((c) => c.percentage)}
          />
          <Callout>
            <strong>Key stat:</strong>{' '}
            {report.iit_bombay_collaborations_breakdown?.overall_statement}
          </Callout>
        </Card>
      </div>

      <Section title="Research at a Glance" note="Named research areas and centres covered by this report.">
        <Card>
          <Chips items={areas} />
          <p className="card-note glance-note">
            <strong>Note:</strong> these tags are not links. They are a quick visual
            of how much ground this portal covers, from core departments and centres
            to interdisciplinary programmes. To actually explore the data, use the
            section links in <em>Explore the Portal</em> below or the menu at the top.
          </p>
        </Card>
      </Section>

      <div className="grid-2">
        <Section title="Recommendations" note="Strategic recommendations derived from the report analysis.">
          <Card>
            <Findings items={recs} tone="gold" />
          </Card>
        </Section>

        <Section title="Explore the Portal" note="Jump directly to any analytical section.">
          <Card>
            <ul className="findings">
              {quickLinks.map((l) => (
                <li key={l.to} className="navy">
                  <Link to={l.to}>{l.label} →</Link>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </>
  );
}
