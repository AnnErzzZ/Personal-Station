import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('artifacts/operations-landing');
await mkdir(out, { recursive: true });
const targets = await fetch(`http://127.0.0.1:${process.env.CDP_PORT ?? 9222}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 20000); pending.set(n, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/work/operations-platform' });
  for (let n = 0; n < 100; n++) { await wait(200); if (await evaluate("Boolean(document.querySelector('[data-case-opening] figure'))")) break; }
  await wait(900);
  const results = [];
  for (const width of [1440, 1024, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1080, deviceScaleFactor: 1, mobile: width < 700 });
    await wait(300);
    await evaluate("document.querySelector('[data-case-opening]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-110)");
    await wait(350);
    const result = await evaluate(`(() => { const e=document.querySelector('[data-case-opening]'); const grids=[document.querySelector('#background ol'),document.querySelector('#users [class*=roleCards]')]; const rect=x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,figures:e.querySelectorAll('figure').length,grids:grids.map(g=>({columns:getComputedStyle(g).gridTemplateColumns,cards:[...g.children].map(rect)}))};})()`);
    results.push(result);
    if (result.width !== result.scrollWidth) throw new Error('Page overflow at ' + width);
    if (result.figures !== 5) throw new Error('Expected five illustrations');
    if (result.grids[0].cards.length !== 3 || result.grids[1].cards.length !== 2) throw new Error('Expected three problem cards and two role cards');
    for (const [i, grid] of result.grids.entries()) {
      const horizontal = i === 0 ? width > 900 : width > 700;
      for (let n = 1; n < grid.cards.length; n++) {
        if (horizontal && Math.abs(grid.cards[n].y - grid.cards[0].y) > 1) throw new Error('Desktop cards misaligned');
        if (!horizontal && grid.cards[n].y < grid.cards[n-1].y + grid.cards[n-1].height - 1) throw new Error('Stacked cards overlap');
      }
    }
    if ([1440, 1024, 768, 390, 320].includes(width)) {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(path.join(out, `opening-${width}.png`), Buffer.from(shot.data, 'base64'));
      if ([1440, 390].includes(width)) {
        await evaluate("document.querySelector('#users').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-100)"); await wait(300);
        const roleShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(path.join(out, `opening-users-${width}.png`), Buffer.from(roleShot.data, 'base64'));
      }
      if (width === 390) {
        for (const [index, selector] of ['#background ol > li:nth-child(2)', '#background ol > li:nth-child(3)', '#users article:nth-child(2)'].entries()) {
          await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-100)`); await wait(200);
          const shot = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
          await writeFile(path.join(out, `opening-card-${index}-390.png`),Buffer.from(shot.data,'base64'));
        }
      }
    }
  }
  await writeFile(path.join(out, 'opening-review.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
  if (errors.length) throw new Error('Browser errors: ' + errors.join(', '));
} finally { ws.close(); }
