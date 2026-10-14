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

await mkdir('output/reflection',{recursive:true});
const checks=[];
for(const [width,height] of [[1440,1244],[390,844]]) {
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
 await wait(400);
 await evaluate("window.scrollTo(0,document.querySelector('#reflection').getBoundingClientRect().top+scrollY-72)");
 await wait(300);
 const result=await evaluate("(()=>{const cards=[...document.querySelectorAll('[data-reflection-card]')];return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cards:cards.map(e=>{const r=e.getBoundingClientRect();return {theme:e.dataset.reflectionCard,x:r.x,y:r.y,width:r.width,height:r.height,illustrations:e.querySelectorAll('svg[role=img]').length}}),dark:document.querySelector('#reflection').hasAttribute('data-operations-dark')};})()");
 if(result.overflow||result.cards.length!==4||result.cards.some(c=>c.illustrations!==1))throw Error(JSON.stringify(result));
 checks.push(result);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile('output/reflection/'+width+'.png',Buffer.from(shot.data,'base64'));
 if(width<700)for(const theme of ['ownership','approval','priority']) {
  await evaluate("document.querySelector('[data-reflection-card="+theme+"]').scrollIntoView({block:'start'})");
  await evaluate('window.scrollBy(0,-72)');await wait(150);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile('output/reflection/'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
 }
}
console.log(JSON.stringify(checks));
ws.close();
