// Type declaration for jspdf to help TypeScript resolve the module
declare module 'jspdf' {
  export interface jsPDFOptions {
    orientation?: 'portrait' | 'landscape';
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em';
    format?: string | number[];
    compress?: boolean;
    precision?: number;
    userUnit?: number;
    encryption?: any;
    putOnlyUsedFonts?: boolean;
    floatPrecision?: number | 'smart';
  }

  export default class jsPDF {
    constructor(options?: jsPDFOptions);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    setFontSize(size: number): jsPDF;
    setTextColor(color: string | number | number[]): jsPDF;
    setFont(face: string, style?: string): jsPDF;
    save(filename?: string): void;
    output(type?: string, options?: any): string | Uint8Array | ArrayBuffer | Blob;
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    [key: string]: any;
  }
}
