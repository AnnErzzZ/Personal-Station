import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_IMAGE,
  RUNNING_DATA_DIMENSIONS,
  getNextRunningDataId,
} from "./running-data.ts";

const EXPECTED_DIMENSIONS = [
  "空间使用",
  "自动控制",
  "设备运行",
  "环境变化",
  "空调运行风速分析",
];

test("09 只使用真实运行统计图和五个判断维度", () => {
  assert.deepEqual(
    RUNNING_DATA_DIMENSIONS.map((item) => item.name),
    EXPECTED_DIMENSIONS,
  );
  assert.equal(
    DASHBOARD_IMAGE.src,
    "/cases/heyispace-os/06-operations-dashboard/operations-statistics-detail.png",
  );
  assert.deepEqual(
    { width: DASHBOARD_IMAGE.width, height: DASHBOARD_IMAGE.height },
    { width: 2880, height: 2672 },
  );
  assert.equal(
    RUNNING_DATA_DIMENSIONS.some((item) => item.name.includes("筛选")),
    false,
    "时间与房间筛选是统计上下文，不是第五个数据维度",
  );
});

test("环境变化只引用截图中已确认的温度数据", () => {
  const environment = RUNNING_DATA_DIMENSIONS.find((item) => item.id === "environment");
  assert.ok(environment);
  assert.match(environment.body, /室内外.*温度|温度.*趋势/);
  assert.doesNotMatch(environment.body, /湿度|CO₂|PM2\.5|空气质量|告警|故障率/);
});

test("风速维度只引用截图中已确认的风速数据", () => {
  const fanspeed = RUNNING_DATA_DIMENSIONS.find((item) => item.id === "fanspeed");
  assert.ok(fanspeed);
  assert.match(fanspeed.body, /风速/);
  assert.doesNotMatch(fanspeed.body, /节能|电费|故障|告警|湿度/);
  assert.deepEqual(fanspeed.evidence, [
    "高风速日均运行时长",
    "中风速日均运行时长",
    "低风速日均运行时长",
    "每日空调风速运行时长趋势",
  ]);
});

test("五个 Focus 区域都在 2880 × 2672 截图内且互不重叠", () => {
  const boxes = RUNNING_DATA_DIMENSIONS.map((item) => ({ name: item.name, ...item.focus }));
  for (const { name, x, y, width, height } of boxes) {
    assert.ok(x >= 0 && y >= 0, `${name} 起点不能越界`);
    assert.ok(width > 0 && height > 0, `${name} 必须有可见焦点区域`);
    assert.ok(x + width <= DASHBOARD_IMAGE.width, `${name} 水平越界`);
    assert.ok(y + height <= DASHBOARD_IMAGE.height, `${name} 垂直越界`);
  }
  // 2026-09-23：遮罩直接按卡片 bbox 画 —— 五段应恰好铺满 2×2 + 通栏的卡片网格，
  // 行/列间距一致（48 底图 px），不得相互重叠。
  const full = boxes.filter((box) => box.width > 2000);
  const half = boxes.filter((box) => box.width <= 2000);
  const left = half.filter((box) => box.x < 1440);
  const right = half.filter((box) => box.x > 1440);
  assert.equal(left.length, 2);
  assert.equal(right.length, 2);
  assert.equal(full.length, 1);
  for (const box of [...left, ...right]) {
    assert.equal(box.width, 1120, `${box.name} 应与同列卡片等宽`);
    assert.equal(box.height, 672, `${box.name} 应与同行卡片等高`);
  }
  const [space, device] = left;
  assert.equal(device.y - (space.y + space.height), 48, "行间距应为 48 底图 px");
  const fanspeed = full[0];
  assert.equal(fanspeed.y - (device.y + device.height), 48, "风速卡与上一行间距应为 48 底图 px");
});

test("维度选择器支持循环方向键与 Home / End", () => {
  assert.equal(getNextRunningDataId("space", "ArrowRight"), "automation");
  assert.equal(getNextRunningDataId("space", "ArrowLeft"), "fanspeed");
  assert.equal(getNextRunningDataId("device", "Home"), "space");
  assert.equal(getNextRunningDataId("automation", "End"), "fanspeed");
  assert.equal(getNextRunningDataId("device", "Enter"), "device");
});
