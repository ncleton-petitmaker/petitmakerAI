declare module 'html2pdf.js' {
  interface Options {
    margin?: number;
    filename?: string;
    image?: { type?: string; quality?: number };
    jsPDF?: { unit?: string; format?: string; orientation?: string };
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean };
  }

  interface Html2Pdf {
    from(element: HTMLElement): Html2Pdf;
    set(options: Options): Html2Pdf;
    save(): Promise<void>;
    outputPdf(type: string): Promise<Blob>;
  }

  function html2pdf(): Html2Pdf;
  export default html2pdf;
}

declare module 'react-signature-canvas' {
  import { Component } from 'react';
  
  interface SignatureCanvasProps {
    penColor?: string;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    minWidth?: number;
    maxWidth?: number;
    velocityFilterWeight?: number;
    backgroundColor?: string;
    dotSize?: number;
    onBegin?: () => void;
    onEnd?: () => void;
    clearOnResize?: boolean;
  }
  
  class SignatureCanvas extends Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    getTrimmedCanvas(): HTMLCanvasElement;
    getCanvas(): HTMLCanvasElement;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataURL: string): void;
  }
  
  export default SignatureCanvas;
}











