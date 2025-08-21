const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

// --- Configuration Loading ---
function getConfig() {
    const configPath = path.join(__dirname, '../config.json');
    let config = {};
    try {
        if (fsSync.existsSync(configPath)) {
            const rawConfig = fsSync.readFileSync(configPath, 'utf-8');
            config = JSON.parse(rawConfig);
        }
    } catch (error) {
        console.error('Error reading or parsing config.json:', error);
        process.exit(1);
    }
    return {
        mediaDirectory: process.env.MEDIA_DIR || config.mediaDirectory,
        serverToken: process.env.SERVER_TOKEN || config.serverToken
    };
}

const config = getConfig();
const mediaRoot = config.mediaDirectory ? path.normalize(config.mediaDirectory) : null;
const serverToken = config.serverToken;
const isServerFsEnabled = !!mediaRoot;

if (isServerFsEnabled) {
    console.log(`Server-side file browsing is enabled. Serving media from root directory: ${mediaRoot}`);
    if (!serverToken) {
        console.warn('Warning: Server file browsing is enabled, but no token is set. File access is not secure.');
    }
} else {
    console.log('Server-side file browsing is disabled. Only local file upload is available.');
}

// --- Main Application ---
async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json({ limit: '50mb' })); // Increase limit for receiving file content
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // --- Auth Middleware ---
    const authenticateRequest = (req, res, next) => {
        if (!isServerFsEnabled) {
            return res.status(503).json({ error: 'Server-side file browsing is not enabled on the server.' });
        }
        if (serverToken) {
            const token = req.headers['x-server-token'];
            if (token !== serverToken) {
                return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
            }
        }
        next();
    };

    // --- API Routes ---
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
    app.get('/api/status', (req, res) => res.json({ isServerFsEnabled }));

    // --- Protected Server API Routes ---
    app.get('/api/browse', authenticateRequest, async (req, res) => {
        const currentPath = req.query.path || '';
        const absolutePath = path.join(mediaRoot, currentPath);
        if (!path.normalize(absolutePath).startsWith(mediaRoot)) return res.status(403).json({ error: 'Access Forbidden' });
        try {
            const dirents = await fs.readdir(absolutePath, { withFileTypes: true });
            const files = dirents.map(d => ({ name: d.name, type: d.isDirectory() ? 'directory' : 'file' })).sort((a,b) => (a.type===b.type) ? a.name.localeCompare(b.name) : a.type==='directory'?-1:1);
            res.json({ path: currentPath, files });
        } catch (e) { res.status(500).json({ error: 'Failed to browse directory.' }); }
    });

    app.get('/api/stream', authenticateRequest, (req, res) => {
        const filePath = req.query.path;
        if (!filePath) return res.status(400).send('File path is required.');
        const absolutePath = path.join(mediaRoot, filePath);
        if (!path.normalize(absolutePath).startsWith(mediaRoot)) return res.status(403).send('Access Forbidden');
        try {
            const stat = fsSync.statSync(absolutePath);
            const fileSize = stat.size, range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-"), start = parseInt(parts[0], 10), end = parts[1]?parseInt(parts[1],10):fileSize-1, chunksize=(end-start)+1, file=fsSync.createReadStream(absolutePath,{start,end});
                res.writeHead(206, {'Content-Range':`bytes ${start}-${end}/${fileSize}`,'Accept-Ranges':'bytes','Content-Length':chunksize,'Content-Type':'video/mp4'});
                file.pipe(res);
            } else {
                res.writeHead(200, {'Content-Length':fileSize,'Content-Type':'video/mp4'});
                fsSync.createReadStream(absolutePath).pipe(res);
            }
        } catch (e) { res.status(404).send('File not found.'); }
    });

    app.get('/api/subtitle', authenticateRequest, async (req, res) => {
        const filePath = req.query.path;
        if (!filePath) return res.status(400).send('File path is required.');
        const absolutePath = path.join(mediaRoot, filePath);
        if (!path.normalize(absolutePath).startsWith(mediaRoot)) return res.status(403).send('Access Forbidden');
        try { res.send(await fs.readFile(absolutePath, 'utf-8')); } catch (e) { res.status(500).send('Error reading subtitle file.'); }
    });

    // --- NEW: Save Route ---
    app.post('/api/save', express.text({ limit: '50mb' }), async (req, res) => {
        const filename = req.query.filename;
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required.' });
        }
        const safeFilename = path.basename(filename).replace(/(\.[^.]*)$/, '-adjusted$1');
        const filePath = path.join(uploadsDir, safeFilename);

        try {
            await fs.writeFile(filePath, req.body);
            res.json({ downloadLink: `/uploads/${safeFilename}` });
        } catch (error) {
            console.error('Error saving file:', error);
            res.status(500).json({ error: 'Failed to save file.' });
        }
    });

    // --- Server Lifecycle ---
    const server = app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
    async function cleanupUploads() {
        try {
            const files = await fs.readdir(uploadsDir);
            await Promise.all(files.map(file => fs.unlink(path.join(uploadsDir, file)).catch(err => console.error(err))));
            console.log('Uploads directory cleaned.');
        } catch (err) { console.error('Error cleaning up uploads directory:', err); }
    }
    const cleanupAndExit = async () => { console.log('Server shutting down...'); await cleanupUploads(); server.close(() => { console.log('Server closed.'); process.exit(0); }); };
    process.on('SIGINT', cleanupAndExit);
    process.on('SIGTERM', cleanupAndExit);
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});