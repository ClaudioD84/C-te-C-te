import type { DocumentType } from './task';

/**
 * Photos d'un envoi, rangées par document : les pages d'un même document (une interrogation de deux feuilles,
 * une liste recto verso) sont lues ensemble par une seule analyse ; chaque document est relu à part.
 */

/** Pages d'un même document (le serveur le vérifie aussi). */
export const MAX_PAGES_PER_DOCUMENT = 5;
/** Documents envoyés en une fois. */
export const MAX_DOCUMENTS_PER_SEND = 6;

export interface DraftDocument<Page> {
  /** Clé stable pour l'affichage. */
  key: string;
  type: DocumentType;
  pages: Page[];
}

export interface DocumentsDraft<Page> {
  documents: DraftDocument<Page>[];
  /** Document en cours : les nouvelles photos s'y ajoutent. */
  active: number;
}

let lastKey = 0;
const emptyDocument = <Page>(type: DocumentType): DraftDocument<Page> => ({
  key: `document-${++lastKey}`,
  type,
  pages: [],
});

export function startDraft<Page>(type: DocumentType): DocumentsDraft<Page> {
  return { documents: [emptyDocument(type)], active: 0 };
}

const activeDocument = <Page>(draft: DocumentsDraft<Page>) => draft.documents[draft.active]!;

/**
 * Ajoute des photos au document en cours (« pages ») ou en fait des documents distincts, du même type que le
 * document en cours (« documents »). Les photos au-delà des limites sont écartées et comptées dans `dropped`.
 */
export function addPhotos<Page>(
  draft: DocumentsDraft<Page>,
  photos: Page[],
  as: 'pages' | 'documents',
): { draft: DocumentsDraft<Page>; dropped: number } {
  const current = activeDocument(draft);
  if (as === 'pages') {
    const kept = photos.slice(0, MAX_PAGES_PER_DOCUMENT - current.pages.length);
    const documents = draft.documents.map((d, i) =>
      i === draft.active ? { ...d, pages: [...d.pages, ...kept] } : d,
    );
    return { draft: { ...draft, documents }, dropped: photos.length - kept.length };
  }

  // Le document en cours, s'il est encore vide, reçoit la première photo.
  const base =
    current.pages.length === 0 ? draft.documents.filter((_, i) => i !== draft.active) : draft.documents;
  const kept = photos.slice(0, Math.max(0, MAX_DOCUMENTS_PER_SEND - base.length));
  if (kept.length === 0) return { draft, dropped: photos.length };
  const documents = [
    ...base,
    ...kept.map((photo) => ({ ...emptyDocument<Page>(current.type), pages: [photo] })),
  ];
  return { draft: { documents, active: documents.length - 1 }, dropped: photos.length - kept.length };
}

/** Type du document en cours. */
export function setDocumentType<Page>(draft: DocumentsDraft<Page>, type: DocumentType): DocumentsDraft<Page> {
  return { ...draft, documents: draft.documents.map((d, i) => (i === draft.active ? { ...d, type } : d)) };
}

/** Un autre document ne s'ouvre que si le document en cours a au moins une page. */
export function canAddDocument<Page>(draft: DocumentsDraft<Page>): boolean {
  return draft.documents.length < MAX_DOCUMENTS_PER_SEND && activeDocument(draft).pages.length > 0;
}

/** Ouvre un nouveau document, du même type que le précédent (modifiable). */
export function addDocument<Page>(draft: DocumentsDraft<Page>): DocumentsDraft<Page> {
  if (!canAddDocument(draft)) return draft;
  const documents = [...draft.documents, emptyDocument<Page>(activeDocument(draft).type)];
  return { documents, active: documents.length - 1 };
}

/** Reprend un document pour en changer le type ou y ajouter des pages ; un document resté vide disparaît. */
export function selectDocument<Page>(draft: DocumentsDraft<Page>, index: number): DocumentsDraft<Page> {
  const target = draft.documents[index];
  if (!target) return draft;
  const documents = draft.documents.filter((d) => d === target || d.pages.length > 0);
  return { documents, active: documents.indexOf(target) };
}

/** Retire une page ; un document sans page disparaît (il en reste toujours un, vide au besoin). */
export function removePage<Page>(
  draft: DocumentsDraft<Page>,
  documentIndex: number,
  pageIndex: number,
): DocumentsDraft<Page> {
  const target = draft.documents[documentIndex];
  if (!target) return draft;
  const pages = target.pages.filter((_, i) => i !== pageIndex);
  if (pages.length > 0 || draft.documents.length === 1) {
    const documents = draft.documents.map((d, i) => (i === documentIndex ? { ...d, pages } : d));
    return { ...draft, documents };
  }
  return removeDocument(draft, documentIndex);
}

/** Retire un document entier. */
export function removeDocument<Page>(draft: DocumentsDraft<Page>, index: number): DocumentsDraft<Page> {
  const target = draft.documents[index];
  if (!target) return draft;
  if (draft.documents.length === 1) return startDraft(target.type);
  const documents = draft.documents.filter((_, i) => i !== index);
  const active = draft.active > index ? draft.active - 1 : Math.min(draft.active, documents.length - 1);
  return { documents, active };
}

/** Documents prêts à partir : ceux qui ont au moins une page. */
export function documentsToSend<Page>(draft: DocumentsDraft<Page>): DraftDocument<Page>[] {
  return draft.documents.filter((d) => d.pages.length > 0);
}
