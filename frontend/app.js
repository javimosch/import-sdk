document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    const importBtn = document.getElementById('importBtn');
    const chunkSizeInput = document.getElementById('chunkSize');
    const apiEndpointInput = document.getElementById('apiEndpoint');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const successCountEl = document.getElementById('successCount');
    const errorCountEl = document.getElementById('errorCount');
    const totalCountEl = document.getElementById('totalCount');
    const logs = document.getElementById('logs');
    const clearLogs = document.getElementById('clearLogs');

    let selectedFile = null;
    let isProcessing = false;

    // --- Logger ---
    const log = (message, type = 'info') => {
        const div = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        div.innerHTML = `<span class="text-gray-400">[${timestamp}]</span> `;
        
        if (type === 'error') div.className = 'text-red-600';
        else if (type === 'success') div.className = 'text-green-600';
        else div.className = 'text-gray-700';

        div.innerHTML += message;
        logs.appendChild(div);
        logs.scrollTop = logs.scrollHeight;
    };

    clearLogs.addEventListener('click', () => {
        logs.innerHTML = '<div class="text-gray-400 italic">Logs cleared...</div>';
    });

    // --- File Handling ---
    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }
        selectedFile = file;
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
        importBtn.disabled = false;
        log(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    };

    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

    removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        importBtn.disabled = true;
        log('File removed.');
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-blue-50', 'border-blue-300');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('bg-blue-50', 'border-blue-300');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-blue-50', 'border-blue-300');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    // --- Import Logic ---
    importBtn.addEventListener('click', () => {
        if (!selectedFile || isProcessing) return;
        startImport();
    });

    const startImport = () => {
        isProcessing = true;
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        progressSection.classList.remove('hidden');
        
        // Reset counters
        let successCount = 0;
        let errorCount = 0;
        let totalCount = 0;
        successCountEl.textContent = 0;
        errorCountEl.textContent = 0;
        totalCountEl.textContent = 0;
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        const chunkSize = parseInt(chunkSizeInput.value) || 100;
        const apiEndpoint = apiEndpointInput.value;

        log(`Starting import... Chunk size: ${chunkSize}`);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-convert numbers/booleans
            chunkSize: 1024 * 1024 * 5, // 5MB internal chunking for PapaParse (not our API chunking)
            // Actually, PapaParse has a 'step' or 'chunk' callback, but for 'chunkSize' config it reads file in chunks.
            // If we want to batch rows to API, we can use 'step' (slow) or 'chunk' (better) or just parse whole file if small.
            // For true large file support, we should use 'chunk' callback or 'step'.
            // However, to control the exact number of rows sent to API (as per UI config), 
            // it's easier to use 'chunk' callback, accumulate rows, and send when we hit the limit.
            
            // Let's use a simpler approach for this POC: 
            // Parse the whole file (if it fits in memory, which typical POC files do) and then slice array.
            // If the file is HUGE (GBs), we must use streaming. 
            // Let's assume streaming is better for "Imports POC" to show scalability.
            
            // We'll use the `chunk` callback of PapaParse. 
            // PapaParse chunks by bytes, not rows. So we get a batch of rows.
            // We can accumulate these rows and when we have enough (>= chunkSize), send a batch.
            
            chunk: async (results, parser) => {
                parser.pause(); // Pause parsing while we upload

                const rows = results.data;
                // We might have more rows than chunkSize if PapaParse chunk is large.
                // Or fewer.
                // We should probably implement a buffer.
                
                // For simplicity in this POC, let's just send whatever PapaParse gives us, 
                // OR slice it up if it's too big. 
                // But the user wants "Chunk Size (rows)" config.
                // So we need a buffer.
                
                // Wait, `chunk` callback gives us a batch of parsed rows.
                // Let's just process this batch.
                // If we want strict row-count chunks, we need a buffer.
                // Let's implement a buffer.
                
                await processRows(rows, chunkSize, apiEndpoint, parser);
            },
            complete: () => {
                log('Parsing complete. Finishing up...');
                // Process any remaining rows in buffer (handled in processRows logic if we make it global)
                // Actually, with the buffer logic below, we need to handle the last flush.
                if (rowBuffer.length > 0) {
                    sendBatch(rowBuffer, apiEndpoint).then(() => {
                        finishImport();
                    });
                } else {
                    finishImport();
                }
            },
            error: (err) => {
                log(`Parsing error: ${err.message}`, 'error');
                isProcessing = false;
                importBtn.disabled = false;
                importBtn.textContent = 'Start Import';
            }
        });

        // Buffer for rows
        let rowBuffer = [];
        let totalRowsParsed = 0; // To estimate progress if possible (PapaParse gives meta.cursor but total size is file.size)

        const processRows = async (newRows, batchSize, url, parser) => {
            rowBuffer.push(...newRows);

            while (rowBuffer.length >= batchSize) {
                const batch = rowBuffer.splice(0, batchSize);
                await sendBatch(batch, url);
            }

            // Update progress based on file size
            // PapaParse doesn't give easy access to current byte offset in `chunk` callback arguments directly?
            // Actually `results.meta.cursor` is the byte offset.
            // We can calculate percentage.
            // But we need access to `results` which is passed to `chunk`.
            // I'll refactor slightly to access `results` in the `chunk` callback properly.
            
            // Resume parsing
            parser.resume();
        };

        const sendBatch = async (batch, url) => {
            try {
                // Transform data to match API expectation if needed
                // The API expects: { bins: [...], updateByTankNumber: false }
                // The CSV columns should match the JSON fields (tankNumber, city, etc.)
                // PapaParse with header:true gives us objects with keys from header.
                
                // Clean up keys (trim spaces)
                const cleanedBatch = batch.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        newRow[key.trim()] = row[key];
                    });
                    return newRow;
                });

                const payload = {
                    bins: cleanedBatch,
                    updateByTankNumber: false
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok || response.status === 422) {
                    // Process results
                    // API returns { bins: [{ error: bool, ... }] }
                    if (data.bins) {
                        data.bins.forEach(res => {
                            if (res.error) {
                                errorCount++;
                                log(`Error (Tank: ${res.bin.tankNumber}): ${res.errorMessage}`, 'error');
                            } else {
                                successCount++;
                            }
                        });
                    } else {
                        // Fallback if structure is different
                        if (response.ok) successCount += batch.length;
                        else errorCount += batch.length;
                    }
                } else {
                    // Network or Server error (500)
                    errorCount += batch.length;
                    log(`Batch failed: ${response.status} ${response.statusText}`, 'error');
                }

            } catch (err) {
                errorCount += batch.length;
                log(`Network error: ${err.message}`, 'error');
            }

            totalCount += batch.length;
            updateStats();
        };

        const updateStats = () => {
            successCountEl.textContent = successCount;
            errorCountEl.textContent = errorCount;
            totalCountEl.textContent = totalCount;
            
            // Approximate progress if we could track it. 
            // Since we are buffering, the file progress (parser cursor) is ahead of us.
            // But we can update the progress bar based on file cursor in the main loop.
        };

        const finishImport = () => {
            isProcessing = false;
            importBtn.disabled = false;
            importBtn.textContent = 'Start Import';
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
            log('Import finished.', 'success');
        };
    };
});
