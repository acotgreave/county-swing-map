// Downloads each House race's NYT results file and merges them into dl2026/house-full.json
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'dl2026');
const idx = JSON.parse(fs.readFileSync(path.join(D, 'house.json'), 'utf8'));
const races = idx.races.filter(r => r.office_id === 'H' && r.url && !r.nyt_id.startsWith('US-'));
const base = 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03/';
(async () => {
  const out = [], failed = [];
  let i = 0;
  async function worker() {
    while (i < races.length) {
      const r = races[i++], slug = r.url.split('/').pop().replace('.html', '');
      const file = path.join(D, 'races', slug + '.json');
      try {
        let txt;
        if (fs.existsSync(file)) txt = fs.readFileSync(file, 'utf8');
        else { const res = await fetch(base + slug + '.json'); if (!res.ok) throw new Error(res.status); txt = await res.text(); fs.writeFileSync(file, txt); }
        const j = JSON.parse(txt), race = (j.races || []).find(x => x.nyt_id === r.nyt_id);
        if (!race) throw new Error('race missing');
        out.push(race);
      } catch (e) { failed.push(slug + ' ' + e.message); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  fs.writeFileSync(path.join(D, 'house-full.json'), JSON.stringify({ races: out }));
  console.log('races', out.length, 'of', races.length, 'failed', failed.length, failed.slice(0, 10));
})();
