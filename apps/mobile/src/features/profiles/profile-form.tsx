import {
  AVATAR_CODES,
  AVATARS,
  deriveLearningSettings,
  GRADE_LABELS,
  GRADES,
  INTEREST_LABELS,
  INTERESTS,
  isTrackAllowed,
  MAX_INTERESTS,
  NEED_LABELS,
  NEEDS,
  NETWORK_LABELS,
  NETWORKS,
  schoolLevel,
  SESSION_MINUTES_CHOICES,
  RELAX_MINUTE_CHOICES,
  relaxMinutesLimit,
  TRACK_LABELS,
  TRACKS,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type AvatarCode,
  type ChildPreferences,
  type Grade,
  type Interest,
  type Need,
  type Network,
  type Track,
  type Weekday,
} from '@cote-a-cote/shared';
import { useState } from 'react';

import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

export type ProfileFormValues = {
  alias: string;
  avatar: string;
  grade: Grade;
  track: Track;
  network?: Network;
  /** Options du secondaire, séparées par des virgules dans le formulaire. */
  options: string[];
  needs: Need[];
  preferences: ChildPreferences;
};

export const DEFAULT_PROFILE_VALUES: ProfileFormValues = {
  alias: '',
  avatar: 'lion',
  grade: 'P1',
  track: 'general',
  options: [],
  needs: [],
  preferences: { availableDays: ['lun', 'mar', 'mer', 'jeu', 'ven'], prefersPaper: false },
};

/**
 * État du formulaire de profil enfant (création et modification). Le consentement n'est demandé
 * que si un besoin particulier est ajouté par rapport aux besoins déjà acceptés.
 */
export function useProfileForm(initial: ProfileFormValues) {
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [consent, setConsent] = useState(false);

  const needsConsent = values.needs.some((n) => !initial.needs.includes(n));
  const valid =
    values.alias.trim().length >= 2 &&
    (!needsConsent || consent) &&
    values.preferences.availableDays.length > 0;

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
        label="Prénom de l'enfant"
        placeholder="Ex. Léa"
        value={values.alias}
        onChangeText={(alias) => setValues((v) => ({ ...v, alias }))}
        maxLength={30}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Il s’affiche sur sa console. Il n’est jamais envoyé à l’IA et il est masqué automatiquement sur les
        photos du journal de classe.
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

      <PreferenceFields values={values} setValues={setValues} />
    </>
  );
}

const AUTO = 'auto';

/** Avatar, secondaire (réseau, options) et préférences de travail (section 4 du cahier des charges). */
function PreferenceFields({ values, setValues }: Pick<Props, 'values' | 'setValues'>) {
  const secondary = schoolLevel(values.grade) === 'secondaire';
  const recommended = deriveLearningSettings({
    grade: values.grade,
    needs: values.needs,
    preferences: { ...values.preferences, sessionMinutes: undefined },
  }).workMinutes;
  const durations = [AUTO, ...SESSION_MINUTES_CHOICES.map(String)];
  const setPreferences = (patch: Partial<ChildPreferences>) =>
    setValues((v) => ({ ...v, preferences: { ...v.preferences, ...patch } }));

  function toggleDay(day: Weekday) {
    const days = values.preferences.availableDays;
    // L'ordre de la semaine est conservé.
    setPreferences({
      availableDays: WEEKDAYS.filter((d) => (d === day ? !days.includes(d) : days.includes(d))),
    });
  }

  const interests = values.preferences.interests ?? [];
  function toggleInterest(interest: Interest) {
    if (interests.includes(interest)) {
      setPreferences({ interests: interests.filter((i) => i !== interest) });
    } else if (interests.length < MAX_INTERESTS) {
      setPreferences({ interests: [...interests, interest] });
    }
  }

  return (
    <>
      <ThemedText type="subtitle">Préférences</ThemedText>
      <ChoiceChips
        label="Avatar"
        options={AVATAR_CODES}
        labels={
          Object.fromEntries(
            AVATAR_CODES.map((c) => [c, `${AVATARS[c].emoji} ${AVATARS[c].label}`]),
          ) as Record<AvatarCode, string>
        }
        selected={[values.avatar as AvatarCode]}
        onToggle={(avatar) => setValues((v) => ({ ...v, avatar }))}
      />
      <ChoiceChips
        label="Jours de travail à la maison"
        options={WEEKDAYS}
        labels={WEEKDAY_LABELS}
        selected={values.preferences.availableDays}
        onToggle={toggleDay}
        multiple
      />
      {values.preferences.availableDays.length === 0 ? (
        <ThemedText themeColor="danger">Choisissez au moins un jour.</ThemedText>
      ) : null}
      <ChoiceChips
        label="Durée d'une séance de travail"
        options={durations}
        labels={Object.fromEntries(
          durations.map((d) => [d, d === AUTO ? `Recommandée (${recommended} min)` : `${d} min`]),
        )}
        selected={[values.preferences.sessionMinutes ? String(values.preferences.sessionMinutes) : AUTO]}
        onToggle={(d) => setPreferences({ sessionMinutes: d === AUTO ? undefined : Number(d) })}
      />
      <ChoiceChips
        label="Coin détente : petits jeux calmes par jour, une fois la mission faite (sans points d'effort)"
        options={RELAX_MINUTE_CHOICES.map(String)}
        labels={Object.fromEntries(
          RELAX_MINUTE_CHOICES.map((m) => [String(m), m === 0 ? 'Fermé' : `${m} min`]),
        )}
        selected={[String(relaxMinutesLimit(values.preferences))]}
        onToggle={(m) => setPreferences({ relaxMinutes: Number(m) })}
      />
      <ChoiceChips
        label={`Centres d'intérêt (${MAX_INTERESTS} au plus) : les exemples des fiches et exercices s'en inspirent`}
        options={INTERESTS}
        labels={INTEREST_LABELS}
        selected={interests}
        onToggle={toggleInterest}
        multiple
      />
      <ChoiceChips
        label="Fiches et exercices de préférence"
        options={['ecran', 'papier'] as const}
        labels={{ ecran: 'Sur l’écran', papier: 'Imprimés sur papier' }}
        selected={[values.preferences.prefersPaper ? 'papier' : 'ecran']}
        onToggle={(choice) => setPreferences({ prefersPaper: choice === 'papier' })}
      />
      {secondary ? (
        <>
          <ChoiceChips
            label="Réseau de l'école (facultatif)"
            options={NETWORKS}
            labels={NETWORK_LABELS}
            selected={values.network ? [values.network] : []}
            onToggle={(network) =>
              setValues((v) => ({ ...v, network: v.network === network ? undefined : network }))
            }
          />
          <TextField
            label="Options (facultatif, séparées par des virgules)"
            placeholder="Ex. Latin, Sciences 5 h"
            value={values.options.join(', ')}
            onChangeText={(text) =>
              setValues((v) => ({
                ...v,
                options: text
                  .split(',')
                  .map((o) => o.trimStart())
                  .filter((o, i, all) => o.length > 0 || i === all.length - 1),
              }))
            }
          />
        </>
      ) : null}
    </>
  );
}
