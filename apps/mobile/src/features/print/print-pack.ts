import {
  buildPackHtml,
  buildPacksHtml,
  type LearningSettings,
  type PrintMeta,
  type StudyPack,
} from '@cote-a-cote/shared';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

let fontFaceCss: string | null = null;

/** Police Lexend embarquée dans le PDF (base64), chargée une seule fois. */
async function lexendFontFace(): Promise<string> {
  if (fontFaceCss !== null) return fontFaceCss;
  try {
    const [regular] = await Asset.loadAsync(
      require('@expo-google-fonts/lexend/400Regular/Lexend_400Regular.ttf'),
    );
    const base64 = await new File(regular!.localUri!).base64();
    fontFaceCss = `@font-face { font-family: 'Lexend'; src: url(data:font/ttf;base64,${base64}) format('truetype'); }`;
  } catch {
    // Sans la police, le PDF reste lisible avec Verdana.
    fontFaceCss = '';
  }
  return fontFaceCss;
}

async function html(pack: StudyPack, settings: LearningSettings, meta: PrintMeta) {
  return buildPackHtml(pack, settings, meta, {
    fontFaceCss: await lexendFontFace(),
    fontFamilyName: 'Lexend',
  });
}

/** Ouvre la fenêtre d'impression du téléphone (AirPrint, impression Android). */
export async function printPack(pack: StudyPack, settings: LearningSettings, meta: PrintMeta): Promise<void> {
  await Print.printAsync({ html: await html(pack, settings, meta) });
}

/** Crée le PDF et ouvre la feuille de partage (e-mail, fichiers, messagerie…). */
export async function sharePackPdf(
  pack: StudyPack,
  settings: LearningSettings,
  meta: PrintMeta,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: await html(pack, settings, meta) });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Fiche à imprimer',
    UTI: 'com.adobe.pdf',
  });
}

/** Toutes les fiches de la semaine en un seul document (F10), chacune sur une nouvelle page. */
export async function printPacks(
  items: readonly { pack: StudyPack; meta: PrintMeta }[],
  settings: LearningSettings,
): Promise<void> {
  const html = buildPacksHtml(items, settings, {
    fontFaceCss: await lexendFontFace(),
    fontFamilyName: 'Lexend',
  });
  await Print.printAsync({ html });
}
