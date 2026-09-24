import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export default function AnalysisSkeleton({ count }: { count: number }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.container, { opacity }]}
        importantForAccessibility='no-hide-descendants'
        accessibilityElementsHidden
      >
        <View style={[styles.block, styles.summary]} />
        <View style={styles.stats}>
          <View style={[styles.block, styles.stat]} />
          <View style={[styles.block, styles.stat]} />
        </View>
        <View style={[styles.block, styles.tip]} />
      </Animated.View>
      <Text style={styles.status}>
        {count === 1
          ? 'Analyzing last night…'
          : `Analyzing your last ${count} nights…`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  block: {
    backgroundColor: theme.colors.track,
    borderRadius: theme.radius.card,
  },
  summary: { height: 96 },
  stats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1, height: 72 },
  tip: { height: 64 },
  status: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
