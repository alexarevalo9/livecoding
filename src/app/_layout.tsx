import { Stack } from 'expo-router';

import { EntriesProvider } from '@/context/entries-context';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <EntriesProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen
          name='add-entry'
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetInitialDetentIndex: 0,
            sheetCornerRadius: theme.radius.sheet,
          }}
        />
      </Stack>
    </EntriesProvider>
  );
}
