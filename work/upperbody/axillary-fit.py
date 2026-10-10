"""Rebuild the authored axillary route and the surrounding tissue order."""
from pathlib import Path
import json
import runpy


def main():
    root = Path(__file__).parent
    runpy.run_path(str(root / 'axillary-route-fit.py'))['main']()
    runpy.run_path(str(root / 'axillary-wrap-fit.py'))['main']()
    runpy.run_path(str(root / 'face-clearance.py'))['main']()
    path = root / 'atlas-data.json'
    data = json.loads(path.read_text())
    data['axillaryFoldConstraint'] = (
        'Medial native latissimus sheet deep to lower trapezius; lateral free '
        'belly superficial to posterior-inferior serratus; proximal tendon '
        'anterior to teres major toward the native humeral band. Pose-relative '
        'authored tissue-order and contact constraints, not measured physiology.'
    )
    path.write_text(json.dumps(data, separators=(',', ':')))


if __name__ == '__main__':
    main()
