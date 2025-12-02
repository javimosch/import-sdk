// Container-specific overrides for ImportSDK
// This file must be loaded AFTER import-sdk.js.

//This file is used to override the default send handler and handleBatchResult
//to align with the bin/containers API (test backend)

(function () {
    if (typeof ImportSDK === 'undefined') {
        console.error('ImportSDK is not defined. Make sure import-sdk.js is loaded before import-sdk-contenant.js');
        return;
    }

    /**
     * Container-specific defaultSendHandler
     *
     * This preserves the current behaviour used by the bin/containers API:
     * - Payload: { bins: batch, updateByTankNumber }
     * - Response: { bins: Array<{ bin, error, errorMessage }> }
     * - Errors are aligned with the batch by index, and we preserve _csvLineNumber
     */
    ImportSDK.prototype.defaultSendHandler = async function (batch, config) {
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
                data.bins.forEach((res, index) => {
                    if (res.error) {
                        const originalRow = batch[index] || {};
                        const csvLineNumber = originalRow._csvLineNumber;
                        result.errors.push({
                            tankNumber: res.bin?.tankNumber || 'N/A',
                            message: res.errorMessage,
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
            } else {
                // Fallback if response structure is different
                if (response.ok) {
                    result.success = batch.length;
                } else {
                    result.errors = batch.map(() => ({
                        message: this.t('batchValidationFailed', { status: response.status }),
                        data: null
                    }));
                }
            }
        } else {
            // Server error
            result.errors = batch.map(() => ({
                message: this.t('serverError', { status: response.status, statusText: response.statusText }),
                data: null
            }));
        }

        return result;
    };

    /**
     * Container-specific handleBatchResult
     *
     * This version knows about `bin` objects in the API response and flattens
     * them into error rows, keeping `_csvLineNumber` when present.
     */
    ImportSDK.prototype.handleBatchResult = function (result, batch) {
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
                // Extract the bin data properly, handling nested objects
                let binData = {};
                if (err.data && err.data.bin) {
                    // Copy only the primitive values from the bin object
                    binData = { ...err.data.bin };
                    // Remove the nested id if it exists and is null
                    if (binData.id === null) {
                        delete binData.id;
                    }
                } else if (err.data) {
                    // Fallback: try to use err.data directly but filter out complex objects
                    binData = { ...err.data };
                }
                
                // Add error metadata (preserve CSV line if available)
                const errorRow = {
                    ...binData,
                    _error: err.message,
                    _errorType: 'validation'
                };

                if (err.data && typeof err.data._csvLineNumber === 'number') {
                    errorRow._csvLineNumber = err.data._csvLineNumber;
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
    };



    console.info(`ImportSDK-contenant.js loaded`)
})();
