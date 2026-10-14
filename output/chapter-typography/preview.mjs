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
for (const width of [1585, 1440, 1024, 390]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false });
  await pause(400);
  await evaluate('document.querySelector("#contribution").scrollIntoView({block:"start",behavior:"instant"})');
  await pause(400);
  const result = await evaluate(`(() => {
    const intros = [...document.querySelectorAll('section[data-case-chapter] > header > div > p')];
    return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, intros: intros.map(el => ({ section: el.closest('section').id, fontSize: getComputedStyle(el).fontSize, lineHeight: getComputedStyle(el).lineHeight, clipped: el.scrollWidth > el.clientWidth + 1 })) };
  })()`);
  if (!result.intros.length || result.pageWidth > width || result.intros.some(el => el.clipped || el.fontSize !== (width < 700 ? '15px' : '16px'))) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL(`typography-${width}.png`, output), Buffer.from(shot.data, 'base64'));
}
if (errors.length) throw new Error(JSON.stringify(errors));
console.log('PASS: all chapter introductions use the reduced type size; no overflow or runtime errors.');
ws.close();