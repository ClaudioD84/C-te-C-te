import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Cockpit parent' }} />
      <Stack.Screen name="profils/nouveau" options={{ title: 'Nouvel enfant', presentation: 'modal' }} />
      <Stack.Screen name="code-parent" options={{ title: 'Code parent', presentation: 'modal' }} />
    </Stack>
  );
}
