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
            onProgress: config.onProgress || null,
            onComplete: config.onComplete || null,
            onError: config.onError || null
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
            sendHandlerError: 'Send handler error: {message}'
        };

        // Active file mapping (selected based on filename)
        this.activeMapping = {
            fieldMapping: this.config.fieldMapping,
            transformers: this.config.transformers
        };

        this.state = {
            isProcessing: false,
            selectedFile: null,
            successCount: 0,
            errorCount: 0,
            totalCount: 0,
            logs: []
        };

        this.rowBuffer = [];
        this.render();
        this.attachEventListeners();
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
                        <div class="import-sdk-stat import-sdk-stat-total">
                            <div class="import-sdk-stat-value" id="import-sdk-total-count">0</div>
                            <div class="import-sdk-stat-label">${this.t('total')}</div>
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
        document.getElementById('import-sdk-start-btn').disabled = false;
        document.getElementById('import-sdk-check-btn').disabled = false;
        
        const mappingInfo = this.activeMapping.name 
            ? this.t('mappingInfo', { name: this.activeMapping.name }) 
            : '';
            
        this.log(this.t('fileSelected', { 
            filename: file.name, 
            size: (file.size / 1024).toFixed(2),
            mapping: mappingInfo
        }));
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

    startImport(mode = 'import') {
        if (!this.state.selectedFile || this.state.isProcessing) return;

        this.state.isProcessing = true;
        this.state.mode = mode;
        this.state.successCount = 0;
        this.state.errorCount = 0;
        this.state.totalCount = 0;
        this.rowBuffer = [];

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

        Papa.parse(this.state.selectedFile, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // Keep as strings for custom transformers
            chunk: async (results, parser) => {
                parser.pause();
                await this.processRows(results.data, parser);
                parser.resume();
            },
            complete: async () => {
                this.log(this.t('parsingComplete'));
                if (this.rowBuffer.length > 0 && this.state.mode === 'import') {
                    // Send remaining rows
                    const result = await this.sendBatch(this.rowBuffer);
                    this.handleBatchResult(result);
                    this.rowBuffer = [];
                }
                this.finishImport();
            },
            error: (err) => {
                this.log(this.t('parsingError', { message: err.message }), 'error');
                this.finishImport();
            }
        });
    }

    async processRows(newRows, parser) {
        // Transform and Validate rows
        for (const row of newRows) {
            const transformed = this.transformRow(row);
            const validation = this.validateRow(transformed);

            if (validation.isValid) {
                if (this.state.mode === 'import') {
                    this.rowBuffer.push(transformed);
                } else {
                    // In check mode, just count success
                    this.state.successCount++;
                    this.state.totalCount++;
                }
            } else {
                // Invalid row
                this.state.errorCount++;
                this.state.totalCount++;
                this.log(this.t('validationError', { error: validation.error }), 'error');
            }
        }
        
        // Update stats periodically
        this.updateStats();

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
                // Send batches in parallel
                const results = await Promise.all(batchesToSend.map(batch => this.sendBatch(batch)));
                
                // Process results
                results.forEach(result => this.handleBatchResult(result));

                // Wait if configured and we still have data to process (or just wait between parallel bursts)
                if (this.config.waitBetweenChunks > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.config.waitBetweenChunks));
                }
            }
        }
    }

    validateRow(row) {
        if (!this.activeMapping.validate) return { isValid: true };

        for (const [field, [validator, msg]] of Object.entries(this.activeMapping.validate)) {
            if (!validator(row[field])) {
                return { isValid: false, error: msg || `Invalid ${field}` };
            }
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

            transformed[mappedKey] = value;
        });

        return transformed;
    }

    /**
     * Default send handler using fetch API
     * @param {Array} batch - Transformed batch of rows
     * @param {Object} config - SDK configuration
     * @returns {Promise<{success: number, errors: Array}>}
     */
    async defaultSendHandler(batch, config) {
        const payload = {
            bins: batch,
            updateByTankNumber: config.updateByTankNumber
        };

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
            if (data.bins && Array.isArray(data.bins)) {
                data.bins.forEach(res => {
                    if (res.error) {
                        result.errors.push({
                            tankNumber: res.bin?.tankNumber || 'N/A',
                            message: res.errorMessage,
                            data: res
                        });
                    } else {
                        result.success++;
                    }
                });
            } else {
                // Fallback if response structure is different
                if (response.ok) {
                    result.success = batch.length;
                } else {
                    result.errors = batch.map((_, i) => ({
                        message: this.t('batchValidationFailed', { status: response.status }),
                        data: null
                    }));
                }
            }
        } else {
            // Server error
            result.errors = batch.map((_, i) => ({
                message: this.t('serverError', { status: response.status, statusText: response.statusText }),
                data: null
            }));
        }

        return result;
    }

    async sendBatch(batch) {
        try {
            // Use custom send handler if provided, otherwise use default
            const sendHandler = this.config.sendHandler || this.defaultSendHandler.bind(this);
            
            let result;
            try {
                result = await sendHandler(batch, this.config);
            } catch (handlerError) {
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

            return result;

        } catch (err) {
            // Network or unexpected error
            this.state.errorCount += batch.length;
            this.log(this.t('networkError', { message: err.message }), 'error');
            return {
                success: 0,
                errors: batch.map(() => ({
                    message: this.t('networkError', { message: err.message }),
                    data: null
                }))
            };
        }
    }

    handleBatchResult(result) {
        this.state.successCount += result.success;
        this.state.errorCount += result.errors.length;
        this.state.totalCount += (result.success + result.errors.length);

        result.errors.forEach(err => {
            this.log(`Error: ${err.message}`, 'error');
            if (this.config.onError) {
                this.config.onError(err);
            }
        });

        this.updateStats();

        if (this.config.onProgress) {
            this.config.onProgress({
                successCount: this.state.successCount,
                errorCount: this.state.errorCount,
                totalCount: this.state.totalCount
            });
        }
    }

    updateStats() {
        document.getElementById('import-sdk-success-count').textContent = this.state.successCount;
        document.getElementById('import-sdk-error-count').textContent = this.state.errorCount;
        document.getElementById('import-sdk-total-count').textContent = this.state.totalCount;

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
        
        startBtn.disabled = false;
        checkBtn.disabled = false;
        startBtn.textContent = this.t('startImport');
        checkBtn.textContent = this.t('checkFile');
        
        document.getElementById('import-sdk-progress-bar').style.width = '100%';
        document.getElementById('import-sdk-progress-text').textContent = '100%';
        
        const finishMsg = this.state.mode === 'check' 
            ? this.t('validationFinished') 
            : this.t('importFinished');
            
        this.log(finishMsg, 'success');

        if (this.config.onComplete) {
            this.config.onComplete({
                successCount: this.state.successCount,
                errorCount: this.state.errorCount,
                totalCount: this.state.totalCount,
                logs: this.state.logs
            });
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportSDK;
}
