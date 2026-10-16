# Dashboard

`index.html` contains three views: `실사비교`, `카툰비교` and `해부학•도형화`. Studies whose IDs begin with `figure-` (illustrations and figurines) appear only in `카툰비교`; the other studies appear in `실사비교`. Both comparison tabs share the wipe viewer and remember their selected study separately.

The existing anatomy topic data, iframe sandbox and saved topic state remain in the hub. Region builders can still update their entries in `anatomy-data`.

Photo assets are selected in `assets.json`. `package_photos.py` copies the selected imagegen PNG files into `assets/photo-comparison/` and encodes WebP previews and thumbnails. It writes `photos.json` for the dashboard.

A null `sketch` displays the original photo without comparison controls. `new-photos.json` and `new-photo-prompts.json` record the nine-photo addition and the generated/blocked results. On mobile, anatomy regions and comparison photos both use horizontally scrolling selection rows.

The current release contains nine corrected raster studies. The six previously blocked studies and the front-standing torso study whose correction was blocked are excluded. Temporary SVG replacements are not published. `corrections.json` records the built-in image generation correction prompts and selected outputs.

The selected originals and corrected sketch PNGs live in `assets/photo-comparison/`. `assets.json` uses project-relative paths so the release can be rebuilt without the author's local generated-image folder. WebP URLs include a content hash to refresh updated images in cached browsers.

Supplied comparison sheets can use `originalRect` and `sketchRect` as `[x, y, width, height]` source pixel rectangles. Packaging keeps the sheet unchanged and records `sourceSize`; the viewer clips each rectangle inside the comparison frame. Current character entries use the separately supplied original/sketch images.

After changing photo assets or dashboard source:

Muscle-name callouts are not displayed in the dashboard tabs. Bone landmark labels remain available in the anatomy controls.

```powershell
python -X utf8 work/dashboard/package_photos.py
python -X utf8 work/dashboard/build.py
```

`build.py` replaces only its marked dashboard wrappers, style, photo data and controls. It preserves the embedded anatomy documents. The first integration also saves the prior hub to `artifacts/pre-dashboard-index.html`.
