# County Swing Machine

**Live:** https://swing.howtospeakdata.com

An interactive map of how every US county's vote margin shifted from one election to the next. It covers each presidential cycle from 2000 to 2024, plus the 2026 midterm House vote compared with the 2024 presidential vote. Each county is a triangle. Blue triangles lean left (the margin moved toward the Democrats), red triangles lean right (it moved toward the Republicans). Length shows the size of the shift, and the base shows the number of votes.

By Andy Cotgreave, [How To Speak Data](https://howtospeakdata.com).

## Data

| Years | Source |
|---|---|
| 2000–2016 | [MIT Election Data + Science Lab, county presidential returns](https://github.com/MEDSL/county-returns) |
| 2020, 2024 | [Tony McGovern, US county-level presidential results](https://github.com/tonmcg/US_County_Level_Election_Results_08-24) |
| 2026 | U.S. House results by county from the New York Times results pages (Associated Press data), downloaded 6 November 2026 while counting was still under way |
| Map | [us-atlas](https://github.com/topojson/us-atlas) (Census cartographic boundaries, Albers USA) |

**Method:** margin = (Dem − Rep) ÷ total votes; shift = later margin − earlier margin, in percentage points.

**2026 handling:**
- House votes are added up across districts within each county.
- Races where the top two finishers weren't a Democrat and a Republican are left out. That covers uncontested seats, California's same-party runoffs and Alaska.
- Where a county is only partly covered by such a race, the 2024→2026 shift compares the contested part with the 2024 presidential margin in that same part. Those counties are left out of other comparisons with 2026.

**Quirks:**
- Alaska is shown as one statewide triangle.
- Connecticut is statewide in comparisons with 2024 and 2026, because results there are reported by planning regions.
- DC wards are combined.
- Kansas City and the former Bedford city, VA are folded into their counties.

## Rebuilding

The site is a single static `index.html` with the processed data embedded. The scripts in `scripts/` rebuild it:

1. Download the source files into `scripts/dl/` and `scripts/dl2026/`:
   - `medsl.csv`
   - McGovern's 2020 and 2024 CSVs
   - us-atlas `counties-albers-10m.json`
   - the NYT `results-house.json` saved as `dl2026/house.json`
2. Run `npm i d3-dsv d3-geo topojson-client`, then `node build.js && node build2026.js`. This writes `data.json`.
3. Replace `/*DATA*/null` in `template.html` with the contents of `data.json`.
