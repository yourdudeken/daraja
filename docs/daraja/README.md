# Daraja API Docs Scraper

Scrapes Safaricom Daraja API documentation from `developer.safaricom.co.ke` using Playwright. Outputs Markdown files, images, and a JSON index.

## Requirements

- Python 3.8+
- Playwright Chromium browser
- Valid Safaricom Developer Portal credentials

## Setup by OS

### Linux (Ubuntu/Debian)
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
# Install system deps if needed:
sudo npx playwright install-deps chromium
```

### Linux (Fedora/RHEL)
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
sudo dnf install -y atk cups-libs libXcomposite libXdamage libXrandr libgbm libxkbcommon pango alsa-lib
```

### macOS
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### Windows (PowerShell)
```powershell
python -m venv venv; .\venv\Scripts\Activate
pip install -r requirements.txt
playwright install chromium
```

## Automated setup

```bash
python setup_scraper.py
```
Runs: install deps → install Playwright Chromium → verify imports.

## Usage

```bash
python scraper.py
```

Interactive auth flow:
1. Browser opens (non-headless) and loads first API endpoint
2. Log in manually if not already authenticated
3. Press Enter in terminal once docs are visible
4. Session saves to `auth.json` for reuse on next run
5. Scraper processes all 22 endpoints automatically

**On subsequent runs** with a valid `auth.json`, the login step is skipped.

## 22 API endpoints scraped

| # | URL slug | Description |
|---|----------|-------------|
| 1 | `Authorization` | OAuth token generation |
| 2 | `DynamicQRCode` | Dynamic QR code generation |
| 3 | `CustomerToBusiness` | C2B payment simulation |
| 4 | `CustomerToBusinessRegisterURL` | C2B URL registration |
| 5 | `MpesaExpressSimulate` | STK Push simulation |
| 6 | `MpesaExpressQuery` | STK Push query |
| 7 | `BusinessToCustomer` | B2C payments |
| 8 | `TransactionStatus` | Transaction status query |
| 9 | `AccountBalance` | Account balance query |
| 10 | `Reversal` | Transaction reversal |
| 11 | `TaxRemittance` | Tax remittance to KRA |
| 12 | `BusinessPayBill` | Business PayBill payments |
| 13 | `BusinessBuyGoods` | Business Buy Goods payments |
| 14 | `BillManager` | Bill manager operations |
| 15 | `B2BExpressCheckout` | B2B Express Checkout |
| 16 | `PullTransaction` | Pull transaction history |
| 17 | `BusinessToPochi` | Send to Pochi wallets |
| 18 | `Swap` | Account-to-account swap |
| 19 | `IMSI` | IMSI/Subscriber query |
| 20 | `B2CAccountTopUp` | B2C account top-up |
| 21 | `MpesaRatiba` | Salary disbursement |
| 22 | `IotSimManagement` | IoT SIM management |
| 23 | `LipaNaBonga` | Redeem Bonga points |

URLs defined in `URLS` list in `scraper.py`.

## Output

All output written to `daraja_docs_v3/` (committed to repo):

```
daraja_docs_v3/
├── docs/
│   ├── Authorization.md
│   ├── DynamicQRCode.md
│   ├── ... (22 .md files)
│   └── IotSimManagement.md
├── images/
│   ├── Authorization_img_0.png
│   ├── ... (downloaded per endpoint)
│   └── IotSimManagement_img_0.jpg
└── data_index.json          # JSON catalog of all scraped docs
```

- Each `.md` file has a header with API name and source URL
- Images are downloaded via browser context (shares auth cookies)
- Image references in markdown use local relative paths (`../images/`)
- Falls back to remote URL if download fails
- Supports PNG, SVG, JPG, and base64-embedded images

## Key files

| File | Purpose |
|------|---------|
| `scraper.py` | Main scraper script (Playwright + BeautifulSoup + markdownify) |
| `setup_scraper.py` | One-command setup (deps + Playwright browser) |
| `requirements.txt` | Python dependencies |
| `data_index.json` | Pre-scraped catalog (committed for distribution) |
| `auth.json` | Cached browser session (gitignored, auto-created) |

## How it works

1. Creates `daraja_docs_v3/docs/` and `daraja_docs_v3/images/` directories
2. Launches Chromium non-headless for interactive login
3. Checks `auth.json` for cached session (validates JSON, falls back to fresh context)
4. Loads first URL and prompts for manual login if needed
5. Saves session to `auth.json` after successful login
6. Iterates all 22 URLs:
   - Navigates to page, waits for network idle + 2s grace period
   - Extracts `<main>` or `.api-details-container` or `body` innerHTML
   - Downloads all `<img>` elements (base64 or HTTP via browser context)
   - Converts HTML to Markdown via `markdownify` with ATX headings
   - Collapses excessive blank lines
   - Saves with header line and source URL
7. Writes `data_index.json` with name, url, local_path, description per API

## Error handling

- Per-endpoint errors are caught and logged (continues to next API)
- Auth corruption triggers fresh session creation
- Image download failures fall back to remote URL reference
- Network timeouts: 60s page load timeout configured
- Content extraction falls back from `<main>` → `.api-details-container` → `body`

## Dependencies

```
playwright>=1.40.0      # Browser automation
beautifulsoup4>=4.12.0  # HTML parsing
markdownify>=0.11.6     # HTML to Markdown conversion
lxml>=4.9.0             # Fast HTML parser (optional, recommended)
html5lib>=1.1           # HTML5 parser (optional)
```
