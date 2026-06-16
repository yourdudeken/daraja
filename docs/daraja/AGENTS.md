# Daraja API Docs Scraper

Scrapes Safaricom Daraja API documentation from `developer.safaricom.co.ke` using Playwright.

## Setup

```bash
pip install -r requirements.txt
playwright install chromium
```

Or run `python setup_scraper.py` for the automated setup.

## Usage

```bash
python scraper.py
```

Interactive flow: browser opens for login → press Enter once docs load → session cached in `auth.json` for reuse.

## Output

- `daraja_docs_v3/docs/` — Markdown files per API endpoint (22 APIs)
- `daraja_docs_v3/images/` — Downloaded documentation images
- `daraja_docs_v3/data_index.json` — JSON catalog of all scraped APIs

## Key details

- `auth.json` is gitignored (contains session cookies)
- `daraja_docs_v3/` output dir is NOT gitignored (committed for distribution)
- Scraper requires Python 3.8+, Playwright Chromium browser, and valid Safaricom Developer Portal credentials
- 22 API endpoints defined in `URLS` list in `scraper.py`
- Images are downloaded with local relative path references in markdown
