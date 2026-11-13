import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,stat,readdir} from 'node:fs/promises';
const url=process.env.IMPLEMENTATION_ASSISTANT_URL??'http://localhost:3000/work/implementation-assistant';
const response=await fetch(url);assert.equal(response.status,200);const html=await response.text();
test('the replacement route renders all fourteen visible chapters in Figma order',()=>{
  const chapters=[...html.matchAll(/data-chapter="(\d+)"/g)].map(m=>m[1]);
  assert.deepEqual(chapters,Array.from({length:14},(_,i)=>String(i+1).padStart(2,'0')));
  assert.equal(html.includes('data-task-sticky-stage='),false);
  assert.match(html,/返回作品/);
});
test('the result keeps the single demonstration and comparison boundaries',()=>{
  const validation=html.slice(html.indexOf('id="chapter-12"'),html.indexOf('id="chapter-13"'));
  for(const text of ['约 7 分钟','15–30 分钟','用时缩短约 53%–77%','单次标准房间配置演示','计时不含固件升级','网关雷达节点','传感器','智能开关设备','智能空调面板'])assert.ok(validation.includes(text),text);
  assert.equal(validation.includes('效率提升 70%'),false);
  assert.ok(html.includes('已上线，并用于真实项目。'));
});
test('every displayed local image and every retained source asset is nonempty',async()=>{
  const urls=[...new Set([...html.matchAll(/src="([^" ]+)"/g)].map(m=>m[1]).filter(s=>s.startsWith('/cases/implementation-assistant/')))];
  for(const url of urls){const file=new URL('../../../public'+url,import.meta.url);assert.ok((await stat(file)).size>0,url);}
  const folder=new URL('../../../public/cases/implementation-assistant/figma/current/',import.meta.url);
  for(const file of await readdir(folder))assert.ok((await stat(new URL(file,folder))).size>0,file);
});
test('eight independent animated illustrations preserve every original SVG path',async()=>{
  const kinds=[...html.matchAll(/data-illustration="([^"]+)"/g)].map(m=>m[1]);
  for(const name of ['flow-break','repeat','cross-tool','guidance-gap','task-list','checklist','manual','wireframe'])assert.ok(kinds.includes(name),name);
  assert.ok(html.includes('data-source-id="Vector_4"'));
  for(const [kind,file] of [['flow-break','02b87.svg'],['repeat','a074e.svg'],['cross-tool','20082.svg'],['guidance-gap','849e8.svg'],['task-list','cdbb8.svg'],['checklist','3e095.svg'],['manual','b1826.svg'],['wireframe','5f892.svg']]){
    const original=await readFile(new URL('../../../public/cases/implementation-assistant/figma/current/'+file,import.meta.url),'utf8');
    const start=html.indexOf(`data-illustration="${kind}"`);const rendered=html.slice(start,html.indexOf('</svg>',start));
    const paths=s=>[...s.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map(m=>m[1]);
    assert.deepEqual(paths(rendered),paths(original),kind+' path geometry');
  }
});
test('all links and image sources are permanent local references',()=>{
  assert.equal(html.includes('www.figma.com/api/mcp/asset'),false);
  assert.equal(html.includes('fonts.googleapis.com'),false);
  assert.match(html,/href="\/"/);
  assert.match(html,/href="#chapter-01"/);
});
