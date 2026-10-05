"""
Lecture des fiches « unités d'acquis d'apprentissage » (UAA) des compétences terminales FWB
(référentiels de 2014 et suivants) : en-tête, compétences à développer, processus
(appliquer, transférer, connaître) et ressources, disposés en colonnes.

Utilise PyMuPDF (pip install pymupdf) pour la position de chaque ligne.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

import pymupdf

# Puces : caractères des polices Symbol/Wingdings (zone privée) et puces Unicode courantes.
BULLETS = (
    '\uf0b7\uf0a7\uf0d8\uf0fc\uf076\uf0be\uf09f\uf02d\uf0e0\uf0a8\uf06e\uf071\uf0ae'
    '●•▪■□◦○➢➣✓❖♦►➤❑→–-o*'
)
BULLET_RE = re.compile(rf'^[{re.escape(BULLETS)}]\s*')


@dataclass
class Line:
    page: int
    x: float
    y: float
    size: float
    bold: bool
    text: str
    bullet: bool = False
    x_text: float = 0.0
    x1: float = 0.0
    sub: bool = False


@dataclass
class Fiche:
    page: int
    header: list[str]
    sections: dict[str, list[str]] = field(default_factory=dict)


def clean(text: str) -> str:
    text = re.sub(r'(?<=[éèêàâùûîôç])\u0301', '', unicodedata.normalize('NFC', text))
    text = text.replace('­', '').replace('​', '').replace('\u0007', '')
    text = re.sub(r'[-]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def page_lines(
    doc: pymupdf.Document, pno: int, skip: list[re.Pattern], cuts: tuple[float, float] = (1e9, 1e9), merge_gap: float = 14
) -> list[Line]:
    """Lignes d'une page, les puces isolées rattachées à la ligne qui suit."""
    page = doc[pno]
    raw: list[Line] = []
    footnote_y = page.rect.height
    for block in page.get_text('dict')['blocks']:
        for l in block.get('lines', []):
            spans = [s for s in l['spans'] if s['text'].strip()]
            if not spans:
                continue
            s0 = max(spans, key=lambda s: len(s['text'].strip()))
            if s0['size'] < 7.5:
                continue  # notes de bas de page
            small_mark = spans[0]['text'].strip().isdigit() and spans[0]['size'] < s0['size'] * 0.85 and len(spans) > 1
            low_numbered = l['bbox'][1] > page.rect.height * 0.72 and re.match(r'^\d{1,2}\s+[A-ZÉÀ]', ''.join(s['text'] for s in l['spans']).strip())
            if small_mark or low_numbered:
                footnote_y = min(footnote_y, l['bbox'][1] - 1)
            text = ''.join(
                s['text'] for s in l['spans'] if not (s['size'] < s0['size'] * 0.8 and s['text'].strip().isdigit())
            )
            bold = all((s['flags'] & 16) or 'Bold' in s['font'] for s in spans)
            raw.append(Line(pno, l['bbox'][0], l['bbox'][1], s0['size'], bold, text.strip(), x1=l['bbox'][2]))
    # Pied de page, numéros, filigranes.
    height = page.rect.height
    raw = [l for l in raw if l.y < min(height - 55, footnote_y) and not any(p.search(l.text) for p in skip)]
    # Lignes d'une même rangée (décalage vertical de quelques points), de gauche à droite.
    raw.sort(key=lambda l: l.y)
    rows: list[list[Line]] = []
    for line in raw:
        if rows and line.y - rows[-1][0].y < 3.5:
            rows[-1].append(line)
        else:
            rows.append([line])
    raw = [line for row in rows for line in sorted(row, key=lambda l: l.x)]

    out: list[Line] = []
    glyphs: list[Line] = []
    for line in raw:
        stripped = line.text.strip()
        if BULLET_RE.sub('', stripped) == '' and len(stripped) <= 2:
            glyphs.append(line)
            continue
        glyph = next((g for g in glyphs if abs(line.y - g.y) < 6 and 0 < line.x - g.x < 30), None)
        if glyph:
            glyphs.remove(glyph)
            line.bullet, line.x_text, line.x = True, line.x, glyph.x
        elif BULLET_RE.match(stripped) and len(stripped) > 2 and (stripped[0] not in 'o*-–' or stripped[1] == ' '):
            line.bullet, line.x_text = True, line.x + 8
            line.text = BULLET_RE.sub('', stripped)
        else:
            line.x_text = line.x
        out.append(line)
    return merge_fragments(out, cuts, merge_gap)


def merge_fragments(lines: list[Line], cuts: tuple[float, float], merge_gap: float = 14) -> list[Line]:
    """Recolle les mots d'une ligne justifiée découpés en plusieurs morceaux."""
    out: list[Line] = []
    for line in lines:
        prev = out[-1] if out else None
        if (
            prev
            and abs(prev.y - line.y) < 3.5
            and not line.bullet
            and -2 < line.x - prev.x1 < merge_gap
            and column(prev, cuts) == column(line, cuts)
            and prev.bold == line.bold
        ):
            prev.text = f'{prev.text} {line.text}'
            prev.x1 = line.x1
            continue
        out.append(line)
    return out


def column(line: Line, cuts: tuple[float, float]) -> int:
    return 0 if line.x < cuts[0] else 1 if line.x < cuts[1] else 2


# Intitulés de zones, en gras.
SECTIONS: list[tuple[str, re.Pattern]] = [
    ('competences', re.compile(r'(?i)^comp[ée]tences?( à développer| :|$)')),
    ('processus', re.compile(r'(?i)^processus')),
    ('appliquer', re.compile(r'(?i)^appliquer')),
    ('transferer', re.compile(r'(?i)^transf[ée]rer')),
    ('connaitre', re.compile(r'(?i)^conna[iî]tre')),
    ('strategies', re.compile(r'(?i)^strat[ée]gies transversales')),
    ('ressources', re.compile(r'(?i)^ressources|^savoirs?( |$)|^savoir-faire|^contenus|^concepts|^notions')),
    ('ignorer', re.compile(r'(?i)^pr[ée]-?requis|^uaa pr[ée]requise|^attitudes|^production')),
]


def section_of(line: Line) -> str | None:
    if not line.bold:
        # Certaines fiches n'impriment pas ces intitulés en gras.
        text = clean(line.text)
        if re.match(r'^COMPÉTENCES? À DÉVELOPPER', text):
            return 'competences'
        if len(text) < 60:
            for name, pattern in SECTIONS:
                if name in ('processus', 'appliquer', 'transferer', 'connaitre', 'strategies') and pattern.search(text):
                    if re.fullmatch(r'(?i)(processus|appliquer|transf[ée]rer|conna[iî]tre|strat[ée]gies transversales)(\s*[-–(:].*)?', text):
                        return name
            if re.match(r'(?i)^ressources( :|$)', text):
                return 'ressources'
        return None
    for name, pattern in SECTIONS:
        if pattern.search(line.text):
            return name
    return None


def adapt_cuts(
    lines: list[Line], configured: tuple[float, float], previous: tuple[float, float]
) -> tuple[float, float]:
    """Limites des colonnes de la page : certaines fiches d'un même document décalent les colonnes.
    On part des valeurs configurées et on les rapproche des intitulés « Transférer » et des rubriques
    de ressources (« Pré-requis », « Savoirs… ») alignés à gauche de leur colonne."""
    transfer = [l.x for l in lines if section_of(l) == 'transferer' and l.x > 150]
    resources = [
        l.x for l in lines
        if l.bold and l.x > 300 and re.match(r'(?i)^(pr[ée]-?requis|uaa pr[ée]requise|savoirs?\b|savoir-faire)', clean(l.text))
    ]
    if not transfer and not resources:
        return previous
    cut1 = min([configured[0]] + [x - 12 for x in transfer])
    cut2 = min([configured[1]] + [x - 8 for x in resources])
    return cut1, cut2


def read_fiches(
    path: str,
    *,
    starts: re.Pattern,
    cuts: tuple[float, float],
    pages=None,
    skip: list[str] = (),
    max_header: int = 6,
    ends: re.Pattern | None = None,
) -> list[Fiche]:
    """Découpe le document en fiches. Une fiche commence à une ligne qui vérifie `starts` ;
    son en-tête court jusqu'au premier intitulé de zone."""
    doc = pymupdf.open(path)
    skip_re = [re.compile(s) for s in skip]
    fiches: list[Fiche] = []
    state = ['', '', '']  # zone courante de chaque colonne
    items: dict[int, list] = {0: [], 1: [], 2: []}
    current: Fiche | None = None
    in_header = False

    def flush():
        if current is None:
            return
        for col_items in items.values():
            for name, group in col_items:
                for text in join_item(group):
                    current.sections.setdefault(name, []).append(text)

    page_cuts = cuts
    for pno in pages or range(len(doc)):
        lines = page_lines(doc, pno, skip_re, cuts)
        page_cuts = adapt_cuts(lines, cuts, page_cuts)
        for line in lines:
            name = section_of(line)
            if starts.search(clean(line.text)) and not name and not (in_header and current and current.page == pno + 1 and len(current.header) < 3):
                flush()
                current = Fiche(pno + 1, [clean(line.text)])
                fiches.append(current)
                state = ['', '', '']
                items = {0: [], 1: [], 2: []}
                in_header = True
                continue
            if current is None:
                continue
            if ends and ends.search(clean(line.text)):
                state = ['', '', '']  # fin de la fiche : texte de présentation qui suit
                continue
            if in_header:
                if not name and len(current.header) < max_header:
                    current.header.append(clean(line.text))
                    continue
                in_header = False
            col = column(line, page_cuts)
            if name:
                if name in ('competences', 'connaitre', 'strategies'):
                    keep_resources = name != 'strategies' and state[2] in ('ressources', 'ignorer')
                    state = [name, name, state[2] if keep_resources else name]
                    rest = re.sub(
                        r'(?i)^(comp[ée]tences?( à développer)?|conna[iî]tre)\s*(\(\d\))?\s*[-–:]?\s*', '', clean(line.text)
                    )
                    if name == 'competences' and rest:
                        items[0].append(('competences', [Line(pno, line.x, line.y, line.size, False, rest)]))
                elif name == 'processus':
                    state[0] = state[1] = ''
                elif name == 'ignorer' and col == 0:
                    state = ['ignorer', 'ignorer', state[2]]
                elif name in ('ressources', 'ignorer'):
                    state[2] = name
                else:
                    state[col] = name
                continue
            zone = state[col]
            if not zone or zone in ('ignorer', 'strategies', 'processus'):
                continue
            col_items = items[col]
            last = col_items[-1] if col_items else None
            if last and last[0] == zone and continues(last[1], line):
                last[1].append(line)
            else:
                col_items.append((zone, [line]))
    flush()
    return fiches


def starts_new(text: str) -> bool:
    """Un intitulé commence par une majuscule ; un retour à la ligne, en général non."""
    first = text.lstrip('«"“(’\' ')[:1]
    return first.isupper()


def continues(group: list[Line], line: Line) -> bool:
    """La ligne prolonge-t-elle l'élément en cours (retour à la ligne ou sous-élément) ?"""
    first, prev = group[0], group[-1]
    if line.page != prev.page:
        return not line.bullet and line.text[:1].islower()
    gap = line.y - prev.y
    anchor = next((l for l in reversed(group) if l.bullet), first)
    if line.bullet:
        # Sous-puce : plus en retrait que l'élément.
        if line.x > first.x + 8:
            line.sub = True
            return True
        return False
    if anchor.bullet:
        if gap > prev.size * 2.2:
            return False
        if line.x >= anchor.x_text - 3:
            return True
        if anchor is not first and line.x >= first.x_text - 3 and not starts_new(line.text):
            return True
        return False
    if gap > prev.size * (2.2 if line.text[:1].islower() else 1.6):
        return False
    if line.x > first.x + 8:
        # Sous-élément sans puce, ou retour à la ligne d'un sous-élément.
        line.sub = not prev.sub or starts_new(line.text) or abs(line.x - prev.x) > 3
        return True
    return abs(line.x - first.x) < 4 and (not starts_new(line.text) or prev.text.rstrip().endswith((',', '-')))


def join_lines(group: list[Line]) -> str:
    text = ''
    subs = 0
    for line in group:
        part = clean(line.text)
        if not part:
            continue
        if not text:
            text = part
        elif line.sub:
            text = text.rstrip(' ;:')
            sep = ', ' if text.endswith(',') else ' ; ' if subs else ' : '
            text = text.rstrip(',') + sep + part
            subs += 1
        elif text.endswith('-') and not text.endswith(' -'):
            text = text[:-1] + part
        else:
            text = f'{text} {part}'
    text = re.sub(r'\s+([,.)])', r'\1', text)
    text = re.sub(r'([(])\s+', r'\1', text)
    return text.strip(' ;')


def join_item(group: list[Line]) -> list[str]:
    """Un élément ; une introduction suivie de sous-puces donne un élément par sous-puce."""
    if not any(l.sub and l.bullet for l in group):
        text = join_lines(group)
        return [text] if text else []
    intro: list[Line] = []
    subs: list[list[Line]] = []
    for line in group:
        if line.sub and line.bullet:
            subs.append([line])
        elif subs:
            subs[-1].append(line)
        else:
            intro.append(line)
    head = join_lines(intro).rstrip(' :;')
    out = []
    for sub in subs:
        for l in sub:
            l.sub = False
        body = join_lines(sub).rstrip(' ;,')
        if not head:
            out.append(body)
        elif head.endswith((',', '’', "'")):
            out.append(f'{head} {body}')
        else:
            out.append(f'{head} : {body}')
    return out
