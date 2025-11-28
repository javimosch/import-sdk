# Import SDK

A lightweight, reusable JavaScript library for importing CSV files in chunks to any API endpoint.

## Features

- 🚀 **Chunked Upload**: Process large CSV files in configurable chunks
- 🔄 **Field Mapping**: Map CSV columns to API field names
- ⚡ **Transformers**: Apply custom transformations to field values
- 🎨 **Standalone CSS**: No external dependencies (except PapaParse)
- 📦 **Injectable**: Easily integrate into any project
- 📊 **Progress Tracking**: Real-time progress and statistics
- 🔍 **Detailed Logging**: Track every step of the import process

## Installation

1. Include PapaParse (for CSV parsing):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
```

2. Include the SDK files:
```html
<link rel="stylesheet" href="import-ui.css">
<script src="import-sdk.js"></script>
```

## Basic Usage

```html
<!-- Container for the import UI -->
<div id="import-container"></div>

<script>
    ImportSDK.init(document.getElementById('import-container'), {
        apiEndpoint: 'http://localhost:3000/api/import',
        chunkSize: 100
    });
</script>
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `apiEndpoint` | string | URL of the API endpoint to send data to |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | number | `100` | Number of rows per chunk |
| `concurrency` | `number` | `1` | Number of chunks to send in parallel. |
| `waitBetweenChunks` | `number` | `0` | Delay in milliseconds between chunk batches. |
| `updateByTankNumber` | boolean | `false` | Update existing records by tank number |
| `fieldMapping` | object | `{}` | Map CSV column names to API field names |
| `transformers` | object | `{}` | Custom transformation functions for fields |
| `validate` | object | `{}` | Validation rules for fields |
| `locale` | string | `'en'` | Current locale ('en', 'fr', etc.) |
| `translations` | object | `{}` | Translation dictionary keyed by locale |
| `headers` | object | `{}` | Custom HTTP headers for default fetch handler |
| `fetchOptions` | object | `{}` | Additional fetch options (credentials, mode, etc.) |
| `sendHandler` | function | `null` | Custom function to send batches to API |
| `fileMappings` | array | `[]` | Array of file-specific mapping configurations |
| `onProgress` | function | `null` | Callback for progress updates |
| `onComplete` | function | `null` | Callback when import completes |
| `onError` | function | `null` | Callback for individual errors |
| `metricsBackend` | `object` | `null` | Configuration for metrics backend integration |

### Concurrency & Flow Control

You can control the speed and load of the import process using `concurrency` and `waitBetweenChunks`.

```javascript
ImportSDK.init(container, {
    chunkSize: 100,
    concurrency: 5, // Send 5 chunks (500 records total) in parallel
    waitBetweenChunks: 1000 // Wait 1 second after each batch of 5 chunks
});
```

- **Concurrency**: The SDK will take `concurrency` chunks from the buffer and send them simultaneously using `Promise.all`.
- **Wait Time**: After a batch of parallel requests completes, the SDK will wait for `waitBetweenChunks` milliseconds before processing the next batch.

### Validation & Check Mode

You can validate data before importing using the "Check File" button. Configure validation rules in the `validate` object.

```javascript
ImportSDK.init(container, {
    // ...
    validate: {
        // Field name: [Validator Function, Error Message]
        tankNumber: [(val) => !!val, "Tank Number is required"],
        latitude: [(val) => !isNaN(parseFloat(val)), "Invalid Latitude"]
    }
});
```

- **Check Mode**: Clicking "Check File" runs the parser and validators without sending data to the API.
- **Validation**: Rows failing validation are counted as errors and logged, but not added to the import buffer.

## Configuration Reference

Complete list of all configuration options available for `ImportSDK.init()`:

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | `string` | **Required** | API endpoint for data submission |
| `chunkSize` | `number` | `100` | Number of rows to process per batch |
| `updateByTankNumber` | `boolean` | `false` | Whether to update existing records by tank number |

### Export & Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resultExport` | `string[]` | `[]` | Data types to collect: `['success', 'errors', 'filtered', 'logs']` |
| `filters` | `object` | `{}` | Row filtering functions to exclude data before validation |

### CSV Normalization

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `csvNormalization.enabled` | `boolean` | `true` | Enable/disable the entire normalization layer |
| `csvNormalization.trimBOM` | `boolean` | `true` | Remove Byte Order Mark (BOM) from file start |
| `csvNormalization.normalizeLineEndings` | `boolean` | `true` | Convert CRLF and CR to LF line endings |
| `csvNormalization.autoDetectDelimiter` | `boolean` | `true` | Auto-detect comma, semicolon, tab, or pipe delimiters |
| `csvNormalization.removeUnicodeJunk` | `boolean` | `true` | Remove invisible Unicode and control characters |
| `csvNormalization.stripEmptyLines` | `boolean` | `true` | Remove empty lines (preserves header) |
| `csvNormalization.sanitizeHeaders` | `boolean` | `true` | Clean header row of problematic characters |

### Data Processing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fieldMapping` | `object` | `{}` | Map CSV column names to API field names |
| `transformers` | `object` | `{}` | Transform field values before validation |
| `validators` | `object` | `{}` | Client-side validation rules |

### Advanced

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fileMappings` | `array` | `[]` | File-specific configuration overrides based on filename patterns |
| `sendHandler` | `function` | `null` | Custom API request handler function |
| `i18n` | `object` | `{}` | Internationalization strings for UI text |

### Plugin System

| Method | Type | Description |
|--------|------|-------------|
| `ImportSDK.use(plugin)` | `static function` | Register a plugin with the SDK |
| `ImportSDK.getPlugins()` | `static function` | Get all registered plugins |
| `ImportSDK.getPluginsByType(type)` | `static function` | Get plugins by type ('field', 'row', 'batch') |
| `ImportSDK.removePlugin(name)` | `static function` | Remove a plugin by name |
| `ImportSDK.clearPlugins()` | `static function` | Clear all registered plugins |

### Callbacks

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onProgress` | `function` | `null` | Called after each chunk: `(stats) => {}` |
| `onComplete` | `function` | `null` | Called when import finishes: `(result) => {}` |
| `onError` | `function` | `null` | Called for each error: `(error) => {}` |
| `onMetrics` | `function` | `null` | Called with detailed execution metrics: `(metrics) => {}` |

### Internationalization (i18n)

The SDK supports multiple languages. You can configure the `locale` and provide `translations`.

```javascript
ImportSDK.init(container, {
    // ...
    locale: 'fr',
    translations: {
        fr: {
            uploadPrompt: "Cliquez pour télécharger ou glissez-déposez",
            startImport: "Démarrer l'importation",
            // ... see defaultTranslations in source for all keys
        }
    }
});
```

## Metrics Backend Configuration

Integrate with a metrics backend to capture and analyze import performance and audit logs.

```javascript
ImportSDK.init(container, {
    // ...
    metricsBackend: {
        enabled: true,                       // Enable/disable metrics collection
        baseURL: 'http://localhost:3012',    // Base URL of your metrics backend
        sessionId: 'my-unique-session-id',   // Optional: Custom session ID for grouping metrics
        includeProgress: true,               // Optional: Send progress updates to backend (default: true)
        endpoints: {                         // Optional: Custom endpoint paths
            metrics: '/api/import/metrics',
            progress: '/api/import/progress',
            audit: '/api/audit/log'
        }
    },
    onMetrics: (metrics) => {
        console.log('Metrics collected:', metrics);
    }
});
```

### Options for `metricsBackend`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Set to `true` to enable sending metrics to the backend. |
| `baseURL` | `string` | `''` | The base URL of your metrics backend server. **Required if `enabled` is `true`.** |
| `sessionId` | `string` | `Generated UUID` | A unique identifier for the current import session. If not provided, a UUID will be generated. |
| `includeProgress` | `boolean` | `true` | If `true`, progress updates will be sent to the backend. |
| `endpoints` | `object` | `{ metrics: '/api/metrics', progress: '/api/progress', audit: '/api/audit' }` | Custom endpoint paths for metrics, progress, and audit logs. |

### Basic Metrics Backend Configuration Example:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3011/geored/bin/service/import',
    
    // Enable metrics backend
    metricsBackend: {
        enabled: true,
        baseURL: 'http://localhost:3012',
        includeProgress: true
    },
    
    // Other configuration...
    chunkSize: 50,
    resultExport: ['success', 'errors', 'logs']
});
```

### Advanced Configuration with Custom Session:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3011/geored/bin/service/import',
    
    // Advanced metrics backend configuration
    metricsBackend: {
        enabled: true,
        baseURL: 'http://localhost:3012',
        sessionId: 'custom-session-' + Date.now(),
        includeProgress: true,
        endpoints: {
            metrics: '/api/import/metrics',
            progress: '/api/import/progress',
            audit: '/api/audit/log'
        }
    },
    
    // Enable comprehensive monitoring
    resultExport: ['success', 'errors', 'filtered', 'logs'],
    
    onMetrics: (metrics) => {
        console.log('📊 Import completed:', {
            duration: metrics.totalDurationSeconds,
            throughput: metrics.rowsPerSecond,
            efficiency: metrics.efficiency,
            performanceScore: metrics.performanceScore
        });
    }
});
```

### Custom Headers & Fetch Options

When using the default fetch-based send handler, you can customize HTTP headers and fetch options:

```javascript
ImportSDK.init(container, {
    // ...
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE',
        'X-Custom-Header': 'custom-value'
    },
    fetchOptions: {
        credentials: 'include',
        mode: 'cors'
    }
});
```

- **headers**: Merged with default `Content-Type: application/json`. Custom headers override defaults.
- **fetchOptions**: Additional fetch API options like `credentials`, `mode`, `cache`, etc.

### Custom Send Handler

Use a custom function to send data to your API. This is useful when you have an existing API wrapper or need custom request logic.

**Handler Signature:**
```javascript
async (batch, config) => {
    // batch: Array of transformed rows
    // config: SDK configuration object
    
    // Must return: { success: number, errors: Array }
    return {
        success: 5,  // Number of successful imports
        errors: [    // Array of error objects
            {
                message: 'Error description',
                tankNumber: 'TANK_001',  // Optional
                data: {...}              // Optional original data
            }
        ]
    };
}
```

**Example with API Wrapper:**
```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    sendHandler: async (batch, config) => {
        // Use your existing API wrapper
        const result = await myApi.importBins({
            data: batch,
            endpoint: config.apiEndpoint,
            updateMode: config.updateByTankNumber
        });
        
        // Transform to SDK format
        return {
            success: result.successCount || 0,
            errors: result.failures?.map(f => ({
                message: f.error,
                tankNumber: f.id,
                data: f
            })) || []
        };
    }
});
```

**Example with Custom Fetch:**
```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    sendHandler: async (batch, config) => {
        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${myToken}`
            },
            body: JSON.stringify({ items: batch })
        });
        
        const data = await response.json();
        
        return {
            success: data.imported || 0,
            errors: data.errors || []
        };
    }
});
```

## Multiple File Mappings

Configure different field mappings for different CSV formats. The SDK automatically selects the appropriate mapping based on the filename.

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    
    // File-specific mappings
    fileMappings: [
        {
            name: 'Standard Format',
            pattern: /test\.csv$/,  // RegExp or string
            fieldMapping: {},
            transformers: {}
        },
        {
            name: 'Custom Format',
            pattern: /test2\.csv$/,
            fieldMapping: {
                'Tank ID': 'tankNumber',
                'Type': 'typeId',
                'Location': 'city',
                'Lat': 'latitude',
                'Long': 'longitude'
            },
            transformers: {
                typeId: (v) => parseInt(v),
                latitude: (v) => parseFloat(v),
                longitude: (v) => parseFloat(v)
            }
        },
        {
            name: 'Legacy Format',
            pattern: 'legacy',  // Matches any filename containing 'legacy'
            fieldMapping: {
                'ContainerID': 'tankNumber',
                'BinType': 'typeId'
            },
            transformers: {}
        }
    ],
    
    // Fallback mapping (used if no pattern matches)
    fieldMapping: {},
    transformers: {}
});
```

**How it works:**
1. User selects a file
2. SDK checks `fileMappings` array for matching pattern
3. First matching mapping is used
4. If no match, falls back to default `fieldMapping` and `transformers`
5. Logs show which mapping was selected


## Field Mapping

Map CSV column names to API field names:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    fieldMapping: {
        'Tank ID': 'tankNumber',      // CSV column -> API field
        'Type': 'typeId',
        'Location': 'city',
        'Lat': 'latitude',
        'Long': 'longitude'
    }
});
```

**CSV Example:**
```csv
Tank ID,Type,Location,Lat,Long
BIN_001,1,Paris,48.8566,2.3522
```

**Transformed to API format:**
```json
{
    "tankNumber": "BIN_001",
    "typeId": 1,
    "city": "Paris",
    "latitude": 48.8566,
    "longitude": 2.3522
}
```

## Transformers

Apply custom transformations to field values:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    transformers: {
        typeId: (value) => parseInt(value),
        latitude: (value) => parseFloat(value),
        longitude: (value) => parseFloat(value),
        active: (value) => value === 'true' || value === '1',
        tankNumber: (value) => value.toUpperCase().trim()
    }
});
```

## Callbacks

### onProgress

Called after each chunk is processed:

```javascript
onProgress: (stats) => {
    console.log(`Processed: ${stats.totalCount}`);
    console.log(`Success: ${stats.successCount}`);
    console.log(`Errors: ${stats.errorCount}`);
}
```

### onComplete

Called when the entire import finishes:

```javascript
onComplete: (result) => {
    console.log('Import finished!');
    console.log(`Total: ${result.totalCount}`);
    console.log(`Success: ${result.successCount}`);
    console.log(`Errors: ${result.errorCount}`);
    console.log('Logs:', result.logs);
}
```

### onError

Called for each individual error:

```javascript
onError: (error) => {
    console.error('Error:', error.errorMessage);
    console.error('Data:', error.bin);
}
```

## Result Export Configuration

Control which data gets exported and made available for download after the import process:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    
    // Configure what data to collect and export
    resultExport: ['success', 'errors', 'filtered', 'logs'],
    
    // Other config...
});
```

### Available Export Types

| Type | Description | Export Function |
|------|-------------|-----------------|
| `'success'` | Records that were successfully imported | `sdk.exportSuccess()` |
| `'errors'` | Records that failed validation or import | `sdk.exportErrors()` |
| `'filtered'` | Records excluded by filters | `sdk.exportFiltered()` |
| `'logs'` | Import operation logs and messages | `sdk.exportLogs()` |

### Export Methods

After import completion, use these methods to download the collected data:

```javascript
// Export successful imports
sdk.exportSuccess(); // Downloads: import-success.csv

// Export failed records with error messages
sdk.exportErrors(); // Downloads: import-errors.csv

// Export filtered out records
sdk.exportFiltered(); // Downloads: import-filtered.csv

// Export operation logs
sdk.exportLogs(); // Downloads: import-logs.csv

// Export all data types at once
sdk.exportAll(); // Downloads: import-results.csv
```

**Note:** Only data types included in `resultExport` will be collected. Omitting a type saves memory for large imports.

## Data Filtering

Configure filters to exclude rows based on custom logic before validation and import:

```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    
    // Define row filters
    filters: {
        // Skip rows where city is empty
        skipEmptyCity: (row) => row.city && row.city.trim() !== '',
        
        // Only process specific tank types
        allowedTypes: (row) => ['1', '2', '3'].includes(row.typeId),
        
        // Skip test data
        excludeTest: (row) => !row.tankNumber.startsWith('TEST_'),
        
        // Geographic filter
        parisOnly: (row) => row.city === 'Paris'
    }
});
```

### Filter Function Signature

Each filter is a function that receives a transformed row and returns `true` to keep or `false` to exclude:

```javascript
filterName: (transformedRow, originalRow, rowIndex) => boolean
```

**Parameters:**
- `transformedRow`: Row data after field mapping and transformers
- `originalRow`: Original CSV row data before transformation
- `rowIndex`: Zero-based row number in the CSV file

**Example with all parameters:**
```javascript
filters: {
    conditionalFilter: (transformed, original, index) => {
        // Skip header row (if somehow present)
        if (index === 0) return false;
        
        // Log original vs transformed
        console.log(`Row ${index}: ${original.cityName} -> ${transformed.city}`);
        
        // Keep rows where latitude is valid
        return !isNaN(parseFloat(transformed.latitude));
    }
}
```

### Filter Processing Order

1. **CSV Normalization is applied** (if enabled)
2. CSV is parsed into rows
3. Field mapping is applied
4. Transformers are applied
5. **Filters are applied** (filtered rows are stored separately)
6. Validators are applied to remaining rows
7. Valid rows are sent to the API

## CSV Normalization Layer

Automatically fix common issues in real-world CSV files before parsing. This feature is enabled by default and handles the messy reality of CSV files from various sources.

### Why CSV Normalization?

Most CSV files in the wild have issues:
- **BOM issues**: Files from Excel often include Byte Order Marks
- **Line ending chaos**: Mix of Windows (CRLF), Mac (CR), and Unix (LF)
- **Delimiter confusion**: Some systems use semicolons, tabs, or pipes instead of commas
- **Unicode mess**: Invisible characters, zero-width spaces, various Unicode spaces
- **Empty lines**: Blank rows scattered throughout the data
- **Header problems**: Newlines in headers, extra quotes, weird spacing

### Configuration Examples

**Enable all normalization (default):**
```javascript
ImportSDK.init(container, {
    csvNormalization: {
        enabled: true // All features enabled by default
    }
});
```

**Selective normalization:**
```javascript
ImportSDK.init(container, {
    csvNormalization: {
        enabled: true,
        trimBOM: true,              // Remove BOM
        normalizeLineEndings: true, // Fix line endings
        autoDetectDelimiter: true,  // Auto-detect delimiter
        removeUnicodeJunk: false,   // Keep Unicode as-is
        stripEmptyLines: true,      // Remove empty lines
        sanitizeHeaders: false      // Keep headers as-is
    }
});
```

**Disable normalization:**
```javascript
ImportSDK.init(container, {
    csvNormalization: {
        enabled: false // Skip all normalization
    }
});
```

### What Each Feature Does

#### BOM Removal (`trimBOM`)
Removes Byte Order Mark characters that cause parsing issues:
```
Before: ﻿"tankNumber","city"     // Invisible BOM at start
After:  "tankNumber","city"      // Clean start
```

#### Line Ending Normalization (`normalizeLineEndings`)
Converts all line endings to Unix format (LF):
```
Before: "tank1","Paris"\r\n"tank2","Lyon"\r
After:  "tank1","Paris"\n"tank2","Lyon"\n
```

#### Delimiter Auto-Detection (`autoDetectDelimiter`)
Analyzes the file to detect the actual delimiter:
```
Detects: "tank1";"Paris";"France"    → semicolon
Detects: "tank1"\t"Paris"\t"France"  → tab
Detects: "tank1"|"Paris"|"France"    → pipe
```

#### Unicode Cleanup (`removeUnicodeJunk`)
Removes invisible and problematic Unicode characters:
```
Before: "tank​Number"    // Contains zero-width space
After:  "tankNumber"     // Clean text
```

#### Empty Line Removal (`stripEmptyLines`)
Removes blank rows while preserving the header:
```
Before: tankNumber,city
        
        tank1,Paris
        
        tank2,Lyon
        
After:  tankNumber,city
        tank1,Paris
        tank2,Lyon
```

#### Header Sanitization (`sanitizeHeaders`)
Cleans problematic characters from header row:
```
Before: "Tank
         Number","  City  ","'Type'"
After:  "Tank Number","City","Type"
```

### Normalization Feedback

The SDK logs all normalization actions:

```javascript
ImportSDK.init(container, {
    csvNormalization: { enabled: true },
    
    // See normalization results in logs
    onProgress: (stats) => {
        // Check logs for normalization messages like:
        // "CSV Normalization: Removed 3-byte BOM, Auto-detected delimiter: ';', Removed 5 empty lines"
    }
});
```

### Integration with Papa Parse

The normalization layer works seamlessly with Papa Parse:
- Detected delimiter is automatically passed to Papa Parse
- Normalized content is fed to Papa Parse for final parsing
- All Papa Parse features remain available

### Performance Impact

Normalization adds minimal overhead:
- **Small files** (< 1MB): ~10-50ms processing time
- **Large files** (10MB+): ~100-500ms processing time
- Processing is done once before parsing begins
- No impact on chunk processing or API calls

## Plugin System

Extend the SDK with custom functionality using a powerful plugin architecture. Plugins can operate at field, row, or batch levels with comprehensive lifecycle hooks.

### Why Use Plugins?

- **Extend Core Features**: Add functionality without modifying the SDK
- **Reusable Components**: Share plugins across different projects
- **Custom Business Logic**: Implement domain-specific transformations and validations
- **Community Ecosystem**: Build and share plugins with the community

### Plugin Types

| Type | Level | Use Cases |
|------|-------|-----------|
| **Field** | Individual field values | Date parsing, number formatting, text normalization |
| **Row** | Complete data rows | Cross-field validation, row enrichment, conditional logic |
| **Batch** | Groups of rows | Batch processing, API optimization, aggregation |

### Plugin Registration

Register plugins using the static `use()` method before initializing the SDK:

```javascript
// Register a field-level plugin
ImportSDK.use({
    name: 'dateNormalizer',
    type: 'field',
    transform(value, fieldName, row, config) {
        // Transform date strings to ISO format
        if (fieldName.includes('Date') && typeof value === 'string') {
            return new Date(value).toISOString();
        }
        return value;
    },
    validate(value, fieldName, row, config) {
        // Validate date fields
        if (fieldName.includes('Date') && value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { isValid: false, error: 'Invalid date format' };
            }
        }
        return { isValid: true };
    },
    config: {
        dateFormat: 'ISO'
    }
});

// Register a row-level plugin
ImportSDK.use({
    name: 'coordinateValidator',
    type: 'row',
    validate(row, config) {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return { isValid: false, error: 'Invalid GPS coordinates' };
        }
        return { isValid: true };
    },
    filter(row, config) {
        // Filter out rows with missing coordinates
        if (!row.latitude || !row.longitude) {
            return { passed: false, reason: 'Missing coordinates' };
        }
        return { passed: true };
    }
});

// Register a batch-level plugin
ImportSDK.use({
    name: 'auditLogger',
    type: 'batch',
    beforeSend(batch, sdk, config) {
        console.log(`Sending batch of ${batch.length} records`);
        // Add audit fields to each record
        return batch.map(record => ({
            ...record,
            _batchId: config.batchId || Date.now(),
            _processedAt: new Date().toISOString()
        }));
    },
    afterSend(result, batch, sdk, config) {
        console.log(`Batch complete: ${result.success} success, ${result.errors.length} errors`);
        return result;
    }
});
```

### Plugin Lifecycle Hooks

Each plugin can implement multiple lifecycle hooks:

#### **Initialization & File Handling**
```javascript
{
    onInit(sdk, config) {
        // Called when SDK instance is created
        console.log('Plugin initialized');
    },
    onFileSelect(file, sdk, config) {
        // Called when user selects a file
        console.log('File selected:', file.name);
    },
    onComplete(stats, sdk, config) {
        // Called when import finishes
        console.log('Import complete:', stats);
    }
}
```

#### **Data Processing (Field Plugins)**
```javascript
{
    type: 'field',
    transform(value, fieldName, row, config) {
        // Transform individual field values
        // Return: transformed value
    },
    validate(value, fieldName, row, config) {
        // Validate individual field values
        // Return: { isValid: boolean, error?: string } or boolean
    }
}
```

#### **Data Processing (Row Plugins)**
```javascript
{
    type: 'row',
    transform(transformedRow, originalRow, config) {
        // Transform entire rows
        // Return: modified row object
    },
    validate(row, config) {
        // Validate entire rows
        // Return: { isValid: boolean, error?: string } or boolean
    },
    filter(row, config) {
        // Filter rows before validation
        // Return: { passed: boolean, reason?: string } or boolean
    }
}
```

#### **Batch Processing (Batch Plugins)**
```javascript
{
    type: 'batch',
    beforeSend(batch, sdk, config) {
        // Process batch before sending to API
        // Return: modified batch array
    },
    afterSend(result, batch, sdk, config) {
        // Process API response
        // Return: modified result object
    }
}
```

### Real-World Plugin Examples

#### **Date Normalization Plugin**
```javascript
ImportSDK.use({
    name: 'dateNormalizer',
    type: 'field',
    transform(value, fieldName, row, config) {
        const dateFields = config.dateFields || ['date', 'created', 'updated'];
        if (dateFields.some(field => fieldName.toLowerCase().includes(field))) {
            // Handle various date formats
            const formats = [
                /^\d{2}\/\d{2}\/\d{4}$/,  // MM/DD/YYYY
                /^\d{2}-\d{2}-\d{4}$/,    // MM-DD-YYYY
                /^\d{4}-\d{2}-\d{2}$/     // YYYY-MM-DD
            ];
            
            for (const format of formats) {
                if (format.test(value)) {
                    return new Date(value).toISOString();
                }
            }
        }
        return value;
    },
    config: {
        dateFields: ['inspectionDate', 'createdAt']
    }
});
```

#### **Data Enrichment Plugin**
```javascript
ImportSDK.use({
    name: 'geoEnrichment',
    type: 'row',
    transform(row, originalRow, config) {
        // Add computed fields
        if (row.latitude && row.longitude) {
            row.coordinates = `${row.latitude},${row.longitude}`;
            row.region = this.getRegion(row.latitude, row.longitude);
        }
        return row;
    },
    getRegion(lat, lng) {
        // Simple region detection logic
        if (lat > 45) return 'North';
        if (lat < 35) return 'South';
        return 'Central';
    }
});
```

#### **Batch Optimization Plugin**
```javascript
ImportSDK.use({
    name: 'batchOptimizer',
    type: 'batch',
    beforeSend(batch, sdk, config) {
        // Sort batch for database optimization
        return batch.sort((a, b) => a.tankNumber.localeCompare(b.tankNumber));
    },
    afterSend(result, batch, sdk, config) {
        // Add batch performance metrics
        result.batchMetrics = {
            batchSize: batch.length,
            processedAt: new Date().toISOString()
        };
        return result;
    }
});
```

### Plugin Management

```javascript
// List all plugins
console.log(ImportSDK.getPlugins());

// Get plugins by type
const fieldPlugins = ImportSDK.getPluginsByType('field');
const batchPlugins = ImportSDK.getPluginsByType('batch');

// Remove a specific plugin
ImportSDK.removePlugin('dateNormalizer');

// Clear all plugins
ImportSDK.clearPlugins();
```

### Plugin Configuration

Plugins can accept configuration through the `config` property:

```javascript
ImportSDK.use({
    name: 'currencyConverter',
    type: 'field',
    transform(value, fieldName, row, config) {
        if (config.currencyFields.includes(fieldName)) {
            return value * config.exchangeRate;
        }
        return value;
    },
    config: {
        currencyFields: ['price', 'cost'],
        exchangeRate: 1.1
    }
});
```

### Error Handling

Plugins include comprehensive error handling:

- **Transform errors**: Logged and original value preserved
- **Validation errors**: Cause row to be marked as invalid
- **Filter errors**: Row is excluded for safety
- **Batch errors**: Logged and processing continues

### Plugin Processing Order

1. **CSV Normalization** (if enabled)
2. **Field mapping and transformers** (built-in)
3. **Field plugins** → `transform()` → `validate()`
4. **Row plugins** → `transform()` → `filter()` → `validate()`
5. **Built-in filters and validation**
6. **Batch plugins** → `beforeSend()` → API call → `afterSend()`

This system allows plugins to work together seamlessly while maintaining predictable processing order.

## Import Execution Metrics

Monitor and optimize import performance with comprehensive execution metrics that provide deep insights into every aspect of the import process.

### Why Use Execution Metrics?

- **Performance Optimization**: Identify bottlenecks and optimize import configuration
- **Monitoring**: Track import performance in production environments
- **Debugging**: Diagnose slow imports with detailed timing breakdowns
- **Capacity Planning**: Understand resource usage and throughput patterns
- **Quality Assurance**: Monitor error rates and processing efficiency

### Available Metrics

#### **Timing Metrics**
| Metric | Description |
|--------|-------------|
| `totalDuration` | Complete import duration (milliseconds) |
| `parseDuration` | CSV parsing time |
| `normalizationTime` | CSV normalization processing time |
| `avgRowProcessingTime` | Average time per row (transform + validate + filter) |
| `maxRowProcessingTime` | Slowest single row processing time |
| `avgChunkLatency` | Average time per batch/chunk |
| `avgApiLatency` | Average API call response time |

#### **Throughput Metrics**
| Metric | Description |
|--------|-------------|
| `rowsPerSecond` | Processing rate (rows/second) |
| `throughput` | Data processing rate (bytes/second) |
| `efficiency` | Actual vs theoretical processing efficiency (%) |
| `successRate` | Percentage of successfully processed rows |
| `errorRate` | Percentage of rows with errors |

#### **Concurrency Metrics**
| Metric | Description |
|--------|-------------|
| `peakConcurrency` | Maximum simultaneous API calls |
| `avgConcurrency` | Average concurrency utilization |
| `concurrencyTimeline` | Timeline of concurrency changes |

#### **Resource Metrics**
| Metric | Description |
|--------|-------------|
| `memoryUsageEstimate` | Estimated memory usage (bytes) |
| `cpuLoadEstimate` | Estimated CPU utilization (%) |
| `apiCalls` | Total number of API requests |
| `apiRetries` | Number of retry attempts |
| `apiFailures` | Number of failed API calls |

#### **Plugin Metrics**
| Metric | Description |
|--------|-------------|
| `pluginSummaries` | Per-plugin execution time statistics |
| `pluginCallCounts` | Number of times each plugin was executed |

### Using Metrics

#### **Basic Metrics Callback**
```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    
    onMetrics: (metrics) => {
        console.log('Import Performance Summary:');
        console.log(`Duration: ${metrics.totalDurationSeconds.toFixed(2)}s`);
        console.log(`Throughput: ${metrics.rowsPerSecond.toFixed(1)} rows/sec`);
        console.log(`Efficiency: ${metrics.efficiency.toFixed(1)}%`);
        console.log(`Success Rate: ${metrics.successRate.toFixed(1)}%`);
        
        if (metrics.bottlenecks.length > 0) {
            console.log('Bottlenecks:', metrics.bottlenecks);
        }
    }
});
```

#### **Performance Monitoring**
```javascript
ImportSDK.init(container, {
    apiEndpoint: 'http://localhost:3000/api/import',
    
    onProgress: (stats) => {
        // Real-time metrics during import
        const currentMetrics = sdk.getMetrics();
        updateDashboard({
            rowsPerSecond: currentMetrics.rowsPerSecond,
            memoryUsage: currentMetrics.memoryUsageEstimate,
            activeBatches: currentMetrics.activeBatches
        });
    },
    
    onMetrics: (finalMetrics) => {
        // Send metrics to monitoring service
        analytics.track('import_completed', {
            duration: finalMetrics.totalDurationSeconds,
            rows: finalMetrics.actualRows,
            throughput: finalMetrics.rowsPerSecond,
            efficiency: finalMetrics.efficiency,
            errors: finalMetrics.errorRate,
            performanceScore: finalMetrics.performanceScore
        });
        
        // Alert on performance issues
        if (finalMetrics.performanceScore < 70) {
            alerting.notify('Poor import performance detected', {
                score: finalMetrics.performanceScore,
                bottlenecks: finalMetrics.bottlenecks
            });
        }
    }
});
```

#### **Optimization Analysis**
```javascript
onMetrics: (metrics) => {
    console.log('📊 Performance Analysis:');
    
    // Timing breakdown
    console.log(`⏱️ Timing:
        Total: ${metrics.totalDurationSeconds.toFixed(2)}s
        Parse: ${(metrics.parseDuration / 1000).toFixed(2)}s
        Transform: ${(metrics.transformTime / 1000).toFixed(2)}s
        Validation: ${(metrics.validationTime / 1000).toFixed(2)}s
        API: ${(metrics.totalApiTime / 1000).toFixed(2)}s`);
    
    // Throughput analysis
    console.log(`🚀 Throughput:
        ${metrics.rowsPerSecond.toFixed(1)} rows/sec
        ${(metrics.throughput / 1024).toFixed(1)} KB/sec
        ${metrics.efficiency.toFixed(1)}% efficiency`);
    
    // Concurrency analysis
    console.log(`⚡ Concurrency:
        Peak: ${metrics.peakConcurrency} batches
        Avg: ${(metrics.concurrencyHistory.reduce((a,b) => a+b, 0) / metrics.concurrencyHistory.length).toFixed(1)} batches
        API Success: ${((metrics.apiSuccesses / metrics.apiCalls) * 100).toFixed(1)}%`);
    
    // Resource usage
    console.log(`💾 Resources:
        Memory: ${(metrics.memoryUsageEstimate / 1024 / 1024).toFixed(1)}MB
        CPU: ${metrics.cpuLoadEstimate.toFixed(1)}%`);
    
    // Plugin performance
    Object.entries(metrics.pluginSummaries).forEach(([name, stats]) => {
        console.log(`🔧 Plugin ${name}: ${stats.avgTime.toFixed(2)}ms avg, ${stats.callCount} calls`);
    });
}
```

### Metrics Object Structure

```javascript
{
    // Timing
    totalDuration: 15423.5,           // Total time (ms)
    parseDuration: 234.1,             // Parse time (ms)
    normalizationTime: 12.3,          // Normalization time (ms)
    avgRowProcessingTime: 2.1,        // Avg row processing (ms)
    avgChunkLatency: 145.3,           // Avg batch latency (ms)
    avgApiLatency: 89.2,              // Avg API response (ms)
    
    // Throughput
    rowsPerSecond: 847.3,             // Processing rate
    throughput: 156789,               // Bytes per second
    efficiency: 87.4,                 // Processing efficiency %
    
    // Counts
    totalRowsProcessed: 12500,        // Rows processed
    apiCalls: 125,                    // Total API calls
    apiSuccesses: 123,                // Successful API calls
    apiFailures: 2,                   // Failed API calls
    
    // Concurrency
    peakConcurrency: 4,               // Max simultaneous batches
    activeBatches: 0,                 // Current active batches
    concurrencyHistory: [0,1,2,3,4,3,2,1,0], // Concurrency timeline
    
    // Resources
    memoryUsageEstimate: 52428800,    // Estimated memory (bytes)
    cpuLoadEstimate: 23.4,            // Estimated CPU %
    
    // Quality
    successRate: 94.2,                // Success rate %
    errorRate: 5.8,                   // Error rate %
    performanceScore: 86,             // Overall performance score
    bottlenecks: [                    // Identified bottlenecks
        "Slow API responses: 89.2ms average"
    ],
    
    // Plugin metrics
    pluginSummaries: {
        dateNormalizer: {
            totalTime: 234.5,          // Total execution time
            avgTime: 1.87,             // Average call time
            maxTime: 12.3,             // Longest call time
            callCount: 125             // Number of calls
        }
    }
}
```

### Performance Optimization Tips

Based on metrics analysis:

**High `avgRowProcessingTime`:**
- Optimize transformers and validators
- Reduce plugin complexity
- Consider field-level caching

**High `avgApiLatency`:**
- Increase chunk size
- Optimize API endpoint
- Consider request batching

**Low `efficiency`:**
- Increase concurrency
- Reduce wait between chunks
- Optimize data structures

**High `memoryUsageEstimate`:**
- Disable unnecessary result exports
- Reduce chunk size
- Clear intermediate data

**Low `peakConcurrency`:**
- Check network limitations
- Increase concurrency setting
- Monitor API rate limits

### Real-time Metrics Access

```javascript
// Get metrics during import
const sdk = ImportSDK.init(container, config);

// Access metrics anytime
const currentMetrics = sdk.getMetrics();
console.log(`Current throughput: ${currentMetrics.rowsPerSecond} rows/sec`);

// Monitor progress with metrics
setInterval(() => {
    const metrics = sdk.getMetrics();
    updateProgressBar({
        progress: (metrics.totalRowsProcessed / metrics.estimatedRows) * 100,
        throughput: metrics.rowsPerSecond,
        memory: metrics.memoryUsageEstimate
    });
}, 1000);
```

The metrics system provides comprehensive insights to help optimize import performance and monitor production workloads effectively.

### Working with Filtered Data

```javascript
// Access filtered data programmatically
const stats = sdk.getStats();
console.log(`Filtered out: ${stats.filteredCount} rows`);

// Export filtered data for review
sdk.exportFiltered(); // Contains rows that didn't pass filters

// Use in callbacks
onComplete: (result) => {
    if (result.filteredCount > 0) {
        alert(`${result.filteredCount} rows were filtered out. Check the filtered export for details.`);
    }
}
```

## Complete Example

```javascript
ImportSDK.init(document.getElementById('import-container'), {
    // API Configuration
    apiEndpoint: 'http://localhost:3000/geored/bin/service/import',
    chunkSize: 100,
    updateByTankNumber: false,
    
    // CSV Normalization Layer
    csvNormalization: {
        enabled: true,                // Enable normalization (default: true)
        trimBOM: true,               // Remove BOM (default: true)
        normalizeLineEndings: true,   // Fix line endings (default: true)
        autoDetectDelimiter: true,    // Auto-detect delimiter (default: true)
        removeUnicodeJunk: true,      // Clean Unicode mess (default: true)
        stripEmptyLines: true,        // Remove empty lines (default: true)
        sanitizeHeaders: true         // Clean headers (default: true)
    },
    
    // Export Configuration
    resultExport: ['success', 'errors', 'filtered', 'logs'],
    
    // Data Filters
    filters: {
        validCoordinates: (row) => {
            return !isNaN(parseFloat(row.latitude)) && !isNaN(parseFloat(row.longitude));
        },
        excludeTestData: (row) => !row.tankNumber.startsWith('TEST_')
    },

    // Field Mapping
    fieldMapping: {
        'Tank ID': 'tankNumber',
        'Type': 'typeId',
        'Location': 'city',
        'Lat': 'latitude',
        'Long': 'longitude'
    },

    // Transformers
    transformers: {
        typeId: (value) => parseInt(value) || null,
        latitude: (value) => parseFloat(value) || null,
        longitude: (value) => parseFloat(value) || null
    },

    // Callbacks
    onProgress: (stats) => {
        console.log('Progress:', stats);
    },
    onComplete: (result) => {
        alert(`Import complete! Success: ${result.successCount}, Errors: ${result.errorCount}`);
    },
    onError: (error) => {
        console.error('Import error:', error);
    }
});
```

## API Endpoint Requirements

The SDK expects the API endpoint to:

1. Accept POST requests with JSON body:
```json
{
    "bins": [...],
    "updateByTankNumber": false
}
```

2. Return a response with this structure:
```json
{
    "bins": [
        {
            "id": 1,
            "error": false,
            "errorMessage": "",
            "bin": { ... }
        }
    ],
    "updateByTankNumber": false
}
```

## Parsing Rules Configuration

The SDK uses a flexible configuration system:

1. **Field Mapping**: Define how CSV columns map to API fields
2. **Transformers**: Apply type conversions and validations
3. **Chunking**: Control batch size for API calls

### Example Parsing Rules

```javascript
{
    // Map custom CSV headers to API fields
    fieldMapping: {
        'Container Number': 'tankNumber',
        'Bin Type': 'typeId',
        'City Name': 'city'
    },
    
    // Transform values before sending
    transformers: {
        // Convert strings to numbers
        typeId: (val) => parseInt(val),
        
        // Clean and format strings
        tankNumber: (val) => val.trim().toUpperCase(),
        
        // Convert boolean-like values
        active: (val) => val === 'yes' || val === '1' || val === 'true',
        
        // Parse dates
        commissioningDate: (val) => new Date(val).toISOString()
    }
}
```

## Styling

The SDK uses scoped CSS classes with the `import-sdk-*` prefix to avoid conflicts. You can customize the appearance by overriding these classes in your own CSS:

```css
.import-sdk-container {
    /* Your custom styles */
}

.import-sdk-btn-primary {
    background: #your-color;
}
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- File API support required

## License

MIT
