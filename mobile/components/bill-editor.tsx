import * as Crypto from 'expo-crypto';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AmountField } from '@/components/ui/amount-field';
import { amountFromNumber } from '@/lib/amount-draft';
import { useFeedback } from '@/providers/feedback-provider';
import { ChoiceChips, FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { deleteBill, deleteBillPayment, markBillPaid, saveBill } from '@/lib/finance-actions';
import { fetchCategories } from '@/lib/finance-data';
import { parseAmount } from '@/lib/finance-validation';
import { formatISK, monthLabel } from '@/lib/format';
import { BillWithPayment } from '@/types/finance';

type BillEditorProps = {
  userId: string;
  month: string;
  bill: BillWithPayment | null;
  onClose: () => void;
  onSaved: () => void;
};

export function BillEditor({ userId, month, bill, onClose, onSaved }: BillEditorProps) {
  const { colors } = useAppTheme();
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(amountFromNumber(bill?.amount));
  const notify = useFeedback();
  const [dueDay, setDueDay] = useState(String(bill?.due_day ?? 1));
  const [category, setCategory] = useState(bill?.category_id ?? '');
  const [active, setActive] = useState(bill?.is_active ?? true);
  const [requestId] = useState(() => Crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<'pay' | 'unpay' | 'delete' | null>(null);
  const { busy, error, clearError, run } = useFormAction();
  const loadCategories = useCallback(() => fetchCategories(userId), [userId]);
  const categories = useRefreshableData(loadCategories);
  const paid = Boolean(bill?.payment);
  const dirty = Boolean(bill && (name !== bill.name || amount !== amountFromNumber(bill.amount) || dueDay !== String(bill.due_day) || category !== (bill.category_id ?? '') || active !== bill.is_active));

  function confirm(action: typeof confirmation) {
    clearError();
    setConfirmation(action);
  }

  async function save() {
    const saved = await run(async () => {
      const day = Number(dueDay);
      if (!name.trim()) throw new Error('Skrifaðu heiti reiknings.');
      if (!/^\d{1,2}$/.test(dueDay.trim()) || day < 1 || day > 31) {
        throw new Error('Gjalddagi þarf að vera dagur frá 1 til 31.');
      }
      await saveBill(userId, {
        id: bill?.id,
        request_id: requestId,
        name: name.trim(),
        amount: parseAmount(amount),
        due_day: day,
        category_id: category || null,
        month,
        is_active: active,
      });
    });
    if (saved) { onSaved(); notify(bill ? 'Reikningurinn var uppfærður.' : 'Reikningurinn var skráður.'); }
  }

  async function completeConfirmation() {
    if (!bill) return;
    const saved = await run(async () => {
      if (confirmation === 'pay') await markBillPaid(userId, bill);
      if (confirmation === 'unpay' && bill.payment) await deleteBillPayment(userId, bill.payment);
      if (confirmation === 'delete') await deleteBill(userId, bill.id);
    });
    if (saved) { onSaved(); notify(confirmation === 'pay' ? 'Greiðslan var skráð.' : confirmation === 'unpay' ? 'Greiðslan var afturkölluð.' : 'Reikningnum var eytt.'); }
  }

  return (
    <FormSheet visible title={bill ? bill.name : 'Nýr reikningur'} subtitle={monthLabel(month)} onClose={onClose} busy={busy}>
      {error ? <InlineNotice message={error} /> : null}
      {confirmation ? (
        <>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>
            {confirmation === 'pay' ? 'Skrá sem greitt?' : confirmation === 'unpay' ? 'Afturkalla greiðslu?' : 'Eyða reikningi?'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {confirmation === 'pay'
              ? `${formatISK(bill?.amount ?? 0)} verður skráð sem útgjöld á gjalddaga reikningsins. Þetta skráir greiðslu í yfirlitinu þínu.`
              : confirmation === 'unpay'
                ? `Greiðsluskráningin og tengd útgjaldafærsla að upphæð ${formatISK(bill?.payment?.amount ?? 0)} verða fjarlægð.`
                : `„${bill?.name}“ verður fjarlægður úr ${monthLabel(month)}. Aðrir mánuðir haldast óbreyttir.`}
          </Text>
          <AppButton label={confirmation === 'pay' ? 'Skrá greiðslu' : confirmation === 'unpay' ? 'Afturkalla greiðslu' : 'Eyða reikningi'} variant={confirmation === 'pay' ? 'primary' : 'danger'} loading={busy} onPress={completeConfirmation} />
          <AppButton label="Til baka" variant="secondary" disabled={busy} onPress={() => confirm(null)} />
        </>
      ) : (
        <>
          {paid ? <InlineNotice kind="success" message={`Greitt ${formatISK(bill?.payment?.amount ?? 0)}. Afturkallaðu greiðsluna áður en þú breytir reikningnum eða eyðir honum.`} /> : null}
          <FormField label="Heiti reiknings" value={name} onChangeText={setName} editable={!busy && !paid} maxLength={80} placeholder="Til dæmis rafmagn" returnKeyType="next" />
          <AmountField label="Upphæð (kr.)" value={amount} onChangeText={setAmount} editable={!busy && !paid} placeholder="0" />
          <FormField label="Gjalddagi" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" editable={!busy && !paid} maxLength={2} hint="Dagur mánaðar, 1–31. Styttri mánuðir nota síðasta dag." />
          {categories.error ? <InlineNotice message="Ekki tókst að sækja flokka. Þú getur reynt aftur með því að opna reikninginn aftur." /> : null}
          <ChoiceChips label="Útgjaldaflokkur" value={category} onChange={setCategory} disabled={busy || paid || categories.loading} options={[
            { label: 'Án flokks', value: '' },
            ...(categories.data ?? []).filter((item) => item.type !== 'income').map((item) => ({ label: item.name, value: item.id })),
          ]} />
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={[styles.label, { color: colors.text }]}>Virkur reikningur</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Tekinn með í áætlun mánaðarins.</Text>
            </View>
            <Switch accessibilityLabel="Virkur reikningur" value={active} onValueChange={setActive} disabled={busy || paid} trackColor={{ true: colors.primary }} />
          </View>
          {!paid ? <AppButton label={bill ? 'Vista breytingar' : 'Bæta við reikningi'} loading={busy} onPress={save} /> : null}
          {bill ? (
            <>
              {dirty ? <Text style={[styles.body, { color: colors.textSecondary }]}>Vistaðu breytingarnar áður en þú skráir greiðslu.</Text> : null}
              <AppButton label={paid ? 'Afturkalla greiðslu' : 'Skrá sem greitt'} variant="secondary" disabled={busy || dirty || (!paid && !bill.is_active)} onPress={() => confirm(paid ? 'unpay' : 'pay')} />
              {!paid ? <AppButton label="Eyða úr þessum mánuði" variant="danger" disabled={busy} onPress={() => confirm('delete')} /> : null}
            </>
          ) : null}
        </>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  confirmTitle: { fontSize: 21, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '700' },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
  switchCopy: { flex: 1, gap: 4 },
});
