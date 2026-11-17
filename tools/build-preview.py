#!/usr/bin/env python3
"""Genera ABRIR-WEB-CLUB-VOLEIBOL.html: la web completa en un solo archivo.

Uso:
    python3 tools/build-preview.py

Coge index.html, styles.css, script.js y assets/favicon.svg y crea una copia
autocontenida que se puede abrir con doble clic, sin servidor local.
"""

from pathlib import Path
import base64
import hashlib
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ABRIR-WEB-CLUB-VOLEIBOL.html"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def csp_hash(text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


def update_csp(html: str) -> str:
    """Adapta la CSP de la portada al archivo único.

    En la web normal el CSS y el JavaScript son archivos aparte; aquí van
    incrustados, así que la política debe autorizar sus hashes exactos.
    """
    scripts = [m.group(1) for m in re.finditer(r"<script>(.*?)</script>", html, re.S)]
    styles = [m.group(1) for m in re.finditer(r"<style>(.*?)</style>", html, re.S)]
    script_src = " ".join(["'self'"] + [csp_hash(item) for item in scripts])
    style_src = " ".join(["'self'", "https://fonts.googleapis.com"] + [csp_hash(item) for item in styles])
    policy = (
        f"default-src 'self'; script-src {script_src}; style-src {style_src}; "
        "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; "
        "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; "
        "frame-src https://www.youtube-nocookie.com; object-src 'none'; "
        "base-uri 'self'; form-action 'none'; upgrade-insecure-requests"
    )
    pattern = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(">)')
    if not pattern.search(html):
        raise SystemExit("No se encontró la meta CSP en index.html")
    return pattern.sub(lambda m: m.group(1) + policy + m.group(3), html, count=1)


def main() -> None:
    html = read(ROOT / "index.html")
    css = read(ROOT / "styles.css")
    js = read(ROOT / "script.js")
    favicon = base64.b64encode((ROOT / "assets" / "favicon.svg").read_bytes()).decode("ascii")

    html = html.replace(
        '<html lang="es" class="no-js">',
        '<html lang="es" class="no-js">\n<!-- Vista previa autocontenida: CSS, JavaScript y favicon van dentro del archivo. -->',
        1,
    )

    html = html.replace(
        '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
        f'<link rel="icon" href="data:image/svg+xml;base64,{favicon}" type="image/svg+xml">',
        1,
    )

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        f"<style>\n{css}\n</style>",
        1,
    )

    html = html.replace(
        '<script src="script.js"></script>',
        f"<script>\n{js}\n</script>",
        1,
    )

    remaining = sorted(set(re.findall(r'(?:src|href)="(assets/[^"]+)"', html)))
    if remaining:
        raise SystemExit("Quedan referencias a assets/: " + ", ".join(remaining))

    html = update_csp(html)

    OUT.write_text(html, encoding="utf-8")
    print(f"Creado {OUT.name} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
