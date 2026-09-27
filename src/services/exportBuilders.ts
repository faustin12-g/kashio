import { minorToInputString } from '../utils/money';

export interface ExportRow {
  date: string;
  type: 'expense' | 'income';
  category: string;
  amountMinor: number;
  note: string;
}

export interface CsvHeaders {
  date: string;
  type: string;
  category: string;
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
  const lines = [[headers.date, headers.type, headers.category, headers.amount, headers.note]];
  for (const row of rows) {
    lines.push([
      row.date,
      typeLabels[row.type],
      neutraliseFormula(row.category),
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
  note: string;
  colExpense: string;
  colIncome: string;
  total: string;
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

/**
 * A printable summary plus the full list of transactions, as a self-contained
 * HTML page for PDF conversion. Expense and income get their own columns
 * (each row fills only the one that applies) with a totals row at the foot,
 * the way a bank or accounting statement lays one out.
 */
export function buildReportHtml(input: ReportInput): string {
  const { labels } = input;
  let expenseTotal = 0;
  let incomeTotal = 0;

  const body = input.rows.length
    ? input.rows
        .map((row) => {
          if (row.type === 'expense') expenseTotal += row.amountMinor;
          else incomeTotal += row.amountMinor;
          const amount = input.formatAmount(row.amountMinor);
          return `<tr>
            <td>${escapeHtml(row.date)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.note)}</td>
            <td class="num out">${row.type === 'expense' ? escapeHtml(amount) : ''}</td>
            <td class="num in">${row.type === 'income' ? escapeHtml(amount) : ''}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" class="empty">${escapeHtml(labels.empty)}</td></tr>`;

  const footer = input.rows.length
    ? `<tr class="totals">
        <td colspan="3">${escapeHtml(labels.total)}</td>
        <td class="num out">${escapeHtml(input.formatAmount(expenseTotal))}</td>
        <td class="num in">${escapeHtml(input.formatAmount(incomeTotal))}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root {
    --ink: #1A1D27;
    --muted: #6B7280;
    --line: #E5E7EB;
    --brand: #1541E7;
    --brand-soft: #EEF1FD;
    --income: #0F766E;
    --income-soft: #ECFDF9;
    --expense: #9A3412;
    --expense-soft: #FEF3EC;
    --paper: #FFFFFF;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: var(--ink); background: var(--paper); padding: 32px; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .brand img { width: 40px; height: 40px; border-radius: 10px; }
  .brand .name { font-size: 16px; font-weight: 700; color: var(--brand); letter-spacing: 0.2px; }
  h1 { font-size: 21px; font-weight: 700; margin: 0 0 4px; }
  .period { color: var(--muted); font-size: 13px; margin-bottom: 22px; }
  .cards { display: flex; gap: 12px; margin-bottom: 26px; }
  .card { flex: 1; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .card .label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .card .value { font-size: 19px; font-weight: 700; margin-top: 6px; color: var(--ink); }
  .card.income { background: var(--income-soft); border-color: var(--income-soft); }
  .card.income .value { color: var(--income); }
  .card.expense { background: var(--expense-soft); border-color: var(--expense-soft); }
  .card.expense .value { color: var(--expense); }
  .card.balance { background: var(--brand-soft); border-color: var(--brand-soft); }
  .card.balance .value { color: var(--brand); }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
    color: var(--muted); border-bottom: 2px solid var(--ink); padding: 8px 6px;
  }
  td { border-bottom: 1px solid var(--line); padding: 8px 6px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-weight: 600; font-variant-numeric: tabular-nums; }
  .in { color: var(--income); }
  .out { color: var(--expense); }
  tr.totals td { border-top: 2px solid var(--ink); border-bottom: none; font-weight: 700; padding-top: 10px; }
  .empty { text-align: center; color: var(--muted); padding: 28px; }
  .footer { margin-top: 28px; font-size: 10.5px; color: var(--muted); text-align: center; }
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
    <div class="card income"><div class="label">${escapeHtml(labels.income)}</div><div class="value">${escapeHtml(input.incomeText)}</div></div>
    <div class="card expense"><div class="label">${escapeHtml(labels.spent)}</div><div class="value">${escapeHtml(input.spentText)}</div></div>
    <div class="card balance"><div class="label">${escapeHtml(labels.balance)}</div><div class="value">${escapeHtml(input.balanceText)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>${escapeHtml(labels.date)}</th><th>${escapeHtml(labels.category)}</th><th>${escapeHtml(labels.note)}</th>
      <th class="num">${escapeHtml(labels.colExpense)}</th><th class="num">${escapeHtml(labels.colIncome)}</th>
    </tr></thead>
    <tbody>${body}${footer}</tbody>
  </table>
  <div class="footer">${escapeHtml(labels.generatedBy)}</div>
</body>
</html>`;
}
