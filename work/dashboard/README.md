# Dashboard

`index.html` contains two views: `실사비교` and `해부학•도형화`.

The existing anatomy topic data, iframe sandbox and saved topic state remain in the hub. Region builders can still update their entries in `anatomy-data`.

Photo assets are selected in `assets.json`. `package_photos.py` copies the selected imagegen PNG files into `assets/photo-comparison/` and encodes WebP previews and thumbnails. It writes `photos.json` for the dashboard.

A null `sketch` displays the original photo without comparison controls. `new-photos.json` and `new-photo-prompts.json` record the nine-photo addition and the generated/blocked results. On mobile, anatomy regions and comparison photos both use horizontally scrolling selection rows.

The current release contains nine corrected raster studies. The six previously blocked studies and the front-standing torso study whose correction was blocked are excluded. Temporary SVG replacements are not published. `corrections.json` records the built-in image generation correction prompts and selected outputs.

The selected originals and corrected sketch PNGs live in `assets/photo-comparison/`. `assets.json` uses project-relative paths so the release can be rebuilt without the author's local generated-image folder. WebP URLs include a content hash to refresh updated images in cached browsers.

Supplied comparison sheets can use `originalRect` and `sketchRect` as `[x, y, width, height]` source pixel rectangles. Packaging keeps the sheet unchanged and records `sourceSize`; the viewer clips each rectangle inside the comparison frame. Current character entries use the separately supplied original/sketch images.

After changing photo assets or dashboard source:

Generated raster studies have muscle callouts in `muscle-labels.json`. The dashboard builder embeds these into photo data; `controls.js` reveals complete callouts only on the sketch side of the wipe. Uncertain subdivisions are deliberately left unnamed. See `PHOTO_ANATOMY_REVIEW.md` for the initial review, corrections and verification limits. Changing callouts only requires running `build.py`, without repackaging images.

```powershell
python -X utf8 work/dashboard/package_photos.py
python -X utf8 work/dashboard/build.py
```

`build.py` replaces only its marked dashboard wrappers, style, photo data and controls. It preserves the embedded anatomy documents. The first integration also saves the prior hub to `artifacts/pre-dashboard-index.html`.
