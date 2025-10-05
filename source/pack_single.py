# pack_single.py
from pathlib import Path
import subprocess
import sys
import re

ROOT = Path(__file__).parent.resolve()

INDEX = ROOT / "index.html"
CSS   = ROOT / "styles.css"
ENTRY = ROOT / "main.js"
BUND  = ROOT / "bundle.inline.js"
OUT   = ROOT / "single.html"

def run(cmd):
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print("Command failed:", " ".join(cmd))
        sys.exit(1)

def main():
    if not INDEX.exists():
        print("index.html not found"); sys.exit(1)
    if not ENTRY.exists():
        print("main.js not found"); sys.exit(1)

    # 1) Bundle JS (follows all imports)
    run(["npx", "esbuild", str(ENTRY), "--bundle", "--format=iife", "--minify", f"--outfile={BUND}"])

    html = INDEX.read_text(encoding="utf-8")
    css  = CSS.read_text(encoding="utf-8") if CSS.exists() else ""
    js   = BUND.read_text(encoding="utf-8")

    # 2) Remove <link ... styles.css ...> if present
    link_re = re.compile(r'<link\b[^>]*href=["\']\.?/styles\.css["\'][^>]*\/?>', re.I)
    html, n_links = link_re.subn("", html)

    # 3) Remove <script type="module" src="./main.js"></script> (any spacing/attrs)
    script_mod_re = re.compile(
        r'<script\b(?=[^>]*\btype\s*=\s*["\']module["\'])(?=[^>]*\bsrc\s*=\s*["\']\.?/main\.js["\'])[^>]*>\s*</script\s*>',
        re.I | re.S
    )
    html, n_scripts = script_mod_re.subn("", html)

    # 4) Inline CSS before </head> (or prepend if no head)
    style_tag = f"<style>\n{css}\n</style>" if css else ""
    if style_tag:
        if re.search(r'</head\s*>', html, re.I):
            html = re.sub(r'</head\s*>', lambda m: style_tag + "\n" + m.group(0), html, count=1, flags=re.I)
        else:
            html = style_tag + "\n" + html

    # 5) Inline bundled JS before </body> (or append if no body)
    script_tag = f"<script>\n{js}\n</script>"
    if re.search(r'</body\s*>', html, re.I):
        html = re.sub(r'</body\s*>', lambda m: script_tag + "\n" + m.group(0), html, count=1, flags=re.I)
    else:
        html = html + "\n" + script_tag

    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
