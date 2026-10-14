import {
  checkAnswer,
  NEAR_MISS_MESSAGES,
  type AnswerVerdict,
  type Exercise,
  type LearningSettings,
} from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

/** Essais avant de pouvoir afficher la correction d'un exercice vérifiable. */
const TRIES_BEFORE_CORRECTION = 2;

/**
 * Exercices : l'enfant tape sa réponse, l'application la vérifie (réponse courte) ou il la compare lui-même à
 * la correction (production libre). La correction n'apparaît qu'après une vraie tentative.
 */
export function ExerciseList({
  exercises,
  settings,
  mathSupport = false,
  onFinish,
}: {
  exercises: Exercise[];
  settings: LearningSettings;
  /** Supports concrets pour le calcul (F12 : dyscalculie, maternelle). */
  mathSupport?: boolean;
  /** Appelé une fois, quand tous les exercices sont faits (enregistrement de l'effort). */
  onFinish?: (succeeded: number, total: number) => void;
}) {
  const pageSize = Math.max(1, settings.maxItemsPerScreen);
  const [offset, setOffset] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() => exercises.map(() => null));
  const page = exercises.slice(offset, offset + pageSize);
  const pageDone = page.every((_, i) => results[offset + i] !== null);
  const succeeded = results.filter(Boolean).length;
  const allDone = results.every((r) => r !== null);

  function done(index: number, success: boolean) {
    const next = results.map((r, i) => (i === index ? success : r));
    setResults(next);
    if (next.every((r) => r !== null)) onFinish?.(next.filter(Boolean).length, exercises.length);
  }

  return (
    <View style={styles.container}>
      {mathSupport ? (
        <ThemedView type="backgroundElement" style={styles.support}>
          <ThemedText style={learningTextStyle(settings)}>
            🧮 Tu peux t&apos;aider : dessine, compte avec des objets (jetons, perles, doigts) et fais une
            étape à la fois. Prends tout ton temps.
          </ThemedText>
        </ThemedView>
      ) : null}
      {page.map((exercise, i) => (
        <ExerciseCard
          key={offset + i}
          exercise={exercise}
          number={offset + i + 1}
          settings={settings}
          onDone={(success) => done(offset + i, success)}
        />
      ))}
      {offset + page.length < exercises.length ? (
        <Button
          label="Exercice suivant"
          disabled={!pageDone}
          onPress={() => setOffset(offset + page.length)}
        />
      ) : allDone ? (
        <ThemedView type="backgroundElement" style={styles.support}>
          <ThemedText type="subtitle">Exercices terminés !</ThemedText>
          <ThemedText style={learningTextStyle(settings)}>
            {succeeded} réussi{succeeded > 1 ? 's' : ''} sur {exercises.length}. Bravo pour ton effort !
          </ThemedText>
        </ThemedView>
      ) : null}
    </View>
  );
}

function ExerciseCard({
  exercise,
  number,
  settings,
  onDone,
}: {
  exercise: Exercise;
  number: number;
  settings: LearningSettings;
  onDone: (success: boolean) => void;
}) {
  const [typed, setTyped] = useState('');
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [corrected, setCorrected] = useState(false);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const text = learningTextStyle(settings, 18);
  const checkable = exercise.accepted.length > 0;

  function finish(success: boolean) {
    setOutcome(success);
    onDone(success);
  }

  function check() {
    const result = checkAnswer(exercise.accepted, typed);
    setVerdict(result);
    setTries(tries + 1);
    if (result.result === 'juste') {
      setCorrected(true);
      finish(true);
    }
  }

  const feedback =
    verdict === null || verdict.result === 'juste'
      ? null
      : verdict.result === 'presque'
        ? NEAR_MISS_MESSAGES[verdict.nearMiss!]
        : 'Pas encore. Relis l’énoncé et essaie encore !';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="primary">
        Exercice {number}
      </ThemedText>
      <ThemedText style={text}>{exercise.instruction}</ThemedText>
      <ThemedText style={[text, styles.prompt]}>{exercise.prompt}</ThemedText>
      <TextField
        label={checkable ? 'Ta réponse' : 'Ta réponse (ou fais-le sur ta feuille)'}
        value={typed}
        onChangeText={(value) => {
          setTyped(value);
          setVerdict(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        multiline={!checkable}
        editable={!corrected}
        onSubmitEditing={checkable && typed.trim() ? check : undefined}
        style={text}
      />
      {feedback && !corrected ? (
        <ThemedText style={text} themeColor="warning" accessibilityLiveRegion="polite">
          {feedback}
        </ThemedText>
      ) : null}
      {showHint && exercise.hint ? <ThemedText style={text}>Indice : {exercise.hint}</ThemedText> : null}

      {corrected ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          {checkable ? (
            <ThemedText type="smallBold">
              {outcome ? 'Bravo, c’est juste !' : 'Voici la correction. Tu y arriveras la prochaine fois !'}
            </ThemedText>
          ) : null}
          <ThemedText style={[text, styles.answer]}>Correction : {exercise.answer}</ThemedText>
          {!checkable && outcome === null ? (
            <>
              <ThemedText style={text}>Compare avec ta réponse : avais-tu juste ?</ThemedText>
              <View style={styles.row}>
                <Button label="J’avais juste" style={styles.flex} onPress={() => finish(true)} />
                <Button
                  variant="secondary"
                  label="J’ai fait une erreur"
                  style={styles.flex}
                  onPress={() => finish(false)}
                />
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          {checkable ? (
            <Button label="Vérifier" style={styles.flex} disabled={!typed.trim()} onPress={check} />
          ) : (
            <>
              <Button
                label="Voir la correction"
                style={styles.flex}
                disabled={!typed.trim()}
                onPress={() => setCorrected(true)}
              />
              <Button
                variant="secondary"
                label="Fait sur ma feuille"
                style={styles.flex}
                onPress={() => setCorrected(true)}
              />
            </>
          )}
          {exercise.hint && !showHint && (tries > 0 || !checkable) ? (
            <Button
              variant="secondary"
              label="Un indice"
              style={styles.flex}
              onPress={() => setShowHint(true)}
            />
          ) : null}
          {checkable && tries >= TRIES_BEFORE_CORRECTION ? (
            <Button
              variant="secondary"
              label="Voir la correction"
              style={styles.flex}
              onPress={() => {
                setCorrected(true);
                finish(false);
              }}
            />
          ) : null}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  support: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  prompt: { fontWeight: 600 },
  answer: { fontStyle: 'italic' },
  result: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flexGrow: 1, flexBasis: 140 },
});
