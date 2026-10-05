#!/usr/bin/env python3
"""
Découpe un référentiel du tronc commun (PDF officiel FWB) en fichier JSON pour l'application,
SANS IA : les intitulés sont recopiés mot pour mot depuis les tableaux « Savoirs / Savoir-faire /
Compétences → Attendus » de chaque année.

Hiérarchie produite :
  domaine    : « CHAMP n » ou « DOMAINE n » du référentiel ;
  competence : section numérotée (ex. « 1.1. (Se) repérer… »), avec les années où elle apparait ;
  attendu    : chaque attendu de la colonne de droite, pour une année précise.

Usage :
  python3 scripts/referentiels/decouper.py <pdf> --matiere "Mathématiques" --prefixe MA \
      --titre "Référentiel de Mathématiques" --version 2022 --url <url> > donnees/ma-2022.json

Nécessite pdftotext (poppler-utils). Le résultat doit être relu avant import.
"""
import argparse
import json
import re
import subprocess
import sys
from collections import Counter

YEAR_RE = re.compile(r"^\s*(P[1-6]|S[1-3])\s+(\d)\s*(?:e|re)\s+(PRIMAIRE|SECONDAIRE)\s*$")
DOMAIN_RE = re.compile(r"^\s*(?:CHAMP|DOMAINE)\s+(\d+)\s*:\s*(.+?)\s*$")
SECTION_RE = re.compile(r"^\s{0,24}(\d+\.\d+)\.\s+(\S.+?)\s*$")
TABLE_HEADER_RE = re.compile(r"^\s*(Savoirs?|Savoir-faire|Compétences?|Processus|Ressources?)\b.*\bAttendus?\s*$")
CHROME = (
    "Enjeux et", "objectifs", "généraux", "S o m m a i re", "Visées", "Tableaux", "Croisements",
    "synoptiques", "transversales", "RÉFÉRENTIEL DE", "Des objets de l", "à la géométrie",
)


def pdf_text(path: str) -> list[str]:
    out = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True, check=True).stdout
    return out.replace("\f", "\n").split("\n")


def strip_margin(line: str) -> str:
    # Marqueurs de navigation et numéros de page dans la marge droite.
    line = re.sub(r"\s{3,}[<>]\s*$", "", line)
    line = re.sub(r"\s{3,}\d{1,3}\s*$", "", line)
    return line.rstrip()


def is_chrome(line: str) -> bool:
    s = line.strip()
    if not s or s in ("<", ">") or re.fullmatch(r"\d{1,3}", s):
        return not s == ""
    return any(s.startswith(c) for c in CHROME) or re.fullmatch(r"(P\d|S\d)(\s+(P\d|S\d))+.*", s) is not None


def split_columns(line: str, split_min: int) -> tuple[str, str]:
    """Sépare colonne de gauche et colonne de droite (attendus) d'une ligne de tableau."""
    indent = len(line) - len(line.lstrip())
    if indent >= split_min:
        return "", line.strip()
    m = re.search(r"\S(\s{3,})(\S)", line)
    if m and m.start(2) >= split_min:
        return line[: m.start(1) + 1].strip(), line[m.start(2):].strip()
    return line.strip(), ""


def join_lines(lines: list[str], vocabulary: Counter) -> str:
    text = ""
    for part in lines:
        part = part.strip()
        if not text:
            text = part
        elif text.endswith("-") and part[:1].islower() and not part.startswith("- "):
            word_start = re.search(r"(\w+)-$", text)
            next_word = re.match(r"(\w+)", part)
            joined = (word_start.group(1) if word_start else "") + (next_word.group(1) if next_word else "")
            # Césure typographique si le mot recollé existe ailleurs dans le document.
            text = text[:-1] + part if vocabulary[joined.lower()] > 0 else text + part
        else:
            text = text + " " + part
    # Glyphes de puce du PDF : « - c \x07 onduites » → « - conduites » ; caractères invisibles retirés.
    text = re.sub(r"\b(\w)\s*\x07\s*", r"\1", text).replace("\x07", "").replace("\xad", "").replace("\ufffd", "•")
    text = re.sub(r"\s+", " ", text).strip()
    # Lettres espacées par la mise en page du PDF : « - d es connecteurs » → « - des connecteurs ».
    return re.sub(r"(?<=- )d (es|e|u)\b", r"d\1", text)


def parse(lines: list[str]) -> list[dict]:
    vocabulary = Counter(w.lower() for line in lines for w in re.findall(r"\w+", line))
    entries: list[dict] = []
    year = None
    domain = None
    section = None
    in_table = False
    split_min = 60
    paragraph: list[str] = []

    def flush():
        nonlocal paragraph
        if paragraph and year and section:
            text = join_lines(paragraph, vocabulary)
            last = entries[-1] if entries else None
            if re.match(r"^Ex\.?\s*:", text) and last and last["year"] == year and last["section"] == section:
                # Un exemple illustre l'attendu précédent.
                last["text"] += " " + text
            else:
                entries.append({"year": year, "domain": domain, "section": section, "text": text})
        paragraph = []

    for raw in lines:
        line = strip_margin(raw)
        y = YEAR_RE.match(line)
        if not y and is_chrome(line):
            continue
        if y:
            flush()
            year, in_table = y.group(1), False
            continue
        if year is None:
            continue
        d = DOMAIN_RE.match(line)
        if d:
            flush()
            domain, in_table = (d.group(1), d.group(2).strip()), False
            continue
        s = SECTION_RE.match(line)
        if s and not line.strip().startswith("-"):
            flush()
            section, in_table = (s.group(1), s.group(2).strip()), False
            continue
        if TABLE_HEADER_RE.match(line):
            flush()
            in_table = True
            # La colonne des attendus commence au-delà du 40e caractère de la ligne mise en page.
            split_min = 40
            continue
        if not in_table:
            continue
        if not line.strip():
            flush()
            continue
        left, right = split_columns(line, split_min)
        if left and not right and len(left) > 90:
            # Paragraphe explicatif pleine largeur : fin du tableau.
            flush()
            in_table = False
            continue
        if right:
            # Deux attendus parfois collés sans ligne vide : une phrase terminée suivie d'une
            # nouvelle phrase en majuscule, au même retrait, commence un nouvel attendu.
            if paragraph and paragraph[-1].rstrip().endswith(".") and right[:1].isupper() and not left:
                flush()
            paragraph.append(right)
    flush()
    return entries


def remove_tags(line: str, tags: set[str]) -> str:
    """Retire les étiquettes isolées d'une colonne intermédiaire (ex. « lire », « écrire » en français)."""
    if not tags:
        return line
    pattern = r"(?<=\s\s)(" + "|".join(re.escape(t) for t in tags) + r")(?=\s\s|\s*$)"
    return re.sub(pattern, lambda m: " " * len(m.group(0)), line)


def parse_generic(lines: list[str], tags: set[str] | None = None) -> list[dict]:
    """
    Mise en page générique : tableaux à deux colonnes (savoir à gauche, attendu à droite)
    regroupés par année. La compétence est l'intitulé de gauche, l'attendu le paragraphe de droite.
    """
    vocabulary = Counter(w.lower() for line in lines for w in re.findall(r"\w+", line))
    entries: list[dict] = []
    year = None
    left_parts: list[str] = []
    left_closed = True
    blank_since_left = False
    paragraph: list[str] = []
    split_min = 38

    def label() -> str | None:
        return join_lines(left_parts, vocabulary) if left_parts else None

    def flush():
        nonlocal paragraph
        if paragraph and year and left_parts:
            text = join_lines(paragraph, vocabulary)
            last = entries[-1] if entries else None
            if re.match(r"^Ex\.?\s*:", text) and last and last["year"] == year:
                last["text"] += " " + text
            elif len(text) >= 8 and (len(text) >= 80 or not re.match(r"^(Savoirs?|Savoir-faire|Compétences?)\b", text)):
                entries.append({"year": year, "domain": None, "section": label(), "text": text})
        paragraph = []

    for raw in lines:
        line = strip_margin(remove_tags(" " + raw, tags or set())[1:])
        y = YEAR_RE.match(line)
        if y:
            flush()
            year, left_parts, left_closed = y.group(1), [], True
            continue
        if (
            year is None
            or is_chrome(line)
            or "✘" in line
            or "Tableau synoptique" in line
            or re.search(r"\bAttendus?\s*$", line)
            or len(re.findall(r"\b[PS][1-6]\b", line)) >= 3
        ):
            continue
        if not line.strip():
            flush()
            blank_since_left = True
            continue
        indent = len(line) - len(line.lstrip())
        left, right = split_columns(line, split_min)
        # Titres en majuscules (VIVANTS, PRIMAIRE…) : ce ne sont ni des savoirs ni des attendus.
        if right and right.upper() == right and not any(c.isdigit() for c in right):
            right = ""
        if left and left.upper() == left and len(left) > 3:
            flush()
            left_parts, left_closed = [], True
            left = ""
        if not left and not right:
            continue
        if left and not right and (len(left) > 75 or indent < 12):
            # Paragraphe explicatif ou titre pleine largeur : hors tableau.
            flush()
            left_parts, left_closed = [], True
            continue
        if left:
            if left_closed or blank_since_left:
                flush()
                left_parts = []
            left_parts.append(left)
            left_closed = left.rstrip().endswith((".", ":", "?"))
            blank_since_left = False
        if right:
            if paragraph and paragraph[-1].rstrip().endswith(".") and right[:1].isupper() and not left:
                flush()
            paragraph.append(right)
    flush()
    return entries


def build(entries: list[dict], subject: str, prefix: str) -> list[dict]:
    out: list[dict] = []
    domains: dict[str, dict] = {}
    sections: dict[str, dict] = {}
    counters: Counter = Counter()
    section_numbers: dict[str, str] = {}
    for e in entries:
        if not e["section"] or len(e["text"]) < 8:
            continue
        dnum, dlabel = e["domain"] or ("0", subject)
        dcode = f"{prefix}-{dnum}"
        if dcode not in domains:
            domains[dcode] = {"code": dcode, "parentCode": None, "kind": "domaine", "subject": subject, "grades": [], "label": dlabel}
            out.append(domains[dcode])
        if isinstance(e["section"], tuple):
            snum, slabel = e["section"]
            full_label = f"{snum}. {slabel}"
        else:
            # Mode générique : la compétence est identifiée par son intitulé.
            full_label = e["section"]
            snum = section_numbers.setdefault(full_label, str(len(section_numbers) + 1))
        scode = f"{prefix}-{snum}"
        if scode not in sections:
            sections[scode] = {"code": scode, "parentCode": dcode, "kind": "competence", "subject": subject, "grades": [], "label": full_label}
            out.append(sections[scode])
        if e["year"] not in sections[scode]["grades"]:
            sections[scode]["grades"].append(e["year"])
        counters[(e["year"], snum)] += 1
        out.append({
            "code": f"{prefix}-{e['year']}-{snum}-{counters[(e['year'], snum)]}",
            "parentCode": scode,
            "kind": "attendu",
            "subject": subject,
            "grades": [e["year"]],
            "label": e["text"],
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--matiere", required=True)
    ap.add_argument("--prefixe", required=True)
    ap.add_argument("--titre", required=True)
    ap.add_argument("--version", required=True)
    ap.add_argument("--url")
    ap.add_argument("--niveau", default="primaire")
    ap.add_argument("--mode", choices=["champs", "generique"], default="champs")
    ap.add_argument("--ignorer", default="", help="étiquettes à ignorer, séparées par des virgules")
    args = ap.parse_args()
    lines = pdf_text(args.pdf)
    tags = {t.strip() for t in args.ignorer.split(",") if t.strip()}
    parsed = parse(lines) if args.mode == "champs" else parse_generic(lines, tags)
    entries = build(parsed, args.matiere, args.prefixe)
    if not entries:
        sys.exit("Aucun attendu trouvé : la mise en page du document n'est pas reconnue.")
    json.dump(
        {"source": {"title": args.titre, "url": args.url, "version": args.version}, "level": args.niveau, "entries": entries},
        sys.stdout, ensure_ascii=False, indent=2,
    )
    print(file=sys.stdout)


if __name__ == "__main__":
    main()
