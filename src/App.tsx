import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import PdfWorkspace from './components/PdfWorkspace.jsx';
import AuthPage from './components/AuthPage.jsx';
import UserProfile from './components/UserProfile.jsx';
import MarketingViews from './components/MarketingViews.jsx';
import { PdfProject, PdfFile, User } from './types.js';
import { 
  Upload, FileType, Wand2, Loader2, ChevronRight, Sparkles, AlertCircle, FileDown, Eye, Trash2,
  Instagram, Linkedin, Facebook
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { isSupportedConvertibleFile, convertAndGetPdfBytes } from './utils/documentConverter.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeProject, setActiveProject] = useState<PdfProject | null>(null);
  const [projectFiles, setProjectFiles] = useState<PdfFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PdfFile | null>(null);
  
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'about' | 'contact' | 'editor'>('home');
  const [appLoading, setAppLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<PdfFile | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Check for local session on initial mount
  useEffect(() => {
    const localUserRaw = localStorage.getItem('pdf_current_user');
    if (localUserRaw) {
      try {
        const user = JSON.parse(localUserRaw);
        setCurrentUser(user);
        setActiveTab('editor');
      } catch (e) {
        console.error("Stale current user session ignored:", e);
      }
    }
    setAppLoading(false);
  }, []);

  // Update dynamic workspace records whenever the active user logs in or changes
  useEffect(() => {
    if (!currentUser) {
      setActiveProject(null);
      setProjectFiles([]);
      setSelectedFile(null);
      return;
    }

    async function bootstrapUserWorkspace() {
      try {
        setAppLoading(true);
        const projRes = await fetch(`/api/projects?userId=${currentUser!.id}`);
        if (projRes.ok) {
          const projects = await projRes.json();
          let defaultProj = projects.find((p: PdfProject) => p.name === 'Universal Workspace');
          
          if (!defaultProj) {
            const createRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: "Universal Workspace",
                description: "Primary workspace for PDF text modifications",
                userId: currentUser!.id
              })
            });
            if (createRes.ok) {
              defaultProj = await createRes.json();
            }
          }

          if (defaultProj) {
            setActiveProject(defaultProj);
            const filesRes = await fetch(`/api/projects/${defaultProj.id}/files`);
            if (filesRes.ok) {
              const files = await filesRes.json();
              setProjectFiles(files);
            }
          }
        }
      } catch (err) {
        console.error("Failed to bootstrap custom workspace:", err);
      } finally {
        setAppLoading(false);
      }
    }

    bootstrapUserWorkspace();
  }, [currentUser]);

  const reloadProjectFiles = async () => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/files`);
      if (res.ok) {
        const data = await res.json();
        setProjectFiles(data);
        
        if (selectedFile) {
          const fresh = data.find((f: PdfFile) => f.id === selectedFile.id);
          if (fresh) {
            setSelectedFile(fresh);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await reloadProjectFiles();
        if (selectedFile && selectedFile.id === fileId) {
          setSelectedFile(null);
        }
      } else {
        alert("Failed to delete the PDF document.");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const uploadPdfFile = async (fileName: string, fileSize: number, base64Data: string) => {
    if (!activeProject) {
      alert("Your PDF editing workspace is still initializing. Please wait a moment and try again.");
      return;
    }
    try {
      setUploading(true);
      const res = await fetch(`/api/projects/${activeProject.id}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileSize,
          originalDataBase64: base64Data
        })
      });

      if (res.ok) {
        const fileRecord = await res.json();
        await reloadProjectFiles();
        setSelectedFile(fileRecord);
      } else {
        const errJson = await res.json();
        alert(`Failed to import PDF: ${errJson.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.substring(result.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = err => reject(err);
    });
  };

  const uint8ArrayToBase64 = (arr: Uint8Array): string => {
    let binary = '';
    const len = arr.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = arr.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedConvertibleFile(file)) {
      alert("Unsupported format. Please upload PDF, Word (.docx), Plain Text, or standard Images.");
      return;
    }

    try {
      setUploading(true);
      const pdfBytes = await convertAndGetPdfBytes(file);
      const base64 = uint8ArrayToBase64(pdfBytes);

      let outputFileName = file.name;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        outputFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.pdf';
      }

      await uploadPdfFile(outputFileName, pdfBytes.byteLength, base64);
    } catch (err) {
      console.error(err);
      alert("Failed to parse and vectorize uploaded document structure.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!isSupportedConvertibleFile(file)) {
      alert("Unsupported format. Please drag standard PDF, Word (.docx), Plain Text, or Image files.");
      return;
    }

    try {
      setUploading(true);
      const pdfBytes = await convertAndGetPdfBytes(file);
      const base64 = uint8ArrayToBase64(pdfBytes);

      let outputFileName = file.name;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        outputFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.pdf';
      }

      await uploadPdfFile(outputFileName, pdfBytes.byteLength, base64);
    } catch (err) {
      console.error(err);
      alert("Failed to parse and vectorize dropped document structure.");
    } finally {
      setUploading(false);
    }
  };

  // Immediate beautiful vector-based specification generation
  const generateSamplePdf = async () => {
    if (!activeProject) return;

    try {
      setUploading(true);
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Standard Letter
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Title header
      page.drawText("UNIVERSAL PDF ENGINE SPECIFICATION", {
        x: 60,
        y: 710,
        size: 18,
        font: timesRomanBold,
        color: rgb(0.12, 0.16, 0.27),
      });

      // Divider rule
      page.drawRectangle({
        x: 60,
        y: 695,
        width: 492,
        height: 1.5,
        color: rgb(0.8, 0.82, 0.87),
      });

      // Subtitle
      page.drawText("System Architecture Proof of Concept Manual with Coordinates Tracking", {
        x: 60,
        y: 670,
        size: 11,
        font: helveticaFont,
        color: rgb(0.3, 0.5, 0.8),
      });

      // Paragraphs
      page.drawText("Welcome to the next-generation PDF Inline Editing Platform. You can click", {
        x: 60,
        y: 620,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText("any text line on the screen to directly alter its characters. PDF coordinate bounds", {
        x: 60,
        y: 602,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText("will preserve perfectly under matching text structures.", {
        x: 60,
        y: 584,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Section 1
      page.drawText("SYSTEM DATABASE SCHEMATICS", {
        x: 60,
        y: 520,
        size: 13,
        font: timesRomanBold,
        color: rgb(0.12, 0.16, 0.27),
      });

      page.drawText("Data points record to relations: [users] -> [pdf_projects] -> [pdf_files]", {
        x: 60,
        y: 490,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.45, 0.5),
      });

      page.drawText("Histography revision control writes updates into the [edit_history] schema.", {
        x: 60,
        y: 472,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.45, 0.5),
      });

      // Section 2
      page.drawText("AI-ASSISTED DOCUMENT EDITING FEATURES", {
        x: 60,
        y: 410,
        size: 13,
        font: timesRomanBold,
        color: rgb(0.4, 0.2, 0.6),
      });

      page.drawText("1. Automated smart style and position extraction layer.", {
        x: 60,
        y: 380,
        size: 10.5,
        font: helveticaFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawText("2. Fully integrated Gemini LLM revision commands.", {
        x: 60,
        y: 360,
        size: 10.5,
        font: helveticaFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawText("3. Immediate, clean canvas redraw and download compilation.", {
        x: 60,
        y: 340,
        size: 10.5,
        font: helveticaFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Footer
      page.drawText("Architecture Spec V1.0 • Built in Sandboxed Port 3000 Node Environment", {
        x: 130,
        y: 80,
        size: 9,
        font: helveticaFont,
        color: rgb(0.6, 0.62, 0.66),
      });

      const pdfBytes = await pdfDoc.save();
      const base64 = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      await uploadPdfFile("Sample_Interactive_Specification.pdf", pdfBytes.length, base64);
    } catch (err) {
      console.error(err);
      alert("Error generating beautiful corporate specification sample.");
    } finally {
      setUploading(false);
    }
  };

  if (appLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-hidden">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase animate-pulse">
          Starting PDF Editing Canvas...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 font-sans">
      <Header 
        currentUser={currentUser} 
        activeProjectName={showProfile ? "User Security Account" : (selectedFile ? "Document Edit View" : undefined)} 
        isSaving={false}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onViewProfile={() => {
          setShowProfile(true);
          setActiveTab('editor');
        }}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'editor') {
            setShowProfile(false);
          }
        }}
      />

      {/* Primary Content Section */}
      <main className="flex-1 w-full max-w-full">
        {activeTab !== 'editor' ? (
          <div className="w-full pt-10 pb-12">
            <MarketingViews 
              activeSection={activeTab} 
              isLoggedIn={!!currentUser} 
              onNavigateToEditor={() => setActiveTab('editor')} 
              onTriggerAuth={() => setActiveTab('editor')}
            />
          </div>
        ) : !currentUser ? (
          <AuthPage 
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setActiveTab('editor');
            }}
            darkMode={darkMode}
          />
        ) : showProfile ? (
          <UserProfile 
            user={currentUser}
            totalFiles={projectFiles.length}
            onBack={() => setShowProfile(false)}
            onLogout={() => {
              localStorage.removeItem('pdf_current_user');
              setCurrentUser(null);
              setShowProfile(false);
              setActiveTab('home');
            }}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
          />
        ) : selectedFile ? (
          <PdfWorkspace 
            project={activeProject!}
            file={selectedFile}
            onBack={() => setSelectedFile(null)}
            onFileSaved={reloadProjectFiles}
          />
        ) : (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            
            {/* Title display */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Next Generation Vector Modification
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl font-sans leading-none dark:text-white">
                AI-Powered Universal PDF Editor
              </h1>
              <p className="mt-3 text-base text-slate-500 font-sans dark:text-slate-400">
                Edit text layout parameters inside any PDF document dynamically with instant visual results, maintaining original text bounds and sizes.
              </p>
            </div>

            {/* Drag Zone Uploader Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 bg-white dark:bg-slate-900 ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/20 shadow-inner dark:bg-indigo-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm dark:shadow-none'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                  <p className="mt-4 text-sm font-semibold text-indigo-700 dark:text-indigo-400 animate-pulse">
                    Vectorizing layout and embedding document structures...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-5 shadow shadow-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 dark:shadow-none">
                    <Upload className="h-6.5 w-6.5" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Upload your Document
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 max-w-md dark:text-slate-500">
                    Drag and drop PDF, Word (.docx), Plain Text, or standard Images here, or click to browse.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                    <label className="inline-flex items-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-3 shadow transition-colors cursor-pointer uppercase tracking-wider">
                      Browse Files
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md,.rtf,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp"
                        onChange={handleManualUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={generateSamplePdf}
                      className="inline-flex items-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 shadow-md shadow-indigo-100 transition-all cursor-pointer uppercase tracking-wider gap-1.5"
                    >
                      <Wand2 className="h-4 w-4" />
                      Try with Sample PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of Recently Modified/Uploaded Documents */}
            {projectFiles.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">
                    Recent Document History ({projectFiles.length})
                  </h3>
                  <span className="text-2xs font-mono text-slate-400 dark:text-slate-500 hover:text-slate-550 select-none">
                    Select a document below to resume edit steps
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {projectFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className="group flex items-center justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-505 hover:shadow-md dark:hover:shadow-none cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/40 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-colors">
                          <FileType className="h-5.5 w-5.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-sans">
                            {file.fileName}
                          </h4>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 select-none">
                            <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{file.pageCount} Pages</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Direct Download Edited PDF Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`/api/files/${file.id}/download/current`);
                              if (!res.ok) throw new Error("Failed to download PDF");
                              const blob = await res.blob();
                              const dlUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = dlUrl;
                              link.download = `Polished_${file.fileName}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(dlUrl);
                            } catch (err) {
                              console.error(err);
                              alert("Unable to fetch and download the edited file.");
                            }
                          }}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Download Edited PDF with your changes applied"
                        >
                          <FileDown className="h-4.5 w-4.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(file);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-55/70 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                          title="Delete document and its history"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(file);
                          }}
                          className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold font-sans text-xs space-x-1 pl-1 cursor-pointer hover:underline"
                        >
                          <span>Edit</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 bg-slate-100/50 p-6 rounded-2xl border border-slate-200 flex items-start gap-3.5 max-w-3xl mx-auto dark:bg-slate-900/40 dark:border-slate-800">
              <AlertCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">How it works:</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  We use <strong className="text-slate-700 dark:text-slate-300">PDF.js</strong> to dynamically parse character fonts and coordinate baselines inside your browser. Simply select and start typing inside any highlighted text parameters to edit in-place. Once satisfied, click <strong className="text-indigo-700 dark:text-indigo-400">Apply Changes</strong> to reconstruct using <strong className="text-slate-700 dark:text-slate-300 font-mono">pdf-lib</strong>.
                </p>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Persistent Brand Footer Displays on Landing & Dashboard views */}
      {!selectedFile && (
        <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-200 mt-auto shrink-0 z-10">
          <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-200 dark:border-slate-800">
              {/* Brand and Description Column */}
              <div className="md:col-span-6 space-y-4 text-left">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                    AI-Powered Universal PDF Editor
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                  Next-generation digital document layout revision framework. Dynamically adjust font coordinate matrices and text bounds securely inside your browser. Powered by local sandboxed PDF.js and pdf-lib translation engines.
                </p>
                {/* Social Media Links with custom animation hover feedback */}
                <div className="flex items-center space-x-3.5 pt-2">
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all shadow-sm"
                    title="Instagram Profile"
                  >
                    <Instagram className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all shadow-sm"
                    title="LinkedIn Profile"
                  >
                    <Linkedin className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all shadow-sm"
                    title="Facebook Page"
                  >
                    <Facebook className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Quick Links Column */}
              <div className="md:col-span-3 space-y-3 text-left">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  Product Nav
                </h4>
                <ul className="space-y-2 text-xs font-semibold text-slate-650 dark:text-slate-300">
                  <li>
                    <button onClick={() => setActiveTab('editor')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left">
                      Document Editor Workspace
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setActiveTab('services')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left">
                      Enterprise Solutions
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setActiveTab('about')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left">
                      About Vector Technology
                    </button>
                  </li>
                </ul>
              </div>

              {/* Developer / Contact Column */}
              <div className="md:col-span-3 space-y-3 text-left">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  Get In Touch
                </h4>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <li className="font-bold text-slate-800 dark:text-slate-200">Ankush Patil</li>
                  <li>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none">Email</span>
                    <a href="mailto:ankushpatil.2408@gmail.com" className="hover:underline font-semibold text-indigo-600 dark:text-indigo-400 break-all">
                      ankushpatil.2408@gmail.com
                    </a>
                  </li>
                  <li>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none">Mobile</span>
                    <a href="tel:8010502385" className="hover:underline font-semibold text-slate-700 dark:text-slate-300">
                      8010502385
                    </a>
                  </li>
                  <li>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none">Address</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Raver, Maharashtra 425508
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Copyright area */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-slate-400 dark:text-slate-550">
              <span>© {new Date().getFullYear()} AI-Powered Universal PDF Systems. All Rights Reserved.</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Sandbox Workspace SSL Secured</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Custom Theme-Aware Iframe-Safe Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Permanently delete document?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{fileToDelete.fileName}"</strong>? All associated character replacement parameters and standard revision logs will be permanently removed.
            </p>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <div>Size: <span className="font-bold text-slate-700 dark:text-slate-300">{(fileToDelete.fileSize / 1024).toFixed(1)} KB</span></div>
              <div>Pages: <span className="font-bold text-slate-700 dark:text-slate-300">{fileToDelete.pageCount}</span></div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
               <button
                 onClick={() => setFileToDelete(null)}
                 className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button
                 onClick={async () => {
                   const id = fileToDelete.id;
                   setFileToDelete(null);
                   await handleDeleteFile(id);
                 }}
                 className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md cursor-pointer transition-colors"
               >
                 Yes, Delete Document
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
