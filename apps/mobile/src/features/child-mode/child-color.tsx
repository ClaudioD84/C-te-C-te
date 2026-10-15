import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { CHILD_PALETTES, type ChildPaletteCode } from '@/constants/colors';

import { useChildMode } from './child-mode-provider';

interface ChildColorState {
  /** Couleur choisie par l'enfant dont la console est ouverte ; null dans l'espace parent. */
  color: ChildPaletteCode | null;
  setColor: (color: ChildPaletteCode) => void;
}

const ChildColorContext = createContext<ChildColorState>({ color: null, setColor: () => undefined });

const key = (childId: string) => `couleur:${childId}`;

/** Couleur préférée de l'enfant, gardée sur l'appareil, appliquée à toute sa console. */
export function ChildColorProvider({ children }: PropsWithChildren) {
  const { activeChildId } = useChildMode();
  const [stored, setStored] = useState<{ childId: string; color: ChildPaletteCode } | null>(null);

  useEffect(() => {
    if (!activeChildId) return;
    AsyncStorage.getItem(key(activeChildId))
      .then((value) => {
        if (value && value in CHILD_PALETTES)
          setStored({ childId: activeChildId, color: value as ChildPaletteCode });
      })
      .catch(() => undefined);
  }, [activeChildId]);

  const setColor = useCallback(
    (color: ChildPaletteCode) => {
      if (!activeChildId) return;
      setStored({ childId: activeChildId, color });
      AsyncStorage.setItem(key(activeChildId), color).catch(() => undefined);
    },
    [activeChildId],
  );

  const color = activeChildId && stored?.childId === activeChildId ? stored.color : null;
  const value = useMemo(() => ({ color, setColor }), [color, setColor]);
  return <ChildColorContext.Provider value={value}>{children}</ChildColorContext.Provider>;
}

export function useChildColor() {
  return useContext(ChildColorContext);
}
