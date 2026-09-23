import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { jsx } from 'react/jsx-runtime';

// src/BloomEffect.tsx
function BloomEffect({ strength }) {
  return /* @__PURE__ */ jsx(EffectComposer, { multisampling: 0, children: /* @__PURE__ */ jsx(
    Bloom,
    {
      mipmapBlur: true,
      intensity: 1.6 * strength,
      luminanceThreshold: 0.85,
      luminanceSmoothing: 0.2
    }
  ) });
}

export { BloomEffect, BloomEffect as default };
//# sourceMappingURL=bloom.js.map
//# sourceMappingURL=bloom.js.map