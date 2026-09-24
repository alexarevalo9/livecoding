import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EntryCard from '@/components/EntryCard';
import { useEntries } from '@/context/entries-context';
import { theme } from '@/theme';

export default function LogScreen() {
  const { entries } = useEntries();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Sleep log</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Mia · 4mo</Text>
          </View>
        </View>
        <Text style={styles.caps}>This week</Text>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sleep logged yet</Text>
            <Text style={styles.emptyBody}>Tap + to add the first entry.</Text>
          </View>
        ) : (
          entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} highlighted={i === 0} />
          ))
        )}
      </ScrollView>
      <Pressable
        style={styles.fab}
        accessibilityLabel='Add sleep entry'
        onPress={() => router.push('/add-entry')}
      >
        <Ionicons name='add' size={28} color={theme.colors.surface} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.layout.listBottomPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...theme.text.title, color: theme.colors.textPrimary },
  badge: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: { ...theme.text.body, color: theme.colors.accent },
  caps: { ...theme.text.caps, color: theme.colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: theme.spacing.xxl },
  emptyTitle: { ...theme.text.title, color: theme.colors.textPrimary },
  emptyBody: { ...theme.text.body, color: theme.colors.textSecondary },
  fab: {
    position: 'absolute',
    right: theme.layout.fabOffset,
    bottom: theme.layout.fabOffset,
    width: theme.layout.fabSize,
    height: theme.layout.fabSize,
    borderRadius: theme.radius.fab,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
