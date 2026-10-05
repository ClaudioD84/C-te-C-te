import { describe, expect, it } from 'vitest';

import { buildCertificateHtml } from './certificate';

describe('diplôme', () => {
  it('reprend le badge et le pseudonyme, échappe le texte', () => {
    const html = buildCertificateHtml({
      alias: 'Lion <script>',
      avatar: '🦁',
      badge: 'serie_7',
      earnedOn: '2026-10-05',
    });
    expect(html).toContain('Diplôme « Belle série »');
    expect(html).toContain('Lion &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
