import QRCode from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * QR code dessiné avec de simples vues (noir sur blanc, quel que soit le thème, pour rester lisible par
 * les appareils photo). Les modules noirs consécutifs d'une ligne sont fusionnés.
 */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const rows = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const runs: { start: number; length: number }[][] = [];
    for (let r = 0; r < modules.size; r++) {
      const row: { start: number; length: number }[] = [];
      let start = -1;
      for (let c = 0; c <= modules.size; c++) {
        const dark = c < modules.size && modules.get(r, c) === 1;
        if (dark && start < 0) start = c;
        if (!dark && start >= 0) {
          row.push({ start, length: c - start });
          start = -1;
        }
      }
      runs.push(row);
    }
    return { count: modules.size, runs };
  }, [value]);

  // Marge blanche de 4 modules exigée par la norme.
  const cell = size / (rows.count + 8);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.box, { width: size, height: size, padding: cell * 4 }]}>
      {rows.runs.map((row, r) => (
        <View key={r} style={{ height: cell }}>
          {row.map((run) => (
            <View
              key={run.start}
              style={[styles.dark, { left: run.start * cell, width: run.length * cell, height: cell }]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#ffffff', alignSelf: 'center' },
  dark: { position: 'absolute', top: 0, backgroundColor: '#000000' },
});
