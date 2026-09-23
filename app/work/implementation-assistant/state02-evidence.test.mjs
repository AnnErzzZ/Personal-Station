import assert from "node:assert/strict";
import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const PAGE_URL =
  process.env.IMPLEMENTATION_ASSISTANT_URL ??
  "http://localhost:3000/work/implementation-assistant";

test("05/07 State 02 renders the Figma-ordered local evidence chain", async () => {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);
  const html = await response.text();

  const state02Index = html.indexOf("跨了小程序，任务也别断");
  assert.ok(state02Index >= 0, "State 02 copy must be present in SSR");

  const evidenceIndex = html.indexOf('data-state02-evidence="true"', state02Index);
  assert.ok(evidenceIndex > state02Index, "State 02 must own a product evidence stage");

  const evidenceEnd = html.indexOf('data-state02-evidence="true"', evidenceIndex + 1);
  const evidence = html.slice(
    evidenceIndex,
    evidenceEnd > evidenceIndex ? evidenceEnd : html.length,
  );

  const screens = [
    [
      "workspace",
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/workspace-context.png",
    ],
    [
      "strategy",
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/strategy-configuration.png",
    ],
    [
      "library",
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/strategy-library.png",
    ],
  ];

  let previousIndex = -1;
  for (const [role, src] of screens) {
    const roleIndex = evidence.indexOf(`data-state02-screen="${role}"`);
    assert.ok(roleIndex > previousIndex, `${role} screen must follow the Figma order`);
    assert.ok(
      evidence.includes(`src="${src}"`),
      `${role} screen must use its committed local asset`,
    );
    previousIndex = roleIndex;
  }

  assert.doesNotMatch(
    evidence,
    /data-state02-magnifier|data-magnifier-source|data-static-detail/,
    "the removed glass callout must not come back into the evidence stage",
  );
  assert.doesNotMatch(
    evidence,
    /跨小程序入口/,
    "the callout annotation next to the first phone must be gone",
  );
  assert.doesNotMatch(
    evidence,
    /FluidGlass|onMouseEnter|onMouseMove|onPointerMove/,
    "the evidence callout must remain static and local",
  );
});

test("05/07 assets are organized under semantic state folders without placeholders", async () => {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const assetRoot = join(
    projectRoot,
    "public",
    "cases",
    "implementation-assistant",
    "05-task-continuity",
  );
  const expected = [
    "state-01-gateway/gateway-discovery.png",
    "state-01-gateway/wifi-configuration.png",
    "state-01-gateway/device-networking.png",
    "state-02-cross-product/workspace-context.png",
    "state-02-cross-product/strategy-configuration.png",
    "state-02-cross-product/strategy-library.png",
    "state-03-batch-feedback/device-add-list.png",
    "state-03-batch-feedback/upgrade-queue-complete.png",
    "state-03-batch-feedback/upgrade-queue-failed.png",
  ];

  for (const relativePath of expected) {
    await access(join(assetRoot, relativePath), constants.R_OK);
  }

  const files = [];
  async function collectFiles(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await collectFiles(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  await collectFiles(assetRoot);

  assert.equal(
    files.some((filePath) => /Placeholder/i.test(filePath)),
    false,
    "the latest assets must not keep attachment placeholder names",
  );
});
