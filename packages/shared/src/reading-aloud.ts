import { gradeYear, schoolLevel, type Grade } from './school';

/**
 * Lecture à voix haute (primaire) : un court texte de son niveau, lu à voix haute et chronométré. Le parent
 * touche les mots difficiles. On ne montre que les progrès de l'enfant lui-même, jamais de norme ni de
 * comparaison. Textes originaux, écrits pour l'application : huit par niveau, de longueur comparable.
 */
export interface ReadingText {
  id: string;
  /** 1 : 1re-2e primaire ; 2 : 3e-4e ; 3 : 5e-6e. */
  level: 1 | 2 | 3;
  title: string;
  text: string;
}

export const READING_TEXTS: readonly ReadingText[] = [
  {
    id: 'chat-lea',
    level: 1,
    title: 'Le chat de Léa',
    text: 'Léa a un petit chat gris. Il dort sur le lit. Le matin, il boit du lait. Puis il joue avec une balle rouge. Le soir, Léa lit une histoire. Le chat écoute et ronronne.',
  },
  {
    id: 'pluie',
    level: 1,
    title: 'La pluie',
    text: 'Il pleut sur la ville. Tom met ses bottes jaunes. Il saute dans les flaques. Plouf ! Maman rit. Après la pluie, le soleil revient. Dans le ciel, il y a un bel arc-en-ciel.',
  },
  {
    id: 'parc',
    level: 1,
    title: 'Au parc',
    text: 'Nina va au parc avec papa. Elle monte sur le toboggan et elle glisse très vite. Ensuite, elle mange une pomme sur un banc. Un pigeon vient la voir. Nina lui dit bonjour.',
  },
  {
    id: 'gateau',
    level: 1,
    title: 'Le gâteau',
    text: 'Aujourd’hui, Sami fait un gâteau avec son frère. Ils cassent trois œufs. Ils ajoutent du sucre et de la farine. Le gâteau cuit dans le four. Quelle bonne odeur ! Ils le partagent avec toute la famille.',
  },
  {
    id: 'neige',
    level: 1,
    title: 'La neige',
    text: 'Ce matin, tout est blanc dehors. Il a neigé ! Zoé met son bonnet et ses gants. Avec papi, elle fait un gros bonhomme de neige. Il a une carotte pour le nez et deux cailloux pour les yeux.',
  },
  {
    id: 'velo',
    level: 1,
    title: 'Le vélo bleu',
    text: 'Malo a un vélo bleu. Au début, il tombe souvent. Papa tient la selle et court à côté de lui. Un jour, papa lâche le vélo sans rien dire. Malo roule tout seul ! Il est très fier.',
  },
  {
    id: 'ferme',
    level: 1,
    title: 'À la ferme',
    text: 'La classe visite une ferme. Les enfants voient des vaches, des cochons et des moutons. Lina caresse un petit lapin tout doux. La fermière montre les œufs des poules. Elle en donne un à chaque enfant.',
  },
  {
    id: 'piscine',
    level: 1,
    title: 'À la piscine',
    text: 'Le mercredi, Emma va à la piscine. Elle met son maillot et ses lunettes. L’eau est un peu froide. Emma nage comme un petit poisson. À la fin, elle saute du bord en riant.',
  },
  {
    id: 'herisson',
    level: 2,
    title: 'Le hérisson du jardin',
    text: 'Chaque soir, quand la nuit tombe, un hérisson traverse notre jardin. Il avance doucement, le nez au ras du sol, à la recherche de limaces et de vers de terre. Au moindre bruit, il se roule en boule et ses piquants le protègent. Papa a construit une petite maison en bois sous la haie. Cet hiver, le hérisson pourra y dormir bien au chaud jusqu’au printemps.',
  },
  {
    id: 'mer',
    level: 2,
    title: 'Une journée à la mer',
    text: 'Dimanche, nous avons pris le train jusqu’à Ostende. Le vent soufflait fort sur la digue et les mouettes criaient au-dessus de nos têtes. Sur la plage, nous avons construit un château de sable avec des tours et des fossés. Quand la marée est montée, les vagues ont tout emporté. Pour finir la journée, nous avons mangé des croquettes de crevettes en regardant le soleil se coucher.',
  },
  {
    id: 'marche',
    level: 2,
    title: 'Le marché du samedi',
    text: 'Le samedi matin, je vais au marché avec ma grand-mère. Elle connaît tous les marchands. Chez le fromager, elle goûte un morceau de fromage de Herve et fait la grimace : il sent très fort ! Au stand des fruits, nous choisissons des pommes et des poires bien mûres. Avant de rentrer, nous achetons toujours une gaufre chaude que nous partageons sur un banc de la place.',
  },
  {
    id: 'cabane',
    level: 2,
    title: 'La cabane',
    text: 'Au fond du bois, Lucas et Inès ont découvert de vieilles planches. Ils ont décidé de construire une cabane. Pendant tout l’après-midi, ils ont scié, cloué et porté des branches pour le toit. Quand la pluie s’est mise à tomber, ils se sont abrités à l’intérieur. Pas une goutte n’est passée ! Fiers de leur travail, ils ont gravé leurs initiales sur la porte.',
  },
  {
    id: 'carnaval',
    level: 2,
    title: 'Le carnaval de l’école',
    text: 'En février, toute l’école fête le carnaval. Ce matin, la cour ressemble à un grand théâtre : il y a des pirates, des princesses, des dinosaures et même un robot en carton. Le robot, c’est Yanis ! Il a passé tout le week-end à le fabriquer avec sa sœur. Au son des tambours, les élèves défilent dans les rues du quartier et lancent des confettis aux passants.',
  },
  {
    id: 'abeilles',
    level: 2,
    title: 'Les abeilles de l’école',
    text: 'Au bout du jardin de l’école, monsieur Pierre a installé deux ruches. Les élèves observent les abeilles derrière une vitre. Elles volent de fleur en fleur pour récolter le nectar et le pollen. De retour à la ruche, elles fabriquent le miel et le rangent dans de petites cases de cire. En juin, la classe a goûté son propre miel : un vrai trésor doré !',
  },
  {
    id: 'bibliotheque',
    level: 2,
    title: 'À la bibliothèque',
    text: 'Tous les quinze jours, notre classe se rend à la bibliothèque communale. La bibliothécaire nous accueille avec le sourire et nous lit d’abord une histoire. Ensuite, chacun peut choisir deux livres à emporter. Moi, j’aime les bandes dessinées, surtout celles de Tintin et de Spirou. Mon ami Noah préfère les livres sur l’espace. Avant de partir, nous rendons les livres de la fois précédente.',
  },
  {
    id: 'potager',
    level: 2,
    title: 'Le potager de Mamie',
    text: 'Au printemps, Mamie et moi préparons le potager. D’abord, nous retournons la terre avec une bêche. Puis nous semons des radis, des carottes et des haricots en lignes bien droites. Chaque soir, je les arrose avec mon petit arrosoir vert. Après quelques semaines, les premières feuilles sortent de terre. En été, nous ramassons nos légumes et nous préparons une soupe délicieuse.',
  },
  {
    id: 'ardennes',
    level: 3,
    title: 'Les Ardennes en automne',
    text: 'En automne, les forêts des Ardennes changent de couleur. Les hêtres deviennent dorés, les chênes prennent une teinte rousse et le sol se couvre d’un épais tapis de feuilles. C’est aussi la saison du brame : la nuit, on entend les cerfs appeler pour impressionner leurs rivaux. Les promeneurs patients aperçoivent parfois un chevreuil à la lisière d’un bois ou un sanglier qui fouille la terre à la recherche de glands. Dans les villages, les cheminées se remettent à fumer et l’odeur du feu de bois se mêle à celle des champignons.',
  },
  {
    id: 'imprimerie',
    level: 3,
    title: 'L’invention de l’imprimerie',
    text: 'Au Moyen Âge, les livres étaient rares et très chers, car chaque page était recopiée à la main par des moines. Il fallait parfois plusieurs mois pour terminer un seul ouvrage. Vers 1450, à Mayence, Johannes Gutenberg met au point une technique nouvelle : il fabrique des lettres en métal que l’on peut déplacer et réutiliser. On les assemble pour former une page, on les encre, puis on presse une feuille de papier dessus. Grâce à cette invention, les livres deviennent plus nombreux et le savoir se répand dans toute l’Europe.',
  },
  {
    id: 'goutte',
    level: 3,
    title: 'Le voyage de la goutte d’eau',
    text: 'Une goutte d’eau flotte à la surface de la mer. Chauffée par le soleil, elle s’évapore et monte dans le ciel sous forme de vapeur. Là-haut, il fait froid : la vapeur se condense et forme un nuage avec des milliards d’autres gouttelettes. Poussé par le vent, le nuage arrive au-dessus des collines. Devenue trop lourde, la goutte retombe en pluie, rejoint un ruisseau, puis une rivière comme la Meuse. Après un long trajet, elle retrouve enfin la mer, prête à recommencer son voyage.',
  },
  {
    id: 'saxophone',
    level: 3,
    title: 'L’homme qui inventa le saxophone',
    text: 'Adolphe Sax est né à Dinant en 1814. Son père fabriquait des instruments de musique et le jeune Adolphe passait des heures dans son atelier. Curieux et inventif, il cherchait un instrument qui aurait la puissance des cuivres et la douceur des bois. Après de nombreux essais, il créa le saxophone, qu’il fit breveter en 1846. Aujourd’hui, on l’entend dans le jazz, dans les fanfares et dans les orchestres du monde entier. À Dinant, une statue de l’inventeur assis sur un banc accueille les visiteurs.',
  },
  {
    id: 'atomium',
    level: 3,
    title: 'L’Atomium',
    text: 'Pour l’Exposition universelle de 1958, Bruxelles voulait un monument spectaculaire. L’ingénieur André Waterkeyn eut une idée étonnante : représenter un cristal de fer agrandi des milliards de fois. L’Atomium était né. Ses neuf grandes boules de métal, reliées par des tubes, symbolisent les atomes. À l’intérieur, des escaliers mécaniques et un ascenseur conduisent les visiteurs jusqu’à la sphère du sommet, d’où l’on découvre tout Bruxelles. Prévu pour ne rester que le temps de l’exposition, il est devenu l’un des symboles les plus connus de la Belgique.',
  },
  {
    id: 'chauves-souris',
    level: 3,
    title: 'Les chauves-souris',
    text: 'Les chauves-souris sont les seuls mammifères capables de voler vraiment. Leurs ailes sont faites d’une fine peau tendue entre les doigts très allongés de leurs mains. Elles chassent la nuit, mais elles ne sont pas aveugles : pour se repérer dans l’obscurité, elles poussent des cris très aigus que nous n’entendons pas. Ces sons rebondissent sur les obstacles et les insectes, puis reviennent à leurs oreilles. En une seule nuit, une petite pipistrelle peut avaler des centaines d’insectes. En Belgique, toutes les espèces sont protégées.',
  },
  {
    id: 'chocolat',
    level: 3,
    title: 'Du cacao au chocolat',
    text: 'Le chocolat vient d’un arbre qui pousse dans les régions chaudes et humides : le cacaoyer. Ses fruits, appelés cabosses, contiennent des fèves entourées d’une pulpe blanche. Après la récolte, les fèves fermentent quelques jours, sèchent au soleil, puis partent en bateau vers l’Europe. Dans les usines, on les torréfie et on les broie pour obtenir une pâte. On y ajoute du sucre, parfois du lait, et on la mélange longtemps. En 1912, le Bruxellois Jean Neuhaus inventa la praline, un chocolat fourré devenu célèbre dans le monde entier.',
  },
  {
    id: 'ascenseur-bateaux',
    level: 3,
    title: 'L’ascenseur à bateaux',
    text: 'Comment un bateau peut-il monter une colline ? Sur le canal du Centre, en Hainaut, les ingénieurs ont trouvé une solution impressionnante : l’ascenseur à bateaux de Strépy-Thieu. Le bateau entre dans un immense bac rempli d’eau, une sorte de baignoire géante. Les portes se ferment, puis le bac s’élève de plus de soixante-dix mètres, porté par des câbles et des contrepoids. Quelques minutes plus tard, le bateau ressort de l’autre côté et poursuit tranquillement sa route. Inauguré en 2002, c’est l’un des plus hauts ascenseurs à bateaux du monde.',
  },
];

export function readingLevel(grade: Grade): 1 | 2 | 3 | null {
  if (schoolLevel(grade) !== 'primaire') return null;
  const year = gradeYear(grade);
  return year <= 2 ? 1 : year <= 4 ? 2 : 3;
}

/** Texte suivant de son niveau : d'abord ceux qu'il n'a pas encore lus. */
export function nextReadingText(grade: Grade, alreadyRead: readonly string[]): ReadingText | null {
  const level = readingLevel(grade);
  if (!level) return null;
  const texts = READING_TEXTS.filter((t) => t.level === level);
  const count = (id: string) => alreadyRead.filter((r) => r === id).length;
  return [...texts].sort((a, b) => count(a.id) - count(b.id))[0] ?? null;
}

/** Mots du texte, ponctuation comprise, pour que le parent touche ceux qui ont posé problème. */
export function textWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Mots lus par minute (ponctuation seule exclue). */
export function wordsPerMinute(text: string, seconds: number): number {
  const words = textWords(text).filter((w) => /[\p{L}\d]/u.test(w)).length;
  return seconds > 0 ? Math.round((words * 60) / seconds) : 0;
}

/** Message positif sur ses propres progrès (jamais de reproche). */
export function readingProgressMessage(current: number, previous: number | null): string {
  if (previous === null) return 'Première lecture enregistrée : bravo !';
  if (current > previous)
    return `Tu lis ${current - previous} mot${current - previous > 1 ? 's' : ''} de plus par minute que la dernière fois. Bravo !`;
  return 'Chaque lecture à voix haute t’entraîne. Continue !';
}
