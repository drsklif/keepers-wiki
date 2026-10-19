#!/usr/bin/env python3
"""Download/update Keepers client JS from keepers.mobi.

How scripts are loaded in the game:
  1. keepers.html loads /js/app.js (cache-busted with a random ?v=).
  2. app.js defines app.JS.list (+ lazyList): alias → file + per-module v.
  3. Final URL is file + '?v=' + js.v + '.' + module.v
     e.g. https://keepers.mobi/js/Model.min.js?v=10.0.98.47
  4. keepers.html / app.loadJS* inject <script src=...> dynamically.
  5. TweenMax and socket.io are loaded from /js/libs/... (not in JS.list).

This script refreshes app.js (+ optional keepers.html), downloads every module
listed in app.js into ./js/, and updates the version column in decription.md.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
JS_DIR = ROOT / "js"
DESC_PATH = ROOT / "decription.md"
DEFAULT_BASE = "https://keepers.mobi"

# Extra assets not listed in app.JS.list / lazyList.
# Remote path → local path under js/ (keep historical flat layout).
EXTRA_ASSETS = {
    "/js/libs/gsap/TweenMax.min.js": "TweenMax.min.js",
    "/js/libs/socket.io.v2.2.0.js": "socket.io.v2.2.0.js",
}

USER_AGENT = "keepers-wiki-update-game-js/1.0"


@dataclass
class ModuleEntry:
    alias: str
    remote_path: str  # e.g. /js/Model.min.js
    module_v: str  # e.g. 47
    full_v: str  # e.g. 10.0.98.47
    group: str  # list | lazyList | extra | bootstrap


def fetch(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:12]


def resolve_resource_expr(expr: str, js_min: bool = True) -> str:
    """Resolve _getResourceURL(...) argument expressions used in app.js."""
    expr = " ".join(expr.split())

    def eval_ternary(match: re.Match[str]) -> str:
        cond = match.group(1).strip()
        a = match.group(2).strip().strip("'\"")
        b = match.group(3).strip().strip("'\"")
        cond_py = cond.replace("&&", " and ").replace("||", " or ")
        cond_py = re.sub(r"\btrue\b", "True", cond_py, flags=re.I)
        cond_py = re.sub(r"\bfalse\b", "False", cond_py, flags=re.I)
        cond_py = re.sub(r"\bjs_min\b", "True" if js_min else "False", cond_py)
        try:
            ok = bool(eval(cond_py, {"__builtins__": {}}, {}))
        except Exception:
            ok = js_min
        return repr(a if ok else b)

    rewritten = re.sub(
        r"\(([^?()]+)\?\s*('[^']*'|\"[^\"]*\")\s*:\s*('[^']*'|\"[^\"]*\")\)",
        eval_ternary,
        expr,
    )

    parts: list[str] = []
    for part in rewritten.split("+"):
        p = part.strip()
        if len(p) >= 2 and ((p[0] == p[-1] == "'") or (p[0] == p[-1] == '"')):
            parts.append(p[1:-1])
            continue
        if p.startswith("(") and p.endswith(")"):
            inner = p[1:-1].strip()
            if len(inner) >= 2 and ((inner[0] == inner[-1] == "'") or (inner[0] == inner[-1] == '"')):
                parts.append(inner[1:-1])
                continue
        raise ValueError(f"Cannot resolve resource expression: {expr!r} (stuck on {p!r})")
    return "".join(parts)


def extract_js_block(text: str) -> str:
    """Return source of `var js = { ... };` (brace-balanced)."""
    m = re.search(r"var js\s*=\s*\{", text)
    if not m:
        raise RuntimeError("Cannot find var js = { in app.js")
    start = m.end() - 1
    depth = 0
    in_str = None
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_str:
                in_str = None
            continue
        if ch in ("'", '"', "`"):
            in_str = ch
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise RuntimeError("Unbalanced braces in var js block")


def parse_app_js(text: str) -> tuple[str, list[ModuleEntry]]:
    js_block = extract_js_block(text)
    m = re.search(r"^\{\s*v:\s*'([^']+)'", js_block)
    if not m:
        raise RuntimeError("Cannot find js.v in app.js")
    js_v = m.group(1)

    # Detect production minify flag (test ? 0 : 1 → js_min=1).
    js_min = True
    if re.search(r"let js_min\s*=\s*test\s*\?\s*0\s*:\s*1", text):
        js_min = True
    elif re.search(r"let js_min\s*=\s*0\b", text):
        js_min = False

    pat = re.compile(
        r"\{\s*alias:\s*'([^']+)',\s*file:\s*_getResourceURL\((.*?)\),\s*v:\s*'([^']*)'",
        re.S,
    )

    lazy_pos = js_block.find("lazyList:")
    entries: list[ModuleEntry] = []
    seen: set[str] = set()

    for match in pat.finditer(js_block):
        alias, file_expr, module_v = match.group(1), match.group(2), match.group(3)
        remote_path = resolve_resource_expr(file_expr, js_min=js_min)
        if not remote_path.startswith("/"):
            remote_path = "/" + remote_path.lstrip("/")
        # Cache-bust suffixes like v: '1.' + Math.random() → store as 1
        module_v_clean = module_v.rstrip(".")
        full_v = f"{js_v}.{module_v_clean}"
        group = "lazyList" if lazy_pos != -1 and match.start() >= lazy_pos else "list"
        if remote_path in seen:
            continue
        seen.add(remote_path)
        entries.append(
            ModuleEntry(
                alias=alias,
                remote_path=remote_path,
                module_v=module_v_clean,
                full_v=full_v,
                group=group,
            )
        )

    if not entries:
        raise RuntimeError("No module entries parsed from app.js")
    return js_v, entries


def write_bytes(path: Path, data: bytes, dry_run: bool) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        old = path.read_bytes()
        if old == data:
            return "unchanged"
        status = "updated"
    else:
        status = "created"
    if not dry_run:
        path.write_bytes(data)
    return status


def _strip_md_cell(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == "`" and value[-1] == "`":
        return value[1:-1].strip()
    return value


def _looks_like_version(value: str) -> bool:
    return bool(re.fullmatch(r"[\d.*]+|—|-|\?", value.strip()))


def _parse_desc_table(text: str) -> dict[str, str]:
    """Parse file→description from a modules markdown table (2 or 3 columns)."""
    old_desc: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("| `js/"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        file_cell = _strip_md_cell(cells[0])
        if len(cells) >= 3 and _looks_like_version(_strip_md_cell(cells[1])):
            desc = cells[2].strip()
        else:
            desc = cells[1].strip()
        # Ignore corrupted rows where description collapsed to a version token.
        if not desc or _looks_like_version(_strip_md_cell(desc)):
            continue
        old_desc[file_cell] = desc
    return old_desc


def _load_seed_descriptions() -> dict[str, str]:
    """Prefer committed decription.md descriptions as a stable seed."""
    import subprocess

    try:
        raw = subprocess.check_output(
            ["git", "show", "HEAD:decription.md"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
        return _parse_desc_table(raw.decode("utf-8"))
    except Exception:
        return {}


def update_description_table(entries: list[ModuleEntry], js_v: str, dry_run: bool) -> None:
    if not DESC_PATH.exists():
        print(f"Skip docs: {DESC_PATH} not found")
        return

    text = DESC_PATH.read_text(encoding="utf-8")
    seed = _load_seed_descriptions()
    old_desc = {**seed, **_parse_desc_table(text)}

    # Bootstrap / extras with sensible defaults.
    defaults = {
        "js/app.js": "Главный загрузчик: определяет платформу/ресурсный хост, список модулей (alias → путь/версия), динамическая загрузка JS/CSS, инициализация приложения.",
        "js/TweenMax.min.js": "GSAP TweenMax для анимаций (грузится из /js/libs/gsap/TweenMax.min.js).",
        "js/socket.io.v2.2.0.js": "Клиентская библиотека socket.io v2.2.0 (грузится из /js/libs/socket.io.v2.2.0.js).",
        "js/Network_4.js": "Сетевой слой (socket.io/websocket): отправка `command`, приём `events`, авторизация, реконнект, доставка данных в `Model`.",
        "js/Network_4.min.js": "Сетевой слой (socket.io/websocket): отправка `command`, приём `events`, авторизация, реконнект, доставка данных в `Model`.",
        "js/CFGUtil.min.js": "Справочники/хелперы поверх `app.Model.cfg`: карты, предметы, квесты, достижения, подземелья, мощь карт.",
        "js/Popups2.js": "Дополнительный менеджер/набор попапов (рядом с `Popups`).",
    }

    def _is_placeholder_desc(desc: str) -> bool:
        return bool(re.match(r"^Модуль `[^`]+` \((eager|lazy)-загрузка из app\.js\)\.$", desc.strip()))

    def resolve_desc(file_key: str, *aliases: str) -> str:
        # Prefer explicit defaults over auto-generated placeholders.
        for key in (file_key, *aliases):
            if key in defaults:
                return defaults[key]
        for key in (file_key, *aliases):
            desc = old_desc.get(key)
            if desc and not _looks_like_version(_strip_md_cell(desc)) and not _is_placeholder_desc(desc):
                return desc
        return ""

    rows: list[tuple[str, str, str]] = []
    # app.js first
    rows.append(("js/app.js", js_v, resolve_desc("js/app.js") or defaults["js/app.js"]))

    for e in entries:
        local_name = Path(e.remote_path).name
        file_key = f"js/{local_name}"
        desc = resolve_desc(file_key, f"js/{e.alias}.min.js", f"js/{e.alias}.js")
        if not desc:
            kind = "eager" if e.group == "list" else "lazy"
            desc = f"Модуль `{e.alias}` ({kind}-загрузка из app.js)."
        rows.append((file_key, e.full_v, desc))

    for remote, local_name in EXTRA_ASSETS.items():
        file_key = f"js/{local_name}"
        rows.append(
            (
                file_key,
                "—",
                resolve_desc(file_key) or defaults.get(file_key, f"Доп. ресурс `{remote}`."),
            )
        )

    # Keep previously documented files that are no longer in app.js (except superseded twins).
    known = {r[0] for r in rows}
    known_stems = {Path(k).stem.replace(".min", "") for k in known}
    for file_key, desc in old_desc.items():
        if file_key in known:
            continue
        stem = Path(file_key).stem.replace(".min", "")
        if stem in known_stems:
            # e.g. Network_4.min.js superseded by Network_4.js
            continue
        if _looks_like_version(_strip_md_cell(desc)):
            continue
        rows.append((file_key, "?", desc + " _(нет в текущем app.js)_"))

    header = (
        "## Таблица модулей (папка `js/`)\n"
        "\n"
        f"Глобальная версия клиента (`app.JS.v`): `{js_v}`. "
        "Полная версия модуля в URL: `?v=<JS.v>.<module.v>`.\n"
        "\n"
        "| Файл | Версия | Примерное назначение |\n"
        "|---|---|---|\n"
    )
    body = "".join(f"| `{f}` | `{v}` | {d} |\n" for f, v, d in rows)

    # Replace from the modules heading through the blank line before the next ## section,
    # but keep the explanatory paragraph that used to follow the table if present.
    start = text.find("## Таблица модулей")
    if start == -1:
        print("Skip docs: modules table heading not found")
        return

    # Find next level-2 heading after the table section.
    rest = text[start + 2 :]
    next_h = re.search(r"\n## ", rest)
    if next_h:
        end = start + 2 + next_h.start() + 1
        after = text[end:]
    else:
        after = ""

    # Preserve trailing note that starts with "Если в дальнейшем" if it existed.
    note_match = re.search(
        r"\nЕсли в дальнейшем нужно будет уточнить[\s\S]*?(?=\n## |\Z)",
        text[start:],
    )
    note = ""
    if note_match:
        note = note_match.group(0).rstrip() + "\n"

    # Prefer regenerating a short loader note instead of the old one if missing.
    if not note:
        note = (
            "\nКак подключаются скрипты: `keepers.html` → `app.js` → `app.loadJS` / "
            "`app.loadJSAll` / `app.loadJS1` динамически вставляют "
            "`<script src=\"...js?v=<JS.v>.<module.v>\">`. "
            "Список alias/путь/версия живёт в `app.JS.list` и `app.JS.lazyList`.\n"
            "\n"
            "Если в дальнейшем нужно будет уточнить “назначение” конкретного "
            "минифицированного файла, быстрее всего идти от `app.js` (какой alias "
            "грузится где) и от сетевых `cmd`/`events` (какие команды вызывает модуль).\n"
        )

    new_text = text[:start] + header + body + note + "\n" + after.lstrip("\n")
    # Collapse excessive blank lines
    new_text = re.sub(r"\n{3,}", "\n\n", new_text)

    if dry_run:
        print(f"Would update {DESC_PATH} ({len(rows)} rows)")
        return
    DESC_PATH.write_text(new_text, encoding="utf-8")
    print(f"Updated {DESC_PATH} ({len(rows)} rows)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=DEFAULT_BASE, help=f"Game origin (default: {DEFAULT_BASE})")
    parser.add_argument("--dry-run", action="store_true", help="Parse/list only; do not write files")
    parser.add_argument("--skip-html", action="store_true", help="Do not refresh keepers.html")
    parser.add_argument("--skip-docs", action="store_true", help="Do not update decription.md")
    parser.add_argument("--docs-only", action="store_true", help="Only refresh decription.md from local js/app.js")
    parser.add_argument("--list-only", action="store_true", help="Only print module list from remote app.js")
    parser.add_argument("--core-only", action="store_true", help="Download only app.JS.list (skip lazyList)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    JS_DIR.mkdir(parents=True, exist_ok=True)

    if args.docs_only:
        app_text = (JS_DIR / "app.js").read_text(encoding="utf-8")
        js_v, entries = parse_app_js(app_text)
        if args.core_only:
            entries = [e for e in entries if e.group == "list"]
        print(f"app.JS.v = {js_v}")
        print(f"modules  = {len(entries)} (from local js/app.js)")
        update_description_table(entries, js_v, args.dry_run)
        return 0

    print(f"Fetching {base}/js/app.js ...")
    try:
        app_bytes = fetch(f"{base}/js/app.js")
    except urllib.error.URLError as err:
        print(f"Failed to fetch app.js: {err}", file=sys.stderr)
        return 1

    app_text = app_bytes.decode("utf-8", errors="replace")
    js_v, entries = parse_app_js(app_text)
    if args.core_only:
        entries = [e for e in entries if e.group == "list"]

    print(f"app.JS.v = {js_v}")
    print(f"modules  = {len(entries)} (list + lazyList)")

    if args.list_only:
        for e in entries:
            print(f"  [{e.group:8}] {e.alias:20} {e.remote_path:40} v={e.full_v}")
        return 0

    # keepers.html
    if not args.skip_html:
        html_url = f"{base}/"
        print(f"Fetching {html_url} → keepers.html ...")
        try:
            html_bytes = fetch(html_url)
            status = write_bytes(ROOT / "keepers.html", html_bytes, args.dry_run)
            print(f"  keepers.html: {status} ({len(html_bytes)} bytes, sha={sha256(html_bytes)})")
        except urllib.error.URLError as err:
            print(f"  keepers.html: FAILED ({err})")

    # app.js
    status = write_bytes(JS_DIR / "app.js", app_bytes, args.dry_run)
    print(f"  js/app.js: {status} ({len(app_bytes)} bytes, sha={sha256(app_bytes)})")

    ok = 0
    fail = 0
    for e in entries:
        local_name = Path(e.remote_path).name
        local_path = JS_DIR / local_name
        url = f"{base}{e.remote_path}?v={e.full_v}"
        try:
            data = fetch(url)
            status = write_bytes(local_path, data, args.dry_run)
            print(f"  {local_name}: {status} [{e.alias}] v={e.full_v} ({len(data)} bytes)")
            ok += 1
        except urllib.error.URLError as err:
            print(f"  {local_name}: FAILED [{e.alias}] {url} ({err})")
            fail += 1

    for remote_path, local_name in EXTRA_ASSETS.items():
        url = f"{base}{remote_path}"
        local_path = JS_DIR / local_name
        try:
            data = fetch(url)
            status = write_bytes(local_path, data, args.dry_run)
            print(f"  {local_name}: {status} [extra] ({len(data)} bytes)")
            ok += 1
        except urllib.error.URLError as err:
            print(f"  {local_name}: FAILED [extra] {url} ({err})")
            fail += 1

    if not args.skip_docs:
        update_description_table(entries, js_v, args.dry_run)

    print(f"Done. ok={ok} fail={fail} dry_run={args.dry_run}")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
