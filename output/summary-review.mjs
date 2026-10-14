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
  await send('Page.navigate', {url:'http://localhost:3000/work/operations-platform'});
  for (let n=0;n<100;n++) { await wait(200); if(await evaluate("Boolean(document.querySelector('#overview [class*=projectContext]'))")) break; }
  const checks=[];
  for (const width of [1440,390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
    await wait(350);
    await evaluate("document.querySelector('#overview [class*=projectSummary]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-160)");
    await wait(350);
    const check=await evaluate("(()=>{const e=document.querySelector('#overview [class*=projectSummary]');return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,details:e.querySelectorAll('dl,nav').length,context:e.querySelector('h3').textContent,text:e.textContent,marginTop:getComputedStyle(e.firstElementChild).marginTop,borderTop:getComputedStyle(e.firstElementChild).borderTopWidth};})()");
    if(check.details!==0||check.context!=='项目概览'||check.width!==check.scrollWidth)throw new Error('Unexpected summary structure');
    checks.push(check);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(out,`summary-clean-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  console.log(JSON.stringify({checks,errors}));
  if(errors.length)throw new Error(errors.join(', '));
} finally {ws.close();}