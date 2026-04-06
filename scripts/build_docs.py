#!/usr/bin/env python3
from __future__ import annotations

import html
import shutil
from pathlib import Path

import markdown


ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT / "docs"
BUILD_DIR = ROOT / "local-build"
STYLE = """
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #101317;
  color: #e6edf3;
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

a { color: #7cc7ff; }
a:hover { color: #a6dbff; }

img { vertical-align: middle; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 24px;
  font-size: 14px;
  background: #161b22;
}

th, td {
  border: 1px solid #30363d;
  padding: 8px 10px;
  vertical-align: top;
}

th {
  background: #1f2630;
  position: sticky;
  top: 0;
}

tr:nth-child(even) td {
  background: #11161d;
}

code {
  background: #1f2630;
  padding: 1px 4px;
  border-radius: 4px;
}

blockquote {
  margin-left: 0;
  padding-left: 12px;
  border-left: 3px solid #3d4957;
  color: #b9c3cf;
}

hr {
  border: 0;
  border-top: 1px solid #30363d;
  margin: 24px 0;
}

@media (max-width: 900px) {
  .page {
    padding: 16px 8px 28px;
  }

  table {
    font-size: 12px;
  }

  th, td {
    padding: 6px 7px;
  }
}
"""


def render_page(md_path: Path) -> None:
    source = md_path.read_text(encoding="utf-8")
    body = markdown.markdown(
        source,
        extensions=[
            "tables",
            "fenced_code",
            "sane_lists",
            "md_in_html",
            "nl2br",
        ],
    )
    title = md_path.stem.replace("-", " ").title()
    html_text = f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>{STYLE}</style>
</head>
<body>
  <main class="page">
{body}
  </main>
</body>
</html>
"""
    out_path = BUILD_DIR / f"{md_path.stem}.html"
    out_path.write_text(html_text, encoding="utf-8")


def main() -> None:
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)

    for md_path in sorted(DOCS_DIR.glob("*.md")):
        render_page(md_path)

    if (DOCS_DIR / "resources").exists():
        shutil.copytree(DOCS_DIR / "resources", BUILD_DIR / "resources")

    print(f"Built local HTML into: {BUILD_DIR}")


if __name__ == "__main__":
    main()
