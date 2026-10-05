import type { Box } from '@cote-a-cote/shared';
import { ImageFormat, PaintStyle, Skia } from '@shopify/react-native-skia';
import { decode } from 'base64-arraybuffer';

import type { PreparedImage } from './image';

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
