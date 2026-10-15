import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  /** Contenu JPEG en base64, envoyé tel quel. */
  base64: string;
}

/** Côté le plus long : assez pour lire l'écriture, sans alourdir l'envoi ni le coût de l'IA. */
const MAX_SIDE = 1600;

/** Redimensionne et convertit en JPEG (ce qui retire aussi les métadonnées de la photo, dont la position). */
export async function prepareImage(uri: string, width: number, height: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!result.base64) throw new Error("Impossible de préparer l'image");
  return { uri: result.uri, width: result.width, height: result.height, base64: result.base64 };
}

/** Octets du JPEG préparé, pour l'envoi. */
export function jpegBytes(image: PreparedImage): ArrayBuffer {
  return decode(image.base64);
}
