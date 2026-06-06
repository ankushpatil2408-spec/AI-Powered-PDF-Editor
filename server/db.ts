import fs from 'fs';
import path from 'path';
import { User, PdfProject, PdfFile, EditHistory } from '../src/types.js';

interface DbSchema {
  users: User[];
  pdf_projects: PdfProject[];
  pdf_files: PdfFile[];
  edit_history: EditHistory[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

const DEFAULT_DB: DbSchema = {
  users: [
    {
      id: "usr_default_01",
      email: "pdf.architect@aistudio.build",
      name: "Senior Architect",
      role: "ADMIN",
      createdAt: new Date().toISOString()
    }
  ],
  pdf_projects: [],
  pdf_files: [],
  edit_history: []
};

// Ensure database file and directory exist
function initDb() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  }
}

// Read from JSON file database
export function readDb(): DbSchema {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(raw) as DbSchema;
  } catch (err) {
    console.error("Failed to read database, resetting to default...", err);
    return DEFAULT_DB;
  }
}

// Write to JSON file database
export function writeDb(data: DbSchema): void {
  initDb();
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write to database:", err);
  }
}

/**
 * Robust JpaRepository Abstraction simulating Spring Data JPA
 */
export class JpaRepository<T extends { id: string }> {
  private tableName: keyof DbSchema;

  constructor(tableName: keyof DbSchema) {
    this.tableName = tableName;
  }

  findAll(): T[] {
    const db = readDb();
    return (db[this.tableName] as unknown as T[]) || [];
  }

  findById(id: string): T | null {
    const records = this.findAll();
    return records.find(r => r.id === id) || null;
  }

  findByField(field: keyof T, value: any): T[] {
    const records = this.findAll();
    return records.filter(r => r[field] === value);
  }

  findSingleByField(field: keyof T, value: any): T | null {
    const records = this.findAll();
    return records.find(r => r[field] === value) || null;
  }

  save(entity: T): T {
    const db = readDb();
    const records = (db[this.tableName] as unknown as T[]) || [];
    const index = records.findIndex(r => r.id === entity.id);

    if (index >= 0) {
      // JPA update behavior
      records[index] = { ...records[index], ...entity };
    } else {
      // JPA insert behavior
      records.push(entity);
    }

    db[this.tableName] = records as any;
    writeDb(db);
    return entity;
  }

  deleteById(id: string): boolean {
    const db = readDb();
    const records = (db[this.tableName] as unknown as T[]) || [];
    const originalLength = records.length;
    const filtered = records.filter(r => r.id !== id);

    if (filtered.length === originalLength) {
      return false; // Not found
    }

    db[this.tableName] = filtered as any;
    writeDb(db);
    return true;
  }
}

// Instantiate repositories equivalent to Spring JpaRepositories
export const userRepository = new JpaRepository<User>('users');
export const projectRepository = new JpaRepository<PdfProject>('pdf_projects');
export const fileRepository = new JpaRepository<PdfFile>('pdf_files');
export const historyRepository = new JpaRepository<EditHistory>('edit_history');
