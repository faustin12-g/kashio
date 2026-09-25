import React, { useState } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { useTheme } from '../constants/theme';
import { useMoney } from '../hooks/useMoney';
import { categoryDisplayName, formatDateForLanguage } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useAccountsStore } from '../store/accountsStore';
import { useCategoriesStore } from '../store/categoriesStore';
import { listTransactions } from '../repositories/transactionsRepository';
import { buildCsv, buildReportHtml, type ExportRow } from '../services/exportBuilders';
import { getSummary } from '../services/summary';
import { toIsoDate } from '../utils/date';

type ExportFormat = 'csv' | 'pdf';
type ExportRange = 'thisMonth' | 'last3' | 'thisYear' | 'all';

function rangeDates(range: ExportRange, now = new Date()): { from?: string; to?: string } {
  switch (range) {
    case 'thisMonth':
      return { from: toIsoDate(startOfMonth(now)), to: toIsoDate(endOfMonth(now)) };
    case 'last3':
      return { from: toIsoDate(startOfMonth(subMonths(now, 2))), to: toIsoDate(endOfMonth(now)) };
    case 'thisYear':
      return { from: toIsoDate(startOfYear(now)), to: toIsoDate(now) };
    default:
      return {};
  }
}

export default function ExportScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const categories = useCategoriesStore((state) => state.categories);
  const accounts = useAccountsStore((state) => state.accounts);

  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [range, setRange] = useState<ExportRange>('thisMonth');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setMessage(t('exp.noSharing'));
        return;
      }
      const dates = rangeDates(range);
      // Oldest first reads naturally in a spreadsheet or report.
      const transactions = (await listTransactions(db, dates)).slice().reverse();
      const rows: ExportRow[] = transactions.map((transaction) => {
        const category = categories.find((entry) => entry.id === transaction.categoryId);
        const account = accounts.find((entry) => entry.id === transaction.accountId);
        return {
          date: transaction.date,
          type: transaction.type,
          category: category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'),
          account: account?.name ?? '',
          amountMinor: transaction.amountMinor,
          note: transaction.note,
        };
      });

      const stamp = format(new Date(), 'yyyy-MM-dd');
      let uri: string;
      let mimeType: string;

      if (exportFormat === 'csv') {
        const csv = buildCsv(
          rows,
          {
            date: t('exp.colDate'),
            type: t('exp.colType'),
            category: t('exp.colCategory'),
            account: t('exp.colAccount'),
            amount: t('exp.colAmount'),
            note: t('exp.colNote'),
          },
          { expense: t('form.expense'), income: t('form.income') }
        );
        const file = new File(Paths.cache, `kashio-${stamp}.csv`);
        file.create({ overwrite: true });
        file.write(csv);
        uri = file.uri;
        mimeType = 'text/csv';
      } else {
        const summary = await getSummary(db, dates);
        const first = rows[0]?.date;
        const last = rows[rows.length - 1]?.date;
        const periodText =
          range === 'all'
            ? first && last
              ? `${formatDateForLanguage(first, language)} – ${formatDateForLanguage(last, language)}`
              : t('exp.allTime')
            : `${formatDateForLanguage(dates.from!, language)} – ${formatDateForLanguage(dates.to!, language)}`;
        const html = buildReportHtml({
          labels: {
            title: t('exp.reportTitle'),
            period: t('exp.period'),
            income: t('home.income'),
            spent: t('home.spent'),
            balance: t('home.balance'),
            date: t('exp.colDate'),
            category: t('exp.colCategory'),
            account: t('exp.colAccount'),
            note: t('exp.colNote'),
            amount: t('exp.colAmount'),
            empty: t('exp.empty'),
            generatedBy: t('exp.madeWith'),
          },
          periodText,
          rows,
          incomeText: money(summary.incomeMinor),
          spentText: money(summary.expenseMinor),
          balanceText: money(summary.incomeMinor - summary.expenseMinor),
          formatAmount: money,
        });
        const printed = await Print.printToFileAsync({ html });
        uri = printed.uri;
        mimeType = 'application/pdf';
      }

      await Sharing.shareAsync(uri, { mimeType, dialogTitle: t('exp.shareTitle') });
    } catch {
      setMessage(t('exp.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('exp.title') }} />
      <Text style={{ color: theme.textMuted }}>{t('exp.intro')}</Text>

      <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>
        {t('exp.format')}
      </Text>
      <ChipGroup
        value={exportFormat}
        onChange={setExportFormat}
        options={[
          { value: 'csv', label: t('exp.csv'), icon: 'file-delimited-outline' },
          { value: 'pdf', label: t('exp.pdf'), icon: 'file-pdf-box' },
        ]}
      />
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>
        {exportFormat === 'csv' ? t('exp.csvHint') : t('exp.pdfHint')}
      </Text>

      <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>
        {t('exp.range')}
      </Text>
      <ChipGroup
        value={range}
        onChange={setRange}
        options={[
          { value: 'thisMonth', label: t('exp.thisMonth') },
          { value: 'last3', label: t('exp.last3') },
          { value: 'thisYear', label: t('exp.thisYear') },
          { value: 'all', label: t('exp.allTime') },
        ]}
      />

      {message && <Text style={{ color: theme.danger }}>{message}</Text>}

      <Button label={busy ? t('exp.creating') : t('exp.create')} onPress={handleCreate} loading={busy} />
    </Screen>
  );
}
