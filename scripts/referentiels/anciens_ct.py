"""
Compétences terminales publiées entre 1999 et 2004 : listes à puces sous des intitulés numérotés,
parfois en tableau à deux colonnes. Chaque intitulé retenu devient une compétence, chaque puce
(ou paragraphe, quand c'est demandé) un attendu.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import pymupdf

from fiches_uaa import Line, clean, join_item, page_lines

NUMBERED = re.compile(r'^(\d{1,2}(\.\d{1,2}){0,3}[.)]?|[a-h][.)])\s+(?=\S)')


@dataclass
class Section:
    label: str
    page: int
    items: list[str] = field(default_factory=list)


def read_outline(
    path: str,
    pages,
    *,
    headings: list[str],
    skip: list[str] = (),
    paragraphs: bool | str = False,
    numbered: str = 'item',
    column: tuple[float, float] | None = None,
    ignore: list[str] = (),
    prefixes: list[str] = (),
    multiline: bool = False,
    heading_stop: str | None = None,
    drop: list[str] = (),
    subheads: list[str] = (),
    keep_empty: bool = False,
    merge_gap: float = 14,
    cuts: tuple[float, float] = (1e9, 1e9),
) -> list[Section]:
    """`headings` : expressions des intitulés qui ouvrent une compétence ; `prefixes` : intitulés de niveau
    supérieur (ex. « Arts plastiques ») ajoutés devant ; `ignore` : intitulés qui ferment la section en cours ;
    `column` : ne garder que les lignes dont l'abscisse est dans l'intervalle (tableau à deux colonnes) ;
    `paragraphs` : garder aussi les paragraphes (True, ou expression sur l'intitulé de la compétence) ;
    `numbered` : « item » (une ligne numérotée est un attendu) ou « prefix » (elle préfixe les puces qui suivent)."""
    doc = pymupdf.open(path)
    heading_re = [re.compile(h) for h in headings]
    prefix_re = [re.compile(h) for h in prefixes]
    ignore_re = [re.compile(h) for h in ignore]
    skip_re = [re.compile(s) for s in skip]
    subhead_re = [re.compile(s) for s in subheads]
    sections: list[Section] = []
    current: Section | None = None
    prefix = ''
    groups: list[list[Line]] = []
    open_heading: Line | None = None
    local = {'prefix': '', 'pending': None, 'barrier': False}

    def flush():
        if current is not None:
            for group in groups:
                for item in join_item(group):
                    current.items.append(f"{group[0].prefix} : {item}" if getattr(group[0], 'prefix', '') else item)
        groups.clear()
        local['prefix'], local['pending'] = '', None

    def keep_paragraphs() -> bool:
        if isinstance(paragraphs, str):
            return bool(current and re.search(paragraphs, current.label))
        return paragraphs

    for pno in pages:
        for line in page_lines(doc, pno, skip_re, cuts, merge_gap=merge_gap):
            text = clean(line.text)
            if not text:
                continue
            if any(p.search(text) for p in prefix_re):
                flush()
                prefix, current, open_heading = text, None, None
                continue
            if any(p.search(text) for p in heading_re):
                flush()
                current = Section(f'{prefix} – {text}' if prefix else text, pno + 1)
                sections.append(current)
                open_heading = line
                continue
            if any(p.search(text) for p in ignore_re):
                flush()
                current, open_heading = None, None
                continue
            if current is None:
                continue
            if heading_stop and re.search(heading_stop, text):
                open_heading = None
                continue
            # Intitulé sur plusieurs lignes (en gras, ou toutes les lignes jusqu'à la première puce).
            if (
                open_heading
                and not line.bullet
                and not (NUMBERED.match(text) and not multiline)
                and 0 < line.y - open_heading.y < line.size * 1.7
                and (abs(line.x - open_heading.x) < 45 or not column)
                and ((line.bold and open_heading.bold) or (multiline and not NUMBERED.match(text)))
            ):
                current.label += ' ' + text
                open_heading = line
                continue
            open_heading = None
            if column and not (column[0] <= line.x < column[1]):
                continue
            if any(p.search(text) for p in subhead_re):
                # Sous-rubrique (« Spécifiquement pour le latin : ») : préfixe des puces qui suivent.
                local['prefix'] = text.rstrip(' :')
                local['barrier'] = True
                continue
            if NUMBERED.match(text) and not line.bullet:
                line.bullet, line.x_text = True, line.x  # les lignes suivantes reprennent à la marge
                line.text = NUMBERED.sub('', text)
                if numbered == 'prefix':
                    # Rubrique numérotée : un attendu à elle seule, ou le préfixe des puces qui suivent.
                    line.numbered = True
                    groups.append([line])
                    local['prefix'] = clean(line.text).rstrip(' .:')
                    local['pending'] = groups[-1]
                    continue
            last = groups[-1] if groups else None
            if local['barrier']:
                last, local['barrier'] = None, False
            if last and getattr(last[0], 'numbered', False) and line.bullet and line.x >= last[0].x - 2:
                if last is local['pending']:
                    groups.pop()  # la rubrique devient préfixe
                    local['pending'] = None
                line.prefix = local['prefix']
                groups.append([line])
                continue
            if last and not getattr(last[0], 'numbered', False) and continues_outline(last, line):
                last.append(line)
            elif last and getattr(last[0], 'numbered', False) and not line.bullet and continues_outline(last, line):
                last.append(line)
            elif line.bullet or keep_paragraphs():
                if line.bullet and local['prefix'] and not getattr(line, 'prefix', ''):
                    line.prefix = local['prefix']
                groups.append([line])
    flush()
    drop_re = [re.compile(d) for d in drop]
    for section in sections:
        section.label = re.sub(r'\s+', ' ', section.label).strip()
        section.items = [
            i for i in dict.fromkeys(section.items)
            if len(i) > 2 and not re.fullmatch(r'[.…\s]+', i) and not any(d.search(i) for d in drop_re)
        ]
    return [s for s in sections if s.items or keep_empty]


def continues_outline(group: list[Line], line: Line) -> bool:
    first, prev = group[0], group[-1]
    gap = line.y - prev.y if line.page == prev.page else 0
    anchor = next((l for l in reversed(group) if l.bullet), first)
    if line.bullet:
        if anchor.bullet and line.x > anchor.x + 8:
            line.sub = True
            return True
        return False
    if gap > prev.size * 1.9:
        return False
    if anchor.bullet:
        return line.x >= anchor.x_text - 4 or line.text[:1].islower()
    # Paragraphe : même marge, ou la ligne précédente ne termine pas la phrase.
    return not prev.text.rstrip().endswith(('.', ':', ';')) or line.text[:1].islower()
