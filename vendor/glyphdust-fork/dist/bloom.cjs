'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var postprocessing = require('@react-three/postprocessing');
var jsxRuntime = require('react/jsx-runtime');

// src/BloomEffect.tsx
function BloomEffect({ strength }) {
  return /* @__PURE__ */ jsxRuntime.jsx(postprocessing.EffectComposer, { multisampling: 0, children: /* @__PURE__ */ jsxRuntime.jsx(
    postprocessing.Bloom,
    {
      mipmapBlur: true,
      intensity: 1.6 * strength,
      luminanceThreshold: 0.85,
      luminanceSmoothing: 0.2
    }
  ) });
}

exports.BloomEffect = BloomEffect;
exports.default = BloomEffect;
//# sourceMappingURL=bloom.cjs.map
//# sourceMappingURL=bloom.cjs.map