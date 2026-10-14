# Operations original UI

Case route: `/work/operations-platform`.

The Vue component source is copied unchanged from the user-supplied `heyispace-handoff-20261008.zip`, `frontend/src/components/ui/`. The snapshot is based on HEAD `e63b961` and includes the uncommitted Reui components. The surrounding portfolio remains React; `controls.js` mounts Vue control instances, synchronizes values and events, and unmounts them when the page leaves. `theme.css` adapts the components to the approved case palette.

Versions match the source lock: Vue 3.5.22, Element Plus 2.11.4, Vite 5.4.20, plugin-vue 4.6.2. No production backend or original authentication is imported.

Reused controls: ReuiMultiSelect, ReuiInputField, ReuiPagination, Element Plus Select/Option, Autocomplete, DatePicker, Upload/Button and the Chinese ConfigProvider.

Restore and rebuild:

```
npm --prefix vendor/operations-ui ci
npm run build:operations-ui
```

The generated `public/work/operations-platform/controls/` JS/CSS are checked-in assets, so ordinary site builds need no extra compiler. The component build also writes `THIRD-PARTY-LICENSES.txt` from installed package licenses. The runtime loads only on this case page and respects `NEXT_PUBLIC_BASE_PATH`. Attachments only keep filenames in demo state; auto-upload is disabled.

Copied source verification:

- `ReuiInputField.vue` SHA-256 `8d14d35c28266bc6886db9a0d2d27bebb05ae9b01f53a72283f63fac4a37cf09`
- `ReuiMultiSelect.vue` SHA-256 `597a53968e0f60cfae56cb5e0a5b73e9a13e200649c66fd60042db3e566b80c5`
- `ReuiPagination.vue` SHA-256 `b103db7377c0232cf52577105a5710f25e4675ce64d8f9a75c6e7d3f7b4b4bef`
