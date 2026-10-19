"""Fetch pinned upstream training data for local/CI use, checking its identity.

Dataset licensing is independent of the application's MIT license. Review the
publisher's terms before using or redistributing the datasets.
"""
import hashlib
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com/shlokkvaishnav/cardiovascular-risk/1308460473b9f67eeb8fe5513c1540cbad393a8f/backend/data/raw/"
FILES = {
    "cardio_train.csv": "bdeea79d8f231af1df97bddef9564f3d11f86f1932901d04cbedd7d346138c60",
    "heart_disease_uci.csv": "b18caa153d90782e01f83d794ac28e044f53c6d848c028a27c94de500fa16263",
}

if __name__ == "__main__":
    for name, expected in FILES.items():
        destination = ROOT / "backend/data/raw" / name
        data = destination.read_bytes() if destination.exists() else urlopen(BASE + name, timeout=60).read()
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError(f"Dataset checksum mismatch: {name}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            destination.write_bytes(data)
        print(f"Verified {name}")
