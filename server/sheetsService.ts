export interface SheetRowExpense {
  id: string;
  date: string;
  merchant: string;
  category: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
  reference_no?: string;
  review_status: string;
  notes?: string;
  updated_at: string;
}

const HEADERS = [
  'Expense ID',
  'Date',
  'Merchant',
  'Category',
  'Currency',
  'Subtotal',
  'Tax',
  'Total',
  'Payment Method',
  'Reference No',
  'Status',
  'Notes',
  'Last Synced',
];

/**
 * Creates a dedicated "ReceiptFlow Expenses" spreadsheet using user's Google OAuth Bearer token
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string = 'ReceiptFlow Expenses'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetName: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Expenses',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Sheets API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header row with formatting
  await initializeSheetHeaders(accessToken, spreadsheetId, 'Expenses');

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheetName: 'Expenses',
  };
}

/**
 * Initializes header row in the spreadsheet
 */
export async function initializeSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = 'Expenses'
): Promise<void> {
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:M1?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetName}!A1:M1`,
      majorDimension: 'ROWS',
      values: [HEADERS],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to write headers to Google Sheet (${response.status}): ${errorBody}`);
  }
}

/**
 * Syncs expense records idempotently to the designated Google Sheet
 */
export async function syncExpensesToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  expenses: SheetRowExpense[]
): Promise<{ syncedCount: number; updatedCount: number; appendedCount: number }> {
  // 1. Fetch current rows to find existing Expense IDs
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A:M`;

  const getResponse = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!getResponse.ok) {
    const errorBody = await getResponse.text();
    if (getResponse.status === 404) {
      throw new Error('Spreadsheet not found or access has been revoked.');
    }
    throw new Error(`Failed to read spreadsheet (${getResponse.status}): ${errorBody}`);
  }

  const sheetData = await getResponse.json();
  const rows: any[][] = sheetData.values || [];

  // Map of expenseId -> rowIndex (1-indexed for sheets)
  const existingIdToRowIndex = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0]) {
      existingIdToRowIndex.set(String(row[0]).trim(), i + 1);
    }
  }

  let updatedCount = 0;
  let appendedCount = 0;

  const rowsToAppend: any[][] = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  for (const exp of expenses) {
    const formattedRow = [
      exp.id,
      exp.date,
      exp.merchant,
      exp.category,
      exp.currency,
      exp.subtotal,
      exp.tax,
      exp.total,
      exp.payment_method || '',
      exp.reference_no || '',
      exp.review_status,
      exp.notes || '',
      now,
    ];

    const existingRowIndex = existingIdToRowIndex.get(exp.id);
    if (existingRowIndex) {
      // Update existing row
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        sheetName
      )}!A${existingRowIndex}:M${existingRowIndex}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${sheetName}!A${existingRowIndex}:M${existingRowIndex}`,
          majorDimension: 'ROWS',
          values: [formattedRow],
        }),
      });
      updatedCount++;
    } else {
      rowsToAppend.push(formattedRow);
    }
  }

  if (rowsToAppend.length > 0) {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A:M:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A:M`,
        majorDimension: 'ROWS',
        values: rowsToAppend,
      }),
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      throw new Error(`Failed to append rows to sheet: ${errText}`);
    }
    appendedCount = rowsToAppend.length;
  }

  return {
    syncedCount: updatedCount + appendedCount,
    updatedCount,
    appendedCount,
  };
}

/**
 * Generates RFC 4180 compliant CSV format for safe download
 */
export function generateCsvExport(expenses: SheetRowExpense[]): string {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = HEADERS.map(escapeCsv).join(',');
  const rowLines = expenses.map((exp) => {
    return [
      exp.id,
      exp.date,
      exp.merchant,
      exp.category,
      exp.currency,
      exp.subtotal.toFixed(2),
      exp.tax.toFixed(2),
      exp.total.toFixed(2),
      exp.payment_method || '',
      exp.reference_no || '',
      exp.review_status,
      exp.notes || '',
      exp.updated_at,
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}
