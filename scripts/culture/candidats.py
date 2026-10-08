#!/usr/bin/env python3
"""
Candidats « pour aller plus loin » tirés UNIQUEMENT des repères culturels et artistiques cités dans le
Référentiel d'Éducation culturelle et artistique (tronc commun, 2022). Aucun lien ni fait n'est ajouté :
la relecture humaine complète les liens, vérifie et décide (colonne « garder »).

Produit scripts/culture/a-relire.csv (séparateur « ; », UTF-8 avec BOM pour Excel).
"""
import csv
import re
import sys
from pathlib import Path

ECA = "Éducation culturelle et artistique"
FHG = "Formation historique et géographique"
FR = "Français"
SRC = "Référentiel ECA 2022, repères culturels et artistiques"

# (type, titre, années, lieu, matières, description)
MUSIQUE = [
    ("« Marche du toréador », G. Bizet", ["P1"]),
    ("« Papagena - Papageno », W.A. Mozart", ["P1"]),
    ("« Disney Medley », version Voca people", ["P1"]),
    ("« Carnaval des animaux », C. Saint-Saëns", ["P1"]),
    ("« Pierre et le Loup », S. Prokofiev", ["P1", "P3"]),
    ("« Marche de Radetzky », J. Strauss", ["P1"]),
    ("« L’Arlésienne », G. Bizet", ["P1"]),
    ("« Valse n°2 », D. Shostakovich", ["P1"]),
    ("« Sarabande », G.F. Haendel", ["P1"]),
    ("« Fanfare pour le carrousel royal », J.-B. Lully", ["P1"]),
    ("« Stripsody », C. Berberian", ["P2", "P6"]),
    ("« Avsenik Medley », Perpetuum Jazzile", ["P2"]),
    ("« Kalinka », version I. Rebroff", ["P2"]),
    ("« Les Quatre Saisons », A. Vivaldi (interprétation de Camille et Julie Berthollet)", ["P3"]),
    ("« Gymnopédies », E. Satie", ["P3"]),
    ("« Concerto d’Aranjuez », J. Rodrigo", ["P3"]),
    ("« Imagine », J. Lennon", ["P3"]),
    ("« Canon », J. Pachelbel", ["P3"]),
    ("Oum Kalthoum", ["P3"]),
    ("La Brabançonne", ["P3", "P6", "S2"]),
    ("« Petite symphonie pour vents », C. Gounod", ["P4"]),
    ("« What a Wonderful World », L. Armstrong", ["P4"]),
    ("« Piccolo, Saxo et Cie », J. Broussolle et A. Popp", ["P4"]),
    ("« La Mélodie du bonheur », version J. Andrews", ["P4"]),
    ("« Gammes et arpèges » (film « Les Aristochats », Disney)", ["P4"]),
    ("« We Will Rock You », Queen", ["P4", "S3"]),
    ("« Boléro », M. Ravel", ["P4"]),
    ("« Stomp »", ["P5"]),
    ("« Casse-noisette, danse de la fée dragée », P. Tchaikovski", ["P5"]),
    ("« Young Person’s Guide to the Orchestra », B. Britten", ["P6", "S2"]),
    ("« Air de la reine de la nuit », W.A. Mozart", ["P6"]),
    ("« 5e Symphonie », L. Beethoven", ["P6"]),
    ("« Symphonie des jouets », L. Mozart", ["P6"]),
    ("« Duo des chats », G. Rossini", ["P6"]),
    ("« Le lion est mort ce soir », H. Salvador", ["P6"]),
    ("« À la foire de l’Est », A. Branduardi", ["P6"]),
    ("« Ensemble », J.-J. Goldman", ["P6"]),
    ("« Vois sur ton chemin » (film « Les Choristes »)", ["P6"]),
    ("« Chanson de Roland » et « Enea volare », Era (Moyen Âge)", ["S1"]),
    ("« Tourdion », anonyme, et « Conquest of Paradise », Vangelis (Renaissance)", ["S1"]),
    ("« Marche des Turcs », J.-B. Lully, et « Lascia ch’io pianga », Haendel (période baroque)", ["S1"]),
    ("« La Surprise », Haydn, et « L’Enlèvement au sérail », W.A. Mozart (période classique)", ["S1"]),
    ("« La Chevauchée des Walkyries », R. Wagner, et « Also sprach Zarathustra », R. Strauss (période romantique)", ["S1"]),
    ("« Le Sacre du printemps », I. Stravinsky, et « O Fortuna », C. Orff (période moderne)", ["S1"]),
    ("« Quand la musique est bonne », J.-J. Goldman", ["S1"]),
    ("« Monopolis », M. Berger (« Starmania »)", ["S1"]),
    ("« Le matin » de « Peer Gynt », E. Grieg", ["S2"]),
    ("« Sicilienne », G. Fauré", ["S2"]),
    ("Rondeau « Abdelazar », H. Purcell", ["S2"]),
    ("« Mistral gagnant », Renaud (et ses reprises)", ["S2"]),
    ("« Ne me quitte pas », J. Brel (et ses reprises par Stromae, C. Dion)", ["S2"]),
    ("« Un Été de porcelaine », M. Schuman", ["S2"]),
    ("« Tarentelle », Y. Duteil", ["S2"]),
    ("« Chœur des esclaves » de « Nabucco », G. Verdi", ["S3"]),
    ("« Ode à la joie », 9e Symphonie, L. Beethoven", ["S3"]),
    ("« Sicilienne », J.S. Bach (BWV 1031)", ["S3"]),
    ("« Le Plat Pays », J. Brel", ["S3"]),
    ("« La foule », E. Piaf", ["S3"]),
    ("« Le Jazz et la Java », C. Nougaro", ["S3"]),
    ("« L’amour est un oiseau rebelle » de « Carmen », G. Bizet", ["S3"]),
    ("« Carmen », Stromae", ["S3"]),
    ("Hymne européen", ["S3"]),
]

ART = [
    ("Les plasticiens de la couleur : P. Mondrian, Y. Klein, H. Matisse, S. Delaunay, M. Rothko, A. Derain", ["P1"]),
    ("Le graphisme : art aborigène, J. Dubuffet, K. Haring, J. Miró, dessinateurs de BD, illustrateurs", ["P1"]),
    ("Le modelage : N. de Saint Phalle, P. Picasso, M.-P. Jan", ["P1"]),
    ("Les plasticiens de la forme : P. Picasso, H. Matisse, A. Calder, l’art africain premier, J. Dubuffet", ["P2"]),
    ("L’ornementation : l’art égyptien, l’art de l’Asie antérieure, la sculpture romane", ["P2"]),
    ("L’imaginaire : F. Kahlo, S. Dali, R. Magritte, J. Miró, M. Chagall, J. Bosch", ["P2"]),
    ("La représentation du mouvement : C. Twombly, K. Hokusai, V. Vasarely, W. Leblanc, les futuristes italiens, E. Degas", ["P3"]),
    ("Les artistes illustrateurs : H. Davies, R. Tasker, K. Canby, J.-M. Folon, A. Warhol", ["P3"]),
    ("La géométrie dans l’art : D. Buren, S. Delaunay, V. Vasarely, pavages islamiques, motifs hindous, vitraux", ["P3"]),
    ("Les plasticiens du geste : M.H. Vieira da Silva, J. Pollock, H. Hartung", ["P4"]),
    ("Les artistes assembleurs : L. de Vinci, Panamarenko, les artistes de l’Arte Povera", ["P4"]),
    ("L’art pariétal : grottes de Lascaux, grottes de Chauvet, les géoglyphes, J.-L. Moerman", ["P4"]),
    ("La sculpture : A. Calder, J. Tinguely, P. Bury, sculptures grecques, A. Rodin, C. Claudel, A. Giacometti", ["P4"]),
    ("La lumière dans l’art : l’art gothique, l’impressionnisme, Le Caravage, Rembrandt, J. Vermeer, A.V. Janssens, G. de La Tour", ["P5"]),
    ("La photographie : M. Parr, R. Doisneau, H. Cartier-Bresson, E. Muybridge, Y. Arthus-Bertrand", ["P5"]),
    ("Le cinéma : G. Méliès, F.W. Murnau, extraits du cinéma muet et hollywoodien", ["P5"]),
    ("L’agrandissement et la réduction : Murakami, C. Oldenburg, I. Cordal", ["P6"]),
    ("Le volume en architecture : pyramides égyptiennes et précolombiennes, buildings, opéra de Sydney", ["P6"]),
    ("L’animation : M. Satrapi, Picha, M. Ocelot, S. Halleux", ["P6"]),
    ("La perspective dans l’art : Canaletto, Michel-Ange, P. Delvaux, L.B. Alberti, A. Dürer, Masaccio, A. Gentileschi", ["S1"]),
    ("L’art urbain : J.-M. Basquiat, Banksy, K. Haring, JR, Nano 4814, Edgar Flores, Flip, E. Koba", ["S1"]),
    ("L’abstraction : V. Kandinsky, K. Malevitch, J. Pollock, J. Delahaut, P. Soulages", ["S1"]),
    ("La figuration : S. Valadon, M. Laurencin, P.P. Rubens, P. Bruegel, G. Courbet, D. Hockney", ["S1"]),
    ("Le détournement : B. Kruger, G. Penone, le Land art, M. Duchamp", ["S2"]),
    ("Les calligraphies : art chinois, art japonais, art musulman, parchemins médiévaux", ["S2"]),
    ("Les installations : A. Messager, L. Bourgeois, K. Geers, T. Margolles, J. Beuys, D. Hirst", ["S2"]),
    ("La vidéo et l’art numérique : B. Viola, P. Sorin, N. McLaren", ["S3"]),
    ("Les photographes témoins : C. Sherman, A. Sander, D. Lange, S. Salgado", ["S3"]),
    ("L’architecture : châteaux, Renaissance, art roman, art nouveau, Bauhaus, Le Corbusier, C. Perriand, Z. Hadid, F. Gehry, J. Nouvel", ["S3"]),
]

LIVRES = [
    ("Illustrateurs et dessinateurs de BD : C. Ponti, C. Bretécher, M. de Radiguès, L. Gaume, Uderzo", ["S1"], [ECA, FR]),
    ("La BD belge : J.-C. Servais, J. Van Hamme, Hergé, Franquin, F. Schuiten", ["S2"], [ECA, FR]),
    ("Légende de la Gadale", ["P5"], [FR, FHG]),
    ("Légende du cheval Bayard", ["P5"], [FR, FHG]),
    ("La Louve (légende)", ["P5"], [FR, FHG]),
    ("Dédale et Icare (mythe)", ["P5"], [FR, FHG]),
    ("Œdipe (mythe)", ["P5"], [FR, FHG]),
    ("Tristan et Yseult (légende)", ["P5"], [FR]),
    ("Dracula (légende)", ["P5"], [FR]),
]

SPECTACLES = [
    ("Le mime : M. Marceau, Ch. Chaplin, B. Keaton", ["P1"]),
    ("Marionnettes traditionnelles et contemporaines, théâtre d’ombres", ["P2"]),
    ("Théâtre de rue et cirque", ["P3"]),
    ("Ballets : Casse-noisette, Le Lac des cygnes, Le Sacre du printemps, ballets de M. Béjart, A. Alonso", ["P4"]),
    ("Théâtre et danse « Jeune Public »", ["P4", "P5", "P6"]),
    ("Danses du monde : orientale, africaine, tribale, Haka", ["P6"]),
    ("Danses urbaines : hip-hop, break dance", ["S1"]),
    ("Spectacles pluridisciplinaires (par ex. Light danse, Enra)", ["S2"]),
    ("Danse contemporaine : M.A. De Mey, A.T. De Keersmaeker, M.-C. Pietragalla, M. Béjart", ["S3"]),
]

# (titre, lieu, années)
PATRIMOINE_BELGE = [
    ("Atomium", "Bruxelles", ["P3"]),
    ("Grand-Place de Bruxelles", "Bruxelles", ["P3"]),
    ("Bruges", "Bruges", ["P3"]),
    ("Gare de Liège", "Liège", ["P3"]),
    ("Cathédrale de Tournai", "Tournai", ["P3"]),
    ("Ascenseur à bateaux", None, ["P3"]),
    ("Remparts de Binche", "Binche", ["S1"]),
    ("Archéoforum de Liège", "Liège", ["S1"]),
    ("Abbaye de Villers-la-Ville", "Villers-la-Ville", ["S1"]),
    ("Château fort de Gand", "Gand", ["S1"]),
    ("Château fort de Vêves", "Vêves", ["S1"]),
    ("Château fort de Beersel", "Beersel", ["S1"]),
    ("Place Royale de Bruxelles", "Bruxelles", ["S1"]),
    ("Château de Belœil", "Belœil", ["S1"]),
    ("Théâtre de Namur", "Namur", ["S1"]),
    ("Opéra de Liège", "Liège", ["S1"]),
    ("Palais de Justice de Bruxelles", "Bruxelles", ["S1"]),
]

PATRIMOINE_MONDE = [
    ("Pyramides et Sphinx", "Le Caire, Égypte", ["P6"]),
    ("Taj Mahal", "Inde", ["P6"]),
    ("Muraille de Chine", "Chine", ["P6"]),
    ("Christ de Rio", "Rio, Brésil", ["P6"]),
    ("Tour de Londres", "Londres", ["P6"]),
    ("Place Rouge", "Moscou", ["P6"]),
    ("Machu Picchu", "Pérou", ["P6"]),
    ("Colisée", "Rome", ["P6"]),
    ("Vénus de Milo", None, ["P6"]),
    ("David de Michel-Ange", None, ["P6"]),
    ("Fontaine de Trevi", "Rome", ["P6"]),
    ("Parthénon", "Athènes", ["S1"]),
    ("Byblos", None, ["S1"]),
    ("Notre-Dame de Paris", "Paris", ["S1"]),
    ("Alhambra de Grenade", "Grenade", ["S1"]),
    ("Palais de Schönbrunn", "Vienne", ["S1"]),
    ("Ermitage de Saint-Pétersbourg", "Saint-Pétersbourg", ["S1"]),
    ("Statue de la Liberté", "New York", ["S1"]),
    ("Tour Eiffel", "Paris", ["S1"]),
]


def slug(text: str) -> str:
    import unicodedata

    t = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:48]


def years_label(grades: list[str]) -> str:
    return ", ".join(grades)


rows = []


def add(kind, title, grades, place, subjects, description):
    rows.append({
        "garder": "",
        "code": f"eca-{slug(title)}",
        "type": kind,
        "titre": title,
        "description": description,
        "lieu": place or "",
        "lien": "",
        "verifie_le": "",
        "matieres": " | ".join(subjects),
        "annees": " | ".join(grades),
        "source": f"{SRC} ({years_label(grades)})",
        "remarques": "",
    })


for title, grades in MUSIQUE:
    add("musique", title, grades, None, [ECA], "Œuvre musicale à écouter ensemble, citée par le référentiel d’éducation culturelle et artistique.")
for title, grades in ART:
    add("oeuvre", title, grades, None, [ECA], "Artistes et œuvres à découvrir ensemble (livre, site de musée, exposition), cités par le référentiel.")
for title, grades, subjects in LIVRES:
    add("livre", title, grades, None, subjects, "À lire ou à raconter ensemble ; cité par le référentiel d’éducation culturelle et artistique.")
for title, grades in SPECTACLES:
    add("spectacle", title, grades, None, [ECA], "Forme de spectacle à découvrir (en salle, en vidéo ou lors d’un festival), citée par le référentiel.")
for title, place, grades in PATRIMOINE_BELGE:
    add("patrimoine", title, grades, place, [ECA, FHG], "Lieu du patrimoine belge cité par le référentiel ; idée de sortie en famille.")
for title, place, grades in PATRIMOINE_MONDE:
    add("patrimoine", title, grades, place, [ECA, FHG], "Patrimoine d’ailleurs cité par le référentiel ; à découvrir en images ou en documentaire.")

codes = [r["code"] for r in rows]
assert len(codes) == len(set(codes)), "codes en double"

out = Path(__file__).with_name("a-relire.csv")
if out.exists() and "--force" not in sys.argv:
    sys.exit(f"{out} existe déjà (relecture en cours ?) : relancez avec --force pour l'écraser.")
with out.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";")
    writer.writeheader()
    writer.writerows(rows)
print(f"{len(rows)} candidats → {out}")
