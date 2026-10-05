#!/usr/bin/env bash
# Régénère les fichiers donnees/*.json à partir des PDF officiels (enseignement.be), puis le SQL d'import.
# Usage : scripts/referentiels/regenerer.sh <dossier des PDF>
# Les PDF se téléchargent depuis la page « Contenus d'apprentissage » d'enseignement.be (voir README).
set -euo pipefail

PDF_DIR="${1:?Indiquez le dossier contenant les PDF des référentiels}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/donnees"
BASE="https://www.enseignement.be/fileadmin/portail_age/uploads/parcours_apprentissage/maternel_primaire_ordinaire/Organisation/Contenus_apprentissages_Maternel_Primaire/Referentiels"
TAGS="parler,écouter,lire,écrire"

run() {
  local file="$1" out="$2"; shift 2
  python3 "$HERE/decouper.py" "$PDF_DIR/$file" --url "$BASE/$file" "$@" > "$OUT/$out" 2>/dev/null
  echo "✔ $out"
}

run 2022_REF_Mathematiques.pdf ma-2022.json --matiere "Mathématiques" --prefixe MA --version 2022 \
  --titre "Référentiel de Mathématiques (tronc commun)"
run 2022_REF_Francais-FRALA.pdf fr-2022.json --mode generique --ignorer "$TAGS" --matiere "Français" --prefixe FR \
  --version 2022 --titre "Référentiel de Français et de Langues anciennes (tronc commun)"
run 2022_REF_Sciences.pdf sc-2022.json --mode generique --matiere "Sciences" --prefixe SC --version 2022 \
  --titre "Référentiel de Sciences (tronc commun)"
run 2022_REF_Lang-mod-LM.pdf lm-2022.json --mode generique --matiere "Langue moderne" --prefixe LM --version 2022 \
  --titre "Référentiel de Langues modernes (tronc commun)"
run 2022_REF_Hist-geo-FHGES.pdf hg-2022.json --mode colonnes --matiere "Formation historique et géographique" \
  --prefixe HG --version 2022 \
  --titre "Référentiel de Formation historique, géographique, économique et sociale (tronc commun)"
run 2020_REF_Comp-initia-M1M3.pdf mat-2020.json --mode maternelle --ignorer "$TAGS" --matiere "Maternelle" \
  --niveau maternelle --prefixe MAT --version 2020 --titre "Référentiel des compétences initiales (maternelle, tronc commun)"

cd "$HERE/../.."
deno run --config scripts/referentiels/deno.json --allow-read --allow-write scripts/referentiels/importer.ts
