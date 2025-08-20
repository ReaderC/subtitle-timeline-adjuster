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
    const { default: SrtParser } = await import('srt-parser-2');
    const { default: assParser } = await import('ass-parser');
    const { default: assStringify } = await import('ass-stringify');

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')), filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`) });
    const upload = multer({ storage: storage });

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

    // --- Helper Functions (Unchanged) ---
    function timeToSeconds(t){const[h,c]=t.split('.');const[s,m,d]=h.split(':').map(Number);return 3600*s+60*m+d+Number(c)/100}function secondsToTime(t){t<0&&(t=0);const h=Math.floor(t/3600),c=Math.floor(t%3600/60),s=Math.floor(t%60),d=Math.round(100*(t-Math.floor(t)));return`${h}:${String(c).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(d).padStart(2,"0")}`}async function adjustSrt(t,h){const c=new SrtParser,s=c.fromSrt(t);return s.forEach(t=>{const s=c.toSeconds(t.startTime),d=c.toSeconds(t.endTime);t.startTime=c.toSrtTime(s+h),t.endTime=c.toSrtTime(d+h)}),c.toSrt(s)}async function adjustAss(t,h){const c=assParser(t),s=c.find(t=>"Events"===t.key);return s&&s.body&&s.body.forEach(t=>{if("Dialogue"===t.key||"Comment"===t.key){const c=timeToSeconds(t.value.Start),s=timeToSeconds(t.value.End);t.value.Start=secondsToTime(c+h),t.value.End=secondsToTime(s+h)}}),assStringify(c)}

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

    // --- Existing Upload Route (for saving adjusted files) ---
    app.post('/batch-adjust-timeline', upload.any(), async (req, res) => {
        const timeAdjustment = parseFloat(req.body.timeAdjustment);
        if (isNaN(timeAdjustment)) return res.status(400).json({ error: 'Invalid time adjustment value' });
        const subtitleFiles = req.files.filter(f => f.fieldname !== 'videos');
        if (subtitleFiles.length === 0) return res.status(400).json({ error: 'No subtitle files provided.' });
        const promises = subtitleFiles.map(async (file) => {
            const content = await fs.readFile(file.path, 'utf-8');
            const ext = path.extname(file.originalname).toLowerCase();
            let adjustedContent = ext === '.srt' ? await adjustSrt(content, timeAdjustment) : await adjustAss(content, timeAdjustment);
            const adjustedFilePath = file.path.replace(/(\.[^.]*)$/, '-adjusted$1');
            await fs.writeFile(adjustedFilePath, adjustedContent);
            return `/uploads/${path.basename(adjustedFilePath)}`;
        });
        try { res.json({ downloadLinks: (await Promise.all(promises)).filter(Boolean) }); } catch (e) { res.status(500).json({ error: e.message }); }
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
