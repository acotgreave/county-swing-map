// Builds compact data.json: county centroids (Albers px), state centroids, votes per year.
const fs = require('fs'), path = require('path');
const { csvParse } = require('d3-dsv');
const topo = require('topojson-client');
const { geoPath } = require('d3-geo');
const D = path.join(__dirname, 'dl');
const read = f => csvParse(fs.readFileSync(path.join(D, f), 'utf8'));

const votes = {}; // year -> fips -> [dem, gop, total]
const put = (y, fips, d, g, t) => {
  fips = String(fips).padStart(5, '0');
  (votes[y] ||= {})[fips] = [Math.round(+d), Math.round(+g), Math.round(+t)];
};
{ // MIT Election Data + Science Lab, 2000-2016
  const acc = {};
  for (const r of read('medsl.csv')) {
    if (!r.FIPS || r.FIPS === 'NA') continue;
    let f = (r.FIPS === '36000' || r.FIPS === '2938000') ? '29095' : r.FIPS === '51515' ? '51019' : r.FIPS; // Kansas City -> Jackson Co.; Bedford city -> Bedford Co.
    const k = r.year + '|' + f.padStart(5, '0'), a = (acc[k] ||= [0, 0, 0, new Set()]);
    const n = +r.candidatevotes || 0;
    if (r.party === 'democrat') a[0] += n; else if (r.party === 'republican') a[1] += n;
    if (r.FIPS === '51515') a[2] += n;                                   // its totalvotes field is wrong; sum candidates
    else if (!a[3].has(r.FIPS)) { a[3].add(r.FIPS); a[2] += +r.totalvotes || 0; }
  }
  for (const k in acc) { const [y, f] = k.split('|'); put(+y, f, ...acc[k].slice(0, 3)); }
}
for (const y of [2020, 2024])
  for (const r of read(`${y}_US_County_Level_Presidential_Results.csv`)) put(y, r.county_fips, r.votes_dem, r.votes_gop, r.total_votes);

// --- clean-ups ---
for (const y in votes) {
  const v = votes[y];
  const fold = (pred, key) => { const keys = Object.keys(v).filter(pred); if (!keys.length) return;
    const a = [0,0,0]; for (const k of keys) { v[k].forEach((n,i)=>a[i]+=n); delete v[k]; } v[key] = a; };
  if (v['46113']) { v['46102'] = v['46113']; delete v['46113']; }      // Shannon -> Oglala Lakota
  fold(f => f.startsWith('02'), 'S02');                               // Alaska: house districts, report statewide
  fold(f => f.startsWith('11'), '11001');                             // DC wards -> DC
  if (y === '2024') fold(f => f.startsWith('09'), 'S09');             // CT planning regions don't match old counties
}
const ct = JSON.parse(fs.readFileSync(path.join(D, 'counties.json')));
const pg = geoPath(); // already projected (Albers, 975x610)
const counties = {};
for (const f of topo.feature(ct, ct.objects.counties).features) {
  const [x, y] = pg.centroid(f);
  if (isFinite(x)) counties[f.id] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10, f.properties.name];
}
const states = {};
for (const f of topo.feature(ct, ct.objects.states).features) {
  const [x, y] = pg.centroid(f);
  states[f.id] = [Math.round(x), Math.round(y), f.properties.name];
}
// Alaska centroid: nudge into the mainland inset
const out = {
  counties, states, votes,
  statesTopo: { type: 'Topology', bbox: ct.bbox, transform: ct.transform, arcs: ct.arcs,
    objects: { states: ct.objects.states, nation: ct.objects.nation } },
};
for (const y in votes) {
  const n = Object.keys(votes[y]).length, miss = Object.keys(votes[y]).filter(f => !counties[f]);
  console.log(y, n, 'unmatched:', miss.length, miss.slice(0, 12).join(' '));
}
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(out));
console.log('bytes', fs.statSync(path.join(__dirname, 'data.json')).size);
