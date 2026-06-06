import { Router, Request, Response, NextFunction } from 'express';
import { pdfService } from './services/pdfService.js';
import { aiService } from './services/aiService.js';
import { validateDto } from './middleware/errorHandler.js';
import { userRepository } from './db.js';

const router = Router();

// ==========================================
// 1. SYSTEM & AUTH USER OVERVIEW (Seeded dummy root)
// ==========================================
router.get('/api/users/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultUser = userRepository.findById('usr_default_01');
    if (!defaultUser) {
      throw { status: 404, message: "Default administrative user record missing." };
    }
    res.json(defaultUser);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 1.5 GOOGLE OAUTH SECURITY AUTHENTICATION
// ==========================================
router.get('/api/auth/google/url', (req: Request, res: Response, next: NextFunction) => {
  try {
    const origin = (req.query.origin as string) || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Google client configuration check
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // If keys are missing, gracefully redirect popup to local instructions and sandbox mode
      return res.json({ url: `/api/auth/google/sandbox-login?redirect_uri=${encodeURIComponent(redirectUri)}` });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (err) {
    next(err);
  }
});

router.get('/api/auth/google/sandbox-login', (req: Request, res: Response) => {
  const redirectUri = (req.query.redirect_uri as string) || '';
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Accounts - Sandbox Mode</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-between min-h-screen p-6 font-sans">
  <div class="max-w-md mx-auto my-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-705">
    <div class="flex items-center space-x-3 mb-4">
      <div class="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg">
        G
      </div>
      <div>
        <h2 class="text-xl font-bold tracking-tight">Google Sign-In Sandbox</h2>
        <p class="text-[10px] uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400 font-bold">Local Preview Mode</p>
      </div>
    </div>
    
    <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-xl text-xs space-y-2 mb-6 text-amber-805 dark:text-amber-300">
      <p class="font-bold">Google OAuth Keys Not Registered</p>
      <p class="leading-relaxed">
        To configure a real Google Account login, add these standard credentials variables inside your AI Studio settings:
      </p>
      <ul class="list-disc list-inside space-y-1 font-mono text-[10px] text-amber-700 dark:text-amber-400">
        <li>GOOGLE_CLIENT_ID</li>
        <li>GOOGLE_CLIENT_SECRET</li>
      </ul>
    </div>

    <div class="space-y-4">
      <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400">Select simulated test account:</h3>
      
      <button onclick="simulate('ankushpatil.2408@gmail.com', 'Ankush Patil')" class="w-full flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left">
        <div>
          <p class="text-sm font-semibold text-slate-800 dark:text-white">Ankush Patil</p>
          <p class="text-xs text-slate-400 font-mono">ankushpatil.2408@gmail.com</p>
        </div>
        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">Select &rarr;</span>
      </button>

      <button onclick="simulate('admin.architect@aistudio.build', 'Document Admin')" class="w-full flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left">
        <div>
          <p class="text-sm font-semibold text-slate-800 dark:text-white font-sans">Document Admin</p>
          <p class="text-xs text-slate-400 font-mono">admin.architect@aistudio.build</p>
        </div>
        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">Select &rarr;</span>
      </button>
    </div>

    <div class="mt-5 pt-4 border-t border-slate-150 dark:border-slate-700/80 space-y-3">
      <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custom Google Account Identity</p>
      <div class="flex gap-2">
        <input id="custom-email" type="email" placeholder="test.user@gmail.com" class="flex-1 text-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:border-indigo-500">
        <button onclick="simulateCustom()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">Simulate</button>
      </div>
    </div>
  </div>

  <div class="text-center text-[10px] text-slate-405 mt-4 leading-normal">
    Callback registered logic path: <br><span class="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400" id="callback-uri"></span>
  </div>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUri = urlParams.get('redirect_uri') || '';
    document.getElementById('callback-uri').textContent = redirectUri;

    function simulate(email, name) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          user: {
            id: 'usr_g_mock_' + Math.random().toString(36).substring(2, 9),
            email: email,
            name: name,
            role: 'EDITOR'
          }
        }, '*');
        window.close();
      } else {
        alert('Opener window not detected. Please verify you opened this in the iframe popup channel.');
      }
    }

    function simulateCustom() {
      const email = document.getElementById('custom-email').value.trim();
      if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
      }
      const baseName = email.split('@')[0];
      const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      simulate(email, name);
    }
  </script>
</body>
</html>
  `);
});

router.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', message: 'No authorization code returned from Google.' }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  }

  const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      throw new Error("Google token exchange failed: " + errBody);
    }

    const tokens = await tokenResponse.json() as { access_token: string };
    
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: "Bearer " + tokens.access_token }
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to retrieve user profile information from Google.');
    }

    const profile = await profileResponse.json() as { email: string; name?: string; picture?: string };
    const email = profile.email;
    const name = profile.name || email.split('@')[0];

    // Find/Register Google User in the db
    let user = userRepository.findSingleByField('email', email.toLowerCase());
    if (!user) {
      user = userRepository.save({
        id: 'usr_g_' + Math.random().toString(36).substring(2, 9),
        email: email.toLowerCase(),
        name: name,
        role: 'EDITOR',
        createdAt: new Date().toISOString()
      });
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(user)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Google authentication complete. Refreshing workspace environment...</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Google AuthCallback error:", err);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', message: ${JSON.stringify(err.message)} }, '*');
              window.close();
            }
          </script>
          <p>Authentication failed: ${err.message}</p>
        </body>
      </html>
    `);
  }
});

// ==========================================
// 2. PROJECT CONTROLLERS
// ==========================================

// Create new project project
router.post('/api/projects', validateDto('CreateProjectRequest'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = pdfService.createProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// Find all projects
router.get('/api/projects', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || "usr_default_01";
    const projects = pdfService.getProjectsForUser(userId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// Find project details by ID
router.get('/api/projects/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = pdfService.getProjectById(req.params.id);
    if (!project) {
      throw { status: 404, message: `PdfProject with ID '${req.params.id}' could not be located.` };
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Delete project
router.delete('/api/projects/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = pdfService.deleteProject(req.params.id);
    if (!deleted) {
      throw { status: 404, message: `Target project of ID '${req.params.id}' does not exist.` };
    }
    res.json({ success: true, message: "Project and cascade structures successfully removed." });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. FILE CONTROLLERS
// ==========================================

// Upload PDF document inside project page
router.post('/api/projects/:projectId/upload', validateDto('UploadPdfRequest'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectFile = pdfService.uploadPdf({
      projectId: req.params.projectId,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize,
      originalDataBase64: req.body.originalDataBase64
    });
    res.status(201).json(projectFile);
  } catch (err) {
    next(err);
  }
});

// Find all uploaded files for project
router.get('/api/projects/:projectId/files', (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = pdfService.getFilesForProject(req.params.projectId);
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// Get deep details of a specific PDF file (including base64 bytes!)
router.get('/api/files/:fileId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = pdfService.getFileById(req.params.fileId);
    if (!file) {
      throw { status: 404, message: `Requested PDF file ID '${req.params.fileId}' not found.` };
    }
    res.json(file);
  } catch (err) {
    next(err);
  }
});

// Save updated PDF base64 bytes (the edited output)
router.post('/api/files/:fileId/save', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updatedDataBase64 } = req.body;
    if (!updatedDataBase64) {
      throw { status: 400, message: "Missing updatedDataBase64 field payload." };
    }
    const updatedFile = pdfService.savePdfEdits(req.params.fileId, updatedDataBase64);
    res.json(updatedFile);
  } catch (err) {
    next(err);
  }
});

// Save pagecount metadata dynamically when analyzed by client
router.post('/api/files/:fileId/pagecount', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pageCount } = req.body;
    if (pageCount === undefined || pageCount < 1) {
      throw { status: 400, message: "Pagecount must be configured as a positive integer." };
    }
    const updatedFile = pdfService.updateFilePageCount(req.params.fileId, pageCount);
    res.json(updatedFile);
  } catch (err) {
    next(err);
  }
});

// Log edit events history
router.post('/api/files/:fileId/history', validateDto('RecordEditRequest'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.fileId !== req.params.fileId) {
      throw { status: 400, message: "Route ID parameters must match request body values." };
    }
    const historyItem = pdfService.logEditRecord(req.body);
    res.status(201).json(historyItem);
  } catch (err) {
    next(err);
  }
});

// Get audit/revision logs for document
router.get('/api/files/:fileId/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const histories = pdfService.getAuditHistory(req.params.fileId);
    res.json(histories);
  } catch (err) {
    next(err);
  }
});

// Delete or revert a specific history revision transaction
router.delete('/api/files/:fileId/history/:historyId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { historyId } = req.params;
    const deleted = pdfService.deleteHistoryItem(historyId);
    if (!deleted) {
      throw { status: 404, message: `History record with ID '${historyId}' not found.` };
    }
    res.json({ success: true, message: "History revision transaction safely deleted and reverted." });
  } catch (err) {
    next(err);
  }
});

// Delete a specific PDF file completely
router.delete('/api/files/:fileId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const deleted = pdfService.deleteFile(fileId);
    if (!deleted) {
      throw { status: 404, message: `File with ID '${fileId}' not found.` };
    }
    res.json({ success: true, message: "PDF document and all revisions deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// Stream Original PDF binary document directly with HTTP header attachments
router.get('/api/files/:fileId/download/original', (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = pdfService.getFileById(req.params.fileId);
    if (!file) {
      throw { status: 404, message: "PDF document file not found." };
    }

    const binaryBuffer = Buffer.from(file.originalData, 'base64');
    const sanitizedName = file.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Original_${sanitizedName}"`);
    res.setHeader('Content-Length', binaryBuffer.length);
    res.send(binaryBuffer);
  } catch (err) {
    next(err);
  }
});

// Stream Current PDF binary document directly with HTTP header attachments
router.get('/api/files/:fileId/download/current', (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = pdfService.getFileById(req.params.fileId);
    if (!file) {
      throw { status: 404, message: "PDF document file not found." };
    }

    const binaryBuffer = Buffer.from(file.currentData, 'base64');
    const sanitizedName = file.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Polished_${sanitizedName}"`);
    res.setHeader('Content-Length', binaryBuffer.length);
    res.send(binaryBuffer);
  } catch (err) {
    next(err);
  }
});

// Analyze document state and provide custom Gemini AI metadata details
router.get('/api/files/:fileId/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = pdfService.getFileById(req.params.fileId);
    if (!file) {
      throw { status: 404, message: "PDF document not located." };
    }

    const histories = pdfService.getAuditHistory(req.params.fileId);
    const editedCount = histories.length;

    // Build sample strings to feed into layout insights detector
    const sampleTexts = histories.slice(0, 8).map(h => h.modifiedText).join('\n');
    let summaryText = "Original vector structure with zero active modifications.";
    let detectedTone = "Technical Document";
    let scoreCode = "High Integrity";

    if (editedCount > 0) {
      try {
        const aiPrompt = `Analyze the modifications of a PDF document.
Modified snippets:
"${sampleTexts}"

Provide a brief 1-sentence high-level summary of the modifications, followed by the tone assessment and a score tag.
Respond ONLY as a JSON string with the fields:
{
  "summary": "your brief summary here",
  "tone": "Formal/Corporate/Creative/etc.",
  "integrityScore": "Clean / Draft / Modified"
}`;
        const aiResponse = await aiService.polishText(sampleTexts, "Summarize as a JSON schema of summary, tone, and integrityScore fields ONLY");
        const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
        summaryText = parsed.summary || summaryText;
        detectedTone = parsed.tone || detectedTone;
        scoreCode = parsed.integrityScore || scoreCode;
      } catch (e) {
        summaryText = `Contains ${editedCount} active text segment changes.`;
      }
    }

    res.json({
      fileId: file.id,
      fileName: file.fileName,
      totalEdits: editedCount,
      summary: summaryText,
      tone: detectedTone,
      integrity: scoreCode,
      analyzedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. SMART AI ASSISTANCE ENDPOINT
// ==========================================
router.post('/api/ai/polish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, instruction } = req.body;
    if (!text || !instruction) {
      throw { status: 400, message: "Missing 'text' of document target or AI 'instruction' specifiers." };
    }

    const polished = await aiService.polishText(text, instruction);
    res.json({ originalText: text, polishedText: polished });
  } catch (err) {
    next(err);
  }
});

export default router;
