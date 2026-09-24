import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PickerField from '@/components/PickerField';
import { useEntries } from '@/context/entries-context';
import { theme } from '@/theme';
import {
  durationMinutes,
  formatDateLabel,
  formatDuration,
  formatTime,
  fromDateString,
  fromTimeString,
  toDateString,
  toTimeString,
} from '@/utils/format';

type Field = 'date' | 'sleep' | 'wake';

export default function AddEntryScreen() {
  const { addEntry } = useEntries();
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [sleepTime, setSleepTime] = useState('20:00');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openField, setOpenField] = useState<Field | null>(null);

  const toggle = (field: Field) =>
    setOpenField((current) => (current === field ? null : field));

  const change = (setter: (v: string) => void, value: string) => {
    setter(value);
    setError(null);
  };

  const save = () => {
    if (!date || !sleepTime || !wakeTime) {
      setError('Date, sleep time and wake time are required.');
      return;
    }
    if (sleepTime === wakeTime) {
      setError("Sleep and wake time can't be the same.");
      return;
    }
    addEntry({ date, sleepTime, wakeTime, notes: notes.trim() || undefined });
    router.back();
  };

  console.log('AddEntryScreen');

  return (
    <ScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps='handled'
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.content}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>New sleep entry</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <PickerField
        label='Date'
        display={formatDateLabel(date)}
        mode='date'
        value={fromDateString(date)}
        open={openField === 'date'}
        onToggle={() => toggle('date')}
        onChange={(d) => change(setDate, toDateString(d))}
      />
      <PickerField
        label='Sleep time'
        display={formatTime(sleepTime)}
        mode='time'
        value={fromTimeString(sleepTime)}
        open={openField === 'sleep'}
        onToggle={() => toggle('sleep')}
        onChange={(d) => change(setSleepTime, toTimeString(d))}
      />
      <PickerField
        label='Wake time'
        display={formatTime(wakeTime)}
        mode='time'
        value={fromTimeString(wakeTime)}
        open={openField === 'wake'}
        onToggle={() => toggle('wake')}
        onChange={(d) => change(setWakeTime, toTimeString(d))}
      />
      <TextInput
        style={styles.notes}
        placeholder='Notes (optional)'
        placeholderTextColor={theme.colors.textMuted}
        value={notes}
        onChangeText={(v) => change(setNotes, v)}
        multiline
        maxLength={280}
      />
      <Text style={styles.duration}>
        Duration: {formatDuration(durationMinutes(sleepTime, wakeTime))}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...theme.text.title, color: theme.colors.textPrimary },
  cancel: { ...theme.text.body, color: theme.colors.accent },
  notes: {
    ...theme.text.body,
    minHeight: 80,
    textAlignVertical: 'top',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  duration: { ...theme.text.body, color: theme.colors.textSecondary },
  error: { ...theme.text.body, color: theme.colors.error },
  save: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  saveText: { ...theme.text.body, color: theme.colors.surface },
});
