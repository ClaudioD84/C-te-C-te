import { defaultBackground } from '@cote-a-cote/shared';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';

import { BackgroundScene } from './background-scene';

/** Largeur maximale du contenu : sur tablette, le décor reste visible de part et d'autre. */
const MAX_CONTENT_WIDTH = 680;

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
    <ThemedView style={styles.fill}>
      {code !== 'uni' ? <BackgroundScene code={code} discreet={discreet} /> : null}
      <View style={[style, styles.column]}>{children}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
