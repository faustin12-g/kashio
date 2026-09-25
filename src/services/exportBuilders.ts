import { minorToInputString } from '../utils/money';

export interface ExportRow {
  date: string;
  type: 'expense' | 'income';
  category: string;
  account: string;
  amountMinor: number;
  note: string;
}

export interface CsvHeaders {
  date: string;
  type: string;
  category: string;
  account: string;
  amount: string;
  note: string;
}

/** Quotes a value when it contains a comma, quote or line break, doubling any quotes inside. */
export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Guards against spreadsheet formula injection: a note starting with = + - @ would be run as a formula. */
function neutraliseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * A spreadsheet-ready file. Starts with a byte-order mark so Excel reads
 * accented text (Kinyarwanda, French) correctly, and uses Windows line
 * endings, which every spreadsheet program accepts.
 */
export function buildCsv(rows: ExportRow[], headers: CsvHeaders, typeLabels: { expense: string; income: string }): string {
  const lines = [[headers.date, headers.type, headers.category, headers.account, headers.amount, headers.note]];
  for (const row of rows) {
    lines.push([
      row.date,
      typeLabels[row.type],
      neutraliseFormula(row.category),
      neutraliseFormula(row.account),
      // Expenses are negative so the column adds up correctly in a spreadsheet.
      (row.type === 'expense' ? '-' : '') + minorToInputString(row.amountMinor),
      neutraliseFormula(row.note),
    ]);
  }
  return '﻿' + lines.map((line) => line.map(escapeCsvField).join(',')).join('\r\n') + '\r\n';
}

/** Makes text safe to place inside HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReportLabels {
  title: string;
  period: string;
  income: string;
  spent: string;
  balance: string;
  date: string;
  category: string;
  account: string;
  note: string;
  amount: string;
  empty: string;
  generatedBy: string;
}

export interface ReportInput {
  labels: ReportLabels;
  periodText: string;
  rows: ExportRow[];
  incomeText: string;
  spentText: string;
  balanceText: string;
  /** Formats an amount for display, e.g. "RWF 6,000". */
  formatAmount: (minor: number) => string;
  /** Logo shown in the report header, as a data URI. Left out when not given. */
  logoDataUri?: string;
}

/** A printable summary plus the full list of transactions, as a self-contained HTML page for PDF conversion. */
export function buildReportHtml(input: ReportInput): string {
  const { labels } = input;
  const body = input.rows.length
    ? input.rows
        .map((row) => {
          const sign = row.type === 'expense' ? '-' : '+';
          const cls = row.type === 'expense' ? 'out' : 'in';
          return `<tr>
            <td>${escapeHtml(row.date)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.account)}</td>
            <td>${escapeHtml(row.note)}</td>
            <td class="num ${cls}">${sign}${escapeHtml(input.formatAmount(row.amountMinor))}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" class="empty">${escapeHtml(labels.empty)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #12131a; padding: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .brand img { width: 44px; height: 44px; }
  .brand .name { font-size: 20px; font-weight: bold; color: #1541e7; }
  .period { color: #6b7080; margin-bottom: 20px; }
  .cards { display: flex; gap: 12px; margin-bottom: 24px; }
  .card { flex: 1; border: 1px solid #e2e4ec; border-radius: 10px; padding: 12px; }
  .card .label { font-size: 12px; color: #6b7080; text-transform: uppercase; }
  .card .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; border-bottom: 2px solid #12131a; padding: 6px 4px; }
  td { border-bottom: 1px solid #e2e4ec; padding: 6px 4px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-weight: bold; }
  .in { color: #16a34a; }
  .out { color: #dc2626; }
  .empty { text-align: center; color: #6b7080; padding: 20px; }
  .footer { margin-top: 24px; font-size: 11px; color: #6b7080; }
</style>
</head>
<body>
  ${
    input.logoDataUri
      ? `<div class="brand"><img src="${escapeHtml(input.logoDataUri)}" alt="Kashio" /><span class="name">Kashio</span></div>`
      : ''
  }
  <h1>${escapeHtml(labels.title)}</h1>
  <div class="period">${escapeHtml(labels.period)}: ${escapeHtml(input.periodText)}</div>
  <div class="cards">
    <div class="card"><div class="label">${escapeHtml(labels.income)}</div><div class="value in">${escapeHtml(input.incomeText)}</div></div>
    <div class="card"><div class="label">${escapeHtml(labels.spent)}</div><div class="value out">${escapeHtml(input.spentText)}</div></div>
    <div class="card"><div class="label">${escapeHtml(labels.balance)}</div><div class="value">${escapeHtml(input.balanceText)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>${escapeHtml(labels.date)}</th><th>${escapeHtml(labels.category)}</th><th>${escapeHtml(labels.account)}</th>
      <th>${escapeHtml(labels.note)}</th><th class="num">${escapeHtml(labels.amount)}</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="footer">${escapeHtml(labels.generatedBy)}</div>
</body>
</html>`;
}
