import assert from "node:assert/strict";
import test from "node:test";

const PAGE_URL =
  process.env.IMPLEMENTATION_ASSISTANT_URL ??
  "http://localhost:3000/work/implementation-assistant";

function extractStageCard(html) {
  const start = html.indexOf('data-stage-card="true"');
  assert.notEqual(start, -1, "SSR must expose one main stage card");

  const openingTagStart = html.lastIndexOf("<article", start);
  const openingTagEnd = html.indexOf(">", start);
  const closingTag = html.indexOf("</article>", openingTagEnd);
  assert.ok(openingTagStart >= 0 && openingTagEnd > start, "stage card tag must be complete");
  assert.ok(closingTag > openingTagEnd, "stage card must have a closing tag");

  return html.slice(openingTagStart, closingTag + "</article>".length);
}

test("05/07 SSR keeps the state header, evidence stage, and indicator inside one card", async () => {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);
  const html = await response.text();
  const stageCard = extractStageCard(html);

  const headerIndex = stageCard.indexOf('data-card-header="true"');
  const bodyIndex = stageCard.indexOf('data-card-body="true"');
  const footerIndex = stageCard.indexOf('data-card-footer="true"');

  assert.ok(headerIndex >= 0, "card header must be inside the main card");
  assert.ok(bodyIndex > headerIndex, "product stage must follow the card header");
  assert.ok(footerIndex > bodyIndex, "indicator must follow the product stage");
  assert.ok(
    stageCard.indexOf("同一个网关，不该连接两次") > headerIndex,
    "state title must belong to the card header",
  );
  assert.ok(
    stageCard.indexOf("产品证据舞台") > bodyIndex,
    "product stage accessibility boundary must belong to the card body",
  );
});

test("05/07 state indicator renders three stable slots inside the card footer", async () => {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);
  const html = await response.text();
  const stageCard = extractStageCard(html);

  const footerIndex = stageCard.indexOf('data-card-footer="true"');
  const groupIndex = stageCard.indexOf('aria-label="三个任务状态"', footerIndex);
  assert.ok(groupIndex > footerIndex, "indicator group must live inside the card footer");

  const slots = [0, 1, 2].map((index) => {
    const match = new RegExp(`<span[^>]*data-task-indicator="${index}"[^>]*>`).exec(stageCard);
    assert.ok(match, `indicator slot ${index} must always be rendered`);
    return {
      index,
      at: match.index,
      tag: match[0],
      cls: /class="([^"]*)"/.exec(match[0])?.[1] ?? "",
    };
  });

  const shape = (tag) => tag.replace(/data-task-indicator="\d"/, 'data-task-indicator="#"');
  const shapeWithState = (tag) => shape(tag).replace(/ aria-current="step"/, "");
  slots.forEach((slot, i) => {
    assert.ok(slot.cls.length > 0, `indicator slot ${slot.index} must carry the dot class`);
    assert.equal(slot.cls, slots[0].cls, "all three slots must share one stable dot style");
    assert.equal(shapeWithState(slot.tag), shapeWithState(slots[0].tag), `slot ${slot.index} must not render a per-state variant`);
    if (i > 0) assert.ok(slot.at > slots[i - 1].at, "slots must stay in a stable 01/02/03 order");

    const next = slots[i + 1]?.at ?? stageCard.indexOf("</footer>", groupIndex);
    const slice = stageCard.slice(slot.at, next).replace(/<!-- -->/g, "");
    assert.ok(
      slice.includes(`状态 0${slot.index + 1}`),
      `indicator slot ${slot.index} must keep its own accessibility label`,
    );
  });

  const activeMarkers = (stageCard.slice(footerIndex).match(/aria-current="step"/g) ?? []).length;
  assert.equal(
    activeMarkers,
    1,
    "exactly one slot carries the active marker; the indicator group itself is never re-created per state",
  );
});
