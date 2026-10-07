import { mixColors, SCENES, type Scene, type SceneShape } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type SceneCode = keyof typeof SCENES;

/** Bandes du dégradé (assez nombreuses pour ne pas voir de marches). */
const BANDS = 32;

/**
 * Scène du fond d'écran (décorative, immobile, cachée aux lecteurs d'écran) : dégradé, formes douces et
 * quelques éléments dessinés. « Discret » (profil TDAH) : formes plus pâles et moitié moins d'éléments.
 */
export function BackgroundScene({ code, discreet = false }: { code: SceneCode; discreet?: boolean }) {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const scene: Scene = SCENES[code];
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width: W, height: H } = size;
  const scale = Math.min(1.6, Math.max(0.2, W / 400));
  const [top, bottom] = scene.gradient[mode];

  const shapeStyle = (shape: SceneShape) => {
    const d = (shape.size * W) / 100;
    return {
      position: 'absolute' as const,
      width: d,
      height: d,
      left: (shape.x * W) / 100 - d / 2,
      top: (shape.y * H) / 100 - d / 2,
      opacity: shape.opacity * (discreet ? 0.5 : 1),
      borderRadius: shape.kind === 'square' ? 0 : d / 2,
      transform: shape.rotate ? [{ rotate: `${shape.rotate}deg` }] : undefined,
      ...(shape.kind === 'ring'
        ? { borderWidth: Math.max(1, (shape.stroke ?? 2) * scale), borderColor: shape.color[mode] }
        : { backgroundColor: shape.color[mode] }),
    };
  };

  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: top }]}>
      {Array.from({ length: BANDS }, (_, i) => (
        <View
          key={`b${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(i * 100) / BANDS}%`,
            height: `${100 / BANDS + 0.5}%`,
            backgroundColor: mixColors(top, bottom, (i + 0.5) / BANDS),
          }}
        />
      ))}
      {W > 0 ? scene.shapes.map((shape, i) => <View key={`s${i}`} style={shapeStyle(shape)} />) : null}
      {W > 0
        ? scene.decor
            .filter((_, i, all) => !discreet || i % 2 === 1 || i >= all.length - 2)
            .map((item, i) => {
              const fontSize = item.size * scale;
              return (
                <Text
                  key={`d${i}`}
                  style={{
                    position: 'absolute',
                    fontSize,
                    lineHeight: fontSize * 1.2,
                    left: (item.x * W) / 100 - fontSize / 2,
                    top: (item.y * H) / 100 - fontSize / 2,
                    opacity: discreet ? 0.3 : mode === 'dark' ? 0.6 : 0.75,
                    transform: item.rotate ? [{ rotate: `${item.rotate}deg` }] : undefined,
                  }}>
                  {item.emoji}
                </Text>
              );
            })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
