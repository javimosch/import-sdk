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
 *   }
 * });
 */

class ImportSDK {
    constructor(container, config) {
        this.container = container;
        this.config = {
            apiEndpoint: config.apiEndpoint || 'http://localhost:3000/api/import',
            chunkSize: config.chunkSize || 100,
            updateByTankNumber: config.updateByTankNumber || false,
            fieldMapping: config.fieldMapping || {},
            transformers: config.transformers || {},
            onProgress: config.onProgress || null,
            onComplete: config.onComplete || null,
            onError: config.onError || null
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
                        <p class="import-sdk-upload-text">Click to upload or drag and drop</p>
                        <p class="import-sdk-upload-hint">CSV files only</p>
                    </div>
                    <div class="import-sdk-file-info" id="import-sdk-file-info" style="display: none;">
                        <span class="import-sdk-file-name" id="import-sdk-file-name"></span>
                        <button class="import-sdk-remove-btn" id="import-sdk-remove-file">&times;</button>
                    </div>
                </div>

                <div class="import-sdk-actions">
                    <button class="import-sdk-btn import-sdk-btn-primary" id="import-sdk-start-btn" disabled>
                        Start Import
                    </button>
                </div>

                <div class="import-sdk-progress" id="import-sdk-progress" style="display: none;">
                    <div class="import-sdk-progress-header">
                        <span>Progress</span>
                        <span id="import-sdk-progress-text">0%</span>
                    </div>
                    <div class="import-sdk-progress-bar-bg">
                        <div class="import-sdk-progress-bar" id="import-sdk-progress-bar"></div>
                    </div>
                    <div class="import-sdk-stats">
                        <div class="import-sdk-stat import-sdk-stat-success">
                            <div class="import-sdk-stat-value" id="import-sdk-success-count">0</div>
                            <div class="import-sdk-stat-label">Success</div>
                        </div>
                        <div class="import-sdk-stat import-sdk-stat-error">
                            <div class="import-sdk-stat-value" id="import-sdk-error-count">0</div>
                            <div class="import-sdk-stat-label">Errors</div>
                        </div>
                        <div class="import-sdk-stat import-sdk-stat-total">
                            <div class="import-sdk-stat-value" id="import-sdk-total-count">0</div>
                            <div class="import-sdk-stat-label">Total</div>
                        </div>
                    </div>
                </div>

                <div class="import-sdk-logs-container">
                    <div class="import-sdk-logs-header">
                        <span>Logs</span>
                        <button class="import-sdk-clear-btn" id="import-sdk-clear-logs">Clear</button>
                    </div>
                    <div class="import-sdk-logs" id="import-sdk-logs">
                        <div class="import-sdk-log import-sdk-log-info">Ready to start...</div>
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
        startBtn.addEventListener('click', () => this.startImport());

        // Clear logs
        clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    handleFileSelect(file) {
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            this.log('Please upload a CSV file.', 'error');
            return;
        }

        this.state.selectedFile = file;
        document.getElementById('import-sdk-file-name').textContent = file.name;
        document.getElementById('import-sdk-file-info').style.display = 'flex';
        document.getElementById('import-sdk-upload-prompt').style.display = 'none';
        document.getElementById('import-sdk-start-btn').disabled = false;
        this.log(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    }

    handleFileRemove() {
        this.state.selectedFile = null;
        document.getElementById('import-sdk-file-input').value = '';
        document.getElementById('import-sdk-file-info').style.display = 'none';
        document.getElementById('import-sdk-upload-prompt').style.display = 'block';
        document.getElementById('import-sdk-start-btn').disabled = true;
        this.log('File removed.');
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
            '<div class="import-sdk-log import-sdk-log-info">Logs cleared...</div>';
        this.state.logs = [];
    }

    startImport() {
        if (!this.state.selectedFile || this.state.isProcessing) return;

        this.state.isProcessing = true;
        this.state.successCount = 0;
        this.state.errorCount = 0;
        this.state.totalCount = 0;
        this.rowBuffer = [];

        document.getElementById('import-sdk-start-btn').disabled = true;
        document.getElementById('import-sdk-start-btn').textContent = 'Importing...';
        document.getElementById('import-sdk-progress').style.display = 'block';

        this.updateStats();
        this.log(`Starting import... Chunk size: ${this.config.chunkSize}`);

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
                this.log('Parsing complete. Finishing up...');
                if (this.rowBuffer.length > 0) {
                    await this.sendBatch(this.rowBuffer);
                }
                this.finishImport();
            },
            error: (err) => {
                this.log(`Parsing error: ${err.message}`, 'error');
                this.finishImport();
            }
        });
    }

    async processRows(newRows, parser) {
        this.rowBuffer.push(...newRows);

        while (this.rowBuffer.length >= this.config.chunkSize) {
            const batch = this.rowBuffer.splice(0, this.config.chunkSize);
            await this.sendBatch(batch);
        }
    }

    transformRow(row) {
        const transformed = {};

        // Apply field mapping
        Object.keys(row).forEach(key => {
            const mappedKey = this.config.fieldMapping[key] || key;
            let value = row[key];

            // Apply transformer if exists
            if (this.config.transformers[mappedKey]) {
                value = this.config.transformers[mappedKey](value);
            }

            transformed[mappedKey] = value;
        });

        return transformed;
    }

    async sendBatch(batch) {
        try {
            const transformedBatch = batch.map(row => this.transformRow(row));

            const payload = {
                bins: transformedBatch,
                updateByTankNumber: this.config.updateByTankNumber
            };

            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok || response.status === 422) {
                if (data.bins) {
                    data.bins.forEach(res => {
                        if (res.error) {
                            this.state.errorCount++;
                            this.log(`Error (Tank: ${res.bin?.tankNumber || 'N/A'}): ${res.errorMessage}`, 'error');
                            if (this.config.onError) {
                                this.config.onError(res);
                            }
                        } else {
                            this.state.successCount++;
                        }
                    });
                } else {
                    if (response.ok) this.state.successCount += batch.length;
                    else this.state.errorCount += batch.length;
                }
            } else {
                this.state.errorCount += batch.length;
                this.log(`Batch failed: ${response.status} ${response.statusText}`, 'error');
            }

        } catch (err) {
            this.state.errorCount += batch.length;
            this.log(`Network error: ${err.message}`, 'error');
        }

        this.state.totalCount += batch.length;
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
        document.getElementById('import-sdk-start-btn').disabled = false;
        document.getElementById('import-sdk-start-btn').textContent = 'Start Import';
        document.getElementById('import-sdk-progress-bar').style.width = '100%';
        document.getElementById('import-sdk-progress-text').textContent = '100%';
        this.log('Import finished.', 'success');

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
