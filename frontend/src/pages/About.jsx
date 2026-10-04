import { PageIntro } from '../components/ui';

const LI_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

const MAIL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const HEADS = [
  {
    name: 'Rakshana Sundaram', role: 'Head', img: `${import.meta.env.BASE_URL}team/Rakshana.jpg`,
    li: 'https://linkedin.com/in/rakshana-sundaram05', mail: '24b2428@iitb.ac.in'
  },
  {
    name: 'Shrestha Khatri', role: 'Head', img: `${import.meta.env.BASE_URL}team/Shrestha.jpg`,
    li: 'https://linkedin.com/in/shrestha-khatri-57a887315', mail: '24b0033@iitb.ac.in'
  }
];

const MEMBERS = [
  {
    name: 'Aryan Chauhan', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Aryan.jpg`,
    li: 'https://www.linkedin.com/in/aryan-chauhan-08763439b/', mail: '25b2494@iitb.ac.in'
  },
  {
    name: 'Ayush Deshmukh', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Ayush.jpg`,
    li: 'https://linkedin.com/in/ayush-deshmukh-bb6a8a379', mail: '25b2495@iitb.ac.in'
  },
  {
    name: 'Vedant Iyengar', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Vedant.jpg`,
    li: 'https://linkedin.com/in/vedant-iyengar-046781397', mail: '25b2141@iitb.ac.in'
  },
  {
    name: 'Harsh Prajapat', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Harsh.jpg`,
    li: 'https://linkedin.com/in/harsh-prajapat-a39341386', mail: '25b0407@iitb.ac.in'
  },
  {
    name: 'Ummehani Chakkiwala', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Ummehani.jpg`, top: true,
    li: 'https://linkedin.com/in/ummehani-chakkiwala-502b1136b', mail: '25b4510@iitb.ac.in'
  },
  {
    name: 'Vishakha Arekar', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Vishakha.jpg`,
    li: 'https://linkedin.com/in/vishakha-arekar-8b5a53372', mail: '25b0042o@iitb.ac.in'
  },
  {
    name: 'Zubair Al-Mamoon', role: 'Data Analyst', img: `${import.meta.env.BASE_URL}team/Zubair.jpg`,
    li: 'https://linkedin.com/in/zubair-al-mamoon-493353367', mail: '25b0742@iitb.ac.in'
  }
];

function MemberCard({ m }) {
  return (
    <div className="member-card">
      <div className="member-photo">
        <img src={m.img} alt={m.name} style={m.top ? { objectPosition: 'top' } : undefined} />
      </div>
      <div className="member-name">{m.name}</div>
      <div className="member-role">{m.role}</div>
      <div className="member-links">
        <a href={m.li} target="_blank" rel="noopener noreferrer" className="member-link" title="LinkedIn">
          {LI_ICON}
        </a>
        <a href={`mailto:${m.mail}`} className="member-link" title={m.mail}>
          {MAIL_ICON}
        </a>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div>
      <PageIntro title="About the" accent="DAV Team" eyebrow="Who we are">
        We are the <strong>Data Analytics and Visualization (DAV) Team</strong>, a part of the
        Undergraduate Academic Council (UGAC) at IIT Bombay. Since its inception in 2018, the DAV
        Team is an interdisciplinary group dedicated to help students make better academic
        decisions. We build tools, dashboards, and reports that make information about courses,
        grading trends, semester planning, and other academic opportunities easier to understand
        and use. We also work with academic and institute bodies to analyse institutional data and
        develop solutions that benefit the student community. At the same time, the team offers
        students the opportunity to work on real-world data science projects, learn practical
        skills, and create resources that make a meaningful difference to campus life.
      </PageIntro>

      <div className="team-category">
        <div className="team-label">Team Heads</div>
        <div className="members-grid">
          {HEADS.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
        </div>
      </div>

      <div className="team-category">
        <div className="team-label">Team Members</div>
        <div className="members-grid">
          {MEMBERS.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
