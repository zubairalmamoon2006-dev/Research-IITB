// Short axis codes for long department/centre names.
// Rotated chart axes get unreadable with full names ("Centre for Technology
// Alternatives for Rural Areas(CTARA)"), so charts show the code and the full
// name is kept for drill-down navigation.

const CODES = {
  'Electrical Engineering': 'EE',
  'Mechanical Engineering': 'ME',
  'Civil Engineering': 'CE',
  'Chemical Engineering': 'ChemE',
  'Metallurgical Engineering and Materials Science': 'MEMS',
  'Aerospace Engineering': 'Aerospace',
  'Energy Science and Engineering': 'ESE',
  'Earth Sciences': 'Earth Sci.',
  'Biosciences and Bioengineering': 'BSBE',
  'Mathematics': 'Maths',
  'Computer Science and Engineering': 'CSE',
  'Humanities and Social Sciences': 'HSS',
  'Systems and Control Engineering': 'SCE',
  'Shailesh J Mehta School of Management': 'SJMSOM',
  'Industrial Design Center': 'IDC',
  'Educational Technology': 'ET',
  'Climate Studies': 'Climate',
  'Physics': 'Physics',
  'Chemistry': 'Chemistry'
};

/** Abbreviate a department label for chart axes; returns the input unchanged
 *  when there is no shorter form. Codes in brackets (CSRE, ESED, CTARA,
 *  C-USE) are extracted automatically. */
export function abbrDept(name) {
  if (!name) return name;
  const bracketed = name.match(/\(([^)]+)\)/);
  if (bracketed) return bracketed[1];
  return CODES[name] || name;
}
