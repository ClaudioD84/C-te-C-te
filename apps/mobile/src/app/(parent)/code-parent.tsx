import { checkNewParentCode } from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { PinPad } from '@/components/pin-pad';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { hasParentCode, saveParentCode, verifyParentCode } from '@/features/child-mode/parent-code-store';

type Step = 'chargement' | 'actuel' | 'nouveau' | 'confirmation';

const STEP_TEXT: Record<Exclude<Step, 'chargement'>, string> = {
  actuel: 'Saisissez le code parent actuel.',
  nouveau: 'Choisissez un code parent à 4 chiffres. Il sera demandé pour quitter la console enfant.',
  confirmation: 'Saisissez à nouveau le code pour le confirmer.',
};

/**
 * Création ou modification du code parent.
 * Avec le paramètre `childId`, lance ensuite la console de cet enfant.
 */
export default function ParentCodeScreen() {
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { enter } = useChildMode();
  const [step, setStep] = useState<Step>('chargement');
  const [code, setCode] = useState('');
  const [firstCode, setFirstCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    hasParentCode().then((exists) => setStep(exists ? 'actuel' : 'nouveau'));
  }, []);

  async function complete(value: string) {
    setCode('');
    setMessage(null);

    if (step === 'actuel') {
      const result = await verifyParentCode(value);
      if (result.ok) setStep('nouveau');
      else setMessage(result.lockedSeconds > 0 ? `Trop d'essais. Réessayez dans ${result.lockedSeconds} s.` : 'Code incorrect.');
      return;
    }

    if (step === 'nouveau') {
      const problem = checkNewParentCode(value);
      if (problem === 'trop_simple') {
        setMessage('Ce code est trop facile à deviner. Choisissez-en un autre.');
        return;
      }
      setFirstCode(value);
      setStep('confirmation');
      return;
    }

    if (value !== firstCode) {
      setMessage('Les deux codes ne correspondent pas. Recommencez.');
      setStep('nouveau');
      return;
    }
    await saveParentCode(value);
    if (childId) {
      await enter(childId);
    } else {
      router.back();
    }
  }

  if (step === 'chargement') return <Screen />;

  return (
    <Screen>
      <ThemedText>{STEP_TEXT[step]}</ThemedText>
      <PinPad value={code} onChange={setCode} onComplete={complete} />
      {message ? (
        <ThemedText themeColor="danger" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {message}
        </ThemedText>
      ) : null}
    </Screen>
  );
}
