import {
  GRADE_LABELS,
  GRADES,
  isTrackAllowed,
  NEED_LABELS,
  NEEDS,
  TRACK_LABELS,
  TRACKS,
  type Grade,
  type Need,
  type Track,
} from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useCreateChildProfile } from '@/features/profiles/api';

export default function NewChildProfileScreen() {
  const [alias, setAlias] = useState('');
  const [grade, setGrade] = useState<Grade>('P1');
  const [track, setTrack] = useState<Track>('general');
  const [needs, setNeeds] = useState<Need[]>([]);
  const [consent, setConsent] = useState(false);
  const createProfile = useCreateChildProfile();

  const allowedTracks = TRACKS.filter((t) => isTrackAllowed(grade, t));
  const needsConsent = needs.length > 0;

  function selectGrade(value: Grade) {
    setGrade(value);
    if (!isTrackAllowed(value, track)) {
      setTrack(isTrackAllowed(value, 'general') ? 'general' : 'professionnel');
    }
  }

  function toggleNeed(value: Need) {
    setNeeds((current) => (current.includes(value) ? current.filter((n) => n !== value) : [...current, value]));
  }

  async function save() {
    await createProfile.mutateAsync({ alias, grade, track, needs });
    router.back();
  }

  return (
    <Screen>
      <TextField
        label="Pseudonyme de l'enfant"
        placeholder="Ex. Petit Lion"
        value={alias}
        onChangeText={setAlias}
        maxLength={30}
      />
      <ThemedText type="small" themeColor="textSecondary">
        N&apos;indiquez pas son vrai prénom : le pseudonyme protège ses données.
      </ThemedText>

      <ChoiceChips label="Année scolaire" options={GRADES} labels={GRADE_LABELS} selected={[grade]} onToggle={selectGrade} />
      <ChoiceChips
        label="Type d'enseignement"
        options={allowedTracks}
        labels={TRACK_LABELS}
        selected={[track]}
        onToggle={setTrack}
      />
      <ChoiceChips
        label="Besoins particuliers (facultatif)"
        options={NEEDS}
        labels={NEED_LABELS}
        selected={needs}
        onToggle={toggleNeed}
        multiple
      />

      {needsConsent ? (
        <ChoiceChips
          label="Consentement"
          options={['oui'] as const}
          labels={{
            oui: "J'accepte que ces informations de santé soient utilisées uniquement pour adapter le travail de mon enfant.",
          }}
          selected={consent ? ['oui'] : []}
          onToggle={() => setConsent(!consent)}
          multiple
        />
      ) : null}

      {createProfile.error ? (
        <ThemedText themeColor="danger">L&apos;enregistrement a échoué. Vérifiez votre connexion.</ThemedText>
      ) : null}

      <Button
        label="Enregistrer"
        onPress={save}
        loading={createProfile.isPending}
        disabled={alias.trim().length < 2 || (needsConsent && !consent)}
      />
    </Screen>
  );
}
