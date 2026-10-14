import { mkdir, writeFile } from 'node:fs/promises';

const output = new URL('./', import.meta.url);
await mkdir(output, { recursive: true });
const targets = await fetch(`http://127.0.0.1:${process.env.CDP_PORT}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const pause = ms => new Promise(r => setTimeout(r, ms));
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('CSS.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: 'http://localhost:3000/work/operations-platform?title-font-review=1' });
  let ready = false;
  for (let n = 0; n < 100; n++) {
    if (await evaluate('!!document.querySelector("#overview-title")')) { ready = true; break; }
    await pause(300);
  }
  if (!ready) throw new Error('Overview title did not load');
  await evaluate('document.fonts.ready.then(() => true)');
  const results = [];
  for (const [width, height] of [[1585, 1244], [1024, 768], [390, 844], [320, 640]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await pause(400);
    const result = await evaluate(`(() => {
      const el = document.querySelector('#overview-title');
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, text: el.textContent,
        fontFamily: s.fontFamily, weight: s.fontWeight, size: s.fontSize, lineHeight: s.lineHeight,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }, clipped: el.scrollWidth > el.clientWidth + 1 };
    })()`);
    const { root } = await send('DOM.getDocument');
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#overview-title' });
    result.fonts = (await send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
    if (result.pageWidth > width || result.clipped || result.weight !== '700' ||
        result.rect.height > parseFloat(result.lineHeight) + 1 ||
        !result.fonts.some(f => f.isCustomFont && /ShuHei|数黑/.test(f.familyName + f.postScriptName))) {
      throw new Error(JSON.stringify(result));
    }
    results.push(result);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(new URL(`title-${width}.png`, output), Buffer.from(shot.data, 'base64'));
  }
  await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  console.log('PASS: embedded title font rendered at all four widths; one line and no clipping or page overflow.');
} finally { ws.close(); }
