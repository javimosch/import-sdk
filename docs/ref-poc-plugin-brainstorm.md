# Ref-POC Features as ImportSDK Plugins

## Enhanced Plugin System Architecture

### Current Plugin Types
- `field` - Transform individual fields
- `row` - Transform/validate entire rows  
- `batch` - Process before/after sending batches

### Proposed New Plugin Types
- `file` - File-level operations (validation, splitting)
- `import` - Import lifecycle hooks
- `error` - Error handling and formatting
- `metrics` - Custom metrics collection

---

## 🚀 Ref-POC Plugin Implementations

### 1. File Validation Plugin (file type)

**Inspired by:** `BinController::validFile()`

```javascript
ImportSDK.use({
    name: 'csvFileValidator',
    type: 'file',
    
    config: {
        allowedMimeTypes: ['text/csv', 'application/csv'],
        requiredColumns: ['tankNumber'],
        allowedColumns: [
            'chipNumber', 'tankNumber', 'rfidNumber', 'uhfNumber',
            'memoryChipNumber', 'longitude', 'latitude', 'streetNumber',
            'roadNumber', 'street', 'city', 'zipCode', 'borough',
            'department', 'region', 'country', 'comment', 'active',
            'commissioningDate', 'makeId', 'typeId', 'categoryId',
            'typeLabel', 'categoryLabel', 'volume'
        ],
        warnUnknownColumns: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        delimiter: ';'
    },
    
    validate(file, sdk, config) {
        return new Promise((resolve) => {
            const validation = {
                isValid: true,
                errors: [],
                warnings: [],
                fileInfo: {}
            };
            
            // 1. MIME type validation
            if (!config.allowedMimeTypes.includes(file.type)) {
                validation.isValid = false;
                validation.errors.push(`Invalid file type: ${file.type}. Expected: CSV`);
            }
            
            // 2. File size validation
            if (file.size > config.maxFileSize) {
                validation.isValid = false;
                validation.errors.push(`File too large: ${file.size} bytes. Max: ${config.maxFileSize}`);
            }
            
            // 3. CSV structure validation
            this.validateCsvStructure(file, config, validation)
                .then(() => resolve(validation))
                .catch(error => {
                    validation.isValid = false;
                    validation.errors.push(error.message);
                    resolve(validation);
                });
        });
    },
    
    validateCsvStructure(file, config, validation) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvContent = e.target.result;
                    const lines = csvContent.split('\n');
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must have at least one data row'));
                        return;
                    }
                    
                    // Parse header
                    const header = lines[0].split(config.delimiter).map(h => h.trim());
                    validation.fileInfo.columns = header;
                    validation.fileInfo.totalRows = lines.length - 1;
                    
                    // Check required columns
                    config.requiredColumns.forEach(required => {
                        if (!header.includes(required)) {
                            validation.isValid = false;
                            validation.errors.push(`Missing required column: ${required}`);
                        }
                    });
                    
                    // Warn about unknown columns
                    if (config.warnUnknownColumns) {
                        header.forEach(column => {
                            if (!config.allowedColumns.includes(column)) {
                                validation.warnings.push(`Unknown column: ${column} will be ignored`);
                            }
                        });
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
});
```

### 2. Smart Field Mapping Plugin (row type)

**Inspired by:** `Import::formatValue()`

```javascript
ImportSDK.use({
    name: 'smartFieldMapping',
    type: 'row',
    
    config: {
        // Field aliases - map multiple possible names to target field
        aliases: {
            chipNumber: ['rfidNumber', 'uhfNumber', 'memoryChipNumber'],
            tankNumber: ['tank_id', 'TankID', 'tankId'],
            latitude: ['lat', 'Latitude'],
            longitude: ['lng', 'lon', 'Longitude']
        },
        
        // Auto type detection
        autoTypeDetection: {
            boolean: ['active', 'enabled', 'visible'],
            integer: ['makeId', 'typeId', 'categoryId', 'volume'],
            float: ['latitude', 'longitude'],
            date: ['commissioningDate']
        },
        
        // Field-specific transformations
        transformers: {
            // Boolean conversion
            boolean: (value) => {
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true';
                }
                return Boolean(value);
            },
            
            // Numeric conversion with null handling
            numeric: (value, type = 'int') => {
                if (value === '' || value === null || value === undefined) {
                    return null;
                }
                
                const num = type === 'float' ? parseFloat(value) : parseInt(value);
                return isNaN(num) ? null : num;
            },
            
            // Coordinate normalization
            coordinate: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return null;
                
                // Validate coordinate ranges
                if (Math.abs(num) > 180) return null;
                return num;
            }
        }
    },
    
    transform(row, sdk, config) {
        const transformed = { ...row };
        
        // 1. Apply field aliases
        Object.entries(config.aliases).forEach(([target, sources]) => {
            if (!transformed[target]) {
                for (const source of sources) {
                    if (transformed[source]) {
                        transformed[target] = transformed[source];
                        break;
                    }
                }
            }
        });
        
        // 2. Apply auto type detection
        Object.entries(config.autoTypeDetection).forEach(([type, fields]) => {
            fields.forEach(field => {
                if (transformed[field] !== undefined) {
                    switch (type) {
                        case 'boolean':
                            transformed[field] = config.transformers.boolean(transformed[field]);
                            break;
                        case 'integer':
                            transformed[field] = config.transformers.numeric(transformed[field], 'int');
                            break;
                        case 'float':
                            transformed[field] = config.transformers.numeric(transformed[field], 'float');
                            break;
                        case 'date':
                            // Date parsing logic
                            break;
                    }
                }
            });
        });
        
        // 3. Apply coordinate validation
        ['latitude', 'longitude'].forEach(field => {
            if (transformed[field]) {
                transformed[field] = config.transformers.coordinate(transformed[field]);
            }
        });
        
        // 4. Clean empty strings
        Object.keys(transformed).forEach(key => {
            if (transformed[key] === '') {
                transformed[key] = null;
            }
        });
        
        return transformed;
    }
});
```

### 3. File Splitting Plugin (file type)

**Inspired by:** `CsvFile::splitFile()`

```javascript
ImportSDK.use({
    name: 'fileSplitter',
    type: 'file',
    
    config: {
        maxLinesPerChunk: 250,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        delimiter: ',',
        autoSplit: true
    },
    
    shouldSplit(file, sdk, config) {
        return config.autoSplit && (
            file.size > config.maxFileSize || 
            this.estimateLineCount(file, config) > config.maxLinesPerChunk
        );
    },
    
    async split(file, sdk, config) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const csvContent = e.target.result;
                const lines = csvContent.split('\n');
                
                if (lines.length <= config.maxLinesPerChunk) {
                    resolve([file]); // No splitting needed
                    return;
                }
                
                const chunks = [];
                const header = lines[0];
                const dataLines = lines.slice(1);
                
                for (let i = 0; i < dataLines.length; i += config.maxLinesPerChunk) {
                    const chunkLines = [header, ...dataLines.slice(i, i + config.maxLinesPerChunk)];
                    const chunkContent = chunkLines.join('\n');
                    const blob = new Blob([chunkContent], { type: file.type });
                    
                    chunks.push(new File([blob], `${file.name}_part_${Math.floor(i / config.maxLinesPerChunk) + 1}.csv`));
                }
                
                resolve(chunks);
            };
            
            reader.readAsText(file);
        });
    },
    
    estimateLineCount(file, config) {
        // Rough estimation based on file size and average line length
        const avgLineLength = 100; // Estimate
        return Math.ceil(file.size / avgLineLength);
    }
});
```

### 4. Error Enhancement Plugin (error type)

**Inspired by:** Modal error display in ref-poc

```javascript
ImportSDK.use({
    name: 'errorEnhancer',
    type: 'error',
    
    config: {
        showLineNumbers: true,
        groupByErrorType: true,
        maxErrorsToShow: 100,
        exportFormats: ['csv', 'json'],
        showModal: true
    },
    
    formatError(error, context, sdk, config) {
        return {
            ...error,
            lineNumber: context.lineNumber || null,
            rowData: context.rowData || {},
            errorType: this.categorizeError(error.message),
            timestamp: new Date().toISOString(),
            severity: this.getSeverity(error.message)
        };
    },
    
    categorizeError(message) {
        const categories = {
            'validation': /invalid|missing|required|format/i,
            'duplicate': /already exists|duplicate|unique/i,
            'network': /network|connection|timeout/i,
            'server': /server|internal|500/i,
            'data': /null|undefined|empty/i
        };
        
        for (const [category, pattern] of Object.entries(categories)) {
            if (pattern.test(message)) {
                return category;
            }
        }
        
        return 'unknown';
    },
    
    getSeverity(message) {
        if (/critical|fatal/i.test(message)) return 'critical';
        if (/error|failed/i.test(message)) return 'error';
        if (/warning|warn/i.test(message)) return 'warning';
        return 'info';
    },
    
    renderErrorSummary(errors, sdk, config) {
        const grouped = this.groupErrors(errors, config);
        const summary = {
            total: errors.length,
            byType: Object.keys(grouped).map(type => ({
                type,
                count: grouped[type].length,
                sample: grouped[type][0]
            })),
            critical: errors.filter(e => e.severity === 'critical').length,
            timestamp: new Date().toISOString()
        };
        
        if (config.showModal) {
            this.showErrorModal(summary, grouped, sdk);
        }
        
        return summary;
    },
    
    groupErrors(errors, config) {
        if (!config.groupByErrorType) return { all: errors };
        
        return errors.reduce((groups, error) => {
            const type = error.errorType || 'unknown';
            if (!groups[type]) groups[type] = [];
            groups[type].push(error);
            return groups;
        }, {});
    },
    
    showErrorModal(summary, grouped, sdk) {
        // Create modal with error details
        const modal = document.createElement('div');
        modal.className = 'import-sdk-error-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Import Error Summary</h3>
                <div class="error-stats">
                    <span>Total: ${summary.total}</span>
                    <span>Critical: ${summary.critical}</span>
                </div>
                <div class="error-types">
                    ${summary.byType.map(type => `
                        <div class="error-type">
                            <h4>${type.type} (${type.count})</h4>
                            <p>${type.sample.message}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button onclick="this.closest('.import-sdk-error-modal').remove()">Close</button>
                    <button onclick="this.exportErrors()">Export</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
});
```

### 5. Metrics Enhancement Plugin (metrics type)

**Inspired by:** ref-poc's error counting and progress tracking

```javascript
ImportSDK.use({
    name: 'enhancedMetrics',
    type: 'metrics',
    
    config: {
        trackFieldStats: true,
        trackErrorPatterns: true,
        trackProcessingTimes: true,
        exportMetrics: true
    },
    
    init(sdk, config) {
        this.fieldStats = new Map();
        this.errorPatterns = new Map();
        this.processingTimes = [];
    },
    
    onFieldProcess(field, value, sdk, config) {
        if (!config.trackFieldStats) return;
        
        const stats = this.fieldStats.get(field) || {
            count: 0,
            nullCount: 0,
            uniqueValues: new Set(),
            avgLength: 0
        };
        
        stats.count++;
        if (value === null || value === '') stats.nullCount++;
        if (value) stats.uniqueValues.add(String(value));
        if (typeof value === 'string') stats.avgLength = (stats.avgLength + value.length) / 2;
        
        this.fieldStats.set(field, stats);
    },
    
    onError(error, context, sdk, config) {
        if (!config.trackErrorPatterns) return;
        
        const pattern = this.extractErrorPattern(error.message);
        const count = this.errorPatterns.get(pattern) || 0;
        this.errorPatterns.set(pattern, count + 1);
    },
    
    onProcessingTime(operation, duration, sdk, config) {
        if (!config.trackProcessingTimes) return;
        
        this.processingTimes.push({ operation, duration, timestamp: Date.now() });
    },
    
    getMetrics(sdk, config) {
        return {
            fieldStats: Object.fromEntries(
                Array.from(this.fieldStats.entries()).map(([field, stats]) => [
                    field,
                    {
                        ...stats,
                        uniqueValues: stats.uniqueValues.size
                    }
                ])
            ),
            errorPatterns: Object.fromEntries(this.errorPatterns),
            processingTimes: {
                total: this.processingTimes.length,
                avgByOperation: this.calculateAvgByOperation(),
                recent: this.processingTimes.slice(-10)
            }
        };
    },
    
    extractErrorPattern(message) {
        // Simple pattern extraction
        return message
            .replace(/'[^']+'/g, '{VALUE}')
            .replace(/\b\d+\b/g, '{NUMBER}')
            .replace(/\b[A-Z_]+_\d+\b/g, '{ID}');
    },
    
    calculateAvgByOperation() {
        const ops = {};
        this.processingTimes.forEach(({ operation, duration }) => {
            if (!ops[operation]) ops[operation] = { total: 0, count: 0 };
            ops[operation].total += duration;
            ops[operation].count++;
        });
        
        Object.keys(ops).forEach(op => {
            ops[op].avg = ops[op].total / ops[op].count;
        });
        
        return ops;
    }
});
```

### 6. Import Lifecycle Plugin (import type)

**Inspired by:** ref-poc's import orchestration

```javascript
ImportSDK.use({
    name: 'importOrchestrator',
    type: 'import',
    
    config: {
        autoRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        pauseOnError: true,
        confirmOnLargeFile: true
    },
    
    onImportStart(file, sdk, config) {
        this.importStartTime = Date.now();
        this.retryCount = 0;
        
        if (config.confirmOnLargeFile && file.size > 5 * 1024 * 1024) {
            return this.confirmLargeFile(file, sdk);
        }
    },
    
    onImportProgress(stats, sdk, config) {
        // Auto-pause on high error rate
        if (config.pauseOnError && stats.errorCount > stats.successCount * 2) {
            sdk.pause();
            this.showHighErrorWarning(stats, sdk);
        }
    },
    
    onImportError(error, context, sdk, config) {
        if (config.autoRetry && this.retryCount < config.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                sdk.retryFailedBatch(context.batchId);
            }, config.retryDelay * this.retryCount);
        }
    },
    
    onImportComplete(stats, sdk, config) {
        const duration = Date.now() - this.importStartTime;
        
        // Generate import report
        const report = {
            duration,
            stats,
            retryCount: this.retryCount,
            timestamp: new Date().toISOString()
        };
        
        this.generateImportReport(report, sdk);
    },
    
    confirmLargeFile(file, sdk) {
        return new Promise((resolve) => {
            const confirmed = confirm(`Large file detected (${(file.size / 1024 / 1024).toFixed(1)}MB). Continue?`);
            if (!confirmed) {
                sdk.cancel();
            }
            resolve(confirmed);
        });
    },
    
    showHighErrorWarning(stats, sdk) {
        const message = `High error rate detected: ${stats.errorCount} errors vs ${stats.successCount} successes. Continue?`;
        if (confirm(message)) {
            sdk.resume();
        }
    },
    
    generateImportReport(report, sdk) {
        console.log('Import Report:', report);
        // Could send to server, display in UI, etc.
    }
});
```

---

## 🎯 Plugin System Enhancements Needed

### 1. New Plugin Types Support

```javascript
class ImportSDK {
    static plugins = [];
    
    // Enhanced plugin registry with new types
    static pluginTypes = ['field', 'row', 'batch', 'file', 'import', 'error', 'metrics'];
    
    static use(plugin) {
        if (!this.pluginTypes.includes(plugin.type)) {
            throw new Error(`Unknown plugin type: ${plugin.type}. Supported: ${this.pluginTypes.join(', ')}`);
        }
        // ... existing validation
    }
    
    // New plugin execution methods
    async executeFilePlugins(file) {
        const filePlugins = this.getPluginsByType('file');
        for (const plugin of filePlugins) {
            if (plugin.validate) {
                const result = await plugin.validate(file, this, plugin.config || {});
                if (!result.isValid) {
                    throw new Error(`File validation failed: ${result.errors.join(', ')}`);
                }
            }
        }
    }
    
    async executeErrorPlugins(error, context) {
        const errorPlugins = this.getPluginsByType('error');
        let enhancedError = error;
        
        for (const plugin of errorPlugins) {
            if (plugin.formatError) {
                enhancedError = plugin.formatError(enhancedError, context, this, plugin.config || {});
            }
        }
        
        return enhancedError;
    }
}
```

### 2. Plugin Lifecycle Hooks

```javascript
// Enhanced lifecycle with new hook points
const pluginHooks = {
    file: ['validate', 'shouldSplit', 'split'],
    import: ['onImportStart', 'onImportProgress', 'onImportError', 'onImportComplete'],
    error: ['formatError', 'renderErrorSummary'],
    metrics: ['init', 'onFieldProcess', 'onError', 'onProcessingTime', 'getMetrics']
};
```

---

## 🚀 Implementation Priority

### Phase 1: Core Enhancements
1. **Plugin System Extension** - Add new plugin types
2. **File Validation Plugin** - Pre-import validation
3. **Smart Field Mapping Plugin** - Enhanced data transformation

### Phase 2: Advanced Features
4. **Error Enhancement Plugin** - Better error visualization
5. **Metrics Enhancement Plugin** - Detailed analytics
6. **Import Orchestrator Plugin** - Import lifecycle management

### Phase 3: Performance & UX
7. **File Splitting Plugin** - Handle large files
8. **Additional specialized plugins** based on specific needs

This approach provides maximum flexibility while maintaining the clean, modular architecture of ImportSDK.
