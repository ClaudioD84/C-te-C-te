import { boxContains, boxFromCorners, type Box } from '@cote-a-cote/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/hooks/use-theme';

import type { PreparedImage } from './image';

interface MaskEditorProps {
  image: PreparedImage;
  boxes: Box[];
  onChange: (boxes: Box[]) => void;
}

/** Taille minimale d'un rectangle tracé, en pixels de l'image. */
const MIN_BOX = 12;

/**
 * Affiche la photo et ses zones masquées.
 * Glisser le doigt trace une nouvelle zone ; toucher une zone la supprime.
 */
export function MaskEditor({ image, boxes, onChange }: MaskEditorProps) {
  const theme = useTheme();
  const [displayWidth, setDisplayWidth] = useState(0);
  const [draft, setDraft] = useState<Box | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  // Conversion entre points d'écran et pixels de l'image.
  const scale = displayWidth > 0 ? displayWidth / image.width : 1;
  const toImage = (v: number) => v / scale;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(8)
    .onStart((e) => setStart({ x: toImage(e.x), y: toImage(e.y) }))
    .onUpdate((e) => {
      if (start) setDraft(boxFromCorners(start.x, start.y, toImage(e.x), toImage(e.y)));
    })
    .onEnd(() => {
      if (draft && draft.width >= MIN_BOX && draft.height >= MIN_BOX) onChange([...boxes, draft]);
      setDraft(null);
      setStart(null);
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const x = toImage(e.x);
      const y = toImage(e.y);
      const index = boxes.findLastIndex((b) => boxContains(b, x, y));
      if (index >= 0) onChange(boxes.filter((_, i) => i !== index));
    });

  function onLayout(event: LayoutChangeEvent) {
    setDisplayWidth(event.nativeEvent.layout.width);
  }

  const renderBox = (box: Box, key: string | number, isDraft = false) => (
    <View
      key={key}
      pointerEvents="none"
      style={[
        styles.box,
        {
          left: box.left * scale,
          top: box.top * scale,
          width: box.width * scale,
          height: box.height * scale,
          backgroundColor: isDraft ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: theme.accent,
        },
      ]}
    />
  );

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        onLayout={onLayout}
        style={{ width: '100%', aspectRatio: image.width / image.height }}
        accessibilityLabel={`Photo avec ${boxes.length} zone${boxes.length > 1 ? 's' : ''} masquée${boxes.length > 1 ? 's' : ''}`}>
        {/* Sans interaction propre : sur ordinateur, le navigateur ferait glisser l'image au lieu de tracer la zone. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: image.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            draggable={false}
          />
        </View>
        {boxes.map((box, i) => renderBox(box, i))}
        {draft ? renderBox(draft, 'draft', true) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', borderWidth: 1 },
});
