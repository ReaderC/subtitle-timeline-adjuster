const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

// 将整个应用启动过程包裹在异步函数中
async function startServer() {
    // --- 动态导入 ESM 模块 ---
    const { default: SrtParser } = await import('srt-parser-2');
    const { default: assParser } = await import('ass-parser');
    const { default: assStringify } = await import('ass-stringify');

    // 初始化Express应用
    const app = express();
    const PORT = process.env.PORT || 3000;

    // 中间件
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // 配置文件上传
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, '../uploads');
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    });

    const upload = multer({ storage: storage });

    // 确保uploads目录存在
    const uploadsDir = path.join(__dirname, '../uploads');
    try {
        await fs.mkdir(uploadsDir, { recursive: true });
    } catch (e) {
        console.error("Could not create uploads directory", e);
    }

    // --- 时间码处理辅助函数 ---
    function timeToSeconds(timeStr) {
        const [hms, cs] = timeStr.split('.');
        const [h, m, s] = hms.split(':').map(Number);
        return h * 3600 + m * 60 + s + (Number(cs) / 100);
    }

    function secondsToTime(seconds) {
        if (seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.round((seconds - Math.floor(seconds)) * 100);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }

    // --- 字幕处理核心函数 ---
    async function adjustSrt(content, timeAdjustment) {
        const parser = new SrtParser();
        const lines = parser.fromSrt(content);
        lines.forEach(line => {
            const startTime = parser.toSeconds(line.startTime);
            const endTime = parser.toSeconds(line.endTime);
            line.startTime = parser.toSrtTime(startTime + timeAdjustment);
            line.endTime = parser.toSrtTime(endTime + timeAdjustment);
        });
        return parser.toSrt(lines);
    }

    async function adjustAss(content, timeAdjustment) {
        const parsed = assParser(content);
        const events = parsed.find(section => section.key === 'Events');
        if (events && events.body) {
            events.body.forEach(item => {
                if (item.key === 'Dialogue' || item.key === 'Comment') {
                    const start = timeToSeconds(item.value.Start);
                    const end = timeToSeconds(item.value.End);
                    item.value.Start = secondsToTime(start + timeAdjustment);
                    item.value.End = secondsToTime(end + timeAdjustment);
                }
            });
        }
        return assStringify(parsed);
    }

    // --- API 路由 ---
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    app.post('/batch-adjust-timeline', upload.any(), async (req, res) => {
        const timeAdjustment = parseFloat(req.body.timeAdjustment);
        if (isNaN(timeAdjustment)) {
            return res.status(400).json({ error: 'Invalid time adjustment value' });
        }

        const subtitleFiles = req.files.filter(f => f.fieldname !== 'videos');
        if (subtitleFiles.length === 0) {
            return res.status(400).json({ error: 'No subtitle files provided.' });
        }

        const promises = subtitleFiles.map(async (file) => {
            try {
                const content = await fs.readFile(file.path, 'utf-8');
                const ext = path.extname(file.originalname).toLowerCase();
                let adjustedContent;

                if (ext === '.srt') {
                    adjustedContent = await adjustSrt(content, timeAdjustment);
                } else if (ext === '.ass') {
                    adjustedContent = await adjustAss(content, timeAdjustment);
                } else {
                    console.warn(`Skipping unsupported file type: ${file.originalname}`);
                    return null;
                }

                const adjustedFilePath = file.path.replace(/(\.[^.]*)$/, '-adjusted$1');
                await fs.writeFile(adjustedFilePath, adjustedContent);
                return `/uploads/${path.basename(adjustedFilePath)}`;
            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                throw new Error(`Failed to process ${file.originalname}`);
            }
        });

        try {
            const downloadLinks = (await Promise.all(promises)).filter(Boolean);
            res.json({ downloadLinks });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/download/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads', filename);
        res.download(filePath, (err) => {
            if (err) {
                console.error("Download error:", err);
                res.status(404).send('File not found or download error.');
            }
        });
    });

    // --- 服务器启动和清理 ---
    const server = app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });

    async function cleanupUploads() {
        try {
            const files = await fs.readdir(uploadsDir);
            const unlinkPromises = files.map(file => {
                if (file !== '.gitkeep') {
                    return fs.unlink(path.join(uploadsDir, file));
                }
                return Promise.resolve();
            });
            await Promise.all(unlinkPromises);
            console.log('Uploads directory cleaned.');
        } catch (err) {
            console.error('Error cleaning up uploads directory:', err);
        }
    }

    const cleanupAndExit = async () => {
        console.log('Server shutting down. Cleaning up uploads...');
        await cleanupUploads();
        server.close(() => {
            console.log('Server closed.');
            process.exit(0);
        });
    };

    process.on('SIGINT', cleanupAndExit);
    process.on('SIGTERM', cleanupAndExit);
}

// 启动服务器
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
