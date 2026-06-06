/**
 * Core Data Models & DTO Type Declarations
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  mobileNo?: string;
  password?: string;
}

export interface PdfProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PdfFile {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  originalData: string; // Base64 raw original file content
  currentData: string;  // Base64 current edit file content
  createdAt: string;
}

export interface TextStyleParams {
  fontFamily: string;
  fontSize: number;
  color: string; // e.g. '#000000' or rgb values
  x: number;
  y: number;
  width: number;
  height: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlignment?: string;
  textOffsetX?: number;
  textOffsetY?: number;
  rectOffsetX?: number;
  rectOffsetY?: number;
  rectWidthOffset?: number;
  rectHeightOffset?: number;
  hasMask?: boolean;
  letterSpacing?: number;
  scaleX?: number;
  opacity?: number;
  backgroundColor?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

export interface EditHistory {
  id: string;
  fileId: string;
  projectId: string;
  pageIndex: number; // 0-based page index
  editType: 'TEXT_EDIT' | 'TEXT_ADD' | 'TEXT_REMOVE' | 'TEXT_MOVE';
  originalText: string;
  modifiedText: string;
  styleParams: TextStyleParams;
  timestamp: string;
}

// REST DTO Request-Response Contracts (Validation Models)
export interface CreateProjectRequest {
  name: string;
  description?: string;
  userId: string;
}

export interface UploadPdfRequest {
  projectId: string;
  fileName: string;
  fileSize: number;
  originalDataBase64: string; // Base64 payload
}

export interface RecordEditRequest {
  fileId: string;
  projectId: string;
  pageIndex: number;
  originalText: string;
  modifiedText: string;
  styleParams: TextStyleParams;
}

export interface SavePdfRequest {
  fileId: string;
  updatedDataBase64: string; // Recalculated PDF with PDF-lib
}

// Standardized Spring-Boot-like Exception API Response structure
export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details?: string[];
}
