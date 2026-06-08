# Daraja API Endpoint Reference

A comprehensive listing of all Safaricom Daraja API endpoints, methods, descriptions, and links to detailed documentation.

---

## Authorization

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `GET` | `/oauth/v1/generate?grant_type=client_credentials` | Generate OAuth 2.0 access token (required before all other API calls) | [Authorization](Authorization.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
**Production:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

---

## M-PESA Core APIs

### Account Balance

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/accountbalance/v1/query` | Enquire the balance on an M-PESA BuyGoods (Till Number) shortcode | [Account Balance](Account%20Balance.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query`
**Production:** `https://api.safaricom.co.ke/mpesa/accountbalance/v1/query`

### Business to Business (B2B)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2b/v1/paymentrequest` | **DEPRECATED** — Pay goods/services from business account to till/merchant store | [Business to Business (B2B)](Business%20to%20Business%20(B2B).md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

### B2B Express CheckOut

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/v1/ussdpush/get-msisdn` | Initiate USSD Push to Till enabling merchants to pay from their till numbers to vendor paybills | [B2B Express CheckOut](B2B%20Express%20CheckOut.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/v1/ussdpush/get-msisdn`
**Production:** `https://api.safaricom.co.ke/v1/ussdpush/get-msisdn`

### B2C Account Top Up

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2b/v1/paymentrequest` | Load funds to a B2C shortcode for disbursement (CommandID: `BusinessPayToBulk`) | [B2C Account Top Up](B2C%20Account%20Top%20Up.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

### Business to Customer (B2C)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2c/v3/paymentrequest` | Make payments from a Business to Customers (Bulk Disbursements) | [Business To Customer (B2C)](Business%20To%20Customer%20(B2C).md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest`

### Business to Pochi (B2Pochi)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2pochi/v1/paymentrequest` | Make payments from a Business to a customer's business wallet (Pochi la Biashara) | [Business To Pochi (B2Pochi)](Business%20To%20Pochi(B2Pochi).md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2pochi/v1/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2pochi/v1/paymentrequest`

### Business Buy Goods

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2b/v1/paymentrequest` | Pay for goods/services from business account to a till number (CommandID: `BusinessBuyGoods`) | [Business Buy Goods](Business%20Buy%20Goods.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

### Business Pay Bill

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2b/v1/paymentrequest` | Pay bills from business account to a paybill number (CommandID: `BusinessPayBill`) | [Business Pay Bill](Business%20Pay%20Bill.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

### Customer to Business (C2B)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/c2b/v2/registerurl` | Register validation and confirmation URLs for payment notifications | [Customer To Business (C2B)](Customer%20To%20Business%20(C2B).md) |
| `POST` | `/mpesa/c2b/v1/simulate` | Simulate a C2B transaction (Sandbox only) | [Customer To Business (C2B)](Customer%20To%20Business%20(C2B).md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl`
**Production:** `https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl`

### Dynamic QR

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/qrcode/v1/generate` | Generate a dynamic M-PESA QR Code for payments | [Dynamic QR](Dynamic%20QR.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate`
**Production:** `https://api.safaricom.co.ke/mpesa/qrcode/v1/generate`

### M-Pesa Express (STK Push)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/stkpush/v1/processrequest` | Initiate an online payment (Lipa Na M-PESA) on behalf of a customer via STK Push | [M-Pesa Express](M-Pesa%20Express.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
**Production:** `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`

### M-Pesa Express Query

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/stkpushquery/v1/query` | Check the status of a Lipa Na M-PESA Online Payment | [M-Pesa Express Query](M-Pesa%20Express%20Query.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query`
**Production:** `https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query`

### M-Pesa Ratiba (Standing Orders)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/standingorder/v1/createStandingOrderExternal` | Create an M-PESA standing order on a customer profile | [M-Pesa Ratiba](M-Pesa%20Ratiba.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/standingorder/v1/createStandingOrderExternal`
**Production:** `https://api.safaricom.co.ke/standingorder/v1/createStandingOrderExternal`

### Pull Transactions

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/pulltransactions/v1/register` | Register a shortcode for pulling C2B transactions | [Pull Transactions](Pull%20Transactions.md) |
| `GET` | `/pulltransactions/v1/query` | Query all C2B transactions within the last 48 hours | [Pull Transactions](Pull%20Transactions.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/pulltransactions/v1/register`
**Production:** `https://api.safaricom.co.ke/pulltransactions/v1/register`

### Query Organization Info

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/sfcverify/v1/query/info` | Look up an organization's shortcode name and applicable tariff | [Query Org Info](Query%20Org%20Info.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/sfcverify/v1/query/info`
**Production:** `https://api.safaricom.co.ke/sfcverify/v1/query/info`

### Reversals

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/reversal/v1/request` | Reverse a C2B M-PESA transaction | [Reversals](Reversals.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request`
**Production:** `https://api.safaricom.co.ke/mpesa/reversal/v1/request`

### Tax Remittance

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/b2b/v1/remittax` | Remit tax to Kenya Revenue Authority (KRA) — CommandID: `PayTaxToKRA` | [Tax Remittance](Tax%20Remittance.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/remittax`
**Production:** `https://api.safaricom.co.ke/mpesa/b2b/v1/remittax`

### Transaction Status

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/mpesa/transactionstatus/v1/query` | Check the status of any M-PESA transaction (C2B, B2B, B2C, Reversal, IMT) | [Transaction Status](Transaction%20Status.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query`
**Production:** `https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query`

---

## Bonga Loyalty APIs

### Lipa na Bonga — Calculate Points

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/v1/lipa/na/bonga/calculate-points` | Calculate the KES equivalent of Bonga loyalty points | [Lipa na Bonga](Lipa%20na%20Bonga.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/v1/lipa/na/bonga/calculate-points`
**Production:** `https://api.safaricom.co.ke/v1/lipa/na/bonga/calculate-points`

### Lipa na Bonga — Redeem Points

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/v1/lipa/na/bonga/redeem-paybill` | Redeem Bonga points towards payment for goods/services | [Lipa na Bonga](Lipa%20na%20Bonga.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/v1/lipa/na/bonga/redeem-paybill`
**Production:** `https://api.safaricom.co.ke/v1/lipa/na/bonga/redeem-paybill`

---

## SIM & Network APIs

### IMSI

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/imsi/v1/checkATI` | Query network age, hashed IMSI, and last SIM swap date of a Safaricom number | [IMSI](IMSI.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/imsi/v1/checkATI`
**Production:** `https://api.safaricom.co.ke/imsi/v1/checkATI`

### SIM Swap (SWAP)

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/imsi/v2/checkATI` | Query the last date a SIM card was swapped | [Swap](Swap.md) |

**Sandbox:** `https://sandbox.safaricom.co.ke/imsi/v2/checkATI`
**Production:** `https://api.safaricom.co.ke/imsi/v2/checkATI`

---

## Bill Manager APIs

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/v1/billmanager-invoice/optin` | Opt-in a shortcode to Bill Manager features | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/single-invoicing` | Create and send a single e-invoice to a customer | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/bulk-invoicing` | Send multiple e-invoices (up to 1000 per call) | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/reconciliation` | Payment reconciliation endpoint for bill payments | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/cancel-single-invoice` | Cancel a single sent invoice | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/cancel-bulk-invoices` | Cancel multiple sent invoices | [Bill Manager](Bill%20Manager.md) |
| `POST` | `/v1/billmanager-invoice/change-optin-details` | Update existing opt-in details | [Bill Manager](Bill%20Manager.md) |

**Base URL (Sandbox):** `https://sandbox.safaricom.co.ke`
**Base URL (Production):** `https://api.safaricom.co.ke`

---

## IoT SIM Management APIs

| Method | Endpoint | Description | Details |
|--------|----------|-------------|---------|
| `POST` | `/simportal/v1/allsims` | Fetch details of all SIMs in a customer account | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/queryLifeCycleStatus` | Check lifecycle status of a SIM card | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/querycustomerinfo` | Check SIM card and product/tariff status | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/simactivation` | Activate a SIM card | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/getactivationtrends` | Get visual trend data of SIM operations | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/renameasset` | Assign a name to a SIM card/asset | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/suspend_unsuspend_sub` | Suspend or unsuspend a subscriber/SIM | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/searchmessages?pageNo=1&pageSize=50` | Search messages by SIM | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/filtermessages?pageNo=1&pageSize=10` | Filter messages by date range and status | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/deleteMessageThread` | Delete all messages sent to a SIM | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/getallmessages?pageNo=1&pageSize=10` | Fetch all messages across all SIMs in an account | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/sendsinglemessage` | Send a single message to a SIM | [IoT SIM Management](IoT%20SIM%20Management.md) |
| `POST` | `/simportal/v1/deletemessage` | Delete a specific message by ID | [IoT SIM Management](IoT%20SIM%20Management.md) |

**Base URL (Sandbox):** `https://sandbox.safaricom.co.ke`
**Base URL (Production):** `https://api.safaricom.co.ke`

---

## API Summary by Category

| Category | APIs |
|----------|------|
| **Authentication** | Authorization |
| **Payments (Business Initiated)** | M-Pesa Express, B2C, B2B, B2Pochi, Business Pay Bill, Business Buy Goods, B2B Express CheckOut, Tax Remittance |
| **Payments (Customer Initiated)** | C2B, Dynamic QR |
| **Account Management** | Account Balance, B2C Account Top Up |
| **Reconciliation** | Transaction Status, Pull Transactions, Account Balance |
| **Validation & Lookup** | Query Org Info, IMSI, SIM Swap |
| **Loyalty** | Lipa na Bonga (Calculate & Redeem) |
| **Recurring Payments** | M-Pesa Ratiba |
| **Error Correction** | Reversals |
| **Invoicing** | Bill Manager (Onboarding, Single/Bulk Invoicing, Reconciliation, Cancel) |
| **IoT** | IoT SIM Management (SIM Operations & Messaging) |
