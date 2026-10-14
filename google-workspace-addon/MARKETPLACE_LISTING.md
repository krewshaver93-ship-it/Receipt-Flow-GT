# Google Workspace Marketplace Listing — ReceiptFlow

## 1. Application Identity
- **Application Name**: ReceiptFlow
- **Tagline**: Fast AI Receipt Capture & Expense Tracking for Google Workspace
- **Category**: Business Tools / Finance & Accounting
- **Developer**: ReceiptFlow Team (Independent Developer)
- **Developer Disclaimer**: The seller is the ReceiptFlow developer, not Google. ReceiptFlow is an independent application designed to integrate with Google Workspace.

## 2. Pricing & Subscriptions
- **Free Tier**: 5 receipt extractions per month, basic dashboard, manual corrections, basic Google Sheets export. Free forever.
- **ReceiptFlow Pro**: **$9.99 USD per user per month** (billed monthly via PayPal Subscriptions).
- **Competitor Benchmark**: Expensify Collect is publicly listed at $5.00 per member per month. ReceiptFlow Pro is $3.00/user/month, offering a 40% reduction in software overhead with direct, native Google Workspace integration.
- **Cancellation & Refunds**: Straightforward one-click cancellation anytime in the Billing tab. Access remains active through the end of the paid billing period.

## 3. Scopes & Least Privilege Justification
ReceiptFlow adheres strictly to the Principle of Least Privilege:
1. `https://www.googleapis.com/auth/spreadsheets`:
   - **Why needed**: Required to create and update dedicated expense spreadsheets with reviewed transaction rows and maintain stable column schemas.
2. `https://www.googleapis.com/auth/drive.file`:
   - **Why needed**: Allows ReceiptFlow to create and access only files explicitly created or opened by ReceiptFlow (such as user-selected receipts or generated expense exports).
   - **Scope Minimization**: ReceiptFlow explicitly avoids broad Google Drive (`drive`) or broad Gmail (`gmail.readonly`) scopes.

## 4. Key Features
- **Instant AI Document Extraction**: Automatic extraction of Merchant, Date, Currency, Subtotal, Tax, Total, Category, Payment Method, and Reference Number.
- **Duplicate Detection**: SHA-256 binary file hash and identical transaction field matching to prevent double-counting.
- **Direct Google Sheets Sync**: Idempotent row sync with stable IDs so your spreadsheet stays clean and up to date without manual copy-pasting.
- **Repeatable Benchmark Tool**: Built-in verification measuring click count, processing latency, and input corrections.
- **Safe CSV & Audit Trail**: Full export capability and compliance logging.

## 5. Security & Data Handling
- Multi-tenant tenant isolation with organization identifiers.
- Parameterized database queries and strict data retention controls.
- Receipt images and tokens are never logged or exposed to client browsers.
- Account deletion erases all workspace data immediately upon request.
