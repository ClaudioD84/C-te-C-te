// Services externes factices pour les tests de bout en bout (aucun appel réel n'est fait) :
// - API Claude (ANTHROPIC_BASE_URL) : la réponse dépend du schéma de sortie demandé ;
// - API d'envoi d'e-mails Brevo (BREVO_API_URL) : les e-mails sont gardés en mémoire, lisibles sur /__emails ;
// - service de notifications d'Expo (EXPO_PUSH_URL) : messages lisibles sur /__push.
import http from 'node:http';

export const MOCKS_PORT = 5300;
const emails = [];
const pushes = [];
// Lectures de photos reçues : nombre de pages (images) et consigne, lisibles sur /__scans.
const scanReads = [];

const answers = {
  explanation: {
    explanation:
      "Imagine une rivière comme un long toboggan d'eau : elle descend toujours vers la mer. La Meuse est une de ces grandes rivières.",
    example:
      'Quand tu verses de l’eau en haut d’une pente, elle coule vers le bas : un fleuve fait pareil, jusqu’à la mer.',
  },
  documentType: {
    documentType: 'journal_de_classe',
    spellingWords: ['le château', 'une forêt', 'ils marchaient'],
    tasks: [
      {
        subject: 'Mathématiques',
        kind: 'devoir',
        description: 'Faire les exercices sur les fractions',
        dueDate: null,
        reference: 'p. 12',
        confidence: 0.95,
      },
      {
        subject: 'Éveil',
        kind: 'interro',
        description: 'Les fleuves de Belgique',
        dueDate: null,
        reference: null,
        confidence: 0.4,
      },
    ],
  },
  // Juge du banc d'essai de l'IA (supabase/functions/_banc-ia).
  exactitude: {
    exactitude: 5,
    niveau: 4,
    couverture: 5,
    adaptations: null,
    clarte: 4,
    erreurs: [],
    commentaire: 'Fiche claire et juste.',
  },
  topicUnclear: {
    topicUnclear: false,
    // Premier attendu fourni (ou aucun s'il n'y en a pas : ignoré par le serveur).
    curriculumMatch: 1,
    fiche: {
      title: 'Les fleuves de Belgique',
      sections: [
        { heading: 'La Meuse', points: ['Elle traverse Namur et Liège.'] },
        { heading: "L'Escaut", points: ['Il traverse Tournai, Gand et Anvers.'] },
      ],
      keyTerms: [
        { term: 'Fleuve', definition: "Cours d'eau qui se jette dans la mer." },
        { term: 'Affluent', definition: "Cours d'eau qui se jette dans un autre." },
      ],
      tips: [
        'Repère chaque fleuve et ses villes sur une carte.',
        'Retiens : la Meuse à Liège, l’Escaut à Anvers.',
      ],
    },
    quiz: [
      {
        question: 'Quel fleuve traverse Liège ?',
        choices: ['La Meuse', "L'Escaut", 'La Sambre'],
        answerIndex: 0,
        explanation: 'Liège est construite sur la Meuse.',
      },
      {
        question: 'Quel fleuve passe à Anvers ?',
        choices: ['La Meuse', "L'Escaut"],
        answerIndex: 1,
        explanation: "Anvers est un grand port sur l'Escaut.",
      },
    ],
    exercises: [
      {
        instruction: 'Complète.',
        prompt: 'Namur est au confluent de la Meuse et de la …',
        accepted: ['Sambre'],
        answer: 'Sambre',
        hint: 'Une rivière qui passe à Charleroi.',
      },
    ],
    flashcards: [
      { front: 'Fleuve qui traverse Liège', back: 'La Meuse' },
      { front: 'Fleuve qui passe à Anvers', back: "L'Escaut" },
      { front: 'Où se jette la Meuse ?', back: 'Dans la mer du Nord' },
    ],
  },
  themes: {
    themes: [
      {
        subject: 'Mathématiques',
        title: 'Les fractions',
        description: 'Revois comment comparer deux fractions.',
      },
      { subject: 'Éveil', title: 'Les fleuves', description: 'Revois les fleuves de Belgique.' },
    ],
  },
};

const usage = {
  input_tokens: 2000,
  output_tokens: 1500,
  cache_read_input_tokens: 500,
  cache_creation_input_tokens: 0,
};

const dictationAnswer = {
  documentType: 'dictee',
  spellingWords: ['la promenade', 'ils marchaient'],
  vocabulary: [],
  vocabularySubject: null,
  tasks: [],
};

const vocabularyAnswer = {
  documentType: 'vocabulaire',
  spellingWords: [],
  vocabulary: [
    { term: 'de hond', meaning: 'le chien' },
    { term: 'de kat', meaning: 'le chat' },
    { term: 'het huis', meaning: 'la maison' },
    { term: 'de fiets', meaning: null },
  ],
  vocabularySubject: 'Néerlandais',
  tasks: [],
};

// Interrogation corrigée : une notion à retravailler avec les erreurs de la copie (jamais la note).
const interrogationAnswer = {
  documentType: 'interrogation',
  spellingWords: [],
  vocabulary: [],
  vocabularySubject: null,
  tasks: [
    {
      subject: 'Français',
      kind: 'lecon',
      description: "Retravailler : l'accord du participe passé",
      dueDate: null,
      reference: null,
      confidence: 0.9,
      remediation: true,
      errors: [
        { question: 'Accorde : les fleurs (cueilli) hier', childAnswer: 'cueilli', correction: 'cueillies' },
        { question: 'Accorde : elles sont (parti) tôt', childAnswer: 'partit', correction: 'parties' },
      ],
    },
  ],
};

// Fiche de remédiation : demandée seulement quand la requête contient les erreurs de la copie.
const remediationPack = {
  topicUnclear: false,
  curriculumMatch: null,
  fiche: {
    title: 'L’accord du participe passé',
    sections: [
      { heading: 'La règle', points: ['Avec être, le participe passé s’accorde avec le sujet.'] },
      {
        heading: 'Tes erreurs à l’interro',
        points: ['Tu as écrit « partit » : avec être, on accorde avec « elles », donc « parties ».'],
      },
    ],
    keyTerms: [],
    tips: ['Repère d’abord l’auxiliaire.', 'Cherche le sujet avant d’accorder.'],
  },
  quiz: [
    {
      question: 'Avec quel auxiliaire le participe passé s’accorde-t-il avec le sujet ?',
      choices: ['être', 'avoir'],
      answerIndex: 0,
      explanation: 'Avec être, le participe passé s’accorde avec le sujet.',
    },
  ],
  exercises: [
    {
      instruction: 'Accorde le participe passé.',
      prompt: 'Les filles sont (arrivé).',
      accepted: ['arrivées'],
      steps: ['Repère l’auxiliaire.', 'Trouve le sujet.', 'Accorde avec le sujet.'],
      answer: 'arrivées : avec être, on accorde avec « les filles ».',
      hint: 'Le sujet est féminin pluriel.',
    },
    {
      instruction: 'Accorde le participe passé.',
      prompt: 'Ils sont (tombé).',
      accepted: ['tombés'],
      steps: [],
      answer: 'tombés : avec être, on accorde avec « ils ».',
      hint: null,
    },
  ],
  flashcards: [{ front: 'Participe passé avec être', back: 'accord avec le sujet' }],
};

export function startMocks(port = MOCKS_PORT) {
  return http
    .createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (req.url === '/__emails') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(emails));
          return;
        }
        // Service de notifications d'Expo : messages gardés en mémoire, lisibles sur /__push. Un jeton qui
        // contient « perime » répond comme une application désinstallée.
        if (req.url === '/__scans') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(scanReads));
          return;
        }
        if (req.url === '/__push') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(pushes));
          return;
        }
        if (req.url === '/expo-push') {
          const messages = JSON.parse(body);
          pushes.push(...messages);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              data: messages.map((m) =>
                m.to.includes('perime')
                  ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
                  : { status: 'ok', id: 'ticket-e2e' },
              ),
            }),
          );
          return;
        }
        if (req.url === '/brevo') {
          emails.push(JSON.parse(body));
          res.writeHead(201, { 'content-type': 'application/json' });
          res.end('{"messageId":"e2e"}');
          return;
        }
        const request = JSON.parse(body || '{}');
        const keys = Object.keys(request.output_config?.format?.schema?.properties ?? {});
        const key = keys.find((k) => answers[k]);
        if (!key) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              type: 'error',
              error: { type: 'invalid_request_error', message: 'Schéma inconnu' },
            }),
          );
          return;
        }
        if (key === 'documentType') {
          const content = request.messages?.[0]?.content ?? [];
          scanReads.push({
            pages: content.filter((block) => block.type === 'image').length,
            context: content.at(-1)?.text ?? '',
          });
        }
        // Photo d'une dictée corrigée ou d'une liste de vocabulaire (type choisi par le parent).
        let answer = answers[key];
        if (key === 'documentType' && body.includes("il s'agit de : dictée corrigée"))
          answer = dictationAnswer;
        if (key === 'documentType' && body.includes("il s'agit de : liste de vocabulaire"))
          answer = vocabularyAnswer;
        if (key === 'documentType' && body.includes("il s'agit de : interrogation"))
          answer = interrogationAnswer;
        if (key === 'topicUnclear' && body.includes('REMÉDIATION')) answer = remediationPack;
        const text = JSON.stringify(answer);
        const message = { id: 'msg_e2e', type: 'message', role: 'assistant', model: request.model };

        if (!request.stream) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              ...message,
              content: [{ type: 'text', text }],
              stop_reason: 'end_turn',
              stop_sequence: null,
              usage,
            }),
          );
          return;
        }
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const send = (event, data) =>
          res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`);
        send('message_start', {
          message: {
            ...message,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { ...usage, output_tokens: 1 },
          },
        });
        send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        for (let i = 0; i < text.length; i += 200) {
          send('content_block_delta', {
            index: 0,
            delta: { type: 'text_delta', text: text.slice(i, i + 200) },
          });
        }
        send('content_block_stop', { index: 0 });
        send('message_delta', {
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: usage.output_tokens },
        });
        send('message_stop', {});
        res.end();
      });
    })
    .listen(port, '127.0.0.1');
}
