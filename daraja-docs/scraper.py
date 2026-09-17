#!/usr/bin/env python3
"""
Daraja API Documentation Scraper

This script scrapes comprehensive documentation from Safaricom's Daraja API portal,
including all API endpoints, images, and metadata.

Features:
- Automated authentication with session persistence
- Complete documentation scraping for 22+ APIs
- Automatic discovery of every linked sub-page under the main API pages
- In-page tab capture (e.g. "API Documentation" + "Error" on the same URL)
- Image downloading with local referencing
- Markdown conversion with clean formatting
- Structured data index generation
- Removes only the top navigation and footer; keeps everything else on the page

Usage:
    python scraper.py

Requirements:
    - Python 3.8+
    - Playwright browser automation
    - BeautifulSoup for HTML parsing
    - Markdownify for HTML to Markdown conversion

"""

import asyncio
import os
import re
import json
import base64
from collections import deque
from urllib.parse import urljoin, urlparse, urlunparse
from playwright.async_api import async_playwright
from markdownify import markdownify as md
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
BASE_URL = "https://developer.safaricom.co.ke"
OUTPUT_DIR = "daraja_docs_v3"
DOCS_DIR = os.path.join(OUTPUT_DIR, "docs")
IMG_DIR = os.path.join(OUTPUT_DIR, "images")
AUTH_FILE = "auth.json"

# Selectors for in-page documentation tabs (same URL, JS-swapped panels).
TAB_SELECTOR = (
    '[role="tab"], .MuiTab-root, .MuiButtonBase-root.MuiTab-root, '
    '.ant-tabs-tab, .ant-tabs-tab-btn, .nav-tabs a, .nav-tabs button, '
    'button[aria-controls], [class*="MuiTab-root"], '
    '[data-slot="tab"], [data-state][role="tab"]'
)

# exact links provided
URLS = [
    "https://developer.safaricom.co.ke/apis/GettingStarted",
    "https://developer.safaricom.co.ke/apis/Authorization",
    "https://developer.safaricom.co.ke/apis/DynamicQRCode",
    "https://developer.safaricom.co.ke/apis/MpesaExpressSimulate",
    "https://developer.safaricom.co.ke/apis/MpesaExpressQuery",
    "https://developer.safaricom.co.ke/apis/CustomerToBusiness",
    "https://developer.safaricom.co.ke/apis/BusinessToCustomer",
    "https://developer.safaricom.co.ke/apis/TransactionStatus",
    "https://developer.safaricom.co.ke/apis/AccountBalance",
    "https://developer.safaricom.co.ke/apis/Reversal",
    "https://developer.safaricom.co.ke/apis/TaxRemittance",
    "https://developer.safaricom.co.ke/apis/BusinessPayBill",
    "https://developer.safaricom.co.ke/apis/BusinessBuyGoods",
    "https://developer.safaricom.co.ke/apis/BillManager",
    "https://developer.safaricom.co.ke/apis/B2BExpressCheckout",
    "https://developer.safaricom.co.ke/apis/PullTransaction",
    "https://developer.safaricom.co.ke/apis/BusinessToPochi",
    "https://developer.safaricom.co.ke/apis/Swap",
    "https://developer.safaricom.co.ke/apis/IMSI",
    "https://developer.safaricom.co.ke/apis/LipaNaBonga",
    "https://developer.safaricom.co.ke/apis/QueryOrgInfo",
    "https://developer.safaricom.co.ke/apis/MobileNumberValidation",
    "https://developer.safaricom.co.ke/apis/AgeOnNetwork",
    "https://developer.safaricom.co.ke/apis/MobileCenter",
    "https://developer.safaricom.co.ke/apis/C2BHakikisha",
    "https://developer.safaricom.co.ke/apis/B2CHakikisha",
    "https://developer.safaricom.co.ke/apis/B2CAccountTopUp",
    "https://developer.safaricom.co.ke/apis/MpesaRatiba",
    "https://developer.safaricom.co.ke/apis/IotSimManagement"
]


async def download_image(page, img_url, local_filename):
    """
    Downloads image using the browser context to share cookies and authentication.

    Args:
        page: Playwright page object with authentication context
        img_url: URL of the image to download
        local_filename: Local path where image should be saved

    Returns:
        bool: True if download successful, False otherwise
    """
    try:
        # If it's a base64 string, save directly
        if img_url.startswith("data:image"):
            header, encoded = img_url.split(",", 1)
            data = base64.b64decode(encoded)
            with open(local_filename, "wb") as f:
                f.write(data)
            return True

        # Use Playwright's API request context to fetch with current cookies
        response = await page.request.get(img_url)
        if response.status == 200:
            data = await response.body()
            with open(local_filename, "wb") as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"    Warning: Failed to download image {img_url}: {e}")
    return False


def normalize_url(url):
    """Normalize a URL for deduplication (strip fragment and trailing slash)."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, parsed.query, ""))


def is_valid_page_url(url):
    """
    Return True if the URL is a documentation page under the main API pages.

    Only same-origin pages under /apis/ are considered, so navigation,
    footer, and external links are never crawled. Fragments are ignored
    (in-page tabs are handled separately via click capture).
    """
    parsed = urlparse(url)
    site = urlparse(BASE_URL)
    if parsed.netloc and parsed.netloc != site.netloc:
        return False
    if not parsed.path.startswith("/apis/"):
        return False
    # Reject asset / download links by path extension
    if re.search(
        r"\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|svg|webp|css|js|json|xml)$",
        parsed.path,
        re.I,
    ):
        return False
    return True


def image_extension(src):
    """Pick a sensible file extension from an image src URL or data URI."""
    lower = (src or "").lower()
    if lower.startswith("data:image/"):
        mime = lower.split(";", 1)[0].split("/", 1)[-1]
        if mime in {"jpeg", "jpg", "png", "gif", "webp", "svg+xml"}:
            return "svg" if mime == "svg+xml" else ("jpg" if mime == "jpeg" else mime)
    path = urlparse(src).path.lower()
    for ext in ("svg", "png", "jpg", "jpeg", "gif", "webp"):
        if path.endswith("." + ext):
            return "jpg" if ext == "jpeg" else ext
    return "png"


def clean_content(soup):
    """
    Remove site chrome from parsed content: top navigation and footer only.

    Everything else on the page is kept, including widgets, chatbots,
    banners, and other floating elements.
    """
    to_remove = []

    # Top navigation and footer
    for tag in ["nav", "footer"]:
        to_remove.extend(soup.find_all(tag))

    # Top header navigation (only site-level headers, not in-content headers)
    for el in soup.find_all("header"):
        classes = " ".join(el.get("class", []))
        el_id = el.get("id", "") or ""
        if "nav" in classes.lower() or "nav" in el_id.lower() or el.find("nav"):
            to_remove.append(el)

    # Non-content elements that would pollute the markdown
    for tag in ["script", "style", "noscript", "iframe"]:
        to_remove.extend(soup.find_all(tag))

    # Remove everything. Collect first, then decompose, so elements wiped
    # by removing an ancestor are never touched again (bs4 >= 4.13 clears
    # the element dict on decompose).
    for el in to_remove:
        if getattr(el, "parent", None) is not None:
            el.decompose()

    return soup


def clean_markdown(text):
    """Collapse excess blank lines and drop empty table-noise rows."""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped in {"|", "|---|", "---", "***", "* * *"}:
            continue
        lines.append(line)
    return "\n".join(lines).strip()


async def discover_links(page, base_url):
    """
    Find documentation page links inside the current page's main content.

    Returns a set of normalized, validated URLs to crawl next.
    Same-page fragment links are ignored here; tabs are captured via
    ``capture_all_tab_panels``.
    """
    hrefs = await page.evaluate("""() => {
        const main = document.querySelector('main') ||
                    document.querySelector('.api-details-container') ||
                    document.body;
        return Array.from(main.querySelectorAll('a[href]')).map(a => a.href);
    }""")
    candidates = set()
    base_norm = normalize_url(base_url)
    for href in hrefs:
        full_url = urljoin(base_url, href)
        if not is_valid_page_url(full_url):
            continue
        norm = normalize_url(full_url)
        # Skip same-page anchors / tab links that do not navigate elsewhere
        if norm == base_norm:
            continue
        candidates.add(norm)
    return candidates


async def list_content_tabs(page):
    """
    Return in-page documentation tabs within the main content area.

    Tabs like "API Documentation" / "Error" share one URL and swap panels
    via JavaScript — they must be clicked, not crawled as separate URLs.
    """
    return await page.evaluate(
        """(tabSelector) => {
            const root =
                document.querySelector('main') ||
                document.querySelector('.api-details-container') ||
                document.body;
            const chrome =
                'header, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]';

            const isShown = (el) => {
                if (!el) return false;
                if (el.getAttribute('aria-disabled') === 'true') return false;
                if (el.disabled) return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                return true;
            };

            let nodes = Array.from(root.querySelectorAll(tabSelector)).filter((el) => {
                if (el.closest(chrome)) return false;
                return isShown(el);
            });

            // Fallback: children of an explicit tablist that were missed above
            if (nodes.length < 2) {
                const lists = root.querySelectorAll(
                    '[role="tablist"], .MuiTabs-root, .ant-tabs-nav-list, .nav-tabs'
                );
                lists.forEach((list) => {
                    if (list.closest(chrome)) return;
                    Array.from(list.querySelectorAll('button, a, [role="tab"], div, span'))
                        .forEach((el) => {
                            if (!isShown(el)) return;
                            const label = (el.innerText || '').replace(/\\s+/g, ' ').trim();
                            // Prefer leaf-ish controls with short labels
                            if (!label || label.length > 60) return;
                            if (el.querySelector('button, a, [role="tab"]')) return;
                            nodes.push(el);
                        });
                });
            }

            // Index is position in the deduped list so activate_tab matches.
            const seen = new Set();
            const tabs = [];
            nodes.forEach((el) => {
                const label = (el.innerText || el.getAttribute('aria-label') || '')
                    .replace(/\\s+/g, ' ')
                    .trim();
                if (!label) return;
                const key = label.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                tabs.push({ index: tabs.length, label: label.slice(0, 120) });
            });
            return tabs;
        }""",
        TAB_SELECTOR,
    )


async def activate_tab(page, tab_index):
    """Click a content tab by the index returned from ``list_content_tabs``."""
    return await page.evaluate(
        """({ tabSelector, tabIndex }) => {
            const root =
                document.querySelector('main') ||
                document.querySelector('.api-details-container') ||
                document.body;
            const chrome =
                'header, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]';

            const isShown = (el) => {
                if (!el) return false;
                if (el.getAttribute('aria-disabled') === 'true') return false;
                if (el.disabled) return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                return true;
            };

            let nodes = Array.from(root.querySelectorAll(tabSelector)).filter((el) => {
                if (el.closest(chrome)) return false;
                return isShown(el);
            });

            if (nodes.length < 2) {
                const lists = root.querySelectorAll(
                    '[role="tablist"], .MuiTabs-root, .ant-tabs-nav-list, .nav-tabs'
                );
                lists.forEach((list) => {
                    if (list.closest(chrome)) return;
                    Array.from(list.querySelectorAll('button, a, [role="tab"], div, span'))
                        .forEach((el) => {
                            if (!isShown(el)) return;
                            const label = (el.innerText || '').replace(/\\s+/g, ' ').trim();
                            if (!label || label.length > 60) return;
                            if (el.querySelector('button, a, [role="tab"]')) return;
                            nodes.push(el);
                        });
                });
            }

            // Rebuild the same deduped list as list_content_tabs so indices match.
            const seen = new Set();
            const tabs = [];
            nodes.forEach((el) => {
                const label = (el.innerText || el.getAttribute('aria-label') || '')
                    .replace(/\\s+/g, ' ')
                    .trim();
                if (!label) return;
                const key = label.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                tabs.push(el);
            });

            const tab = tabs[tabIndex];
            if (!tab) return false;
            tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            tab.click();
            return true;
        }""",
        {"tabSelector": TAB_SELECTOR, "tabIndex": tab_index},
    )


async def extract_active_panel_html(page):
    """
    Extract HTML for the currently visible documentation panel.

    Prefers an active ``role=tabpanel`` / MUI tab panel so repeated tab
    captures do not duplicate the page header and tab strip. Falls back to
    the full main content container.
    """
    return await page.evaluate("""() => {
        const isVisible = (el) => {
            if (!el) return false;
            if (el.hasAttribute('hidden')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            return (el.innerText || '').trim().length > 20;
        };

        const root =
            document.querySelector('main') ||
            document.querySelector('.api-details-container') ||
            document.body;

        const panels = Array.from(root.querySelectorAll(
            '[role="tabpanel"], .MuiTabPanel-root, .tab-pane, [class*="TabPanel"]'
        ));
        const visible = panels.find(isVisible);
        if (visible) return visible.innerHTML;

        // Some portals keep only the active panel mounted — use main body.
        return root.innerHTML;
    }""")


async def extract_page_shell_html(page):
    """
    Capture title / description chrome above the tab strip (once per page).

    Returns empty string when no clear pre-tab region exists.
    """
    return await page.evaluate(
        """(tabSelector) => {
            const root =
                document.querySelector('main') ||
                document.querySelector('.api-details-container') ||
                document.body;
            const tab = root.querySelector(tabSelector);
            if (!tab) return '';
            const tablist =
                tab.closest('[role="tablist"]') ||
                tab.closest('.MuiTabs-root') ||
                tab.closest('.nav-tabs') ||
                tab.parentElement;
            if (!tablist || !root.contains(tablist)) return '';

            const parts = [];
            for (const child of Array.from(root.children)) {
                if (child === tablist || child.contains(tablist)) break;
                parts.push(child.outerHTML);
            }
            return parts.join('');
        }""",
        TAB_SELECTOR,
    )


async def process_images(page, soup, source_url, slug, image_counter):
    """Download images in ``soup`` and rewrite src to local relative paths."""
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
        image_counter[0] += 1
        ext = image_extension(src)
        img_filename = f"{slug}_img_{image_counter[0]}.{ext}"
        local_path = os.path.join(IMG_DIR, img_filename)
        full_img_url = urljoin(source_url, src)
        if await download_image(page, full_img_url, local_path):
            img["src"] = f"../images/{img_filename}"
        else:
            img["src"] = full_img_url
    return soup


async def html_fragment_to_markdown(page, html, source_url, slug, image_counter):
    """Clean an HTML fragment, localize images, and convert to Markdown."""
    if not html or not html.strip():
        return ""
    soup = BeautifulSoup(html, "html.parser")
    soup = clean_content(soup)
    await process_images(page, soup, source_url, slug, image_counter)
    markdown_text = md(str(soup), heading_style="ATX", code_language="json")
    return clean_markdown(markdown_text)


async def capture_all_tab_panels(page, url, slug):
    """
    Capture every in-page documentation tab into one Markdown body.

    Pages without tabs (or with a single tab) return a single panel dump.
    Multi-tab pages (Bill Manager: API Documentation + Error) get a short
    page shell plus one ``##`` section per tab.

    Also returns any ``/apis/`` links found across all tab views so child
    pages linked only from a non-default tab are still queued.
    """
    image_counter = [0]
    tabs = await list_content_tabs(page)
    found_links = set()

    # No tab UI — scrape the whole main content once.
    if len(tabs) <= 1:
        content_html = await page.evaluate("""() => {
            const main = document.querySelector('main') ||
                        document.querySelector('.api-details-container') ||
                        document.body;
            return main.innerHTML;
        }""")
        found_links |= await discover_links(page, url)
        body = await html_fragment_to_markdown(
            page, content_html, url, slug, image_counter
        )
        return body, tabs, found_links

    sections = []
    shell_html = await extract_page_shell_html(page)
    shell_md = await html_fragment_to_markdown(
        page, shell_html, url, slug, image_counter
    )
    if shell_md:
        sections.append(shell_md)

    for tab in tabs:
        label = tab["label"]
        idx = int(tab["index"])
        print(f"   tab: {label}")
        clicked = await activate_tab(page, idx)
        if not clicked:
            print(f"   warn: could not activate tab '{label}'")
            continue

        # Wait for panel swap (SPA content often replaces on click).
        await page.wait_for_timeout(1000)
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        found_links |= await discover_links(page, url)

        panel_html = await extract_active_panel_html(page)
        panel_md = await html_fragment_to_markdown(
            page, panel_html, url, slug, image_counter
        )
        if not panel_md or len(panel_md) < 20:
            print(f"   warn: little/no content for tab '{label}'")
            continue
        sections.append(f"## {label}\n\n{panel_md}")

    if not sections:
        # Fallback: whatever is currently visible
        content_html = await extract_active_panel_html(page)
        found_links |= await discover_links(page, url)
        body = await html_fragment_to_markdown(
            page, content_html, url, slug, image_counter
        )
        return body, tabs, found_links

    return "\n\n---\n\n".join(sections), tabs, found_links


async def run():
    """
    Main scraper function that handles authentication, scraping, and data processing.

    This function:
    1. Sets up output directories
    2. Handles browser authentication with session persistence
    3. Scrapes all configured Daraja API endpoints plus every linked sub-page
    4. Captures every in-page tab panel (API Documentation, Error, …)
    5. Downloads and processes images with local referencing
    6. Converts HTML to markdown format
    7. Generates a structured index
    """
    # Setup directories
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)

    async with async_playwright() as p:
        # Browser Setup - Keep visible for login debugging
        browser = await p.chromium.launch(headless=False)

        # Load existing authentication or create new context
        if os.path.exists(AUTH_FILE) and os.path.getsize(AUTH_FILE) > 0:
            try:
                # Verify the auth file contains valid JSON
                with open(AUTH_FILE, "r") as f:
                    json.load(f)
                print("Loading saved authentication session...")
                context = await browser.new_context(storage_state=AUTH_FILE)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Saved session is corrupted ({e}). Starting fresh...")
                context = await browser.new_context()
        else:
            print("No session found. Creating new context.")
            context = await browser.new_context()

        page = await context.new_page()

        # Check authentication status with first URL
        print("Checking login status...")
        await page.goto(URLS[0], timeout=60000)
        await asyncio.sleep(3)  # Wait for UI to settle

        # Prompt for manual login if needed
        print("\nACTION REQUIRED: Check the browser window.")
        print("If you are not logged in, please log in now.")
        print("Press ENTER here once you can see the API documentation on screen.")
        input()

        # Save session for future runs
        await context.storage_state(path=AUTH_FILE)
        print("Session saved for future use.")

        index_data = []
        visited = set()
        queue = deque(normalize_url(u) for u in URLS)

        print(f"Starting scrape of {len(URLS)} seed API endpoints (crawling all linked sub-pages)...")

        while queue:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            # Build a filesystem-safe slug from the URL path, e.g.
            # /apis/GettingStarted       -> GettingStarted
            # /apis/GettingStarted/FAQ   -> GettingStarted_FAQ
            path = urlparse(url).path
            slug = path[len("/apis/"):] if path.startswith("/apis/") else path.strip("/")
            slug = slug.strip("/").replace("/", "_") or "index"
            print(f"\nProcessing: {slug}...")

            try:
                await page.goto(url, timeout=60000)
                await page.wait_for_load_state("networkidle")
                await page.wait_for_timeout(2000)  # Grace period for rendering

                markdown_text, tabs, new_links = await capture_all_tab_panels(
                    page, url, slug
                )
                if not markdown_text:
                    print(f"   warn: no content extracted for {slug}")
                    continue

                # Queue linked sub-pages discovered across all tab views
                for link in new_links:
                    if link not in visited:
                        queue.append(link)

                # Save Markdown file with header
                md_filename = os.path.join(DOCS_DIR, f"{slug}.md")
                tab_note = ""
                if len(tabs) > 1:
                    tab_note = (
                        f"**Tabs captured:** "
                        + ", ".join(t["label"] for t in tabs)
                        + "\n\n"
                    )
                header = f"# {slug}\n**Source:** {url}\n\n{tab_note}---\n\n"

                with open(md_filename, "w", encoding="utf-8") as f:
                    f.write(header + markdown_text + "\n")

                print(f"   Saved documentation: {slug}.md"
                      + (f" ({len(tabs)} tabs)" if len(tabs) > 1 else ""))

                # Add to index
                index_data.append({
                    "name": slug,
                    "url": url,
                    "local_path": f"docs/{slug}.md",
                    "description": f"Documentation for {slug}",
                    "tabs": [t["label"] for t in tabs] if tabs else [],
                })

            except Exception as e:
                print(f"   Error processing {slug}: {e}")

        # Save index file
        with open(os.path.join(OUTPUT_DIR, "data_index.json"), "w") as f:
            json.dump(index_data, f, indent=2)

        print(f"\nScraping completed successfully.")
        print(f"Documentation stored in: {OUTPUT_DIR}/")
        print(f"Total pages processed: {len(index_data)}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
