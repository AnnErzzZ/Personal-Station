import assert from "node:assert/strict";
import test from "node:test";

const PAGE_URL =
  process.env.IMPLEMENTATION_ASSISTANT_URL ??
  "http://localhost:3000/work/implementation-assistant";

async function loadHtml() {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);
  return response.text();
}

function indexOf(html, needle) {
  const at = html.indexOf(needle);
  assert.notEqual(at, -1, `SSR must contain ${needle}`);
  return at;
}

test("06/08 知识库 section 排在 07/08 结果 section 之前", async () => {
  const html = await loadHtml();
  const knowledge = indexOf(html, "新实施人员不必只靠口传");
  const outcome = indexOf(html, "真实任务中的表现");
  const designSpec = indexOf(html, "PingFang SC");

  assert.ok(knowledge < outcome, "知识库 section 必须先于结果 section");
  assert.ok(outcome < designSpec, "设计规范 section 必须排在最后");
});

test("06/08 知识库 section 使用当前文案与图文手册素材", async () => {
  const html = await loadHtml();
  const section = html.slice(
    indexOf(html, "knowledge-base-title"),
    indexOf(html, "verified-outcome-title"),
  );

  assert.ok(section.includes("06/08"), "编号必须来自 Figma 本轮 section 序号");
  assert.ok(
    section.includes("产品上线后，界面只能解决"),
    "正文必须保留界面职责的开场句",
  );
  assert.ok(
    section.includes("按章节就能找到对应说明"),
    "正文需说明知识资料覆盖的使用场景",
  );
  assert.ok(
    section.includes("/06-knowledge-base/feishu-help-doc.png"),
    "主视觉必须使用从 Figma 导出的图文手册截图",
  );
});

test("06 到 07 之间使用滚动联动的章节过渡", async () => {
  const html = await loadHtml();
  const scene = indexOf(html, 'data-outcome-scene="true"');
  const outgoing = indexOf(html, 'data-outcome-outgoing="true"');
  const incoming = indexOf(html, 'data-outcome-incoming="true"');

  assert.ok(outgoing > scene, "旧章节必须位于过渡场景内");
  assert.ok(incoming > outgoing, "新章节必须在旧章节之后进入");
  assert.ok(
    html.indexOf('data-outcome-bg="true"') > scene,
    "过渡场景必须带独立背景层，用于低色到深色的切换",
  );
});

test("07/08 结果 section 保留深色舞台、7 分钟与结论段落", async () => {
  const html = await loadHtml();
  const outcomeAt = indexOf(html, "verified-outcome-title");
  const section = html.slice(outcomeAt, indexOf(html, "design-spec-title"));

  assert.ok(section.includes("07/08"), "结果 section 使用本轮序号 07/08");
  assert.ok(
    section.includes(">7</span> 分钟"),
    "7 分钟必须是舞台的中心表达",
  );
  assert.ok(
    section.includes("2026 年 5 月 30"),
    "演示口径必须保留具体日期与单次演示说明",
  );
  assert.ok(
    section.includes("相比原先每间房约 15–30 分钟的调试时间，调试时长缩短约 53%–77%"),
    "结果小字必须保留用户确认的对比口径",
  );
});

test("08/08 设计规范 section 保留字阶、色板与元素板", async () => {
  const html = await loadHtml();
  const section = html.slice(indexOf(html, "design-spec-title"));

  assert.ok(section.includes("08/08"), "设计规范 section 使用 08/08");
  assert.ok(section.includes("PingFang SC"), "必须保留字体展示");
  assert.ok(section.includes("18 Medium"), "必须保留字号层级标注");
  for (const hex of ["#5BB773", "#0090FF", "#FFC53D", "#E5484D", "#1C2024"]) {
    assert.ok(section.includes(hex), `色板必须包含 ${hex}`);
  }
  for (const name of ["Accent", "Info", "Warning", "Error"]) {
    assert.ok(section.includes(name), `色卡必须包含颜色名称 ${name}`);
  }
  assert.ok(
    section.includes("/08-design-system/device-icon-board@2x.png"),
    "设备图标板必须使用从 Figma 导出的 2x 素材",
  );
});

test("04/05 既有滚动 section 未被破坏", async () => {
  const html = await loadHtml();

  assert.ok(html.includes('data-stage-card="true"'), "04/05 的舞台卡片仍在");
  assert.ok(
    html.includes("把分散操作接回同一条任务链"),
    "05/07 的章节标题仍在",
  );
  assert.ok(html.includes('data-task-indicator="2"'), "05/07 指示器仍有三个槽位");
});
