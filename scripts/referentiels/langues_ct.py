"""
Compétences terminales en langues modernes (2017) : une fiche par niveau du CECRL (A1+, A2, B1, B2)
et par compétence (écouter, lire, parler, écrire). On retient l'énoncé de la compétence,
les fonctions langagières et le répertoire grammatical, qui décrivent ce que l'élève doit savoir faire.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import pymupdf

from fiches_uaa import clean, page_lines

UAA_RE = re.compile(r'^(A1\s*\+|A2|B1-?|B2-?)\s+UAA\s*[-–]\s*(.+)')
LEVEL_RE = re.compile(r'^(A1\s*\+|A2|B1|B2)$')
TITLE_RE = re.compile(r'^UAA\s*[-–]\s*(.+)')
ZONES = [
    ('enonce', re.compile(r'^Compétence à développer')),
    ('stop', re.compile(r'^(Caractéristiques générales|Attendus|Formes de (supports|productions)|Processus|EXEMPLES)')),
    ('fonctions', re.compile(r'^Fonctions langagières')),
    ('stop', re.compile(r'^(Glossaire|GLOSSAIRE|Bibliographie|Annexe|ANNEXE|Champs thématiques)')),
    ('stop', re.compile(r'^(GRAMMATICALES|PHONOLOGIQUES|ORTHOGRAPHIQUES|STRAT[ÉE]GIQUES|GRAPHIQUES|Stratégies)')),
    ('grammaire', re.compile(r'^Répertoire grammatical utile')),
]


@dataclass
class FicheLangue:
    level: str
    skill: str
    enonce: list[str] = field(default_factory=list)
    fonctions: list[str] = field(default_factory=list)
    grammaire: list[str] = field(default_factory=list)


def read_langues(path: str, pages) -> list[FicheLangue]:
    doc = pymupdf.open(path)
    fiches: list[FicheLangue] = []
    current: FicheLangue | None = None
    zone = ''
    title_open = False
    pending_level = None
    for pno in pages:
        width = doc[pno].rect.width
        for line in page_lines(doc, pno, [re.compile(r'^LANGUES MODERNES$'), re.compile(r'^\d+$')]):
            text = clean(line.text)
            m = UAA_RE.match(text)
            if LEVEL_RE.match(text) and line.bold:
                pending_level = text.replace(' ', '')
                continue
            t = TITLE_RE.match(text)
            if pending_level and t:
                m = re.match(r'(.*)', f'{pending_level} UAA - {t.group(1)}')
                m = UAA_RE.match(m.group(1))
            pending_level = None
            if m:
                current = FicheLangue(m.group(1).replace(' ', ''), m.group(2).strip())
                fiches.append(current)
                zone, title_open = '', True
                continue
            if current is None:
                continue
            if title_open and line.bold and not any(p.match(text) for _, p in ZONES):
                current.skill += ' ' + text  # titre sur deux lignes
                continue
            title_open = False
            started = next((name for name, p in ZONES if p.match(text)), None)
            if started == 'stop' and zone == 'enonce' and line.x > width / 2:
                started = None  # tableau des caractéristiques, à droite de l'énoncé
            if started:
                zone = started
                continue
            if zone == 'enonce':
                if text.startswith('Conformément'):
                    continue
                side = '+' if line.x > width / 2 else '-'
                if line.bold and re.fullmatch(r'[AB][12]\s*[-+]', text):
                    current.enonce.append(f'@{text.replace(" ", "")}')
                    continue
                current.enonce.append(f'{side}|{"•" if line.bullet else ""}{text}')
            elif zone == 'fonctions':
                if line.bold or text[:1].islower() or text.startswith(('(', 'Un nombre', 'Pour ', 'pour ')):
                    continue  # rubriques (« établir des contacts sociaux », « Pour (s’)informer »…)
                current.fonctions.append(re.sub(r'^\+\s*', '', text))
            elif zone == 'grammaire':
                if text.lower().startswith('pour '):
                    current.grammaire.append(text)
                elif current.grammaire and text[:1].islower() and not line.bullet:
                    current.grammaire[-1] += ' ' + text
    return fiches


def statements(fiche: FicheLangue) -> list[str]:
    """Reconstitue l'énoncé (ou les deux énoncés « - » et « + » d'un niveau B1)."""
    columns: dict[str, list[str]] = {'-': [], '+': []}
    labels = [x[1:] for x in fiche.enonce if x.startswith('@')]
    for item in fiche.enonce:
        if item.startswith('@'):
            continue
        side, text = item.split('|', 1)
        allowed = {l[-1] for l in labels} or {'-'}
        if side in allowed:
            columns[side].append(text)
    out = []
    for side, lines in columns.items():
        if not lines:
            continue
        parts: list[str] = []
        for text in lines:
            if text.startswith('•'):
                parts.append(text[1:])
            elif parts and (text[:1].islower() or parts[-1].endswith(('-', ','))):
                parts[-1] += ' ' + text
            else:
                parts.append(text)
        head, *rest = parts
        statement = head + (' : ' + ' ; '.join(rest) if rest else '')
        label = next((l for l in labels if l.endswith(side)), None) if labels else None
        out.append(f'{label} : {statement}' if label else statement)
    return [re.sub(r'\s+', ' ', s).replace('ci- dessous', 'ci-dessous') for s in out]
