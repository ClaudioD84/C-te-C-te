import { describe, expect, it } from 'vitest';

import appJson from '../../../apps/mobile/app.json?raw';

type Plugin = string | [string, Record<string, unknown>];
const config = JSON.parse(appJson) as {
  expo: { plugins: Plugin[]; icon: string; ios: Record<string, unknown>; runtimeVersion?: unknown };
};
const options = (name: string) =>
  (
    config.expo.plugins.find((p) => Array.isArray(p) && p[0] === name) as [string, Record<string, unknown>]
  )[1];

describe('configuration de l’application (app.json)', () => {
  it('micro : même description pour la photo et l’audio, jamais désactivé', () => {
    // « false » côté expo-image-picker supprimait la description iOS et l'autorisation Android RECORD_AUDIO :
    // « Je récite » et la lecture à voix haute auraient planté.
    const audio = options('expo-audio').microphonePermission;
    expect(typeof audio).toBe('string');
    expect(options('expo-image-picker').microphonePermission).toBe(audio);
  });

  it('icône et mises à jour à distance', () => {
    expect(config.expo.icon).toBe('./assets/images/icon.png');
    expect(config.expo.ios.icon).toBeUndefined();
    expect(config.expo.runtimeVersion).toEqual({ policy: 'appVersion' });
  });
});
