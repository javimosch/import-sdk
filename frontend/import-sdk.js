/**
 * Import SDK - Reusable CSV Import Library
 * 
 * @example
 * ImportSDK.init(document.getElementById('import-container'), {
 *   apiEndpoint: 'http://localhost:3000/api/import',
 *   chunkSize: 100,
 *   updateByTankNumber: false,
 *   fieldMapping: {
 *     'Tank ID': 'tankNumber',
 *     'Type': 'typeId'
 *   },
 *   transformers: {
 *     typeId: (value) => parseInt(value)
 *   },
 *   sendHandler: async (batch, config) => {
 *     // Custom send logic
 *     return { success: batch.length, errors: [] };
 *   },
 *   fileMappings: [
 *     { pattern: /test\.csv$/, fieldMapping: {}, transformers: {} },
 *     { pattern: /test2\.csv$/, fieldMapping: { 'Tank ID': 'tankNumber' } }
 *   ]
 * });
 */

class ImportSDK {
    // Static plugin registry
    static plugins = [];
    static pluginTypes = ['field', 'row', 'batch', 'file', 'import', 'error', 'metrics'];

    /**
     * Register a plugin with the SDK
     * @param {Object} plugin - Plugin configuration
     * @param {string} plugin.name - Plugin name
     * @param {string} plugin.type - Plugin type: 'field', 'row', 'batch'
     * @param {Function} [plugin.transform] - Transform function for field/row plugins
     * @param {Function} [plugin.validate] - Validation function for field/row plugins
     * @param {Function} [plugin.filter] - Filter function for row plugins
     * @param {Function} [plugin.beforeSend] - Before send hook for batch plugins
     * @param {Function} [plugin.afterSend] - After send hook for batch plugins
     * @param {Function} [plugin.onInit] - Initialization hook
     * @param {Function} [plugin.onFileSelect] - File selection hook
     * @param {Function} [plugin.onComplete] - Completion hook
     * @param {Object} [plugin.config] - Plugin-specific configuration
     */
    static use(plugin) {
        if (!plugin.name) {
            throw new Error('Plugin must have a name');
        }

        if (!ImportSDK.pluginTypes.includes(plugin.type)) {
            throw new Error(`Plugin type must be one of: ${ImportSDK.pluginTypes.join(', ')}`);
        }

        // Check for duplicate plugin names
        if (ImportSDK.plugins.find(p => p.name === plugin.name)) {
            throw new Error(`Plugin '${plugin.name}' is already registered`);
        }

        // Validate plugin structure based on type
        ImportSDK._validatePlugin(plugin);

        ImportSDK.plugins.push(plugin);
        console.log(`Plugin '${plugin.name}' registered successfully`);
        return ImportSDK;
    }

    /**
     * Validate plugin structure
     * @private
     */
    static _validatePlugin(plugin) {
        const requiredMethods = {
            field: ['transform'],
            row: [], // Row plugins are flexible - can have transform, validate, filter
            batch: [] // Batch plugins are flexible - can have beforeSend, afterSend
        };

        // Field plugins must have transform method
        if (plugin.type === 'field' && !plugin.transform) {
            throw new Error(`Field plugin '${plugin.name}' must have a transform method`);
        }

        // Validate method signatures if they exist
        const methodsToCheck = ['transform', 'validate', 'filter', 'beforeSend', 'afterSend', 'onInit', 'onFileSelect', 'onComplete'];
        methodsToCheck.forEach(method => {
            if (plugin[method] && typeof plugin[method] !== 'function') {
                throw new Error(`Plugin '${plugin.name}' method '${method}' must be a function`);
            }
        });
    }

    /**
     * Get all registered plugins
     */
    static getPlugins() {
        return [...ImportSDK.plugins];
    }

    /**
     * Get plugins by type
     * @param {string} type - Plugin type to filter by
     */
    static getPluginsByType(type) {
        return ImportSDK.plugins.filter(p => p.type === type);
    }

    /**
     * Remove a plugin by name
     * @param {string} name - Plugin name to remove
     */
    static removePlugin(name) {
        const index = ImportSDK.plugins.findIndex(p => p.name === name);
        if (index >= 0) {
            ImportSDK.plugins.splice(index, 1);
            console.log(`Plugin '${name}' removed successfully`);
            return true;
        }
        return false;
    }

    /**
     * Clear all plugins
     */
    static clearPlugins() {
        ImportSDK.plugins = [];
        console.log('All plugins cleared');
    }

    constructor(container, config) {
        this.container = container;
        this.config = {
            apiEndpoint: config.apiEndpoint || 'http://localhost:3000/api/import',
            chunkSize: config.chunkSize || 100,
            concurrency: config.concurrency || 1,
            waitBetweenChunks: config.waitBetweenChunks || 0,
            updateByTankNumber: config.updateByTankNumber || false,
            fieldMapping: config.fieldMapping || {},
            transformers: config.transformers || {},
            sendHandler: config.sendHandler || null,
            fileMappings: config.fileMappings || [],
            locale: config.locale || 'en',
            translations: config.translations || {},
            headers: config.headers || {},
            fetchOptions: config.fetchOptions || {},
            filters: config.filters || {},
            validate: config.validate || null, // Global validation function
            collectAllErrors: config.collectAllErrors || false, // Collect all validation errors instead of stopping at first
            resultExport: config.resultExport || [],
            onProgress: config.onProgress || null,
            onComplete: config.onComplete || null,
            onError: config.onError || null,
            onMetrics: config.onMetrics || null,
            // Metrics Backend Integration
            metricsBackend: {
                enabled: config.metricsBackend?.enabled || false,
                baseURL: config.metricsBackend?.baseURL || 'http://localhost:3012',
                endpoints: {
                    metrics: '/api/import/metrics',
                    progress: '/api/import/progress',
                    audit: '/api/audit/log'
                },
                sessionId: config.metricsBackend?.sessionId || this.generateSessionId(),
                includeProgress: config.metricsBackend?.includeProgress !== false,
                ...config.metricsBackend
            },
            // CSV Normalization Layer
            csvNormalization: {
                enabled: config.csvNormalization?.enabled !== false, // Default: true
                trimBOM: config.csvNormalization?.trimBOM !== false, // Default: true
                normalizeLineEndings: config.csvNormalization?.normalizeLineEndings !== false, // Default: true
                autoDetectDelimiter: config.csvNormalization?.autoDetectDelimiter !== false, // Default: true
                removeUnicodeJunk: config.csvNormalization?.removeUnicodeJunk !== false, // Default: true
                stripEmptyLines: config.csvNormalization?.stripEmptyLines !== false, // Default: true
                sanitizeHeaders: config.csvNormalization?.sanitizeHeaders !== false, // Default: true
                ...config.csvNormalization
            },
            // Column Validation
            allowedColumns: config.allowedColumns || [],
            requiredColumns: config.requiredColumns || [],
            warnUnknownColumns: config.warnUnknownColumns !== false, // Default: true
            
            // Flow Control
            flow: {
                forceCheck: config.flow?.forceCheck || false, // Force check before import
                preventStartOnErrors: config.flow?.preventStartOnErrors !== false, // Default: true
                ...config.flow
            }
        };

        // Default translations (English)
        this.defaultTranslations = {
            uploadPrompt: 'Click to upload or drag and drop',
            uploadHint: 'CSV files only',
            checkFile: 'Check File',
            startImport: 'Start Import',
            importing: 'Importing...',
            checking: 'Checking...',
            progressTitle: 'Progress',
            importProgress: 'Import Progress',
            validationProgress: 'Validation Progress',
            success: 'Success',
            errors: 'Errors',
            total: 'Total',
            logs: 'Logs',
            clearLogs: 'Clear',
            ready: 'Ready to start...',
            fileSelected: 'File selected: {filename} ({size} KB){mapping}',
            mappingInfo: ' (Mapping: {name})',
            fileRemoved: 'File removed.',
            logsCleared: 'Logs cleared...',
            parsingComplete: 'Parsing complete. Finishing up...',
            importFinished: 'Import finished.',
            validationFinished: 'Validation finished.',
            errorCsvOnly: 'Please upload a CSV file.',
            usingMapping: 'Using mapping: {name}',
            parsingError: 'Parsing error: {message}',
            validationError: 'Validation Error: {error}',
            networkError: 'Network error: {message}',
            serverError: 'Server error: {status} {statusText}',
            batchValidationFailed: 'Batch validation failed: {status}',
            handlerError: 'Handler error: {message}',
            invalidHandlerResponse: 'Invalid send handler response, using safe defaults',
            sendHandlerError: 'Send handler error: {message}',
            filtered: 'Filtered',
            downloadResults: 'Download Results',
            downloadErrors: 'Download Errors CSV',
            downloadSuccess: 'Download Success CSV',
            downloadLogs: 'Download Logs JSON',
            downloadFiltered: 'Download Filtered CSV',
            rowFiltered: 'Row filtered: {reason}'
        };

        // Active file mapping (selected based on filename)
        this.activeMapping = {
            fieldMapping: this.config.fieldMapping,
            transformers: this.config.transformers
        };

        this.state = {
            isProcessing: false,
            selectedFile: null,
            // Row counters
            successCount: 0,
            errorCount: 0,
            totalCount: 0,
            filteredCount: 0,
            currentCsvLine: 2, // header is line 1, first data row is line 2
            // Stored data
            logs: [],
            successRows: [],
            errorRows: [],
            filteredRows: []
        };

        // Initialize execution metrics
        this.metrics = {
            // Timing metrics
            startTime: null,
            endTime: null,
            totalDuration: 0,
            parseStartTime: null,
            parseEndTime: null,
            parseDuration: 0,
            normalizationTime: 0,
            
            // Row processing metrics
            rowProcessingTimes: [],
            avgRowProcessingTime: 0,
            maxRowProcessingTime: 0,
            minRowProcessingTime: Infinity,
            totalRowsProcessed: 0,
            
            // Chunk processing metrics
            chunkTimes: [],
            avgChunkLatency: 0,
            maxChunkLatency: 0,
            minChunkLatency: Infinity,
            totalChunks: 0,
            chunkSizes: [],
            
            // Concurrency metrics
            activeBatches: 0,
            peakConcurrency: 0,
            concurrencyHistory: [],
            concurrencyTimeline: [],
            
            // Network/API metrics
            apiCalls: 0,
            apiRetries: 0,
            apiFailures: 0,
            apiSuccesses: 0,
            totalApiTime: 0,
            avgApiLatency: 0,
            apiLatencies: [],
            
            // Performance estimates
            memoryUsageEstimate: 0,
            cpuLoadEstimate: 0,
            rowsPerSecond: 0,
            throughput: 0,
            efficiency: 0,
            
            // Plugin metrics
            pluginExecutionTimes: {},
            pluginCallCounts: {},
            
            // Error metrics
            validationTime: 0,
            transformTime: 0,
            filterTime: 0,
            
            // File processing metrics
            fileSize: 0,
            estimatedRows: 0,
            actualRows: 0
        };

        this.rowBuffer = [];
        
        // Initialize plugins
        this.activePlugins = {
            field: ImportSDK.getPluginsByType('field'),
            row: ImportSDK.getPluginsByType('row'),
            batch: ImportSDK.getPluginsByType('batch')
        };
        
        // Call plugin onInit hooks
        ImportSDK.plugins.forEach(plugin => {
            if (plugin.onInit) {
                try {
                    plugin.onInit(this, plugin.config || {});
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' init error: ${err.message}`, 'error');
                }
            }
        });
        
        this.render();
        this.attachEventListeners();
    }

    /**
     * Generate a unique session ID
     * @returns {string} - Unique session identifier
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Send data to metrics backend
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Data to send
     * @returns {Promise} - Fetch promise
     */
    async sendToMetricsBackend(endpoint, data) {
        if (!this.config.metricsBackend.enabled) {
            return Promise.resolve();
        }

        try {
            const url = `${this.config.metricsBackend.baseURL}${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    sessionId: this.config.metricsBackend.sessionId,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.warn(`Metrics backend error: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.warn('Failed to send data to metrics backend:', error.message);
            return Promise.resolve();
        }
    }

    /**
     * Send progress update to metrics backend
     * @param {Object} stats - Current progress stats
     */
    async sendProgressUpdate(stats) {
        if (!this.config.metricsBackend.enabled || !this.config.metricsBackend.includeProgress) {
            return;
        }

        const currentMetrics = this.getMetrics();
        await this.sendToMetricsBackend(this.config.metricsBackend.endpoints.progress, {
            importId: this.currentImportId,
            progress: {
                percentage: (stats.totalCount / Math.max(1, this.metrics.estimatedRows)) * 100,
                processedRows: stats.totalCount,
                successCount: stats.successCount,
                errorCount: stats.errorCount,
                filteredCount: stats.filteredCount
            },
            metrics: {
                rowsPerSecond: currentMetrics.rowsPerSecond,
                avgRowProcessingTime: currentMetrics.avgRowProcessingTime,
                memoryUsageEstimate: currentMetrics.memoryUsageEstimate,
                activeBatches: currentMetrics.activeBatches
            }
        });
    }

    /**
     * Send audit log to metrics backend
     * @param {string} level - Log level (info, warning, error)
     * @param {string} message - Log message
     * @param {Object} data - Additional log data
     */
    async sendAuditLog(level, message, data = {}) {
        if (!this.config.metricsBackend.enabled) {
            return;
        }

        await this.sendToMetricsBackend(this.config.metricsBackend.endpoints.audit, {
            level,
            message,
            type: 'import_operation',
            importId: this.currentImportId,
            data
        });
    }

    /**
     * Send error sample to metrics backend (groups similar errors by pattern)
     * @param {string} errorMessage - Error message
     * @param {string} errorType - Type of error (validation, api, network, etc.)
     * @param {Object} errorData - Additional error data
     */
    async sendErrorSample(errorMessage, errorType, errorData = {}) {
        if (!this.config.metricsBackend.enabled) {
            return;
        }

        // Track unique error patterns to avoid spamming
        if (!this.uniqueErrors) {
            this.uniqueErrors = new Set();
        }
        
        // Track error pattern counts
        if (!this.errorPatternCounts) {
            this.errorPatternCounts = new Map();
        }

        // Extract error pattern by replacing specific values with placeholders
        const errorPattern = this.extractErrorPattern(errorMessage);
        
        // Create a unique key for this error type and pattern
        const errorKey = `${errorType}:${errorPattern}`;
        
        // Increment count for this pattern
        const currentCount = this.errorPatternCounts.get(errorKey) || 0;
        this.errorPatternCounts.set(errorKey, currentCount + 1);
        
        // Only send if we haven't seen this error pattern before
        if (!this.uniqueErrors.has(errorKey)) {
            this.uniqueErrors.add(errorKey);
            
            await this.sendAuditLog('error', errorMessage, {
                errorType: errorType,
                pattern: errorPattern,
                sample: true,
                count: 1,
                data: errorData
            });
        } else {
            // Update the count for existing patterns (send periodic updates)
            if (currentCount % 10 === 0) { // Send update every 10 occurrences
                await this.sendAuditLog('warning', `Error pattern repeated: ${errorPattern}`, {
                    errorType: errorType,
                    pattern: errorPattern,
                    sample: false,
                    count: currentCount,
                    data: errorData
                });
            }
        }
    }

    /**
     * Extract error pattern by replacing specific values with placeholders
     * @param {string} errorMessage - Original error message
     * @returns {string} - Patternized error message
     */
    extractErrorPattern(errorMessage) {
        // Common patterns to replace with placeholders
        const patterns = [
            // Tank numbers, IDs, codes like 'TANK_000010', 'BIN_000008', 'ABC123'
            { regex: /\b[A-Z_]+_\d+\b/g, placeholder: '{ID}' },
            
            // Quoted values like 'TANK_000010'
            { regex: /'[^']+'/g, placeholder: '{VALUE}' },
            
            // Numbers like 12345, 67890
            { regex: /\b\d{4,}\b/g, placeholder: '{NUMBER}' },
            
            // Email addresses
            { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, placeholder: '{EMAIL}' },
            
            // URLs
            { regex: /https?:\/\/[^\s]+/g, placeholder: '{URL}' },
            
            // File paths
            { regex: /\/[^\s]+/g, placeholder: '{PATH}' },
            
            // UUIDs
            { regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, placeholder: '{UUID}' }
        ];

        let pattern = errorMessage;
        
        // Apply each pattern replacement
        patterns.forEach(({ regex, placeholder }) => {
            pattern = pattern.replace(regex, placeholder);
        });
        
        return pattern;
    }

    /**
     * Get translated string
     * @param {string} key - Translation key
     * @param {Object} params - Parameters to replace in string
     */
    t(key, params = {}) {
        const locale = this.config.locale;
        // Try custom translation -> default translation -> key
        let template = (this.config.translations[locale] && this.config.translations[locale][key]) 
            || this.defaultTranslations[key] 
            || key;

        // Replace params
        Object.keys(params).forEach(param => {
            template = template.replace(`{${param}}`, params[param]);
        });

        return template;
    }

    /**
     * Initialize the SDK
     * @param {HTMLElement} container - DOM element to inject the UI into
     * @param {Object} config - Configuration object
     */
    static init(container, config) {
        return new ImportSDK(container, config);
    }

    render() {
        this.container.innerHTML = `
            <div class="import-sdk-container">
                <div class="import-sdk-upload-area" id="import-sdk-dropzone">
                    <input type="file" id="import-sdk-file-input" accept=".csv" style="display: none;">
                    <div class="import-sdk-upload-content" id="import-sdk-upload-prompt">
                        <svg class="import-sdk-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <p class="import-sdk-upload-text">${this.t('uploadPrompt')}</p>
                        <p class="import-sdk-upload-hint">${this.t('uploadHint')}</p>
                    </div>
                    <div class="import-sdk-file-info" id="import-sdk-file-info" style="display: none;">
                        <span class="import-sdk-file-name" id="import-sdk-file-name"></span>
                        <button class="import-sdk-remove-btn" id="import-sdk-remove-file">&times;</button>
                    </div>
                </div>

                <div class="import-sdk-actions">
                    <button class="import-sdk-btn import-sdk-btn-secondary" id="import-sdk-check-btn" disabled>
                        ${this.t('checkFile')}
                    </button>
                    <button class="import-sdk-btn import-sdk-btn-primary" id="import-sdk-start-btn" disabled>
                        ${this.t('startImport')}
                    </button>
                </div>

                <div class="import-sdk-progress" id="import-sdk-progress" style="display: none;">
                    <div class="import-sdk-progress-header">
                        <span id="import-sdk-progress-title">${this.t('progressTitle')}</span>
                        <span id="import-sdk-progress-text">0%</span>
                    </div>
                    <div class="import-sdk-progress-bar-bg">
                        <div class="import-sdk-progress-bar" id="import-sdk-progress-bar"></div>
                    </div>
                    <div class="import-sdk-stats">
                        <div class="import-sdk-stat import-sdk-stat-success">
                            <div class="import-sdk-stat-value" id="import-sdk-success-count">0</div>
                            <div class="import-sdk-stat-label">${this.t('success')}</div>
                        </div>
                        <div class="import-sdk-stat import-sdk-stat-error">
                            <div class="import-sdk-stat-value" id="import-sdk-error-count">0</div>
                            <div class="import-sdk-stat-label">${this.t('errors')}</div>
                        </div>
                        <div class="import-sdk-stat import-sdk-stat-filtered" id="import-sdk-filtered-stat" style="display: none;">
                            <div class="import-sdk-stat-value" id="import-sdk-filtered-count">0</div>
                            <div class="import-sdk-stat-label">${this.t('filtered')}</div>
                        </div>
                        <div class="import-sdk-stat import-sdk-stat-total">
                            <div class="import-sdk-stat-value" id="import-sdk-total-count">0</div>
                            <div class="import-sdk-stat-label">${this.t('total')}</div>
                        </div>
                    </div>
                    <div class="import-sdk-export-actions" id="import-sdk-export-actions" style="display: none;">
                        <div class="import-sdk-dropdown">
                            <button class="import-sdk-btn import-sdk-btn-secondary import-sdk-dropdown-btn" id="import-sdk-export-btn">
                                ${this.t('downloadResults')} ▼
                            </button>
                            <div class="import-sdk-dropdown-content" id="import-sdk-export-menu">
                                <!-- Export options will be added dynamically -->
                            </div>
                        </div>
                    </div>
                </div>

                <div class="import-sdk-logs-container">
                    <div class="import-sdk-logs-header">
                        <span>${this.t('logs')}</span>
                        <button class="import-sdk-clear-btn" id="import-sdk-clear-logs">${this.t('clearLogs')}</button>
                    </div>
                    <div class="import-sdk-logs" id="import-sdk-logs">
                        <div class="import-sdk-log import-sdk-log-info">${this.t('ready')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const fileInput = document.getElementById('import-sdk-file-input');
        const dropZone = document.getElementById('import-sdk-dropzone');
        const uploadPrompt = document.getElementById('import-sdk-upload-prompt');
        const removeBtn = document.getElementById('import-sdk-remove-file');
        const startBtn = document.getElementById('import-sdk-start-btn');
        const checkBtn = document.getElementById('import-sdk-check-btn');
        const clearLogsBtn = document.getElementById('import-sdk-clear-logs');

        // In some advanced demos/pages, a custom UI might be used and the
        // default ImportSDK template may not be present. In that case the
        // elements above will be null; bail out safely instead of throwing.
        if (!fileInput || !dropZone || !uploadPrompt || !removeBtn || !startBtn || !checkBtn || !clearLogsBtn) {
            return;
        }

        // Click to upload
        uploadPrompt.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('import-sdk-dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('import-sdk-dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('import-sdk-dragover');
            this.handleFileSelect(e.dataTransfer.files[0]);
        });

        // Remove file
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleFileRemove();
        });

        // Start import
        startBtn.addEventListener('click', () => this.startImport('import'));
        
        // Check file
        checkBtn.addEventListener('click', () => this.startImport('check'));

        // Clear logs
        clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    handleFileSelect(file) {
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            this.log(this.t('errorCsvOnly'), 'error');
            return;
        }

        // Select appropriate file mapping based on filename
        this.selectFileMapping(file.name);

        this.state.selectedFile = file;
        document.getElementById('import-sdk-file-name').textContent = file.name;
        document.getElementById('import-sdk-file-info').style.display = 'flex';
        document.getElementById('import-sdk-upload-prompt').style.display = 'none';
        
        // Flow control: if forceCheck is enabled, keep start disabled until check passes
        const startBtn = document.getElementById('import-sdk-start-btn');
        startBtn.disabled = this.config.flow.forceCheck;
        
        document.getElementById('import-sdk-check-btn').disabled = false;
        
        const mappingInfo = this.activeMapping.name 
            ? this.t('mappingInfo', { name: this.activeMapping.name }) 
            : '';
            
        this.log(this.t('fileSelected', { 
            filename: file.name, 
            size: (file.size / 1024).toFixed(2),
            mapping: mappingInfo
        }));
        
        // Call plugin onFileSelect hooks
        ImportSDK.plugins.forEach(plugin => {
            if (plugin.onFileSelect) {
                try {
                    plugin.onFileSelect(file, this, plugin.config || {});
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' file select error: ${err.message}`, 'error');
                }
            }
        });

        // Execute V2 File Plugins (validators)
        if (typeof this.executeFilePlugins === 'function') {
            this.log('Running file validation plugins...', 'info');
            this.executeFilePlugins('validate', file).then(results => {
                const hasErrors = results.some(r => r.result && !r.result.isValid);
                if (hasErrors) {
                    // If validation failed, we might want to update UI or flow
                    // The plugin itself logs errors, so we just ensure flow control respects it if needed
                    if (this.config.flow?.preventStartOnErrors) {
                         // Could disable start button here, but the plugin errors are async
                         // For now, we rely on the visual feedback in logs
                    }
                }
            });
        }
    }

    selectFileMapping(filename) {
        // Check if there are file mappings configured
        if (this.config.fileMappings && this.config.fileMappings.length > 0) {
            // Find matching mapping
            const mapping = this.config.fileMappings.find(m => {
                if (m.pattern instanceof RegExp) {
                    return m.pattern.test(filename);
                } else if (typeof m.pattern === 'string') {
                    return filename.includes(m.pattern);
                }
                return false;
            });

            if (mapping) {
                this.activeMapping = {
                    name: mapping.name || 'Custom',
                    fieldMapping: mapping.fieldMapping || {},
                    transformers: mapping.transformers || {},
                    validate: mapping.validate || {}
                };
                this.log(this.t('usingMapping', { name: this.activeMapping.name }));
                return;
            }
        }

        // Fallback to default mapping
        this.activeMapping = {
            name: null,
            fieldMapping: this.config.fieldMapping,
            transformers: this.config.transformers,
            validate: this.config.validate || {}
        };
    }

    handleFileRemove() {
        this.state.selectedFile = null;
        document.getElementById('import-sdk-file-input').value = '';
        document.getElementById('import-sdk-file-info').style.display = 'none';
        document.getElementById('import-sdk-upload-prompt').style.display = 'block';
        document.getElementById('import-sdk-start-btn').disabled = true;
        document.getElementById('import-sdk-check-btn').disabled = true;
        this.log(this.t('fileRemoved'));
    }

    log(message, type = 'info') {
        const logsContainer = document.getElementById('import-sdk-logs');
        const logEntry = document.createElement('div');
        logEntry.className = `import-sdk-log import-sdk-log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="import-sdk-log-time">[${timestamp}]</span> ${message}`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        this.state.logs.push({ timestamp, message, type });
    }

    clearLogs() {
        document.getElementById('import-sdk-logs').innerHTML = 
            `<div class="import-sdk-log import-sdk-log-info">${this.t('logsCleared')}</div>`;
        this.state.logs = [];
    }

    /**
     * Reset metrics for a new import
     */
    resetMetrics() {
        this.metrics = {
            ...this.metrics,
            startTime: null,
            endTime: null,
            totalDuration: 0,
            parseStartTime: null,
            parseEndTime: null,
            parseDuration: 0,
            normalizationTime: 0,
            rowProcessingTimes: [],
            avgRowProcessingTime: 0,
            maxRowProcessingTime: 0,
            minRowProcessingTime: Infinity,
            totalRowsProcessed: 0,
            chunkTimes: [],
            avgChunkLatency: 0,
            maxChunkLatency: 0,
            minChunkLatency: Infinity,
            totalChunks: 0,
            chunkSizes: [],
            activeBatches: 0,
            peakConcurrency: 0,
            concurrencyHistory: [],
            concurrencyTimeline: [],
            apiCalls: 0,
            apiRetries: 0,
            apiFailures: 0,
            apiSuccesses: 0,
            totalApiTime: 0,
            avgApiLatency: 0,
            apiLatencies: [],
            pluginExecutionTimes: {},
            pluginCallCounts: {},
            validationTime: 0,
            transformTime: 0,
            filterTime: 0,
            fileSize: 0,
            estimatedRows: 0,
            actualRows: 0
        };
        
        // Reset unique errors tracking for new import
        this.uniqueErrors = new Set();
        this.errorPatternCounts = new Map();
    }

    /**
     * Start timing for a specific operation
     * @param {string} operation - Operation name
     * @returns {function} - Function to call when operation completes
     */
    startTiming(operation) {
        const startTime = performance.now();
        
        return (metadata = {}) => {
            const duration = performance.now() - startTime;
            this.recordTiming(operation, duration, metadata);
            return duration;
        };
    }

    /**
     * Record timing for an operation
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    recordTiming(operation, duration, metadata = {}) {
        switch (operation) {
            case 'rowProcessing':
                this.metrics.rowProcessingTimes.push(duration);
                this.metrics.totalRowsProcessed++;
                this.updateRowMetrics();
                break;
                
            case 'chunkProcessing':
                this.metrics.chunkTimes.push(duration);
                this.metrics.totalChunks++;
                if (metadata.chunkSize) {
                    this.metrics.chunkSizes.push(metadata.chunkSize);
                }
                this.updateChunkMetrics();
                break;
                
            case 'apiCall':
                this.metrics.apiLatencies.push(duration);
                this.metrics.totalApiTime += duration;
                this.metrics.apiCalls++;
                if (metadata.success) {
                    this.metrics.apiSuccesses++;
                } else if (metadata.error) {
                    this.metrics.apiFailures++;
                }
                this.updateApiMetrics();
                break;
                
            case 'validation':
                this.metrics.validationTime += duration;
                break;
                
            case 'transform':
                this.metrics.transformTime += duration;
                break;
                
            case 'filter':
                this.metrics.filterTime += duration;
                break;
                
            case 'normalization':
                this.metrics.normalizationTime = duration;
                break;
                
            case 'parse':
                this.metrics.parseDuration = duration;
                break;
        }
        
        // Record plugin execution times
        if (metadata.plugin) {
            if (!this.metrics.pluginExecutionTimes[metadata.plugin]) {
                this.metrics.pluginExecutionTimes[metadata.plugin] = [];
                this.metrics.pluginCallCounts[metadata.plugin] = 0;
            }
            this.metrics.pluginExecutionTimes[metadata.plugin].push(duration);
            this.metrics.pluginCallCounts[metadata.plugin]++;
        }
    }

    /**
     * Update concurrency tracking
     * @param {number} activeBatches - Current number of active batches
     */
    updateConcurrency(activeBatches) {
        this.metrics.activeBatches = activeBatches;
        this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, activeBatches);
        
        // Record concurrency timeline
        this.metrics.concurrencyTimeline.push({
            timestamp: performance.now() - this.metrics.startTime,
            activeBatches: activeBatches
        });
        
        // Keep history for the last 100 measurements
        if (this.metrics.concurrencyHistory.length >= 100) {
            this.metrics.concurrencyHistory.shift();
        }
        this.metrics.concurrencyHistory.push(activeBatches);
    }

    /**
     * Update row processing metrics
     * @private
     */
    updateRowMetrics() {
        const times = this.metrics.rowProcessingTimes;
        if (times.length > 0) {
            this.metrics.avgRowProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;
            this.metrics.maxRowProcessingTime = Math.max(...times);
            this.metrics.minRowProcessingTime = Math.min(...times);
        }
    }

    /**
     * Update chunk processing metrics
     * @private
     */
    updateChunkMetrics() {
        const times = this.metrics.chunkTimes;
        if (times.length > 0) {
            this.metrics.avgChunkLatency = times.reduce((a, b) => a + b, 0) / times.length;
            this.metrics.maxChunkLatency = Math.max(...times);
            this.metrics.minChunkLatency = Math.min(...times);
        }
    }

    /**
     * Update API metrics
     * @private
     */
    updateApiMetrics() {
        const latencies = this.metrics.apiLatencies;
        if (latencies.length > 0) {
            this.metrics.avgApiLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        }
    }

    /**
     * Estimate CPU load based on processing patterns
     * @private
     */
    updateCPUEstimate() {
        if (this.metrics.totalRowsProcessed === 0) return;
        
        const totalProcessingTime = this.metrics.transformTime + 
                                  this.metrics.validationTime + 
                                  this.metrics.filterTime;
        
        const elapsedTime = this.metrics.endTime ? 
                           (this.metrics.endTime - this.metrics.startTime) : 
                           (performance.now() - this.metrics.startTime);
        
        // Estimate CPU utilization as ratio of processing time to elapsed time
        this.metrics.cpuLoadEstimate = Math.min(100, (totalProcessingTime / elapsedTime) * 100);
    }

    /**
     * Update throughput metrics
     * @private
     */
    updateThroughputMetrics() {
        const elapsedTime = this.metrics.endTime ? 
                           this.metrics.totalDuration : 
                           (performance.now() - this.metrics.startTime);
        
        if (elapsedTime > 0) {
            this.metrics.rowsPerSecond = (this.metrics.totalRowsProcessed / elapsedTime) * 1000;
            
            if (this.metrics.fileSize > 0) {
                this.metrics.throughput = (this.metrics.fileSize / elapsedTime) * 1000; // bytes per second
            }
            
            // Calculate efficiency (actual vs theoretical throughput)
            const theoreticalRowsPerSecond = 1000 / (this.metrics.avgRowProcessingTime || 1);
            this.metrics.efficiency = Math.min(100, (this.metrics.rowsPerSecond / theoreticalRowsPerSecond) * 100);
        }
    }

    /**
     * Estimate memory usage based on data size and operations
     * @private
     */
    updateMemoryEstimate() {
        let estimate = 0;
        
        // Base memory for file content
        estimate += this.metrics.fileSize * 2; // Assuming UTF-16 encoding
        
        // Memory for row buffers (estimated)
        const avgRowSize = this.metrics.fileSize / Math.max(1, this.metrics.actualRows);
        estimate += this.rowBuffer.length * avgRowSize * 3; // Transformed rows take more space
        
        // Memory for result collections
        estimate += this.state.successRows.length * avgRowSize;
        estimate += this.state.errorRows.length * avgRowSize;
        estimate += this.state.filteredRows.length * avgRowSize;
        
        this.metrics.memoryUsageEstimate = estimate;
    }

    /**
     * Get comprehensive execution metrics
     * @returns {Object} - Complete metrics object
     */
    getMetrics() {
        // Update calculated metrics
        this.updateCPUEstimate();
        this.updateThroughputMetrics();
        this.updateMemoryEstimate();
        
        // Calculate plugin metrics summaries
        const pluginSummaries = {};
        Object.keys(this.metrics.pluginExecutionTimes).forEach(plugin => {
            const times = this.metrics.pluginExecutionTimes[plugin];
            if (times.length > 0) {
                pluginSummaries[plugin] = {
                    totalTime: times.reduce((a, b) => a + b, 0),
                    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
                    maxTime: Math.max(...times),
                    minTime: Math.min(...times),
                    callCount: this.metrics.pluginCallCounts[plugin] || 0
                };
            }
        });
        
        return {
            ...this.metrics,
            pluginSummaries,
            
            // Convenience calculated fields
            isComplete: !!this.metrics.endTime,
            totalDurationSeconds: this.metrics.totalDuration / 1000,
            successRate: this.state.totalCount > 0 ? (this.state.successCount / this.state.totalCount) * 100 : 0,
            errorRate: this.state.totalCount > 0 ? (this.state.errorCount / this.state.totalCount) * 100 : 0,
            filterRate: this.state.totalCount > 0 ? (this.state.filteredCount / this.state.totalCount) * 100 : 0,
            
            // Performance indicators
            performanceScore: this.calculatePerformanceScore(),
            bottlenecks: this.identifyBottlenecks()
        };
    }

    /**
     * Calculate overall performance score
     * @private
     * @returns {number} - Performance score 0-100
     */
    calculatePerformanceScore() {
        let score = 100;
        
        // Penalize high error rates
        const errorRate = this.state.totalCount > 0 ? (this.state.errorCount / this.state.totalCount) * 100 : 0;
        if (errorRate > 10) score -= (errorRate - 10) * 2;
        
        // Penalize low efficiency
        if (this.metrics.efficiency < 50) score -= (50 - this.metrics.efficiency);
        
        // Penalize high API failure rate
        const apiFailureRate = this.metrics.apiCalls > 0 ? (this.metrics.apiFailures / this.metrics.apiCalls) * 100 : 0;
        if (apiFailureRate > 5) score -= (apiFailureRate - 5) * 3;
        
        // Penalize high memory usage (relative to file size)
        const memoryRatio = this.metrics.fileSize > 0 ? this.metrics.memoryUsageEstimate / this.metrics.fileSize : 1;
        if (memoryRatio > 5) score -= (memoryRatio - 5) * 5;
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Identify performance bottlenecks
     * @private
     * @returns {Array} - Array of bottleneck descriptions
     */
    identifyBottlenecks() {
        const bottlenecks = [];
        
        // Check for slow row processing
        if (this.metrics.avgRowProcessingTime > 10) {
            bottlenecks.push(`Slow row processing: ${this.metrics.avgRowProcessingTime.toFixed(2)}ms/row`);
        }
        
        // Check for slow API calls
        if (this.metrics.avgApiLatency > 1000) {
            bottlenecks.push(`Slow API responses: ${this.metrics.avgApiLatency.toFixed(2)}ms average`);
        }
        
        // Check for high validation time
        const totalProcessingTime = this.metrics.transformTime + this.metrics.validationTime + this.metrics.filterTime;
        if (totalProcessingTime > 0) {
            const validationRatio = this.metrics.validationTime / totalProcessingTime;
            if (validationRatio > 0.5) {
                bottlenecks.push(`Validation overhead: ${(validationRatio * 100).toFixed(1)}% of processing time`);
            }
        }
        
        // Check for memory pressure
        if (this.metrics.memoryUsageEstimate > 100 * 1024 * 1024) { // 100MB
            bottlenecks.push(`High memory usage: ${(this.metrics.memoryUsageEstimate / 1024 / 1024).toFixed(1)}MB estimated`);
        }
        
        // Check for low concurrency utilization
        const avgConcurrency = this.metrics.concurrencyHistory.length > 0 ? 
                              this.metrics.concurrencyHistory.reduce((a, b) => a + b, 0) / this.metrics.concurrencyHistory.length : 0;
        if (avgConcurrency < this.config.concurrency * 0.7) {
            bottlenecks.push(`Low concurrency utilization: ${avgConcurrency.toFixed(1)}/${this.config.concurrency} average`);
        }
        
        return bottlenecks;
    }

    /**
     * Normalize CSV content to handle common issues in real-world files
     * @param {string} csvContent - Raw CSV content as string
     * @returns {object} - { content: normalizedContent, delimiter: detectedDelimiter, issues: [] }
     */
    normalizeCSV(csvContent) {
        const config = this.config.csvNormalization;
        const issues = [];
        let content = csvContent;
        let detectedDelimiter = ','; // default

        if (!config.enabled) {
            return { content, delimiter: detectedDelimiter, issues };
        }

        // 1. Trim BOM (Byte Order Mark)
        if (config.trimBOM && content.length > 0) {
            const bomPatterns = [
                '\uFEFF', // UTF-8 BOM
                '\uFFFE', // UTF-16 BE BOM  
                '\u0000\uFEFF', // UTF-16 LE BOM
                '\uEFBBBF' // UTF-8 BOM as bytes
            ];
            
            for (const bom of bomPatterns) {
                if (content.startsWith(bom)) {
                    content = content.slice(bom.length);
                    issues.push(`Removed ${bom.length}-byte BOM`);
                    break;
                }
            }
        }

        // 2. Auto-detect delimiter before other processing
        if (config.autoDetectDelimiter) {
            detectedDelimiter = this.detectDelimiter(content);
            if (detectedDelimiter !== ',') {
                issues.push(`Auto-detected delimiter: '${detectedDelimiter}'`);
            }
        }

        // 3. Remove invisible Unicode junk
        if (config.removeUnicodeJunk) {
            const originalLength = content.length;
            // Remove common invisible/control characters but preserve newlines and tabs
            content = content.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060\u180E]/g, ''); // Zero-width chars
            content = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); // Control chars except \t, \n, \r
            content = content.replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // Various Unicode spaces -> regular space
            
            if (content.length !== originalLength) {
                issues.push(`Removed ${originalLength - content.length} invisible/control characters`);
            }
        }

        // 4. Normalize line endings to \n
        if (config.normalizeLineEndings) {
            const originalLength = content.length;
            content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            if (content.length !== originalLength) {
                issues.push('Normalized line endings to LF');
            }
        }

        // 5. Strip empty lines (but preserve header)
        if (config.stripEmptyLines) {
            const lines = content.split('\n');
            const originalLineCount = lines.length;
            
            // Keep first line (header) and non-empty lines
            const filteredLines = lines.filter((line, index) => {
                return index === 0 || line.trim().length > 0;
            });
            
            if (filteredLines.length !== originalLineCount) {
                issues.push(`Removed ${originalLineCount - filteredLines.length} empty lines`);
            }
            
            content = filteredLines.join('\n');
        }

        // 6. Sanitize headers
        if (config.sanitizeHeaders) {
            const lines = content.split('\n');
            if (lines.length > 0) {
                const originalHeader = lines[0];
                let sanitizedHeader = originalHeader;
                
                // Split by detected delimiter for proper header processing
                const headerCells = this.parseCSVRow(originalHeader, detectedDelimiter);
                const sanitizedCells = headerCells.map(cell => {
                    let sanitized = cell.trim();
                    
                    // Remove quotes if they wrap the entire cell
                    if ((sanitized.startsWith('"') && sanitized.endsWith('"')) || 
                        (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
                        sanitized = sanitized.slice(1, -1);
                    }
                    
                    // Replace problematic characters in headers
                    sanitized = sanitized.replace(/[\n\r\t]/g, ' '); // Replace newlines/tabs with space
                    sanitized = sanitized.replace(/\s+/g, ' '); // Collapse multiple spaces
                    sanitized = sanitized.trim();
                    
                    return sanitized;
                });
                
                // Rebuild header with proper quoting if needed
                sanitizedHeader = sanitizedCells
                    .map(cell => {
                        // Quote cells that contain the delimiter or quotes
                        if (cell.includes(detectedDelimiter) || cell.includes('"') || cell.includes('\n')) {
                            return `"${cell.replace(/"/g, '""')}"`;
                        }
                        return cell;
                    })
                    .join(detectedDelimiter);
                
                if (sanitizedHeader !== originalHeader) {
                    lines[0] = sanitizedHeader;
                    content = lines.join('\n');
                    issues.push('Sanitized header row');
                }
            }
        }

        return { content, delimiter: detectedDelimiter, issues };
    }

    /**
     * Detect CSV delimiter by analyzing the first few lines
     * @param {string} content - CSV content
     * @returns {string} - Detected delimiter
     */
    detectDelimiter(content) {
        const lines = content.split('\n').slice(0, 5); // Analyze first 5 lines
        const delimiters = [',', ';', '\t', '|'];
        const scores = {};

        delimiters.forEach(delimiter => {
            scores[delimiter] = 0;
            
            const lineCounts = lines.map(line => {
                // Don't count delimiters inside quotes
                let inQuotes = false;
                let count = 0;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === delimiter && !inQuotes) {
                        count++;
                    }
                }
                return count;
            }).filter(count => count > 0); // Only count lines that have the delimiter
            
            if (lineCounts.length > 0) {
                // Score based on consistency (same count across lines) and frequency
                const avgCount = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
                const consistency = lineCounts.every(count => count === lineCounts[0]) ? 2 : 1;
                scores[delimiter] = avgCount * consistency;
            }
        });

        // Return delimiter with highest score
        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, ',');
    }

    /**
     * Parse a single CSV row respecting quotes and delimiters
     * @param {string} row - CSV row
     * @param {string} delimiter - Delimiter to use
     * @returns {Array} - Array of cell values
     */
    parseCSVRow(row, delimiter = ',') {
        const cells = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < row.length) {
            const char = row[i];
            const nextChar = row[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                // End of cell
                cells.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Add the last cell
        cells.push(current);
        return cells;
    }

    startImport(mode = 'import') {
        if (!this.state.selectedFile || this.state.isProcessing) return;

        this.state.isProcessing = true;
        this.state.mode = mode;
        this.state.successCount = 0;
        this.state.errorCount = 0;
        this.state.totalCount = 0;
        this.state.filteredCount = 0;
        this.state.currentCsvLine = 2; // reset CSV line counter (header is line 1)
        this.rowBuffer = [];
        
        // Initialize metrics for this import
        this.resetMetrics();
        this.metrics.startTime = performance.now();
        this.metrics.fileSize = this.state.selectedFile.size;
        this.metrics.estimatedRows = Math.max(1, Math.floor(this.metrics.fileSize / 100)); // rough estimate
        
        // Generate unique import ID and send initial audit log
        this.currentImportId = this.generateSessionId();
        this.sendAuditLog('info', `Import started: ${this.state.selectedFile.name}`, {
            fileName: this.state.selectedFile.name,
            fileSize: this.metrics.fileSize,
            mode: mode,
            estimatedRows: this.metrics.estimatedRows
        });

        const startBtn = document.getElementById('import-sdk-start-btn');
        const checkBtn = document.getElementById('import-sdk-check-btn');
        
        startBtn.disabled = true;
        checkBtn.disabled = true;
        
        if (mode === 'check') {
            checkBtn.textContent = this.t('checking');
            document.getElementById('import-sdk-progress-title').textContent = this.t('validationProgress');
        } else {
            startBtn.textContent = this.t('importing');
            document.getElementById('import-sdk-progress-title').textContent = this.t('importProgress');
        }
        
        document.getElementById('import-sdk-progress').style.display = 'block';

        this.updateStats();
        this.log(`${mode === 'check' ? this.t('checking') : this.t('importing')} Chunk size: ${this.config.chunkSize}`);

        // Read file as text first for normalization
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            try {
                let csvContent = e.target.result;
                let headersChecked = false;
                let papaConfig = {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false, // Keep as strings for custom transformers
                    chunk: async (results, parser) => {
                        // Validate columns on first chunk
                        if (!headersChecked) {
                            headersChecked = true;
                            const fileColumns = results.meta.fields || [];

                            // Check required columns
                            if (this.config.requiredColumns && this.config.requiredColumns.length > 0) {
                                const missingColumns = this.config.requiredColumns.filter(col => !fileColumns.includes(col));
                                
                                if (missingColumns.length > 0) {
                                    const msg = `Missing required columns: ${missingColumns.join(', ')}`;
                                    this.log(msg, 'error');
                                    this.state.errorCount++;
                                    this.sendErrorSample(msg, 'validation', { missingColumns });
                                }
                            }

                            // Check allowed columns
                            if (this.config.allowedColumns && this.config.allowedColumns.length > 0) {
                                const unknownColumns = fileColumns.filter(col => !this.config.allowedColumns.includes(col));
                                
                                if (unknownColumns.length > 0) {
                                    const msg = `Unknown columns found: ${unknownColumns.join(', ')}`;
                                    // Treat as error to ensure check fails
                                    this.log(msg, 'error');
                                    this.state.errorCount++;
                                    
                                    // Send error sample
                                    this.sendErrorSample(msg, 'validation', { unknownColumns });
                                    
                                    if (this.config.warnUnknownColumns) {
                                       // Already logged as error above
                                    }
                                }
                            }
                        }

                        parser.pause();
                        await this.processRows(results.data, parser);
                        parser.resume();
                    },
                    complete: async () => {
                        this.log(this.t('parsingComplete'));
                        if (this.rowBuffer.length > 0 && this.state.mode === 'import') {
                            // Send remaining rows
                            const batch = [...this.rowBuffer];
                            const result = await this.sendBatch(this.rowBuffer);
                            this.handleBatchResult(result, batch);
                            this.rowBuffer = [];
                        }
                        this.finishImport();
                    },
                    error: (err) => {
                        this.log(this.t('parsingError', { message: err.message }), 'error');
                        
                        // Send parsing error sample to metrics backend
                        this.sendErrorSample(err.message, 'parsing', {
                            fileName: this.state.selectedFile?.name
                        });
                        
                        this.finishImport();
                    }
                };

                // Apply CSV normalization if enabled
                if (this.config.csvNormalization.enabled) {
                    const stopNormalizationTiming = this.startTiming('normalization');
                    const normalizationResult = this.normalizeCSV(csvContent);
                    stopNormalizationTiming();
                    
                    csvContent = normalizationResult.content;
                    this.metrics.normalizationIssues = normalizationResult.issues;
                    
                    // Log normalization issues
                    if (normalizationResult.issues.length > 0) {
                        this.log(`CSV Normalization: ${normalizationResult.issues.join(', ')}`, 'info');
                    }
                    
                    // Use detected delimiter
                    if (normalizationResult.delimiter !== ',') {
                        papaConfig.delimiter = normalizationResult.delimiter;
                    }
                }

                // Start parse timing
                this.metrics.parseStartTime = performance.now();
                
                // Parse the normalized content
                Papa.parse(csvContent, papaConfig);
                
            } catch (err) {
                this.log(`File reading error: ${err.message}`, 'error');
                this.finishImport();
            }
        };
        
        fileReader.onerror = () => {
            this.log('Failed to read file', 'error');
            this.finishImport();
        };
        
        fileReader.readAsText(this.state.selectedFile);
    }

    async processRows(newRows, parser) {
        // Filter, Transform, and Validate rows
        for (const row of newRows) {
            // Compute CSV line number for this row (header is line 1)
            const csvLineNumber = this.state.currentCsvLine;
            this.state.currentCsvLine += 1;

            const stopRowTiming = this.startTiming('rowProcessing');
            
            // 1. Apply filters first (before transform)
            const stopFilterTiming = this.startTiming('filter');
            const filterResult = this.filterRow(row);
            stopFilterTiming();
            
            if (!filterResult.passed) {
                this.state.filteredCount++;
                this.state.filteredRows.push({ ...row, _filterReason: filterResult.reason, _csvLineNumber: csvLineNumber });
                this.log(
                    this.t('rowFiltered', { reason: filterResult.reason }) + ` [Line ${csvLineNumber}]`,
                    'info'
                );
                stopRowTiming();
                continue; // Skip this row
            }

            // 2. Transform
            const stopTransformTiming = this.startTiming('transform');
            const transformed = this.transformRow(row);
            stopTransformTiming();
            
            // 3. Validate
            const stopValidationTiming = this.startTiming('validation');
            const validation = this.validateRow(transformed);
            stopValidationTiming();
            
            stopRowTiming();

            if (validation.isValid) {
                if (this.state.mode === 'import') {
                    // Keep CSV line number on rows we send to the API
                    this.rowBuffer.push({ ...transformed, _csvLineNumber: csvLineNumber });
                } else {
                    // In check mode, just count success
                    this.state.successCount++;
                    this.state.totalCount++;
                    this.state.successRows.push({ ...transformed, _csvLineNumber: csvLineNumber });
                }
            } else {
                // Invalid row - store only if resultExport includes 'errors'
                this.state.errorCount++;
                this.state.totalCount++;
                
                if (this.config.resultExport.includes('errors')) {
                    const errorRow = {
                        ...transformed,
                        _error: validation.error,
                        _errorType: 'client-validation',
                        _csvLineNumber: csvLineNumber
                    };
                    this.state.errorRows.push(errorRow);
                }
                
                this.log(
                    this.t('validationError', { error: validation.error }) + ` [Line ${csvLineNumber}]`,
                    'error'
                );
                
                // Send validation error sample to metrics backend
                this.sendErrorSample(validation.error, 'client-validation', {
                    row: transformed,
                    field: validation.field || 'unknown',
                    csvLineNumber
                });
            }
        }
        
        // Update stats periodically
        this.updateStats();
        
        // Send progress update to metrics backend
        this.sendProgressUpdate({
            totalCount: this.state.totalCount,
            successCount: this.state.successCount,
            errorCount: this.state.errorCount,
            filteredCount: this.state.filteredCount
        });

        // If in check mode, we don't send batches
        if (this.state.mode === 'check') {
            return;
        }

        // While we have enough data for at least one batch
        while (this.rowBuffer.length >= this.config.chunkSize) {
            const batchesToSend = [];
            
            // Prepare up to 'concurrency' batches
            for (let i = 0; i < this.config.concurrency; i++) {
                if (this.rowBuffer.length >= this.config.chunkSize) {
                    const batch = this.rowBuffer.splice(0, this.config.chunkSize);
                    batchesToSend.push(batch);
                } else {
                    break;
                }
            }

            if (batchesToSend.length > 0) {
                // Track concurrency
                this.updateConcurrency(batchesToSend.length);
                
                // Send batches in parallel
                const results = await Promise.all(batchesToSend.map(batch => {
                    const stopChunkTiming = this.startTiming('chunkProcessing');
                    return this.sendBatch(batch).then(result => {
                        stopChunkTiming({ chunkSize: batch.length });
                        return { result, batch };
                    });
                }));
                
                // Process results
                results.forEach(({ result, batch }) => this.handleBatchResult(result, batch));

                // Wait if configured and we still have data to process (or just wait between parallel bursts)
                if (this.config.waitBetweenChunks > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.config.waitBetweenChunks));
                }
            }
        }
    }

    filterRow(row) {
        // First apply built-in filters
        if (this.config.filters && Object.keys(this.config.filters).length > 0) {
            for (const [field, filterFn] of Object.entries(this.config.filters)) {
                const value = row[field];
                if (!filterFn(value)) {
                    return { 
                        passed: false, 
                        reason: `${field}=${value}` 
                    };
                }
            }
        }

        // Then apply plugin filters
        for (const plugin of this.activePlugins.row) {
            if (plugin.filter) {
                try {
                    const result = plugin.filter(row, plugin.config || {});
                    if (result && !result.passed) {
                        return { 
                            passed: false, 
                            reason: result.reason || `Plugin '${plugin.name}' filtered row` 
                        };
                    }
                    // Handle boolean return for backward compatibility
                    if (typeof result === 'boolean' && !result) {
                        return { 
                            passed: false, 
                            reason: `Plugin '${plugin.name}' filtered row` 
                        };
                    }
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' filter error: ${err.message}`, 'error');
                    // On filter error, exclude the row for safety
                    return { 
                        passed: false, 
                        reason: `Plugin filter error: ${err.message}` 
                    };
                }
            }
        }

        return { passed: true };
    }

    validateRow(row) {
        let validator = this.activeMapping.validate;

        // If no mapping-specific validator, check global config
        if (!validator && this.config.validate) {
            validator = this.config.validate;
        }

        // Determine if we should collect all errors
        const collectAll = this.config.collectAllErrors;
        const errors = [];

        // 1. Function-based validation (new style)
        if (typeof validator === 'function') {
            try {
                const result = validator(row);
                if (result && !result.isValid) {
                    const errorMsg = result.error || 'Validation failed';
                    if (collectAll) {
                        errors.push(errorMsg);
                    } else {
                        return { isValid: false, error: errorMsg };
                    }
                }
            } catch (err) {
                const errorMsg = `Validator error: ${err.message}`;
                if (collectAll) {
                    errors.push(errorMsg);
                } else {
                    return { isValid: false, error: errorMsg };
                }
            }
        }
        // 2. Object-based validation (old style)
        else if (typeof validator === 'object') {
            for (const [field, validationDef] of Object.entries(validator)) {
                // Normalize to array of validators: [[fn, msg], ...]
                // If it's a single validator [fn, msg], validationDef[0] will be the function
                // If it's multiple [[fn, msg], ...], validationDef[0] will be an array
                const validators = Array.isArray(validationDef[0]) ? validationDef : [validationDef];

                for (const [validator, msg] of validators) {
                    if (typeof validator === 'function' && !validator(row[field], row)) {
                        const errorMsg = msg || `Invalid ${field}`;
                        if (collectAll) {
                            errors.push(errorMsg);
                        } else {
                            return { isValid: false, error: errorMsg };
                        }
                    }
                }
            }
        }

        // 3. Run field-level plugin validations
        for (const plugin of this.activePlugins.field) {
            if (plugin.validate) {
                for (const [field, value] of Object.entries(row)) {
                    try {
                        const result = plugin.validate(value, field, row, plugin.config || {});
                        if (result && !result.isValid) {
                            const errorMsg = result.error || `Plugin '${plugin.name}' validation failed for ${field}`;
                            if (collectAll) {
                                errors.push(errorMsg);
                            } else {
                                return { isValid: false, error: errorMsg };
                            }
                        }
                        // Handle boolean return for backward compatibility
                        if (typeof result === 'boolean' && !result) {
                            const errorMsg = `Plugin '${plugin.name}' validation failed for ${field}`;
                            if (collectAll) {
                                errors.push(errorMsg);
                            } else {
                                return { isValid: false, error: errorMsg };
                            }
                        }
                    } catch (err) {
                        this.log(`Plugin '${plugin.name}' validate error on field '${field}': ${err.message}`, 'error');
                        const errorMsg = `Plugin validation error: ${err.message}`;
                        if (collectAll) {
                            errors.push(errorMsg);
                        } else {
                            return { isValid: false, error: errorMsg };
                        }
                    }
                }
            }
        }

        // 4. Run row-level plugin validations
        for (const plugin of this.activePlugins.row) {
            if (plugin.validate) {
                try {
                    const result = plugin.validate(row, this, plugin.config || {});
                    if (result && !result.isValid) {
                        const errorMsg = result.error || 
                                       (result.errors && result.errors.join('; ')) || 
                                       `Plugin '${plugin.name}' row validation failed`;
                        if (collectAll) {
                            errors.push(errorMsg);
                        } else {
                            return { isValid: false, error: errorMsg };
                        }
                    }
                    // Handle boolean return for backward compatibility
                    if (typeof result === 'boolean' && !result) {
                        const errorMsg = `Plugin '${plugin.name}' row validation failed`;
                        if (collectAll) {
                            errors.push(errorMsg);
                        } else {
                            return { isValid: false, error: errorMsg };
                        }
                    }
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' row validate error: ${err.message}`, 'error');
                    const errorMsg = `Plugin validation error: ${err.message}`;
                    if (collectAll) {
                        errors.push(errorMsg);
                    } else {
                        return { isValid: false, error: errorMsg };
                    }
                }
            }
        }

        // If we collected errors, return them all joined
        if (errors.length > 0) {
            return { 
                isValid: false, 
                error: errors.join(' | '),
                errors: errors // Also keep individual errors for programmatic access
            };
        }

        return { isValid: true };
    }

    transformRow(row) {
        const transformed = {};

        // Apply field mapping from active mapping
        Object.keys(row).forEach(key => {
            const mappedKey = this.activeMapping.fieldMapping[key] || key;
            let value = row[key];

            // Apply transformer if exists in active mapping
            if (this.activeMapping.transformers[mappedKey]) {
                value = this.activeMapping.transformers[mappedKey](value);
            }

            // Apply field-level plugins
            this.activePlugins.field.forEach(plugin => {
                if (plugin.transform) {
                    try {
                        value = plugin.transform(value, mappedKey, row, plugin.config || {});
                    } catch (err) {
                        this.log(`Plugin '${plugin.name}' transform error on field '${mappedKey}': ${err.message}`, 'error');
                    }
                }
            });

            transformed[mappedKey] = value;
        });

        // Apply row-level plugin transforms
        let finalTransformed = transformed;
        this.activePlugins.row.forEach(plugin => {
            if (plugin.transform) {
                try {
                    finalTransformed = plugin.transform(finalTransformed, row, this, plugin.config || {}) || finalTransformed;
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' row transform error: ${err.message}`, 'error');
                }
            }
        });

        return finalTransformed;
    }

    /**
     * Default send handler using Fetch API
     * @param {Array} batch - Batch of transformed and validated rows
     * @param {Object} config - SDK configuration
     * @returns {Promise<{success: number, errors: Array}>}
     */
    async defaultSendHandler(batch, config) {
        // Generic payload: send batch under a neutral key
        const payload = { items: batch };

        // Merge default headers with custom headers
        const headers = {
            'Content-Type': 'application/json',
            ...config.headers
        };

        // Merge default fetch options with custom options
        const fetchOptions = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            ...config.fetchOptions
        };

        const response = await fetch(config.apiEndpoint, fetchOptions);

        const data = await response.json();
        const result = { success: 0, errors: [] };

        if (response.ok || response.status === 422) {
            // Try to locate an array of per-row results in a generic way
            let items = [];
            if (data && Array.isArray(data.items)) {
                items = data.items;
            } else if (Array.isArray(data)) {
                items = data;
            }

            if (items.length > 0) {
                items.forEach((res, index) => {
                    const originalRow = batch[index] || {};
                    const csvLineNumber = originalRow._csvLineNumber;

                    const hasErrorFlag = !!res && res.error === true;
                    const hasErrorMessage = !!res && typeof res.errorMessage === 'string';
                    const isError = hasErrorFlag || hasErrorMessage;

                    if (isError) {
                        const message = res.message || res.errorMessage || this.t('serverErrorGeneric');
                        result.errors.push({
                            message,
                            data: {
                                ...res,
                                _csvLineNumber: csvLineNumber,
                                originalRow
                            }
                        });
                    } else {
                        result.success++;
                    }
                });
            } else if (response.ok) {
                // No per-row info: assume whole batch succeeded
                result.success = batch.length;
            } else {
                // Validation-style HTTP status but no detailed items
                result.errors = batch.map(() => ({
                    message: this.t('batchValidationFailed', { status: response.status }),
                    data: null
                }));
            }
        } else {
            // Server error (non-2xx / non-422)
            result.errors = batch.map(() => ({
                message: this.t('serverError', { status: response.status, statusText: response.statusText }),
                data: null
            }));
        }

        return result;
    }

    async sendBatch(batch) {
        try {
            // Apply batch-level plugin beforeSend hooks
            let processedBatch = batch;
            for (const plugin of this.activePlugins.batch) {
                if (plugin.beforeSend) {
                    try {
                        const result = plugin.beforeSend(processedBatch, this, plugin.config || {});
                        if (result) {
                            processedBatch = result;
                        }
                    } catch (err) {
                        this.log(`Plugin '${plugin.name}' beforeSend error: ${err.message}`, 'error');
                    }
                }
            }

            // Use custom send handler if provided, otherwise use default
            const sendHandler = this.config.sendHandler || this.defaultSendHandler.bind(this);
            
            let result;
            const stopApiTiming = this.startTiming('apiCall');
            try {
                result = await sendHandler(processedBatch, this.config);
                stopApiTiming({ success: true, batchSize: processedBatch.length });
            } catch (handlerError) {
                stopApiTiming({ success: false, error: handlerError.message });
                this.log(this.t('sendHandlerError', { message: handlerError.message }), 'error');
                // Safe default on handler error
                result = {
                    success: 0,
                    errors: batch.map(() => ({
                        message: this.t('handlerError', { message: handlerError.message }),
                        data: null
                    }))
                };
            }

            // Validate result structure and apply safe defaults
            if (!result || typeof result !== 'object') {
                this.log(this.t('invalidHandlerResponse'), 'error');
                result = { success: 0, errors: [] };
            }
            if (typeof result.success !== 'number') result.success = 0;
            if (!Array.isArray(result.errors)) result.errors = [];

            // Apply batch-level plugin afterSend hooks
            for (const plugin of this.activePlugins.batch) {
                if (plugin.afterSend) {
                    try {
                        const pluginResult = plugin.afterSend(result, processedBatch, this, plugin.config || {});
                        if (pluginResult) {
                            result = pluginResult;
                        }
                    } catch (err) {
                        this.log(`Plugin '${plugin.name}' afterSend error: ${err.message}`, 'error');
                    }
                }
            }

            return result;

        } catch (err) {
            // Network or unexpected error
            this.state.errorCount += batch.length;
            this.log(this.t('networkError', { message: err.message }), 'error');
            
            // Send network error sample to metrics backend
            this.sendErrorSample(err.message, 'network', {
                batchSize: batch.length,
                url: this.config.apiEndpoint
            });
            
            return {
                success: 0,
                errors: batch.map(() => ({
                    message: this.t('networkError', { message: err.message }),
                    data: null
                }))
            };
        }
    }

    handleBatchResult(result, batch) {
        this.state.successCount += result.success;
        this.state.errorCount += result.errors.length;
        this.state.totalCount += (result.success + result.errors.length);

        // Store success rows (if resultExport includes 'success')
        if (this.config.resultExport.includes('success') && batch) {
            // Assume first N rows were successful
            const successRows = batch.slice(0, result.success);
            this.state.successRows.push(...successRows);
        }

        // Store error rows (if resultExport includes 'errors')
        if (this.config.resultExport.includes('errors')) {
            result.errors.forEach(err => {
                // Generic error row: use err.data as base without assuming its shape
                const baseData = (err && typeof err.data === 'object' && err.data !== null)
                    ? err.data
                    : {};

                const errorRow = {
                    ...baseData,
                    _error: err.message,
                    _errorType: 'server-validation'
                };

                if (baseData._csvLineNumber != null) {
                    errorRow._csvLineNumber = baseData._csvLineNumber;
                }
                
                this.state.errorRows.push(errorRow);

                const lineSuffix = errorRow._csvLineNumber != null
                    ? ` [Line ${errorRow._csvLineNumber}]`
                    : '';
                this.log(`Error: ${err.message}${lineSuffix}`, 'error');
                
                // Send error detail to metrics backend (sample unique errors)
                this.sendErrorSample(err.message, 'validation', errorRow);
                
                if (this.config.onError) {
                    this.config.onError(err);
                }
            });
        } else {
            result.errors.forEach(err => {
                this.log(`Error: ${err.message}`, 'error');
                
                // Send error detail to metrics backend (sample unique errors)
                this.sendErrorSample(err.message, 'api', err);
                
                if (this.config.onError) {
                    this.config.onError(err);
                }
            });
        }

        this.updateStats();

        if (this.config.onProgress) {
            this.config.onProgress({
                successCount: this.state.successCount,
                errorCount: this.state.errorCount,
                totalCount: this.state.totalCount,
                filteredCount: this.state.filteredCount
            });
        }
    }

    updateStats() {
        document.getElementById('import-sdk-success-count').textContent = this.state.successCount;
        document.getElementById('import-sdk-error-count').textContent = this.state.errorCount;
        document.getElementById('import-sdk-total-count').textContent = this.state.totalCount;

        // Show/update filtered count if filters are configured
        if (Object.keys(this.config.filters).length > 0) {
            document.getElementById('import-sdk-filtered-stat').style.display = 'block';
            document.getElementById('import-sdk-filtered-count').textContent = this.state.filteredCount;
        }

        const progress = this.state.totalCount > 0 
            ? Math.round((this.state.totalCount / (this.state.totalCount + this.rowBuffer.length)) * 100)
            : 0;
        
        document.getElementById('import-sdk-progress-bar').style.width = `${progress}%`;
        document.getElementById('import-sdk-progress-text').textContent = `${progress}%`;
    }

    finishImport() {
        this.state.isProcessing = false;
        
        const startBtn = document.getElementById('import-sdk-start-btn');
        const checkBtn = document.getElementById('import-sdk-check-btn');
        
        checkBtn.disabled = false;
        
        // Flow control: Prevent start if check failed
        let shouldEnableStart = true;
        if (this.state.mode === 'check') {
            if (this.config.flow.preventStartOnErrors && this.state.errorCount > 0) {
                shouldEnableStart = false;
                this.log(this.t('validationError', { error: 'Fix errors before importing' }), 'warning');
            }
        }
        
        startBtn.disabled = !shouldEnableStart;
        startBtn.textContent = this.t('startImport');
        checkBtn.textContent = this.t('checkFile');
        
        document.getElementById('import-sdk-progress-bar').style.width = '100%';
        document.getElementById('import-sdk-progress-text').textContent = '100%';
        
        const finishMsg = this.state.mode === 'check' 
            ? this.t('validationFinished') 
            : this.t('importFinished');
            
        this.log(finishMsg, 'success');

        // Show export button if resultExport is configured
        if (this.config.resultExport.length > 0) {
            this.setupExportMenu();
            document.getElementById('import-sdk-export-actions').style.display = 'block';
        }

        // Finalize metrics
        this.metrics.endTime = performance.now();
        this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
        this.metrics.actualRows = this.state.totalCount + this.state.filteredCount;
        
        if (this.metrics.parseStartTime) {
            this.metrics.parseEndTime = this.metrics.endTime;
            this.recordTiming('parse', this.metrics.parseEndTime - this.metrics.parseStartTime);
        }
        
        // Reset concurrency tracking
        this.updateConcurrency(0);
        
        // Get final metrics
        const finalMetrics = this.getMetrics();

        // Call plugin onComplete hooks
        const completionStats = {
            successCount: this.state.successCount,
            errorCount: this.state.errorCount,
            totalCount: this.state.totalCount,
            filteredCount: this.state.filteredCount,
            logs: this.state.logs,
            metrics: finalMetrics // Include metrics in completion stats
        };

        ImportSDK.plugins.forEach(plugin => {
            if (plugin.onComplete) {
                try {
                    plugin.onComplete(completionStats, this, plugin.config || {});
                } catch (err) {
                    this.log(`Plugin '${plugin.name}' completion error: ${err.message}`, 'error');
                }
            }
        });

        // Send final metrics to backend
        this.sendToMetricsBackend(this.config.metricsBackend.endpoints.metrics, {
            importId: this.currentImportId,
            fileName: this.state.selectedFile?.name,
            metrics: finalMetrics,
            stats: {
                totalCount: this.state.totalCount,
                successCount: this.state.successCount,
                errorCount: this.state.errorCount,
                filteredCount: this.state.filteredCount
            }
        });

        // Send completion audit log
        this.sendAuditLog('info', `Import completed: ${this.state.selectedFile?.name}`, {
            fileName: this.state.selectedFile?.name,
            totalRows: this.state.totalCount,
            successRows: this.state.successCount,
            errorRows: this.state.errorCount,
            filteredRows: this.state.filteredCount,
            duration: finalMetrics.totalDurationSeconds,
            throughput: finalMetrics.rowsPerSecond,
            performanceScore: finalMetrics.performanceScore
        });

        // Send error pattern summary if there were errors
        if (this.errorPatternCounts && this.errorPatternCounts.size > 0) {
            const errorSummary = Array.from(this.errorPatternCounts.entries())
                .map(([key, count]) => {
                    const [errorType, pattern] = key.split(':', 2);
                    return { errorType, pattern, count };
                })
                .sort((a, b) => b.count - a.count); // Sort by frequency
            
            this.sendAuditLog('warning', `Error patterns summary: ${errorSummary.length} unique patterns`, {
                errorSummary,
                totalPatterns: errorSummary.length,
                totalErrors: Array.from(this.errorPatternCounts.values()).reduce((sum, count) => sum + count, 0)
            });
        }

        // Call metrics callback if provided
        if (this.config.onMetrics) {
            try {
                this.config.onMetrics(finalMetrics);
            } catch (err) {
                this.log(`Metrics callback error: ${err.message}`, 'error');
            }
        }

        if (this.config.onComplete) {
            this.config.onComplete(completionStats);
        }
    }

    setupExportMenu() {
        const menu = document.getElementById('import-sdk-export-menu');
        menu.innerHTML = '';

        if (this.config.resultExport.includes('errors') && this.state.errorRows.length > 0) {
            const btn = document.createElement('button');
            btn.textContent = this.t('downloadErrors');
            btn.className = 'import-sdk-dropdown-item';
            btn.onclick = () => this.exportErrors();
            menu.appendChild(btn);
        }

        if (this.config.resultExport.includes('success') && this.state.successRows.length > 0) {
            const btn = document.createElement('button');
            btn.textContent = this.t('downloadSuccess');
            btn.className = 'import-sdk-dropdown-item';
            btn.onclick = () => this.exportSuccess();
            menu.appendChild(btn);
        }

        if (this.config.resultExport.includes('filtered') && this.state.filteredRows.length > 0) {
            const btn = document.createElement('button');
            btn.textContent = this.t('downloadFiltered');
            btn.className = 'import-sdk-dropdown-item';
            btn.onclick = () => this.exportFiltered();
            menu.appendChild(btn);
        }

        if (this.config.resultExport.includes('logs') && this.state.logs.length > 0) {
            const btn = document.createElement('button');
            btn.textContent = this.t('downloadLogs');
            btn.className = 'import-sdk-dropdown-item';
            btn.onclick = () => this.exportLogs();
            menu.appendChild(btn);
        }

        // Toggle dropdown on button click
        const exportBtn = document.getElementById('import-sdk-export-btn');
        exportBtn.onclick = () => {
            menu.classList.toggle('import-sdk-dropdown-show');
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.matches('.import-sdk-dropdown-btn')) {
                menu.classList.remove('import-sdk-dropdown-show');
            }
        });
    }

    exportErrors() {
        // Clean up error rows for export - ensure all values are serializable
        const cleanErrorRows = this.state.errorRows.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                const value = row[key];
                // Convert complex objects to strings, handle null/undefined
                if (value === null || value === undefined) {
                    cleanRow[key] = '';
                } else if (typeof value === 'object') {
                    cleanRow[key] = JSON.stringify(value);
                } else {
                    cleanRow[key] = String(value);
                }
            });
            return cleanRow;
        });
        
        const csv = Papa.unparse(cleanErrorRows);
        this.downloadFile(csv, 'import-errors.csv', 'text/csv');
        this.log('Downloaded errors CSV', 'success');
    }

    exportSuccess() {
        // Clean up success rows for export
        const cleanSuccessRows = this.state.successRows.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                const value = row[key];
                if (value === null || value === undefined) {
                    cleanRow[key] = '';
                } else if (typeof value === 'object') {
                    cleanRow[key] = JSON.stringify(value);
                } else {
                    cleanRow[key] = String(value);
                }
            });
            return cleanRow;
        });
        
        const csv = Papa.unparse(cleanSuccessRows);
        this.downloadFile(csv, 'import-success.csv', 'text/csv');
        this.log('Downloaded success CSV', 'success');
    }

    exportFiltered() {
        // Clean up filtered rows for export
        const cleanFilteredRows = this.state.filteredRows.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => {
                const value = row[key];
                if (value === null || value === undefined) {
                    cleanRow[key] = '';
                } else if (typeof value === 'object') {
                    cleanRow[key] = JSON.stringify(value);
                } else {
                    cleanRow[key] = String(value);
                }
            });
            return cleanRow;
        });
        
        const csv = Papa.unparse(cleanFilteredRows);
        this.downloadFile(csv, 'import-filtered.csv', 'text/csv');
        this.log('Downloaded filtered CSV', 'success');
    }

    exportLogs() {
        const json = JSON.stringify(this.state.logs, null, 2);
        this.downloadFile(json, 'import-logs.json', 'application/json');
        this.log('Downloaded logs JSON', 'success');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Destroy the SDK instance and clean up resources
     */
    destroy() {
        // Clear the container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Clear any ongoing operations
        this.state.isProcessing = false;
        
        // Clear timers and intervals
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
        }
        
        // Clear event listeners
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileSelect);
        }
        
        // Reset state
        this.state = {
            isProcessing: false,
            selectedFile: null,
            successCount: 0,
            errorCount: 0,
            totalCount: 0,
            filteredCount: 0,
            logs: [],
            successRows: [],
            errorRows: [],
            filteredRows: []
        };
        
        // Clear metrics
        this.resetMetrics();
        
        // Clear references
        this.currentSDK = null;
        this.activePlugins = null;
        this.rowBuffer = [];
        
        console.log('ImportSDK instance destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportSDK;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ImportSDK = ImportSDK;
}
