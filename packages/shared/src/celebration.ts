/**
 * Fin de mission (F11) : une phrase de fête différente chaque jour, et parfois un coffre-surprise
 * (anecdote ou blague). Tirages stables dans la journée ; jamais rien de payant ni de punitif.
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export const CELEBRATION_PHRASES = [
  'Mission accomplie ! Tu peux être fier de toi.',
  'Bravo ! Ton cerveau a bien travaillé aujourd’hui.',
  'Et voilà, c’est fait ! Profite bien du reste de ta journée.',
  'Super travail ! Chaque jour, tu deviens plus fort.',
  'Mission réussie ! Tu as tenu jusqu’au bout.',
  'Génial ! Ton avatar est content de toi.',
  'Bien joué ! Le travail d’aujourd’hui est rangé.',
  'Champion ! Tu as fait ce que tu avais prévu.',
  'Youpi ! Encore une mission dans ta poche.',
  'Chapeau ! Tu as été régulier et courageux.',
] as const;

export function celebrationPhrase(childId: string, date: string): string {
  return CELEBRATION_PHRASES[hash(`${childId}|${date}|fete`) % CELEBRATION_PHRASES.length]!;
}

export interface Treasure {
  id: string;
  kind: 'anecdote' | 'blague';
  text: string;
}

/** Anecdotes simples et vérifiées, et blagues pour enfants. */
export const TREASURES: readonly Treasure[] = [
  {
    id: 'a1',
    kind: 'anecdote',
    text: 'La Meuse prend sa source en France et se jette dans la mer du Nord, aux Pays-Bas.',
  },
  { id: 'a2', kind: 'anecdote', text: 'Un escargot peut dormir plusieurs mois quand il fait trop sec.' },
  { id: 'a3', kind: 'anecdote', text: 'Le cœur d’une baleine bleue est aussi grand qu’une petite voiture.' },
  { id: 'a4', kind: 'anecdote', text: 'Les abeilles dansent pour montrer aux autres où trouver des fleurs.' },
  { id: 'a5', kind: 'anecdote', text: 'Le hérisson a environ 6 000 piquants sur le dos.' },
  {
    id: 'a6',
    kind: 'anecdote',
    text: 'La lumière du Soleil met environ 8 minutes pour arriver sur la Terre.',
  },
  { id: 'a7', kind: 'anecdote', text: 'Les pieuvres ont trois cœurs.' },
  {
    id: 'a8',
    kind: 'anecdote',
    text: 'L’Atomium, à Bruxelles, représente un cristal de fer agrandi des milliards de fois.',
  },
  { id: 'a9', kind: 'anecdote', text: 'Une girafe a autant de vertèbres dans le cou qu’un humain : sept.' },
  {
    id: 'a10',
    kind: 'anecdote',
    text: 'Les chouettes ne peuvent pas bouger leurs yeux : elles tournent la tête.',
  },
  { id: 'a11', kind: 'anecdote', text: 'Le castor construit des barrages avec des branches et de la boue.' },
  {
    id: 'a12',
    kind: 'anecdote',
    text: 'La Lune s’éloigne de la Terre de quelques centimètres chaque année.',
  },
  { id: 'a13', kind: 'anecdote', text: 'Les flamants roses sont roses grâce à ce qu’ils mangent.' },
  { id: 'a14', kind: 'anecdote', text: 'Un papillon goûte avec ses pattes.' },
  {
    id: 'a15',
    kind: 'anecdote',
    text: 'Le plus haut point de Belgique est le Signal de Botrange, dans les Hautes Fagnes.',
  },
  {
    id: 'b1',
    kind: 'blague',
    text: 'Pourquoi les poissons détestent l’ordinateur ? Parce qu’ils ont peur du net !',
  },
  { id: 'b2', kind: 'blague', text: 'Quel est le comble pour un électricien ? De ne pas être au courant.' },
  { id: 'b3', kind: 'blague', text: 'Que dit un zéro à un huit ? « Tiens, tu as mis une ceinture ! »' },
  {
    id: 'b4',
    kind: 'blague',
    text: 'Pourquoi le livre de maths est triste ? Parce qu’il a trop de problèmes.',
  },
  { id: 'b5', kind: 'blague', text: 'Quel est le comble pour un jardinier ? De raconter des salades.' },
  { id: 'b6', kind: 'blague', text: 'Que fait une vache quand elle ferme les yeux ? Du lait concentré.' },
  {
    id: 'b7',
    kind: 'blague',
    text: 'Pourquoi les canards sont toujours à l’heure ? Parce qu’ils sont dans l’étang.',
  },
  { id: 'b8', kind: 'blague', text: 'Quel animal a le plus de dents ? La petite souris.' },
  {
    id: 'b9',
    kind: 'blague',
    text: 'Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël.',
  },
  { id: 'b10', kind: 'blague', text: 'Quel est le sport préféré des insectes ? Le cricket.' },
];

/** Un coffre-surprise environ une mission sur trois, le même toute la journée. */
export function hasChestToday(childId: string, date: string): boolean {
  return hash(`${childId}|${date}|coffre`) % 3 === 0;
}

/** Trésor du jour : de préférence un que l'enfant n'a pas encore. */
export function treasureOfTheDay(childId: string, date: string, owned: readonly string[]): Treasure {
  const fresh = TREASURES.filter((t) => !owned.includes(t.id));
  const pool = fresh.length > 0 ? fresh : TREASURES;
  return pool[hash(`${childId}|${date}|tresor`) % pool.length]!;
}

/** Défi bonus : 3 questions tirées des quiz récents (une par fiche d'abord), différentes chaque jour. */
export const BONUS_QUESTION_COUNT = 3;

export function bonusQuestions<Q extends { question: string }>(
  quizzes: readonly (readonly Q[])[],
  seed: string,
): Q[] {
  const shuffled = quizzes
    .filter((quiz) => quiz.length > 0)
    .map((quiz) => [...quiz].sort((a, b) => hash(seed + a.question) - hash(seed + b.question)))
    .sort((a, b) => hash(seed + a[0]!.question) - hash(seed + b[0]!.question));
  const result: Q[] = [];
  for (let round = 0; result.length < BONUS_QUESTION_COUNT; round++) {
    const before = result.length;
    for (const quiz of shuffled) {
      if (quiz[round] && result.length < BONUS_QUESTION_COUNT) result.push(quiz[round]!);
    }
    if (result.length === before) break;
  }
  return result;
}
