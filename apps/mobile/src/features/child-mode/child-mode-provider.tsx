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

import { useSession } from '@/features/auth/session-provider';

const ACTIVE_CHILD_KEY = 'active_child_id';

interface ChildModeState {
  /** Enfant dont la console est ouverte ; null quand le parent est dans son cockpit. */
  activeChildId: string | null;
  loading: boolean;
  enter: (childId: string) => Promise<void>;
  exit: () => Promise<void>;
}

const ChildModeContext = createContext<ChildModeState | null>(null);

/**
 * Mode enfant persistant : si l'application est fermée pendant que l'enfant l'utilise,
 * elle se rouvre sur la console enfant, pas sur le cockpit parent.
 */
export function ChildModeProvider({ children }: PropsWithChildren) {
  const { session, loading: sessionLoading } = useSession();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_CHILD_KEY)
      .then(setActiveChildId)
      .finally(() => setLoading(false));
  }, []);

  const enter = useCallback(async (childId: string) => {
    await AsyncStorage.setItem(ACTIVE_CHILD_KEY, childId);
    setActiveChildId(childId);
  }, []);

  const exit = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIVE_CHILD_KEY);
    setActiveChildId(null);
  }, []);

  // À la déconnexion, on quitte le mode enfant.
  const signedOut = !sessionLoading && session === null;
  useEffect(() => {
    if (signedOut) AsyncStorage.removeItem(ACTIVE_CHILD_KEY);
  }, [signedOut]);

  const value = useMemo(
    () => ({ activeChildId: signedOut ? null : activeChildId, loading, enter, exit }),
    [activeChildId, loading, enter, exit, signedOut],
  );

  return <ChildModeContext.Provider value={value}>{children}</ChildModeContext.Provider>;
}

export function useChildMode() {
  const context = useContext(ChildModeContext);
  if (!context) throw new Error('useChildMode doit être utilisé dans ChildModeProvider');
  return context;
}
