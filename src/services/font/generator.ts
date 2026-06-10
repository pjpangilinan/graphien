async function imageBlobToPath(
  blob: Blob,
  glyphWidth: number,
  glyphHeight: number,
) {
  const opentype = await import('opentype.js');
  const path = new opentype.Path();

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const scale = Math.min(glyphWidth / bitmap.width, glyphHeight / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(bitmap, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);

  const pixelW = glyphWidth / w;
  const pixelH = glyphHeight / h;

  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const idx = (y * w + x) * 4;
      if (imgData.data[idx + 3] > 128) {
        const startX = x;
        let endX = x + 1;
        while (endX < w) {
          const idx2 = (y * w + endX) * 4;
          if (imgData.data[idx2 + 3] <= 128) break;
          endX++;
        }
        const x0 = startX * pixelW;
        const y0 = (h - y - 1) * pixelH;
        const rw = (endX - startX) * pixelW;
        const rh = pixelH;
        path.moveTo(x0, y0);
        path.lineTo(x0 + rw, y0);
        path.lineTo(x0 + rw, y0 + rh);
        path.lineTo(x0, y0 + rh);
        path.close();
        x = endX;
      } else {
        x++;
      }
    }
  }

  return path;
}

export async function generateFont(
  mappings: { character: string; imageData: Blob }[],
): Promise<Blob> {
  if (mappings.length === 0) {
    throw new Error('At least one mapping is required.');
  }

  try {
    const opentype = await import('opentype.js');
    const glyphs: Array<InstanceType<typeof opentype.Glyph>> = [];
    const notDefGlyph = new opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 600,
      path: new opentype.Path(),
    });
    glyphs.push(notDefGlyph);

    for (const mapping of mappings) {
      const unicode = mapping.character.charCodeAt(0);
      const path = await imageBlobToPath(mapping.imageData, 600, 700);

      const glyph = new opentype.Glyph({
        name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
        unicode,
        advanceWidth: 600,
        path,
      });
      glyphs.push(glyph);
    }

    const font = new opentype.Font({
      familyName: 'Graphien Custom',
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs,
    });

    const buffer = font.toArrayBuffer();
    return new Blob([buffer], { type: 'font/ttf' });
  } catch {
    return generateDummyFont(mappings);
  }
}

async function generateDummyFont(
  mappings: { character: string; imageData: Blob }[],
): Promise<Blob> {
  const opentype = await import('opentype.js');
  const glyphs: Array<InstanceType<typeof opentype.Glyph>> = [];
  const notDefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 600,
    path: new opentype.Path(),
  });
  glyphs.push(notDefGlyph);

  for (const mapping of mappings) {
    const unicode = mapping.character.charCodeAt(0);
    const glyph = new opentype.Glyph({
      name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
      unicode,
      advanceWidth: 600,
      path: new opentype.Path(),
    });
    glyphs.push(glyph);
  }

  const font = new opentype.Font({
    familyName: 'Graphien Custom',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs,
  });

  const buffer = font.toArrayBuffer();
  return new Blob([buffer], { type: 'font/ttf' });
}
