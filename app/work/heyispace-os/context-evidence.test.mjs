import assert from "node:assert/strict";
import test from "node:test";

const loadModel = async () => {
  try {
    return await import("./context-evidence.ts");
  } catch {
    return {
      CONTEXT_EVIDENCE_STEPS: [],
      getNextContextEvidenceId: () => null,
    };
  }
};

test("the context stage keeps location, object, and result evidence in order", async () => {
  const { CONTEXT_EVIDENCE_STEPS } = await loadModel();

  assert.deepEqual(
    CONTEXT_EVIDENCE_STEPS.map((step) => step.id),
    ["location", "object", "result"],
  );
  assert.deepEqual(
    CONTEXT_EVIDENCE_STEPS.map((step) => step.title),
    ["确认当前位置", "确认当前对象", "查看操作结果"],
  );
  // 选中态与关闭反馈截图补齐后，三段证据均为真实证据。
  assert.deepEqual(
    CONTEXT_EVIDENCE_STEPS.map((step) => step.evidenceStatus),
    ["available", "available", "available"],
  );
  assert.deepEqual(
    CONTEXT_EVIDENCE_STEPS.map((step) => step.src),
    [
      "/cases/heyispace-os/05-multi-view/device-view.png",
      "/cases/heyispace-os/06-context/device-selected.png",
      "/cases/heyispace-os/06-context/control-feedback.png",
    ],
  );
});

test("arrow keys cycle the shared stage while Home and End reach its boundaries", async () => {
  const { getNextContextEvidenceId } = await loadModel();

  assert.equal(getNextContextEvidenceId("location", "ArrowRight"), "object");
  assert.equal(getNextContextEvidenceId("result", "ArrowRight"), "location");
  assert.equal(getNextContextEvidenceId("location", "ArrowLeft"), "result");
  assert.equal(getNextContextEvidenceId("object", "ArrowDown"), "result");
  assert.equal(getNextContextEvidenceId("object", "ArrowUp"), "location");
  assert.equal(getNextContextEvidenceId("object", "Home"), "location");
  assert.equal(getNextContextEvidenceId("object", "End"), "result");
  assert.equal(getNextContextEvidenceId("object", "Enter"), "object");
});
