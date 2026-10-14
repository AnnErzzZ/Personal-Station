import assert from "node:assert/strict";
import { test } from "node:test";
import { DEVICE_HISTORY, dailyOrders, deviceHistoryAt, healthLabel, requiresApproval, nextTaskState } from "./model.ts";
import * as rules from "./model.ts";

test("same room and anomaly merge devices, while different anomalies stay separate", () => {
  const orders = dailyOrders(DEVICE_HISTORY, 0);
  assert.equal(orders.length, 2);
  assert.equal(orders.find((order) => order.type === "设备掉网").devices.length, 2);
  assert.equal(orders.find((order) => order.type === "设备误关").devices.length, 1);
});

test("health labels follow the supplied frontend boundary values", () => {
  for (const [score, label] of [[59, "紧急"], [60, "严重"], [69, "严重"], [70, "异常"], [79, "异常"], [80, "良好"], [89, "良好"], [90, "优秀"]]) {
    assert.equal(healthLabel(score), label);
  }
});
test("project boundaries prevent merging rooms with the same name", () => {
  const otherProject = { ...DEVICE_HISTORY[0], id: "OTHER", project: "另一个项目" };
  assert.equal(dailyOrders([DEVICE_HISTORY[0], otherProject], 0).length, 2);
});
test("recovered devices disappear from current tasks while continuous and recurrent history remain", () => {
  const day2 = dailyOrders(DEVICE_HISTORY, 1);
  const day3 = dailyOrders(DEVICE_HISTORY, 2);
  assert.equal(day2.length, 1);
  assert.equal(day3.flatMap((order) => order.devices).some((device) => device.id === "SW-014"), false);
  assert.deepEqual(deviceHistoryAt(DEVICE_HISTORY[0], 2), { continuousDays: 3, occurrences: 1 });
  assert.deepEqual(deviceHistoryAt(DEVICE_HISTORY[2], 2), { continuousDays: 1, occurrences: 2 });
  assert.notEqual(day2[0].id, day3[0].id);
});

test("outer order summary uses longest device continuity rather than daily order age", () => {
  const firstOrder = dailyOrders(DEVICE_HISTORY, 2)[0];
  assert.equal(rules.orderContinuousDays(firstOrder.devices, 2), 3);
  assert.equal(rules.orderContinuousDays([], 2), 0);
  assert.equal(rules.orderContinuousDays([DEVICE_HISTORY[1]], 2), 0);
  assert.equal(rules.orderContinuousDays([DEVICE_HISTORY[0], DEVICE_HISTORY[2]], 2), 3);
});

test("device history separates recurrence after recovery and respects viewed date", () => {
  assert.deepEqual(rules.deviceAnomalyEpisodes(DEVICE_HISTORY[2], 2), [
    { start: 2, recovered: null, days: 1 }, { start: 0, recovered: 1, days: 1 },
  ]);
  assert.deepEqual(rules.deviceAnomalyEpisodes(DEVICE_HISTORY[2], 0), [{ start: 0, recovered: null, days: 1 }]);
  assert.deepEqual(rules.deviceAnomalyEpisodes(DEVICE_HISTORY[1], 2), [{ start: 0, recovered: 2, days: 2 }]);
});
test("manual, project indicators and multi-device orders require post-treatment approval", () => {
  for (const scenario of ["manual", "energy", "automation", "multiple"]) {
    assert.equal(requiresApproval(scenario), true);
    assert.equal(nextTaskState("processing", scenario), "review");
  }
  assert.equal(nextTaskState("processing", "single"), "completed");
  assert.equal(nextTaskState("unclaimed", "multiple"), "processing");
  assert.equal(nextTaskState("review", "multiple"), "completed");
});

test("single-device onsite work enters review before completion", () => {
  assert.equal(requiresApproval("single", true), true);
  assert.equal(nextTaskState("processing", "single", true), "review");
  assert.equal(nextTaskState("processing", "single", false), "completed");
});

test("completed execution earns points while the owner retains follow-up counts", () => {
  assert.equal(typeof rules.summarizeContributions, "function");
  const owner = { id: "owner", name: "负责人" };
  const executor = { id: "executor", name: "现场人员" };
  const onsite = { id: "ONE", owner, executor, onsite: true, state: "completed", mode: "device", deviceCount: 3, unitScore: 2, completedAt: "2026-10-08 10:00", type: "设备掉网" };
  const online = { ...onsite, id: "TWO", onsite: false, executor: undefined, mode: "ticket", unitScore: 5 };
  const pending = { ...onsite, id: "PENDING", state: "review", unitScore: 100 };
  const rows = rules.summarizeContributions([onsite, onsite, online, pending]);
  assert.equal(rows.find((row) => row.person.id === "executor").totalScore, 6);
  assert.equal(rows.find((row) => row.person.id === "executor").executedOrders, 1);
  assert.equal(rows.find((row) => row.person.id === "owner").totalScore, 5);
  assert.equal(rows.find((row) => row.person.id === "owner").followedOrders, 2);
  assert.equal(rows.find((row) => row.person.id === "owner").executedOrders, 1);
});

test("a person holding both duties receives one score and monthly records remain traceable", () => {
  assert.equal(typeof rules.summarizeContributions, "function");
  assert.equal(typeof rules.filterContributionRecords, "function");
  const person = { id: "same", name: "工程师" };
  const october = { id: "OCT", owner: person, executor: person, onsite: true, state: "completed", mode: "device", deviceCount: 2, unitScore: 3, completedAt: "2026-10-08 10:00", type: "设备掉网" };
  const september = { ...october, id: "SEP", completedAt: "2026-09-08 10:00" };
  const filtered = rules.filterContributionRecords([october, september], "2026-10", "2026-10");
  assert.deepEqual(filtered.map((record) => record.id), ["OCT"]);
  const [row] = rules.summarizeContributions([...filtered, october]);
  assert.equal(row.totalScore, 6);
  assert.equal(row.followedOrders, 1);
  assert.equal(row.executedOrders, 1);
  assert.equal(row.rank, 1);
});
