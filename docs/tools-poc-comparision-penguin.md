# ImportSDK vs Ref-POC Comparison Analysis

## Overview

This document analyzes the ref-poc implementation to identify features that could enhance the ImportSDK. The ref-poc is a PHP-based CSV import system with some interesting capabilities that complement our JavaScript ImportSDK.

## Architecture Comparison

| Aspect | Ref-POC (PHP) | ImportSDK (JavaScript) | Assessment |
|--------|---------------|------------------------|------------|
| **Language** | PHP backend | JavaScript frontend | Different paradigms, complementary |
| **Processing** | Server-side | Client-side | ImportSDK more scalable |
| **UI Framework** | Bootstrap + jQuery | Vanilla JS + CSS | ImportSDK more modern |
| **Real-time Updates** | Basic jQuery updates | Rich real-time UI | ImportSDK superior |
| **Error Handling** | Modal popups | In-line logs + metrics | ImportSDK more comprehensive |

## 🚀 Interesting Features from Ref-POC to Consider

### 1. **Automatic File Splitting** ⭐⭐⭐⭐⭐
**Ref-POC Implementation:**
```php
class CsvFile {
    const MAX_LINE = 250;
    
    public function splitFile($file, $outputDir) {
        // Splits large CSV files into smaller chunks
        // Each chunk has max 250 lines + header
    }
    
    public static function mustBeSplit($file) {
        // Checks if file exceeds max line limit
    }
}
```

**Benefits for ImportSDK:**
- Handles very large files without memory issues
- Allows parallel processing of chunks
- Better for systems with memory constraints
- Automatic chunking based on size limits

**Implementation Suggestion:**
```javascript
class ImportSDK {
    splitLargeFile(file, maxLines = 250) {
        // Client-side file splitting before processing
        // Create multiple blob chunks for sequential processing
    }
}
```

### 2. **Smart Field Mapping & Data Transformation** ⭐⭐⭐⭐
**Ref-POC Implementation:**
```php
private static function formatValue(array $rowExtract) {
    // Boolean conversion
    $rowExtract['active'] = 'true' === $rowExtract['active'] ? true : false;
    
    // Float conversion
    foreach (['latitude', 'longitude'] as $key) {
        $rowExtract[$key] = !empty($rowExtract[$key]) ? floatval($rowExtract[$key]) : null;
    }
    
    // Integer conversion
    foreach (['volume', 'makeId', 'typeId', 'categoryId'] as $key) {
        $rowExtract[$key] = !empty($rowExtract[$key]) ? intval($rowExtract[$key]) : null;
    }
    
    // Smart field mapping (chipNumber fallback logic)
    if (empty($rowExtract['chipNumber'])) {
        if (!empty($rowExtract['rfidNumber'])) {
            $rowExtract['chipNumber'] = $rowExtract['rfidNumber'];
        } elseif (!empty($rowExtract['uhfNumber'])) {
            $rowExtract['chipNumber'] = $rowExtract['uhfNumber'];
        } elseif (!empty($rowExtract['memoryChipNumber'])) {
            $rowExtract['chipNumber'] = $rowExtract['memoryChipNumber'];
        }
    }
}
```

**Benefits for ImportSDK:**
- Automatic type detection and conversion
- Field aliasing and fallback logic
- Data normalization rules
- Smart field mapping based on priority

**ImportSDK Enhancement:**
```javascript
{
    transformers: {
        // Enhanced transformers with type detection
        autoType: (value, field) => {
            // Auto-detect and convert boolean, number, string
        },
        fieldAlias: {
            // Map multiple possible field names to target
            chipNumber: ['rfidNumber', 'uhfNumber', 'memoryChipNumber']
        }
    }
}
```

### 3. **Comprehensive CSV Validation** ⭐⭐⭐⭐
**Ref-POC Implementation:**
```php
private static function validFile($fileType, $dest_path) {
    // MIME type validation
    if ('text/csv' !== $fileType) {
        return ['error' => 'Le fichier doit être au format CSV.'];
    }
    
    // Header validation against known columns
    $allColumns = [
        'chipNumber', 'tankNumber', 'rfidNumber', 'uhfNumber',
        'longitude', 'latitude', 'streetNumber', 'roadNumber',
        // ... comprehensive field list
    ];
    
    foreach ($header as $column) {
        if (!in_array($column, $allColumns)) {
            $message .= "La colonne $column n'est pas utilisée.<br>";
        }
    }
}
```

**Benefits for ImportSDK:**
- Pre-upload validation
- Column mapping validation
- Early error detection
- User guidance on valid columns

**ImportSDK Enhancement:**
```javascript
{
    validation: {
        allowedColumns: ['tankNumber', 'latitude', 'longitude', ...],
        requiredColumns: ['tankNumber'],
        warnUnknownColumns: true,
        validateBeforeImport: true
    }
}
```

### 4. **Error Visualization with Modal Tables** ⭐⭐⭐
**Ref-POC Implementation:**
```php
// Generates modal with detailed error table
function errorHtml($body, $numberFile = 0) {
    $errors = array_filter($body->bins, function ($item) {
        return isset($item->error);
    });
    
    return self::render('table-error', [
        'bins' => $body->bins, 
        'numberFile' => $numberFile
    ]);
}
```

**Benefits for ImportSDK:**
- Detailed error breakdown in modal
- Line number references
- Tank number association
- Better UX for error review

**ImportSDK Enhancement:**
```javascript
{
    errorDisplay: {
        showModal: true,
        showLineNumbers: true,
        groupByError: true,
        exportErrors: true
    }
}
```

### 5. **File Management & Cleanup** ⭐⭐⭐
**Ref-POC Implementation:**
```php
// Automatic file cleanup after processing
unlink(self::UPLOAD_DIR.$input['clientId'].'/'.$input['file']);

// Client-specific upload directories
$uploadFileDir = self::UPLOAD_DIR.$clientId.'/';
if (!is_dir($uploadFileDir)) {
    mkdir($uploadFileDir, 0777, true);
}
```

**Benefits for ImportSDK:**
- Automatic cleanup of processed files
- Organized file storage by client
- Prevents disk space issues

### 6. **Purge Functionality** ⭐⭐⭐
**Ref-POC Implementation:**
```php
public static function purgeBins($clientId) {
    // Database cleanup
    $db->queryFetchAll(
        'DELETE FROM geonline.bac_referentiel WHERE client_id = :clientId',
        ['clientId' => $clientId]
    );
    
    // Reset references
    $db->queryFetchAll(
        'UPDATE db_agregat.agregat_bac_collecte_etatcourant SET bac_referentiel_id = null WHERE client_id = :clientId',
        ['clientId' => $clientId]
    );
}
```

**Benefits for ImportSDK:**
- Data reset capabilities
- Clean re-import functionality
- Database maintenance

## 📊 Feature Gap Analysis

### Features Present in Ref-POC but Missing in ImportSDK

| Feature | Priority | Implementation Complexity | Impact |
|---------|----------|---------------------------|--------|
| **File Splitting** | High | Medium | High |
| **Smart Field Mapping** | High | Low | High |
| **Pre-upload Validation** | Medium | Low | Medium |
| **Error Modal Tables** | Medium | Medium | Medium |
| **File Management** | Low | Low | Low |
| **Purge Functionality** | Low | High | Low |

### Features Present in ImportSDK but Missing in Ref-POC

| Feature | Advantage |
|---------|-----------|
| **Plugin Architecture** | Extensibility |
| **Real-time Metrics** | Performance monitoring |
| **Error Pattern Grouping** | Smart error analysis |
| **Progress Tracking** | User experience |
| **Custom Send Handlers** | Flexibility |
| **CSV Normalization** | Data quality |
| **Comprehensive Logging** | Debugging |

## 🎯 Recommended Implementation Priorities

### Phase 1: Quick Wins (Low effort, High impact)

1. **Smart Field Mapping Enhancement**
   ```javascript
   // Add to ImportSDK config
   fieldAliases: {
       chipNumber: ['rfidNumber', 'uhfNumber', 'memoryChipNumber']
   },
   autoTypeDetection: true
   ```

2. **Pre-upload CSV Validation**
   ```javascript
   validateFile(file) {
       // Check MIME type, headers, structure
       // Return validation report before processing
   }
   ```

### Phase 2: Medium Effort Features

3. **File Splitting for Large Files**
   ```javascript
   async splitLargeFile(file, maxLines = 1000) {
       // Create blob chunks for sequential processing
       // Prevent memory issues with very large files
   }
   ```

4. **Enhanced Error Display**
   ```javascript
   showErrorModal(errors) {
       // Detailed error table with line numbers
       // Group by error type
       // Export capabilities
   }
   ```

### Phase 3: Advanced Features

5. **File Management System**
   ```javascript
   class FileManager {
       constructor() {
           this.clientStorage = new Map();
           this.autoCleanup = true;
       }
       
       storeFile(clientId, file) { /* ... */ }
       cleanupProcessedFiles() { /* ... */ }
   }
   ```

## 🔧 Implementation Suggestions

### 1. Enhanced Configuration Object

```javascript
ImportSDK.init(container, {
    // Existing config...
    
    // New features from ref-poc
    fileManagement: {
        autoSplit: true,
        maxLinesPerChunk: 250,
        autoCleanup: true,
        clientStorage: true
    },
    
    fieldMapping: {
        // Enhanced mapping with aliases
        aliases: {
            chipNumber: ['rfidNumber', 'uhfNumber', 'memoryChipNumber']
        },
        autoTypeDetection: true,
        normalizeEmptyValues: true
    },
    
    validation: {
        preUpload: true,
        allowedColumns: ['tankNumber', 'latitude', ...],
        warnUnknownColumns: true,
        validateHeaders: true
    },
    
    errorDisplay: {
        showModal: true,
        showLineNumbers: true,
        groupByErrorType: true,
        exportFormat: ['csv', 'json']
    }
});
```

### 2. Plugin for Smart Field Mapping

```javascript
ImportSDK.use({
    name: 'smartFieldMapping',
    type: 'row',
    transform: (row, config) => {
        // Implement ref-poc style field mapping logic
        // Handle aliases, type conversion, normalization
        return transformedRow;
    }
});
```

### 3. File Management Plugin

```javascript
ImportSDK.use({
    name: 'fileManagement',
    type: 'batch',
    beforeSend: async (batch, sdk, config) => {
        // Handle file splitting if needed
        // Manage client-specific storage
        // Cleanup processed files
        return batch;
    }
});
```

## 🏆 Conclusion

The ref-poc provides several valuable features that would enhance the ImportSDK:

1. **File Splitting** - Most valuable for handling large datasets
2. **Smart Field Mapping** - Improves data quality and user experience  
3. **Pre-upload Validation** - Early error detection saves time
4. **Error Visualization** - Better UX for error management

The ImportSDK already has superior architecture with plugins, metrics, and real-time capabilities. By incorporating these ref-poc features, it would become an even more comprehensive and robust CSV import solution.

The modular nature of ImportSDK makes it easy to add these features as plugins or configuration options without disrupting existing functionality.
