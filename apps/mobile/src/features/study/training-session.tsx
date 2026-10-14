import {
  checkAnswer,
  isAnswered,
  NEAR_MISS_MESSAGES,
  neutralFeedback,
  verifyAnswer,
  type AnswerVerdict,
  type LearningSettings,
  type TrainingAnswer,
  type TrainingItem,
} from '@cote-a-cote/shared';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StepIndicator } from './step-indicator';

/** Vérification d'une réponse (étape 3). */
interface Check {
  /** Verdict de la première réponse ; null pour une réponse libre, comparée par l'enfant. */
  first: AnswerVerdict | null;
  /** Réponse courte corrigée après une erreur (un seul nouvel essai), et son verdict. */
  retry: string;
  retryVerdict: AnswerVerdict | null;
  hint: boolean;
  /** Correction affichée sans réponse juste (abandon ou deuxième erreur). */
  revealed: boolean;
  /** Réponse libre : l'enfant dit s'il avait juste. */
  selfRight: boolean | null;
}

const firstRight = (check: Check) => check.first?.result === 'juste';
const fixed = (check: Check) => check.retryVerdict?.result === 'juste';

function isFinal(item: TrainingItem, check: Check): boolean {
  if (item.kind === 'choix') return true;
  if (item.kind === 'libre') return check.selfRight !== null;
  return firstRight(check) || check.retryVerdict !== null || check.revealed;
}

/** Juste du premier coup (ou, pour une réponse libre, juste selon l'enfant) : c'est ce qui compte au résultat. */
const succeeded = (item: TrainingItem, check: Check) =>
  item.kind === 'libre' ? check.selfRight === true : firstRight(check);

function answerLabel(item: TrainingItem, answer: TrainingAnswer | undefined): string {
  if (!answer) return '—';
  if ('paper' in answer) return 'faite sur ta feuille';
  if ('choice' in answer) return item.kind === 'choix' ? (item.question.choices[answer.choice] ?? '—') : '—';
  return answer.text.trim() || 'tu ne savais pas';
}

/**
 * Étapes 2 et 3 d'une leçon : l'enfant répond à toutes les questions sans correction, puis chaque réponse
 * est vérifiée contre la réponse attendue. Une réponse courte fausse peut être corrigée une fois (avec un
 * indice) avant que la correction s'affiche.
 */
export function TrainingSession({
  items,
  settings,
  mathSupport = false,
  onFinish,
  onBackToLesson,
  onNavigate,
}: {
  items: TrainingItem[];
  settings: LearningSettings;
  /** Supports concrets pour le calcul (F12 : dyscalculie). */
  mathSupport?: boolean;
  /** Appelé une fois la vérification terminée : réponses justes du premier coup, sur le total. */
  onFinish?: (score: number, total: number) => void;
  onBackToLesson: () => void;
  /** Changement de page ou d'étape : l'écran remonte en haut. */
  onNavigate?: () => void;
}) {
  const [phase, setPhase] = useState<'repondre' | 'verifier'>('repondre');
  const [answers, setAnswers] = useState<(TrainingAnswer | undefined)[]>(() => items.map(() => undefined));
  const [checks, setChecks] = useState<Check[]>([]);
  const [offset, setOffset] = useState(0);
  const reported = useRef(false);
  const pageSize = Math.max(1, Math.min(settings.maxItemsPerScreen, 3));
  const indexes = items.map((_, i) => i).slice(offset, offset + pageSize);
  const lastPage = offset + pageSize >= items.length;

  const allFinal = phase === 'verifier' && items.every((item, i) => checks[i] && isFinal(item, checks[i]));
  const score = allFinal ? items.filter((item, i) => succeeded(item, checks[i]!)).length : 0;
  const corrected = allFinal ? checks.filter(fixed).length : 0;

  useEffect(() => {
    if (allFinal && !reported.current) {
      reported.current = true;
      onFinish?.(score, items.length);
    }
  }, [allFinal, score, items.length, onFinish]);

  function setAnswer(index: number, answer: TrainingAnswer | undefined) {
    setAnswers((current) => current.map((a, i) => (i === index ? answer : a)));
  }
  function goTo(page: number) {
    setOffset(page);
    onNavigate?.();
  }
  function updateCheck(index: number, change: Partial<Check>) {
    setChecks((current) => current.map((c, i) => (i === index ? { ...c, ...change } : c)));
  }

  function startVerification() {
    setChecks(
      items.map((item, i) => {
        const answer = answers[i];
        return {
          first: verifyAnswer(item, answer),
          retry: answer && 'text' in answer ? answer.text : '',
          retryVerdict: null,
          hint: false,
          revealed: false,
          selfRight: null,
        };
      }),
    );
    setPhase('verifier');
    goTo(0);
  }

  function restart() {
    reported.current = false;
    setAnswers(items.map(() => undefined));
    setChecks([]);
    setPhase('repondre');
    goTo(0);
  }

  if (phase === 'repondre') {
    const pageAnswered = indexes.every((i) => isAnswered(items[i]!, answers[i]));
    return (
      <View style={styles.container}>
        <StepIndicator current={2} />
        <ThemedText style={learningTextStyle(settings, 16)} themeColor="textSecondary">
          Réponds à toutes les questions. Tu vérifieras tes réponses à la fin.
        </ThemedText>
        {mathSupport ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={learningTextStyle(settings)}>
              🧮 Tu peux t&apos;aider : dessine, compte avec des objets (jetons, perles, doigts) et fais une
              étape à la fois. Prends tout ton temps.
            </ThemedText>
          </ThemedView>
        ) : null}
        {indexes.map((i) => (
          <AnswerCard
            key={i}
            item={items[i]!}
            number={i + 1}
            total={items.length}
            answer={answers[i]}
            settings={settings}
            onAnswer={(answer) => setAnswer(i, answer)}
          />
        ))}
        <View style={styles.row}>
          {offset > 0 ? (
            <Button
              variant="secondary"
              label="← Précédent"
              style={styles.flex}
              onPress={() => goTo(Math.max(0, offset - pageSize))}
            />
          ) : null}
          {lastPage ? (
            <Button
              label="J’ai fini : je vérifie"
              style={styles.flex}
              disabled={!pageAnswered}
              onPress={startVerification}
            />
          ) : (
            <Button
              label="Suivant →"
              style={styles.flex}
              disabled={!pageAnswered}
              onPress={() => goTo(offset + pageSize)}
            />
          )}
        </View>
        <Button variant="secondary" label="Revoir la leçon" onPress={onBackToLesson} />
      </View>
    );
  }

  const pageFinal = indexes.every((i) => checks[i] && isFinal(items[i]!, checks[i]));
  return (
    <View style={styles.container}>
      <StepIndicator current={3} />
      {indexes.map((i) => (
        <CheckCard
          key={i}
          item={items[i]!}
          number={i + 1}
          answer={answers[i]}
          check={checks[i]!}
          settings={settings}
          onChange={(change) => updateCheck(i, change)}
        />
      ))}
      {!lastPage ? (
        <Button label="Suivant →" disabled={!pageFinal} onPress={() => goTo(offset + pageSize)} />
      ) : allFinal ? (
        <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
          <ThemedText type="subtitle">C’est vérifié !</ThemedText>
          <ThemedText style={learningTextStyle(settings, 18)}>
            {score} sur {items.length} du premier coup
            {corrected > 0 ? `, et ${corrected} corrigée${corrected > 1 ? 's' : ''} ensuite` : ''}. Bravo pour
            ton effort !
          </ThemedText>
          <Button label="Recommencer l’entraînement" onPress={restart} />
          <Button variant="secondary" label="Revoir la leçon" onPress={onBackToLesson} />
        </ThemedView>
      ) : null}
    </View>
  );
}

/** Étape 2 : une question, sans correction. */
function AnswerCard({
  item,
  number,
  total,
  answer,
  settings,
  onAnswer,
}: {
  item: TrainingItem;
  number: number;
  total: number;
  answer: TrainingAnswer | undefined;
  settings: LearningSettings;
  onAnswer: (answer: TrainingAnswer | undefined) => void;
}) {
  const theme = useTheme();
  const text = learningTextStyle(settings, 18);

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={`question-${number}`}>
      <ThemedText type="small" themeColor="textSecondary">
        Question {number} sur {total}
      </ThemedText>
      {item.kind === 'choix' ? (
        <View accessibilityRole="radiogroup" style={styles.choices}>
          <ThemedText style={text}>{item.question.question}</ThemedText>
          {item.question.choices.map((choice, i) => {
            const selected = answer !== undefined && 'choice' in answer && answer.choice === i;
            return (
              <Pressable
                key={choice}
                accessibilityRole="radio"
                accessibilityLabel={choice}
                accessibilityState={{ checked: selected }}
                onPress={() => onAnswer({ choice: i })}
                style={[
                  styles.choice,
                  {
                    backgroundColor: selected ? theme.backgroundSelected : theme.background,
                    borderColor: selected ? theme.primary : theme.border,
                    borderWidth: selected ? 3 : 1,
                  },
                ]}>
                <ThemedText style={text}>{choice}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <ThemedText style={text}>{item.exercise.instruction}</ThemedText>
          <ThemedText style={[text, styles.prompt]}>{item.exercise.prompt}</ThemedText>
          {answer && 'paper' in answer ? (
            <>
              <ThemedText style={text}>📝 Fait sur ta feuille. Tu compareras avec la correction.</ThemedText>
              <Button variant="secondary" label="Écrire ma réponse ici" onPress={() => onAnswer(undefined)} />
            </>
          ) : (
            <>
              <TextField
                label="Ta réponse"
                value={answer && 'text' in answer ? answer.text : ''}
                onChangeText={(value) => onAnswer(value.trim() ? { text: value } : undefined)}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                multiline={item.kind === 'libre'}
                style={text}
              />
              {answer && 'text' in answer && answer.text === '' ? (
                <ThemedText style={text} themeColor="textSecondary">
                  D’accord : tu la reverras à la vérification.
                </ThemedText>
              ) : !answer ? (
                <View style={styles.row}>
                  {item.kind === 'libre' ? (
                    <Button
                      variant="secondary"
                      label="Fait sur ma feuille"
                      style={styles.flex}
                      onPress={() => onAnswer({ paper: true })}
                    />
                  ) : null}
                  <Button
                    variant="secondary"
                    label="Je ne sais pas"
                    style={styles.flex}
                    onPress={() => onAnswer({ text: '' })}
                  />
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </ThemedView>
  );
}

/** Étape 3 : la réponse de l'enfant comparée à la réponse attendue. */
function CheckCard({
  item,
  number,
  answer,
  check,
  settings,
  onChange,
}: {
  item: TrainingItem;
  number: number;
  answer: TrainingAnswer | undefined;
  check: Check;
  settings: LearningSettings;
  onChange: (change: Partial<Check>) => void;
}) {
  const text = learningTextStyle(settings, 18);
  const question = item.kind === 'choix' ? item.question.question : item.exercise.prompt;

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.card}
      accessibilityLiveRegion="polite"
      testID={`verification-${number}`}>
      <ThemedText type="small" themeColor="textSecondary">
        Question {number}
      </ThemedText>
      <ThemedText style={[text, styles.prompt]}>{question}</ThemedText>
      <ThemedText style={text}>Ta réponse : {answerLabel(item, answer)}</ThemedText>
      {item.kind === 'choix' ? (
        <>
          <ThemedText type="smallBold" themeColor={firstRight(check) ? 'primary' : 'danger'}>
            {firstRight(check)
              ? '✓ Juste !'
              : `✗ La bonne réponse : ${item.question.choices[item.question.answerIndex]}`}
          </ThemedText>
          <ThemedText style={text}>{neutralFeedback(item.question.explanation)}</ThemedText>
        </>
      ) : item.kind === 'libre' ? (
        <>
          <ThemedText style={[text, styles.correction]}>
            Correction : {neutralFeedback(item.exercise.answer)}
          </ThemedText>
          {check.selfRight === null ? (
            <>
              <ThemedText style={text}>Compare avec ta réponse : avais-tu juste ?</ThemedText>
              <View style={styles.row}>
                <Button
                  label="J’avais juste"
                  style={styles.flex}
                  onPress={() => onChange({ selfRight: true })}
                />
                <Button
                  variant="secondary"
                  label="J’ai fait une erreur"
                  style={styles.flex}
                  onPress={() => onChange({ selfRight: false })}
                />
              </View>
            </>
          ) : (
            <ThemedText type="smallBold" themeColor="primary">
              {check.selfRight
                ? '✓ Bravo !'
                : 'Retiens bien la correction : tu y arriveras la prochaine fois.'}
            </ThemedText>
          )}
        </>
      ) : (
        <ShortAnswerCheck
          item={item}
          check={check}
          answered={answer !== undefined && 'text' in answer && answer.text.trim() !== ''}
          settings={settings}
          onChange={onChange}
        />
      )}
    </ThemedView>
  );
}

function ShortAnswerCheck({
  item,
  check,
  answered,
  settings,
  onChange,
}: {
  item: Extract<TrainingItem, { kind: 'saisie' }>;
  check: Check;
  /** L'enfant avait tapé une réponse (sinon : « je ne sais pas »). */
  answered: boolean;
  settings: LearningSettings;
  onChange: (change: Partial<Check>) => void;
}) {
  const text = learningTextStyle(settings, 18);
  const { exercise } = item;
  const expected = (
    <>
      <ThemedText type="smallBold">La réponse attendue : {exercise.accepted[0]}</ThemedText>
      <ThemedText style={[text, styles.correction]}>
        Correction : {neutralFeedback(exercise.answer)}
      </ThemedText>
    </>
  );

  if (firstRight(check))
    return (
      <>
        <ThemedText type="smallBold" themeColor="primary">
          ✓ Juste !
        </ThemedText>
        <ThemedText style={[text, styles.correction]}>
          Correction : {neutralFeedback(exercise.answer)}
        </ThemedText>
      </>
    );
  if (fixed(check))
    return (
      <>
        <ThemedText type="smallBold" themeColor="primary">
          ✓ Bien corrigé !
        </ThemedText>
        <ThemedText style={[text, styles.correction]}>
          Correction : {neutralFeedback(exercise.answer)}
        </ThemedText>
      </>
    );
  if (check.retryVerdict || check.revealed)
    return (
      <>
        {check.retryVerdict?.result === 'presque' ? (
          <ThemedText style={text} themeColor="warning">
            {NEAR_MISS_MESSAGES[check.retryVerdict.nearMiss!]}
          </ThemedText>
        ) : null}
        {expected}
      </>
    );

  const first = check.first!;
  return (
    <>
      <ThemedText style={text} themeColor="warning">
        {first.result === 'presque'
          ? NEAR_MISS_MESSAGES[first.nearMiss!]
          : answered
            ? 'Ce n’est pas encore ça. Essaie de corriger !'
            : 'Essaie maintenant de trouver la réponse !'}
      </ThemedText>
      {check.hint && exercise.hint ? <ThemedText style={text}>Indice : {exercise.hint}</ThemedText> : null}
      <TextField
        label="Corrige ta réponse"
        value={check.retry}
        onChangeText={(retry) => onChange({ retry })}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={text}
      />
      <View style={styles.row}>
        <Button
          label="Vérifier"
          style={styles.flex}
          disabled={!check.retry.trim()}
          onPress={() => onChange({ retryVerdict: checkAnswer(exercise.accepted, check.retry) })}
        />
        {exercise.hint && !check.hint ? (
          <Button
            variant="secondary"
            label="Un indice"
            style={styles.flex}
            onPress={() => onChange({ hint: true })}
          />
        ) : null}
        <Button
          variant="secondary"
          label="Voir la correction"
          style={styles.flex}
          onPress={() => onChange({ revealed: true })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  choices: { gap: Spacing.two },
  choice: {
    minHeight: MinTouchSize + 8,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  prompt: { fontWeight: 600 },
  correction: { fontStyle: 'italic' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flexGrow: 1, flexBasis: 140 },
});
