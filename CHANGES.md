# Changes made to the Research Portal

Everything below is in this push. Build passes (`npm run build`).

## Dashboard

- Added a note under the "Research at a Glance" chips saying they are a visual
  overview and not links, pointing readers to the Explore section and the top
  menu instead.
- New CSS for the note (`.glance-note`).

## Research Impact page (`/impact`)

- Split the single log-scale "Publications vs Crossref citations" chart into two
  separate linear charts: one for publications, one for citations.
  Reason: a log axis is hard to read for a general audience, and mixing two
  units on one axis made comparisons meaningless.
- The faculty chart (average citations vs faculty count) now draws both series
  as bars instead of bar + line.
- Corrected the label "Faculty count (×100)" to "Faculty count".

## Excellence / Rankings page (`/excellence`)

- Chart 1 (Publications vs h-index by department): both series are bars on dual
  axes, and the 23 department labels are shortened to bracket codes (EE, CS,
  AE, C-USE, ...) so they fit without rotating.
  Clicking a bar still opens the right department page: the code is resolved
  back to the full name before navigation.
- Chart 2 (QS ranking vs h-index): second series converted from line to bar,
  and the QS axis is reversed so a taller bar means a better (numerically
  lower) rank. Ticks snap to round numbers (50 at the top, 350 at the bottom),
  which also fixed the odd "347" tick.
  Reason: this follows the reviewer rule of not connecting data points that
  have no natural order, and makes both series rise together.
- H-index comparison chart: replaced the multi-line chart with filter chips.
  - Two rows of chips: institutes (6) and departments (15).
  - Defaults to everything selected; an "All" button resets a row.
  - Deselecting everything shows a clear empty-state message.
  - Redraws as a horizontal grouped bar chart with a height that follows the
    selection (360px minimum, 880px cap).
- New CSS for the filter rows and the empty state (`.chart-filters`,
  `.chart-empty`).

## Publications page (`/publications`)

- Lorenz curve card rewritten to explain the curve in place:
  - Title changed from "Lorenz curve" to
    "How evenly are papers spread across authors?"
  - Added a reading note covering the dashed equality line and the Gini score
    (0 = everyone publishes the same, 1 = one author publishes everything).
  - Axis titles added, the "Bottom 80% of authors = 34% of papers" point is
    marked on the curve, and the legend wording was clarified.
  Reason: the reviewer could not read the original chart without context.

## Chart library (`components/charts.jsx`)

- `ComboChart`: new `secondAsBar` prop (second series as bars) and
  `barReverse` prop (reversed first axis for the QS rank case).
- `MultiLineChart`: new `xTitle`, `yTitle` and `plugins` props.
- New `labelledPoint` plugin (marks and labels one data point).
- New `GroupedBarChart` component used by the H-index filters.
- New `frontend/src/lib/labels.js` with `abbrDept()` (department short codes).

## Download as PDF (replaces the print button)

- The header print button (which opened the browser print dialog on the live
  website, the thing the reviewer called "ugly and not readable") is now a
  Download button. It builds a ready-made PDF and saves it as
  `RESEARCH-IITB-full-report.pdf`.
- New module `frontend/src/lib/pdfReport.js` (uses the new `jspdf` dependency).
  The PDF is typeset from the report data, it is not a screenshot of the site:
  - Cover: title, subtitle, report period, executive summary box, four
    headline numbers (QS rank, publications, citations, patents), generated
    date and sources.
  - Contents page with page numbers.
  - Every report section in a fixed order: section heading, key findings,
    context text, then the data as a table or a bar chart, whichever is more
    readable (single-metric lists under 14 rows become labelled bars,
    everything else becomes a paginated table).
  - KPI cards, stat blocks, year-by-year topics, the recommendations list and
    the research areas list each get their own layout.
  - Footer on every page with the report name and page X / Y.
  - All 31 sections are included, including any added to the data later
    (unknown sections are appended automatically).
- Professor database section: 711 profiles at 8 columns per row produced an
  unreadable table, so the PDF prints a readable sample of 60 (up to 3 per
  department, name + designation on line one, department / topic / research
  interest on line two) with a note pointing to the full database on the
  Professors page and at iitb.irins.org. If you prefer all 711 in the PDF,
  that is a one-line change in `renderProfessorSample()`.
- Download button shows a pulsing busy state while the PDF is generated
  (`.icon-btn.busy` CSS).
- Print is still available through the browser's own Ctrl+P, and the existing
  print stylesheet was kept.

## Files changed

- `frontend/src/App.jsx` (download button)
- `frontend/src/components/charts.jsx`
- `frontend/src/index.css`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Excellence.jsx`
- `frontend/src/pages/Impact.jsx`
- `frontend/src/pages/Publications.jsx`
- `frontend/src/lib/labels.js` (new)
- `frontend/src/lib/pdfReport.js` (new)
- `frontend/package.json`, `frontend/package-lock.json` (added `jspdf`)
