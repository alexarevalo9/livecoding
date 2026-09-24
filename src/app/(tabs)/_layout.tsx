import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { theme } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name='sheet-plastic' size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='analysis'
        options={{
          title: 'Analysis',
          tabBarIcon: ({ color }) => (
            <Ionicons name='analytics' size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
