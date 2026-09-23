import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE2 from 'three';
import { jsx, Fragment, jsxs } from 'react/jsx-runtime';

// src/GlyphDust.tsx

// src/dom-overlay.ts
var ALPHA_THRESHOLD = 128;
function viewSizeAtZ0(viewportW, viewportH, fovDeg, cameraZ) {
  const worldH = 2 * Math.tan(fovDeg * Math.PI / 360) * cameraZ;
  const worldW = worldH * (viewportW / viewportH);
  return { worldH, worldW };
}
function buildGlyphFromDOM(count, lines, opts) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }
  const el = document.querySelector(opts.selector);
  if (!el) return null;
  const elRect = el.getBoundingClientRect();
  if (elRect.width < 2 || elRect.height < 2) return null;
  const random = opts.random ?? Math.random;
  const cs = window.getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize) || 64;
  let lineHeight = parseFloat(cs.lineHeight);
  if (!isFinite(lineHeight) || lineHeight <= 0) lineHeight = fontSize * 1.1;
  const letterSpacing = parseFloat(cs.letterSpacing) || 0;
  const fontWeight = cs.fontWeight || "600";
  const fontFamily = cs.fontFamily || "sans-serif";
  let rect = elRect;
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tr = range.getBoundingClientRect();
    if (tr.width >= 2 && tr.height >= 2) rect = tr;
  } catch {
  }
  const contentLeft = rect.left;
  const contentTop = rect.top;
  const pad = Math.max(4, fontSize * 0.08);
  const textBoxW = rect.width;
  const cwCss = rect.width + pad * 2;
  const chCss = rect.height + pad * 2;
  const res = opts.resolution ?? 2;
  const cw = Math.max(2, Math.ceil(cwCss * res));
  const ch = Math.max(2, Math.ceil(chCss * res));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, cw, ch);
  ctx.scale(res, res);
  ctx.translate(pad, pad);
  ctx.fillStyle = "#000";
  const dir = cs.direction === "rtl" ? "rtl" : "ltr";
  const ta = cs.textAlign;
  const align = ta === "center" ? "center" : ta === "right" || ta === "end" && dir === "ltr" || ta === "start" && dir === "rtl" ? "right" : "left";
  ctx.textAlign = align;
  const lineX = align === "center" ? textBoxW / 2 : align === "right" ? textBoxW : 0;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  if ("letterSpacing" in ctx) {
    try {
      ctx.letterSpacing = `${letterSpacing}px`;
    } catch {
    }
  }
  const wrapWidth = Math.max(1, elRect.width);
  const wrappedLines = [];
  for (const line of lines) {
    if (ctx.measureText(line).width <= wrapWidth) {
      wrappedLines.push(line);
      continue;
    }
    const words = line.split(" ");
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (cur && ctx.measureText(test).width > wrapWidth) {
        wrappedLines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) wrappedLines.push(cur);
  }
  const fm = ctx.measureText(wrappedLines[0] ?? "M");
  const fbAsc = fm.fontBoundingBoxAscent;
  const fbDesc = fm.fontBoundingBoxDescent;
  const useMetrics = Number.isFinite(fbAsc) && Number.isFinite(fbDesc);
  const fallbackAscent = fontSize * (opts.ascentRatio ?? 0.82);
  wrappedLines.forEach((line, i) => {
    const lineTop = i * lineHeight;
    // 浏览器行盒：半行距 = (lineHeight - (ascent + descent)) / 2，基线 = 行盒顶 + 半行距 + ascent。
    // 只有 lineHeight 恰好等于 ascent + descent 时才等于 fbAsc；多行标题行高 ≠ 1.4 时
    // 必须按半行距公式算，否则粒子字形与 DOM 文字整体错位 (lineHeight - asc - desc) / 2。
    const baseline = useMetrics
      ? lineTop + (lineHeight - fbAsc - fbDesc) / 2 + fbAsc
      : lineTop + fallbackAscent;
    ctx.fillText(line, lineX, baseline);
  });
  const { data } = ctx.getImageData(0, 0, cw, ch);
  const pts = [];
  const step = opts.step ?? 2;
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4 + 3] > ALPHA_THRESHOLD) pts.push(x, y);
    }
  }
  const filled = pts.length / 2;
  if (filled === 0) return null;
  const vpW = opts.viewportW ?? window.innerWidth;
  const vpH = opts.viewportH ?? window.innerHeight;
  const { worldW, worldH } = viewSizeAtZ0(vpW, vpH, opts.fovDeg, opts.cameraZ);
  const pxToWorld = worldW / vpW;
  const thickness = opts.thickness ?? 0.14;
  const order = new Uint32Array(filled);
  for (let i = 0; i < filled; i++) order[i] = i;
  for (let i = filled - 1; i > 0; i--) {
    const j = random() * (i + 1) | 0;
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const idx = order[i % filled];
    const cx = pts[idx * 2] / res - pad;
    const cy = pts[idx * 2 + 1] / res - pad;
    const sx = contentLeft + cx;
    const sy = contentTop + cy;
    const wx = (sx / vpW - 0.5) * worldW;
    const wy = -(sy / vpH - 0.5) * worldH;
    out[i * 3] = wx + (random() - 0.5) * pxToWorld * step;
    out[i * 3 + 1] = wy + (random() - 0.5) * pxToWorld * step;
    out[i * 3 + 2] = (random() - 0.5) * thickness;
  }
  return out;
}
function sampleAnchorCenterWorld(opts) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }
  const el = document.querySelector(opts.selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const vpW = opts.viewportW ?? window.innerWidth;
  const vpH = opts.viewportH ?? window.innerHeight;
  const { worldW, worldH } = viewSizeAtZ0(vpW, vpH, opts.fovDeg, opts.cameraZ);
  const sx = rect.left + rect.width / 2;
  const sy = rect.top + rect.height / 2;
  return {
    cx: (sx / vpW - 0.5) * worldW,
    cy: -(sy / vpH - 0.5) * worldH
  };
}
function alignGlyphOverlay(el, targets, opts) {
  if (typeof document === "undefined") return false;
  const rect = computeScreenRect(
    targets,
    opts.viewportW,
    opts.viewportH,
    opts.visibleWorldW
  );
  if (!rect || rect.width < 2 || rect.height < 2) return false;
  const fontMatch = opts.font.match(/^\s*(\d+)\s+[\d.]+px\s+(.+)$/);
  const fontWeight = fontMatch?.[1] ?? "900";
  const fontFamily = fontMatch?.[2] ?? "sans-serif";
  const text = opts.text;
  const ctx = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true
  });
  let positioned = false;
  if (ctx && text) {
    const baseSize = 200;
    ctx.font = `${fontWeight} ${baseSize}px ${fontFamily}`;
    const advBase = ctx.measureText(text).width;
    const pad = Math.ceil(baseSize * 0.6);
    const cw = Math.ceil(advBase + pad * 2);
    const ch = Math.ceil(baseSize * 1.8);
    const oc = document.createElement("canvas");
    oc.width = cw;
    oc.height = ch;
    const octx = oc.getContext("2d", { willReadFrequently: true });
    if (octx && cw > 0 && ch > 0) {
      const drawX = pad;
      const drawY = Math.round(ch * 0.72);
      octx.font = `${fontWeight} ${baseSize}px ${fontFamily}`;
      octx.textAlign = "left";
      octx.textBaseline = "alphabetic";
      octx.fillStyle = "#000";
      octx.fillText(text, drawX, drawY);
      const data = octx.getImageData(0, 0, cw, ch).data;
      let minX = cw;
      let maxX = 0;
      let minY = ch;
      let maxY = 0;
      let found = 0;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (data[(y * cw + x) * 4 + 3] > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found++;
          }
        }
      }
      if (found > 0 && maxX > minX) {
        const fontSize = baseSize * (rect.width / (maxX - minX));
        const scale = fontSize / baseSize;
        const inkCenterXFromStart = ((minX + maxX) / 2 - drawX) * scale;
        const inkCenterYFromBaseline = ((minY + maxY) / 2 - drawY) * scale;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const fm = ctx.measureText(text);
        const leading = fontSize - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent);
        const baselineFromTop = leading / 2 + fm.fontBoundingBoxAscent;
        const targetCx = rect.left + rect.width / 2;
        const targetCy = rect.top + rect.height / 2;
        el.style.display = "block";
        el.style.textAlign = "left";
        el.style.whiteSpace = "nowrap";
        el.style.width = "auto";
        el.style.height = "auto";
        el.style.fontFamily = fontFamily;
        el.style.fontWeight = fontWeight;
        el.style.fontSize = `${fontSize}px`;
        el.style.left = `${targetCx - inkCenterXFromStart}px`;
        el.style.top = `${targetCy - inkCenterYFromBaseline - baselineFromTop}px`;
        positioned = true;
      }
    }
  }
  if (!positioned) {
    const measureSize = 100;
    let fontSize = rect.height * 0.92;
    if (ctx && text) {
      ctx.font = `${fontWeight} ${measureSize}px ${fontFamily}`;
      const mw = ctx.measureText(text).width;
      if (mw > 0) fontSize = measureSize * (rect.width / mw);
    }
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.fontFamily = fontFamily;
    el.style.fontWeight = fontWeight;
    el.style.fontSize = `${fontSize}px`;
  }
  return true;
}
function computeScreenRect(targets, viewportW, viewportH, visibleWorldW) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < targets.length; i += 3) {
    const x = targets[i];
    const y = targets[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!isFinite(minX)) return null;
  const worldW = visibleWorldW;
  const worldH = visibleWorldW * (viewportH / viewportW);
  const toScreenX = (wx) => (wx / worldW + 0.5) * viewportW;
  const toScreenY = (wy) => (0.5 - wy / worldH) * viewportH;
  const left = toScreenX(minX);
  const right = toScreenX(maxX);
  const top = toScreenY(maxY);
  const bottom = toScreenY(minY);
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2
  };
}

// src/shaders.ts
var GLYPH_POSITION_ATTRIBUTE_PREFIX = "aPos";
function glyphPositionAttribute(index) {
  return `${GLYPH_POSITION_ATTRIBUTE_PREFIX}${index}`;
}
var GLYPH_CHAR_ATTRIBUTE_PREFIX = "aChar";
// 【fork】顶点属性个数有上限（WebGL2 只保证 16 个，SwiftShader / 部分移动 GPU 更少），
// 所以字符序号不做成「每个关键帧一个 float 属性」，而是每 4 个关键帧打包进一个 vec4。
// 8 个关键帧的标题时间线因此只用 2 个属性（逐帧一属性的写法会到 8 个，直接把
// program 撑到编译失败：Too many attributes）。
var GLYPH_CHAR_CHUNK = 4;
function glyphCharAttribute(index) {
  return `${GLYPH_CHAR_ATTRIBUTE_PREFIX}${Math.floor(index / GLYPH_CHAR_CHUNK)}`;
}
function glyphCharComponent(index) {
  return `${glyphCharAttribute(index)}.${"xyzw"[index % GLYPH_CHAR_CHUNK]}`;
}
function glyphCharChunkCount(keyframeCount) {
  return Math.max(1, Math.ceil(keyframeCount / GLYPH_CHAR_CHUNK));
}
function buildVertexShader(keyframeCount) {
  if (!Number.isInteger(keyframeCount) || keyframeCount < 1) {
    throw new Error(
      `buildVertexShader: keyframeCount must be an integer >= 1 (got ${keyframeCount})`
    );
  }
  const attributeDecls = Array.from(
    { length: keyframeCount },
    (_, i) => `  attribute vec3 ${glyphPositionAttribute(i)};`
  ).join("\n");
  const mixChain = Array.from(
    { length: keyframeCount - 1 },
    (_, k) => `    p = mix(p, ${glyphPositionAttribute(k + 1)}, smoothRange(uTimes[${k}], uTimes[${k + 1}], sp));`
  ).join("\n");
  const charAttributeDecls = Array.from(
    { length: glyphCharChunkCount(keyframeCount) },
    (_, k) => `  attribute vec4 ${glyphCharAttribute(k * GLYPH_CHAR_CHUNK)};`
  ).join("\n");
  const charChain = Array.from(
    { length: keyframeCount - 1 },
    (_, k) => `    c = mix(c, ${glyphCharComponent(k + 1)}, smoothRange(uTimes[${k}], uTimes[${k + 1}], sp));`
  ).join("\n");
  const departChain = Array.from(
    { length: keyframeCount - 1 },
    (_, k) => `    tDep = mix(tDep, uTimes[${k + 1}], step(uTimes[${k + 1}], uStage));`
  ).join("\n");
  // 【fork】当前区间的"终点"时刻 = 比 uStage 大的最小关键帧时刻（最后一段则为 1）。
  // charOrder 用它把错峰限制在当前区间内（见下面的 stageP 分支）。
  const nextChain = Array.from(
    { length: keyframeCount - 1 },
    (_, k) => `    tNext = min(tNext, uStage < uTimes[${k + 1}] ? uTimes[${k + 1}] : 1.0);`
  ).join("\n");
  return (
    /* glsl */
    `
  uniform float uTime;
  uniform float uStage;
  uniform float uTimes[${keyframeCount}];
  uniform float uForm;
  uniform float uSettle;
  uniform float uBurst;
  uniform float uSwap;
  uniform float uResolve;
  uniform float uReduced;
  uniform float uSize;
  uniform float uSizeScale;
  uniform float uDrift;
  uniform float uStagger;
  uniform float uStaggerCollapse;
  uniform float uCharOrder;
  uniform float uCurl;
  uniform float uSmoother;
  uniform float uPixelRatio;
  uniform float uAlphaVar;
  uniform float uDof;
  uniform float uFocus;
  uniform float uWave;

${attributeDecls}
${charAttributeDecls}
attribute float aSeed;
  attribute float aAccent;

  varying float vSeed;
  varying float vAccent;
  varying float vDepth;
  varying float vForm;
  varying float vAlpha;
  varying float vSettle;
  varying float vAlphaVar;
  varying float vDof;

  // smoothstep(C1) \u3068 Perlin 2002 \u306E smootherstep(C2) \u3092 uSmoother \u3067\u5207\u66FF\uFF08\u6BD4\u8F03\u7528\uFF09\u3002
  // smootherstep \u306F\u7AEF\u70B9\u3067 1 \u6B21\u30FB2 \u6B21\u5FAE\u5206\u304C 0\uFF1D\u52A0\u901F\u5EA6\u304C\u6ED1\u3089\u304B\uFF08\u6700\u5C0F\u8E8D\u5EA6\u30FB\u4EBA\u306E\u624B\u306E\u52D5\u304D\uFF09\u3002
  // \u65E2\u5B9A uSmoother=1\uFF08smootherstep\uFF09\u30020 \u3067\u65E7 smoothstep\uFF08C1\u30FB\u5883\u754C\u3067\u52A0\u901F\u5EA6\u30B8\u30E3\u30F3\u30D7\uFF09\u3002
  float smoothRange(float a, float b, float x) {
    float t = clamp((x - a) / (b - a), 0.0, 1.0);
    float s3 = t * t * (3.0 - 2.0 * t);
    float s5 = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    return mix(s3, s5, uSmoother);
  }

  // --- Simplex 3D noise\uFF08Ashima Arts / Stefan Gustavson, MIT/public domain\uFF09 ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
  // 3 \u3064\u306E\u72EC\u7ACB\u30DD\u30C6\u30F3\u30B7\u30E3\u30EB\uFF08\u30AA\u30D5\u30BB\u30C3\u30C8 seed\uFF09\u304B\u3089\u6210\u308B\u30D9\u30AF\u30C8\u30EB\u5834\u3002
  vec3 snoiseVec3(vec3 x) {
    return vec3(
      snoise(x),
      snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
      snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
    );
  }
  // Curl noise\uFF08Bridson 2007\uFF09\u3002\u2207\xD7\uFF08\u30D9\u30AF\u30C8\u30EB\u30DD\u30C6\u30F3\u30B7\u30E3\u30EB\uFF09\u3067\u767A\u6563\u30BC\u30ED\uFF1D\u6D41\u4F53\u7684\u306A\u6F02\u3044\u3002
  // \u8EF8\u72EC\u7ACB sin/cos \u3068\u9055\u3044\u300C\u6E67\u304D\u51FA\u3057/\u5438\u3044\u8FBC\u307F\u300D\u304C\u7121\u304F\u3001\u6E26\u3092\u5DFB\u304D\u306A\u304C\u3089\u81EA\u7136\u306B\u6D41\u308C\u308B\u3002
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 px0 = snoiseVec3(p - dx), px1 = snoiseVec3(p + dx);
    vec3 py0 = snoiseVec3(p - dy), py1 = snoiseVec3(p + dy);
    vec3 pz0 = snoiseVec3(p - dz), pz1 = snoiseVec3(p + dz);
    float x = (py1.z - py0.z) - (pz1.y - pz0.y);
    float y = (pz1.x - pz0.x) - (px1.z - px0.z);
    float z = (px1.y - px0.y) - (py1.x - py0.x);
    return vec3(x, y, z) / (2.0 * e);
  }

  // \u9032\u6357 sp\uFF080..1\uFF09\u306B\u5BFE\u3059\u308B\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u88DC\u9593\u4F4D\u7F6E\u3002mix \u9023\u9396\u306F\u30D3\u30EB\u30C9\u6642\u306B\u30A2\u30F3\u30ED\u30FC\u30EB\u3002
  vec3 posAt(float sp) {
    vec3 p = ${glyphPositionAttribute(0)};
${mixChain}
    return p;
  }

  // 【fork】各粒子在每个关键帧里的"字符序号"（0..1，0 = 第一个字，1 = 最后一个字）。
  // 与 posAt 同一套 mix 连锁；在区间的出发时刻求值即为该区间字符顺序的依据。
 float charAt(float sp) {
    float c = ${glyphCharComponent(0)};
${charChain}
    return c;
  }

  void main() {
    vSeed = aSeed;
    vAccent = aAccent;
    vForm = uForm;

    // --- per-particle stagger: seed \u3067\u5404\u7C92\u5B50\u306E\u5230\u9054\u30BF\u30A4\u30DF\u30F3\u30B0\u3092\u5206\u6563 ---
    // \u65E9\u3044\u7C92/\u9045\u3044\u7C92\u304C\u751F\u307E\u308C\u300C\u4E00\u6589\u79FB\u52D5\u300D\u304C\u300C\u7FA4\u308C\u304C\u96C6\u307E\u308B\u300D\u6CE2\u52D5\u611F\u306B\u306A\u308B\u3002
    // \u5404\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u5230\u9054\u70B9\u306E\u76F4\u524D\u3067\u7A93 w \u3092 0 \u306B\u7573\u307F\u3001\u5168\u7C92\u5B50\u3092\u6B63\u78BA\u306B\u30BF\u30FC\u30B2\u30C3\u30C8\u3078
    // \u53CE\u675F\u3055\u305B\u308B\uFF08DOM \u6574\u5217\u30FBresolve \u306E\u30D4\u30AF\u30BB\u30EB\u4E00\u81F4\u3092\u58CA\u3055\u306A\u3044\u305F\u3081\uFF09\u3002
    //
    // \u30102026-07-08 \u4FEE\u6B63\u3011\u65E7\u5B9F\u88C5\u306F uStage \u306E\u56FA\u5B9A\u7BC4\u56F2 0.55\u21920.85 \u3067\u3060\u3051\u7573\u3093\u3067\u3044\u305F\u3002
    // \u3053\u308C\u306F\u5143\u3005\u300C2\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u306E\u307F\uFF08LINNO\u2192\u30BF\u30B0\u30E9\u30A4\u30F3\uFF09\u300D\u306E GlyphHero \u7528\u306B
    // \u6C7A\u3081\u6253\u3061\u3055\u308C\u305F\u5024\u3067\u3001\u305D\u306E\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u306E\u552F\u4E00\u306E\u53CE\u675F\u70B9\u304C\u305F\u307E\u305F\u307E\u3053\u306E\u7BC4\u56F2\u306B
    // \u6765\u308B\u3088\u3046\u8ABF\u6574\u3055\u308C\u3066\u3044\u305F\u3002\u99C5\u3092 N \u500B\u3064\u306A\u3050\u73FE\u5728\u306E\u69CB\u6210\uFF08GlyphStageEngine\uFF09\u3067\u306F
    // \u307B\u3068\u3093\u3069\u306E\u99C5\u306E\u53CE\u675F\u70B9\u304C\u3053\u306E\u56FA\u5B9A\u7BC4\u56F2\u306E\u5916\u306B\u3042\u308A\u3001stagger \u304C\u7573\u307E\u308C\u306A\u3044\u307E\u307E
    // \u53CE\u675F\u3059\u308B\u305F\u3081\u3001\u4ED6\u306E\u7C92\u5B50\u304C\u6B62\u307E\u3063\u305F\u5F8C\u3082\u4E00\u90E8\u306E\u7C92\u5B50\u3060\u3051\u63FA\u308C\u306A\u304C\u3089\u9045\u308C\u3066
    // \u5230\u7740\u3057\u7D9A\u3051\u308B\u300C\u53CE\u675F\u306E\u6700\u5F8C\u304C\u7DE9\u3044\u300D\u4F53\u611F\u306B\u306A\u3063\u3066\u3044\u305F\uFF08\u51DC\u3055\u3093 2026-07-08
    // \u300C\u53CE\u675F\u306E\u6700\u5F8C\u3092\u3082\u3063\u3068\u30B9\u30E0\u30FC\u30BA\u306B\u300D\uFF09\u3002CPU \u5074\uFF08GlyphPoints.tsx\uFF09\u3067
    // \u300C\u73FE\u5728\u5730\u304B\u3089\u6700\u3082\u8FD1\u3044\u4ECA\u5F8C\u306E\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u5230\u9054\u70B9\u300D\u307E\u3067\u306E\u8DDD\u96E2\u3092\u6BCE\u30D5\u30EC\u30FC\u30E0
    // \u8A08\u7B97\u3057 uStaggerCollapse \u3068\u3057\u3066\u6E21\u3059\u3002\u56FA\u5B9A\u7BC4\u56F2\u3067\u306F\u306A\u304F\u5168\u3066\u306E\u5230\u9054\u70B9\u3067
    // \u540C\u3058\u3088\u3046\u306B\u7573\u307E\u308C\u308B\u3002
    // \u30102026-07-11 \u6EB6\u89E3\u6CE2\uFF08\u518D\u5C0E\u5165\u30FBopt-in\uFF09: \u63D0\u6848\u8005 Claude\u3001\u4F9D\u983C\u8005 \u51DC\u3055\u3093
    // \u300C\u3082\u3046\u3061\u3087\u3063\u3068\u30C6\u30AD\u30B9\u30C8\u304C\u7C92\u5B50\u306B\u3070\u3089\u3051\u3066\u3044\u304F\u3088\u3046\u306B\u300D\u3011
    // \u65E7\u6765\u306E offset = aSeed \u306F\u7C92\u5B50\u3054\u3068\u306B\u72EC\u7ACB\u306A\u30E9\u30F3\u30C0\u30E0\uFF1D\u300C\u4E00\u69D8\u306B\u307B\u3069\u3051\u308B\u300D\u3002
    // \u540D\u4F5C\uFF08Codrops Gommage \u7B49\uFF09\u306F\u30CE\u30A4\u30BA\u30DE\u30B9\u30AF\u3067\u300C\u8FD1\u304F\u306E\u7C92\u304C\u9023\u308C\u7ACB\u3063\u3066\u767A\u3064\u300D
    // \u6591\uFF08\u3080\u3089\uFF09\u306E\u9032\u884C\u3092\u4F5C\u308B\u3002\u9759\u7684\u306A simplex \u30CE\u30A4\u30BA\u5834\u3092\u5F15\u304D\u3001\u305D\u306E\u5024\u3092\u51FA\u767A\u9806\u306B
    // \u3059\u308B\uFF1D\u98A8\u304C\u64AB\u3067\u308B\u3088\u3046\u306B\u584A\u5358\u4F4D\u3067\u6EB6\u3051\u30FB\u96C6\u307E\u308B\u3002aSeed \u3092\u6DF7\u305C\u3066\u584A\u306E\u4E2D\u306B\u3082
    // \u500B\u4F53\u5DEE\u3092\u6B8B\u3059\u3002uWave=0 \u3067\u65E7\u6765\u306E\u72EC\u7ACB\u30E9\u30F3\u30C0\u30E0\u306B\u5B8C\u5168\u4E00\u81F4\uFF08\u65E2\u5B9A\u30FB\u6052\u7B49\uFF09\u3002
    //
    // \u3010\u521D\u7248\u306E\u6559\u8A13\uFF08e7ebca2\uFF09: \u30CE\u30A4\u30BA\u306E\u53C2\u7167\u70B9\u306F\u300C\u533A\u9593\u306E\u51FA\u767A\u99C5\u306E\u4F4D\u7F6E\u300D\u3067\u56FA\u5B9A\u3059\u308B\u3011
    // \u79FB\u52D5\u4E2D\u306E\u6982\u7565\u4F4D\u7F6E\u3067\u5834\u3092\u5F15\u304F\u3068\u98DB\u884C\u4E2D\u306B offset \u81EA\u4F53\u304C\u5909\u308F\u308A\u7D9A\u3051\u3001\u9032\u6357 stageP \u304C
    // \u63FA\u308C\u308B\uFF0F\u5C40\u6240\u7684\u306B\u9006\u884C\u3059\u308B\u975E\u5358\u8ABF\u306A\u52D5\u304D\u306B\u306A\u308B\uFF08\u300C\u30B9\u30E0\u30FC\u30BA\u3058\u3083\u306A\u3044\u300D\u306E\u771F\u56E0\u306E\u4E00\u3064\uFF09\u3002
    // \u51FA\u767A\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u6642\u523B tDep \u3067\u306E\u4F4D\u7F6E\uFF1D\u533A\u9593\u5185\u3067\u4E0D\u5909\u306E\u53C2\u7167\u70B9\u306B\u56FA\u5B9A\u3059\u308C\u3070\u3001
    // \u533A\u9593\u4E2D offset \u306F\u5B9A\u6570\uFF1D\u9032\u6357\u306F\u53B3\u5BC6\u306B\u5358\u8ABF\u3002\u533A\u9593\u5883\u754C\u3067\u306F staggerCollapse \u304C
    // \u7A93 w \u3092 0 \u306B\u7573\u3080\u305F\u3081\u3001\u53C2\u7167\u70B9\u306E\u5207\u66FF\u306B\u3088\u308B\u4E0D\u9023\u7D9A\u3082\u4F4D\u7F6E\u306B\u306F\u73FE\u308C\u306A\u3044\u3002
 float w = uStagger * (1.0 - uStaggerCollapse);
 float tDep = uTimes[0];
${departChain}
 float tNext = 1.0;
${nextChain}
 vec3 posDep = posAt(tDep);
    float wn = 0.5 + 0.5 * snoise(posDep * 0.85 + vec3(0.0, 0.0, 31.7));
    float waveOff = clamp(wn + (aSeed - 0.5) * 0.45, 0.0, 1.0);
    float charRaw = charAt(tDep);
    float charOff = uCharOrder < 0.0 ? 1.0 - charRaw : charRaw;
    float charAmt = abs(uCharOrder);
    float charJitter = clamp(charOff + (aSeed - 0.5) * 0.06, 0.0, 1.0);
    float offset = mix(mix(aSeed, waveOff, uWave), charJitter, charAmt);
 float stageP;
 if (abs(uCharOrder) > 0.001) {
   // 【fork】字符序 = 区间内的局部相位：每个粒子的出发时刻被自己的 offset
   // （offset 已是字符序号 0..1）推迟 offset·uStagger 个"区间长度"，而**每个人的
   // 行程长度相同**（都是 1-uStagger 个区间），于是：
   //   第一个字在 localP = 1-uStagger 处到位、最后一个字在 localP = 1 处到位，
   //   所有粒子速度一致，整体读起来就是"文字从左到右逐渐成形"。
   // 为什么不能沿用上游的整条时间线偏移（stageP = (uStage - offset·w)/(1-w)）：
   // 那个偏移是全局的，粒子会被拖到上一站/下一站去——想看清左→右逐字就得把
   // uStagger 压到 0.12 以下（那就几乎看不见了）。改成局部相位后，错峰只发生
   // 在当前区间内，uStagger 可以给到 0.65（首页当前取值）而序列不乱。
   float segLen = max(tNext - tDep, 0.001);
   float localP = clamp((uStage - tDep) / segLen, 0.0, 1.0);
   float travel = clamp(uStagger, 0.0, 0.9);
   float delay = offset * travel;
   float shifted = clamp((localP - delay) / max(1.0 - travel, 0.05), 0.0, 1.0);
   stageP = tDep + shifted * segLen;
 } else {
   stageP = clamp((uStage - offset * w) / max(1.0 - w, 0.001), 0.0, 1.0);
 }

    // --- \u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u9593\u306E\u4F4D\u7F6E\u88DC\u9593\uFF08\u96A3\u63A5\u30DA\u30A2\u306E mix \u9023\u9396\uFF09 ---
    vec3 pos = posAt(stageP);

    // \u9077\u79FB\u4E2D\uFF08\u98DB\u6563\u533A\u9593\uFF09\u306B\u5916\u5411\u304D\u30C9\u30EA\u30D5\u30C8\u3092\u8DB3\u3057\u3066\u30C0\u30A4\u30CA\u30DF\u30C3\u30AF\u306B\u3002
    // \u65B9\u5411\u306F\u539F\u70B9\u304B\u3089\u306E\u5916\u5411\u304D\uFF08\u7279\u5B9A\u30AD\u30FC\u30D5\u30EC\u30FC\u30E0\u306B\u4F9D\u5B58\u3057\u306A\u3044\u4E00\u822C\u5F62\uFF09\u3002
    float ph = aSeed * 6.2831;
    vec3 dir = normalize(pos + 0.0001);
    pos += dir * uBurst * (0.4 + aSeed * 0.6);

    // \u30A2\u30A4\u30C9\u30EB\u306E\u6F02\u3044\uFF08\u6574\u5217\u6642 settle / \u5B57\u5F62\u6642 form \u3067\u5F31\u3081\u308B\uFF09\u3002
    vSettle = uSettle;
    float drift = (1.0 - uReduced) * (1.0 - uSettle * 0.9) * (1.0 - uForm) * uDrift;
    // uCurl>0 \u3067 curl noise \u306E\u6D41\u4F53\u7684\u306A\u6F02\u3044\u30010 \u3067\u8EFD\u91CF\u306A\u8EF8\u72EC\u7ACB sin/cos\u3002
    // uCurl \u306F uniform \u306A\u306E\u3067\u5206\u5C90\u306F draw \u5168\u4F53\u3067\u4E00\u69D8\uFF1DGPU \u306E wave \u5206\u5C90\u30DA\u30CA\u30EB\u30C6\u30A3\u7121\u3057\u3002
    if (uCurl > 0.001) {
      // \u6D41\u308C\u5834\u306F\u300C\u7A7A\u9593\u5EA7\u6A19\u300D\u3067\u5F15\u304F\uFF08\u7C92\u5B50\u3054\u3068\u306B\u4F4D\u76F8 ph \u3092\u305A\u3089\u3055\u306A\u3044\uFF09\u3002
      // \u8FD1\u508D\u7C92\u5B50\u304C\u540C\u3058\u65B9\u5411\u3078\u6D41\u308C\u3066\u521D\u3081\u3066\u6D41\u4F53\u7684\u306B\u898B\u3048\u308B\u3002\u5EA7\u6A19\u3092\u64B9\u4E71\u3059\u308B\u3068
      // \u7C92\u5B50\u3054\u3068\u306B\u7121\u76F8\u95A2\u306A\u30E9\u30F3\u30C0\u30E0\u5909\u4F4D\u306B\u306A\u308A\u5168\u9762\u30CE\u30A4\u30BA\u306B\u5D29\u308C\u308B\u3002
      // \u632F\u5E45\u306F\u65E7 sin/cos \u30C9\u30EA\u30D5\u30C8\uFF08\xB10.06\uFF09\u3068\u540C\u7B49\u306B\u6291\u3048\u3001\u96F2\u3092\u6563\u3089\u3055\u306A\u3044\u3002
      vec3 flow = curlNoise(pos * 0.5 + vec3(0.0, 0.0, uTime * 0.06));
      pos += flow * 0.015 * drift * uCurl;
    } else {
      pos.x += sin(uTime * 0.35 + ph) * 0.06 * drift;
      pos.y += cos(uTime * 0.30 + ph * 1.7) * 0.06 * drift;
      pos.z += sin(uTime * 0.27 + ph * 2.3) * 0.06 * drift;
    }

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vec4 mvPosition = viewMatrix * world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // --- \u8CEA\u611F\u306E\u6DF1\u307F\uFF082026-07-11 \u54C1\u8CEA\u5411\u4E0A Phase 1\u3002\u63D0\u6848\u8005: Claude\u3001\u51DC\u3055\u3093\u627F\u8A8D\uFF09 ---
    // \u6574\u5217\u30FB\u5B57\u5F62\u6642\uFF08hold\uFF09\u306F\u4E21\u52B9\u679C\u3068\u3082 0 \u306B\u7573\u3080: DOM \u30D4\u30AF\u30BB\u30EB\u4E00\u81F4\u3068\u53EF\u8AAD\u6027\u306E
    // \u65E2\u5B58\u4FDD\u8A3C\uFF08settle/form \u307E\u308F\u308A\u306E\u4E00\u9023\u306E\u4FEE\u6B63\uFF09\u3092\u58CA\u3055\u306A\u3044\u305F\u3081\u306E\u5FC5\u9808\u6761\u4EF6\u3002
    float hold = max(uSettle, uForm);
    // \u7C92\u5B50\u3054\u3068\u306E\u900F\u660E\u5EA6\u3070\u3089\u3064\u304D\u3002\u30B5\u30A4\u30BA\u30FB\u304D\u3089\u3081\u304D\u3068\u76F8\u95A2\u3057\u306A\u3044\u3088\u3046 aSeed \u3092
    // \u30CF\u30C3\u30B7\u30E5\u3067\u8131\u76F8\u95A2\u3057\u3066\u304B\u3089\u4F7F\u3046\uFF08\u540C\u3058\u7C92\u304C\u5E38\u306B\u300C\u5927\u304D\u304F\u3066\u660E\u308B\u304F\u3066\u6FC3\u3044\u300D\u306B
    // \u306A\u3089\u306A\u3044\u3088\u3046\u306B\uFF09\u3002\u98DB\u6563\u4E2D\u306E\u307F\u6709\u52B9\u3067\u3001\u6D6E\u904A\u611F\u30FB\u5965\u884C\u304D\u611F\u3092\u4F5C\u308B\u3002
    float hashA = fract(aSeed * 43758.5453);
    vAlphaVar = mix(1.0, 0.45 + 0.55 * hashA, uAlphaVar * (1.0 - hold));
    // \u64EC\u4F3C\u88AB\u5199\u754C\u6DF1\u5EA6: \u30D5\u30A9\u30FC\u30AB\u30B9\u9762\uFF08\u30C6\u30AD\u30B9\u30C8\u306E z=0 \u5E73\u9762 = \u30AB\u30E1\u30E9\u8DDD\u96E2 uFocus\uFF09
    // \u304B\u3089\u96E2\u308C\u305F\u7C92\u307B\u3069\u30DC\u30B1\u308B\u3002\u6574\u5217\u3057\u305F\u6587\u5B57\u306F\u30D5\u30A9\u30FC\u30AB\u30B9\u9762\u4E0A\u306A\u306E\u3067\u5F71\u97FF\u30BC\u30ED\u3002
    vDof = clamp(abs(vDepth - uFocus) * 0.45, 0.0, 1.0) * uDof * (1.0 - hold);

    // --- \u900F\u660E\u5EA6: \u30B9\u30EF\u30C3\u30D7\u70B9\u307E\u3067\u4E0D\u53EF\u8996\u3001\u30B9\u30EF\u30C3\u30D7\u70B9\u3067\u5373\u30FB\u4E0D\u900F\u660E\uFF08\u30D5\u30A7\u30FC\u30C9\u7121\u3057\uFF09\u3002 ---
    // DOM \u898B\u51FA\u3057\u3068\u540C\u4F4D\u7F6E\u30FB\u540C\u30B5\u30A4\u30BA\u3067\u4E00\u81F4\u3057\u3066\u3044\u308B\u305F\u3081\u3001\u77AC\u6642\u306E\u5207\u66FF\u304C\u300C\u6587\u5B57\u2192\u7C92\u5B50\u300D\u306B\u898B\u3048\u308B\u3002
    // \u30D5\u30A3\u30CA\u30FC\u30EC(uResolve)\u3067\u7C92\u5B50\u3092\u7D20\u65E9\u304F\u6D88\u3057\u3001\u5B9F DOM \u6587\u5B57\u3078\u53D7\u3051\u6E21\u3059\u3002
    vAlpha = uSwap * (1.0 - uResolve);

    // \u70B9\u30B5\u30A4\u30BA\uFF08\u9060\u8FD1 + \u500B\u4F53\u5DEE\uFF09\u3002\u6574\u5217\u6642\u306F\u3084\u3084\u5747\u4E00\u30FB\u5C0F\u3055\u3081\u306B\u3057\u3066\u53EF\u8AAD\u6027\u3092\u4E0A\u3052\u308B\u3002
    //
    // \u30102026-07-08 \u53CE\u675F\u5F8C\u306B\u8584\u304F\u306A\u308B\u4E0D\u5177\u5408\u3092\u4FEE\u6B63\u3011\u7C92\u5B50\u304C\u300C\u7C97\u304F\u592A\u3044\u306B\u3058\u307F\u300D\u304B\u3089
    // \u300C\u7CBE\u5BC6\u306A\u6587\u5B57\u306E\u5F62\u300D\u3078\u53CE\u675F\u3059\u308B\u3068\u3001\u6587\u5B57\u306E\u30B9\u30C8\u30ED\u30FC\u30AF\u306F\u7D30\u304F\u306A\u308B\u305F\u3081\u3001\u540C\u3058
    // \u7C92\u5B50\u6570\u3067\u3082\u5857\u308A\u3064\u3076\u3059\u9762\u7A4D\uFF08\u898B\u305F\u76EE\u306E\u6FC3\u3055\uFF09\u304C\u81EA\u7136\u3068\u6E1B\u3063\u3066\u3044\u305F\u3002\u5B9F\u6587\u5B57\u3078\u306E
    // \u30AF\u30ED\u30B9\u30D5\u30A7\u30FC\u30C9\u304C\u59CB\u307E\u308B\u307E\u3067\u306E\u9593\u3001\u3053\u306E\u300C\u8584\u304F\u306A\u3063\u305F\u7CBE\u5BC6\u306A\u7C92\u5B50\u6587\u5B57\u300D\u304C
    // \u305D\u306E\u307E\u307E\u8868\u793A\u3055\u308C\u7D9A\u3051\u3001\u300C\u9ED2\u3044\u30D1\u30FC\u30C6\u30A3\u30AF\u30EB\u304C\u53CE\u675F\u3057\u305F\u5F8C\u306B\u767D\u304F\u306A\u3063\u3066\u9ED2\u306B
    // \u306A\u3063\u3066\u3044\u304F\u300D\u3088\u3046\u306B\u898B\u3048\u3066\u3044\u305F\uFF08\u51DC\u3055\u3093 2026-07-08 \u5B9F\u6A5F\u5831\u544A\u3002\u30D4\u30AF\u30BB\u30EB
    // \u5BC6\u5EA6\u306E\u5B9F\u6E2C\u3067\u53EF\u8996darkness\u6BD4\u304C0.365\u21920.268\u3078\u7D0427%\u4F4E\u4E0B\u3059\u308B\u3053\u3068\u3092\u78BA\u8A8D\u6E08\u307F\uFF09\u3002
    // \u6574\u5217\u6642\u306E\u7C92\u30B5\u30A4\u30BA\u4E0B\u9650\u3092\u5F15\u304D\u4E0A\u3052\u3001\u8584\u304F\u898B\u3048\u308B\u73FE\u8C61\u3092\u6253\u3061\u6D88\u3059\u3002
    //
    // \u30102026-07-08 \u30E2\u30D0\u30A4\u30EB\u5B9F\u6A5F\u3067\u30DC\u30B3\u30DC\u30B3\u306B\u898B\u3048\u308B\u4E0D\u5177\u5408\u3092\u53D7\u3051\u3066\u63A7\u3048\u3081\u306B\u4FEE\u6B63\u3011
    // uSize \u306F\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8\u9AD8\u3055\u3060\u3051\u3067\u6C7A\u307E\u308A\uFF08\u5B9F\u969B\u306E\u6587\u5B57\u30D5\u30A9\u30F3\u30C8\u30B5\u30A4\u30BA\u3092\u898B\u3066
    // \u3044\u306A\u3044\uFF09\u3001\u30E2\u30D0\u30A4\u30EB\u306F\u898B\u51FA\u3057\u30D5\u30A9\u30F3\u30C8\u304C\u5C0F\u3055\u304F\u7E2E\u3080\u4E00\u65B9 uSize \u306F\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u3068
    // \u5927\u5DEE\u306A\u3044\u5024\u306B\u306A\u308B\u3002\u305D\u306E\u305F\u3081\u4E0A\u8A18\u306E\u5E95\u4E0A\u3052\uFF080.72\u21921.55\uFF09\u3092\u30E2\u30D0\u30A4\u30EB\u306E\u5C0F\u3055\u3044
    // \u6587\u5B57\u306B\u9069\u7528\u3059\u308B\u3068\u3001\u7C92\u304C\u6587\u5B57\u306E\u30B9\u30C8\u30ED\u30FC\u30AF\u5E45\u306B\u5BFE\u3057\u3066\u76F8\u5BFE\u7684\u306B\u5927\u304D\u304F\u306A\u308A\u3059\u304E\u3001
    // \u7C92\u304C\u56E3\u5B50\u72B6\u306B\u6D6E\u3044\u3066\u898B\u3048\u305F\uFF08\u51DC\u3055\u3093 2026-07-08\u300C\u30E2\u30D0\u30A4\u30EB\u3067\u898B\u308B\u3068\u7C92\u5B50\u306E\u5BC6\u5EA6\u304C
    // \u9AD8\u3059\u304E\u3066\u30DC\u30B3\u30DC\u30B3\u300D\u5B9F\u6A5F\u5831\u544A\uFF09\u3002\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u3067\u306E\u8584\u307E\u308A\u5BFE\u7B56\u3068\u3001\u30E2\u30D0\u30A4\u30EB\u3067\u306E
    // \u7C92\u306E\u5927\u304D\u3055\u3068\u306E\u4E21\u7ACB\u3092\u512A\u5148\u3057\u3001\u5E95\u4E0A\u3052\u5E45\u3092\u63A7\u3048\u3081\uFF080.72\u21920.90\uFF09\u306B\u623B\u3059\u3002
    float sizeVar = mix(0.55 + aSeed * 0.9, 0.78 + aSeed * 0.35, uSettle);
    // \u5B57\u5F62\u53CE\u675F\u6642\u306F\u96A3\u63A5\u7C92\u5B50\u3067\u9699\u9593\u3092\u57CB\u3081\u308B\u305F\u3081\u308F\u305A\u304B\u306B\u5927\u304D\u3081\uFF06\u5747\u4E00\u306B\u3002
    sizeVar = mix(sizeVar, 0.95 + aSeed * 0.18, uForm);
    // \u9AD8 dpr \u74B0\u5883\u3067\u306F\u5C0F\u7C92\u30FB\u4E0A\u9650\u4F4E\u3081\u306E\u65B9\u304C\u30A8\u30C3\u30B8\u304C\u7DE0\u307E\u308A\u9AD8\u7CBE\u7D30\u306B\u898B\u3048\u308B
    // \uFF08\u30B3\u30FC\u30DD\u30EC\u30FC\u30C8\u30B5\u30A4\u30C8\u5B9F\u88C5\u3067\u5B9F\u8A3C\u30020.62 \u3068 clamp 4\u301C5 \u304C\u6700\u3082\u300C\u971E\u307E\u306A\u3044\u300D\uFF09\u3002
    float s = uSize * sizeVar * 0.62 * uSizeScale;
    gl_PointSize = s * uPixelRatio * (1.0 / -mvPosition.z);
    // \u70B9\u30B5\u30A4\u30BA\u4E0A\u9650\u3002\u65E2\u5B9A\u306F 4\u301C5px\uFF08\u9AD8\u7CBE\u7D30\u30FB\u971E\u307E\u306A\u3044\u5B9F\u8A3C\u5024\uFF09\u3002uSizeScale(style.size) \u3092
    // \u639B\u3051\u308B\u3053\u3068\u3067\u3001\u53CE\u675F\u6642\u306B\u300C\u9699\u9593\u306A\u304F\u5857\u3089\u308C\u305F solid \u306A\u30C6\u30AD\u30B9\u30C8\u300D\u3092\u4F5C\u308A\u305F\u3044\u3068\u304D\u306F
    // style.size>1 \u3067\u4E0A\u9650\u3082\u5F15\u304D\u4E0A\u3052\u3089\u308C\u308B\uFF08\u65E2\u5B9A uSizeScale=1 \u3067\u6319\u52D5\u4E0D\u5909\uFF09\u3002
    // \u30102026-07-08\u3011uSettle \u3082\u4E0A\u9650\u306B\u53CD\u6620\u3059\u308B\u3002\u65E7\u5F0F\u306F uForm\uFF08\u99C5N\u5168\u4F53\u306E\u5148\u982D/
    // \u672B\u5C3E\u9077\u79FB\u3067\u306E\u307F\u975E\u30BC\u30ED\uFF09\u3060\u3051\u304C\u4E0A\u9650\u3092\u4E0A\u3052\u3066\u3044\u305F\u305F\u3081\u3001\u9014\u4E2D\u306E\u99C5\uFF08uForm=0\u306E
    // \u307E\u307E\uFF09\u3067\u306F sizeVar \u5074\u3092\u3044\u304F\u3089\u5927\u304D\u304F\u3057\u3066\u3082\u3053\u306E\u4E0A\u9650\u306B\u30AF\u30E9\u30F3\u30D7\u3055\u308C\u3001
    // \u300C\u53CE\u675F\u5F8C\u306B\u8584\u304F\u306A\u308B\u300D\u4E0D\u5177\u5408\u306E\u4FEE\u6B63\u304C\u52B9\u304B\u306A\u304B\u3063\u305F\u3002\u4E0A\u9650\u81EA\u4F53\u3082\u30E2\u30D0\u30A4\u30EB\u306E
    // \u30DC\u30B3\u30DC\u30B3\u5BFE\u7B56\u3067 5.5\u21924.6 \u306B\u6291\u3048\u308B\u3002
    gl_PointSize = clamp(gl_PointSize, 1.0, mix(4.0, 4.2, max(uForm, uSettle)) * uPixelRatio * max(uSizeScale, 1.0));
    // \u30DC\u30B1\u305F\u7C92\u306F\u30EC\u30F3\u30BA\u306E\u30DC\u30B1\u5186\u306E\u3088\u3046\u306B\u5C11\u3057\u5927\u304D\u304F\uFF08clamp \u306E\u5F8C\u306B\u639B\u3051\u308B:
    // \u4E0A\u9650\u306F\u300C\u6574\u5217\u3057\u305F\u6587\u5B57\u306E\u7C92\u300D\u3092\u5B88\u308B\u305F\u3081\u306E\u3082\u306E\u3067\u3001\u30DC\u30B1\u7C92\u306F\u30D5\u30A9\u30FC\u30AB\u30B9\u9762\u304B\u3089
    // \u96E2\u308C\u305F\u98DB\u6563\u4E2D\u306E\u7C92\u306B\u9650\u3089\u308C\u308B\uFF09\u3002\u30D5\u30E9\u30B0\u30E1\u30F3\u30C8\u5074\u3067\u30A8\u30C3\u30B8\u3092\u8EDF\u3089\u304B\u304F\u30FB\u8584\u304F\u3059\u308B\u3002
    gl_PointSize *= 1.0 + vDof * 0.5;
  }
`
  );
}
var FRAGMENT_SHADER = (
  /* glsl */
  `
  uniform vec3 uColorInk;
  uniform vec3 uColorAccent;
  uniform float uSparkle;
  uniform float uBloom;

  varying float vSeed;
  varying float vAccent;
  varying float vDepth;
  varying float vForm;
  varying float vAlpha;
  varying float vSettle;
  varying float vAlphaVar;
  varying float vDof;

  void main() {
    // \u5186\u5F62\u306E\u30BD\u30D5\u30C8\u306A\u70B9\u3002\u4E2D\u5FC3\u3067 1\u3001\u7E01\u3067 0\uFF08smoothstep \u306F edge0<edge1 \u5FC5\u9808\u306A\u306E\u3067\u53CD\u8EE2\u3057\u3066\u4F7F\u3046\uFF09\u3002
    // \u30DC\u30B1\u7C92\uFF08vDof\uFF09\u306F\u82AF\u306E\u534A\u5F84\u3092 0 \u307E\u3067\u6F70\u3057\u3001\u5168\u4F53\u304C\u30AC\u30A6\u30B9\u72B6\u306E\u67D4\u3089\u304B\u3044\u5186\u306B\u306A\u308B
    // \uFF082026-07-11 \u54C1\u8CEA\u5411\u4E0A Phase 1: \u30EC\u30F3\u30BA\u306E\u30DC\u30B1\u5186\u3002\u63D0\u6848\u8005: Claude\u3001\u51DC\u3055\u3093\u627F\u8A8D\uFF09\u3002
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    float alpha = 1.0 - smoothstep(mix(0.12, 0.0, vDof), 0.5, r);
    if (alpha < 0.02) discard;

    // \u4E3B\u4F53\u306F\u30A4\u30F3\u30AF\u3001\u4E00\u90E8\u306E\u7C92\u3060\u3051\u30A2\u30AF\u30BB\u30F3\u30C8\u8272\u3002\u5B57\u5F62\u53CE\u675F\u6642\u306F\u3084\u3084\u63A7\u3048\u3081\u306B\u3002
    float accentAmt = vAccent * mix(0.85, 0.55, vForm);
    vec3 col = mix(uColorInk, uColorAccent, accentAmt);

    // \u4E00\u90E8\u306E\u7C92\u306B\u660E\u308B\u3044\u304D\u3089\u3081\u304D\uFF08\u98DB\u6563\u6642\u306B\u6620\u3048\u308B\uFF09\u3002\u6574\u5217\u6642\u306F\u63A7\u3048\u3081\u3002
    float spark = step(0.94, vSeed);
    col = mix(col, uColorAccent, spark * mix(0.45, 0.15, vSettle) * uSparkle);

    // \u30DC\u30B1\u7C92\u306F\u308F\u305A\u304B\u306B\u8131\u5F69\u5EA6\uFF08\u8F1D\u5EA6\u3078\u5BC4\u305B\u308B\uFF09: \u9060\u666F\u304C\u971E\u3080\u5927\u6C17\u9060\u8FD1\u306E\u52B9\u679C\u3067
    // \u5965\u884C\u304D\u306E\u300C\u5C64\u300D\u304C\u751F\u307E\u308C\u308B\u3002\u6574\u5217\u6642\u306F vDof=0 \u306A\u306E\u3067\u6587\u5B57\u306E\u8272\u306F\u4E0D\u5909\u3002
    // resolve\uFF08\u5B9F DOM \u6587\u5B57\u3068\u306E\u30AF\u30ED\u30B9\u30D5\u30A7\u30FC\u30C9\uFF09\u4E2D\u306B\u8272\u3092\u52D5\u304B\u3059\u3068\u4E8C\u91CD\u50CF\u306B
    // \u898B\u3048\u308B\u305F\u3081\u3001\u8131\u5F69\u5EA6\u306F\u610F\u56F3\u7684\u306B vDof \u7531\u6765\u306E\u307F\u306B\u9650\u5B9A\u3057\u3066\u3044\u308B\u3002
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(lum), vDof * 0.35);

    // \u30102026-07-11 \u5149\uFF08bloom\uFF09\u306E HDR \u30D6\u30FC\u30B9\u30C8\u3002\u63D0\u6848\u8005: Claude\u3001\u51DC\u3055\u3093\u6307\u793A
    // \u300C\u53CE\u675F\u62E1\u6563\u306F\u5143\u306E\u307E\u307E\u63D0\u6848\u3092\u5168\u3066\u5B9F\u88C5\u300D\u3011uBloom>0 \u306E\u3068\u304D\u3001\u304D\u3089\u3081\u304D\u7C92\u3068
    // \u30A2\u30AF\u30BB\u30F3\u30C8\u7C92\u3060\u3051\u3092\u8F1D\u5EA6 1.0 \u8D85\u3078\u62BC\u3057\u4E0A\u3052\u308B\u3002GlyphDust \u5074\u306E Bloom
    // \uFF08luminanceThreshold 0.85\uFF09\u304C\u305D\u306E\u7C92\u3060\u3051\u3092\u62FE\u3063\u3066\u767A\u5149\u3055\u305B\u308B selective \u8A2D\u8A08
    // \uFF08React Postprocessing \u306E\u63A8\u5968: threshold \u3067\u9078\u3070\u305A\u7D20\u6750\u306E\u8272\u3092\u6301\u3061\u4E0A\u3052\u308B\uFF09\u3002
    // uBloom=0\uFF08\u65E2\u5B9A\u3002glow \u30D7\u30EA\u30BB\u30C3\u30C8\u4EE5\u5916\uFF09\u3067\u306F\u5B8C\u5168\u306B\u4E0D\u5909\u3002\u4F4D\u7F6E\u30FB\u30BF\u30A4\u30DF\u30F3\u30B0\u306F
    // \u4E00\u5207\u89E6\u308C\u306A\u3044\u3002
    col *= 1.0 + uBloom * (0.5 + 1.6 * spark + 0.7 * accentAmt);

    // \u5965\u884C\u304D\u3067\u6FC3\u6DE1\uFF08\u660E\u80CC\u666F\u3067\u306E\u8996\u8A8D\u6027\u78BA\u4FDD\u306E\u305F\u3081\u4E0B\u9650\u3092\u6301\u305F\u305B\u308B\uFF09\u3002
    float floorFade = mix(0.45, 0.78, vSettle);
    float depthFade = clamp(1.0 - (vDepth - 3.0) * 0.10, floorFade, 1.0);

    // \u6574\u5217\u6642\u306F\u4E0D\u900F\u660E\u5BC4\u308A\u306B\u3057\u3066\u30A8\u30C3\u30B8\u3092\u7DE0\u3081\u308B\u3002
    // \u30102026-07-08 \u30D6\u30FC\u30B9\u30C8\u500D\u7387\u30921.3\u21921.5\u306B\u5F15\u304D\u4E0A\u3052\u3011\u4E0A\u306E sizeVar \u30B3\u30E1\u30F3\u30C8
    // \u53C2\u7167\u3002\u7CBE\u5BC6\u306A\u5B57\u5F62\u306B\u53CE\u675F\u3057\u305F\u7C92\u5B50\u304C\u30B9\u30C8\u30ED\u30FC\u30AF\u5E45\u306E\u6E1B\u5C11\u5206\u3060\u3051\u8584\u304F\u898B\u3048\u308B
    // \u73FE\u8C61\u3092\u6253\u3061\u6D88\u3059\uFF08\u30E2\u30D0\u30A4\u30EB\u5B9F\u6A5F\u306E\u30DC\u30B3\u30DC\u30B3\u5BFE\u7B56\u3067\u5F53\u521D\u306E2.2\u304B\u3089\u63A7\u3048\u3081\u306B
    // \u623B\u3057\u305F\uFF09\u3002
    // vAlphaVar = \u7C92\u5B50\u3054\u3068\u306E\u900F\u660E\u5EA6\u500B\u4F53\u5DEE\uFF08\u98DB\u6563\u4E2D\u306E\u307F\u3001\u6574\u5217\u6642\u306F 1 \u306B\u7573\u307E\u308C\u308B\uFF09\u3002
    // \u30DC\u30B1\u7C92\u306F\u9762\u7A4D\u304C\u5897\u3048\u305F\u5206 (1 - vDof*0.35) \u3067\u6E1B\u5149\u3057\u30A8\u30CD\u30EB\u30AE\u30FC\u3092\u4FDD\u5B58\u3059\u308B\u3002
    float a = alpha * depthFade * vAlpha * vAlphaVar * (1.0 - vDof * 0.35);
    a = mix(a, clamp(a * 1.35, 0.0, 1.0), vSettle);

    gl_FragColor = vec4(col, a);
  }
`
);

// src/sampling.ts
var ALPHA_THRESHOLD2 = 128;
function createSamplingContext(cw, ch) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  return canvas.getContext("2d", { willReadFrequently: true });
}
function collectFilledPixels(ctx, cw, ch, step) {
  const { data } = ctx.getImageData(0, 0, cw, ch);
  const pts = [];
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4 + 3] > ALPHA_THRESHOLD2) pts.push(x, y);
    }
  }
  return pts;
}
function fillScatterCluster(out, count, offsetX, offsetY, random) {
  for (let i = 0; i < count; i++) {
    const r = Math.cbrt(random()) * 1.4;
    const th = random() * Math.PI * 2;
    out[i * 3] = Math.cos(th) * r + offsetX;
    out[i * 3 + 1] = Math.sin(th) * r * 0.4 + offsetY;
    out[i * 3 + 2] = (random() - 0.5) * 0.2;
  }
}
function assignShuffledTargets(out, count, pts, opts) {
  const { cw, ch, scale, offsetX, offsetY, jitter, thickness, random } = opts;
  const filled = pts.length / 2;
  const order = new Uint32Array(filled);
  for (let i = 0; i < filled; i++) order[i] = i;
  for (let i = filled - 1; i > 0; i--) {
    const j = random() * (i + 1) | 0;
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  for (let i = 0; i < count; i++) {
    const idx = order[i % filled];
    const px = pts[idx * 2];
    const py = pts[idx * 2 + 1];
    const wx = (px - cw / 2) * scale + offsetX;
    const wy = -(py - ch / 2) * scale + offsetY;
    out[i * 3] = wx + (random() - 0.5) * jitter;
    out[i * 3 + 1] = wy + (random() - 0.5) * jitter;
    out[i * 3 + 2] = (random() - 0.5) * thickness;
  }
}
var MAX_INK_RATIO = 0.92;
function scaleFontPx(font, ratio) {
  return font.replace(/(\d+(?:\.\d+)?)px/, (_, px) => {
    const size = Math.max(8, Math.floor(parseFloat(px) * ratio));
    return `${size}px`;
  });
}
function fitFontToWidth(ctx, lines, font, cw) {
  ctx.font = font;
  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  }
  const limit = cw * MAX_INK_RATIO;
  if (maxW <= limit || maxW === 0) return font;
  return scaleFontPx(font, limit / maxW);
}
function segmentsToRunLines(segments, defaultFont) {
  const lines = [[]];
  for (const seg of segments) {
    const font = seg.font ?? defaultFont;
    const parts = seg.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ text: part, font });
    });
  }
  return lines;
}
function drawSegmentedLines(ctx, runLines, cw, ch, lineHeight, align, leftPad) {
  let maxTotal = 0;
  for (const runs of runLines) {
    let total = 0;
    for (const r of runs) {
      ctx.font = r.font;
      total += ctx.measureText(r.text).width;
    }
    maxTotal = Math.max(maxTotal, total);
  }
  const limit = cw * MAX_INK_RATIO;
  if (maxTotal > limit && maxTotal > 0) {
    const ratio = limit / maxTotal;
    runLines = runLines.map(
      (runs) => runs.map((r) => ({ text: r.text, font: scaleFontPx(r.font, ratio) }))
    );
  }
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const blockH = lineHeight * (runLines.length - 1);
  runLines.forEach((runs, i) => {
    const y = ch / 2 - blockH / 2 + i * lineHeight;
    let total = 0;
    for (const r of runs) {
      ctx.font = r.font;
      total += ctx.measureText(r.text).width;
    }
    let x = align === "left" ? leftPad : cw / 2 - total / 2;
    for (const r of runs) {
      ctx.font = r.font;
      ctx.fillText(r.text, x, y);
      x += ctx.measureText(r.text).width;
    }
  });
}
function buildTextTargets(count, lines, opts) {
  const out = new Float32Array(count * 3);
  const random = opts.random ?? Math.random;
  const cw = opts.cw ?? 1280;
  const ch = opts.ch ?? 480;
  const ctx = createSamplingContext(cw, ch);
  if (!ctx) return out;
  const align = opts.align ?? "center";
  const lh = opts.lineHeight;
  ctx.clearRect(0, 0, cw, ch);
  if (opts.segments && opts.segments.length > 0) {
    const runLines = segmentsToRunLines(opts.segments, opts.font);
    drawSegmentedLines(ctx, runLines, cw, ch, lh, align, cw * 0.04);
  } else {
    ctx.fillStyle = "#000";
    ctx.textAlign = align === "left" ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.font = fitFontToWidth(ctx, lines, opts.font, cw);
    const drawX = align === "left" ? cw * 0.04 : cw / 2;
    const blockH = lh * (lines.length - 1);
    lines.forEach((line, i) => {
      ctx.fillText(line, drawX, ch / 2 - blockH / 2 + i * lh);
    });
  }
  const step = opts.step ?? 2;
  const pts = collectFilledPixels(ctx, cw, ch, step);
  const filled = pts.length / 2;
  const offsetX = opts.offsetX ?? 0;
  const offsetY = opts.offsetY ?? 0;
  if (filled === 0) {
    fillScatterCluster(out, count, offsetX, offsetY, random);
    return out;
  }
  const scale = opts.worldW / cw;
  assignShuffledTargets(out, count, pts, {
    cw,
    ch,
    scale,
    offsetX,
    offsetY,
    jitter: scale * step,
    thickness: opts.thickness,
    random
  });
  return out;
}
function buildDenseTextTargets(count, lines, opts) {
  const out = new Float32Array(count * 3);
  const random = opts.random ?? Math.random;
  const cw = opts.cw ?? 1280;
  const ch = opts.ch ?? 400;
  const ctx = createSamplingContext(cw, ch);
  if (!ctx) return out;
  ctx.clearRect(0, 0, cw, ch);
  const lh = ch * (opts.lineHeightRatio ?? 0.46);
  if (opts.segments && opts.segments.length > 0) {
    const runLines = segmentsToRunLines(opts.segments, opts.font);
    drawSegmentedLines(ctx, runLines, cw, ch, lh, "center", cw * 0.04);
  } else {
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fitFontToWidth(ctx, lines, opts.font, cw);
    const blockH = lh * (lines.length - 1);
    lines.forEach((line, i) => {
      ctx.fillText(line, cw / 2, ch / 2 - blockH / 2 + i * lh);
    });
  }
  const step = opts.step ?? 1;
  const pts = collectFilledPixels(ctx, cw, ch, step);
  const filled = pts.length / 2;
  const offsetX = opts.offsetX ?? 0;
  const offsetY = opts.offsetY ?? 0;
  if (filled === 0) {
    fillScatterCluster(out, count, offsetX, offsetY, random);
    return out;
  }
  const scale = opts.worldW / cw;
  assignShuffledTargets(out, count, pts, {
    cw,
    ch,
    scale,
    offsetX,
    offsetY,
    // ジッタは塗り内に収める控えめな量（穴が開かない範囲）。
    jitter: scale * step * 0.5,
    thickness: opts.thickness,
    random
  });
  return out;
}
var SVG_NS = "http://www.w3.org/2000/svg";
function measureSvgPathBounds(paths) {
  if (typeof document === "undefined" || !document.body) return null;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  document.body.appendChild(svg);
  try {
    const b = svg.getBBox();
    if (!(b.width > 0) || !(b.height > 0)) return null;
    return [b.x, b.y, b.width, b.height];
  } catch {
    return null;
  } finally {
    svg.remove();
  }
}
function buildShapeTargets(count, opts) {
  const out = new Float32Array(count * 3);
  const random = opts.random ?? Math.random;
  const cw = opts.cw ?? 1024;
  const ch = opts.ch ?? 1024;
  const offsetX = opts.offsetX ?? 0;
  const offsetY = opts.offsetY ?? 0;
  const ctx = createSamplingContext(cw, ch);
  if (!ctx) return out;
  const paths = Array.isArray(opts.path) ? opts.path : [opts.path];
  const vb = opts.viewBox ?? measureSvgPathBounds(paths);
  if (!vb || !(vb[2] > 0) || !(vb[3] > 0)) {
    fillScatterCluster(out, count, offsetX, offsetY, random);
    return out;
  }
  const [vbX, vbY, vbW, vbH] = vb;
  const fit = Math.min(cw * MAX_INK_RATIO / vbW, ch * MAX_INK_RATIO / vbH);
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(
    fit,
    0,
    0,
    fit,
    cw / 2 - (vbX + vbW / 2) * fit,
    ch / 2 - (vbY + vbH / 2) * fit
  );
  ctx.fillStyle = "#000";
  const fillRule = opts.fillRule ?? "nonzero";
  for (const d of paths) {
    try {
      ctx.fill(new Path2D(d), fillRule);
    } catch {
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const step = opts.step ?? 1;
  const pts = collectFilledPixels(ctx, cw, ch, step);
  if (pts.length === 0) {
    fillScatterCluster(out, count, offsetX, offsetY, random);
    return out;
  }
  let worldW = opts.worldW;
  const worldH = worldW * (vbH / vbW);
  if (opts.maxWorldH !== void 0 && worldH > opts.maxWorldH) {
    worldW *= opts.maxWorldH / worldH;
  }
  const scale = worldW / (vbW * fit);
  assignShuffledTargets(out, count, pts, {
    cw,
    ch,
    scale,
    offsetX,
    offsetY,
    jitter: scale * step * 0.5,
    thickness: opts.thickness ?? 0.1,
    random
  });
  return out;
}

// src/internal/geometry.ts
function formsGlyph(kf) {
  return kf?.type === "text" || kf?.type === "shape";
}
var DEFAULT_TEXT_FONT = "700 140px system-ui, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
var DEFAULT_DENSE_FONT = "900 260px 'Helvetica Neue', Helvetica, Arial, sans-serif";
function isMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
}
function smooth(a, b, x) {
  const t = THREE2.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function bump(x, c, prev, next) {
  const rise = c <= 0 ? 1 : smooth(prev, c, x);
  const fall = c >= 1 ? 1 : 1 - smooth(c, next, x);
  return rise * fall;
}
var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
function buildScatter(count, spread, random, pattern = "fibonacci") {
  const out = new Float32Array(count * 3);
  if (pattern === "random") {
    for (let i = 0; i < count; i++) {
      const r = (3 + Math.cbrt(random()) * 2.6) * spread;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      out[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      out[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
      out[i * 3 + 2] = r * Math.cos(phi) * 0.9;
    }
    return out;
  }
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = 1 - 2 * t;
    const rxy = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    const r = (3 + Math.cbrt(t) * 2.6) * spread * (0.92 + random() * 0.16);
    out[i * 3] = Math.cos(theta) * rxy * r;
    out[i * 3 + 1] = y * r * 0.8;
    out[i * 3 + 2] = Math.sin(theta) * rxy * r * 0.9;
  }
  return out;
}
function seededRandom(seed) {
  let a = seed * 2654435769 >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function buildScatterAroundTargets(count, spread, ref, pattern = "fibonacci", visW) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 2 < ref.length; i += 3) {
    const x = ref[i];
    const y = ref[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  const halfW = (maxX - minX) / 2;
  const halfH = (maxY - minY) / 2;
  if (halfW < 0.05 && halfH < 0.05) return null;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let rx = (halfW * 1.2 + 0.45) * spread;
  let ry = (halfH * 2.4 + 0.45) * spread;
  if (visW !== void 0) {
    rx = Math.min(rx, visW * 0.1);
    ry = Math.min(ry, visW * 0.065);
  }
  const rz = 0.5 * spread;
  return distributeAroundPoint(count, cx, cy, rx, ry, rz, pattern);
}
function distributeAroundPoint(count, cx, cy, rx, ry, rz, pattern) {
  const out = new Float32Array(count * 3);
  const gaussianPair = (rnd) => {
    const u1 = Math.max(rnd(), 1e-6);
    const u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(u1));
    return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
  };
  for (let i = 0; i < count; i++) {
    const rnd = pattern === "random" ? seededRandom(i + 1) : seededRandom(i + 1001);
    const [gx, gy] = gaussianPair(rnd);
    const [gz] = gaussianPair(rnd);
    out[i * 3] = cx + gx * rx;
    out[i * 3 + 1] = cy + gy * ry;
    out[i * 3 + 2] = gz * rz;
  }
  return out;
}
function buildScatterAroundAnchor(count, spread, selector, ctx, pattern = "fibonacci") {
  const center = sampleAnchorCenterWorld({
    selector,
    fovDeg: ctx.cameraFov,
    cameraZ: ctx.cameraZ,
    ...ctx.viewportW !== void 0 ? { viewportW: ctx.viewportW } : {},
    ...ctx.viewportH !== void 0 ? { viewportH: ctx.viewportH } : {}
  });
  if (!center) return null;
  const rx = ctx.visW * 0.08 * spread;
  const ry = ctx.visW * 0.05 * spread;
  const rz = 0.5 * spread;
  return distributeAroundPoint(count, center.cx, center.cy, rx, ry, rz, pattern);
}
function scatterGlyphRefIndex(keyframes, index) {
  for (let i = index + 1; i < keyframes.length; i++) {
    if (formsGlyph(keyframes[i])) return i;
  }
  for (let i = index - 1; i >= 0; i--) {
    if (formsGlyph(keyframes[i])) return i;
  }
  return -1;
}
function buildKeyframeTargets(kf, count, ctx) {
  if (kf.type === "scatter") {
    return buildScatter(count, kf.spread ?? 1, Math.random, ctx.scatterPattern);
  }
  if (kf.type === "shape") {
    const vpW = ctx.viewportW ?? (typeof window !== "undefined" ? window.innerWidth : 1440);
    const vpH = ctx.viewportH ?? (typeof window !== "undefined" ? window.innerHeight : 900);
    const visH = ctx.visW * (vpH / Math.max(vpW, 1));
    return buildShapeTargets(count, {
      path: kf.path,
      viewBox: kf.viewBox,
      ...kf.fillRule !== void 0 ? { fillRule: kf.fillRule } : {},
      // 既定はテキストより控えめな幅（形は正方形に近いことが多く、テキストの
      // 0.7 相当だと縦に画面をはみ出しやすい）。
      worldW: kf.worldW ?? ctx.visW * (ctx.mobile ? 0.5 : 0.32),
      // worldW 未指定（自動サイズ）のときだけ、縦長シェイプが可視高さを
      // はみ出さないよう高さもキャップする（明示指定はユーザーの意図を尊重）。
      ...kf.worldW === void 0 ? { maxWorldH: visH * 0.62 } : {},
      offsetX: kf.offsetX ?? 0,
      offsetY: kf.offsetY ?? 0
    });
  }
  const lines = kf.text.split("\n");
  if (kf.domSelector) {
    const dom = buildGlyphFromDOM(count, lines, {
      selector: kf.domSelector,
      fovDeg: ctx.cameraFov,
      cameraZ: ctx.cameraZ,
      // 実寸が分かる場合のみ渡す（exactOptionalPropertyTypes: undefined を明示しない）。
      ...ctx.viewportW !== void 0 ? { viewportW: ctx.viewportW } : {},
      ...ctx.viewportH !== void 0 ? { viewportH: ctx.viewportH } : {}
    });
    if (dom) return dom;
  }
  if (kf.dense) {
    return buildDenseTextTargets(count, lines, {
      font: kf.font ?? DEFAULT_DENSE_FONT,
      segments: kf.segments,
      worldW: kf.worldW ?? ctx.visW * (ctx.mobile ? 0.86 : 0.62),
      offsetX: kf.offsetX ?? 0,
      offsetY: kf.offsetY ?? 0,
      thickness: 0.06,
      cw: 1400,
      ch: 440,
      step: 1
    });
  }
  return buildTextTargets(count, lines, {
    font: kf.font ?? DEFAULT_TEXT_FONT,
    segments: kf.segments,
    worldW: kf.worldW ?? ctx.visW * 0.7,
    lineHeight: 178,
    offsetX: kf.offsetX ?? 0,
    offsetY: kf.offsetY ?? 0,
    thickness: 0.16,
    cw: 1280,
    ch: 560,
    step: 2
  });
}
function sameGlyphKeyframe(a, b) {
  if (!a || a.type !== "text" || b.type !== "text") return false;
  return a.text === b.text && a.domSelector === b.domSelector && a.font === b.font && a.worldW === b.worldW && a.offsetX === b.offsetX && a.offsetY === b.offsetY && a.dense === b.dense && a.segments === void 0 && b.segments === void 0;
}
function buildKeyframeTargetsList(keyframes, count, ctx) {
  const out = [];
  keyframes.forEach((kf, i) => {
    if (kf.type === "scatter" && (kf.around === "glyph" || kf.anchorSelector)) {
      out.push(null);
      return;
    }
    const prevBuf = out[i - 1];
    if (prevBuf && sameGlyphKeyframe(keyframes[i - 1], kf)) {
      out.push(prevBuf);
      return;
    }
    out.push(buildKeyframeTargets(kf, count, ctx));
  });
  keyframes.forEach((kf, i) => {
    if (out[i] !== null || kf.type !== "scatter") return;
    const anchored = kf.anchorSelector ? buildScatterAroundAnchor(count, kf.spread ?? 1, kf.anchorSelector, ctx, ctx.scatterPattern) : null;
    if (anchored) {
      out[i] = anchored;
      return;
    }
    const refIdx = scatterGlyphRefIndex(keyframes, i);
    const ref = refIdx >= 0 ? out[refIdx] ?? null : null;
    const local = ref ? buildScatterAroundTargets(count, kf.spread ?? 1, ref, ctx.scatterPattern, ctx.visW) : null;
    out[i] = local ?? buildScatter(count, kf.spread ?? 1, Math.random, ctx.scatterPattern);
  });
  return out;
}

// ---------------------------------------------------------------------------
// 【fork】per-character order attributes
//
// 目的: 让"溶解 / 重组"的顺序按字符走，而不是按每颗粒子的随机 seed（stagger）
// 或噪声斑块（wave）。
//
// 做法: 不重写采样器，而是在已采好的位置上做一次后处理——
//   • text 关键帧: 用该字形墨迹的 x 范围把粒子归一化，再按字符 advance 边界
//     （canvas measureText 逐字前缀宽度）分桶，得到 0..1 的字符序号。
//   • scatter 关键帧: 直接沿用 scatterGlyphRefIndex 指到的参考字形的字符序号
//     （同一粒子索引），于是"飞散→聚合成下一个词"的那一段也按目标字符排序。
// 数值 0 = 第一个字符，1 = 最后一个字符。shader 里 `uCharOrder` 决定用不用它。
// ---------------------------------------------------------------------------
var CHAR_MEASURE_CANVAS = null;
function measureCharBounds(text, font, letterSpacing) {
  const chars = Array.from(String(text ?? ""));
  if (chars.length <= 1 || typeof document === "undefined") return null;
  if (!CHAR_MEASURE_CANVAS) CHAR_MEASURE_CANVAS = document.createElement("canvas");
  const ctx = CHAR_MEASURE_CANVAS.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.font = font || "600 100px sans-serif";
    ctx.letterSpacing = `${letterSpacing || 0}px`;
  } catch (e) {
    return null;
  }
  const total = ctx.measureText(chars.join("")).width;
  if (!(total > 0)) return null;
  const bounds = [];
  let prev = 0;
  for (let i = 0; i < chars.length; i++) {
    const w = ctx.measureText(chars.slice(0, i + 1).join("")).width;
    bounds.push([prev / total, w / total]);
    prev = w;
  }
  return bounds;
}
function charBufferForTextKeyframe(kf, buf, count, fallbackFont) {
  const out = new Float32Array(count);
  const chars = Array.from(String(kf?.text ?? ""));
  const n = chars.length;
  if (n <= 1) return out;
  let font = kf?.font || fallbackFont || "600 100px sans-serif";
  let letterSpacing = 0;
  if (kf?.domSelector && typeof document !== "undefined") {
    const el = document.querySelector(kf.domSelector);
    if (el) {
      const cs = window.getComputedStyle(el);
      font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      letterSpacing = parseFloat(cs.letterSpacing) || 0;
    }
  }
  const bounds = measureCharBounds(chars.join(""), font, letterSpacing);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = buf[i * 3];
    const y = buf[i * 3 + 1];
    const z = buf[i * 3 + 2];
    if (x === 0 && y === 0 && z === 0) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX - minX < 1e-6) {
    return out;
  }
    const span = maxX - minX;
    for (let i = 0; i < count; i++) {
      const t = Math.min(1, Math.max(0, (buf[i * 3] - minX) / span));
      let idx = n - 1;
      if (bounds) {
        for (let c = 0; c < n; c++) {
          if (t < bounds[c][1]) {
            idx = c;
            break;
          }
        }
     } else {
      idx = Math.min(n - 1, Math.floor(t * n));
    }
    out[i] = n <= 1 ? 0 : idx / (n - 1);
  }
  return out;
}
function buildCharBuffers(keyframes, buffers, count, fallbackFont) {
  const out = new Array(keyframes.length).fill(null);
  const byBuffer = new Map();
  // pass 1: text 关键帧（同字形共用同一 buffer，直接复用结果）
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];
    const buf = buffers[i];
    if (!buf || kf.type !== "text") continue;
    let chars = byBuffer.get(buf);
    if (!chars) {
      chars = charBufferForTextKeyframe(kf, buf, count, fallbackFont);
      byBuffer.set(buf, chars);
    }
    out[i] = chars;
  }
  // pass 2: scatter / shape —— 优先沿用参考字形（scatterGlyphRefIndex 先看下一个字形，
  // 所以"飞散→聚合成下一个词"这一段按目标字符排序），否则退回上一个字形
  let last = null;
  for (let i = 0; i < keyframes.length; i++) {
    if (out[i]) {
      last = out[i];
      continue;
    }
    const refIdx = scatterGlyphRefIndex(keyframes, i);
    const ref = refIdx >= 0 ? out[refIdx] : null;
    const pick = ref ?? last;
    out[i] = pick ? pick.slice() : null;
  }
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) out[i] = new Float32Array(count);
  }
  return out;
}
function GlyphPoints(props) {
  const {
    keyframes,
    count,
    colors,
    style,
    cameraZ,
    cameraFov,
    getProgress,
    timing,
    swapFade,
    swapAt: swapAtProp,
    resolveRef,
    resolveDomSelector,
    resampleSignal
  } = props;
  const pointsRef = useRef(null);
  const resolveDomElRef = useRef(null);
  const windowElsRef = useRef(/* @__PURE__ */ new Map());
  const matRef = useRef(null);
  const { size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const stage = useRef(0);
  const n = keyframes.length;
  const times = useMemo(() => {
    if (timing && timing.length === n) {
      for (let i = 0; i < timing.length; i++) {
        const t = timing[i];
        if (t < 0 || t > 1 || i > 0 && t < timing[i - 1]) {
          console.warn(
            `[glyphdust] \`timing\` \u306F [0,1] \u306E\u7BC4\u56F2\u3067\u5358\u8ABF\u975E\u6E1B\u5C11\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059: ${JSON.stringify(timing)}`
          );
          break;
        }
      }
      return timing.slice();
    }
    if (n <= 1) return [0];
    const end = formsGlyph(keyframes[n - 1]) ? 0.85 : 1;
    return Array.from({ length: n }, (_, i) => i / (n - 1) * end);
  }, [timing, n, keyframes]);
  const timeline = useMemo(() => {
    const isText = keyframes.map((k) => formsGlyph(k));
    const isScatter = keyframes.map((k) => k.type === "scatter");
    const groupStart = new Array(n).fill(0);
    const groupEnd = new Array(n).fill(0);
    for (let i = 0; i < n; ) {
      const kf = keyframes[i];
      if (kf?.type !== "text") {
        groupStart[i] = i;
        groupEnd[i] = i;
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 < n && keyframes[j + 1]?.type === "text" && keyframes[j + 1].text === kf.text && keyframes[j + 1].domSelector === kf.domSelector) {
        j += 1;
      }
      for (let k = i; k <= j; k++) {
        groupStart[k] = i;
        groupEnd[k] = j;
      }
      i = j + 1;
    }
    const last = keyframes[n - 1];
    const hasResolve = n >= 1 && last?.type === "text" && last.resolveToDom === true;
    const resolveText = last?.type === "text" ? last.text.replace(/\n/g, " ") : "";
    const swapAt = times[1] !== void 0 ? times[1] * 0.15 : 0;
    const windows = [];
    let gi = 0;
    while (gi < n) {
      const kf = keyframes[gi];
      if (kf?.type !== "text" || !kf.domSelector) {
        gi += 1;
        continue;
      }
      let gj = gi;
      while (gj + 1 < n) {
        const nx = keyframes[gj + 1];
        if (nx?.type !== "text" || nx.domSelector !== kf.domSelector) break;
        gj += 1;
      }
      const wantsResolve = keyframes.slice(gi, gj + 1).some((g) => g.type === "text" && g.resolveToDom === true);
      const holdResolved = keyframes.slice(gi, gj + 1).some((g) => g.type === "text" && g.holdResolved === true);
      if (wantsResolve) {
        const t0 = times[gi] ?? 0;
        const t1 = times[gj] ?? 1;
        const span = Math.max(t1 - t0, 0);
        const desiredRise = span > 0 ? span * 0.44 : 0.02;
        const desiredPlateau = span * 0.15;
        const totalDesired = desiredRise * 2 + desiredPlateau;
        const shrink = totalDesired > 0 && totalDesired > span ? span / totalDesired : 1;
        const rise = Math.max(1e-3, desiredRise * shrink);
        const minPlateau = Math.max(0, desiredPlateau * shrink);
        const staggerCatchUp = t0 + style.stagger * 0.5 * (1 - t0);
        const latestA = t1 - 2 * rise - minPlateau;
        const a = gi === 0 ? t0 : Math.min(staggerCatchUp, latestA);
        const c = gi === 0 ? Math.min(t0 + minPlateau, t1 - rise) : t1 - rise;
        windows.push({
          selector: kf.domSelector,
          a,
          b: a + rise,
          c,
          d: c + rise,
          isStart: gi === 0,
          isFinal: gj === n - 1,
          holdResolved
        });
      }
      gi = gj + 1;
    }
    return { isText, isScatter, hasResolve, resolveText, swapAt, windows, groupStart, groupEnd };
  }, [keyframes, n, times, style.stagger]);
  const built = useMemo(() => {
    const geo = new THREE2.BufferGeometry();
    const seed = new Float32Array(count);
    const accent = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seed[i] = Math.random();
      accent[i] = Math.random() < colors.accentRatio ? 1 : 0;
    }
    const mobile = isMobile();
    const vpW = typeof window !== "undefined" ? window.innerWidth : 1440;
    const vpH = typeof window !== "undefined" ? window.innerHeight : 900;
    const { worldW: visW } = viewSizeAtZ0(vpW, vpH, cameraFov, cameraZ);
    const buffers = buildKeyframeTargetsList(keyframes, count, {
      visW,
      mobile,
      cameraFov,
      cameraZ,
      scatterPattern: style.scatterPattern
    });
    buffers.forEach((buf, i) => {
      geo.setAttribute(
        glyphPositionAttribute(i),
        new THREE2.BufferAttribute(buf, 3)
      );
    });
      const charBuffers = buildCharBuffers(keyframes, buffers, count, style.charFont);
      const charChunks = Array.from(
        { length: glyphCharChunkCount(charBuffers.length) },
        () => new Float32Array(count * GLYPH_CHAR_CHUNK)
      );
      charBuffers.forEach((buf, i) => {
        const chunk = charChunks[Math.floor(i / GLYPH_CHAR_CHUNK)];
        const slot = i % GLYPH_CHAR_CHUNK;
        for (let p = 0; p < count; p += 1) {
          chunk[p * GLYPH_CHAR_CHUNK + slot] = buf[p];
        }
      });
      charChunks.forEach((chunk, k) => {
        geo.setAttribute(
          glyphCharAttribute(k * GLYPH_CHAR_CHUNK),
          new THREE2.BufferAttribute(chunk, GLYPH_CHAR_CHUNK)
        );
      });
    geo.setAttribute("aSeed", new THREE2.BufferAttribute(seed, 1));
    geo.setAttribute("aAccent", new THREE2.BufferAttribute(accent, 1));
    const first = buffers[0] ?? new Float32Array(count * 3);
    geo.setAttribute("position", new THREE2.BufferAttribute(first.slice(), 3));
    geo.computeBoundingSphere();
    return { geo, buffers, visW, vpW, vpH };
  }, [keyframes, count, colors.accentRatio, cameraFov, cameraZ, style.scatterPattern]);
  const vertexShader = useMemo(() => buildVertexShader(Math.max(n, 1)), [n]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStage: { value: 0 },
      uTimes: { value: times.slice() },
      uForm: { value: 0 },
      uSettle: { value: 0 },
      uBurst: { value: 0 },
      uSwap: { value: 0 },
      uResolve: { value: 0 },
      uReduced: { value: 0 },
      uSize: { value: 1 },
      uSizeScale: { value: style.size },
      uDrift: { value: style.drift },
      uStagger: { value: style.stagger },
      uStaggerCollapse: { value: 0 },
      uCurl: { value: style.curl },
      uCharOrder: { value: style.charOrder ?? 0 },
      uSmoother: { value: style.easing === "smoothstep" ? 0 : 1 },
      uSparkle: { value: style.sparkle },
      uPixelRatio: { value: 1 },
      uColorInk: { value: colors.ink.clone() },
      uColorAccent: { value: colors.accent.clone() },
      uAlphaVar: { value: style.alphaVar },
      uDof: { value: style.dof },
      uFocus: { value: cameraZ },
      uWave: { value: style.wave },
      uBloom: { value: 0 }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vertexShader]
  );
  const trackingActiveRef = useRef(false);
  const trackBaseScrollYRef = useRef(0);
  const rebaseTracking = () => {
    trackingActiveRef.current = false;
    for (let i = n - 1; i >= 0; i--) {
      const kf = keyframes[i];
      if (kf?.type === "text" && kf.domSelector) {
        const el = document.querySelector(kf.domSelector);
        if (el) {
          let sticky = false;
          for (let node = el; node; node = node.parentElement) {
            const pos = getComputedStyle(node).position;
            if (pos === "sticky" || pos === "fixed") {
              sticky = true;
              break;
            }
          }
          if (!sticky) {
            trackingActiveRef.current = true;
            trackBaseScrollYRef.current = window.scrollY;
          }
        }
        break;
      }
    }
    const p = pointsRef.current;
    if (p) p.position.y = 0;
  };
  const positionOverlay = () => {
    const el = resolveRef?.current;
    if (!el || !timeline.hasResolve) return;
    const finalBuf = built.buffers[n - 1];
    if (!finalBuf) return;
    const vpW = sizeRef.current.width;
    const vpH = sizeRef.current.height;
    const { worldW: visW } = viewSizeAtZ0(vpW, vpH, cameraFov, cameraZ);
    const finalKf = keyframes[n - 1];
    const fontStr = finalKf?.type === "text" && finalKf.font ? finalKf.font : DEFAULT_DENSE_FONT;
    alignGlyphOverlay(el, finalBuf, {
      text: timeline.resolveText,
      font: fontStr,
      viewportW: vpW,
      viewportH: vpH,
      visibleWorldW: visW
    });
  };
  const rebuildDomGlyphs = () => {
    const updated = /* @__PURE__ */ new Set();
    const sampleCache = /* @__PURE__ */ new Map();
    keyframes.forEach((kf, i) => {
      if (kf.type !== "text" || !kf.domSelector) return;
      const cacheKey = `${kf.domSelector}\0${kf.text}`;
      let next = sampleCache.get(cacheKey) ?? null;
      if (!next) {
        next = buildGlyphFromDOM(count, kf.text.split("\n"), {
          selector: kf.domSelector,
          fovDeg: cameraFov,
          cameraZ,
          // 粒子がレンダリングされる canvas の実寸（CSS px）。
          // window.innerWidth だとスクロールバー分ずれるため size を使う（常に最新値を
          // 読むため ref 経由。理由は sizeRef 宣言部のコメント参照）。
          viewportW: sizeRef.current.width,
          viewportH: sizeRef.current.height
        });
        if (next) sampleCache.set(cacheKey, next);
      }
      if (!next) return;
      const attr = built.geo.getAttribute(glyphPositionAttribute(i));
      if (!attr) return;
      attr.array.set(next);
      attr.needsUpdate = true;
      updated.add(i);
    });
    keyframes.forEach((kf, i) => {
      if (kf.type !== "scatter") return;
      let next = null;
      if (kf.anchorSelector) {
        next = buildScatterAroundAnchor(
          count,
          kf.spread ?? 1,
          kf.anchorSelector,
          {
            cameraFov,
            cameraZ,
            viewportW: sizeRef.current.width,
            viewportH: sizeRef.current.height,
            visW: built.visW
          },
          style.scatterPattern
        );
      }
      if (!next) {
        if (kf.around !== "glyph") return;
        const refIdx = scatterGlyphRefIndex(keyframes, i);
        if (refIdx < 0 || !updated.has(refIdx)) return;
        const ref = built.buffers[refIdx];
        if (!ref) return;
        next = buildScatterAroundTargets(
          count,
          kf.spread ?? 1,
          ref,
          style.scatterPattern,
          built.visW
        );
      }
      if (!next) return;
      const attr = built.geo.getAttribute(glyphPositionAttribute(i));
      if (!attr) return;
      attr.array.set(next);
      attr.needsUpdate = true;
    });
    positionOverlay();
    rebaseTracking();
  };
  useEffect(() => {
    const raf = requestAnimationFrame(rebuildDomGlyphs);
    const t1 = window.setTimeout(rebuildDomGlyphs, 120);
    const t2 = window.setTimeout(rebuildDomGlyphs, 500);
    const fonts = document.fonts;
    if (fonts && typeof fonts.ready?.then === "function") {
      fonts.ready.then(() => rebuildDomGlyphs()).catch(() => {
      });
    }
    const onResize = () => rebuildDomGlyphs();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
    };
  }, [built]);
  const isFirstResample = useRef(true);
  useEffect(() => {
    if (isFirstResample.current) {
      isFirstResample.current = false;
      return;
    }
    rebuildDomGlyphs();
  }, [resampleSignal]);
  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms;
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 3);
    u.uSize.value = Math.min(size.height / 18, 26);
  }, [size]);
  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms;
    u.uSizeScale.value = style.size;
    u.uDrift.value = style.drift;
    u.uStagger.value = style.stagger;
    u.uCurl.value = isMobile() ? 0 : style.curl;
    u.uCharOrder.value = style.charOrder ?? 0;
    u.uSmoother.value = style.easing === "smoothstep" ? 0 : 1;
    u.uSparkle.value = style.sparkle;
    u.uAlphaVar.value = style.alphaVar;
    u.uDof.value = style.dof;
    u.uFocus.value = cameraZ;
    u.uWave.value = style.wave;
    u.uBloom.value = isMobile() ? 0 : style.bloom;
    mat.blending = style.blend === "additive" ? THREE2.AdditiveBlending : THREE2.NormalBlending;
    mat.needsUpdate = true;
  }, [style.size, style.drift, style.stagger, style.curl, style.charOrder, style.easing, style.sparkle, style.blend, style.alphaVar, style.dof, style.wave, style.bloom, cameraZ]);
  useFrame((state) => {
    const p = pointsRef.current;
    const mat = matRef.current;
    if (!p || !mat) return;
    const u = mat.uniforms;
    if (trackingActiveRef.current) {
      const dyPx = window.scrollY - trackBaseScrollYRef.current;
      const w = sizeRef.current.width || 1;
      const { worldW: visWNow } = viewSizeAtZ0(
        w,
        sizeRef.current.height || 1,
        cameraFov,
        cameraZ
      );
      p.position.y = dyPx * (visWNow / w);
    }
    const raw = THREE2.MathUtils.clamp(getProgress(), 0, 1);
    stage.current = raw;
    const s = stage.current;
    let settle = 0;
    let burst = 0;
    let staggerCollapse = 0;
    // 【fork】启用 charOrder 时，把 stagger 的收拢改成"只按当前区间"：
    // 原实现对每个关键帧都算 smooth(c - width, c, s) 再取 max，于是第一个
    // 关键帧到达之后 collapse 恒为 1 ⇒ w = uStagger * (1 - collapse) = 0，
    // 后面所有区间的逐粒子偏移（aSeed / wave / aChar）都不再生效。
    // 这里只在"当前正处在哪个区间"内取收拢值，仍然保证到达点精确收敛。
    const charOrderActive = Math.abs(style?.charOrder ?? 0) > 0.001;
    let segmentCollapse = 0;
    for (let i = 0; i < n; i++) {
      const c = times[i] ?? 0;
      const prev = times[i - 1] ?? 0;
      const next = times[i + 1] ?? 1;
      if (timeline.isText[i] && i === timeline.groupStart[i]) {
        const gEnd = timeline.groupEnd[i];
        const groupPrev = times[i - 1] ?? 0;
        const groupNext = times[gEnd + 1] ?? 1;
        const rise = smooth(groupPrev, c, s);
        const fall = 1 - smooth(times[gEnd] ?? c, groupNext, s);
        settle = Math.max(settle, rise * fall);
      }
      if (timeline.isScatter[i]) burst = Math.max(burst, bump(s, c, prev, next));
      const width = Math.max(0.02, (c - prev) * 0.5);
      staggerCollapse = Math.max(staggerCollapse, smooth(c - width, c, s));
      if (charOrderActive && s >= prev && s <= c) {
        segmentCollapse = Math.max(segmentCollapse, smooth(c - width, c, s));
      }
    }
    if (charOrderActive) staggerCollapse = segmentCollapse;
    let form = 0;
    const lastIsText = timeline.isText[n - 1] === true;
    if (lastIsText && n >= 2) {
      form = smooth(times[n - 2] ?? 0, times[n - 1] ?? 1, s);
    }
    const firstIsText = timeline.isText[0] === true;
    if (firstIsText && n >= 2) {
      const formStart = 1 - smooth(times[0] ?? 0, times[1] ?? 1, s);
      form = Math.max(form, formStart);
    }
    const swapAt = swapAtProp ?? timeline.swapAt;
    let swapped = swapFade && swapFade > 0 ? smooth(swapAt, swapAt + swapFade, raw) : raw >= swapAt ? 1 : 0;
    let resolve = timeline.hasResolve ? smooth(0.9, 0.98, raw) : 0;
    let textReveal = timeline.hasResolve ? resolve : 0;
    if (timeline.windows.length > 0) {
      swapped = 1;
      let amtMax = 0;
      for (const w of timeline.windows) {
        const amt = (w.isStart ? 1 : smooth(w.a, w.b, s)) * (w.isFinal ? 1 : 1 - smooth(w.c, w.d, s));
        if (!w.holdResolved) {
          let el = windowElsRef.current.get(w.selector);
          if (el === void 0 || el !== null && !el.isConnected) {
            el = document.querySelector(w.selector);
            windowElsRef.current.set(w.selector, el);
          }
          if (el) {
            el.style.opacity = String(amt);
            const blur = Math.max(0, (1 - amt) * 6);
            el.style.filter = `blur(${blur.toFixed(2)}px)`;
          }
        }
        if (amt > amtMax) amtMax = amt;
      }
      resolve = smooth(0.3, 0.9, amtMax);
      textReveal = 0;
    }
    u.uTime.value = state.clock.elapsedTime;
    u.uStage.value = s;
    u.uForm.value = form;
    u.uSettle.value = settle;
    u.uStaggerCollapse.value = staggerCollapse;
    u.uBurst.value = burst * (1 - form) * style.burst;
    u.uSwap.value = swapped;
    u.uResolve.value = resolve;
    if (timeline.hasResolve) {
      const ownOverlay = resolveRef?.current ?? null;
      if (ownOverlay) {
        ownOverlay.style.opacity = String(textReveal);
        ownOverlay.style.filter = `blur(${((1 - textReveal) * 2.5).toFixed(2)}px)`;
      } else if (resolveDomSelector && timeline.windows.length === 0) {
        if (!resolveDomElRef.current || !resolveDomElRef.current.isConnected) {
          resolveDomElRef.current = document.querySelector(resolveDomSelector);
        }
        if (resolveDomElRef.current) {
          resolveDomElRef.current.style.opacity = String(textReveal);
        }
      }
    }
  });
  return /* @__PURE__ */ jsx("points", { ref: pointsRef, geometry: built.geo, frustumCulled: false, children: /* @__PURE__ */ jsx(
    "shaderMaterial",
    {
      ref: matRef,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: style.blend === "additive" ? THREE2.AdditiveBlending : THREE2.NormalBlending,
      vertexShader,
      fragmentShader: FRAGMENT_SHADER
    }
  ) });
}

// src/drivers.ts
var DEFAULT_TRIGGER_HEIGHT = 2;
function triangle(x) {
  const t = x % 2;
  return t <= 1 ? t : 2 - t;
}
function computeAutoplayProgress(elapsedSec, cfg) {
  const duration = cfg.duration && cfg.duration > 0 ? cfg.duration : 4;
  const delay = cfg.delay && cfg.delay > 0 ? cfg.delay : 0;
  const t = elapsedSec - delay;
  if (t <= 0) return 0;
  const raw = t / duration;
  if (cfg.loop) {
    return cfg.pingpong ? triangle(raw) : raw % 1;
  }
  return clamp01(raw);
}
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
var DEFAULT_INK = "#1b2330";
var DEFAULT_ACCENT = "#0055ff";
var DEFAULT_ACCENT_RATIO = 0.18;
var DEFAULT_COUNT_DESKTOP = 11e3;
var DEFAULT_COUNT_MOBILE = 5200;
var DEFAULT_CAMERA_Z = 7;
var DEFAULT_CAMERA_FOV = 42;
var DEFAULT_DPR = [1, 1.75];
var SMOOTH = "smootherstep";
var FIB = "fibonacci";
var PRESETS = {
  default: { size: 1, blend: "normal", drift: 1, sparkle: 1, stagger: 0.08, curl: 1, easing: SMOOTH, scatterPattern: FIB, burst: 1, alphaVar: 0.55, dof: 0.5, wave: 0.75, bloom: 0 },
  minimal: { size: 0.92, blend: "normal", drift: 0.35, sparkle: 0, stagger: 0.04, curl: 0, easing: SMOOTH, scatterPattern: FIB, burst: 1, alphaVar: 0.25, dof: 0, wave: 0.4, bloom: 0 },
  lively: { size: 1.05, blend: "normal", drift: 1.4, sparkle: 1.4, stagger: 0.12, curl: 1.3, easing: SMOOTH, scatterPattern: FIB, burst: 1, alphaVar: 0.7, dof: 0.7, wave: 0.9, bloom: 0 },
  glow: { size: 1.1, blend: "additive", drift: 1.1, sparkle: 1.5, stagger: 0.1, curl: 1.1, easing: SMOOTH, scatterPattern: FIB, burst: 1, alphaVar: 0.6, dof: 0.6, wave: 0.8, bloom: 0.6 }
};
function clamp012(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function ResumeOnUnpause({ paused }) {
  const invalidate = useThree((s) => s.invalidate);
  const prevPausedRef = useRef(paused);
  useEffect(() => {
    if (prevPausedRef.current && !paused) invalidate();
    prevPausedRef.current = paused;
  }, [paused, invalidate]);
  return null;
}
function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
function GlyphDust(props) {
  const {
    keyframes,
    driver = { type: "scroll" },
    preset = "default",
    style,
    colors,
    count,
    dpr = DEFAULT_DPR,
    camera,
    timing,
    swapFade,
    swapAt,
    fallback = null,
    className,
    resampleSignal,
    paused = false,
    bloomComponent: BloomComponent
  } = props;
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    setWebgl(isWebGLAvailable());
  }, []);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);
  const wrapperRef = useRef(null);
  const resolveRef = useRef(null);
  const manualRef = useRef(0);
  if (driver.type === "manual") manualRef.current = clamp012(driver.progress);
  const autoplay = driver.type === "autoplay" ? driver : null;
  const playingRef = useRef(false);
  const startMsRef = useRef(null);
  const lastAutoRef = useRef(0);
  useEffect(() => {
    if (!autoplay) return;
    if (autoplay.playOnView === false) {
      playingRef.current = true;
      return;
    }
    const el = wrapperRef.current;
    if (el === null || typeof IntersectionObserver === "undefined") {
      playingRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !playingRef.current) {
            playingRef.current = true;
            startMsRef.current = null;
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay?.playOnView]);
  useEffect(() => {
    if (!autoplay) return;
    startMsRef.current = null;
    lastAutoRef.current = 0;
    if (autoplay.playOnView === false) playingRef.current = true;
  }, [keyframes]);
  const getProgress = useCallback(() => {
    if (driver.type === "manual") return manualRef.current;
    if (driver.type === "autoplay") {
      if (!playingRef.current || typeof performance === "undefined") {
        return lastAutoRef.current;
      }
      if (startMsRef.current === null) startMsRef.current = performance.now();
      const elapsed = (performance.now() - startMsRef.current) / 1e3;
      lastAutoRef.current = computeAutoplayProgress(elapsed, driver);
      return lastAutoRef.current;
    }
    const el = wrapperRef.current;
    if (el === null || typeof window === "undefined") return 0;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    return clamp012(-rect.top / total);
  }, [driver]);
  const resolvedStyle = useMemo(() => {
    const base = PRESETS[preset] ?? PRESETS.default;
    return {
      size: style?.size ?? base.size,
      blend: style?.blend ?? base.blend,
      drift: style?.drift ?? base.drift,
      sparkle: style?.sparkle ?? base.sparkle,
      stagger: style?.stagger ?? base.stagger,
      curl: style?.curl ?? base.curl,
      charOrder: style?.charOrder ?? 0,
      charFont: style?.charFont,
      easing: style?.easing ?? base.easing,
      scatterPattern: style?.scatterPattern ?? base.scatterPattern,
      burst: style?.burst ?? base.burst,
      alphaVar: style?.alphaVar ?? base.alphaVar,
      dof: style?.dof ?? base.dof,
      wave: style?.wave ?? base.wave,
      bloom: style?.bloom ?? base.bloom
    };
  }, [
    preset,
    style?.size,
    style?.blend,
    style?.drift,
    style?.sparkle,
    style?.stagger,
    style?.curl,
    style?.charOrder,
    style?.charFont,
    style?.easing,
    style?.scatterPattern,
    style?.burst,
    style?.alphaVar,
    style?.dof,
    style?.wave,
    style?.bloom
  ]);
  const resolvedColors = useMemo(
    () => ({
      ink: new THREE2.Color(colors?.ink ?? DEFAULT_INK),
      accent: new THREE2.Color(colors?.accent ?? DEFAULT_ACCENT),
      accentRatio: colors?.accentRatio ?? DEFAULT_ACCENT_RATIO
    }),
    [colors?.ink, colors?.accent, colors?.accentRatio]
  );
  const bloomWarningShownRef = useRef(false);
  useEffect(() => {
    const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production";
    if (!isProduction && resolvedStyle.bloom > 0 && !BloomComponent && !bloomWarningShownRef.current) {
      bloomWarningShownRef.current = true;
      console.warn(
        "[glyphdust] bloomComponent \u304C\u6E21\u3055\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001bloom \u7121\u3057\u3067\u63CF\u753B\u3092\u7D9A\u3051\u307E\u3059\u3002 `glyphdust/bloom` \u304B\u3089 BloomEffect \u3092 import \u3057\u3066\u6E21\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      );
    }
  }, [BloomComponent, resolvedStyle.bloom]);
  const particleCount = mobile ? count?.mobile ?? DEFAULT_COUNT_MOBILE : count?.desktop ?? DEFAULT_COUNT_DESKTOP;
  const cameraZ = camera?.z ?? DEFAULT_CAMERA_Z;
  const cameraFov = camera?.fov ?? DEFAULT_CAMERA_FOV;
  const finalKf = keyframes[keyframes.length - 1];
  const hasResolve = finalKf?.type === "text" && finalKf.resolveToDom === true;
  const resolveDomSelector = finalKf?.type === "text" && finalKf.resolveToDom === true && finalKf.domSelector ? finalKf.domSelector : void 0;
  const useOwnOverlay = hasResolve && !resolveDomSelector;
  const resolveText = finalKf?.type === "text" ? finalKf.text.replace(/\n/g, " ") : "";
  if (reduced || !webgl) {
    return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  }
  const scene = /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      Canvas,
      {
        dpr,
        camera: { position: [0, 0, cameraZ], fov: cameraFov },
        gl: { antialias: true, alpha: true, powerPreference: "high-performance" },
        frameloop: paused ? "never" : "always",
        style: { width: "100%", height: "100%" },
        children: [
          /* @__PURE__ */ jsx(ResumeOnUnpause, { paused }),
          /* @__PURE__ */ jsx(
            GlyphPoints,
            {
              keyframes,
              count: particleCount,
              colors: resolvedColors,
              style: resolvedStyle,
              cameraZ,
              cameraFov,
              getProgress,
              timing,
              swapFade,
              swapAt,
              resolveRef: useOwnOverlay ? resolveRef : void 0,
              resolveDomSelector,
              resampleSignal
            }
          ),
          resolvedStyle.bloom > 0 && !mobile && BloomComponent ? /* @__PURE__ */ jsx(BloomComponent, { strength: resolvedStyle.bloom }) : null
        ]
      }
    ),
    useOwnOverlay ? /* @__PURE__ */ jsx(
      "div",
      {
        ref: resolveRef,
        "aria-hidden": "true",
        style: {
          position: "absolute",
          opacity: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          whiteSpace: "nowrap",
          fontWeight: 900,
          color: colors?.ink ?? DEFAULT_INK,
          pointerEvents: "none"
        },
        children: resolveText
      }
    ) : null
  ] });
  if (driver.type === "manual" || driver.type === "autoplay") {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref: wrapperRef,
        className,
        style: { position: "relative", width: "100%", height: "100%" },
        children: scene
      }
    );
  }
  const triggerHeight = driver.triggerHeight ?? DEFAULT_TRIGGER_HEIGHT;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: wrapperRef,
      className,
      style: { position: "relative", height: `${triggerHeight * 100}vh` },
      children: /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            position: "sticky",
            top: 0,
            height: "100vh",
            width: "100%",
            overflow: "hidden"
          },
          children: scene
        }
      )
    }
  );
}

export { GlyphDust };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
