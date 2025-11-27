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

### Callbacks

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onProgress` | `function` | `null` | Called after each chunk: `(stats) => {}` |
| `onComplete` | `function` | `null` | Called when import finishes: `(result) => {}` |
| `onError` | `function` | `null` | Called for each error: `(error) => {}` |

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

1. CSV is parsed into rows
2. Field mapping is applied
3. Transformers are applied
4. **Filters are applied** (filtered rows are stored separately)
5. Validators are applied to remaining rows
6. Valid rows are sent to the API

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
