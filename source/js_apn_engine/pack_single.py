# pack_single.py
from pathlib import Path
import subprocess, sys, re, tempfile

ROOT = Path(__file__).parent.resolve()
INDEX = ROOT / "index.html"
CSS   = ROOT / "styles.css"
MAIN  = ROOT / "main.js"
DEFS  = ROOT / "defaults.js"
SNOW  = ROOT / "snowflake.js"
OUT   = ROOT / "tower.html"
BUND  = ROOT / "bundle.inline.js"

def run(cmd):
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        print("Command failed:", " ".join(cmd))
        sys.exit(1)

def abs_posix(p: Path) -> str:
    # Absolute filesystem path in POSIX form (works on macOS/Linux; esbuild accepts on Windows too)
    return p.resolve().as_posix()

def build_bundle():
    if not MAIN.exists():
        print("main.js not found"); sys.exit(1)

    # Build a temporary entry that imports ABSOLUTE paths (not file:// URLs)
    imports = []
    if DEFS.exists():
        imports.append(f'import "{abs_posix(DEFS)}";')

    if SNOW.exists():
        imports.append(f'import "{abs_posix(SNOW)}";')

    imports.append(f'import "{abs_posix(MAIN)}";')
    entry_code = "\n".join(imports) + "\n"

    with tempfile.TemporaryDirectory() as td:
        entry_path = Path(td) / "entry.bundle.js"
        entry_path.write_text(entry_code, encoding="utf-8")

        cmd = [
            "npx", "esbuild", abs_posix(entry_path),
            "--bundle",
            "--format=iife",
            "--minify",
            f"--outfile={abs_posix(BUND)}",
            "--log-level=warning",
        ]
        run(cmd)

def inline_everything():
    if not INDEX.exists():
        print("index.html not found"); sys.exit(1)
    html = INDEX.read_text(encoding="utf-8")
    css  = CSS.read_text(encoding="utf-8") if CSS.exists() else ""
    js   = BUND.read_text(encoding="utf-8")

    # Remove any <link ... styles.css ...>
    link_re = re.compile(r'<link\b[^>]*href=["\']\.?/styles\.css["\'][^>]*\/?>', re.I)
    html, _ = link_re.subn("", html)

    # Remove module script tags that reference main.js or defaults.js
    script_mod_re = re.compile(
        r'<script\b(?=[^>]*\btype\s*=\s*["\']module["\'])[^>]*\bsrc\s*=\s*["\']\.?/(?:main|defaults)\.js["\'][^>]*>\s*</script\s*>',
        re.I | re.S
    )
    html, _ = script_mod_re.subn("", html)

    # Inline CSS before </head> (or prepend if no head)
    if css:
        style_tag = f"<style>\n{css}\n</style>"
        if re.search(r'</head\s*>', html, re.I):
            html = re.sub(r'</head\s*>',
                          lambda m: style_tag + "\n" + m.group(0),
                          html, count=1, flags=re.I)
        else:
            html = style_tag + "\n" + html

    # Inline bundled JS before </body> (or append if no body)
    script_tag = f"<script>\n{js}\n</script>"
    if re.search(r'</body\s*>', html, re.I):
        html = re.sub(r'</body\s*>',
                      lambda m: script_tag + "\n" + m.group(0),
                      html, count=1, flags=re.I)
    else:
        html = html + "\n" + script_tag

    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT}")

def main():
    build_bundle()
    inline_everything()

if __name__ == "__main__":
    main()