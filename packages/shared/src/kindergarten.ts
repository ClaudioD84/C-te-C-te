import { addDays, daysBetween, type IsoDate } from './dates';
import type { Grade } from './school';

/**
 * Mode maternelle (voir docs/maternelle/proposition.md) : de courts jeux partagés avec le parent, sans devoirs ni
 * évaluation, choisis dans une liste relue (pas inventés par l'IA) et liés aux attendus du référentiel des
 * compétences initiales.
 */

export const KINDERGARTEN_DOMAINS = ['langage', 'nombres', 'monde', 'corps'] as const;
export type KindergartenDomain = (typeof KINDERGARTEN_DOMAINS)[number];

export const KINDERGARTEN_DOMAIN_LABELS: Record<KindergartenDomain, string> = {
  langage: 'Langage et éveil à l’écrit',
  nombres: 'Nombres, formes et espace',
  monde: 'Découverte du monde',
  corps: 'Corps, arts et vivre ensemble',
};

export const KINDERGARTEN_DOMAIN_PICTOGRAMS: Record<KindergartenDomain, string> = {
  langage: '💬',
  nombres: '🔢',
  monde: '🌱',
  corps: '🎵',
};

export interface KindergartenActivity {
  /** Identifiant stable (enregistré dans le journal de l'effort). */
  code: string;
  title: string;
  /** Années où l'activité est proposée (« M1-M2 » : dès la 1re maternelle). */
  grades: readonly Grade[];
  domain: KindergartenDomain;
  minutes: number;
  materials: string;
  /** Trois étapes au plus, lues à voix haute dans la console enfant. */
  steps: readonly string[];
  /** Matière du référentiel et code de l'attendu travaillé. */
  subject: string;
  curriculumCode: string;
  /** Mots du thème de la classe auxquels l'activité se rattache (sans accents, en minuscules). */
  themes: readonly string[];
}

const M12: readonly Grade[] = ['M1', 'M2', 'M3'];
const M3: readonly Grade[] = ['M3'];

export const KINDERGARTEN_ACTIVITIES: readonly KindergartenActivity[] = [
  // Langage et éveil à l'écrit
  {
    code: 'boite-a-mots',
    title: 'La boîte à mots',
    grades: M12,
    domain: 'langage',
    minutes: 10,
    materials: 'Un sac et 5 objets de la maison',
    steps: [
      'Sortez les objets du sac un par un et nommez-les ensemble.',
      'Cachez-en un pendant que l’enfant ferme les yeux.',
      'Demandez : « Qu’est-ce qui a disparu ? »',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M1-M2-1-1',
    themes: ['maison', 'cuisine', 'objets', 'jouets'],
  },
  {
    code: 'je-raconte',
    title: 'Je raconte ma journée',
    grades: M12,
    domain: 'langage',
    minutes: 10,
    materials: 'Rien : au repas ou au coucher',
    steps: [
      'Demandez à l’enfant de raconter un moment de sa journée.',
      'Aidez-le à commencer par « je » : « Je suis allé… ».',
      'Reformulez sa phrase en la complétant, sans le corriger.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M1-M2-13-1',
    themes: ['ecole', 'famille'],
  },
  {
    code: 'dictee-adulte',
    title: 'La dictée à l’adulte',
    grades: M12,
    domain: 'langage',
    minutes: 10,
    materials: 'Une feuille et un crayon',
    steps: [
      'Proposez d’écrire un petit message (pour mamy, pour la classe…).',
      'L’enfant dicte, vous écrivez devant lui en disant les mots.',
      'Relisez le message ensemble en suivant du doigt.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M1-M2-29-1',
    themes: ['famille', 'fete', 'anniversaire', 'noel'],
  },
  {
    code: 'lettres-prenom',
    title: 'Les lettres de mon prénom',
    grades: M12,
    domain: 'langage',
    minutes: 10,
    materials: 'Lettres aimantées ou découpées, un modèle du prénom écrit par vous',
    steps: [
      'Montrez le modèle du prénom écrit en grand.',
      'L’enfant cherche les lettres une à une et les pose dans l’ordre.',
      'Comparez avec le modèle et lisez le prénom ensemble.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M1-M2-31-2',
    themes: ['lettres', 'ecriture', 'prenom'],
  },
  {
    code: 'chasse-rimes',
    title: 'La chasse aux rimes',
    grades: M3,
    domain: 'langage',
    minutes: 10,
    materials: 'Rien',
    steps: [
      'Dites deux mots qui riment : « chat, rat ».',
      'Cherchez ensemble d’autres mots qui finissent pareil.',
      'Puis des mots qui commencent par le même son.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M3-52-2',
    themes: ['animaux', 'comptines', 'poesie', 'sons'],
  },
  {
    code: 'qui-ou',
    title: 'Qui ? Où ?',
    grades: M3,
    domain: 'langage',
    minutes: 15,
    materials: 'Un livre d’histoires',
    steps: [
      'Lisez une histoire courte.',
      'Demandez à l’enfant de décrire le personnage principal.',
      'Puis le lieu où se passe l’histoire.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M3-42-1',
    themes: ['livres', 'contes', 'histoires', 'bibliotheque'],
  },
  {
    code: 'ma-comptine',
    title: 'Ma comptine',
    grades: M3,
    domain: 'langage',
    minutes: 10,
    materials: 'Une comptine (celle de la classe si possible)',
    steps: [
      'Dites la comptine en faisant les gestes.',
      'Répétez-la ensemble, un morceau à la fois.',
      'Le dernier soir, l’enfant la présente à la famille.',
    ],
    subject: 'Français',
    curriculumCode: 'MAT-M3-56-1',
    themes: ['comptines', 'poesie', 'chansons', 'musique'],
  },
  // Nombres, formes et espace
  {
    code: 'un-plusieurs',
    title: 'Un ou plusieurs ?',
    grades: M12,
    domain: 'nombres',
    minutes: 10,
    materials: 'Le rangement de la maison (cuillères, chaussettes…)',
    steps: [
      'Demandez : « Donne-moi une cuillère. »',
      'Puis : « Donne-moi plusieurs chaussettes. »',
      'Videz une boîte : « Il n’y en a plus. »',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M1-M2-145-1',
    themes: ['maison', 'rangement', 'nombres'],
  },
  {
    code: 'grand-tri',
    title: 'Le grand tri',
    grades: M12,
    domain: 'nombres',
    minutes: 10,
    materials: 'Le linge propre ou des jouets',
    steps: [
      'Choisissez un critère : la couleur, ou « a des roues / n’a pas de roues ».',
      'L’enfant range chaque objet dans le bon tas.',
      'Il explique pourquoi il a mis un objet dans un tas.',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M1-M2-176-1',
    themes: ['couleurs', 'jouets', 'vetements', 'rangement'],
  },
  {
    code: 'cache-trouve',
    title: 'Caché, trouvé',
    grades: M12,
    domain: 'nombres',
    minutes: 10,
    materials: 'Un doudou ou un petit jouet',
    steps: [
      'Cachez le doudou dans la pièce.',
      'Guidez l’enfant avec « sur, sous, dans, derrière, devant ».',
      'À son tour de cacher et de vous guider.',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M1-M2-159-1',
    themes: ['jouets', 'maison', 'espace'],
  },
  {
    code: 'plus-lourd',
    title: 'Le plus lourd',
    grades: M12,
    domain: 'nombres',
    minutes: 10,
    materials: 'Deux objets de poids différents (une pomme, un livre…)',
    steps: [
      'L’enfant prend un objet dans chaque main.',
      'Il dit lequel est le plus lourd.',
      'Vérifiez ensemble, puis recommencez avec d’autres objets.',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M1-M2-170-1',
    themes: ['fruits', 'cuisine', 'marche', 'automne'],
  },
  {
    code: 'compter-table',
    title: 'Compter pour de vrai',
    grades: M3,
    domain: 'nombres',
    minutes: 10,
    materials: 'La table à mettre',
    steps: [
      'L’enfant compte les personnes qui vont manger.',
      'Il prend autant d’assiettes, puis de fourchettes, en comptant jusqu’à 9.',
      'Demandez : « Combien en tout ? »',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M3-150-1',
    themes: ['cuisine', 'repas', 'nombres', 'famille'],
  },
  {
    code: 'des-malins',
    title: 'Les dés malins',
    grades: M3,
    domain: 'nombres',
    minutes: 15,
    materials: 'Un jeu avec un dé (jeu de l’oie, petits chevaux)',
    steps: [
      'Jouez une partie courte.',
      'À chaque lancer, l’enfant dit le nombre sans recompter les points.',
      'Il avance d’autant de cases.',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M3-184-1',
    themes: ['jeux', 'nombres'],
  },
  {
    code: 'cinq-cest-aussi',
    title: 'Cinq, c’est aussi…',
    grades: M3,
    domain: 'nombres',
    minutes: 10,
    materials: '5 pâtes et deux bols',
    steps: [
      'Répartissez les 5 pâtes entre les deux bols.',
      'Dites : « 4 et 1, ça fait 5. »',
      'Cherchez toutes les autres façons (3 et 2, 5 et 0…).',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M3-191-2',
    themes: ['nombres', 'cuisine'],
  },
  {
    code: 'pate-geometrique',
    title: 'Pâte à modeler géométrique',
    grades: M3,
    domain: 'nombres',
    minutes: 15,
    materials: 'Pâte à modeler, une balle, un dé, une boîte de conserve',
    steps: [
      'Regardez ensemble la balle, le dé et la boîte.',
      'Modelez une boule, un cube, un cylindre.',
      'Comparez chaque forme à son modèle.',
    ],
    subject: 'Mathématiques',
    curriculumCode: 'MAT-M3-200-1',
    themes: ['formes', 'bricolage'],
  },
  // Découverte du monde
  {
    code: 'jacques-a-dit',
    title: 'Jacques a dit',
    grades: M12,
    domain: 'monde',
    minutes: 10,
    materials: 'Rien',
    steps: [
      'Dites « Jacques a dit : touche ton genou ».',
      'Continuez avec la tête, le nez, le dos, le pied…',
      'À l’enfant de donner les ordres.',
    ],
    subject: 'Sciences',
    curriculumCode: 'MAT-M1-M2-234-1',
    themes: ['corps', 'sante', 'jeux'],
  },
  {
    code: 'graine-pousse',
    title: 'La graine qui pousse',
    grades: M12,
    domain: 'monde',
    minutes: 10,
    materials: 'Des lentilles, du coton, un pot',
    steps: [
      'Posez quelques lentilles sur du coton mouillé.',
      'Chaque jour, l’enfant arrose et regarde ce qui change.',
      'Il dessine la plante à la fin de la semaine.',
    ],
    subject: 'Sciences',
    curriculumCode: 'MAT-M1-M2-254-1',
    themes: ['printemps', 'plantes', 'jardin', 'nature', 'graines'],
  },
  {
    code: 'arbre-rue',
    title: 'L’arbre de la rue',
    grades: M3,
    domain: 'monde',
    minutes: 15,
    materials: 'Une promenade, un téléphone ou un carnet pour dessiner',
    steps: [
      'Choisissez un arbre près de chez vous.',
      'Photographiez-le ou dessinez-le.',
      'À chaque saison, l’enfant dit ce qui a changé.',
    ],
    subject: 'Sciences',
    curriculumCode: 'MAT-M3-256-1',
    themes: ['automne', 'hiver', 'printemps', 'saisons', 'arbres', 'nature'],
  },
  {
    code: 'petits-trieurs',
    title: 'Les petits trieurs',
    grades: M3,
    domain: 'monde',
    minutes: 10,
    materials: 'Les poubelles de tri de la maison',
    steps: [
      'Montrez les différentes poubelles.',
      'L’enfant trie les déchets de la cuisine.',
      'Utilisez les mots « trier, recycler, déchet ».',
    ],
    subject: 'Sciences',
    curriculumCode: 'MAT-M3-280-1',
    themes: ['environnement', 'planete', 'nature', 'recyclage'],
  },
  {
    code: 'avant-pendant-apres',
    title: 'Avant, pendant, après',
    grades: M3,
    domain: 'monde',
    minutes: 10,
    materials: '3 photos ou dessins d’une routine (se laver, s’habiller, déjeuner)',
    steps: [
      'Mélangez les images.',
      'L’enfant les remet dans l’ordre.',
      'Il raconte avec « avant, pendant, après ».',
    ],
    subject: 'Formation historique et géographique',
    curriculumCode: 'MAT-M3-358-1',
    themes: ['temps', 'journee', 'routine'],
  },
  {
    code: 'autrefois',
    title: 'Autrefois',
    grades: M3,
    domain: 'monde',
    minutes: 15,
    materials: 'Un objet ancien (chez les grands-parents) ou une image',
    steps: [
      'Montrez un objet d’autrefois et son équivalent d’aujourd’hui.',
      'Cherchez ensemble ce qui est pareil.',
      'Puis ce qui est différent.',
    ],
    subject: 'Formation historique et géographique',
    curriculumCode: 'MAT-M3-362-1',
    themes: ['autrefois', 'grands-parents', 'famille', 'histoire'],
  },
  // Corps, arts et vivre ensemble
  {
    code: 'statues-musicales',
    title: 'Statues musicales',
    grades: M12,
    domain: 'corps',
    minutes: 10,
    materials: 'De la musique',
    steps: [
      'Lancez une musique : on danse.',
      'Arrêtez-la : tout le monde se fige comme une statue.',
      'Changez de musique et recommencez.',
    ],
    subject: 'Éducation physique',
    curriculumCode: 'MAT-M1-M2-417-1',
    themes: ['musique', 'danse', 'fete', 'carnaval'],
  },
  {
    code: 'petites-mains',
    title: 'Les petites mains',
    grades: M12,
    domain: 'corps',
    minutes: 15,
    materials: 'Des pâtes, un lacet, du papier',
    steps: [
      'Enfilez des pâtes sur un lacet pour faire un collier.',
      'Déchirez et froissez du papier.',
      'Collez les boulettes pour faire un tableau.',
    ],
    subject: 'Éducation physique',
    curriculumCode: 'MAT-M1-M2-422-1',
    themes: ['bricolage', 'fete', 'noel', 'fete des meres', 'fete des peres'],
  },
  {
    code: 'chef-orchestre',
    title: 'Le chef d’orchestre',
    grades: M12,
    domain: 'corps',
    minutes: 10,
    materials: 'Une chanson connue',
    steps: [
      'Tapez dans les mains en suivant le rythme de la chanson.',
      'Marchez au même rythme.',
      'L’enfant devient le chef : il frappe, vous suivez.',
    ],
    subject: 'Éducation culturelle et artistique',
    curriculumCode: 'MAT-M1-M2-105-1',
    themes: ['musique', 'chansons', 'comptines'],
  },
  {
    code: 'bonjour-merci',
    title: 'Bonjour, merci',
    grades: M12,
    domain: 'corps',
    minutes: 10,
    materials: 'Une course à la boulangerie ou au marché',
    steps: [
      'Avant d’entrer, rappelez les mots magiques.',
      'L’enfant dit bonjour, s’il vous plaît et merci.',
      'Félicitez-le en sortant.',
    ],
    subject: 'Éducation à la philosophie et à la citoyenneté',
    curriculumCode: 'MAT-M1-M2-369-1',
    themes: ['marche', 'politesse', 'magasin'],
  },
  {
    code: 'meteo-emotions',
    title: 'La météo des émotions',
    grades: M3,
    domain: 'corps',
    minutes: 10,
    materials: '4 visages dessinés : joie, tristesse, colère, peur',
    steps: [
      'Le soir, montrez les quatre visages.',
      'L’enfant montre comment il s’est senti aujourd’hui.',
      'Il raconte pourquoi, s’il le souhaite.',
    ],
    subject: 'Éducation à la philosophie et à la citoyenneté',
    curriculumCode: 'MAT-M3-391-1',
    themes: ['emotions', 'amitie'],
  },
  {
    code: 'chacun-son-tour',
    title: 'Chacun son tour',
    grades: M3,
    domain: 'corps',
    minutes: 15,
    materials: 'Un jeu de société court',
    steps: [
      'Jouez une partie en famille.',
      'Rappelez d’attendre son tour et de laisser parler l’autre.',
      'À la fin, on se félicite, qu’on gagne ou qu’on perde.',
    ],
    subject: 'Éducation à la philosophie et à la citoyenneté',
    curriculumCode: 'MAT-M3-396-1',
    themes: ['jeux', 'amitie', 'regles'],
  },
];

const byCode = new Map(KINDERGARTEN_ACTIVITIES.map((a) => [a.code, a]));

export function kindergartenActivity(code: string): KindergartenActivity | undefined {
  return byCode.get(code);
}

export function kindergartenActivitiesFor(grade: Grade): KindergartenActivity[] {
  return KINDERGARTEN_ACTIVITIES.filter((a) => a.grades.includes(grade));
}

/** Nombre d'activités proposées par semaine. */
export const KINDERGARTEN_WEEKLY_COUNT = 4;
/** Une activité faite n'est plus proposée pendant ce nombre de jours. */
const RECENT_DAYS = 21;

/** Texte normalisé (sans accents, minuscules) pour comparer le thème de la classe. */
export function normalizeTheme(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesTheme(activity: KindergartenActivity, theme: string | null): boolean {
  if (!theme) return false;
  const words = normalizeTheme(theme)
    .split(/[^a-z-]+/)
    .filter((w) => w.length >= 3);
  return activity.themes.some((t) => words.some((w) => t.includes(w) || w.includes(t)));
}

/** Petit hachage stable : la même semaine donne le même choix pour un enfant. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Activités proposées pour une semaine : une par domaine (quatre domaines), en évitant celles faites récemment,
 * en préférant celles liées au thème de la classe ; ordre stable pour un enfant et une semaine donnés.
 */
export function suggestKindergartenWeek(input: {
  childId: string;
  grade: Grade;
  weekStart: IsoDate;
  theme: string | null;
  /** Activités faites, avec leur date. */
  done: readonly { code: string; date: IsoDate }[];
}): KindergartenActivity[] {
  const recent = new Set(
    input.done
      .filter(
        (d) => daysBetween(d.date, input.weekStart) < RECENT_DAYS && d.date < addDays(input.weekStart, 7),
      )
      .map((d) => d.code),
  );
  const pool = kindergartenActivitiesFor(input.grade);
  const seed = `${input.childId}|${input.weekStart}`;
  const score = (a: KindergartenActivity) =>
    (matchesTheme(a, input.theme) ? 0 : 2) +
    (recent.has(a.code) ? 4 : 0) +
    (hash(`${seed}|${a.code}`) % 1000) / 1000;

  const chosen: KindergartenActivity[] = [];
  for (const domain of KINDERGARTEN_DOMAINS) {
    const best = pool.filter((a) => a.domain === domain).sort((a, b) => score(a) - score(b))[0];
    if (best) chosen.push(best);
  }
  return chosen.slice(0, KINDERGARTEN_WEEKLY_COUNT);
}

/** Autre activité du même domaine, pour remplacer une proposition (la suivante dans un ordre stable). */
export function alternativeKindergartenActivity(
  grade: Grade,
  current: string,
  excluded: readonly string[],
): KindergartenActivity | undefined {
  const activity = byCode.get(current);
  if (!activity) return undefined;
  const sameDomain = kindergartenActivitiesFor(grade).filter((a) => a.domain === activity.domain);
  const index = sameDomain.findIndex((a) => a.code === current);
  for (let i = 1; i < sameDomain.length; i++) {
    const candidate = sameDomain[(index + i) % sameDomain.length]!;
    if (!excluded.includes(candidate.code)) return candidate;
  }
  return undefined;
}
