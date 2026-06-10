declare module 'opentype.js' {
  export class Path {
    constructor();
    close(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadTo(x1: number, y1: number, x: number, y: number): void;
    curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
    toSVG(): string;
    toPathData(decimalPlaces?: number): string;
  }

  export class Glyph {
    constructor(options: { name?: string; unicode?: number; advanceWidth?: number; path?: Path });
    getPath(x?: number, y?: number, fontSize?: number): Path;
  }

  export class Font {
    constructor(options: {
      familyName: string;
      styleName?: string;
      unitsPerEm?: number;
      ascender?: number;
      descender?: number;
      glyphs: Glyph[];
    });
    toArrayBuffer(): ArrayBuffer;
    download(fileName?: string): void;
  }

  export function load(url: string, callback: (err?: Error, font?: Font) => void): void;
  export function parse(buffer: ArrayBuffer): Font;
}