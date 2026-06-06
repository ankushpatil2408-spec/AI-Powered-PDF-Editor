import React, { useState, useEffect } from 'react';
import { 
  Plus, FolderOpen, Trash2, Calendar, FileType, 
  ArrowRight, Upload, Sparkles, Wand2, Info, Loader2 
} from 'lucide-react';
import { PdfProject, CreateProjectRequest, PdfFile } from '../types.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ProjectDashboardProps {
  userId: string;
  onProjectSelected: (project: PdfProject, files: PdfFile[]) => void;
}

export default function ProjectDashboard({ userId, onProjectSelected }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<PdfProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // PDF upload states inside projects
  const [activeUploadProjectId, setActiveUploadProjectId] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setIsSubmitting(true);
      const payload: CreateProjectRequest = {
        name: projectName.trim(),
        description: projectDesc.trim(),
        userId: userId
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setProjectName('');
        setProjectDesc('');
        setShowCreateModal(false);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting project
    if (!confirm("Are you sure you want to delete this project? This will permanently delete all associated PDF files and edit histories.")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Convert File object to Base64 String
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
        const base64 = result.substring(result.indexOf(',') + 1);
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handles raw base64 upload to server
  const uploadPdfFile = async (projectId: string, fileName: string, fileSize: number, base64Data: string) => {
    try {
      setFileUploading(true);
      const res = await fetch(`/api/projects/${projectId}/upload`, {
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
        // Load the active project and select it!
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const filesRes = await fetch(`/api/projects/${projectId}/files`);
        if (projectRes.ok && filesRes.ok) {
          const project = await projectRes.json();
          const files = await filesRes.json();
          onProjectSelected(project, files);
        }
      } else {
        const errorJson = await res.json();
        alert(`Failed to upload: ${errorJson.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("File upload operation failed:", err);
    } finally {
      setFileUploading(false);
      setActiveUploadProjectId(null);
    }
  };

  const handleFileUploadInput = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Only valid PDF files are supported.");
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      await uploadPdfFile(projectId, file.name, file.size, base64);
    } catch (err) {
      console.error(err);
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

  const handleDrop = async (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Only valid PDF documents are supported.");
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      await uploadPdfFile(projectId, file.name, file.size, base64);
    } catch (err) {
      console.error(err);
    }
  };

  // GENERATOR SYSTEM: Create beautiful test templates on-the-fly!
  const generateSamplePdf = async (projectId: string) => {
    try {
      setFileUploading(true);
      
      // Instantiate a new clean pdfDoc using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Standard Letter aspect ratio
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Draw title
      page.drawText("UNIVERSAL PDF ENGINE SPECIFICATION", {
        x: 60,
        y: 720,
        size: 20,
        font: timesRomanBold,
        color: rgb(0.12, 0.16, 0.27),
      });

      // Draw horizontal divider rule
      page.drawRectangle({
        x: 60,
        y: 705,
        width: 492,
        height: 2,
        color: rgb(0.8, 0.82, 0.87),
      });

      // Draw subtitle metadata
      page.drawText("Sub-Header: Proof of Concept Text Rect Layout Alignment", {
        x: 60,
        y: 680,
        size: 11,
        font: helveticaFont,
        color: rgb(0.3, 0.5, 0.8),
      });

      // Simple introductory paragraph
      page.drawText("Welcome to the next-generation PDF Inline Editing Platform. You can click", {
        x: 60,
        y: 630,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText("any text line on the screen to directly alter its characters. PDF coordinate bounds", {
        x: 60,
        y: 612,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText("will preserve perfectly under matching text structures.", {
        x: 60,
        y: 594,
        size: 11,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Section 2: Relational Schema Details
      page.drawText("SYSTEM DATABASE SCHEMATICS", {
        x: 60,
        y: 530,
        size: 14,
        font: timesRomanBold,
        color: rgb(0.12, 0.16, 0.27),
      });

      page.drawText("Data points record to relations: [users] -> [pdf_projects] -> [pdf_files]", {
        x: 60,
        y: 498,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.4, 0.45, 0.5),
      });

      page.drawText("Histography revision control writes updates into the [edit_history] schema.", {
        x: 60,
        y: 480,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.4, 0.45, 0.5),
      });

      // Section 3: AI Copilot
      page.drawText("AI-ASSISTED DOCUMENT EDITING FEATURES", {
        x: 60,
        y: 410,
        size: 14,
        font: timesRomanBold,
        color: rgb(0.4, 0.2, 0.6),
      });

      page.drawText("1. Automated smart style and position extraction layer.", {
        x: 60,
        y: 380,
        size: 11,
        font: helveticaFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawText("2. Fully integrated Gemini LLM revision commands.", {
        x: 60,
        y: 360,
        size: 11,
        font: helveticaFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawText("3. Immediate, clean canvas redraw and download compilation.", {
        x: 60,
        y: 340,
        size: 11,
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

      // Serialize bytes
      const pdfBytes = await pdfDoc.save();
      const base64 = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Trigger automatic project upload
      await uploadPdfFile(projectId, "Sample_Interactive_Specification.pdf", pdfBytes.length, base64);
    } catch (err) {
      console.error("Failed to generate and upload sample PDF Document:", err);
      alert("Error: Sample creation failed.");
    } finally {
      setFileUploading(false);
    }
  };

  const handleSelectProject = async (project: PdfProject) => {
    try {
      // Get associated files
      const filesRes = await fetch(`/api/projects/${project.id}/files`);
      if (filesRes.ok) {
        const files = await filesRes.json();
        onProjectSelected(project, files);
      }
    } catch (err) {
      console.error("Failed to fetch project files:", err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Upper banner section */}
      <div className="md:flex md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl tracking-tight">
            PDF Project Repositories
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create structured folders to upload, view, edit in-place and export original vector format PDFs.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow-indigo-100 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" />
            New Project Folder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-60 w-full flex-col items-center justify-center space-y-3">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Syncing repositories ...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-12 px-4 shadow-sm max-w-2xl mx-auto">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No Projects Found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Get started by initializing your first project workspace folder for PDF rendering.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleSelectProject(project)}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Project Folder"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {project.description || "No project description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-400 space-x-1 font-mono">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Sub Upload actions directly inside standard card dashboard list */}
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  {activeUploadProjectId === project.id ? (
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => generateSamplePdf(project.id)}
                        disabled={fileUploading}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded border border-purple-200 hover:bg-purple-100 uppercase"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Sample Project
                      </button>
                      <label className="inline-flex items-center cursor-pointer px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 uppercase">
                        <Upload className="h-3 w-3 mr-1" />
                        File
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => handleFileUploadInput(e, project.id)}
                        />
                      </label>
                      <button
                        onClick={() => setActiveUploadProjectId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveUploadProjectId(project.id)}
                      className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 space-x-1"
                    >
                      <span>Upload / Launch</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>

              {/* Blocking Overlay for individual file uploading */}
              {fileUploading && activeUploadProjectId === project.id && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90">
                  <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-indigo-700 mt-2">Writing PDF Layers...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW PROJECT DIALOG ACCORDION (Modal setup) */}
      {showCreateModal && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-500/30 backdrop-blur-sm transition-opacity"></div>
          
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100">
                <form onSubmit={handleCreateProject}>
                  <div className="bg-white px-6 pb-6 pt-5">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                        <Plus className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900" id="modal-title">
                        Create Project Workspace
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="pname" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Folder Name
                        </label>
                        <input
                          type="text"
                          id="pname"
                          required
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="e.g. Q4 Financial Disclosures"
                          className="block w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="pdesc" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Brief Description (Optional)
                        </label>
                        <textarea
                          id="pdesc"
                          rows={3}
                          value={projectDesc}
                          onChange={(e) => setProjectDesc(e.target.value)}
                          placeholder="Describe the context of these documents..."
                          className="block w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3 rounded-b-2xl border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 uppercase tracking-widest text-xs"
                    >
                      {isSubmitting ? "Creating..." : "Confirm Folder"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="inline-flex justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 uppercase tracking-widest text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
