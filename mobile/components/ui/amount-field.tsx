import { useRef } from 'react';
import { TextInputProps } from 'react-native';

import { FormField } from '@/components/ui/finance-form';
import { editAmountDraft } from '@/lib/amount-draft';

export function AmountField({ value = '', onChangeText, ...props }: TextInputProps & { label: string; hint?: string }) {
  const key = useRef('');
  return <FormField {...props} value={value} keyboardType="decimal-pad" maxLength={24}
    onKeyPress={(event) => { key.current = event.nativeEvent.key; }}
    onChangeText={(raw) => {
      const formatted = editAmountDraft(value, raw, key.current);
      key.current = '';
      onChangeText?.(formatted);
    }} />;
}
