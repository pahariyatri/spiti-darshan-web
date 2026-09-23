import fs from 'node:fs';
import sharp from 'sharp';
const c = JSON.parse(fs.readFileSync('/tmp/claude-1000/-home-pankaj-kumar-Workspace-spiti-darshan-web/eb5b4fc4-ff2b-473b-b9d5-dc1f94e5677a/scratchpad/commons/candidates.json', 'utf8'));
const groups = process.argv.slice(2);
const TW = 240, TH = 150, cols = 8;
const comps = []; let y = 0;
for (const g of groups) {
  comps.push({ input: Buffer.from(`<svg width="1920" height="26"><text x="4" y="19" font-size="18" font-family="sans-serif" fill="#000">${g}</text></svg>`), left: 0, top: y });
  y += 26;
  const items = c[g] ?? [];
  for (let i = 0; i < items.length; i++) {
    const r = await fetch(items[i].thumb, { headers: { 'User-Agent': 'SpitiDarshanSite/1.0 (licensing research)' } });
    const buf = Buffer.from(await r.arrayBuffer());
    const t = await sharp(buf).resize(TW, TH, { fit: 'cover' }).toBuffer();
    comps.push({ input: t, left: (i % cols) * (TW + 2), top: y });
    comps.push({ input: Buffer.from(`<svg width="30" height="24"><rect width="30" height="24" fill="#000"/><text x="6" y="18" font-size="16" fill="#ff0" font-family="sans-serif">${i}</text></svg>`), left: (i % cols) * (TW + 2), top: y });
  }
  y += TH + 6;
}
await sharp({ create: { width: cols * (TW + 2), height: y, channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 80 }).toFile(`/tmp/claude-1000/-home-pankaj-kumar-Workspace-spiti-darshan-web/eb5b4fc4-ff2b-473b-b9d5-dc1f94e5677a/scratchpad/commons/sheet-${groups[0]}.jpg`);
