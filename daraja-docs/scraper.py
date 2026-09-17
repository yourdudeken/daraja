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

# Navigation resilience — the portal often returns non-2xx / HTTP2 glitches
# under rapid full-page loads, and a failed goto leaves an in-flight navigation
# that interrupts the next one.
GOTO_RETRIES = 4
GOTO_TIMEOUT_MS = 60000
PAGE_PACING_MS = 1500
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

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


def same_docs_page(a, b):
    """True when two URLs point at the same /apis/ document (ignore fragment)."""
    return normalize_url(a) == normalize_url(b)


async def page_has_docs_content(page):
    """Heuristic: the live page looks like API documentation, not an error shell."""
    try:
        if page.url.startswith("chrome-error://") or page.url == "about:blank":
            return False
        return await page.evaluate("""() => {
            const body = document.body;
            if (!body) return false;
            const text = (body.innerText || '').trim();
            if (text.length < 80) return false;
            // Chrome / portal error shells
            if (/ERR_|This site (can.?t|cannot) be reached|HTTP ERROR/i.test(text)) {
                return false;
            }
            const main = document.querySelector('main, .api-details-container, [role="main"]');
            if (main && (main.innerText || '').trim().length > 40) return true;
            return text.length > 200;
        }""")
    except Exception:
        return False


async def settle_navigation(page, timeout_ms=8000):
    """Wait out any in-flight navigation so the next goto is not interrupted."""
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=timeout_ms)
    except Exception:
        pass
    try:
        await page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 5000))
    except Exception:
        pass


async def recover_page(page):
    """
    Clear a stuck error document so the next navigation can start cleanly.

    Failed gotos often leave ``chrome-error://chromewebdata/`` or a pending
    navigation that causes 'interrupted by another navigation' on the next URL.
    """
    try:
        await settle_navigation(page, timeout_ms=3000)
    except Exception:
        pass
    try:
        await page.goto("about:blank", wait_until="domcontentloaded", timeout=15000)
    except Exception:
        pass
    await page.wait_for_timeout(300)


async def safe_goto(page, url, context=None, retries=GOTO_RETRIES):
    """
    Navigate to a docs URL with retries and recovery from portal/network glitches.

    Handles:
    - ``ERR_HTTP_RESPONSE_CODE_FAILURE`` (portal sometimes returns 4xx for the
      document while the SPA shell still hydrates)
    - ``interrupted by another navigation`` (previous goto still in flight)
    - ``ERR_HTTP2_PROTOCOL_ERROR``

    Returns the page to keep using (may be a freshly opened page after recovery).
    """
    target = normalize_url(url)

    # Already on the page (e.g. just finished login on the first seed URL).
    if same_docs_page(page.url, url) and await page_has_docs_content(page):
        await settle_navigation(page)
        return page

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            await settle_navigation(page, timeout_ms=4000)

            # On the last attempts, replace a wedged tab (chrome-error / stuck).
            if attempt >= retries - 1 and context is not None:
                if page.url.startswith("chrome-error://") or page.url == "about:blank":
                    try:
                        fresh = await context.new_page()
                        await page.close()
                        page = fresh
                    except Exception:
                        pass

            response = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=GOTO_TIMEOUT_MS,
            )

            # Soft-wait for SPA hydration without requiring perfect networkidle.
            await page.wait_for_timeout(PAGE_PACING_MS)
            try:
                await page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass

            status = response.status if response else None
            has_content = await page_has_docs_content(page)
            on_target = same_docs_page(page.url, url)

            if on_target and has_content:
                return page

            if status and status >= 400 and not has_content:
                raise RuntimeError(f"HTTP {status} with no usable content at {url}")

            if not on_target:
                raise RuntimeError(
                    f"Navigated to unexpected URL {page.url!r} (wanted {target})"
                )

            if has_content:
                return page

            raise RuntimeError(f"Page loaded but content looks empty/errorful: {url}")

        except Exception as exc:
            last_error = exc
            msg = str(exc)
            print(f"   nav attempt {attempt}/{retries} failed: {msg.splitlines()[0]}")

            # HTTP response-code failures sometimes still leave a hydratable SPA.
            if "ERR_HTTP_RESPONSE_CODE_FAILURE" in msg:
                await page.wait_for_timeout(2500)
                if same_docs_page(page.url, url) and await page_has_docs_content(page):
                    print("   nav recovered: content present after HTTP error status")
                    return page

            await recover_page(page)
            await page.wait_for_timeout(1000 * attempt)

    raise RuntimeError(
        f"Failed to navigate to {url} after {retries} attempts: {last_error}"
    )

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
                            if (!label || label.length > 60) return;
                            if (el.querySelector('button, a, [role="tab"]')) return;
                            nodes.push(el);
                        });
                });
            }

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


async def panel_fingerprint(page):
    """Short fingerprint of the active docs panel (used to detect tab swaps)."""
    return await page.evaluate("""() => {
        const isHidden = (el) => {
            if (!el) return true;
            if (el.hasAttribute('hidden')) return true;
            if (el.getAttribute('aria-hidden') === 'true') return true;
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden';
        };

        const root =
            document.querySelector('main') ||
            document.querySelector('.api-details-container') ||
            document.body;

        const selected =
            root.querySelector('[role="tab"][aria-selected="true"]') ||
            root.querySelector('.Mui-selected[role="tab"]') ||
            root.querySelector('.MuiTab-root.Mui-selected');

        let panel = null;
        if (selected) {
            const id = selected.getAttribute('aria-controls');
            if (id) panel = document.getElementById(id);
        }
        if (!panel) {
            const panels = Array.from(root.querySelectorAll(
                '[role="tabpanel"], .MuiTabPanel-root, .tab-pane'
            )).filter((p) => !isHidden(p));
            if (panels.length === 1) panel = panels[0];
            else if (panels.length > 1) {
                panels.sort((a, b) =>
                    ((b.innerText || '').length) - ((a.innerText || '').length)
                );
                panel = panels[0];
            }
        }
        const node = panel || root;
        const text = (node.innerText || '').replace(/\\s+/g, ' ').trim();
        return `${text.length}:${text.slice(0, 240)}`;
    }""")


async def activate_tab_by_label(page, label):
    """
    Activate a docs tab using Playwright's trusted click (more reliable than
    DOM ``el.click()`` for React/MUI tab lists).
    """
    before = await panel_fingerprint(page)

    locators = [
        page.get_by_role("tab", name=label, exact=True),
        page.locator('[role="tablist"] [role="tab"]').filter(
            has_text=re.compile(rf"^\s*{re.escape(label)}\s*$")
        ),
        page.locator(".MuiTab-root").filter(
            has_text=re.compile(rf"^\s*{re.escape(label)}\s*$")
        ),
        page.locator(TAB_SELECTOR).filter(
            has_text=re.compile(rf"^\s*{re.escape(label)}\s*$")
        ),
    ]

    clicked = False
    last_err = None
    for loc in locators:
        try:
            count = await loc.count()
            if count == 0:
                continue
            target = loc.first
            await target.scroll_into_view_if_needed()
            await target.click(timeout=5000)
            clicked = True
            break
        except Exception as exc:
            last_err = exc
            continue

    if not clicked:
        # Last resort: JS click by label match (same dedupe order as discovery).
        clicked = await page.evaluate(
            """({ tabSelector, label }) => {
                const root =
                    document.querySelector('main') ||
                    document.querySelector('.api-details-container') ||
                    document.body;
                const chrome =
                    'header, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]';
                const want = label.replace(/\\s+/g, ' ').trim().toLowerCase();
                const nodes = Array.from(root.querySelectorAll(tabSelector));
                for (const el of nodes) {
                    if (el.closest(chrome)) continue;
                    const text = (el.innerText || el.getAttribute('aria-label') || '')
                        .replace(/\\s+/g, ' ').trim().toLowerCase();
                    if (text === want) {
                        el.scrollIntoView({ block: 'nearest' });
                        el.click();
                        return true;
                    }
                }
                return false;
            }""",
            {"tabSelector": TAB_SELECTOR, "label": label},
        )
        if not clicked:
            if last_err:
                raise RuntimeError(f"Could not click tab {label!r}: {last_err}")
            return False

    # Wait until the panel content actually changes (or selection flips).
    try:
        await page.wait_for_function(
            """(args) => {
                const [before, label] = args;
                const selected =
                    document.querySelector('[role="tab"][aria-selected="true"]') ||
                    document.querySelector('.MuiTab-root.Mui-selected');
                if (selected) {
                    const text = (selected.innerText || '').replace(/\\s+/g, ' ').trim();
                    if (text.toLowerCase() === label.toLowerCase()) {
                        // Selected correct tab — also require content settle when possible.
                        return true;
                    }
                }
                // Fallback: body text fingerprint changed.
                const root =
                    document.querySelector('main') ||
                    document.querySelector('.api-details-container') ||
                    document.body;
                const text = (root.innerText || '').replace(/\\s+/g, ' ').trim();
                const fp = `${text.length}:${text.slice(0, 240)}`;
                return fp !== before;
            }""",
            arg=[before, label],
            timeout=8000,
        )
    except Exception:
        pass

    await page.wait_for_timeout(600)
    return True


async def extract_active_panel_html(page):
    """
    Extract HTML for the currently visible documentation panel only.

    Resolves the selected tab via ``aria-controls`` / ``aria-selected``, and
    strips hidden panels so inactive tab markup is never mixed in (raw
    ``innerHTML`` includes ``display:none`` / ``hidden`` nodes).
    """
    return await page.evaluate("""() => {
        const isHidden = (el) => {
            if (!el) return true;
            if (el.hasAttribute('hidden')) return true;
            if (el.getAttribute('aria-hidden') === 'true') return true;
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden';
        };

        const root =
            document.querySelector('main') ||
            document.querySelector('.api-details-container') ||
            document.body;

        const selected =
            root.querySelector('[role="tab"][aria-selected="true"]') ||
            root.querySelector('.Mui-selected[role="tab"]') ||
            root.querySelector('.MuiTab-root.Mui-selected') ||
            root.querySelector('.ant-tabs-tab-active');

        let panel = null;
        if (selected) {
            const controls = selected.getAttribute('aria-controls');
            if (controls) {
                panel = document.getElementById(controls);
            }
            // MUI sometimes points at a wrapper id; prefer a nested tabpanel.
            if (panel && !panel.matches('[role="tabpanel"], .MuiTabPanel-root, .tab-pane')) {
                const nested = panel.querySelector(
                    '[role="tabpanel"], .MuiTabPanel-root, .tab-pane'
                );
                if (nested && !isHidden(nested)) panel = nested;
            }
        }

        if (!panel) {
            const panels = Array.from(root.querySelectorAll(
                '[role="tabpanel"], .MuiTabPanel-root, .tab-pane, [class*="TabPanel"]'
            )).filter((p) => !isHidden(p));
            if (panels.length === 1) {
                panel = panels[0];
            } else if (panels.length > 1) {
                panels.sort((a, b) =>
                    ((b.innerText || '').length) - ((a.innerText || '').length)
                );
                panel = panels[0];
            }
        }

        if (panel) return panel.innerHTML;

        // No tabpanel nodes: clone main and drop tab strip + live-hidden nodes.
        const stripSelectors = [
            '[role="tablist"]',
            '.MuiTabs-root',
            '.ant-tabs-nav',
            '.nav-tabs',
        ];
        const hiddenEls = [];
        root.querySelectorAll('*').forEach((el) => {
            if (stripSelectors.some((sel) => el.matches(sel))) {
                hiddenEls.push(el);
                return;
            }
            // Only mark leaves/containers that are themselves hidden, not ancestors of visible content.
            if (isHidden(el)) hiddenEls.push(el);
        });

        const clone = root.cloneNode(true);
        const allLive = [root, ...root.querySelectorAll('*')];
        const allClone = [clone, ...clone.querySelectorAll('*')];
        for (let i = 0; i < allLive.length; i++) {
            if (hiddenEls.includes(allLive[i]) && allClone[i]) {
                allClone[i].remove();
            }
        }
        return clone.innerHTML;
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
        try:
            if await download_image(page, full_img_url, local_path):
                img["src"] = f"../images/{img_filename}"
            else:
                img["src"] = full_img_url
        except Exception:
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
        content_html = await extract_active_panel_html(page)
        found_links |= await discover_links(page, url)
        body = await html_fragment_to_markdown(
            page, content_html, url, slug, image_counter
        )
        return body, tabs, found_links

    sections = []
    seen_fingerprints = set()

    try:
        shell_html = await extract_page_shell_html(page)
        shell_md = await html_fragment_to_markdown(
            page, shell_html, url, slug, image_counter
        )
        if shell_md:
            sections.append(shell_md)
    except Exception as exc:
        print(f"   warn: page shell capture failed: {exc}")

    for tab in tabs:
        label = tab["label"]
        print(f"   tab: {label}")
        try:
            activated = await activate_tab_by_label(page, label)
            if not activated:
                print(f"   warn: could not activate tab '{label}'")
                continue

            # Do NOT wait for networkidle here — tab XHRs / analytics often
            # prevent idle and previously caused navigation races/errors.
            await page.wait_for_timeout(500)

            fp = await panel_fingerprint(page)
            if fp in seen_fingerprints:
                # Same content as another tab — click once more and re-check.
                await page.wait_for_timeout(800)
                await activate_tab_by_label(page, label)
                await page.wait_for_timeout(800)
                fp = await panel_fingerprint(page)

            found_links |= await discover_links(page, url)

            panel_html = await extract_active_panel_html(page)
            panel_md = await html_fragment_to_markdown(
                page, panel_html, url, slug, image_counter
            )
            if not panel_md or len(panel_md) < 20:
                print(f"   warn: little/no content for tab '{label}'")
                continue

            seen_fingerprints.add(fp)
            print(f"   tab ok: {label} ({len(panel_md)} chars)")
            sections.append(f"## {label}\n\n{panel_md}")
        except Exception as exc:
            # Keep other tabs even if one panel throws.
            print(f"   warn: tab '{label}' failed: {exc}")
            continue

    tab_sections = [s for s in sections if s.startswith("## ")]
    if not tab_sections:
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

    context_kwargs = {
        "user_agent": USER_AGENT,
        "viewport": {"width": 1440, "height": 900},
        "locale": "en-US",
        "ignore_https_errors": True,
        "extra_http_headers": {
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    async with async_playwright() as p:
        # Disable HTTP/2 — the portal intermittently raises ERR_HTTP2_PROTOCOL_ERROR.
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-http2",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        # Load existing authentication or create new context
        if os.path.exists(AUTH_FILE) and os.path.getsize(AUTH_FILE) > 0:
            try:
                with open(AUTH_FILE, "r") as f:
                    json.load(f)
                print("Loading saved authentication session...")
                context = await browser.new_context(
                    storage_state=AUTH_FILE, **context_kwargs
                )
            except (json.JSONDecodeError, Exception) as e:
                print(f"Saved session is corrupted ({e}). Starting fresh...")
                context = await browser.new_context(**context_kwargs)
        else:
            print("No session found. Creating new context.")
            context = await browser.new_context(**context_kwargs)

        page = await context.new_page()

        # Check authentication status with first URL
        print("Checking login status...")
        try:
            page = await safe_goto(page, URLS[0], context=context)
        except Exception as e:
            print(f"Initial navigation warning: {e}")
            print("Continuing — log in manually if the page did not load.")
        await asyncio.sleep(2)

        print("\nACTION REQUIRED: Check the browser window.")
        print("If you are not logged in, please log in now.")
        print("Press ENTER here once you can see the API documentation on screen.")
        input()

        await context.storage_state(path=AUTH_FILE)
        print("Session saved for future use.")

        index_data = []
        visited = set()
        failed = []
        queue = deque(normalize_url(u) for u in URLS)

        print(
            f"Starting scrape of {len(URLS)} seed API endpoints "
            "(crawling all linked sub-pages)..."
        )

        async def scrape_one(url):
            nonlocal page
            path = urlparse(url).path
            slug = path[len("/apis/"):] if path.startswith("/apis/") else path.strip("/")
            slug = slug.strip("/").replace("/", "_") or "index"
            print(f"\nProcessing: {slug}...")

            page = await safe_goto(page, url, context=context)

            markdown_text, tabs, new_links = await capture_all_tab_panels(
                page, url, slug
            )
            if not markdown_text:
                print(f"   warn: no content extracted for {slug}")
                return False, set()

            md_filename = os.path.join(DOCS_DIR, f"{slug}.md")
            tab_note = ""
            if len(tabs) > 1:
                tab_note = (
                    "**Tabs captured:** "
                    + ", ".join(t["label"] for t in tabs)
                    + "\n\n"
                )
            header = f"# {slug}\n**Source:** {url}\n\n{tab_note}---\n\n"

            with open(md_filename, "w", encoding="utf-8") as f:
                f.write(header + markdown_text + "\n")

            print(
                f"   Saved documentation: {slug}.md"
                + (f" ({len(tabs)} tabs)" if len(tabs) > 1 else "")
            )

            index_data.append({
                "name": slug,
                "url": url,
                "local_path": f"docs/{slug}.md",
                "description": f"Documentation for {slug}",
                "tabs": [t["label"] for t in tabs] if tabs else [],
            })
            return True, new_links

        while queue:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            try:
                ok, new_links = await scrape_one(url)
                if ok:
                    for link in new_links:
                        if link not in visited:
                            queue.append(link)
                else:
                    failed.append(url)
            except Exception as e:
                print(f"   Error processing {url}: {e}")
                failed.append(url)
                await recover_page(page)

            # Pace requests so the portal / WAF does not start rejecting us.
            await page.wait_for_timeout(PAGE_PACING_MS)

        # One retry pass for anything that failed during the main crawl.
        if failed:
            retry_list = list(dict.fromkeys(failed))
            failed = []
            print(f"\nRetrying {len(retry_list)} failed page(s)...")
            for url in retry_list:
                if any(item["url"] == url for item in index_data):
                    continue
                # Allow retry even though visited (content was never saved).
                try:
                    ok, new_links = await scrape_one(url)
                    if ok:
                        for link in new_links:
                            if link not in visited:
                                visited.add(link)
                                # Don't expand retries into a full second crawl.
                    else:
                        failed.append(url)
                except Exception as e:
                    print(f"   Retry failed for {url}: {e}")
                    failed.append(url)
                    await recover_page(page)
                await page.wait_for_timeout(PAGE_PACING_MS * 2)

        with open(os.path.join(OUTPUT_DIR, "data_index.json"), "w") as f:
            json.dump(index_data, f, indent=2)

        print(f"\nScraping completed.")
        print(f"Documentation stored in: {OUTPUT_DIR}/")
        print(f"Total pages processed: {len(index_data)}")
        if failed:
            print(f"Still failing ({len(failed)}):")
            for u in failed:
                print(f"  - {u}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
