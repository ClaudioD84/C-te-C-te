import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

/** Côté le plus long : assez pour lire l'écriture, sans alourdir l'envoi ni le coût de l'IA. */
const MAX_SIDE = 1600;

/** Redimensionne et convertit en JPEG. Les zones de masquage sont exprimées dans ces dimensions. */
export async function prepareImage(uri: string, width: number, height: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return { uri: result.uri, width: result.width, height: result.height };
}

export { renderMaskedJpeg } from './mask-render';
