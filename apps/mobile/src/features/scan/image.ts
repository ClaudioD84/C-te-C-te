import type { Box } from '@cote-a-cote/shared';
import { ImageFormat, PaintStyle, Skia } from '@shopify/react-native-skia';
import { decode } from 'base64-arraybuffer';
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

/**
 * Dessine des rectangles opaques sur l'image et renvoie le JPEG obtenu.
 * Un aplat est irréversible, contrairement à un flou.
 */
export async function renderMaskedJpeg(image: PreparedImage, boxes: readonly Box[]): Promise<ArrayBuffer> {
  const data = await Skia.Data.fromURI(image.uri);
  const source = Skia.Image.MakeImageFromEncoded(data);
  const surface = Skia.Surface.MakeOffscreen(image.width, image.height);
  if (!source || !surface) throw new Error("Impossible de préparer l'image");

  const canvas = surface.getCanvas();
  canvas.drawImage(source, 0, 0);
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('black'));
  paint.setStyle(PaintStyle.Fill);
  for (const box of boxes) {
    canvas.drawRect(Skia.XYWHRect(box.left, box.top, box.width, box.height), paint);
  }
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 85);
  return decode(base64);
}
