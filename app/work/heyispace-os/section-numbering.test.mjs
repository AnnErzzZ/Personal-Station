import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("页面编排使用新的 01–12 章节顺序", () => {
  const page = read("./page.tsx");
  const orderedComponents = [
    "HeroTransition",
    "Section03UsersTasks",
    "Section04Complexity",
    "Section05ProblemsToGoals",
    "Section09OperationsData",
    "Section07Context",
    "Section08MultiView",
    "Section08MapEditor",
    "Section03Agent",
    "Section11RoleAccess",
    "Section12ImpactReflection",
  ];

  let previous = -1;
  for (const component of orderedComponents) {
    const position = page.indexOf(`<${component} />`);
    assert.ok(position > previous, `${component} 顺序不正确或未接入`);
    previous = position;
  }
});

test("已实现章节保留稳定的 Section ID 锚点", () => {
  const expectations = [
    ["./HeroTransition.tsx", 'id="section-01-hero"'],
    ["./Section01ProjectContext.tsx", 'id="section-02-context"'],
    ["./Section03UsersTasks.tsx", 'id="section-03-users"'],
    ["./Section04Complexity.tsx", 'id="section-04-complexity"'],
    ["./Section05ProblemsToGoals.tsx", 'id="section-05-problems-goals"'],
    ["./Section07Context.tsx", 'id="section-06-context"'],
    ["./Section08MultiView.tsx", 'id="section-07-multiview"'],
    ["./Section08MapEditor.tsx", 'id="section-08-digital-space"'],
    ["./Section09OperationsData.tsx", 'id="section-09-running-data"'],
    ["./Section03Agent.tsx", 'id="section-10-answer-structure"'],
    ["./Section11RoleAccess.tsx", 'id="section-11-role-access"'],
    ["./Section12ImpactReflection.tsx", 'id="section-12-impact-reflection"'],
  ];

  for (const [file, expected] of expectations) {
    assert.match(read(file), new RegExp(expected), `${file} 缺少 ${expected}`);
  }
});

test("SectionHeader 默认总数为 12，相关代码不再包含 / 13", () => {
  assert.match(read("./CaseSection.tsx"), /total \?\? "12"/);

  const files = [
    "./page.tsx",
    "./CaseSection.tsx",
    "./Section03UsersTasks.tsx",
    "./Section04Complexity.tsx",
    "./Section05ProblemsToGoals.tsx",
    "./Section07Context.tsx",
    "./Section08MultiView.tsx",
    "./Section08MapEditor.tsx",
    "./Section09OperationsData.tsx",
    "./Section03Agent.tsx",
    "./Section11RoleAccess.tsx",
    "./role-access.ts",
    "./Section12ImpactReflection.tsx",
    "./map-editor-steps.ts",
    "./multi-view-views.ts",
    "./MultiViewTabs.tsx",
    "./sections.module.css",
  ];

  for (const file of files) {
    assert.doesNotMatch(read(file), /\/\s*13\b/, `${file} 还有 / 13 硬编码`);
  }
});
