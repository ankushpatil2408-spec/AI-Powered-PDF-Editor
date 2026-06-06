import { 
  projectRepository, 
  fileRepository, 
  historyRepository, 
  userRepository 
} from '../db.js';
import { 
  User, 
  PdfProject, 
  PdfFile, 
  EditHistory, 
  CreateProjectRequest, 
  UploadPdfRequest, 
  RecordEditRequest 
} from '../../src/types.js';

/**
 * Standard Project & Document Management Service
 * Emulates @Service annotated bean structure.
 */
export class PdfService {

  // 1. PROJECT MANAGEMENT
  public createProject(dto: CreateProjectRequest): PdfProject {
    // Validation
    if (!dto.name || dto.name.trim() === '') {
      throw new Error("Project name cannot be empty");
    }

    let hostUser = userRepository.findById(dto.userId);
    if (!hostUser) {
      // Auto-register sandbox, mock, or custom users dynamically
      let userEmail = "simulated-user@gmail.com";
      let userName = "Simulated User";
      
      if (dto.userId.startsWith('usr_g_')) {
        const hash = dto.userId.replace('usr_g_mock_', '').replace('usr_g_', '');
        userEmail = `user_${hash}@gmail.com`;
        userName = `User ${hash}`;
      }
      
      hostUser = userRepository.save({
        id: dto.userId,
        email: userEmail,
        name: userName,
        role: "EDITOR",
        createdAt: new Date().toISOString()
      });
    }

    const newProject: PdfProject = {
      id: "prj_" + Math.random().toString(36).substring(2, 11),
      userId: dto.userId,
      name: dto.name.trim(),
      description: dto.description?.trim() || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return projectRepository.save(newProject);
  }

  public getProjectsForUser(userId: string): PdfProject[] {
    return projectRepository.findByField('userId', userId);
  }

  public getProjectById(projectId: string): PdfProject | null {
    return projectRepository.findById(projectId);
  }

  public deleteProject(projectId: string): boolean {
    const project = projectRepository.findById(projectId);
    if (!project) return false;

    // Cascade File cleanups
    const associatedFiles = fileRepository.findByField('projectId', projectId);
    for (const file of associatedFiles) {
      // Clean up historic edit records
      const histories = historyRepository.findByField('projectId', projectId);
      for (const h of histories) {
        historyRepository.deleteById(h.id);
      }
      fileRepository.deleteById(file.id);
    }

    return projectRepository.deleteById(projectId);
  }

  // 2. FILE MANAGEMENT & PDF COORDINATION
  public uploadPdf(dto: UploadPdfRequest): PdfFile {
    const project = projectRepository.findById(dto.projectId);
    if (!project) {
      throw new Error(`Target Project ID '${dto.projectId}' does not exist.`);
    }

    if (!dto.originalDataBase64) {
      throw new Error("PDF data content cannot be empty.");
    }

    // Standard ID generator
    const fileId = "pdf_" + Math.random().toString(36).substring(2, 11);

    // Initial page count heuristics (can be updated dynamically by client)
    const pageCount = 1; 

    const newFile: PdfFile = {
      id: fileId,
      projectId: dto.projectId,
      fileName: dto.fileName || "Untitled_Document.pdf",
      fileSize: dto.fileSize || 0,
      pageCount: pageCount,
      originalData: dto.originalDataBase64,
      currentData: dto.originalDataBase64,
      createdAt: new Date().toISOString()
    };

    const savedFile = fileRepository.save(newFile);

    // Touch project updated timestamp
    project.updatedAt = new Date().toISOString();
    projectRepository.save(project);

    return savedFile;
  }

  public getFilesForProject(projectId: string): PdfFile[] {
    return fileRepository.findByField('projectId', projectId);
  }

  public getFileById(fileId: string): PdfFile | null {
    return fileRepository.findById(fileId);
  }

  public updateFilePageCount(fileId: string, pageCount: number): PdfFile {
    const file = fileRepository.findById(fileId);
    if (!file) throw new Error("Target file not found for metadata updates.");
    file.pageCount = pageCount;
    return fileRepository.save(file);
  }

  // Save recalculated PDF stream from pdf-lib
  public savePdfEdits(fileId: string, currentDataBase64: string): PdfFile {
    const file = fileRepository.findById(fileId);
    if (!file) throw new Error("Target PDF file not found.");

    file.currentData = currentDataBase64;
    const saved = fileRepository.save(file);

    // Touch project
    const project = projectRepository.findById(file.projectId);
    if (project) {
      project.updatedAt = new Date().toISOString();
      projectRepository.save(project);
    }

    return saved;
  }

  // 3. EDIT HISTORY LOGS
  public logEditRecord(dto: RecordEditRequest): EditHistory {
    const targetFile = fileRepository.findById(dto.fileId);
    if (!targetFile) throw new Error("Target PDF file does not exist.");

    const newHistory: EditHistory = {
      id: "hist_" + Math.random().toString(36).substring(2, 11),
      fileId: dto.fileId,
      projectId: dto.projectId,
      pageIndex: dto.pageIndex,
      editType: 'TEXT_EDIT',
      originalText: dto.originalText,
      modifiedText: dto.modifiedText,
      styleParams: dto.styleParams,
      timestamp: new Date().toISOString()
    };

    return historyRepository.save(newHistory);
  }

  public getAuditHistory(fileId: string): EditHistory[] {
    return historyRepository.findByField('fileId', fileId).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  public deleteHistoryItem(historyId: string): boolean {
    return historyRepository.deleteById(historyId);
  }

  public deleteFile(fileId: string): boolean {
    const file = fileRepository.findById(fileId);
    if (!file) return false;

    // Delete associated edit history
    const histories = historyRepository.findByField('fileId', fileId);
    for (const h of histories) {
      historyRepository.deleteById(h.id);
    }

    return fileRepository.deleteById(fileId);
  }
}

export const pdfService = new PdfService();
