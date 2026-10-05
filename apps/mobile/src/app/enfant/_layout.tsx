import { Stack } from 'expo-router';

export default function ChildLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="code" options={{ presentation: 'modal' }} />
      <Stack.Screen name="etude/[taskId]" />
      <Stack.Screen name="cartes" />
      <Stack.Screen name="badges" />
    </Stack>
  );
}
