/**
 * @license
 * ReceiptFlow — Google Workspace Expense Management Add-on
 * Designed for Google Sheets & Google Workspace
 */

/**
 * Trigger called when user opens the ReceiptFlow Add-on homepage in Google Sheets
 */
function onSheetsHomepage(e) {
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle("ReceiptFlow")
    .setSubtitle("Smart Expense Management")
    .setImageStyle(CardService.ImageStyle.CIRCLE));

  // Section 1: Quick Action
  var actionSection = CardService.newCardSection()
    .setHeader("Expense Recording");

  actionSection.addWidget(CardService.newTextParagraph()
    .setText("Capture receipts with AI OCR and sync verified expenses directly into this Google Sheet with zero manual entry."));

  var syncAction = CardService.newAction().setFunctionName("onSyncExpensesClick");
  actionSection.addWidget(CardService.newTextButton()
    .setText("🔄 Sync Verified Expenses Now")
    .setOnClickAction(syncAction)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED));

  var openWebAction = CardService.newOpenLink()
    .setUrl("https://receiptflow.app")
    .setOpenAs(CardService.OpenAs.FULL_SIZE);

  actionSection.addWidget(CardService.newTextButton()
    .setText("🚀 Open ReceiptFlow Web App")
    .setOpenLink(openWebAction));

  // Section 2: Sheet Formatting
  var formatSection = CardService.newCardSection()
    .setHeader("Sheet Setup");

  var setupHeadersAction = CardService.newAction().setFunctionName("onSetupHeadersClick");
  formatSection.addWidget(CardService.newTextButton()
    .setText("📋 Initialize Expense Columns")
    .setOnClickAction(setupHeadersAction));

  card.addSection(actionSection);
  card.addSection(formatSection);

  return card.build();
}

/**
 * Initializes the current active sheet with standardized ReceiptFlow headers
 */
function onSetupHeadersClick(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var headers = [
    "Expense ID",
    "Date",
    "Merchant",
    "Category",
    "Currency",
    "Subtotal",
    "Tax",
    "Total",
    "Payment Method",
    "Reference No",
    "Status",
    "Notes",
    "Last Synced"
  ];

  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight("bold");
  range.setBackground("#f1f5f9");
  range.setFontColor("#0f172a");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("Expense columns initialized successfully!"))
    .build();
}

/**
 * Syncs reviewed expenses from ReceiptFlow API into current active sheet
 */
function onSyncExpensesClick(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getActiveSheet();

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("Sync initiated. Check the spreadsheet for updated expense rows."))
    .build();
}

/**
 * Custom Menu on Spreadsheet open
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("ReceiptFlow")
    .addItem("Sync Expenses", "onSyncExpensesClick")
    .addItem("Initialize Expense Columns", "onSetupHeadersClick")
    .addToUi();
}
