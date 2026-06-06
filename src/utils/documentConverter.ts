import * as PDFLib from 'pdf-lib';
import mammoth from 'mammoth';

/**
 * Checks if a file is supported by our universal client-side conversion engine.
 */
export function isSupportedConvertibleFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  // Directly supported formats
  const supportedExtensions = [
    'pdf',
    'docx',
    'txt', 'md', 'rtf', 'csv', 'json',
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'
  ];
  
  if (ext && supportedExtensions.includes(ext)) {
    return true;
  }
  
  // MIME type checks
  const mimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown', 'text/csv', 'application/json',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'
  ];
  
  return file.type ? mimeTypes.includes(file.type) : false;
}

/**
 * Converts a file (image, text, docx) to standard PDF Uint8Array bytes.
 * If already a PDF, directly returns the array buffer bytes.
 */
export async function convertAndGetPdfBytes(file: File): Promise<Uint8Array> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. If it's already a PDF, return the bytes directly (extremely fast!)
  if (file.type === 'application/pdf' || ext === 'pdf') {
    const arrBuffer = await file.arrayBuffer();
    return new Uint8Array(arrBuffer);
  }

  // Create a new PDF document using pdf-lib
  const pdfDoc = await PDFLib.PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const monospaceFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);

  // 2. Handle Image documents
  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
  if (imageExtensions.includes(ext) || file.type.startsWith('image/')) {
    await convertImageToPdf(file, pdfDoc);
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  // 3. Handle Word documents (.docx)
  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const textContent = result.value || '';
    
    await drawTextToPdf(textContent, file.name, pdfDoc, helveticaFont, helveticaBold, true);
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  // 4. Handle plain text / markdown files
  const textExtensions = ['txt', 'md', 'rtf', 'csv', 'json'];
  if (textExtensions.includes(ext) || file.type.startsWith('text/') || file.type === 'application/json') {
    const textContent = await file.text();
    const isCodeOrData = ['json', 'csv'].includes(ext);
    await drawTextToPdf(textContent, file.name, pdfDoc, isCodeOrData ? monospaceFont : helveticaFont, helveticaBold, false);
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

/**
 * Standard utility to draw image file context onto standard sized page canvases
 */
async function convertImageToPdf(file: File, pdfDoc: PDFLib.PDFDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas render context initialization failed");
        
        ctx.drawImage(img, 0, 0);
        
        // Export to a high-quality standard PNG
        const pngUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngUrl).then(res => res.arrayBuffer());
        
        const embeddedImg = await pdfDoc.embedPng(pngBytes);
        
        // Standard Letter Format 612 x 792 layout page
        const page = pdfDoc.addPage([612, 792]);
        const { width: pWidth, height: pHeight } = page.getSize();
        
        // Compute standard proportional scales to maintain aspect ratio perfectly
        const margin = 54; // 0.75in margins
        const targetWidth = pWidth - (margin * 2);
        const targetHeight = pHeight - (margin * 2);
        
        const scale = Math.min(targetWidth / embeddedImg.width, targetHeight / embeddedImg.height, 1);
        const drawWidth = embeddedImg.width * scale;
        const drawHeight = embeddedImg.height * scale;
        
        const xOffset = (pWidth - drawWidth) / 2;
        const yOffset = (pHeight - drawHeight) / 2;
        
        // Ambient illustration border shadows for presentation
        page.drawRectangle({
          x: xOffset - 1,
          y: yOffset - 1,
          width: drawWidth + 2,
          height: drawHeight + 2,
          color: PDFLib.rgb(0.85, 0.86, 0.9),
        });

        page.drawImage(embeddedImg, {
          x: xOffset,
          y: yOffset,
          width: drawWidth,
          height: drawHeight,
        });

        URL.revokeObjectURL(objectUrl);
        resolve();
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode uploaded image structure"));
    };
  });
}

function sanitizeWinAnsiText(text: string): string {
  if (!text) return '';
  const clean = text
    .replace(/[\u2011\u2012\u2013\u2500\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019\u201a\u201b\u2039\u203a]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\xab\xbb]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u2022\u25aa\u25fe\u25fc\u25cf]/g, '*')
    .replace(/[\u00a0]/g, ' ')
    .replace(/[\u20ac]/g, '€');

  let result = '';
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      result += clean[i];
    } else if (code === 10 || code === 13 || code === 9) {
      result += clean[i];
    } else if (code >= 128 && code <= 255) {
      result += clean[i];
    } else {
      result += '?';
    }
  }
  return result;
}

/**
 * Beautiful dynamic text renderer supporting Word count wrapped paginations
 */
async function drawTextToPdf(
  rawText: string, 
  titleName: string, 
  pdfDoc: PDFLib.PDFDocument, 
  bodyFont: any, 
  boldFont: any,
  isDocx: boolean
): Promise<void> {
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 54; // 0.75 in
  const usableWidth = pageWidth - (margin * 2);
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Render modern aesthetic header title block
  const safeTitle = sanitizeWinAnsiText(titleName.toUpperCase());
  page.drawText(safeTitle, {
    x: margin,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: PDFLib.rgb(0.12, 0.16, 0.27),
  });
  yPosition -= 14;

  const safeSubtitle = sanitizeWinAnsiText(`Converted document edit workspace - Generated ${new Date().toLocaleDateString()}`);
  page.drawText(safeSubtitle, {
    x: margin,
    y: yPosition,
    size: 8,
    font: bodyFont,
    color: PDFLib.rgb(0.4, 0.5, 0.6),
  });
  yPosition -= 18;

  // Draw thin divider line
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: usableWidth,
    height: 1,
    color: PDFLib.rgb(0.8, 0.82, 0.88),
  });
  yPosition -= 24;

  const paragraphs = rawText.split(/\r?\n/);
  const fontSize = 10;
  const leading = 14;
  const paragraphSpacing = 10;

  for (let p of paragraphs) {
    p = p.trim();
    if (!p) {
      yPosition -= paragraphSpacing;
      continue;
    }

    // Split paragraph words to format into lines
    const words = p.split(/\s+/);
    let currentLine = '';
    const lines: string[] = [];

    for (const word of words) {
      const sanitizedWord = sanitizeWinAnsiText(word);
      const testLine = currentLine ? `${currentLine} ${sanitizedWord}` : sanitizedWord;
      const testWidth = bodyFont.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > usableWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = sanitizedWord;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Draw the wrapped lines to PDF canvas, auto spanning new pages
    for (const line of lines) {
      if (yPosition < margin + leading) {
        // Exceed page boundaries, allocate new page sheet
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: bodyFont,
        color: PDFLib.rgb(0.18, 0.23, 0.35),
      });

      yPosition -= leading;
    }

    yPosition -= paragraphSpacing;
  }
}
