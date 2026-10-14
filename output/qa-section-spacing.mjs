import { mkdir, writeFile } from 'node:fs/promises';
const port = process.env.CDP_PORT;
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
let id = 0;
const pending = new Map();
ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
const phase = process.env.QA_PHASE ?? 'before';
await mkdir('output/section-spacing', { recursive: true });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: 'http://localhost:3000/work/operations-platform' });
for (let n = 0; n < 100; n++) { await wait(200); if (await evaluate("Boolean(document.querySelector('#reflection'))")) break; }
const results = [];
for (const [width, height] of [[1440, 900], [1440, 1244], [1024, 768], [390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await wait(400);
  for (let y = 0; y < await evaluate('document.documentElement.scrollHeight'); y += height * .8) { await evaluate(`window.scrollTo(0,${y})`); await wait(25); }
  await wait(300);
  const geometry = await evaluate(`Array.from(document.querySelectorAll('#overview,#project-overview,[data-case-chapter]')).map(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return {id:e.id,top:Math.round(r.top+scrollY),height:Math.round(r.height),paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,minHeight:s.minHeight};})`);
  const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
  results.push({ width, height, overflow, sections: geometry });
  for (const section of ['background', 'ownership']) {
    await evaluate(`window.scrollTo(0,document.getElementById('${section}').getBoundingClientRect().top+scrollY-${section === 'ownership' ? 118 : 0})`);
    await wait(250);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`output/section-spacing/${phase}-${width}-${height}-${section}.png`, Buffer.from(shot.data,'base64'));
  }
}
await writeFile(`output/section-spacing/${phase}.json`, JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
ws.close();
