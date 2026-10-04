import type { RecognizedWord } from '@cote-a-cote/shared';
import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * Reconnaissance de texte sur l'appareil (ML Kit), sans réseau.
 * Renvoie null si le module natif n'est pas disponible (Expo Go, web) :
 * le parent masque alors les noms à la main.
 */
export async function recognizeWords(uri: string): Promise<RecognizedWord[] | null> {
  try {
    const result = await TextRecognition.recognize(uri);
    return result.blocks.flatMap((block) =>
      block.lines.flatMap((line) =>
        line.elements.flatMap((element) =>
          element.frame ? [{ text: element.text, frame: element.frame }] : [],
        ),
      ),
    );
  } catch {
    return null;
  }
}
