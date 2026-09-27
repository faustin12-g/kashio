import {
  buildCsv,
  buildReportHtml,
  escapeCsvField,
  escapeHtml,
  type ExportRow,
  type ReportLabels,
} from '../../src/services/exportBuilders';
import { BACKUP_SCHEMA_VERSION, parseBackupPayload } from '../../src/services/backupFormat';
import { buildUpsertSql } from '../../src/db/upsert';
import { buildWhere } from '../../src/repositories/transactionsRepository';
import { buildSummary } from '../../src/services/summary';

const HEADERS = { date: 'Date', type: 'Type', category: 'Category', amount: 'Amount', note: 'Note' };
const TYPES = { expense: 'Expense', income: 'Income' };

const row = (overrides: Partial<ExportRow> = {}): ExportRow => ({
  date: '2026-09-10',
  type: 'expense',
  category: 'Groceries',
  amountMinor: 650000,
  note: 'Weekly shop',
  ...overrides,
});

describe('escapeCsvField', () => {
  it('leaves plain text alone', () => {
    expect(escapeCsvField('Groceries')).toBe('Groceries');
  });

  it('quotes text containing commas, quotes or line breaks and doubles inner quotes', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('buildCsv', () => {
  it('starts with a byte-order mark and a header row, and uses Windows line endings', () => {
    const csv = buildCsv([], HEADERS, TYPES);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Date,Type,Category,Amount,Note\r\n');
  });

  it('writes expenses as negative amounts and income as positive', () => {
    const csv = buildCsv([row(), row({ type: 'income', amountMinor: 100000, note: 'Pay' })], HEADERS, TYPES);
    expect(csv).toContain('2026-09-10,Expense,Groceries,-6500.00,Weekly shop');
    expect(csv).toContain('2026-09-10,Income,Groceries,1000.00,Pay');
  });

  it('keeps awkward notes intact in one field', () => {
    const csv = buildCsv([row({ note: 'milk, bread "fresh"' })], HEADERS, TYPES);
    expect(csv).toContain('"milk, bread ""fresh"""');
  });

  it('defuses notes that a spreadsheet would run as a formula', () => {
    const csv = buildCsv([row({ note: '=HYPERLINK("http://evil")' })], HEADERS, TYPES);
    expect(csv).not.toMatch(/,=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });
});

describe('escapeHtml', () => {
  it('escapes everything that could break out of a text position', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;'
    );
  });
});

describe('buildReportHtml', () => {
  const labels: ReportLabels = {
    title: 'Kashio report',
    period: 'Period',
    income: 'Income',
    spent: 'Spent',
    balance: 'Balance',
    date: 'Date',
    category: 'Category',
    note: 'Note',
    colExpense: 'Expense',
    colIncome: 'Income',
    total: 'Total',
    empty: 'Nothing here',
    generatedBy: 'Made with Kashio',
  };
  const input = {
    labels,
    periodText: 'September 2026',
    incomeText: 'RWF 10,000',
    spentText: 'RWF 6,500',
    balanceText: 'RWF 3,500',
    formatAmount: (minor: number) => `RWF ${minor / 100}`,
  };

  it('contains the summary and every transaction', () => {
    const html = buildReportHtml({ ...input, rows: [row()] });
    expect(html).toContain('Kashio report');
    expect(html).toContain('September 2026');
    expect(html).toContain('RWF 3,500');
    expect(html).toContain('Weekly shop');
    expect(html).toContain('RWF 6500');
  });

  it('puts an expense in the expense column only, and income in the income column only', () => {
    const html = buildReportHtml({
      ...input,
      rows: [row({ amountMinor: 650000 }), row({ type: 'income', amountMinor: 100000, note: 'Pay', category: 'Salary' })],
    });
    expect(html).toMatch(/Weekly shop<\/td>\s*<td class="num out">RWF 6500<\/td>\s*<td class="num in"><\/td>/);
    expect(html).toMatch(/Pay<\/td>\s*<td class="num out"><\/td>\s*<td class="num in">RWF 1000<\/td>/);
  });

  it('adds a totals row summing each column', () => {
    const html = buildReportHtml({
      ...input,
      rows: [row({ amountMinor: 650000 }), row({ amountMinor: 50000 }), row({ type: 'income', amountMinor: 100000 })],
    });
    expect(html).toContain('class="totals"');
    // The test formatter divides by 100: expense total 650000 + 50000 = 700000 -> "RWF 7000".
    expect(html).toMatch(/class="totals">\s*<td colspan="3">Total<\/td>\s*<td class="num out">RWF 7000<\/td>\s*<td class="num in">RWF 1000<\/td>/);
  });

  it('shows a message instead of an empty table, with no totals row', () => {
    const html = buildReportHtml({ ...input, rows: [] });
    expect(html).toContain('Nothing here');
    expect(html).not.toContain('class="totals"');
  });

  it('shows the logo in the header only when one is given', () => {
    const withLogo = buildReportHtml({ ...input, rows: [], logoDataUri: 'data:image/png;base64,AAAA' });
    expect(withLogo).toContain('<img src="data:image/png;base64,AAAA"');
    expect(buildReportHtml({ ...input, rows: [] })).not.toContain('<img');
  });

  it('cannot be broken by hostile text in a note', () => {
    const html = buildReportHtml({ ...input, rows: [row({ note: '<img src=x onerror=alert(1)>' })] });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});

describe('parseBackupPayload', () => {
  const version1 = JSON.stringify({
    schemaVersion: 1,
    exportedAt: '2026-01-01T00:00:00Z',
    deviceName: 'Android device',
    categories: [],
    transactions: [],
    budgets: [],
  });

  it('accepts an old version-1 backup and fills in the lists it did not have', () => {
    const payload = parseBackupPayload(version1);
    expect(payload.goals).toEqual([]);
    expect(payload.debts).toEqual([]);
    expect(payload.recurring).toEqual([]);
  });

  it('accepts a current backup', () => {
    const current = JSON.stringify({ ...JSON.parse(version1), schemaVersion: BACKUP_SCHEMA_VERSION, currency: 'RWF' });
    const payload = parseBackupPayload(current);
    expect(payload.currency).toBe('RWF');
  });

  it('ignores accounts/transfers left over in an old backup rather than choking on them', () => {
    const legacy = JSON.stringify({ ...JSON.parse(version1), accounts: [{ id: 'a' }], transfers: [{ id: 't' }] });
    expect(() => parseBackupPayload(legacy)).not.toThrow();
  });

  it('refuses a backup from a newer app version rather than misreading it', () => {
    const future = JSON.stringify({ ...JSON.parse(version1), schemaVersion: BACKUP_SCHEMA_VERSION + 1 });
    expect(() => parseBackupPayload(future)).toThrow(/newer version/i);
  });

  it('refuses text that is not JSON or is missing the core lists', () => {
    expect(() => parseBackupPayload('not json')).toThrow(/not valid JSON/i);
    expect(() => parseBackupPayload('{"schemaVersion":1}')).toThrow(/unexpected format/i);
    expect(() => parseBackupPayload('null')).toThrow(/unexpected format/i);
  });
});

describe('buildUpsertSql', () => {
  it('overwrites every column except the id when the row already exists', () => {
    expect(buildUpsertSql('goals', ['id', 'name', 'target_minor'])).toBe(
      'INSERT INTO goals (id, name, target_minor) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, target_minor = excluded.target_minor'
    );
  });

  it('refuses column names that are not plain lowercase words', () => {
    expect(() => buildUpsertSql('goals', ['id', 'name; DROP TABLE goals'])).toThrow(/Invalid column/);
  });
});

describe('buildWhere', () => {
  it('always excludes deleted rows', () => {
    expect(buildWhere({}).clause).toBe('deleted_at IS NULL');
  });

  it('combines every filter with matching values in order', () => {
    const { clause, params } = buildWhere({
      from: '2026-09-01',
      to: '2026-09-30',
      categoryId: 'c1',
      type: 'expense',
      minMinor: 100,
      maxMinor: 900,
    });
    expect(clause).toContain('date >= ?');
    expect(clause).toContain('date <= ?');
    expect(clause).toContain('category_id = ?');
    expect(clause).toContain('type = ?');
    expect(clause).toContain('amount_minor >= ?');
    expect(clause).toContain('amount_minor <= ?');
    expect(params).toEqual(['2026-09-01', '2026-09-30', 'c1', 'expense', 100, 900]);
  });

  it('searches both the note and the category name, escaping wildcard characters', () => {
    const { clause, params } = buildWhere({ search: '50%_off' });
    expect(clause).toContain('note LIKE ?');
    expect(clause).toContain('SELECT id FROM categories WHERE name LIKE ?');
    expect(params).toEqual(['%50\\%\\_off%', '%50\\%\\_off%']);
  });

  it('ignores a blank search and keeps a zero amount limit', () => {
    expect(buildWhere({ search: '   ' }).params).toEqual([]);
    expect(buildWhere({ minMinor: 0 }).params).toEqual([0]);
  });
});

describe('buildSummary', () => {
  it('balance is income minus spending', () => {
    // "Money I already had" is itself recorded as income, so it needs no separate term here.
    expect(buildSummary(2000, 500).balanceMinor).toBe(1500);
  });
});
