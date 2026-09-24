import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnalysisSkeleton from '@/components/AnalysisSkeleton';
import MessageCard from '@/components/MessageCard';
import StatRow from '@/components/StatRow';
import { useAnalysis } from '@/screens/analysis/use-analysis';
import { theme } from '@/theme';

export default function AnalysisScreen() {
  const { state, refresh, inputCount } = useAnalysis();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Analysis</Text>
          {state.status === 'success' && (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Refresh analysis'
              onPress={refresh}
            >
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          )}
        </View>
        {inputCount > 0 && (
          <Text style={styles.caps}>
            {inputCount === 1 ? 'Last 1 night' : `Last ${inputCount} nights`}
          </Text>
        )}
        <View style={styles.state} accessibilityLiveRegion='polite'>
          {renderState()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function renderState() {
    switch (state.status) {
      case 'success':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.summary}>{state.result.summary}</Text>
            </View>
            <StatRow stats={state.result.stats} />
            <View style={styles.tip}>
              <Text style={styles.tipCaps}>Try this</Text>
              <Text style={styles.tipText}>{state.result.tip}</Text>
            </View>
          </>
        );
      case 'error':
        return (
          <MessageCard
            title='Analysis unavailable'
            body={state.message}
            actionLabel='Retry'
            onAction={refresh}
          />
        );
      case 'empty':
        return (
          <MessageCard
            title='Nothing to analyze yet'
            body="Log a night first and we'll summarize it."
            actionLabel='Go to Log'
            href='/'
          />
        );
      case 'loading':
        return <AnalysisSkeleton count={inputCount} />;
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...theme.text.title, color: theme.colors.textPrimary },
  refresh: { ...theme.text.body, color: theme.colors.accent },
  caps: { ...theme.text.caps, color: theme.colors.textSecondary },
  state: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  summary: {
    ...theme.text.body,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  tip: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  tipCaps: { ...theme.text.caps, color: theme.colors.accent },
  tipText: { ...theme.text.body, color: theme.colors.textPrimary },
});
