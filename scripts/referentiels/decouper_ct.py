#!/usr/bin/env python3
"""
Compétences terminales des 2e et 3e degrés du secondaire (S3/S4 → S6/S7) : découpe des PDF
publiés sur enseignement.be en fichiers donnees/ct-*.json (même format que les référentiels du tronc commun).

Les référentiels de 2014 et suivants sont des fiches « unités d'acquis d'apprentissage » (UAA),
lues par position (fiches_uaa.py, PyMuPDF) ; les plus anciens (1999-2004) sont des listes,
lues par anciens_ct.py. Les intitulés sont recopiés tels quels : une relecture humaine reste nécessaire.

  pip install pymupdf
  python3 scripts/referentiels/decouper_ct.py <dossier des PDF>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from fiches_uaa import Fiche, clean, read_fiches  # noqa: E402
from langues_ct import read_langues, statements  # noqa: E402
from anciens_ct import read_outline  # noqa: E402

BASE = (
    'https://www.enseignement.be/fileadmin/portail_age/uploads/parcours_apprentissage/secondaire_ordinaire/'
    'Organisation/Contenus_apprentissages_Secondaire/competences_terminales/'
)
TRANSITION = ['general', 'technique', 'specialise']
QUALIFICATION = ['technique', 'professionnel', 'specialise']
TOUTES = ['general', 'technique', 'professionnel', 'specialise']

YEAR_WORDS = {'troisième': 3, 'quatrième': 4, 'cinquième': 5, 'sixième': 6, 'septième': 7}
SECTION_LABELS = {
    'competences': 'Compétence',
    'appliquer': 'Appliquer',
    'transferer': 'Transférer',
    'connaitre': 'Connaître',
    'ressources': 'Ressource',
}
SECTION_CODES = {'competences': 'C', 'appliquer': 'A', 'transferer': 'T', 'connaitre': 'K', 'ressources': 'R'}


def grades_from(text: str, qualification: bool) -> list[str]:
    """Années d'une fiche d'après son en-tête (« 3e année », « Deuxième degré »…)."""
    t = text.lower()
    m = re.search(r'\b([3-7])\s*e\s*ann[ée]e', t) or re.search(r'(troisième|quatrième|cinquième|sixième|septième) année', t)
    if m:
        year = int(m.group(1)) if m.group(1).isdigit() else YEAR_WORDS[m.group(1)]
        return [f'S{year}']
    if re.search(r'\b(2e|deuxième) (degré|et)', t) and re.search(r'(3e|troisième) degré', t):
        return ['S3', 'S4', 'S5', 'S6'] + (['S7'] if qualification else [])
    if re.search(r'\b(2e|2 e|deuxième) degr[ée]', t):
        return ['S3', 'S4']
    if re.search(r'\b(3e|3 e|troisième) degr[ée]', t):
        return ['S5', 'S6'] + (['S7'] if qualification else [])
    raise ValueError(f'Années introuvables : {text!r}')


def find(header: list[str], pattern: str) -> re.Match:
    for line in header:
        m = re.search(pattern, line)
        if m:
            return m
    raise ValueError(f'{pattern!r} introuvable dans {header}')


# Description d'une fiche : (code court, intitulé de la compétence, années).
def maths_hgt(f: Fiche):
    ctx = find(f.header, r'^(Mathématiques[^:]*):').group(1)
    code = find(f.header, r'^(\d\w?)\s*UAA\s*(\d+)')
    title = next(h for h in f.header[1:] if not re.search(r'UAA|^Unité d|^Mathématiques', h))
    label = title if ctx == 'Mathématiques' else f'{ctx} – {title}'
    return f'{code.group(1)}-{code.group(2)}', label, grades_from(f.header[0], False)


def maths_qualif(f: Fiche):
    code = find(f.header, r'^(M[BQ])(\d)(\d)\s*UAA\s*(\d+)')
    title = next(h for h in f.header[1:] if not re.search(r'UAA|^Unité d', h))
    degree = code.group(2)
    grades = ['S3', 'S4'] if degree == '2' else ['S5', 'S6', 'S7']
    return f'{code.group(1)}{degree}{code.group(3)}-{code.group(4)}', f'{f.header[0]} – {title}', grades


def sciences(f: Fiche, qualification=False):
    head = f.header[0]
    disc = find([head], r'(Biologie|Chimie|Physique)').group(1)
    num = find([head], r'apprentissage\s*(\d+)').group(1)
    title = clean(' '.join(f.header[1:2])).strip('"«» ').replace('»', '').strip()
    return f'{disc[:3].upper()}{num}', f'{disc} – {title}', grades_from(head, qualification)


def form_scientifique(f: Fiche):
    m = find(f.header, r'APPRENTISSAGE (\d+)\s*:\s*(.+)')
    return f'UAA{m.group(1)}', m.group(2).strip(), grades_from(f.header[0], True)


def hist_geo_qualif(f: Fiche):
    text = ' '.join(f.header)
    disc = 'Géographie' if 'GÉOGRAPHIE' in text or 'contexte spatial' in text else 'Histoire'
    degree = re.search(r'([23])e DEGRÉ', text)
    degree = degree.group(1) if degree else '2'
    num = re.search(r'\bUAA (\d+)', text)
    num = num.group(1) if num else '1'
    competence = (f.sections.get('competences') or [''])[0]
    label = f'{disc} – UAA {num}' + (f' – {competence}' if competence else '')
    return f'{"HIST" if disc == "Histoire" else "GEO"}{degree}-{num}', label, grades_from(f'{degree}e degré', True)


def eco_soc(f: Fiche):
    title = next(h for h in f.header if not re.search(r'^UNITES|^Formation|degré$|^Unité d', h))
    return f'UAA-{len(title)}-{title[:3].upper()}', title, grades_from(' '.join(f.header), True)


def cirque(f: Fiche):
    m = find(f.header, r'APPRENTISSAGE (\d+)\s*:\s*(.+)')
    theme = find(f.header, r'THÈME (\d)').group(1)
    return f'UAA{m.group(1)}', f'Thème {theme} – {m.group(2).strip()}', grades_from(f.header[0], False)


def epc(f: Fiche):
    m = find(f.header, r'^UAA ([\d.\s-]+?)\.?\s+([A-ZÉÈÀ].+)')
    num = re.sub(r'\.*-\.*', '-', re.sub(r'[^\d.-]', '', m.group(1))).strip('.-')
    return num, f'UAA {m.group(1).strip()} {m.group(2)}'.replace('  ', ' '), grades_from(f.header[0], True)


def geographie(f: Fiche):
    title = next(h for h in f.header[1:] if h.startswith('Questions'))
    deg = find(f.header, r'([23])e DEGRÉ').group(1)
    return f'D{deg}-{title.split()[-1][:6].upper()}', title, grades_from(f.header[0], False)


def informatique(f: Fiche):
    m = find(f.header, r'APPRENTISSAGE (\d+)\s*:\s*(.+)')
    title = re.sub(r'\s*\((DE )?\d+ (À \d+ )?PÉRIODES\)', '', m.group(2)).replace('*', '').strip()
    return f'UAA{m.group(1)}', title, grades_from(f.header[0], False)


FRENCH_TITLES: dict[str, str] = {}


def francais(f: Fiche, qualification=False):
    m = find(f.header, r'^UAA\s*(\d+)\s*(.*)')
    num = m.group(1)
    title = re.sub(r'^Unité intradisciplinaire\s*', '', m.group(2)).strip()
    if not title:
        title = next((h for h in f.header[1:] if not re.search(r'degrés?$|^Français$', h)), '')
    key = f'{qualification}-{num}'
    title = title or FRENCH_TITLES.get(key, '')
    FRENCH_TITLES[key] = title
    degree = next((h for h in f.header if re.search(r'degrés?$', h)), '')
    grades = grades_from(degree, qualification)
    deg_code = 'D23' if 'S3' in grades and 'S5' in grades else 'D2' if 'S3' in grades else 'D3'
    return f'UAA{num}-{deg_code}', f'UAA {num} – {title}' if title else f'UAA {num}', grades


# Intitulés de rubrique isolés, sans contenu.
JUNK = re.compile(
    r'(?i)^(pr[ée]-?requis|savoirs?( disciplinaires)?|savoir-faire( disciplinaires?)?|attitudes?|concepts?|notions?|'
    r'ressources|uaa pr[ée]requise.*|aucune|/|…|pas de transfert.*|\.\.\.)\s*:?$'
)

SKIP = [r'^Annexe [IVX]+ ?:', r'(?i)^page \d', r'^\d+$', r'^Compétences terminales et savoirs', r'(?i)^Compétences minimales']

DOCS = [
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/2014_CT_HGT_Mathematiques.pdf', prefix='CTMA', subject='Mathématiques',
         version='2014', tracks=TRANSITION, describe=maths_hgt, starts=r'^Mathématiques[^:]*: \de degré', cuts=(300, 575),
         title='Compétences terminales et savoirs requis en mathématiques (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_et_7e_PROF_et_techni_de_qualif/2014_CM_Mathematiq_qualif.pdf', prefix='CTMAQ',
         subject='Mathématiques', version='2014', tracks=QUALIFICATION, describe=maths_qualif,
         starts=r'^Mathématiques (de base|actives|liées)', cuts=(300, 585),
         title='Compétences minimales en mathématiques (section de qualification)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/2014_CT_HGT_Edu-Scientifi.pdf', prefix='CTES', subject='Sciences',
         version='2014', tracks=TRANSITION, describe=sciences, starts=r'^Education scientifique –.*apprentissage', cuts=(330, 545),
         title='Compétences terminales et savoirs requis en éducation scientifique (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/2014_CT_HGT_Sciences-base.pdf', prefix='CTSB', subject='Sciences',
         version='2014', tracks=TRANSITION, describe=sciences, starts=r'^Sciences de base –.*apprentissage', cuts=(330, 545),
         title='Compétences terminales et savoirs requis en sciences de base (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/2014_CT_HGT_Sciences-gen.pdf', prefix='CTSG', subject='Sciences',
         version='2014', tracks=TRANSITION, describe=sciences, starts=r'^Sciences générales –.*apprentissage', cuts=(330, 545),
         title='Compétences terminales et savoirs requis en sciences générales (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_et_7e_PROF_et_techni_de_qualif/2014_CT_HPT-Form-scientif.pdf', prefix='CTFSQ',
         subject='Sciences', version='2014', tracks=QUALIFICATION, describe=form_scientifique,
         starts=r'^FORMATION SCIENTIFIQUE – \d', cuts=(300, 530),
         title='Compétences terminales et savoirs communs en formation scientifique (humanités professionnelles et techniques)'),
    dict(pdf='FORM_COM_2et3_degres_et_7e_PROF_et_techni_de_qualif/2014_CT_HPT_Form-Hist-Geo.pdf', prefix='CTHGQ',
         subject='Formation historique et géographique', version='2014', tracks=QUALIFICATION, describe=hist_geo_qualif,
         # La 1re fiche d'histoire commence sous un tableau de synthèse (p. 14), ignoré.
         starts=r'^(HISTOIRE|GÉOGRAPHIE) [23]e DEGRÉ$|^Inscrire dans une perspective historique, selon l.axe de la situation',
         cuts=(200, 385), skip_pages=[14],
         title='Compétences terminales et savoirs communs en formation historique et géographique '
               '(humanités professionnelles et techniques)'),
    dict(pdf='HUM_PROF_et_TECH_3e_degre_et_7e/2014_CT_HPT_Form-eco-soc.pdf', prefix='CTESQ',
         subject='Formation historique et géographique', version='2014', tracks=QUALIFICATION, describe=eco_soc,
         starts=r'^Formation économique et sociale$', cuts=(290, 510),
         title='Compétences terminales et savoirs communs en formation économique et sociale '
               '(humanités professionnelles et techniques)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/CT_HGT_Arts-cirque.pdf', prefix='CTCIR',
         subject='Éducation culturelle et artistique', version='2018', tracks=TRANSITION, describe=cirque,
         starts=r'^ARTS DU CIRQUE – \de DEGRÉ', cuts=(210, 375), first_page=7,
         title='Compétences terminales et savoirs requis en arts du cirque et arts circassiens'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/CT_HGT_Edu-Philo-Citoyen.pdf', prefix='CTEPC',
         subject='Éducation à la philosophie et à la citoyenneté', version='2017', tracks=TOUTES, describe=epc,
         starts=r'^Éducation à la Philosophie et à la Citoyenneté\s*[-–]\s*[23]e degré', cuts=(310, 530), last_page=54,
         stop=r'^(Exemples de courants|Par « exemple »|Ces indications)',
         title="Compétences terminales de l'éducation à la philosophie et à la citoyenneté "
               '(humanités générales, technologiques, professionnelles et techniques)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/CT_HGT_Geographie.pdf', prefix='CTGEO',
         subject='Formation historique et géographique', version='2018', tracks=TRANSITION, describe=geographie,
         starts=r'^GÉOGRAPHIE [23]e DEGRÉ', cuts=(215, 310),
         title='Compétences terminales et savoirs communs en géographie (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/CT_HGT_Informatique.pdf', prefix='CTINF',
         subject='Formation manuelle et technique', version='2023', tracks=['technique'], describe=informatique,
         starts=r'^INFORMATIQUE – \dE DEGRÉ', cuts=(320, 565),
         title='Compétences terminales et savoirs requis en informatique (technique de transition)'),
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/CT_HGT_Francais.pdf', prefix='CTFR', subject='Français',
         version='2017', tracks=TRANSITION, describe=francais, starts=r'^UAA\s*\d+$', cuts=(220, 380), first_page=11,
         ends=r'^(Unités? \d+( et \d+)? :|Ressources communes|Relater des expériences culturelles$)',
         last_page=41, title='Compétences terminales et savoirs requis en français (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_et_7e_PROF_et_techni_de_qualif/2014_CT_HPT-Francais.pdf', prefix='CTFRQ',
         subject='Français', version='2014', tracks=QUALIFICATION, describe=lambda f: francais(f, True),
         starts=r'^UAA\s*\d+(\s|$)', cuts=(205, 345), first_page=33, ends=r'^Ressources communes',
         title='Compétences terminales en français (humanités professionnelles et techniques)'),
]


LANGUES = [
    dict(pdf='FORM_COM_2et3_degres_TRANSITION/2017_CT_HGT_Langues-moder.pdf', prefix='CTLM', version='2017',
         tracks=TRANSITION, grades={'A1+': ['S3', 'S4', 'S5', 'S6'], 'A2': ['S3', 'S4', 'S5', 'S6'],
                                    'B1': ['S3', 'S4', 'S5', 'S6'], 'B2-': ['S5', 'S6']},
         title='Compétences terminales et savoirs requis en langues modernes (humanités générales et technologiques)'),
    dict(pdf='FORM_COM_2et3_degres_et_7e_PROF_et_techni_de_qualif/2017_CT_HPT-Langues-mod.pdf', prefix='CTLMQ',
         version='2017', tracks=QUALIFICATION,
         grades={'A1+': ['S3', 'S4', 'S5', 'S6', 'S7'], 'A2': ['S3', 'S4', 'S5', 'S6', 'S7'], 'B1-': ['S5', 'S6', 'S7']},
         title='Compétences terminales et savoirs communs en langues modernes (humanités professionnelles et techniques)'),
]
OLD_SKIP = [
    r'SAVOIRS\s+REQUIS', r'^HUMANIT', r'^\d+$', r'^OPTION DE BASE$', r'^_+$', r'^(COMPÉTENCES|SAVOIRS)$',
    r'^Compétences à développer\.?$', r'^L.élève (sera capable de|doit)', r'^Champs de la discipline', r'^domaines à envisager',
    r'^Niveaux\.?$', r'^COMPETENCES (TRANSVERSALES|DISCIPLINAIRES)',
]
ACCENTS = {'economiques': 'économiques', 'general': 'général', 'apprecier': 'apprécier', 'ecouter': 'écouter',
           'connaitre': 'connaître', 'regarder/ecouter': 'regarder/écouter', 'ecouter/regarder': 'écouter/regarder'}


def accents(text: str) -> str:
    return re.sub(r'[\w/]+', lambda m: ACCENTS.get(m.group(0), m.group(0)), text)

# Référentiels de 1999-2004 : une ou plusieurs lectures (« parts ») par document.
ANCIENS = [
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/1999_CT_HGT_Histoire.pdf', prefix='CTHI', subject='Formation historique et géographique',
         version='1999', tracks=TRANSITION, grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en histoire (humanités générales et technologiques)',
         parts=[dict(pages=range(4, 8), headings=[
             r'^Compétence n°\s*\d', r'^\d\. (ATTITUDES|OUTILS)',
             r'^(L’Antiquité|Le Moyen Age|La Renaissance|Les Temps Modernes|Le Temps des Révolutions|Le XXe siècle)'],
             paragraphs=r'^Compétence', numbered='prefix', ignore=[r'^\d\. (COMPÉTENCES|MOMENTS)'],
             relabel=[(r'^(L’|Le |La |Les )', r'Moments-clés – \1'), (r'^3\. ATTITUDES ET SAVOIR-FAIRE', 'Attitudes et savoir-faire'),
                      (r'^4\. OUTILS CONCEPTUELS', 'Outils conceptuels (identifier…)')])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/1999_CT_HGT_Latin-Grec.pdf', prefix='CTLG', subject='Français', version='1999',
         tracks=TRANSITION, grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en latin et grec (humanités générales et technologiques)',
         parts=[dict(pages=range(4, 10), headings=[r'^\de? ?(ère|e) compétence', r'^SAVOIRS (LINGUISTIQUES|LITTÉRAIRES)'],
                     paragraphs=r'compétence', subheads=[r'^Spécifiquement pour le (latin|grec)'],
                     ignore=[r'^Telles qu.elles sont définies', r'^Les deux listes d.auteurs'],
                     drop=[r'^(Ceci|Cela) (implique|permet|suppose)', r'^N\.B\.'],
                     relabel=[(r'^(\d)(ère|e) compétence', r'Latin et grec – \1\2 compétence'),
                              (r'^SAVOIRS LINGUISTIQUES\.?', 'Latin et grec – Savoirs linguistiques'),
                              (r'^SAVOIRS LITTÉRAIRES, HISTORIQUES ET CULTURELS\.?', 'Latin et grec – Savoirs littéraires, historiques et culturels')])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2000_CT_HGT_Sciences-Eco.pdf', prefix='CTSE', subject='Formation historique et géographique',
         version='2000', tracks=TRANSITION, grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en sciences économiques et sciences sociales (transition)',
         parts=[dict(pages=range(3, 14), headings=[r'^\d\. [A-ZÉ]{3}', r'^SCIENCES (ECONOMIQUES|SOCIALES) : ENSEIGNEMENT'],
                     prefixes=[r'^SCIENCES (ECONOMIQUES|SOCIALES) - COMPETENCES'], multiline=True, keep_empty=True, merge_gap=200,
                     heading_stop=r'^(OBJETS A CROISER|\(par ordre|PROBLEMATIQUES$)', subheads=[r'^(Analyse de gestion|Droit|Entreprise)$'],
                     ignore=[r'^Vu pour être annexé', r'^Cette liste n.est pas exhaustive', r'^L.apprentissage de certains objets'],
                     relabel=[(r'^SCIENCES (ECONOMIQUES|SOCIALES) - COMPETENCES – SCIENCES \w+ : ENSEIGNEMENT (GENERAL|TECHNIQUE) DE TRANSITION',
                               lambda m: f"Sciences {m.group(1).lower()} – objets et problématiques ({m.group(2).lower()} de transition)"),
                              (r'^SCIENCES (ECONOMIQUES|SOCIALES) - COMPETENCES – ', lambda m: f'Sciences {m.group(1).lower()} – ')])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2000_CT_HGT_Edu-Physique.pdf', prefix='CTEP', subject='Éducation physique',
         version='2000', tracks=TOUTES, grades=['S3', 'S4', 'S5', 'S6', 'S7'],
         title='Compétences terminales et savoirs requis en éducation physique (humanités générales, technologiques, '
               'professionnelles et techniques)',
         parts=[dict(pages=range(5, 8), headings=[r'^(Condition physique|Habiletés gestuelles|Coopération sensori)'],
                     column=(210, 370), cuts=(210, 370), multiline=True)]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2004_CT_HGT_Edu-Physiq-OB.pdf', prefix='CTEPO', subject='Éducation physique',
         version='2004', tracks=['technique'], grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en éducation physique – formation théorique, option de base '
               '(technique de transition)',
         parts=[dict(pages=[3], headings=[r'^2\.1\. L.orientation principale'], ignore=[r'^2\.2 '], numbered='prefix',
                     relabel=[(r'^.*$', 'Principes généraux')]),
                dict(pages=range(4, 6), headings=[r'^3\.\d [A-ZÉ]'], column=(0, 295), cuts=(295, 1e9), paragraphs=True,
                     relabel=[(r'^3\.\d (.*)$', lambda m: m.group(1).capitalize() + ' – compétences')]),
                dict(pages=range(4, 6), headings=[r'^3\.\d [A-ZÉ]'], column=(295, 600), cuts=(295, 1e9), paragraphs=True,
                     subheads=[r'^[A-ZÉ][\w ]+ ?:$'],
                     relabel=[(r'^3\.\d (.*)$', lambda m: m.group(1).capitalize() + ' – savoirs')])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2004_CT_HGT_Edu-Artistiqu.pdf', prefix='CTEA', subject='Éducation culturelle et artistique',
         version='2004', tracks=TRANSITION, grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en éducation artistique (humanités générales et technologiques)',
         parts=[dict(pages=range(3, 28), headings=[r'^\d\.\d\.? OBJECTIF'], prefixes=[r'^\d\.\s+[A-Z’\' ]{5,}$'],
                     column=(285, 600), cuts=(285, 1e9), paragraphs=False,
                     relabel=[(r'^\d\.\s+(.*?) – \d\.\d\.? OBJECTIF : (.*)$',
                               lambda m: f"{m.group(1).capitalize()} – objectif : {m.group(2).lower()}")])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2004_CT_HGT_Edu-Tech-Tech.pdf', prefix='CTETT', subject='Formation manuelle et technique',
         version='2004', tracks=TRANSITION, grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en éducation technique et technologique (humanités générales et technologiques)',
         parts=[dict(pages=range(5, 9), headings=[r'^2\.\d\.\d\.?\s', r'^3\. THEMATIQUES'], multiline=True,
                     heading_stop=r'^Familles de situations', ignore=[r'^2\.2 COMPÉTENCES'],
                     relabel=[(r'^3\. THEMATIQUES ET SAVOIRS ASSOCIES', 'Thématiques et savoirs associés')])]),
    dict(pdf='HUM_GEN_et_TECH_2et3_degres/2004_CT_HGT_Edu-Technolo.pdf', prefix='CTTEC', subject='Formation manuelle et technique',
         version='2004', tracks=['technique'], grades=['S3', 'S4', 'S5', 'S6'],
         title='Compétences terminales et savoirs requis en technologie (options de base groupées, technique de transition)',
         parts=[dict(pages=[5], headings=[r'^2\.1 COMPÉTENCES TERMINALES'], ignore=[r'^Par les modes de raisonnement'],
                     relabel=[(r'^.*$', 'Agronomie, industrie, construction, sciences-informatique – compétences terminales')]),
                dict(pages=list(range(10, 12)), headings=[r'^3\.1\.\d\.?\s'], multiline=True,
                     ignore=[r'^Par ses modes', r'^3\.2 '],
                     relabel=[(r'^3\.1\.\d\.?\s+', 'Sciences appliquées, biotechnique, chimie industrielle – ')]),
                dict(pages=list(range(25, 27)), headings=[r'^4\.1\.\d\.?\s', r'^(Intégrer les sciences|Concevoir un projet)'],
                     multiline=True, ignore=[r'^4\.2'], relabel=[(r'^(4\.1\.\d\.?\s+)?', 'Sciences paramédicales – ')]),
                dict(pages=list(range(37, 40)), headings=[r'^5\.\d\s'], multiline=True, ignore=[r'^6\. GLOSSAIRE'],
                     relabel=[(r'^5\.\d\s+', 'Compétences transversales – ')])]),
]

SKILL_CODES = [('Écouter', 'EC'), ('Ecouter', 'EC'), ('Lire', 'LI'), ('Écrire', 'EE'), ('Ecrire', 'EE'),
               ('Parler sans', 'PS'), ('Parler en', 'PI')]


def langues_entries(doc: dict, pdf: Path) -> list[dict]:
    import pymupdf

    subject = 'Langue moderne'
    fiches = read_langues(str(pdf), range(12, len(pymupdf.open(pdf))))
    domain = {'code': doc['prefix'], 'parentCode': None, 'kind': 'domaine', 'subject': subject,
              'grades': sorted({g for gs in doc['grades'].values() for g in gs}, key=lambda g: int(g[1:])),
              'label': doc['title']}
    entries = [domain]
    for f in fiches:
        skill = next(code for word, code in SKILL_CODES if f.skill.startswith(word))
        code = f"{doc['prefix']}-{f.level.replace('+', 'P').replace('-', '')}-{skill}"
        grades = doc['grades'][f.level]
        entries.append({'code': code, 'parentCode': doc['prefix'], 'kind': 'competence', 'subject': subject,
                        'grades': grades, 'label': f'{f.level} – {f.skill}'})
        labelled = [('C', 'Compétence', statements(f)), ('F', 'Fonction langagière', f.fonctions),
                    ('G', 'Grammaire', f.grammaire)]
        for letter, prefix, texts in labelled:
            for i, text in enumerate(dict.fromkeys(texts), 1):
                entries.append({'code': f'{code}-{letter}{i}', 'parentCode': code, 'kind': 'attendu',
                                'subject': subject, 'grades': grades, 'label': f'{prefix} : {text}'})
    return entries


def anciens_entries(doc: dict, pdf: Path) -> list[dict]:
    prefix, subject, grades = doc['prefix'], doc['subject'], doc['grades']
    entries = [{'code': prefix, 'parentCode': None, 'kind': 'domaine', 'subject': subject, 'grades': grades,
                'label': doc['title']}]
    n = 0
    for part in doc['parts']:
        options = {k: v for k, v in part.items() if k not in ('pages', 'relabel')}
        for section in read_outline(str(pdf), part['pages'], skip=OLD_SKIP, **options):
            label = section.label
            for pattern, repl in part.get('relabel', []):
                label = re.sub(pattern, repl, label, count=1)
            label = accents(re.sub(r'(\D)\d\.$', r'\1', label).rstrip(' :.'))
            n += 1
            code = f'{prefix}-{n}'
            entries.append({'code': code, 'parentCode': prefix, 'kind': 'competence', 'subject': subject,
                            'grades': grades, 'label': label})
            for i, item in enumerate(section.items or [label], 1):
                entries.append({'code': f'{code}-{i}', 'parentCode': code, 'kind': 'attendu', 'subject': subject,
                                'grades': grades, 'label': item})
    return entries


def to_entries(doc: dict, fiches: list[Fiche]) -> list[dict]:
    prefix, subject = doc['prefix'], doc['subject']
    domain = {
        'code': prefix,
        'parentCode': None,
        'kind': 'domaine',
        'subject': subject,
        'grades': [],
        'label': doc['title'],
    }
    entries = [domain]
    codes: set[str] = set()
    all_grades: set[str] = set()
    for fiche in fiches:
        if not fiche.sections:
            continue  # tableau de synthèse, pas une fiche
        short, label, grades = doc['describe'](fiche)
        code = f'{prefix}-{short}'
        n = 2
        while code in codes:
            code = f'{prefix}-{short}-{n}'
            n += 1
        codes.add(code)
        all_grades.update(grades)
        entries.append(
            {'code': code, 'parentCode': prefix, 'kind': 'competence', 'subject': subject, 'grades': grades, 'label': label}
        )
        for section in ('competences', 'appliquer', 'transferer', 'connaitre', 'ressources'):
            texts = []
            for text in dict.fromkeys(fiche.sections.get(section, [])):
                if doc.get('stop') and re.search(doc['stop'], text):
                    break
                if len(text) < 3 or text.endswith(':') or JUNK.match(text):
                    continue
                texts.append(text)
            for i, text in enumerate(texts, 1):
                entries.append(
                    {
                        'code': f'{code}-{SECTION_CODES[section]}{i}',
                        'parentCode': code,
                        'kind': 'attendu',
                        'subject': subject,
                        'grades': grades,
                        'label': f'{SECTION_LABELS[section]} : {text}',
                    }
                )
    domain['grades'] = sorted(all_grades, key=lambda g: int(g[1:]))
    return entries


def write(doc: dict, entries: list[dict], out_dir: Path, note: str = '') -> None:
    data = {
        'source': {'title': doc['title'], 'url': BASE + doc['pdf'], 'version': doc['version']},
        'level': 'secondaire',
        'tracks': doc['tracks'],
        'entries': entries,
    }
    name = f"ct-{doc['prefix'][2:].lower()}-{doc['version']}.json"
    (out_dir / name).write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    attendus = sum(1 for e in entries if e['kind'] == 'attendu')
    competences = sum(1 for e in entries if e['kind'] == 'competence')
    print(f'✔ {name} : {competences} compétences, {attendus} attendus {note}')


def main(pdf_dir: Path) -> None:
    out_dir = HERE / 'donnees'
    for doc in ANCIENS:
        write(doc, anciens_entries(doc, pdf_dir / Path(doc['pdf']).name), out_dir)
    for doc in LANGUES:
        write(doc, langues_entries(doc, pdf_dir / Path(doc['pdf']).name), out_dir)
    for doc in DOCS:
        path = pdf_dir / Path(doc['pdf']).name
        first = doc.get('first_page', 1) - 1
        last = doc.get('last_page')
        import pymupdf

        n_pages = len(pymupdf.open(path))
        skipped = set(p - 1 for p in doc.get('skip_pages', []))
        fiches = read_fiches(
            str(path),
            starts=re.compile(doc['starts']),
            cuts=doc['cuts'],
            pages=[p for p in range(first, last or n_pages) if p not in skipped],
            skip=SKIP,
            ends=re.compile(doc['ends']) if doc.get('ends') else None,
        )
        write(doc, to_entries(doc, fiches), out_dir)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
