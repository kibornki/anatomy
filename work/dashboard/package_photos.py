"""Copy selected imagegen assets and encode web previews without changing their content."""
from pathlib import Path
import json
import shutil
import hashlib
import xml.etree.ElementTree as ET
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'assets/photo-comparison'
OUT.mkdir(parents=True, exist_ok=True)
studies = json.loads((HERE / 'assets.json').read_text(encoding='utf-8'))
photos = []

def asset_url(path):
    version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return path.relative_to(ROOT).as_posix() + '?v=' + version

def preview(source, target, bounds, quality):
    with Image.open(source) as image:
        image = image.convert('RGBA')
        image.thumbnail(bounds, Image.Resampling.LANCZOS)
        image.save(target, format='WEBP', quality=quality, method=6)

for study in studies:
    key = study['id']
    urls = {}
    for kind in ('original', 'sketch'):
        if not study.get(kind):
            continue
        source = Path(study[kind])
        if not source.is_absolute():
            source = ROOT / source
        if source.suffix.lower() == '.svg':
            shutil.copy2(source, OUT / f'{key}-{kind}.svg')
            urls[kind] = f'assets/photo-comparison/{key}-{kind}.svg'
            continue
        if source.suffix.lower() == '.png':
            target = OUT / f'{key}-{kind}.png'
            if source.resolve() != target.resolve():
                shutil.copy2(source, target)
        else:
            with Image.open(source) as image:
                image.convert('RGBA').save(OUT / f'{key}-{kind}.png')
        preview(source, OUT / f'{key}-{kind}.webp', (1200, 1200), 88)
        urls[kind] = asset_url(OUT / f'{key}-{kind}.webp')
    original_path = Path(study['original'])
    if not original_path.is_absolute():
        original_path = ROOT / original_path
    if Path(study['original']).suffix.lower() == '.svg':
        svg = ET.parse(original_path).getroot()
        width, height = float(svg.attrib['width']), float(svg.attrib['height'])
        thumbnail = urls['original']
    else:
        preview(original_path, OUT / f'{key}-thumb.webp', (160, 160), 84)
        with Image.open(original_path) as image:
            width, height = image.size
        thumbnail = asset_url(OUT / f'{key}-thumb.webp')
    photos.append(dict(id=key, label=study['label'], detail=study['detail'], width=width, height=height,
        cropTop=study.get('cropTop', 0), original=urls['original'],
        sketch=urls.get('sketch'), thumbnail=thumbnail))

(HERE / 'photos.json').write_text(json.dumps(photos, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Packaged {len(photos)} photo studies into {OUT}')
