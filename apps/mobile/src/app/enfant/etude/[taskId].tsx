import { deriveLearningSettings, dictationWords, isMathSubject, trainingItems } from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { DictationPlayer } from '@/features/study/dictation-player';
import { RecitationRecorder } from '@/features/study/recitation-recorder';
import { FicheView } from '@/features/study/fiche-view';
import { StepIndicator } from '@/features/study/step-indicator';
import { TrainingSession } from '@/features/study/training-session';
import { useGeneratePack, useLogQuiz, useStudyPack } from '@/features/study/api';

/** Leçon (étape 1), entraînement et vérification (étapes 2 et 3), ou une autre façon de réviser. */
type Step = 'lecon' | 'entrainement' | 'ecoute' | 'reciter';

/**
 * Travail de l'enfant sur une tâche, en trois étapes : je revois la leçon et les clés pour réussir, je
 * m'entraîne sans correction, je vérifie mes réponses contre les réponses attendues.
 */
export default function StudyScreen() {
  const { taskId, mode, subject } = useLocalSearchParams<{
    taskId: string;
    /** « fiche » ou « quiz » depuis la mission : on commence toujours par la leçon. */
    mode?: string;
    subject?: string;
  }>();
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const pack = useStudyPack(taskId);
  const generate = useGeneratePack(taskId);
  const requested = useRef(false);
  const [step, setStep] = useState<Step>(mode === 'ecoute' || mode === 'reciter' ? mode : 'lecon');
  const scroll = useRef<ScrollView>(null);
  const toTop = () => scroll.current?.scrollTo({ y: 0, animated: false });
  const show = (next: Step) => {
    setStep(next);
    toTop();
  };
  const logQuiz = useLogQuiz(activeChildId ?? '');

  // Paquet absent : on le prépare à l'arrivée sur l'écran. Liste de vocabulaire photographiée (des cartes
  // seulement) : elle est complétée d'une fiche, d'un quiz et d'exercices ; en cas d'échec, la liste reste.
  const stored = pack.data?.content;
  const bareList =
    !!stored &&
    !stored.topicUnclear &&
    stored.quiz.length === 0 &&
    stored.exercises.length === 0 &&
    stored.flashcards.length > 0;
  const missing = pack.isSuccess && (pack.data === null || bareList);
  useEffect(() => {
    if (missing && !requested.current) {
      requested.current = true;
      generate.mutate(false);
    }
  }, [missing, generate]);

  const back = <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />;

  // Hors connexion, sans fiche gardée sur l'appareil : elle arrivera avec le réseau.
  if (!pack.data && pack.fetchStatus === 'paused') {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>
          Pas de connexion : cette fiche n&apos;est pas encore sur l&apos;appareil. Elle sera là dès le retour
          du réseau.
        </ThemedText>
        {back}
      </ThemedView>
    );
  }

  if (!child.data || pack.isLoading || generate.isPending || (missing && !generate.isError && !bareList)) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.centerText}>Je prépare ta fiche et ton quiz…</ThemedText>
        {back}
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const content = pack.data?.content;

  if (!content || content.topicUnclear) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>
          {generate.error
            ? generate.error.message
            : "Je n'ai pas assez d'informations sur cette leçon. Demande à ton parent de préciser la tâche."}
        </ThemedText>
        {generate.error ? <Button label="Réessayer" onPress={() => generate.mutate(false)} /> : null}
        {back}
      </ThemedView>
    );
  }

  const words = dictationWords(subject ?? '', content.fiche?.keyTerms ?? []);
  const items = trainingItems(content);
  // Sans fiche (cas rare), on passe directement à l'entraînement.
  const current = step === 'lecon' && !content.fiche && items.length > 0 ? 'entrainement' : step;
  const backToLesson = <Button variant="secondary" label="← Revoir la leçon" onPress={() => show('lecon')} />;

  return (
    <ChildScreen style={styles.container}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        {current === 'lecon' && content.fiche ? (
          <>
            <StepIndicator current={1} />
            <FicheView fiche={content.fiche} settings={settings} packId={pack.data?.id} />
            {items.length > 0 ? (
              <Button label="J’ai revu la leçon : je m’entraîne →" onPress={() => show('entrainement')} />
            ) : null}
            <ThemedText type="smallBold">Autres façons de réviser</ThemedText>
            <View style={styles.row}>
              {words.length >= 2 ? (
                <Button
                  variant="secondary"
                  label="Écoute et écris"
                  style={styles.flex}
                  onPress={() => show('ecoute')}
                />
              ) : null}
              <Button
                variant="secondary"
                label="Je récite"
                style={styles.flex}
                onPress={() => show('reciter')}
              />
            </View>
          </>
        ) : null}
        {/* Gardé monté (caché) pendant la relecture de la leçon : les réponses déjà données restent. */}
        {items.length > 0 ? (
          <View style={current === 'entrainement' ? undefined : styles.hidden}>
            <TrainingSession
              key={pack.data?.id}
              items={items}
              settings={settings}
              mathSupport={settings.visualMath && isMathSubject(subject ?? '')}
              onFinish={(score, total) => logQuiz(taskId, score, total)}
              onBackToLesson={() => show('lecon')}
              onNavigate={toTop}
            />
          </View>
        ) : null}
        {current === 'ecoute' ? (
          <>
            <DictationPlayer
              words={words}
              subject={subject ?? ''}
              settings={settings}
              onFinish={(correct, total) => logQuiz(taskId, correct, total, 'ecoute')}
            />
            {backToLesson}
          </>
        ) : null}
        {current === 'reciter' ? (
          <>
            <RecitationRecorder />
            {backToLesson}
          </>
        ) : null}
        {back}
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flexGrow: 1, flexBasis: 140 },
  hidden: { display: 'none' },
});
