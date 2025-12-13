/**
 * STAMPS Bulk Generator - Web Server
 * Express.js backend for file operations
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import open from 'open';
import { generateTemplate } from './template-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3847;

// Data storage path
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let db = {
    projects: [],
    generations: [],
    _nextIds: { projects: 1, generations: 1 }
};

if (fs.existsSync(dbPath)) {
    try {
        db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('Error loading database:', e);
    }
}

function saveDb() {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'renderer')));

// File upload handling
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ============ API Routes ============

// Get all projects
app.get('/api/projects', (req, res) => {
    const sorted = db.projects.sort((a, b) =>
        new Date(b.last_used) - new Date(a.last_used)
    );
    res.json(sorted);
});

// Create project
app.post('/api/projects', (req, res) => {
    const { name, folderPath } = req.body;
    const id = db._nextIds.projects++;
    const project = {
        id,
        name,
        folder_path: folderPath,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString()
    };
    db.projects.push(project);
    saveDb();
    res.json({ id });
});

// Update project last used
app.put('/api/projects/:id/touch', (req, res) => {
    const id = parseInt(req.params.id);
    const project = db.projects.find(p => p.id === id);
    if (project) {
        project.last_used = new Date().toISOString();
        saveDb();
    }
    res.json({ success: true });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.projects = db.projects.filter(p => p.id !== id);
    db.generations = db.generations.filter(g => g.project_id !== id);
    saveDb();
    res.json({ success: true });
});

// Save generation
app.post('/api/generations', (req, res) => {
    const { projectId, recordsCount, batchesCount, status } = req.body;
    const id = db._nextIds.generations++;
    const generation = {
        id,
        project_id: projectId,
        records_count: recordsCount,
        batches_count: batchesCount,
        status,
        created_at: new Date().toISOString()
    };
    db.generations.push(generation);
    saveDb();
    res.json({ id });
});

// Get generations for project
app.get('/api/generations/:projectId', (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const generations = db.generations
        .filter(g => g.project_id === projectId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(generations);
});

// List directory contents
app.post('/api/fs/list', (req, res) => {
    const { dirPath } = req.body;
    try {
        if (!fs.existsSync(dirPath)) {
            return res.json([]);
        }
        const files = fs.readdirSync(dirPath);
        res.json(files);
    } catch (e) {
        res.json([]);
    }
});

// Check if file exists
app.post('/api/fs/exists', (req, res) => {
    const { filePath } = req.body;
    res.json({ exists: fs.existsSync(filePath) });
});

// Get file size
app.post('/api/fs/size', (req, res) => {
    const { filePath } = req.body;
    try {
        const stats = fs.statSync(filePath);
        res.json({ size: stats.size });
    } catch {
        res.json({ size: 0 });
    }
});

// Read file as base64
app.post('/api/fs/read-base64', (req, res) => {
    const { filePath } = req.body;
    try {
        const buffer = fs.readFileSync(filePath);
        res.json({ data: buffer.toString('base64') });
    } catch (e) {
        res.status(404).json({ error: 'File not found' });
    }
});

// Read file as buffer (for Excel parsing)
app.post('/api/fs/read', (req, res) => {
    const { filePath } = req.body;
    try {
        const buffer = fs.readFileSync(filePath);
        res.json({ data: buffer.toString('base64') });
    } catch (e) {
        res.status(404).json({ error: 'File not found' });
    }
});

// Write file
app.post('/api/fs/write', (req, res) => {
    const { filePath, content } = req.body;
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Upload Excel file
app.post('/api/upload/excel', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
        data: req.file.buffer.toString('base64'),
        filename: req.file.originalname
    });
});

// Download Excel template
app.get('/api/template/download', (req, res) => {
    try {
        console.log('Generating Excel template...');
        const buffer = generateTemplate();
        console.log('Template generated, buffer size:', buffer.length);

        // Ensure we send as a proper Buffer
        const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="STAMPS_Template.xlsx"');
        res.setHeader('Content-Length', nodeBuffer.length);
        res.send(nodeBuffer);
    } catch (error) {
        console.error('Template generation error:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to generate template: ' + error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✨ STAMPS Bulk Generator is running!`);
    console.log(`\n📂 Open your browser to: http://localhost:${PORT}`);
    console.log(`\n   Press Ctrl+C to stop the server.\n`);

    // Auto-open browser only in local development (not in cloud/production)
    if (!process.env.PORT && !process.env.RAILWAY_ENVIRONMENT && !process.env.RENDER) {
        open(`http://localhost:${PORT}`);
    }
});
