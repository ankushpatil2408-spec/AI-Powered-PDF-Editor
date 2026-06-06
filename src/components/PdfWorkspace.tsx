import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ZoomIn, ZoomOut, Save, Download, Sparkles, 
  RotateCcw, History, FileDown, CheckCircle, ChevronLeft, 
  ChevronRight, RefreshCw, Wand2, HelpCircle, Loader2, Trash2, FileType
} from 'lucide-react';
import { PdfFile, PdfProject, EditHistory, TextStyleParams } from '../types.js';
import * as PDFLib from 'pdf-lib';

// Extend window interface to prevent TS compiler complains about global CDN variables
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

function sanitizeWinAnsiText(text: string, font?: any): string {
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
    const char = clean[i];
    const code = clean.charCodeAt(i);
    
    if (code === 0x83 || code === 131) {
      result += 'f';
      continue;
    }

    if (font) {
      try {
        font.encodeText(char);
        result += char;
      } catch (e) {
        if (code === 8482) { // Trademark
          result += '(TM)';
        } else if (code === 174) { // Registered
          result += '(R)';
        } else if (code === 169) { // Copyright
          result += '(C)';
        } else {
          result += ' ';
        }
      }
    } else {
      if (code >= 32 && code <= 126) {
        result += char;
      } else if (code === 10 || code === 13 || code === 9) {
        result += char;
      } else if (code >= 128 && code <= 255) {
        result += char;
      } else {
        result += '?';
      }
    }
  }
  return result;
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = arr.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

function calculateAutoShiftX(item: ExtractedTextItem, list: ExtractedTextItem[]): number {
  let shiftSum = 0;
  for (const other of list) {
    if (other.id === item.id) continue;
    const isSameBaseline = Math.abs(other.tx[5] - item.tx[5]) < 4;
    const isToLeft = other.tx[4] < item.tx[4];
    
    if (isSameBaseline && isToLeft) {
      const originalText = other.originalText || '';
      const originalWidth = other.width || 0;
      const fontSize = other.tx[3] || 10;
      const charWidth = originalText.length > 0 ? (originalWidth / originalText.length) : (fontSize * 0.5);
      
      const modifiedTextLength = (other.modifiedText ?? '').length;
      const originalTextLength = originalText.length;
      
      const dWidth = (modifiedTextLength - originalTextLength) * charWidth;
      shiftSum += dWidth;
    }
  }
  return shiftSum;
}

interface PdfWorkspaceProps {
  project: PdfProject;
  file: PdfFile;
  onBack: () => void;
  onFileSaved: () => void;
}

interface ExtractedTextItem {
  id: string;
  originalText: string;
  modifiedText: string;
  // Raw PDF coordinates
  tx: any; // affine transform matrix [scaleX, skewY, skewX, scaleY, transX, transY]
  width: number;
  height: number;
  fontName: string;
  fallbackFontFamily?: string;
  customStyles?: TextStyleParams;
}

// Group and merge separate PDF.js text items that are part of the same line sequence
function mergeCloseTextItems(items: ExtractedTextItem[]): ExtractedTextItem[] {
  if (items.length === 0) return [];

  // Group items by vertical baseline coordinate tx[5].
  // Slight floating precision differences are bound by a small vertical tolerance.
  const baselineGroups: { y: number; items: ExtractedTextItem[] }[] = [];

  for (const item of items) {
    const yVal = item.tx[5];
    const fontSize = item.tx[3] || 10;
    const tolerance = fontSize * 0.45; // 45% of fontSize as line spacing tolerance

    let foundGroup = baselineGroups.find(g => Math.abs(g.y - yVal) < tolerance);
    if (foundGroup) {
      foundGroup.items.push(item);
    } else {
      baselineGroups.push({ y: yVal, items: [item] });
    }
  }

  const mergedList: ExtractedTextItem[] = [];

  for (const group of baselineGroups) {
    // Sort horizontally (left-to-right)
    const sorted = [...group.items].sort((a, b) => a.tx[4] - b.tx[4]);

    let currentMerge: ExtractedTextItem | null = null;

    for (const item of sorted) {
      if (!currentMerge) {
        currentMerge = { ...item };
        continue;
      }

      const prevXEnd = currentMerge.tx[4] + currentMerge.width;
      const currentXStart = item.tx[4];
      const gap = currentXStart - prevXEnd;

      const fontSize = currentMerge.tx[3] || 10;

      // Merge items if gap is small enough to indicate they are parts of the same row line
      if (gap < fontSize * 3.5) {
        const needsSpace = gap > fontSize * 0.08 && 
                           !currentMerge.originalText.endsWith(' ') && 
                           !item.originalText.startsWith(' ');

        const separator = needsSpace ? ' ' : '';
        currentMerge.originalText += separator + item.originalText;
        currentMerge.modifiedText += separator + item.modifiedText;

        // Cumulative width span
        currentMerge.width = (item.tx[4] + item.width) - currentMerge.tx[4];
        currentMerge.height = Math.max(currentMerge.height, item.height);
      } else {
        mergedList.push(currentMerge);
        currentMerge = { ...item };
      }
    }

    if (currentMerge) {
      mergedList.push(currentMerge);
    }
  }

  // Sort top-to-bottom, then left-to-right
  return mergedList.sort((a, b) => {
    const diffY = b.tx[5] - a.tx[5];
    if (Math.abs(diffY) > 4) return diffY;
    return a.tx[4] - b.tx[4];
  });
}

// Smart Font Style Detector based on name fingerprints and fallback families mapped by PDF.js
function getCssStyleForFont(fontName: string, fallbackFontFamily?: string) {
  const name = (fontName || '').toLowerCase();
  const fallback = (fallbackFontFamily || '').toLowerCase();
  
  const styles: { fontFamily: string; fontWeight: string; fontStyle: string } = {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '400',
    fontStyle: 'normal'
  };

  // Serif fonts criteria
  const isSerif = name.includes('times') || 
                  name.includes('georgia') || 
                  name.includes('serif') || 
                  name.includes('minion') || 
                  name.includes('garamond') || 
                  name.includes('cambria') || 
                  name.includes('roman') ||
                  fallback.includes('serif') ||
                  fallback.includes('times');

  // Monospace fonts criteria
  const isMono = name.includes('courier') || 
                 name.includes('mono') || 
                 name.includes('console') || 
                 name.includes('code') ||
                 name.includes('lucida') ||
                 fallback.includes('monospace') ||
                 fallback.includes('courier');

  // Sans-serif fonts criteria
  const isSans = name.includes('sans') || 
                 name.includes('helvetica') || 
                 name.includes('arial') || 
                 name.includes('inter') || 
                 name.includes('grotesk') ||
                 name.includes('calibri') ||
                 name.includes('verdana') ||
                 name.includes('tahoma') ||
                 name.includes('segoe') ||
                 name.includes('myriad') ||
                 fallback.includes('sans-serif') ||
                 fallback.includes('helvetica');

  if (isSerif) {
    if (name.includes('times') || name.includes('roman')) {
      styles.fontFamily = '"Times New Roman", Times, Georgia, serif';
    } else if (name.includes('garamond')) {
      styles.fontFamily = 'Garamond, "Baskerville Old Face", serif';
    } else {
      styles.fontFamily = 'Georgia, "Times New Roman", serif';
    }
  } else if (isMono) {
    styles.fontFamily = '"JetBrains Mono", Courier, "Courier New", monospace';
  } else if (isSans) {
    if (name.includes('arial')) {
      styles.fontFamily = 'Arial, sans-serif';
    } else if (name.includes('calibri')) {
      styles.fontFamily = 'Calibri, sans-serif';
    } else if (name.includes('verdana')) {
      styles.fontFamily = 'Verdana, sans-serif';
    } else if (name.includes('tahoma')) {
      styles.fontFamily = 'Tahoma, sans-serif';
    } else {
      styles.fontFamily = 'Inter, system-ui, Helvetica, Arial, sans-serif';
    }
  } else {
    // If we have some specific style info, let's use it
    if (fallbackFontFamily) {
      styles.fontFamily = `"${fallbackFontFamily}", Inter, sans-serif`;
    }
  }

  // Weight detection
  if (
    name.includes('bold') || 
    name.includes('heavy') || 
    name.includes('black') || 
    name.includes('-bd') || 
    name.includes('_bd') || 
    name.includes('w-700') || 
    name.includes('w-800') || 
    name.includes('w-900') ||
    fallback.includes('bold')
  ) {
    styles.fontWeight = '700';
  } else if (
    name.includes('medium') || 
    name.includes('semibold') || 
    name.includes('w-500') || 
    name.includes('w-600') ||
    fallback.includes('medium')
  ) {
    styles.fontWeight = '600';
  } else {
    styles.fontWeight = '400';
  }

  // Italic detection
  if (
    name.includes('italic') || 
    name.includes('oblique') || 
    name.includes('-it') || 
    name.includes('_it') ||
    fallback.includes('italic') ||
    fallback.includes('oblique')
  ) {
    styles.fontStyle = 'italic';
  } else {
    styles.fontStyle = 'normal';
  }

  return styles;
}

// Map the PDF.js font descriptor dynamically to standard 14 pdf-lib fonts
async function getPdfLibFont(fontName: string, pdfDoc: any) {
  const name = (fontName || '').toLowerCase();
  const isItalic = name.includes('italic') || name.includes('oblique') || name.includes('-it') || name.includes('_it');
  const isBold = name.includes('bold') || name.includes('heavy') || name.includes('black') || name.includes('-bd') || name.includes('_bd') || name.includes('w-700') || name.includes('w-800') || name.includes('w-900');

  if (
    name.includes('times') || 
    name.includes('georgia') || 
    name.includes('serif') || 
    name.includes('minion') || 
    name.includes('garamond') || 
    name.includes('cambria') || 
    name.includes('roman')
  ) {
    if (isBold && isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic);
    if (isBold) return await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
    if (isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanItalic);
    return await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
  } else if (
    name.includes('courier') || 
    name.includes('mono') || 
    name.includes('console') || 
    name.includes('code')
  ) {
    if (isBold && isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBoldOblique);
    if (isBold) return await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBold);
    if (isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.CourierOblique);
    return await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
  } else {
    if (isBold && isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique);
    if (isBold) return await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    if (isItalic) return await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique);
    return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  }
}

export default function PdfWorkspace({ project, file, onBack, onFileSaved }: PdfWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPdfBytes, setCurrentPdfBytes] = useState<Uint8Array | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [highlightFields, setHighlightFields] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // Text extraction states
  const [pageTextItems, setPageTextItems] = useState<ExtractedTextItem[]>([]);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const [isExtracting, setIsExtracting] = useState(false);

  // History & Sidebar
  const [historyLogs, setHistoryLogs] = useState<EditHistory[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  // Gemini backend dynamic insights
  const [insights, setInsights] = useState<{ fileName: string; totalEdits: number; summary: string; tone: string; integrity: string } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // AI Assistant panel state
  const [selectedTextItem, setSelectedTextItem] = useState<ExtractedTextItem | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'style' | 'ai'>('style');
  const [aiInstruction, setAiInstruction] = useState('Polished, professional corporate language');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [fineNudgeStep, setFineNudgeStep] = useState<number>(0.5);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastCompileIsDraft, setLastCompileIsDraft] = useState(false);
  const lastCompiledPdfBytesRef = useRef<Uint8Array | null>(null);

  // Refs for canvas rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const documentRef = useRef<any>(null);
  const lastRenderedBytesRef = useRef<Uint8Array | null>(null);

  // Load PDF file bytes on startup
  useEffect(() => {
    loadPdfDocument();
    fetchHistory();
    fetchInsights();
  }, [file.id]);

  // Re-render page if currentPage index, zoom scales, or loading status change
  useEffect(() => {
    if (currentPdfBytes && window.pdfjsLib && !loading) {
      renderPdfPage();
    }
  }, [currentPage, zoom, currentPdfBytes, loading]);

  const loadPdfDocument = async () => {
    try {
      setLoading(true);
      
      let dataToDecode = file.currentData;
      if (!dataToDecode || dataToDecode.trim() === "") {
        dataToDecode = file.originalData;
      }
      
      let binaryString = "";
      try {
        binaryString = atob(dataToDecode);
      } catch (e) {
        console.error("Failed to decode currentData base64, falling back to originalData", e);
        binaryString = atob(file.originalData);
      }
      
      // Secondary safety check: verify the standard %PDF- magic bytes header is present
      if (!binaryString.startsWith("%PDF-")) {
        console.warn("Decoded currentData lacks direct %PDF- header, falling back to originalData");
        binaryString = atob(file.originalData);
      }

      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      setCurrentPdfBytes(bytes);

      if (!window.pdfjsLib) {
        throw new Error("PDF.js library could not be resolved from index.html CDNs");
      }

      // Use a copy to prevent the pdf.js Web Worker from detaching the ArrayBuffer of our original bytes
      const bytesForPdfjs = bytes.slice();
      const pdfDoc = await window.pdfjsLib.getDocument({ data: bytesForPdfjs }).promise;
      documentRef.current = pdfDoc;
      setTotalPages(pdfDoc.numPages);
      
      // Update database metadata if necessary
      if (file.pageCount !== pdfDoc.numPages) {
        await fetch(`/api/files/${file.id}/pagecount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageCount: pdfDoc.numPages })
        });
      }

    } catch (err) {
      console.error("Critical PDF compilation parsing crash:", err);
      alert("Failed to load PDF viewer correctly. Ensure you uploaded a valid document format.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/files/${file.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
        return data;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await fetch(`/api/files/${file.id}/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to gather PDF background insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleRevertHistory = async (historyId: string) => {
    try {
      const res = await fetch(`/api/files/${file.id}/history/${historyId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const newHist = await fetchHistory();
        await fetchInsights();
        if (newHist) {
          renderPdfPage(newHist);
        }
      } else {
        alert("Unable to clean revision logs from database.");
      }
    } catch (err) {
      console.error("Failed to commit reversion:", err);
    }
  };

  const renderPdfPage = async (overrideHistoryLogs?: EditHistory[]) => {
    if (!currentPdfBytes || !canvasRef.current) return;
    
    try {
      setIsExtracting(true);

      // Re-load the PDF document if currentPdfBytes changed (e.g. after compiling changes)
      if (!documentRef.current || lastRenderedBytesRef.current !== currentPdfBytes) {
        if (window.pdfjsLib) {
          const bytesForPdfjs = currentPdfBytes.slice();
          const pdfDoc = await window.pdfjsLib.getDocument({ data: bytesForPdfjs }).promise;
          documentRef.current = pdfDoc;
          setTotalPages(pdfDoc.numPages);
          lastRenderedBytesRef.current = currentPdfBytes;
        }
      }

      if (!documentRef.current) return;

      // Cancel outstanding render threads
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await documentRef.current.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoom });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Adjust pixel densities for eye-safe rendering high clarity screens
      const ratio = window.devicePixelRatio || 1;
      canvas.width = viewport.width * ratio;
      canvas.height = viewport.height * ratio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.scale(ratio, ratio);

      setViewportDimensions({ width: viewport.width, height: viewport.height });

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      // EXTRAC TEXT BOUNDARY LAYER
      const textContent = await page.getTextContent();
      const textStyles = textContent.styles || {};
      
      // Transform PDF points directly onto HTML Coordinate spaces
      const rawItems: ExtractedTextItem[] = textContent.items
        .filter((item: any) => item.str.trim() !== '') // Remove layout pads
        .map((item: any, idx: number) => {
          const styleInfo = textStyles[item.fontName] || {};
          return {
            id: `txt_${idx}_page_${currentPage}`,
            originalText: item.str,
            modifiedText: item.str,
            tx: item.transform, // Affine matrix: index 4 = x, index 5 = y
            width: item.width,
            height: item.height || item.transform[3], // Fallback to font height
            fontName: item.fontName,
            fallbackFontFamily: styleInfo.fontFamily || ''
          };
        });

      const items = mergeCloseTextItems(rawItems);

      // Cross-reference existing modifications on this page from our Relational revision history logs
      // This replicates "dynamic state loading" so changes look merged local persistence-wise!
      const currentHistories = overrideHistoryLogs || historyLogs;
      const pageHistories = currentHistories.filter(h => h.pageIndex === (currentPage - 1));
      
      // Re-apply cumulative edits to coordinates so they re-render correctly
      const mergedItems = items.map(extItem => {
        // Find if this specific block baseline was modified
        const historyMatch = pageHistories.find(h => 
          Math.abs(h.styleParams.x - extItem.tx[4]) < 2 && 
          Math.abs(h.styleParams.y - extItem.tx[5]) < 2
        );
        if (historyMatch) {
          return { 
            ...extItem, 
            modifiedText: historyMatch.modifiedText,
            customStyles: historyMatch.styleParams
          };
        }
        return extItem;
      });

      setPageTextItems(mergedItems);

    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("Layout page render error:", err);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  // Capture inline input changes from ContentEditable
  const handleTextChange = async (itemId: string, newText: string) => {
    const matchedItem = pageTextItems.find(it => it.id === itemId);
    if (!matchedItem) return;

    // Check if both text and style are unchanged
    if (matchedItem.modifiedText === newText && matchedItem.customStyles) return;

    // Update frontend visual state
    setPageTextItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, modifiedText: newText };
      }
      return item;
    }));

    // Package database params representing DTO request
    const mockStyleParams: TextStyleParams = matchedItem.customStyles || {
      fontFamily: matchedItem.fontName,
      fontSize: matchedItem.tx[3], // font size in points
      color: '#1e293b',
      x: matchedItem.tx[4], // original PDF coordinate x space
      y: matchedItem.tx[5], // original PDF coordinate y space
      width: matchedItem.width,
      height: matchedItem.height,
      hasMask: true
    };

    try {
      // POST edit events to back-end repo controller layer
      const res = await fetch(`/api/files/${file.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          projectId: project.id,
          pageIndex: currentPage - 1,
          originalText: matchedItem.modifiedText, // previous edited content represents origin
          modifiedText: newText,
          styleParams: mockStyleParams
        })
      });

      if (res.ok) {
        await fetchHistory(); // Pull updated JpaRepository listing
        await fetchInsights(); // Dynamically re-analyze document elements
      }
    } catch (err) {
      console.error("Failed to commit edit history:", err);
    }
  };

  // Capture manually selected typography style modifications
  const handleStyleChange = async (itemId: string, updatedParams: Partial<TextStyleParams>) => {
    const matchedItem = pageTextItems.find(it => it.id === itemId);
    if (!matchedItem) return;

    // Build the fully merged state
    const currentStyles: TextStyleParams = matchedItem.customStyles || {
      fontFamily: matchedItem.fontName,
      fontSize: matchedItem.tx[3], // font size in points
      color: '#010f3c',
      x: matchedItem.tx[4], // original PDF coordinate x space
      y: matchedItem.tx[5], // original PDF coordinate y space
      width: matchedItem.width,
      height: matchedItem.height,
      hasMask: true
    };

    const finalStyles: TextStyleParams = {
      ...currentStyles,
      ...updatedParams
    };

    // Update frontend visual state
    setPageTextItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, customStyles: finalStyles };
      }
      return item;
    }));

    // Update active selected item to keep current sidebars in sync
    setSelectedTextItem(prev => {
      if (prev && prev.id === itemId) {
        return { ...prev, customStyles: finalStyles };
      }
      return prev;
    });

    try {
      // POST edit events to back-end repo controller layer
      const res = await fetch(`/api/files/${file.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          projectId: project.id,
          pageIndex: currentPage - 1,
          originalText: matchedItem.originalText,
          modifiedText: matchedItem.modifiedText,
          styleParams: finalStyles
        })
      });

      if (res.ok) {
        await fetchHistory();
      }
    } catch (err) {
      console.error("Failed to commit style override details:", err);
    }
  };

  // Use Gemini to optimize text selection
  const handleAiPolishRequest = async () => {
    if (!selectedTextItem) return;

    try {
      setIsAiProcessing(true);
      setAiError(null);
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedTextItem.modifiedText,
          instruction: aiInstruction
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.polishedText);
        
        // Auto-apply if requested immediately or let users confirm
        handleTextChange(selectedTextItem.id, data.polishedText);
        setPageTextItems(prev => prev.map(item => {
          if (item.id === selectedTextItem.id) {
            return { ...item, modifiedText: data.polishedText };
          }
          return item;
        }));
      } else {
        const errorData = await res.json();
        let errMsg = errorData.message || "Failed to process text";
        if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("429")) {
          errMsg = "Gemini API free-tier limit reached (429 Quota Exceeded). Please try again in 1 minute, or integrate your own GEMINI_API_KEY in Settings.";
        }
        setAiError(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      setAiError("AI Service is currently unreachable. Please make sure GEMINI_API_KEY is defined in Settings.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDeleteCurrentDocument = async () => {
    try {
      setIsSaving(true);
      setDeletingFile(true);
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onFileSaved(); // Refresh lists in parent
        onBack(); // Go back to files grid
      } else {
        alert("Failed to delete the PDF document.");
      }
    } catch (err) {
      console.error("Failed to delete current document:", err);
    } finally {
      setIsSaving(false);
      setDeletingFile(false);
    }
  };

  // RECONSTRUCTION MECHANISM: Overwrites PDF content structures using pdf-lib white-out blocks!
  const handleCompilePdf = async (shouldDownload: boolean, skipServerSave = false) => {
    if (!currentPdfBytes) return;

    try {
      setIsSaving(true);

      // 1. Auto-save the currently focused text input to history if there is any active editing in progress
      if (focusedItemId) {
        const activeInput = document.activeElement as HTMLInputElement;
        if (activeInput && (activeInput.tagName === 'INPUT' || activeInput.tagName === 'TEXTAREA')) {
          const focusedItem = pageTextItems.find(it => it.id === focusedItemId);
          if (focusedItem && focusedItem.modifiedText !== activeInput.value) {
            focusedItem.modifiedText = activeInput.value;
          }
          await handleTextChange(focusedItemId, activeInput.value);
        } else {
          const focusedItem = pageTextItems.find(it => it.id === focusedItemId);
          if (focusedItem) {
            await handleTextChange(focusedItemId, focusedItem.modifiedText);
          }
        }
        setFocusedItemId(null);
      }

      // Check and heal currentPdfBytes if it is empty/detached or lacks %PDF- header
      let bytesToLoad = currentPdfBytes;
      const hasHeader = bytesToLoad && bytesToLoad.length >= 4 &&
        bytesToLoad[0] === 0x25 && // %
        bytesToLoad[1] === 0x50 && // P
        bytesToLoad[2] === 0x44 && // D
        bytesToLoad[3] === 0x46;   // F

      if (!hasHeader) {
        console.warn("PDF compilation threat: bytes empty or lacks standard header. Healing from base64 data.");
        let dataToDecode = file.currentData;
        if (!dataToDecode || dataToDecode.trim() === "") {
          dataToDecode = file.originalData;
        }
        let binaryString = "";
        try {
          binaryString = atob(dataToDecode);
        } catch (e) {
          binaryString = atob(file.originalData);
        }
        if (!binaryString.startsWith("%PDF-")) {
          binaryString = atob(file.originalData);
        }
        const healedBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          healedBytes[i] = binaryString.charCodeAt(i);
        }
        bytesToLoad = healedBytes;
        setCurrentPdfBytes(healedBytes);
      }

      // Load standard document model
      const pdfDoc = await PDFLib.PDFDocument.load(bytesToLoad);
      const stdFonts = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      // 2. Fetch fresh history logs list to get all page edits
      let latestHistoryLogs = historyLogs;
      try {
        const res = await fetch(`/api/files/${file.id}/history`);
        if (res.ok) {
          const freshData = await res.json();
          setHistoryLogs(freshData);
          latestHistoryLogs = freshData;
        }
      } catch (e) {
        console.warn("Failed fetching fresh history during compile, using current state", e);
      }

      // Collect all page indices that need to be compiled
      const pagesToCompile = new Set<number>();
      latestHistoryLogs.forEach(hist => {
        pagesToCompile.add(hist.pageIndex);
      });

      // Include the current visible page if there are active modifications
      const hasLocalEdits = pageTextItems.some(item => 
        item.modifiedText !== item.originalText || 
        (item.customStyles && Object.keys(item.customStyles).length > 0)
      );
      if (hasLocalEdits) {
        pagesToCompile.add(currentPage - 1);
      }

      // Group edits sequentially by page index
      const pagesEditingMap = new Map<number, EditHistory[]>();
      pagesToCompile.forEach(pIdx => {
        const editsForPage = latestHistoryLogs.filter(h => h.pageIndex === pIdx);
        pagesEditingMap.set(pIdx, editsForPage);
      });

      // Redact and Draw on affected nodes
      const docPages = pdfDoc.getPages();

      // Helper to fetch raw text blocks from pdfjs
      const getPageTextItemsAsync = async (pIdx: number): Promise<ExtractedTextItem[]> => {
        if (!documentRef.current) return [];
        try {
          const pdfPage = await documentRef.current.getPage(pIdx + 1);
          const textContent = await pdfPage.getTextContent();
          const textStyles = textContent.styles || {};
          const rawItems = textContent.items
            .filter((it: any) => it.str.trim() !== '')
            .map((it: any, idx: number) => {
              const styleInfo = textStyles[it.fontName] || {};
              return {
                id: `txt_${idx}_page_${pIdx + 1}`,
                originalText: it.str,
                modifiedText: it.str,
                tx: it.transform,
                width: it.width,
                height: it.height || it.transform[3],
                fontName: it.fontName,
                fallbackFontFamily: styleInfo.fontFamily || ''
              };
            });
          return mergeCloseTextItems(rawItems);
        } catch (e) {
          console.error("Error extracting page text inside compile", e);
          return [];
        }
      };

      for (const [pageIdx, edits] of pagesEditingMap.entries()) {
        if (pageIdx >= docPages.length) continue;
        const page = docPages[pageIdx];

        const isCurrentActivePage = (pageIdx === (currentPage - 1));
        let pageMergedItems: ExtractedTextItem[];

        if (isCurrentActivePage) {
          // Absolute latest active screen inputs represent true state
          pageMergedItems = pageTextItems;
        } else {
          const rawItems = await getPageTextItemsAsync(pageIdx);
          pageMergedItems = rawItems.map(extItem => {
            const match = edits.find(h => 
              Math.abs(h.styleParams.x - extItem.tx[4]) < 2 && 
              Math.abs(h.styleParams.y - extItem.tx[5]) < 2
            );
            if (match) {
              return {
                ...extItem,
                modifiedText: match.modifiedText,
                customStyles: match.styleParams
              };
            }
            return extItem;
          });
        }

        // 3. Redact and Draw on affected nodes on the PDF page
        for (const item of pageMergedItems) {
          const autoShift = calculateAutoShiftX(item, pageMergedItems);
          const isModified = item.modifiedText !== item.originalText;
          const hasSignificantShift = Math.abs(autoShift) > 0.1;
          const hasStyleMods = !!item.customStyles && Object.keys(item.customStyles).length > 0;

          if (!isModified && !hasSignificantShift && !hasStyleMods) {
            // Unedited item that didn't shift or style-change can be skipped; standard PDF streams draw it untouched
            continue;
          }

          const { 
            fontSize, fontFamily, fontWeight, fontStyle, color, 
            textOffsetX, textOffsetY, rectOffsetX, rectOffsetY, 
            rectWidthOffset, rectHeightOffset, hasMask 
          } = item.customStyles || {
            fontFamily: item.fontName,
            fontSize: item.tx[3],
            fontWeight: undefined,
            fontStyle: undefined,
            color: '#1e293b',
            textOffsetX: 0,
            textOffsetY: 0,
            rectOffsetX: 0,
            rectOffsetY: -1.5,
            rectWidthOffset: undefined,
            rectHeightOffset: undefined,
            hasMask: true
          };

          // A) Coverage Redaction: paint white-out mask over ORIGINAL position of characters
          const shouldMask = hasMask !== false;
          if (shouldMask) {
            const rOffsetX = rectOffsetX ?? 0;
            const rOffsetY = rectOffsetY ?? -1.5;
            const size = fontSize || 10;

            // Resolve font to measure text length properly
            let fontStr = fontFamily || 'Helvetica';
            const isBold = fontWeight === '700' || fontStr.toLowerCase().includes('bold');
            const isItalic = fontStyle === 'italic' || fontStr.toLowerCase().includes('italic') || fontStr.toLowerCase().includes('oblique');

            let matchedFontString = fontStr;
            if (isBold && !matchedFontString.toLowerCase().includes('bold')) {
              matchedFontString += 'bold';
            }
            if (isItalic && !matchedFontString.toLowerCase().includes('italic') && !matchedFontString.toLowerCase().includes('oblique')) {
              matchedFontString += 'italic';
            }

            const currentFont = await getPdfLibFont(matchedFontString, pdfDoc);
            const textToMeasure = sanitizeWinAnsiText(item.modifiedText, currentFont);
            const estNewWidth = currentFont
              ? currentFont.widthOfTextAtSize(textToMeasure, size)
              : textToMeasure.length * size * 0.55;

            // Make sure the whiteout covers original or modified width (whichever is larger) to avoid visual peeking
            const finalWidth = rectWidthOffset !== undefined
              ? item.width * rectWidthOffset
              : Math.max(item.width, estNewWidth) * 1.05;

            const finalHeight = rectHeightOffset !== undefined
              ? size * rectHeightOffset
              : (size * 1.15 || 12);

            let bgRgb = PDFLib.rgb(1, 1, 1);
            if (item.customStyles?.backgroundColor) {
              try {
                const cleanHex = item.customStyles.backgroundColor.replace('#', '');
                let r = 1, g = 1, b = 1;
                if (cleanHex.length === 3) {
                  r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
                  g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
                  b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
                } else if (cleanHex.length === 6) {
                  r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                  g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                  b = parseInt(cleanHex.substring(4, 6), 16) / 255;
                }
                bgRgb = PDFLib.rgb(r, g, b);
              } catch (e) {
                console.error("BG Hex error", e);
              }
            }

            page.drawRectangle({
              x: item.tx[4] + rOffsetX,
              y: item.tx[5] + rOffsetY,
              width: finalWidth,
              height: finalHeight,
              color: bgRgb
            });
          }

          // B) Resolve text style & draw text at target shifted coordinates
          let fontStr = fontFamily || 'Helvetica';
          const isBold = fontWeight === '700' || fontStr.toLowerCase().includes('bold');
          const isItalic = fontStyle === 'italic' || fontStr.toLowerCase().includes('italic') || fontStr.toLowerCase().includes('oblique');

          let matchedFontString = fontStr;
          if (isBold && !matchedFontString.toLowerCase().includes('bold')) {
            matchedFontString += 'bold';
          }
          if (isItalic && !matchedFontString.toLowerCase().includes('italic') && !matchedFontString.toLowerCase().includes('oblique')) {
            matchedFontString += 'italic';
          }

          const currentFont = await getPdfLibFont(matchedFontString, pdfDoc);

          let textRgb = PDFLib.rgb(0.09, 0.14, 0.25);
          if (color) {
            try {
              const cleanHex = color.replace('#', '');
              let r = 0, g = 0, b = 0;
              if (cleanHex.length === 3) {
                r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
                g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
                b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
              } else if (cleanHex.length === 6) {
                r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                b = parseInt(cleanHex.substring(4, 6), 16) / 255;
              }
              textRgb = PDFLib.rgb(r, g, b);
            } catch (err) {
              console.error("Hex parsing error:", err);
            }
          }

          const targetX = item.tx[4] + (textOffsetX ?? 0) + autoShift;
          const targetY = item.tx[5] + (textOffsetY ?? 0);

          let finalValToDraw = sanitizeWinAnsiText(item.modifiedText, currentFont);
          if (item.customStyles?.textTransform === 'uppercase') {
            finalValToDraw = finalValToDraw.toUpperCase();
          } else if (item.customStyles?.textTransform === 'lowercase') {
            finalValToDraw = finalValToDraw.toLowerCase();
          } else if (item.customStyles?.textTransform === 'capitalize') {
            finalValToDraw = finalValToDraw.replace(/\b\w/g, c => c.toUpperCase());
          }

          page.drawText(finalValToDraw, {
            x: targetX,
            y: targetY,
            size: fontSize || 10,
            font: currentFont,
            color: textRgb,
            opacity: item.customStyles?.opacity !== undefined ? item.customStyles.opacity : 1
          });
        }
      }

      // Export pdf-lib binary
      const finalPdfBytes = await pdfDoc.save();
      lastCompiledPdfBytesRef.current = finalPdfBytes;
      setLastCompileIsDraft(skipServerSave);
      
      if (skipServerSave) {
        // Trigger file download pipeline immediately without API round-trip
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const dlUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = dlUrl;
        link.download = `Draft_${file.fileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dlUrl);
        setShowSuccessToast(true);
        return;
      }
      
      // Convert buffer back to base64 using high-performance chunked method
      const finalBase64 = uint8ArrayToBase64(finalPdfBytes);

      // Save to Express Backend projects repo
      const saveRes = await fetch(`/api/files/${file.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedDataBase64: finalBase64 })
      });

      if (saveRes.ok) {
        // Hot update local copy states
        setCurrentPdfBytes(finalPdfBytes);
        onFileSaved();
        setShowSuccessToast(true);

        if (shouldDownload) {
          // Trigger file download pipeline
          const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
          const dlUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = dlUrl;
          link.download = `Polished_${file.fileName}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(dlUrl);
        }
      } else {
        alert("Persistence failed. Review controller logs.");
      }

    } catch (err: any) {
      console.error("PDF reconstruction failure:", err);
      alert("Error building layers: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden">
      {/* Dynamic Sub-control Actions line */}
      <div className="flex items-center justify-between min-h-[3.5rem] bg-white border-b border-slate-200 px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Close Document</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200"></div>
          
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px]" title={file.fileName}>
            {file.fileName}
          </span>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
            title="Delete this document and purge history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete PDF</span>
          </button>
        </div>

        {/* Zoom & Pagination Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              onClick={() => setZoom(prev => Math.max(0.8, prev - 0.15))}
              className="p-1.5 text-slate-500 hover:bg-white border-r border-slate-200 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-600 font-mono w-14 text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
              className="p-1.5 text-slate-500 hover:bg-white border-l border-slate-200 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 text-slate-500 hover:bg-white border-r border-slate-200 transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-700 select-none">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 text-slate-500 hover:bg-white border-l border-slate-200 transition-colors disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compile, Reconstruct and Export commands */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/files/${file.id}/download/original`);
                if (!res.ok) throw new Error("Failed to download original PDF");
                const blob = await res.blob();
                const dlUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = dlUrl;
                link.download = `Original_${file.fileName}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(dlUrl);
              } catch (err) {
                console.error(err);
                alert("Failed to download original PDF.");
              }
            }}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Download original unedited PDF stream"
          >
            <FileDown className="h-4 w-4 mr-1.5 text-slate-400" />
            <span>Download Original</span>
          </button>

          <button
            onClick={() => handleCompilePdf(false)}
            disabled={isSaving}
            className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:indigo-800 transition-all cursor-pointer disabled:opacity-50 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-950/80"
          >
            <Save className="h-4 w-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            <span>Apply Changes</span>
          </button>
          
          <button
            onClick={() => handleCompilePdf(true, true)}
            disabled={isSaving}
            className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-800 transition-all cursor-pointer disabled:opacity-50 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-950/80"
            title="Download PDF draft in-memory without saving permanently on server yet"
          >
            <Download className="h-4 w-4 mr-1.5 text-amber-600 dark:text-amber-400" />
            <span>Download Draft (No Save)</span>
          </button>

          <button
            onClick={() => setHighlightFields(prev => !prev)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer dark:border-slate-750 ${
              highlightFields 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
            title="Toggle Highlight on Editable Text"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${highlightFields ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
            <span className="text-xs">Highlights: {highlightFields ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowHistory(prev => !prev)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${showHistory ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            title="Toggle Revision History Log"
          >
            <History className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Main split working surface */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* PDF Visual Canvas and absolute overlaid smart inline text editable block */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center relative">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-3">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Decrypting document streams...</p>
            </div>
          ) : (
            // Framed Container containing canvas & overlay div
            <div 
              className="relative rounded-lg shadow-xl shadow-slate-300 border border-slate-300/80 bg-white select-none transition-all"
              style={{ 
                width: `${viewportDimensions.width}px`, 
                height: `${viewportDimensions.height}px` 
              }}
            >
              {/* HTML5 Render Canvas */}
              <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-white" />

              {/* AUTOMATED INVISIBLE EDITABLE TEXT COORDINATE LAYER */}
              <div 
                className="absolute inset-0 z-10 overflow-hidden"
                style={{ 
                  width: `${viewportDimensions.width}px`, 
                  height: `${viewportDimensions.height}px` 
                }}
              >
                {pageTextItems.map((item) => {
                  if (!documentRef.current) return null;
                  
                  // We convert baseline matrix variables to absolute positioning pixels using current Zoom
                  const tx = item.tx;
                  const scale = zoom;

                  const customStyles = item.customStyles;

                  // Read nudge coordinates
                  const textOffsetX = customStyles?.textOffsetX ?? 0;
                  const textOffsetY = customStyles?.textOffsetY ?? 0;

                  const autoShiftX = calculateAutoShiftX(item, pageTextItems);

                  // Compute absolute pixel offset coordinates aligned directly to the item's tx baseline
                  const ptX = (tx[4] + textOffsetX + autoShiftX) * scale;
                  
                  // Extract vertical baseline, inverting the coordinate starting from page height downward
                  const ptY = viewportDimensions.height - ((tx[5] + textOffsetY) * scale);

                  // Extract font size
                  const fontSizeVal = customStyles?.fontSize ?? tx[3];
                  const fontSize = fontSizeVal * scale;
                  const customWidthVal = customStyles?.width ?? item.width;
                  const itemWidth = customWidthVal * scale;
                  
                  // Estimate parent container height adjustments (adds offset padding so baseline text does not crop)
                  const itemHeight = fontSize * 1.25;

                  // Aligns the box coordinate top edge vertically
                  const computedTop = ptY - fontSize + 1.2;

                  const fontStyles = getCssStyleForFont(customStyles?.fontFamily || item.fontName, item.fallbackFontFamily);
                  const isModified = item.modifiedText !== item.originalText;
                  const isShifted = Math.abs(autoShiftX) > 0.15;
                  const isFocused = focusedItemId === item.id;

                  const finalColor = customStyles?.color ?? '#0f172a';
                  const finalFontWeight = customStyles?.fontWeight ?? fontStyles.fontWeight;
                  const finalFontStyle = customStyles?.fontStyle ?? fontStyles.fontStyle;
                  const finalAlignment = customStyles?.textAlignment ?? 'left';

                  // Dynamic expansion: Calculate length-based width to avoid clipping as user types longer sentences
                  const estimatedTextWidth = item.modifiedText.length * fontSize * 0.54;
                  const computedWidth = Math.max(itemWidth, estimatedTextWidth, 40);

                  const shouldMask = customStyles?.hasMask !== false;
                  const showWhiteoutMask = (isModified || isFocused || isShifted) && shouldMask;

                  return (
                    <React.Fragment key={item.id}>
                      {/* Whiteout background to hide original text under PDF canvas at its static unshifted location */}
                      {showWhiteoutMask && (
                        <div
                          className="absolute pointer-events-none select-none"
                          style={{
                            left: `${(tx[4] + textOffsetX) * scale}px`,
                            top: `${computedTop}px`,
                            width: `${itemWidth * 1.05}px`, // Slight multiplier to cover font-weight quirks
                            height: `${itemHeight}px`,
                            backgroundColor: customStyles?.backgroundColor || '#ffffff',
                            zIndex: 15
                          }}
                        />
                      )}

                      <div
                        className="absolute group/item z-20 flex"
                        style={{
                          left: `${ptX}px`,
                          top: `${computedTop}px`,
                          width: `${computedWidth}px`,
                          height: `${itemHeight}px`
                        }}
                      >
                        {/* Invisible click-to-edit textbox matching the exact coordinate and font style */}
                        <input
                          type="text"
                          value={item.modifiedText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPageTextItems(prev => prev.map(p => p.id === item.id ? { ...p, modifiedText: val } : p));
                          }}
                          onFocus={(e) => {
                            setFocusedItemId(item.id);
                            setSelectedTextItem(item);
                          }}
                          onBlur={(e) => {
                            setFocusedItemId(null);
                            handleTextChange(item.id, e.target.value);
                          }}
                          className={`w-full h-full border-none outline-none ring-0 focus:ring-0 select-text p-0.5 m-0 leading-none tracking-normal focus:outline-none focus:ring-offset-0 caret-indigo-600 transition-all duration-150 rounded ${
                            isFocused
                              ? 'bg-white text-slate-950 shadow-md ring-2 ring-indigo-500/80 z-30 cursor-text'
                              : highlightFields
                              ? (isModified || isShifted)
                                ? 'bg-indigo-500/[0.08] hover:bg-indigo-500/[0.16] border border-dashed border-indigo-500/[0.45] cursor-pointer z-10'
                                : 'bg-indigo-500/[0.05] hover:bg-indigo-500/[0.12] border border-dashed border-indigo-400/[0.3] cursor-pointer z-10'
                              : 'bg-transparent text-transparent hover:bg-slate-500/[0.04] cursor-text'
                          }`}
                          style={{
                            fontSize: `${fontSize * 0.98}px`,
                            fontFamily: fontStyles.fontFamily,
                            fontWeight: finalFontWeight,
                            fontStyle: finalFontStyle,
                            color: (isModified || isFocused || isShifted) ? finalColor : 'transparent',
                            lineHeight: '1',
                            textShadow: 'none',
                            textAlign: finalAlignment as any,
                            letterSpacing: customStyles?.letterSpacing ? `${customStyles.letterSpacing}px` : 'normal',
                            transform: customStyles?.scaleX ? `scaleX(${customStyles.scaleX})` : 'none',
                            transformOrigin: 'left top',
                            opacity: customStyles?.opacity !== undefined ? customStyles.opacity : 1,
                            backgroundColor: 'transparent', // Transparent background on input; whiteout mask underneath does the masking
                            textTransform: customStyles?.textTransform ?? 'none'
                          }}
                          title="Click directly to edit text inside document"
                        />

                        {/* Launch AI Menu for this text item with floating wand trigger */}
                        <button
                          onClick={() => {
                            setSelectedTextItem(item);
                            setAiResult('');
                          }}
                          className="absolute right-0 top-0 -translate-y-full translate-x-1/2 hidden group-hover/item:flex items-center justify-center p-1 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-500 transition-colors z-30"
                          title="AI Copywriter"
                        >
                          <Wand2 className="h-3 w-3" />
                        </button>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Extraction / Rendering Status Loading Ring */}
              {isExtracting && (
                <div className="absolute top-4 right-4 z-30 bg-white/90 shadow px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 font-medium flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                  <span>Loading Text Coords...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Sidebar: Revision Audit Trails & AI Copilot Panel */}
        {showHistory && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-10">
            
            {/* AI Assistant panel is active */}
            {selectedTextItem ? (
              <div className="flex flex-col flex-1 min-h-0 border-b border-slate-200 bg-slate-50">
                {/* Panel Title & Close */}
                <div className="p-3.5 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                    <span>Format & Edit Text</span>
                  </h4>
                  <button
                    onClick={() => setSelectedTextItem(null)}
                    className="text-[10px] font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded transition-colors"
                  >
                    Clear Focus
                  </button>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="flex border-b border-slate-200 bg-white text-xs select-none">
                  <button
                    onClick={() => setSidebarTab('style')}
                    className={`flex-1 py-2 text-center font-bold border-b-2 transition-all cursor-pointer ${
                      sidebarTab === 'style'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10'
                        : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Aesthetic Matcher
                  </button>
                  <button
                    onClick={() => setSidebarTab('ai')}
                    className={`flex-1 py-2 text-center font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                      sidebarTab === 'ai'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10'
                        : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Gemini AI Copy</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50/50 flex-1 overflow-y-auto min-h-0">
                  {sidebarTab === 'style' ? (
                    <div className="space-y-3.5">
                      {/* 1. Directly Edit Text Block */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-600 uppercase tracking-widest mb-1">
                          Overwrite Text Snip
                        </label>
                        <textarea
                          value={selectedTextItem.modifiedText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPageTextItems(prev => prev.map(p => p.id === selectedTextItem.id ? { ...p, modifiedText: val } : p));
                            setSelectedTextItem(prev => prev ? { ...prev, modifiedText: val } : null);
                          }}
                          onBlur={(e) => {
                            handleTextChange(selectedTextItem.id, e.target.value);
                          }}
                          rows={2}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block bg-white text-slate-950 dark:text-slate-950 font-semibold shadow-sm focus:outline-none"
                          placeholder="Edit raw text..."
                        />
                      </div>

                      {/* 2. Font Family & Font Size */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-650 uppercase tracking-wider mb-1">
                              PDF Standard Font
                            </label>
                            <select
                              value={selectedTextItem.customStyles?.fontFamily || selectedTextItem.fontName}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { fontFamily: e.target.value })}
                              className="block w-full text-xs bg-white rounded border border-slate-300 p-1.5 outline-none font-semibold text-slate-950 dark:text-slate-950 cursor-pointer shadow-sm focus:ring-1 focus:ring-indigo-500"
                            >
                              <optgroup label="Sans-Serif (Standard Clean)">
                                <option value="Helvetica">Helvetica / Arial</option>
                                <option value="Inter">Inter UI</option>
                                <option value="Calibri">Calibri</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Tahoma">Tahoma</option>
                                <option value="Trebuchet">Trebuchet MS</option>
                                <option value="Century Gothic">Century Gothic</option>
                              </optgroup>
                              <optgroup label="Serif (Classic Editorial)">
                                <option value="Times-Roman">Times New Roman</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Garamond">Garamond</option>
                                <option value="Palatino">Palatino</option>
                                <option value="Cambria">Cambria</option>
                              </optgroup>
                              <optgroup label="Monospace (Code & Tech)">
                                <option value="Courier">Courier / Courier New</option>
                                <option value="JetBrains Mono">JetBrains Mono</option>
                                <option value="Consolas">Consolas</option>
                              </optgroup>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-650 uppercase tracking-wider mb-1">
                              Font Size (pt)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={selectedTextItem.customStyles?.fontSize ?? Math.round(selectedTextItem.tx[3] * 10) / 10}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { fontSize: parseFloat(e.target.value) || 12 })}
                              className="block w-full text-xs bg-white rounded border border-slate-300 p-1.5 font-mono font-semibold text-slate-950 dark:text-slate-950 shadow-sm focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Font Size Quick Pills */}
                        <div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map(sz => {
                              const sizeVal = selectedTextItem.customStyles?.fontSize ?? Math.round(selectedTextItem.tx[3] * 10) / 10;
                              const isSelected = Math.abs(sizeVal - sz) < 0.1;
                              return (
                                <button
                                  key={sz}
                                  onClick={() => handleStyleChange(selectedTextItem.id, { fontSize: sz })}
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300 dark:text-slate-700'
                                  }`}
                                >
                                  {sz}pt
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 3. Weights & Alignments style */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            const curr = selectedTextItem.customStyles?.fontWeight;
                            const targetWeight = curr === '700' ? '400' : '700';
                            handleStyleChange(selectedTextItem.id, { fontWeight: targetWeight });
                          }}
                          className={`p-1.5 text-xs font-bold border rounded-lg cursor-pointer transition-colors ${
                            selectedTextItem.customStyles?.fontWeight === '700'
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-white text-slate-850 dark:text-slate-800 border-slate-305 hover:bg-slate-100'
                          }`}
                          title="Toggle boldness"
                        >
                          Bold
                        </button>
                        <button
                          onClick={() => {
                            const curr = selectedTextItem.customStyles?.fontStyle;
                            const targetStyle = curr === 'italic' ? 'normal' : 'italic';
                            handleStyleChange(selectedTextItem.id, { fontStyle: targetStyle });
                          }}
                          className={`p-1.5 text-xs italic border rounded-lg cursor-pointer transition-colors ${
                            selectedTextItem.customStyles?.fontStyle === 'italic'
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-white text-slate-850 dark:text-slate-800 border-slate-305 hover:bg-slate-100'
                          }`}
                          title="Toggle Italic"
                        >
                          Italic
                        </button>
                        <select
                          value={selectedTextItem.customStyles?.textAlignment ?? 'left'}
                          onChange={(e) => handleStyleChange(selectedTextItem.id, { textAlignment: e.target.value })}
                          className="text-xs bg-white rounded-lg border border-slate-300 p-1.5 text-center font-bold text-slate-950 dark:text-slate-950 cursor-pointer shadow-sm focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="left" className="text-slate-950">Left</option>
                          <option value="center" className="text-slate-950">Center</option>
                          <option value="right" className="text-slate-950">Right</option>
                        </select>
                      </div>

                      {/* Dynamic Opacity Slider & Case transforms */}
                      <div className="space-y-2 border-t border-slate-100 pt-2.5">
                        {/* Layer Opacity */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Layer Opacity</span>
                            <span className="font-mono text-[10px] font-extrabold text-slate-600">{Math.round((selectedTextItem.customStyles?.opacity ?? 1) * 100)}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={selectedTextItem.customStyles?.opacity ?? 1}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { opacity: parseFloat(e.target.value) })}
                              className="flex-1 accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
                            />
                            <div className="flex space-x-1 shrink-0">
                              {[1.0, 0.7, 0.4].map(op => (
                                <button
                                  key={op}
                                  onClick={() => handleStyleChange(selectedTextItem.id, { opacity: op })}
                                  className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer text-slate-500"
                                >
                                  {op * 100}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Text Case Transformations */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Letter Case Transformations
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { label: 'None', value: 'none' },
                              { label: 'UPPER', value: 'uppercase' },
                              { label: 'lower', value: 'lowercase' },
                              { label: 'Title', value: 'capitalize' }
                            ].map(opt => {
                              const current = selectedTextItem.customStyles?.textTransform ?? 'none';
                              const isSelected = current === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => handleStyleChange(selectedTextItem.id, { textTransform: opt.value as any })}
                                  className={`text-[9.5px] font-bold py-1 rounded border transition-colors cursor-pointer text-center ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white border-indigo-600' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 4. Text Color & Highlight matching */}
                      <div className="space-y-3.5 border-t border-slate-100 pt-2.5">
                        {/* Text Fill (Ink) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Ink Color Coordination
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={selectedTextItem.customStyles?.color ?? '#0f172a'}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { color: e.target.value })}
                              className="h-8 w-8 rounded cursor-pointer border border-slate-200 p-0 overflow-hidden shrink-0"
                            />
                            <div className="flex-1">
                              <div className="grid grid-cols-6 gap-1">
                                {['#000000', '#111827', '#4b5563', '#1e3a8a', '#0284c7', '#059669', '#dc2626', '#7f1d1d', '#b45309', '#0891b2', '#7c3aed', '#db2777'].map(hex => (
                                  <button
                                    key={hex}
                                    onClick={() => handleStyleChange(selectedTextItem.id, { color: hex })}
                                    className={`h-5 w-5 rounded border cursor-pointer transition-all ${
                                      (selectedTextItem.customStyles?.color ?? '#0f172a') === hex ? 'ring-2 ring-indigo-500 scale-110 border-indigo-500 z-10' : 'border-slate-200 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    title={hex}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Highlight Filling */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Background Highlight Fill
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={selectedTextItem.customStyles?.backgroundColor ?? '#ffffff'}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { backgroundColor: e.target.value, hasMask: true })}
                              className="h-8 w-8 rounded cursor-pointer border border-slate-200 p-0 overflow-hidden shrink-0"
                            />
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-1 items-center mb-1">
                                <button
                                  onClick={() => handleStyleChange(selectedTextItem.id, { backgroundColor: undefined })}
                                  className={`text-[9px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                    !selectedTextItem.customStyles?.backgroundColor 
                                      ? 'bg-indigo-600 text-white border-indigo-600' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  Auto / Transparent
                                </button>
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {['#ffffff', '#fef08a', '#d9f99d', '#bae6fd', '#fed7aa', '#f5d0fe'].map(hex => (
                                  <button
                                    key={hex}
                                    onClick={() => handleStyleChange(selectedTextItem.id, { backgroundColor: hex, hasMask: true })}
                                    className={`h-5 w-5 rounded border cursor-pointer transition-all ${
                                      selectedTextItem.customStyles?.backgroundColor === hex ? 'ring-2 ring-indigo-500 scale-110 border-indigo-500 z-10' : 'border-slate-200 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    title={hex === '#ffffff' ? 'White Mask' : `Highlight ${hex}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 5. Tactile D-Pad Alignment Joystick */}
                      <div className="border bg-slate-100/50 p-2.5 rounded-lg border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-sans">Tactile Alignment Nudges</span>
                          <button
                            onClick={() => handleStyleChange(selectedTextItem.id, { textOffsetX: 0, textOffsetY: 0 })}
                            className="text-[9px] hover:text-indigo-600 font-extrabold text-slate-400 uppercase cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1 items-center">
                          {/* Left Column: Coordinates statistics */}
                          <div className="space-y-1.5 text-[10px] text-slate-500 font-sans">
                            <div>
                              <span>Nudge X:</span>{' '}
                              <span className="font-mono font-bold text-slate-800">{(selectedTextItem.customStyles?.textOffsetX ?? 0).toFixed(1)}pt</span>
                            </div>
                            <div>
                              <span>Nudge Y:</span>{' '}
                              <span className="font-mono font-bold text-slate-800">{(selectedTextItem.customStyles?.textOffsetY ?? 0).toFixed(1)}pt</span>
                            </div>
                          </div>

                          {/* Middle Column: Visual Joystick D-Pad */}
                          <div className="flex flex-col items-center justify-center">
                            {/* Up */}
                            <button
                              onClick={() => {
                                const current = selectedTextItem.customStyles?.textOffsetY ?? 0;
                                handleStyleChange(selectedTextItem.id, { textOffsetY: parseFloat((current + fineNudgeStep).toFixed(1)) });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-t-lg shadow-sm cursor-pointer text-slate-500 font-bold"
                              title={`Shift up by ${fineNudgeStep}pt`}
                            >
                              ▲
                            </button>
                            <div className="flex">
                              {/* Left */}
                              <button
                                onClick={() => {
                                  const current = selectedTextItem.customStyles?.textOffsetX ?? 0;
                                  handleStyleChange(selectedTextItem.id, { textOffsetX: parseFloat((current - fineNudgeStep).toFixed(1)) });
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 active:bg-slate-200 border-y border-l border-slate-200 shadow-sm cursor-pointer text-slate-500 font-bold"
                                title={`Shift left by ${fineNudgeStep}pt`}
                              >
                                ◀
                              </button>
                              {/* Core indicator */}
                              <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-400 select-none">
                                ✛
                              </div>
                              {/* Right */}
                              <button
                                onClick={() => {
                                  const current = selectedTextItem.customStyles?.textOffsetX ?? 0;
                                  handleStyleChange(selectedTextItem.id, { textOffsetX: parseFloat((current + fineNudgeStep).toFixed(1)) });
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 active:bg-slate-200 border-y border-r border-slate-200 shadow-sm cursor-pointer text-slate-500 font-bold"
                                title={`Shift right by ${fineNudgeStep}pt`}
                              >
                                ▶
                              </button>
                            </div>
                            {/* Down */}
                            <button
                              onClick={() => {
                                const current = selectedTextItem.customStyles?.textOffsetY ?? 0;
                                handleStyleChange(selectedTextItem.id, { textOffsetY: parseFloat((current - fineNudgeStep).toFixed(1)) });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-b-lg shadow-sm cursor-pointer text-slate-500 font-bold"
                              title={`Shift down by ${fineNudgeStep}pt`}
                            >
                              ▼
                            </button>
                          </div>

                          {/* Right Column: Step selections */}
                          <div className="flex flex-col space-y-1 justify-center pl-2">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Step Size</span>
                            {[0.1, 0.5, 1.0, 5.0].map(step => (
                              <button
                                key={step}
                                onClick={() => setFineNudgeStep(step)}
                                className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border transition-colors cursor-pointer text-center ${
                                  fineNudgeStep === step
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {step.toFixed(1)}pt
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 5.5 Typography Tracking & Stretch */}
                      <div className="border bg-slate-100/50 p-2.5 rounded-lg border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-sans">Font Fit & Tracking</span>
                          <button
                            onClick={() => handleStyleChange(selectedTextItem.id, { letterSpacing: 0, scaleX: 1 })}
                            className="text-[9px] hover:text-indigo-600 font-extrabold text-slate-400 uppercase cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="space-y-3">
                          {/* Letter Spacing (Tracking) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-slate-500 font-sans text-[10px]">Letter Spacing</span>
                              <span className="font-mono font-bold text-[10px]">{(selectedTextItem.customStyles?.letterSpacing ?? 0).toFixed(1)}px</span>
                            </div>
                            <input
                              type="range"
                              min="-4"
                              max="12"
                              step="0.1"
                              value={selectedTextItem.customStyles?.letterSpacing ?? 0}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { letterSpacing: parseFloat(e.target.value) })}
                              className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
                            />
                          </div>

                          {/* Horizontal Stretch (scaleX) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-slate-500 font-sans text-[10px]">Font Horizontal Stretch</span>
                              <span className="font-mono font-bold text-[10px]">{(selectedTextItem.customStyles?.scaleX ?? 1).toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="2.5"
                              step="0.01"
                              value={selectedTextItem.customStyles?.scaleX ?? 1}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { scaleX: parseFloat(e.target.value) })}
                              className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 6. White-out Background Masq controls */}
                      <div className="border bg-indigo-50/30 p-2.5 rounded-lg border-indigo-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">White-out Redaction Box</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTextItem.customStyles?.hasMask !== false}
                              onChange={(e) => handleStyleChange(selectedTextItem.id, { hasMask: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        
                        {selectedTextItem.customStyles?.hasMask !== false && (
                          <div className="space-y-2 text-xs text-slate-600 mt-2">
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="text-slate-500 font-sans">Redaction Block Width Match</span>
                                <span className="font-mono font-bold">{selectedTextItem.customStyles?.rectWidthOffset ?? 1.05}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.8"
                                max="1.5"
                                step="0.05"
                                value={selectedTextItem.customStyles?.rectWidthOffset ?? 1.05}
                                onChange={(e) => handleStyleChange(selectedTextItem.id, { rectWidthOffset: parseFloat(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="text-slate-500 font-sans">Redaction Block Height Match</span>
                                <span className="font-mono font-bold">{selectedTextItem.customStyles?.rectHeightOffset ?? 1.15}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.8"
                                max="1.5"
                                step="0.05"
                                value={selectedTextItem.customStyles?.rectHeightOffset ?? 1.15}
                                onChange={(e) => handleStyleChange(selectedTextItem.id, { rectHeightOffset: parseFloat(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-indigo-100/50">
                              <div>
                                <label className="block text-[9px] font-bold text-indigo-900/60 uppercase">Shift x offset</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={selectedTextItem.customStyles?.rectOffsetX ?? 0}
                                  onChange={(e) => handleStyleChange(selectedTextItem.id, { rectOffsetX: parseFloat(e.target.value) || 0 })}
                                  className="block w-full text-xs font-semibold bg-white rounded border border-slate-200 p-0.5 font-mono text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-indigo-900/60 uppercase">Shift y offset</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={selectedTextItem.customStyles?.rectOffsetY ?? -1.5}
                                  onChange={(e) => handleStyleChange(selectedTextItem.id, { rectOffsetY: parseFloat(e.target.value) || -1.5 })}
                                  className="block w-full text-xs font-semibold bg-white rounded border border-slate-200 p-0.5 font-mono text-center"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-indigo-950/70 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg italic">
                        "{selectedTextItem.modifiedText}"
                      </p>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                          Adjustment Goal / Theme
                        </label>
                        <select
                          value={aiInstruction}
                          onChange={(e) => setAiInstruction(e.target.value)}
                          className="block w-full text-xs bg-white rounded border border-slate-200 p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          <option value="Polished, professional corporate language">Polished Professional Tone</option>
                          <option value="Translate the text perfectly to Spanish, keeping capitalization">Translate to Spanish</option>
                          <option value="Translate the text perfectly to French, keeping capitalization">Translate to French</option>
                          <option value="Simplify the copy, making it shorter and conversational">Simplify / Shorten</option>
                          <option value="Summarize page elements elegantly">Summarize concisely</option>
                          <option value="Correct grammar, typography, spelling errors perfectly">Grammar and Spelling Audit</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAiPolishRequest}
                        disabled={isAiProcessing}
                        className="w-full inline-flex items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        {isAiProcessing ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3.5 w-3.5 mr-1" />
                            Polish with Gemini
                          </>
                        )}
                      </button>

                      {aiError && (
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[11px] text-rose-700 animate-fade-in font-medium leading-normal">
                          {aiError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col border-b border-slate-200 bg-slate-50/40 h-[420px] shrink-0">
                {/* Search Header */}
                <div className="p-3.5 border-b border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-1.5 animate-fade-in">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileType className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                      <span>Page Text Inspector</span>
                    </h4>
                    <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-100">
                      {pageTextItems.length} Fields
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2 leading-tight font-sans">
                    Search and edit any text line on this page directly from this scrollable panel:
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type keyword to filter text..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full text-xs p-2.5 pl-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none block bg-slate-50 font-sans"
                    />
                    {searchText && (
                      <button 
                        onClick={() => setSearchText('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400 hover:text-indigo-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Filterable Text Snippets List Container */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/50">
                  {(() => {
                    const filtered = pageTextItems.filter(item => 
                      item.modifiedText.toLowerCase().includes(searchText.toLowerCase()) ||
                      item.originalText.toLowerCase().includes(searchText.toLowerCase())
                    );
                    
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <p className="text-xs text-slate-400 font-medium font-sans">No matching text fields on this page.</p>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isModified = item.modifiedText !== item.originalText;
                      return (
                        <div 
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isModified 
                              ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono text-slate-400 tracking-tight uppercase truncate max-w-[120px]">
                              {item.fontName.replace(/^g_d0_/, '') || 'Standard'}
                            </span>
                            <button
                              onClick={() => {
                                setFocusedItemId(item.id);
                                setSelectedTextItem(item);
                              }}
                              className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors uppercase tracking-wider cursor-pointer font-sans"
                            >
                              Style / AI ⚙️
                            </button>
                          </div>

                          <textarea
                            value={item.modifiedText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPageTextItems(prev => prev.map(p => p.id === item.id ? { ...p, modifiedText: val } : p));
                            }}
                            onBlur={(e) => {
                              handleTextChange(item.id, e.target.value);
                            }}
                            rows={2}
                            placeholder="Overwrite text value..."
                            className="w-full text-xs p-2 border border-slate-200/60 rounded-lg bg-slate-50/40 focus:bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none font-sans leading-relaxed resize-none"
                          />

                          {isModified && (
                            <div className="mt-1.5 flex items-center justify-between font-sans">
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                                Edited
                              </span>
                              <span className="text-[9px] text-slate-400 italic truncate max-w-[150px]" title={item.originalText}>
                                Was: "{item.originalText}"
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Audit Listing (JpaRepository relational listing) */}
            {!selectedTextItem && (
              <div className="flex-1 overflow-y-auto p-4 bg-white min-h-0 border-t border-slate-105">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>Revision Audit Log [edit_history]</span>
                </h3>

                {historyLogs.length === 0 ? (
                  <div className="text-center py-8 animate-fade-in">
                    <p className="text-xs text-slate-400">No modifications logged yet.</p>
                    <p className="text-2xs text-slate-400/80 mt-1">Directly select and type inside document to audit.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {historyLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col text-xs hover:border-indigo-100 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                          <span>PAGE {log.pageIndex + 1} • {new Date(log.timestamp).toLocaleTimeString()}</span>
                          <button
                            onClick={() => handleRevertHistory(log.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-widest bg-red-100/50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Revert this change and restore original"
                          >
                            Revert
                          </button>
                        </div>
                        
                        <div className="space-y-1.5 font-sans leading-snug">
                          <div>
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded mr-1">BEFORE</span>
                            <span className="text-slate-500 line-through italic">"{log.originalText}"</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded mr-1">AFTER</span>
                            <span className="text-slate-800 font-semibold text-slate-950">"{log.modifiedText}"</span>
                          </div>
                        </div>

                        <div className="mt-2 text-[9px] font-mono text-slate-400 border-t border-slate-200/50 pt-1.5 flex justify-between">
                          <span>X: {Math.round(log.styleParams.x)}, Y: {Math.round(log.styleParams.y)}</span>
                          <span>Font: {log.styleParams.fontFamily?.replace(/^g_d0_/, '') || 'Default'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}

      </div>

      {/* Workspace-Level Custom Deletion Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Permanently delete this document?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{file.fileName}"</strong>? This action cannot be undone, and you will be returned directly to the main workspace.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
               <button
                 disabled={deletingFile}
                 onClick={() => setShowDeleteConfirm(false)}
                 className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-40"
               >
                 Cancel
               </button>
               <button
                 disabled={deletingFile}
                 onClick={handleDeleteCurrentDocument}
                 className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md cursor-pointer transition-colors flex items-center space-x-1.5 disabled:opacity-40"
               >
                 {deletingFile ? (
                   <>
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                     <span>Purging Storage...</span>
                   </>
                 ) : (
                   <span>Yes, Delete PDF</span>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Compilation Toast notifier with dedicated Download action */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-120 flex items-center p-4.5 space-x-4 max-w-sm rounded-2xl border border-emerald-200/60 bg-white/95 backdrop-blur-md shadow-2xl dark:bg-slate-900/95 dark:border-emerald-800/40 animate-fade-in-up">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle className="h-5.5 w-5.5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-905 dark:text-white">
              Edits Layered Successfully!
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Your modifications have been applied to the vector-aligned PDF canvas.
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={() => {
                  const bytesToUse = lastCompiledPdfBytesRef.current || currentPdfBytes;
                  if (bytesToUse) {
                    const blob = new Blob([bytesToUse], { type: 'application/pdf' });
                    const dlUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = dlUrl;
                    link.download = lastCompileIsDraft ? `Draft_${file.fileName}` : `Polished_${file.fileName}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(dlUrl);
                  } else {
                    alert("No updated document bits available yet.");
                  }
                }}
                className="inline-flex items-center text-[10px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40 uppercase transition-all cursor-pointer"
              >
                <Download className="h-3 w-3 mr-1" />
                Download PDF
              </button>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
