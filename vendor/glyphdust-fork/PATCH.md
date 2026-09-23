
## 补丁 3（2026-09-19）：多行标题的行盒基线对齐

`buildGlyphFromDOM` 画 canvas 字形时，首行基线原为 `lineTop + fontBoundingBoxAscent`。
这隐含假设 `line-height = ascent + descent`（本站 PuHuiTi 实测 1.40 em，旧居中姓名
`.text` 正是 1.4，所以一直没暴露）。Hero 改为三行堆叠标题（line-height 0.98）后，
DOM 行盒按半行距公式排版：`基线 = 行盒顶 + (lineHeight − asc − desc)/2 + asc`，
canvas 字形相对 DOM 文字整体偏低 `(lineHeight − asc − desc)/2`（0.98 行高下 ≈ 0.21 em）。

补丁改为按浏览器行盒公式计算基线；`lineHeight = asc + desc` 时退化为旧值，
对现有 `line-height: 1.4` 的 `.sectionTitleDisplay` 是 no-op，向后兼容。

配套：Hero 采样文字由 `home-sections.ts` 的 `dustTitle`（显式 `\n` 断行）提供——
库按元素块宽做 word-wrap，与 DOM 的 block 断行不是一套逻辑，多行标题必须显式给行。
验证：转场中途连拍粒子精确组成三行字形并与 DOM 重合
（`artifacts/home-hero-frames/morph-a-hero-glyphs.png`）。


## 改动点（三处）

### 1. per-particle 字符序号（每 4 个关键帧打包进 1 个 vec4 属性）

- 采样后做一次后处理 `buildCharBuffers(keyframes, buffers, count, font)`：
  - `text` 关键帧：把粒子在该字形墨迹 x 范围内的位置，按**字符 advance 边界**（canvas `measureText`
    逐字前缀宽度，字体取自 `domSelector` 元素的 computed font 或 keyframe 的 `font`）分桶，
    得到 0..1 的字符序号（0 = 第一个字，1 = 最后一个字）。同一字形共用的 buffer 只算一次。
  - `scatter` / `shape` 关键帧：沿用 `scatterGlyphRefIndex()` 指到的参考字形（**先看下一个字形**），
    因此"飞散 → 聚合成下一个词"那一段也按**目标字符**排序，而不是沿用上一段。
  - **属性数量**：顶点属性有硬上限（WebGL2 只保证 16 个）。上游本来就是"每关键帧一个 `aPos{k}` vec3"，
    8 个关键帧的标题时间线 = 8 个 `aPos` + `position` + `aSeed` + `aAccent` = 11 个；字符序号若也逐帧一个
    float 属性就会到 19 个 → `THREE.WebGLProgram: Too many attributes (aChar5)`，**program 编译失败、粒子整个不画**
    （2026-09-15 在本机 headless Chrome + SwiftShader 上实测到）。
    因此字符序号按 `GLYPH_CHAR_CHUNK = 4` 打包：`aChar0` 装关键帧 0–3 的 `.xyzw`，`aChar1` 装 4–7，
    8 个关键帧只花 2 个属性（总数 13 ≤ 16）。
  - `GlyphPoints` 里把这些 buffer 交织进 `vec4` 再挂到 geometry 上；
    `buildVertexShader()` 里生成 `attribute vec4 aChar{k}` 声明，`charAt(sp)` 用 `glyphCharComponent(i)`
    取到对应分量（`aChar0.x` … `aChar1.w`），与 `posAt` 同一套 mix 连锁。
- **字符序走「区间内局部相位」，不用上游的整条时间线偏移**（`abs(uCharOrder) > 0.001` 时分支）：
  上游的逐粒子错峰是 `stageP = (uStage - offset·w)/(1-w)`、`w = uStagger·(1-collapse)`——那里的 `uStagger`
  是**整条时间线**上的偏移比例（库预设 0.04–0.12），粒子会被拖进上一站/下一站，所以值一小逐字就看不见、
  值一大序列就乱。fork 改成按区间算（`tDep` = 区间起点、`tNext` = 区间终点）：

  ```glsl
  float segLen = max(tNext - tDep, 0.001);
  float localP = clamp((uStage - tDep) / segLen, 0.0, 1.0);
  float travel = clamp(uStagger, 0.0, 0.9);
  float delay  = offset * travel;
  float shifted = clamp((localP - delay) / max(1.0 - travel, 0.05), 0.0, 1.0);
  stageP = tDep + shifted * segLen;
  ```

  含义：每个粒子按自己的字符序号推迟 `offset·travel` 个区间长度出发，**行程统一是 `1-travel` 个区间**——
  第一个字在区间进度 `1-travel` 处到位、最后一个字在 `1` 处到位、所有粒子速度一致，而且错峰永远留在当前
  区间里（区间末端精确到达，所以 DOM 对齐/`resolveToDom` 的像素一致不受影响）。首页取 `travel = 0.65`。
  `charOrder: 0` 时仍走原来的分支，逐字节与上游一致。
- 顶点着色器里把原来的
  `float offset = mix(aSeed, waveOff, uWave);`
  换成
  ```glsl
  float charRaw = charAt(tDep);
  float charOff = uCharOrder < 0.0 ? 1.0 - charRaw : charRaw;
  float charJitter = clamp(charOff + (aSeed - 0.5) * 0.06, 0.0, 1.0);
  float offset = mix(mix(aSeed, waveOff, uWave), charJitter, abs(uCharOrder));
  ```
  保留 ±0.03 的 seed 抖动，避免同一个字里的粒子完全同步。

### 2. `staggerCollapse` 改为按当前区间（仅在 `charOrder != 0` 时生效）

**这是让第 1 点在"整条时间线偏移"写法下可见的必要条件，也是上游的一个坑**；不过上面的局部相位分支
已经绕开了 `w`，所以这条现在只是让 `uStaggerCollapse` 在 `charOrder != 0` 时不再被第一个关键帧锁死
（`charOrder: 0` 时保持上游行为不变）。

原实现每个关键帧都算 `smooth(c - width, c, s)` 再取 `Math.max`：

```js
const width = Math.max(0.02, (c - prev) * 0.5);
staggerCollapse = Math.max(staggerCollapse, smooth(c - width, c, s));
```

第一个关键帧到达之后，它那一项恒为 1 ⇒ `w = uStagger * (1 - staggerCollapse) = 0` ⇒
`stageP = uStage`，**所有逐粒子偏移（`aSeed` / `wave` / 新增的字符序）在第一个 stop 之后全部失效**。
实测（3 个 stop 的时间线，`stagger: 0.9`）：

| 进度 | 原版 collapse | 原版 w | fork collapse（charOrder=1） | fork w |
|---|---|---|---|---|
| 0.33 | 1.000 | 0.000 | 0.000 | 0.900 |
| 0.36 | 1.000 | 0.000 | 0.000 | 0.900 |
| 0.39 | 1.000 | 0.000 | 0.500 | 0.450 |

fork 里只在"当前所处区间"内取收拢值（到达点仍然精确收敛），并且**只在 `charOrder != 0` 时启用**，
所以 `charOrder: 0`（原版行为）逐字节保持一致。

## 验证方式与结果

验证分两步。第一步是临时验证页（文字用 `A B C D` 等距排布，同一字形同一进度并排渲染
`charOrder 0` 与 `1`，位置 `artifacts/home/fork-lab.png`）；该页面在接入正式首页后已删除
（`app/glyphdust-fork-lab/` 不存在了）。第二步是正式首页本身：`app/home/GlyphDustMorph.tsx`
用 `charOrder: 1 + stagger: 0.12` 跑三段真实标题，取证见 `docs/HOME_DESIGN_RULES.md` §7.3 / §9。

实测（1440 × 1000，`stagger: 0.9`，溶解段 0.30–0.42）：

- `charOrder 0`：整词同时变淡，字形带内墨迹 22 571（p=0.36），ASCII 上是一片均匀噪点，看不出字母。
- `charOrder 1`：左侧字母先走、右侧字母仍成形；同一位置墨迹 10 756（p=0.36），是前者的 48%，
  ASCII 上能直接看出左边空白、右边保留字母笔画。
- 对照图：`artifacts/home/fork-charorder-stock-p036.png` vs `artifacts/home/fork-charorder-char1-p036.png`。

## 接入方式（已确定）

首页只在这一个组件里用 fork：`import { GlyphDust } from "…/vendor/glyphdust-fork/dist/index.js"`（走文件路径，
不经过包的 exports），站点其它地方继续用 npm 的 `glyphdust`，互不影响。API 与上游兼容，新增字段可选。

注意：`charOrder` 让 `stagger` 在每个区间都真正生效（见第 2 点），所以它的量级要按
"整条时间线上的时间偏移"来选——首页取 0.12，`docs/HOME_DESIGN_RULES.md` §7.3 有实测原因。
