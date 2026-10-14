import { mkdir, writeFile } from 'node:fs/promises';
const output = new URL('./', import.meta.url);
await mkdir(output, { recursive: true });
const port = process.env.CDP_PORT;
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const pause = ms => new Promise(r => setTimeout(r, ms));
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: 'http://localhost:3000/work/operations-platform?workflow-style-qa=1' });
for (let n = 0; n < 100; n++) { if (await evaluate('!!document.querySelector("[data-workflow-diagram]")')) break; await pause(300); }
for (const width of [1440, 1024, 768, 390]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width < 700 ? 1400 : 1000, deviceScaleFactor: 1, mobile: false });
  await pause(400);
  await evaluate('document.querySelector("#workflow").scrollIntoView({block:"start",behavior:"instant"})');
  await pause(500);
  const result = await evaluate(`(() => {
    const section = document.querySelector('#workflow');
    const canvas = section.querySelector('[data-workflow-diagram]');
    const diagram = canvas.querySelector('[role="group"]');
    const rect = canvas.getBoundingClientRect();
    const clipped = [...diagram.querySelectorAll('strong, small')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent);
    const tiles = diagram.querySelectorAll(':scope > div > div > svg').length;
    const arrowPaths = [...diagram.querySelectorAll('svg > g > path, svg > path')].filter(el => getComputedStyle(el).markerEnd !== 'none').length;
    const mobileArrows = canvas.querySelectorAll('ol > li > svg').length;
    return {width: innerWidth, pageWidth: document.documentElement.scrollWidth, canvas: {x:rect.x,y:rect.y,width:rect.width,height:rect.height}, clipped, tiles, arrowPaths, mobileArrows, mobile: getComputedStyle(canvas.querySelector('ol')).display, top:section.getBoundingClientRect().top};
  })()`);
  if (result.pageWidth > width || result.clipped.length || result.tiles !== 8 || result.arrowPaths !== 9 || result.mobileArrows !== 5) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL(`workflow-${width}.png`, output), Buffer.from(shot.data, 'base64'));
}
console.log(JSON.stringify({ errors }));
if (errors.length) throw new Error('Browser runtime errors');
ws.close();
