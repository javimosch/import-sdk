const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3012;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline styles for development
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (use database in production)
const storage = {
    imports: [],
    metrics: [],
    auditLogs: [],
    systemLogs: []
};

// Helper function to generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Routes

// Dashboard - Main metrics view
app.get('/', (req, res) => {
    const recentImports = storage.imports
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    
    const summary = {
        totalImports: storage.imports.length,
        avgDuration: storage.imports.length > 0 ? 
            storage.imports.reduce((sum, imp) => sum + (imp.metrics?.totalDurationSeconds || 0), 0) / storage.imports.length : 0,
        avgThroughput: storage.imports.length > 0 ?
            storage.imports.reduce((sum, imp) => sum + (imp.metrics?.rowsPerSecond || 0), 0) / storage.imports.length : 0,
        avgEfficiency: storage.imports.length > 0 ?
            storage.imports.reduce((sum, imp) => sum + (imp.metrics?.efficiency || 0), 0) / storage.imports.length : 0,
        recentErrors: storage.auditLogs.filter(log => log.level === 'error').slice(-10),
        systemStatus: 'operational'
    };
    
    res.render('dashboard', { 
        imports: recentImports, 
        summary,
        title: 'ImportSDK Metrics Dashboard'
    });
});

// Import metrics endpoint
app.post('/api/import/metrics', (req, res) => {
    try {
        const { importId, sessionId, fileName, metrics, stats, timestamp } = req.body;
        
        const importRecord = {
            id: importId || generateId(),
            sessionId: sessionId || generateId(),
            fileName: fileName || 'unknown.csv',
            timestamp: timestamp || new Date().toISOString(),
            metrics: metrics || {},
            stats: stats || {},
            createdAt: new Date().toISOString()
        };
        
        storage.imports.push(importRecord);
        storage.metrics.push({
            id: generateId(),
            importId: importRecord.id,
            ...metrics,
            timestamp: new Date().toISOString()
        });
        
        // Log the import completion
        storage.auditLogs.push({
            id: generateId(),
            type: 'import_completed',
            importId: importRecord.id,
            level: 'info',
            message: `Import completed: ${fileName} (${stats?.totalCount || 0} rows)`,
            data: { fileName, rowCount: stats?.totalCount, duration: metrics?.totalDurationSeconds },
            timestamp: new Date().toISOString()
        });
        
        console.log(`📊 Import metrics received: ${fileName} - ${metrics?.rowsPerSecond?.toFixed(1)} rows/sec`);
        
        res.json({ 
            success: true, 
            importId: importRecord.id,
            message: 'Metrics recorded successfully'
        });
    } catch (error) {
        console.error('Error recording metrics:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to record metrics',
            details: error.message 
        });
    }
});

// Progress tracking endpoint
app.post('/api/import/progress', (req, res) => {
    try {
        const { importId, sessionId, progress, metrics } = req.body;
        
        storage.systemLogs.push({
            id: generateId(),
            type: 'import_progress',
            importId: importId || 'unknown',
            sessionId: sessionId || 'unknown',
            level: 'info',
            message: `Import progress: ${progress?.percentage || 0}%`,
            data: { progress, metrics },
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording progress:', error);
        res.status(500).json({ success: false, error: 'Failed to record progress' });
    }
});

// Audit log endpoint
app.post('/api/audit/log', (req, res) => {
    try {
        const { level, message, type, data, importId, sessionId } = req.body;
        
        const logEntry = {
            id: generateId(),
            level: level || 'info',
            message: message || 'No message',
            type: type || 'general',
            importId: importId || null,
            sessionId: sessionId || null,
            data: data || {},
            timestamp: new Date().toISOString()
        };
        
        storage.auditLogs.push(logEntry);
        
        console.log(`📝 Audit log: [${level?.toUpperCase()}] ${message}`);
        
        res.json({ success: true, logId: logEntry.id });
    } catch (error) {
        console.error('Error recording audit log:', error);
        res.status(500).json({ success: false, error: 'Failed to record audit log' });
    }
});

// API Routes for data retrieval

// Get all imports
app.get('/api/imports', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const imports = storage.imports
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);
    
    res.json({
        imports,
        total: storage.imports.length,
        limit,
        offset
    });
});

// Get specific import details
app.get('/api/imports/:id', (req, res) => {
    const importRecord = storage.imports.find(imp => imp.id === req.params.id);
    if (!importRecord) {
        return res.status(404).json({ error: 'Import not found' });
    }
    
    const relatedLogs = storage.auditLogs.filter(log => log.importId === req.params.id);
    
    res.json({
        import: importRecord,
        logs: relatedLogs
    });
});

// Get audit logs
app.get('/api/audit/logs', (req, res) => {
    const level = req.query.level;
    const limit = parseInt(req.query.limit) || 100;
    
    let logs = storage.auditLogs;
    if (level) {
        logs = logs.filter(log => log.level === level);
    }
    
    logs = logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    
    res.json({ logs, total: logs.length });
});

// Get metrics summary
app.get('/api/metrics/summary', (req, res) => {
    const timeRange = req.query.range || '24h'; // 1h, 24h, 7d, 30d
    
    let cutoffTime = new Date();
    switch (timeRange) {
        case '1h':
            cutoffTime.setHours(cutoffTime.getHours() - 1);
            break;
        case '24h':
            cutoffTime.setDate(cutoffTime.getDate() - 1);
            break;
        case '7d':
            cutoffTime.setDate(cutoffTime.getDate() - 7);
            break;
        case '30d':
            cutoffTime.setDate(cutoffTime.getDate() - 30);
            break;
    }
    
    const recentImports = storage.imports.filter(
        imp => new Date(imp.timestamp) > cutoffTime
    );
    
    const summary = {
        totalImports: recentImports.length,
        totalRows: recentImports.reduce((sum, imp) => sum + (imp.stats?.totalCount || 0), 0),
        avgDuration: recentImports.length > 0 ? 
            recentImports.reduce((sum, imp) => sum + (imp.metrics?.totalDurationSeconds || 0), 0) / recentImports.length : 0,
        avgThroughput: recentImports.length > 0 ?
            recentImports.reduce((sum, imp) => sum + (imp.metrics?.rowsPerSecond || 0), 0) / recentImports.length : 0,
        avgEfficiency: recentImports.length > 0 ?
            recentImports.reduce((sum, imp) => sum + (imp.metrics?.efficiency || 0), 0) / recentImports.length : 0,
        errorCount: storage.auditLogs.filter(log => 
            log.level === 'error' && new Date(log.timestamp) > cutoffTime
        ).length,
        timeRange
    };
    
    res.json(summary);
});

// View routes
app.get('/imports', (req, res) => {
    const imports = storage.imports
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.render('imports', { 
        imports, 
        title: 'Import History'
    });
});

app.get('/imports/:id', (req, res) => {
    const importRecord = storage.imports.find(imp => imp.id === req.params.id);
    if (!importRecord) {
        return res.status(404).render('error', { 
            error: 'Import not found',
            title: 'Error' 
        });
    }
    
    const relatedLogs = storage.auditLogs.filter(log => log.importId === req.params.id);
    
    res.render('import-details', { 
        importRecord: importRecord,
        logs: relatedLogs,
        title: `Import: ${importRecord.fileName}`
    });
});

app.get('/logs', (req, res) => {
    const logs = storage.auditLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 200);
    
    res.render('logs', { 
        logs, 
        title: 'Audit Logs'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        storage: {
            imports: storage.imports.length,
            metrics: storage.metrics.length,
            auditLogs: storage.auditLogs.length,
            systemLogs: storage.systemLogs.length
        }
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { 
        error: 'Page not found',
        title: 'Error 404' 
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        error: 'Internal server error',
        title: 'Error 500' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`📊 ImportSDK Metrics Backend running on port ${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log('📈 Ready to receive metrics...');
});

module.exports = app;