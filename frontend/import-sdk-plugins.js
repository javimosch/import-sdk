/**
 * ImportSDK Plugins - Ref-POC Inspired Features
 * 
 * This file contains plugins that enhance ImportSDK with features from ref-poc:
 * - File validation plugin
 * - Smart field mapping plugin
 * - Enhanced plugin system support
 */

// ============================================================================
// ENHANCED PLUGIN SYSTEM
// ============================================================================

/**
 * Extend ImportSDK plugin system to support new plugin types
 */
if (typeof ImportSDK !== 'undefined') {
    // Add new plugin types to the SDK if not already present
    if (!ImportSDK.pluginTypes) {
        ImportSDK.pluginTypes = ['field', 'row', 'batch'];
    }
    
    // Ensure V2 plugin types are included
    const v2Types = ['file', 'import', 'error', 'metrics'];
    v2Types.forEach(type => {
        if (!ImportSDK.pluginTypes.includes(type)) {
            ImportSDK.pluginTypes.push(type);
        }
    });
    
    // Extend ImportSDK prototype with new plugin execution methods
    Object.assign(ImportSDK.prototype, {
        /**
         * Execute file-level plugins
         */
        async executeFilePlugins(action, ...args) {
            const filePlugins = ImportSDK.getPluginsByType('file');
            const results = [];
            
            for (const plugin of filePlugins) {
                if (plugin[action] && typeof plugin[action] === 'function') {
                    try {
                        const result = await plugin[action].call(plugin, ...args, this, plugin.config || {});
                        results.push({ plugin: plugin.name, result, success: true });
                    } catch (error) {
                        results.push({ plugin: plugin.name, error: error.message, success: false });
                        if (plugin.config?.throwOnError) {
                            throw error;
                        }
                    }
                }
            }
            
            return results;
        },
        
        /**
         * Execute error-level plugins
         */
        async executeErrorPlugins(action, ...args) {
            const errorPlugins = ImportSDK.getPluginsByType('error');
            let result = args[0]; // First arg is typically the error object
            
            for (const plugin of errorPlugins) {
                if (plugin[action] && typeof plugin[action] === 'function') {
                    try {
                        result = await plugin[action].call(plugin, result, ...args.slice(1), this, plugin.config || {});
                    } catch (error) {
                        console.warn(`Error plugin ${plugin.name} failed:`, error.message);
                    }
                }
            }
            
            return result;
        },
        
        /**
         * Execute metrics-level plugins
         */
        async executeMetricsPlugins(action, ...args) {
            const metricsPlugins = ImportSDK.getPluginsByType('metrics');
            const results = {};
            
            for (const plugin of metricsPlugins) {
                if (plugin[action] && typeof plugin[action] === 'function') {
                    try {
                        const result = await plugin[action].call(plugin, ...args, this, plugin.config || {});
                        results[plugin.name] = result;
                    } catch (error) {
                        console.warn(`Metrics plugin ${plugin.name} failed:`, error.message);
                    }
                }
            }
            
            return results;
        }
    });
}

// ============================================================================
// FILE VALIDATION PLUGIN
// ============================================================================

ImportSDK.use({
    name: 'csvFileValidator',
    type: 'file',
    
    config: {
        allowedMimeTypes: ['text/csv', 'application/csv'],
        requiredColumns: [],
        allowedColumns: [], // Empty default
        warnUnknownColumns: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        delimiter: ',',
        throwOnError: false
    },
    
    /**
     * Validate file before import
     */
    async validate(file, sdk, config) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            fileInfo: {},
            canProceed: true
        };
        
        // 1. MIME type validation
        if (!config.allowedMimeTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
            validation.isValid = false;
            validation.errors.push(`Invalid file type: ${file.type || 'unknown'}. Expected: CSV`);
        }
        
        // 2. File size validation
        if (file.size > config.maxFileSize) {
            validation.isValid = false;
            validation.errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
        }
        
        // 3. CSV structure validation
        try {
            await this.validateCsvStructure(file, config, validation, sdk);
        } catch (error) {
            validation.isValid = false;
            validation.errors.push(error.message);
        }
        
        // 4. Log validation results
        if (validation.errors.length > 0) {
            validation.errors.forEach(error => sdk.log(error, 'error'));
        }
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => sdk.log(warning, 'warning'));
        }
        
        if (validation.isValid) {
            sdk.log(`File validation passed: ${validation.fileInfo.totalRows} rows, ${validation.fileInfo.columns.length} columns`, 'success');
        }
        
        return validation;
    },
    
    /**
     * Validate CSV structure
     */
    validateCsvStructure(file, config, validation, sdk) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvContent = e.target.result;
                    const lines = csvContent.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must have at least one data row'));
                        return;
                    }
                    
                    // Parse header
                    const header = lines[0].split(config.delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
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
                            if (column && !config.allowedColumns.includes(column)) {
                                validation.warnings.push(`Unknown column: "${column}" will be ignored`);
                            }
                        });
                    }
                    
                    // Check for empty headers
                    const emptyHeaders = header.filter((h, i) => !h && i < header.length - 1);
                    if (emptyHeaders.length > 0) {
                        validation.warnings.push(`Found ${emptyHeaders.length} empty column headers`);
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

// ============================================================================
// SMART FIELD MAPPING PLUGIN
// ============================================================================

ImportSDK.use({
    name: 'smartFieldMapping',
    type: 'row',
    
    config: {
        // Field aliases - map multiple possible names to target field
        aliases: {},
        
        // Auto type detection
        autoTypeDetection: {
            boolean: [],
            integer: [],
            float: [],
            date: []
        },
        
        // Field-specific transformations
        transformers: {
            // Boolean conversion
            boolean: (value) => {
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase().trim();
                    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
                }
                return Boolean(value);
            },
            
            // Numeric conversion with null handling
            numeric: (value, type = 'int') => {
                if (value === '' || value === null || value === undefined) {
                    return null;
                }
                
                const cleaned = String(value).replace(/[^\d.-]/g, '');
                const num = type === 'float' ? parseFloat(cleaned) : parseInt(cleaned, 10);
                return isNaN(num) ? null : num;
            },
            
            // Coordinate normalization
            coordinate: (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return null;
                
                // Validate coordinate ranges
                if (Math.abs(num) > 180) return null;
                return num;
            },
            
            // Text cleaning
            text: (value) => {
                if (value === null || value === undefined) return null;
                return String(value).trim().replace(/^"|"$/g, '');
            }
        }
    },
    
    /**
     * Transform row with smart field mapping
     */
    transform(row, originalRow, sdk, config) {
        console.warn('DEBUG: smartFieldMapping.transform', { 
            rowKeys: Object.keys(row), 
            hasOriginalRow: !!originalRow, 
            hasSdk: !!sdk, 
            hasConfig: !!config,
            configType: typeof config,
            configAliases: config ? !!config.aliases : 'N/A'
        });
        const transformed = { ...row };
        
        // 1. Apply field aliases
        Object.entries(config.aliases).forEach(([target, sources]) => {
            if (transformed[target] === undefined || transformed[target] === '') {
                for (const source of sources) {
                    if (transformed[source] !== undefined && transformed[source] !== '') {
                        transformed[target] = transformed[source];
                        sdk.log(`Mapped field: ${source} → ${target}`, 'info');
                        break;
                    }
                }
            }
        });
        
        // 2. Apply auto type detection
        Object.entries(config.autoTypeDetection).forEach(([type, fields]) => {
            fields.forEach(field => {
                if (transformed[field] !== undefined && transformed[field] !== '') {
                    const originalValue = transformed[field];
                    
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
                            // Basic date parsing
                            const date = new Date(transformed[field]);
                            transformed[field] = isNaN(date.getTime()) ? null : date.toISOString();
                            break;
                    }
                    
                    // Log type conversion
                    if (originalValue !== transformed[field]) {
                        sdk.log(`Type conversion: ${field} (${originalValue}) → ${transformed[field]}`, 'info');
                    }
                }
            });
        });
        
        // 3. Clean empty strings and normalize text
        Object.keys(transformed).forEach(key => {
            if (transformed[key] === '') {
                transformed[key] = null;
            } else if (typeof transformed[key] === 'string') {
                transformed[key] = config.transformers.text(transformed[key]);
            }
        });
        
        return transformed;
    },
    
    /**
     * Validate transformed row
     */
    validate(row, sdk, config) {
        const errors = [];
        
        // Check for required fields if configured
        if (config.requiredFields && Array.isArray(config.requiredFields)) {
            config.requiredFields.forEach(field => {
                if (!row[field]) {
                    errors.push(`Missing required field: ${field}`);
                }
            });
        }
        
        // Generic validators could be injected here via config
        
        return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to register multiple plugins
 */
window.ImportSDKPlugins = {
    /**
     * Get all available plugins
     */
    getAvailablePlugins() {
        return ImportSDK.plugins.map(p => ({
            name: p.name,
            type: p.type,
            description: p.description || 'No description available'
        }));
    },
    
    /**
     * Configure plugins
     */
    configure(pluginName, config) {
        const plugin = ImportSDK.plugins.find(p => p.name === pluginName);
        if (plugin) {
            Object.assign(plugin.config, config);
            return true;
        }
        return false;
    },
    
    /**
     * Get plugin by name
     */
    getPlugin(pluginName) {
        return ImportSDK.plugins.find(p => p.name === pluginName);
    }
};

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImportSDKPlugins };
}
