#!/usr/bin/env python3
import base64
import gzip
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "index.html",
    "sources.html",
    "comparison.html",
    "timeline.html",
    "assets/site.css",
    "assets/site.js",
    "assets/data.js",
    "assets/hk-institutional-hub.svg",
    "themes/gba-rules-alignment.html",
]

THEME_SLUGS = [
    "history",
    "one-country-two-systems",
    "international-status",
    "institutional-advantages",
    "mainland-cooperation",
    "gba-rules-alignment",
    "comparison-platforms",
    "leadership-discourse",
]

SOURCE_TYPES = [
    "法律法规",
    "政策文件讲话",
    "学术理论",
    "制度分析",
    "政策报告",
    "重大事件和新闻",
]

CONFIDENTIAL_PATTERNS = [
    "研究计划书",
    "本课题研究附件",
    "本地研究附件",
    "本课题计划书",
    "研究计划_",
    "一国两制与香港国际定位_修订稿",
    "新时代香港国际定位",
]


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        attrs_dict = dict(attrs)
        href = attrs_dict.get("href")
        if href:
            self.links.append(href)


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def extract_data():
    text = read("assets/data.js")
    match = re.search(
        r"window\.siteData\s*=\s*(\{.*?\});\s*$",
        text,
        flags=re.S,
    )
    if match:
        return json.loads(match.group(1))

    payload_parts = sorted((ROOT / "assets").glob("data-payload-*.txt"))
    if payload_parts:
        payload = "".join(path.read_text(encoding="utf-8") for path in payload_parts)
        return json.loads(gzip.decompress(base64.b64decode(payload)).decode("utf-8"))

    script = """
global.window = {};
eval(require("fs").readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(global.window.siteData));
"""
    result = subprocess.run(
        ["node", "-e", script],
        input=text,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_required_files_exist():
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    assert not missing, f"Missing required files: {missing}"


def test_theme_pages_exist_and_include_evidence_categories():
    for slug in THEME_SLUGS:
        path = f"themes/{slug}.html"
        assert (ROOT / path).exists(), f"Missing theme page: {path}"
        html = read(path)
        assert 'class="theme-page"' in html, f"{path} must use theme-page layout"
        for source_type in SOURCE_TYPES:
            assert source_type in html, f"{path} missing evidence category {source_type}"


def test_data_schema_and_minimum_content():
    data = extract_data()
    assert len(data["themes"]) == 8
    assert len(data["sources"]) >= 290
    assert len(data["events"]) >= 55
    assert len(data["comparisons"]) == 6
    seen_titles = set()
    for source in data["sources"]:
        for key in ["type", "title", "date", "publisher", "url", "tags", "usedFor", "note"]:
            assert key in source, f"Source missing key {key}: {source}"
        assert source["type"] in SOURCE_TYPES
        assert source["title"]
        assert source["title"] not in seen_titles, f"Duplicate source title: {source['title']}"
        seen_titles.add(source["title"])
        assert source["url"].startswith(("https://", "../")), source["url"]
    for theme in THEME_SLUGS:
        theme_types = {
            source["type"]
            for source in data["sources"]
            if theme in source["usedFor"]
        }
        missing_types = set(SOURCE_TYPES) - theme_types
        assert not missing_types, f"{theme} missing source types: {sorted(missing_types)}"
    english_sources = [
        source for source in data["sources"] if "英文资料" in source["tags"]
    ]
    journal_sources = [
        source for source in data["sources"] if "学术期刊" in source["tags"]
    ]
    assert len(english_sources) >= 150, f"Need at least 150 English sources, found {len(english_sources)}"
    assert len(journal_sources) >= 75, f"Need at least 75 journal sources, found {len(journal_sources)}"
    gba_sources = [
        source for source in data["sources"] if "gba-rules-alignment" in source["usedFor"]
    ]
    assert len(gba_sources) >= 35, f"Need at least 35 GBA alignment sources, found {len(gba_sources)}"


def test_confidential_research_plan_is_not_publicly_exposed():
    public_files = (
        list(ROOT.glob("*.html"))
        + list((ROOT / "themes").glob("*.html"))
        + [
            ROOT / "assets" / "data.js",
            ROOT / "assets" / "site.js",
            ROOT / "assets" / "site.css",
        ]
    )
    for path in public_files:
        text = path.read_text(encoding="utf-8")
        for pattern in CONFIDENTIAL_PATTERNS:
            assert pattern not in text, (
                f"Confidential pattern {pattern} leaked in {path.relative_to(ROOT)}"
            )

    data = extract_data()
    for source in data["sources"]:
        source_text = " ".join(
            str(source.get(key, ""))
            for key in ["title", "publisher", "url", "note"]
        )
        for pattern in CONFIDENTIAL_PATTERNS:
            assert pattern not in source_text, (
                f"Confidential source leaked: {source['title']}"
            )


def test_internal_links_resolve():
    html_files = list(ROOT.glob("*.html")) + list((ROOT / "themes").glob("*.html"))
    assert html_files, "No HTML files found"
    for path in html_files:
        parser = LinkParser()
        parser.feed(path.read_text(encoding="utf-8"))
        for href in parser.links:
            if href.startswith(("http://", "https://", "mailto:", "#")):
                continue
            target = (path.parent / href.split("#", 1)[0]).resolve()
            assert target.exists(), f"Broken internal link in {path.name}: {href}"


def test_responsive_and_accessibility_basics():
    css = read("assets/site.css")
    assert "@media" in css
    assert "max-width: 760px" in css
    for path in ["index.html", "sources.html", "comparison.html", "timeline.html"]:
        html = read(path)
        assert '<meta name="viewport"' in html
        assert "<title>" in html
        assert 'aria-label="主导航"' in html


if __name__ == "__main__":
    tests = [
        test_required_files_exist,
        test_theme_pages_exist_and_include_evidence_categories,
        test_data_schema_and_minimum_content,
        test_confidential_research_plan_is_not_publicly_exposed,
        test_internal_links_resolve,
        test_responsive_and_accessibility_basics,
    ]
    for test in tests:
        test()
    print(f"{len(tests)} validation checks passed")
