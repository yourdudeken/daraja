#!/usr/bin/env python3
"""Scrape Safaricom Daraja API docs into a local markdown archive.

The source of truth for the documentation URLs lives in api_links.json. The
scraper reads the canonical list, downloads each page, converts the HTML into
Markdown, and writes a JSON index for downstream tooling.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import re
import sys
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from markdownify import markdownify as md
from playwright.async_api import async_playwright

BASE_URL = "https://developer.safaricom.co.ke"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "daraja_docs_v3"
DEFAULT_AUTH_FILE = Path(__file__).resolve().parent / "auth.json"
DEFAULT_LINKS_FILE = Path(__file__).resolve().parent / "api_links.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Safaricom Daraja API documentation pages into markdown."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory where the markdown docs and index are written.",
    )
    parser.add_argument(
        "--auth-file",
        type=Path,
        default=DEFAULT_AUTH_FILE,
        help="Playwright storage state JSON file for persisting authentication.",
    )
    parser.add_argument(
        "--links-file",
        type=Path,
        default=DEFAULT_LINKS_FILE,
        help="JSON file containing the canonical Daraja API links.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Launch Chromium in headless mode. Useful for scripted CI runs.",
    )
    parser.add_argument(
        "--no-interactive",
        action="store_true",
        help="Skip interactive login prompts and fail fast when a session is not available.",
    )
    return parser.parse_args()


def load_api_urls(links_file: Path) -> list[str]:
    if not links_file.exists():
        raise FileNotFoundError(f"Missing API links file: {links_file}")

    with links_file.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    entries = payload.get("endpoints", payload)
    if not isinstance(entries, list):
        raise ValueError(f"Expected a list of endpoints in {links_file}")

    urls: list[str] = []
    seen: set[str] = set()

    for entry in entries:
        if isinstance(entry, str):
            candidate = entry.strip()
        elif isinstance(entry, dict):
            candidate = (
                entry.get("url")
                or entry.get("href")
                or entry.get("slug", "")
            )
            if not candidate:
                continue
            candidate = str(candidate).strip()
        else:
            continue

        if not candidate:
            continue

        normalized = candidate
        if not candidate.startswith("http"):
            normalized = urljoin(f"{BASE_URL}/apis/", candidate)

        if normalized not in seen:
            urls.append(normalized)
            seen.add(normalized)

    if not urls:
        raise ValueError(f"No API URLs were found in {links_file}")

    return urls


async def download_image(page, img_url: str, local_filename: Path) -> bool:
    try:
        if img_url.startswith("data:image"):
            _, encoded = img_url.split(",", 1)
            with local_filename.open("wb") as handle:
                handle.write(base64.b64decode(encoded))
            return True

        response = await page.request.get(img_url)
        if response.status == 200:
            with local_filename.open("wb") as handle:
                handle.write(await response.body())
            return True
    except Exception as exc:  # pragma: no cover - network failure is expected in some cases
        print(f"    Warning: Failed to download image {img_url}: {exc}")
    return False


async def ensure_authenticated(page, first_url: str, interactive: bool, headless: bool) -> None:
    print("Checking login status...")
    await page.goto(first_url, timeout=60000)
    await page.wait_for_load_state("domcontentloaded")
    await asyncio.sleep(3)

    if headless:
        return

    if interactive and sys.stdin.isatty():
        print("\nACTION REQUIRED: Check the browser window.")
        print("If you are not logged in, please log in now.")
        print("Press ENTER here once the API documentation is visible.")
        input()
        return

    print("Interactive login was skipped. The scraper will continue without a saved session.")


async def scrape_page(page, url: str, docs_dir: Path, img_dir: Path) -> dict:
    api_name = url.rstrip("/").split("/")[-1]
    print(f"\nProcessing: {api_name}...")

    await page.goto(url, timeout=60000)
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(2000)

    content_html = await page.evaluate(
        """
        () => {
          const main = document.querySelector('main')
            || document.querySelector('.api-details-container')
            || document.body;
          return main ? main.innerHTML : '';
        }
        """
    )

    soup = BeautifulSoup(content_html, "html.parser")
    images = soup.find_all("img")
    for index, img in enumerate(images):
        src = img.get("src")
        if not src:
            continue

        ext = "png"
        if ".svg" in src:
            ext = "svg"
        elif ".jpg" in src or ".jpeg" in src:
            ext = "jpg"

        img_filename = f"{api_name}_img_{index}.{ext}"
        local_path = img_dir / img_filename
        full_img_url = urljoin(url, src)
        success = await download_image(page, full_img_url, local_path)
        img["src"] = f"../images/{img_filename}" if success else full_img_url

    markdown_text = md(str(soup), heading_style="ATX", code_language="json")
    markdown_text = re.sub(r"\n\s*\n", "\n\n", markdown_text).strip()

    header = f"# {api_name}\n**Source:** {url}\n\n---\n\n"
    output_file = docs_dir / f"{api_name}.md"
    output_file.write_text(header + markdown_text + "\n", encoding="utf-8")
    print(f"   Saved documentation: {output_file.name}")

    return {
        "name": api_name,
        "url": url,
        "local_path": f"docs/{api_name}.md",
        "description": f"Documentation for {api_name}",
    }


async def run() -> None:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    auth_file = args.auth_file.resolve()
    links_file = args.links_file.resolve()

    docs_dir = output_dir / "docs"
    img_dir = output_dir / "images"
    docs_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    urls = load_api_urls(links_file)
    print(f"Loaded {len(urls)} Daraja API links from {links_file.name}")

    async with async_playwright() as play:
        browser = await play.chromium.launch(headless=args.headless)

        context = await browser.new_context()
        if auth_file.exists() and auth_file.stat().st_size > 0:
            try:
                with auth_file.open("r", encoding="utf-8") as handle:
                    json.load(handle)
                print(f"Loading stored authentication session from {auth_file.name}")
                context = await browser.new_context(storage_state=str(auth_file))
            except (json.JSONDecodeError, OSError, Exception) as exc:
                print(f"Saved session is unusable ({exc}). Starting fresh.")
                context = await browser.new_context()

        page = await context.new_page()
        await ensure_authenticated(page, urls[0], interactive=not args.no_interactive, headless=args.headless)

        if not args.no_interactive and sys.stdin.isatty():
            await context.storage_state(path=str(auth_file))
            print("Session saved for future runs.")

        index_data: list[dict] = []
        for url in urls:
            try:
                index_data.append(await scrape_page(page, url, docs_dir, img_dir))
            except Exception as exc:  # pragma: no cover - real browser failures are surfaced here
                api_name = url.rstrip("/").split("/")[-1]
                print(f"   Error processing {api_name}: {exc}")

        with (output_dir / "data_index.json").open("w", encoding="utf-8") as handle:
            json.dump(index_data, handle, indent=2)

        print(f"\nScraping completed successfully.")
        print(f"Documentation stored in: {output_dir}/")
        print(f"Total APIs processed: {len(index_data)}")

        await context.storage_state(path=str(auth_file))
        await browser.close()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\nAborted by user.")
        raise SystemExit(130)
