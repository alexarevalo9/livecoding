import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type Props = {
  label: string;
  display: string;
  mode: 'date' | 'time';
  value: Date;
  open: boolean;
  onToggle: () => void;
  onChange: (d: Date) => void;
};

export default function PickerField({
  label,
  display,
  mode,
  value,
  open,
  onToggle,
  onChange,
}: Props) {
  const isAndroid = Platform.OS === 'android';
  return (
    <View style={styles.field}>
      <Pressable style={styles.row} onPress={onToggle}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={isAndroid ? 'default' : 'spinner'}
          themeVariant='light'
          accentColor={theme.colors.accent}
          onValueChange={(_, d) => {
            onChange(d);
            if (isAndroid) onToggle(); // dialog must be unmounted by the caller
          }}
          onDismiss={onToggle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  label: { ...theme.text.caps, color: theme.colors.textSecondary },
  value: { ...theme.text.body, color: theme.colors.textPrimary },
});
