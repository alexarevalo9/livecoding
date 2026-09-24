import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import type { AnalysisStat } from '@/utils/anthropic';

export default function StatRow({ stats }: { stats: AnalysisStat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.card}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  label: { ...theme.text.caps, color: theme.colors.textSecondary },
  value: { ...theme.text.title, color: theme.colors.textPrimary },
});
