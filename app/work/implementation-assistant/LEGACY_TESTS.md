旧版 7／8 章与锁定滚动场景的测试已改名为 `*.legacy.mjs`，保留其历史依据及与旧组件的对应关系，不再作为新版路由的验收断言。

当前路由使用 2026-10-22 的 14 章可见 Figma。内容与素材检查：`node --test app/work/implementation-assistant/case-study.test.mjs`；浏览器视觉、响应式与动态检查：`node scripts/preview-qa/with-chrome.mjs scripts/preview-qa/verify-implementation-assistant-current.mjs`。浏览器证据不能由旧模型单测替代。
