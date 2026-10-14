import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const targets = await fetch(`http://127.0.0.1:${process.env.CDP_PORT}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  const task = pending.get(message.id);
  if (task) { pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const scroll = async y => { await evaluate(`scrollTo({top:${y},behavior:'instant'})`); await wait(150); };
const state = () => evaluate(`(() => {
  const system = document.querySelector('#system'), reflection = document.querySelector('#reflection');
  const s = system.getBoundingClientRect(), r = reflection.getBoundingClientRect();
  const hit = document.elementFromPoint(innerWidth / 2, Math.max(110, r.top + 10));
  return {systemTop:s.top,systemBottom:s.bottom,reflectionTop:r.top,reflectionHeight:r.height,
    systemPosition:getComputedStyle(system).position,covered:!!hit?.closest('#reflection'),
    overflow:document.documentElement.scrollWidth > innerWidth};
})()`);

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false });
  await send('Page.navigate', { url:'http://localhost:3000/work/operations-platform' });
  for (let i = 0; i < 120; i++) {
    await wait(250);
    if (await evaluate(`!!document.querySelector('[class*=closingSequence]')?.style.getPropertyValue('--standards-height')`)) break;
  }
  const results = [];
  for (const [width, height] of [[1440,1000],[1440,740],[390,844]]) {
    await scroll(0);
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:width<640});
    await wait(300);
    const start = await evaluate(`document.querySelector('#reflection').getBoundingClientRect().top + scrollY - innerHeight`);
    for (let y = 0; y < start; y += 700) await scroll(y);
    await scroll(start);
    const before = await state();
    await scroll(start + height / 2);
    const halfway = await state();
    console.log(JSON.stringify({width,height,start,before,halfway}));
    assert.ok(Math.abs(halfway.systemTop - before.systemTop) < 2, 'Previous chapter holds still');
    assert.ok(Math.abs(halfway.systemBottom - height) < 2, 'Tall chapter remains fully readable before pinning');
    assert.ok(Math.abs(halfway.reflectionTop - height / 2) < 2 && halfway.covered, 'Closing chapter covers from below');
    const image = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
    await writeFile(`output/operations-closing-${width}-${height}.png`, Buffer.from(image.data,'base64'));
    await scroll(start + height);
    const full = await state();
    assert.ok(Math.abs(full.reflectionTop) < 2 && full.covered && !full.overflow);
    await scroll(start + height / 2);
    const reverse = await state();
    assert.ok(Math.abs(reverse.systemTop - halfway.systemTop) < 2 && Math.abs(reverse.reflectionTop - halfway.reflectionTop) < 2, 'Reverse scrolling restores the same composition');
    await scroll(1e7);
    assert.ok(await evaluate(`(() => {const r=document.querySelector('#reflection footer').getBoundingClientRect(); return r.bottom<=innerHeight && r.top>=0;})()`), 'Footer stays reachable');
    await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal((await state()).systemPosition, 'relative');
    await send('Emulation.setEmulatedMedia', {features:[]});
    results.push({width,height,before,halfway,full,reverse});
  }
  await writeFile('output/operations-closing-results.json', JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:true,viewports:results.length}));
} finally { ws.close(); }
