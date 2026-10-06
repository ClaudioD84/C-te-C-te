import { Stack } from 'expo-router';

import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useDeviceLinkCheck } from '@/features/devices/api';

export default function ChildLayout() {
  const { isChildDevice } = useChildMode();
  useDeviceLinkCheck(isChildDevice);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="code" options={{ presentation: 'modal' }} />
      <Stack.Screen name="etude/[taskId]" />
      <Stack.Screen name="cartes" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="tables" />
      <Stack.Screen name="dictee" />
      <Stack.Screen name="lecture" />
      <Stack.Screen name="bonus" />
      <Stack.Screen name="detente" />
      <Stack.Screen name="ecoute" />
      <Stack.Screen name="lecture-voix" />
      <Stack.Screen name="appareil" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
