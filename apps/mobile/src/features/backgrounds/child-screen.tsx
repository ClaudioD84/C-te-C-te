import { defaultBackground } from '@cote-a-cote/shared';
import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';

import { BackgroundPattern } from './background-pattern';

/** Conteneur des écrans de l'enfant : son fond d'écran derrière le contenu. */
export function ChildScreen({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const code = child.data
    ? (child.data.background ??
      defaultBackground(child.data.grade, child.data.preferences.interests ?? [], child.data.needs))
    : 'uni';
  const discreet = child.data?.needs.includes('tdah') ?? false;
  return (
    <ThemedView style={style}>
      {code !== 'uni' ? <BackgroundPattern code={code} discreet={discreet} /> : null}
      {children}
    </ThemedView>
  );
}
