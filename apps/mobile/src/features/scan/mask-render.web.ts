import type { Box } from '@cote-a-cote/shared';

import type { PreparedImage } from './image';

/**
 * Version web (démonstration sur ordinateur) : même résultat qu'avec Skia sur téléphone, avec le canevas du
 * navigateur. Des rectangles opaques recouvrent les zones ; un aplat est irréversible, contrairement à un flou.
 */
export async function renderMaskedJpeg(image: PreparedImage, boxes: readonly Box[]): Promise<ArrayBuffer> {
  const source = new Image();
  source.src = image.uri;
  await source.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Impossible de préparer l'image");
  context.drawImage(source, 0, 0, image.width, image.height);
  context.fillStyle = 'black';
  for (const box of boxes) context.fillRect(box.left, box.top, box.width, box.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error("Impossible de préparer l'image");
  return blob.arrayBuffer();
}
