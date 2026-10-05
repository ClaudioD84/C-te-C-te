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
import { useState } from 'react';

import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

export type ProfileFormValues = { alias: string; grade: Grade; track: Track; needs: Need[] };

/**
 * État du formulaire de profil enfant (création et modification). Le consentement n'est demandé
 * que si un besoin particulier est ajouté par rapport aux besoins déjà acceptés.
 */
export function useProfileForm(initial: ProfileFormValues) {
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [consent, setConsent] = useState(false);

  const needsConsent = values.needs.some((n) => !initial.needs.includes(n));
  const valid = values.alias.trim().length >= 2 && (!needsConsent || consent);

  return { values, setValues, consent, setConsent, needsConsent, valid };
}

type Props = ReturnType<typeof useProfileForm>;

export function ProfileFields({ values, setValues, consent, setConsent, needsConsent }: Props) {
  const allowedTracks = TRACKS.filter((t) => isTrackAllowed(values.grade, t));

  function selectGrade(grade: Grade) {
    setValues((v) => ({
      ...v,
      grade,
      track: isTrackAllowed(grade, v.track)
        ? v.track
        : isTrackAllowed(grade, 'general')
          ? 'general'
          : 'professionnel',
    }));
  }

  function toggleNeed(need: Need) {
    setValues((v) => ({
      ...v,
      needs: v.needs.includes(need) ? v.needs.filter((n) => n !== need) : [...v.needs, need],
    }));
  }

  return (
    <>
      <TextField
        label="Pseudonyme de l'enfant"
        placeholder="Ex. Petit Lion"
        value={values.alias}
        onChangeText={(alias) => setValues((v) => ({ ...v, alias }))}
        maxLength={30}
      />
      <ThemedText type="small" themeColor="textSecondary">
        N&apos;indiquez pas son vrai prénom : le pseudonyme protège ses données.
      </ThemedText>

      <ChoiceChips
        label="Année scolaire"
        options={GRADES}
        labels={GRADE_LABELS}
        selected={[values.grade]}
        onToggle={selectGrade}
      />
      <ChoiceChips
        label="Type d'enseignement"
        options={allowedTracks}
        labels={TRACK_LABELS}
        selected={[values.track]}
        onToggle={(track) => setValues((v) => ({ ...v, track }))}
      />
      <ChoiceChips
        label="Besoins particuliers (facultatif)"
        options={NEEDS}
        labels={NEED_LABELS}
        selected={values.needs}
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
    </>
  );
}
