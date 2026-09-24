import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

// Shared by the error (onAction) and empty (href) states.
export default function MessageCard({
  title,
  body,
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: Href;
}) {
  const button = (
    <Pressable
      style={styles.button}
      accessibilityRole='button'
      accessibilityLabel={actionLabel}
      onPress={onAction}
    >
      <Text style={styles.buttonText}>{actionLabel}</Text>
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel &&
        (href ? (
          <Link href={href} asChild>
            {button}
          </Link>
        ) : (
          button
        ))}
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
    alignItems: 'center',
  },
  title: { ...theme.text.title, color: theme.colors.textPrimary },
  body: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  buttonText: { ...theme.text.body, color: theme.colors.surface },
});
