import { StyleSheet, Text, View } from 'react-native';

import type { SleepEntry } from '@/context/entries-context';
import { theme } from '@/theme';
import {
  durationMinutes,
  formatDateLabel,
  formatDuration,
  formatTime,
} from '@/utils/format';

export default function EntryCard({
  entry,
  highlighted,
}: {
  entry: SleepEntry;
  highlighted: boolean;
}) {
  console.log('entry', {
    entry,
    highlighted,
  });
  const minutes = durationMinutes(entry.sleepTime, entry.wakeTime);
  const fill = Math.min(minutes / theme.layout.DURATION_BAR_MAX_MINUTES, 1);

  return (
    <View style={[styles.card, highlighted && styles.highlighted]}>
      <View style={styles.top}>
        <Text style={styles.date}>{formatDateLabel(entry.date)}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{formatDuration(minutes)}</Text>
        </View>
      </View>
      <Text style={styles.times}>
        {formatTime(entry.sleepTime)} → {formatTime(entry.wakeTime)}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%` }]} />
      </View>
      {!!entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  highlighted: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { ...theme.text.caps, color: theme.colors.textSecondary },
  pill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  pillText: { ...theme.text.body, color: theme.colors.surface },
  times: { ...theme.text.title, color: theme.colors.textPrimary },
  track: {
    height: theme.layout.durationBarHeight,
    borderRadius: theme.radius.bar,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.colors.accent },
  notes: { ...theme.text.body, color: theme.colors.textSecondary },
});
