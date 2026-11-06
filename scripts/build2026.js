// Adds 2026 U.S. House votes by county (NYT results JSON, AP data) to data.json.
// votes['2026'][fips] = [dem, rep, total, eevp%, partial(0|1), base2024 margin ×10000 over the same pieces]
const fs = require('fs'), path = require('path');
const house = JSON.parse(fs.readFileSync(path.join(__dirname, 'dl2026', 'house.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));

const acc = {}; // fips -> {d,r,t,exp,partial,bw,bm}
const get = f => (acc[f] ||= { d: 0, r: 0, t: 0, exp: 0, partial: 0, bw: 0, bm: 0 });
let races = 0, skipped = [];
for (const race of house.races) {
  if (race.nyt_id.startsWith('US-')) continue;
  const meta = race.candidate_metadata || {};
  const party = id => meta[id]?.party?.nyt_id;
  const ids = Object.keys(meta);
  const top = (race.reporting_units || []).find(u => u.level === 'state');
  const top2 = top ? top.candidates.slice().sort((a, b) => b.votes.total - a.votes.total).slice(0, 2).map(c => party(c.nyt_id)).sort().join() : '';
  const contested = !race.uncontested && top2 === 'DEM,GOP';             // top two finishers must be a Democrat and a Republican
  if (!contested) skipped.push(race.nyt_id.replace('-2026-11-03', ''));
  races++;
  const units = race.reporting_units || [];
  // pick pieces: Alaska -> state unit; otherwise county units, or city/other pieces where a county unit is missing
  let pieces;
  if (units[0]?.state_postal === 'AK' || units.some(u => u.state_postal === 'AK')) {
    pieces = units.filter(u => u.level === 'state').map(u => ({ u, f: 'S02' }));
  } else {
    const byCounty = {};
    for (const u of units) {
      if (!u.fips_county || !['county', 'city', 'other'].includes(u.level)) continue;
      (byCounty[u.fips_state + u.fips_county] ||= []).push(u);
    }
    pieces = [];
    for (const f in byCounty) {
      const cu = byCounty[f].filter(u => u.level === 'county');
      for (const u of (cu.length ? cu : byCounty[f])) pieces.push({ u, f });
    }
  }
  for (const { u, f } of pieces) {
    const a = get(f.startsWith('09') ? 'S09' : f);
    if (!contested) { a.partial = 1; continue; }
    let d = 0, r = 0;
    for (const c of u.candidates) { const p = party(c.nyt_id); if (p === 'DEM') d += c.votes.total; else if (p === 'GOP') r += c.votes.total; }
    a.d += d; a.r += r; a.t += u.total_votes; a.exp += u.total_expected_vote || u.total_votes;
    const h = u.historical_comparison_race_data && Object.entries(u.historical_comparison_race_data).find(([k]) => k.includes('-G-P-2024'));
    if (h) { a.bw += u.total_votes; a.bm += h[1].margin / 100 * u.total_votes; }
  }
}
const out = {};
for (const f in acc) {
  const a = acc[f]; if (!a.t) continue;
  const eevp = Math.min(100, Math.round(100 * a.t / a.exp));
  out[f] = [a.d, a.r, a.t, eevp, a.partial, a.bw ? Math.round(10000 * a.bm / a.bw) : null];
}
data.votes['2026'] = out;
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data));
const n = Object.keys(out).length, part = Object.values(out).filter(v => v[4]).length;
const miss = Object.keys(out).filter(f => f[0] !== 'S' && !data.counties[f]);
let T = [0, 0, 0]; for (const v of Object.values(out)) { T[0] += v[0]; T[1] += v[1]; T[2] += v[2]; }
console.log({ races, notDvR: skipped, counties: n, partial: part, unmatched: miss, houseMargin: (100 * (T[0] - T[1]) / T[2]).toFixed(2), votes: T[2] });
