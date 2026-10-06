// Services externes factices pour les tests de bout en bout (aucun appel réel n'est fait) :
// - API Claude (ANTHROPIC_BASE_URL) : la réponse dépend du schéma de sortie demandé ;
// - API d'envoi d'e-mails Brevo (BREVO_API_URL) : les e-mails sont gardés en mémoire, lisibles sur /__emails.
import http from 'node:http';

export const MOCKS_PORT = 5300;
const emails = [];

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
        const text = JSON.stringify(answers[key]);
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
