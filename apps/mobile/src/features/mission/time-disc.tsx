import { StyleSheet, View } from 'react-native';

/**
 * Minuteur visuel (façon « Time Timer ») : un disque coloré dont la part restante diminue dans le sens des
 * aiguilles d'une montre, à partir de midi. Dessiné avec deux demi-disques qui tournent (pas de SVG).
 * Décoratif : le temps restant est aussi donné en texte et en barre de progression accessibles.
 */
export function TimeDisc({
  remaining,
  color,
  track,
  size = 160,
}: {
  /** Part de temps restante, de 0 à 1. */
  remaining: number;
  color: string;
  track: string;
  size?: number;
}) {
  const angle = Math.max(0, Math.min(1, remaining)) * 360;
  const half = size / 2;
  const disc = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    overflow: 'hidden' as const,
  };
  const rightTurn = Math.min(angle, 180);
  const leftTurn = Math.max(0, angle - 180);

  return (
    <View
      style={{ width: size, height: size, alignSelf: 'center', borderRadius: half, overflow: 'hidden' }}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[disc, { backgroundColor: track }]} />
      {/* Moitié droite (de midi à six heures) : disque dont la moitié gauche est colorée, tourné de l'angle. */}
      {angle > 0 ? (
        <View style={[styles.window, { left: half, width: half, height: size }]}>
          <View style={[disc, { left: -half, transform: [{ rotate: `${rightTurn}deg` }] }]}>
            <View
              style={{ position: 'absolute', left: 0, width: half, height: size, backgroundColor: color }}
            />
          </View>
        </View>
      ) : null}
      {/* Moitié gauche (de six heures à midi), seulement au-delà d'un demi-tour. */}
      {angle > 180 ? (
        <View style={[styles.window, { left: 0, width: half, height: size }]}>
          <View style={[disc, { left: 0, transform: [{ rotate: `${leftTurn}deg` }] }]}>
            <View
              style={{ position: 'absolute', left: half, width: half, height: size, backgroundColor: color }}
            />
          </View>
        </View>
      ) : null}
      {/* Axe central, comme sur un vrai minuteur. */}
      <View
        style={[styles.hub, { left: half - 8, top: half - 8, backgroundColor: track, borderColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  window: { position: 'absolute', top: 0, overflow: 'hidden' },
  hub: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
});
