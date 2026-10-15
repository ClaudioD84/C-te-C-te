import { describe, expect, it } from 'vitest';

import {
  addDocument,
  addPhotos,
  canAddDocument,
  documentsToSend,
  MAX_DOCUMENTS_PER_SEND,
  MAX_PAGES_PER_DOCUMENT,
  removeDocument,
  removePage,
  selectDocument,
  setDocumentType,
  startDraft,
  type DocumentsDraft,
} from './scan-documents';

const summary = (draft: DocumentsDraft<string>) =>
  draft.documents.map((d, i) => `${i === draft.active ? '*' : ''}${d.type}:${d.pages.join('+')}`);

describe('photos rangées par document', () => {
  it('les photos s’ajoutent comme pages du document en cours, 5 au plus', () => {
    let draft = startDraft<string>('interrogation');
    draft = addPhotos(draft, ['p1'], 'pages').draft;
    const result = addPhotos(draft, ['p2', 'p3', 'p4', 'p5', 'p6', 'p7'], 'pages');
    expect(result.draft.documents[0]!.pages).toHaveLength(MAX_PAGES_PER_DOCUMENT);
    expect(result.dropped).toBe(2);
  });

  it('plusieurs photos choisies ensemble peuvent devenir des documents distincts, du même type', () => {
    const draft = addPhotos(startDraft<string>('journal_de_classe'), ['a', 'b', 'c'], 'documents').draft;
    expect(summary(draft)).toEqual(['journal_de_classe:a', 'journal_de_classe:b', '*journal_de_classe:c']);

    const more = addPhotos(draft, ['d', 'e', 'f', 'g', 'h'], 'documents');
    expect(more.draft.documents).toHaveLength(MAX_DOCUMENTS_PER_SEND);
    expect(more.dropped).toBe(2);
    expect(addPhotos(more.draft, ['i'], 'documents')).toEqual({ draft: more.draft, dropped: 1 });
  });

  it('un autre document s’ouvre seulement quand le document en cours a une page', () => {
    let draft = startDraft<string>('journal_de_classe');
    expect(canAddDocument(draft)).toBe(false);
    expect(addDocument(draft)).toBe(draft);
    draft = addPhotos(draft, ['j1'], 'pages').draft;
    draft = setDocumentType(addDocument(draft), 'dictee');
    draft = addPhotos(draft, ['d1', 'd2'], 'pages').draft;
    expect(summary(draft)).toEqual(['journal_de_classe:j1', '*dictee:d1+d2']);
  });

  it('reprendre un document : le document resté vide disparaît', () => {
    let draft = addPhotos(startDraft<string>('journal_de_classe'), ['j1'], 'pages').draft;
    draft = addDocument(draft);
    draft = selectDocument(draft, 0);
    expect(summary(draft)).toEqual(['*journal_de_classe:j1']);
    draft = setDocumentType(draft, 'notes_de_cours');
    expect(summary(draft)).toEqual(['*notes_de_cours:j1']);
  });

  it('retirer une page, puis la dernière page d’un document, puis tout', () => {
    let draft = addPhotos(startDraft<string>('journal_de_classe'), ['a', 'b'], 'documents').draft;
    draft = addPhotos(draft, ['b2'], 'pages').draft;
    draft = removePage(draft, 1, 0);
    expect(summary(draft)).toEqual(['journal_de_classe:a', '*journal_de_classe:b2']);
    draft = removePage(draft, 0, 0);
    expect(summary(draft)).toEqual(['*journal_de_classe:b2']);
    draft = removePage(draft, 0, 0);
    expect(summary(draft)).toEqual(['*journal_de_classe:']);
    expect(documentsToSend(draft)).toEqual([]);
  });

  it('retirer un document garde le document en cours', () => {
    let draft = addPhotos(startDraft<string>('dictee'), ['a', 'b', 'c'], 'documents').draft;
    draft = selectDocument(draft, 1);
    expect(summary(removeDocument(draft, 0))).toEqual(['*dictee:b', 'dictee:c']);
    expect(summary(removeDocument(draft, 1))).toEqual(['dictee:a', '*dictee:c']);
    expect(summary(removeDocument(removeDocument(removeDocument(draft, 0), 0), 0))).toEqual(['*dictee:']);
  });

  it('seuls les documents avec au moins une page partent', () => {
    let draft = addPhotos(startDraft<string>('vocabulaire'), ['v1', 'v2'], 'pages').draft;
    draft = addDocument(draft);
    expect(documentsToSend(draft).map((d) => d.pages)).toEqual([['v1', 'v2']]);
  });
});
