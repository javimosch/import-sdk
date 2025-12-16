const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Papa = require('papaparse');

// Load ImportSDK source
const sdkPath = path.resolve(__dirname, '../frontend/import-sdk.js');
const sdkSource = fs.readFileSync(sdkPath, 'utf8');

// Setup JSDOM
const dom = new JSDOM(`<!DOCTYPE html>
<div id="container">
    <div id="import-sdk-file-name"></div>
    <div id="import-sdk-file-info" style="display:none"></div>
    <div id="import-sdk-upload-prompt"></div>
    <div id="import-sdk-progress-title"></div>
    <div id="import-sdk-progress" style="display:none"></div>
    <button id="import-sdk-start-btn" disabled></button>
    <button id="import-sdk-check-btn" disabled></button>
</div>`, {
    url: "http://localhost/",
    runScripts: "dangerously",
    resources: "usable"
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.FileReader = window.FileReader;
global.Blob = window.Blob;
global.File = window.File;

// Mock PapaParse globally
window.Papa = Papa;

// Execute SDK Code
try {
    window.eval(sdkSource);
} catch (e) {
    console.error("Error loading SDK:", e);
    process.exit(1);
}

const ImportSDK = window.ImportSDK;

console.log("SDK Loaded:", !!ImportSDK);

// Test Logic
async function runTest() {
    console.log("Starting Validation Test...");
    
    let errorLogSpy = [];
    
    // Mock SDK logging to capture errors
    const originalLog = ImportSDK.prototype.log;
    ImportSDK.prototype.log = function(msg, type) {
        console.log(`[SDK ${type}]: ${msg}`);
        if (type === 'error') {
            errorLogSpy.push(msg);
        }
        // originalLog.apply(this, arguments); 
    };

    const container = document.getElementById('container');
    
    // 1. Initialize SDK
    const sdk = ImportSDK.init(container, {
        apiEndpoint: '/test-api',
        allowedColumns: ['makeId', 'typeLabel', 'volume', 'chipNumber'],
        requiredColumns: ['makeId'],
        resultExport: ['errors'],
        validate: (row) => {
            console.log("Validating Row:", JSON.stringify(row));
            // Check cross-field requirement
            if (!row.makeId && !row.typeLabel) {
                 return { isValid: false, error: 'Either Make ID or Type Label is required' };
            }
            
            // Check generic format
            if (row.chipNumber && row.chipNumber.length !== 24) {
                 return { isValid: false, error: 'Chip Number must be exactly 24 characters' };
            }
            
            return { isValid: true };
        }
    });

    // 2. Mock File Upload
    const csvContent = `makeId,typeLabel,volume,chipNumber
,TypeA,1000,ABC123456789012345678901
,TypeB,2000,SHORT_ID
,,3000,DEF123456789012345678901`;
    // Row 1: Valid (missing makeId but has typeLabel, chip ok) -> Wait, logic says !makeId && !typeLabel.
    // Row 1: makeId empty, typeLabel present. !makeId is true, !typeLabel is false. Condition false. Valid.
    
    // Row 2: makeId empty, typeLabel present. Valid on first condition.
    //        Chip number SHORT_ID (8 chars). Invalid.
    
    // Row 3: makeId empty, typeLabel empty. Condition true. Invalid.
    //        Chip number Valid.
    
    const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
    
    // Trigger file select (runs checks, etc)
    sdk.handleFileSelect(file);
    
    // Wait for async parsing/validation
    // We can hook into onComplete or similar, or wait a bit
    await new Promise(r => setTimeout(r, 100)); // wait for file reader
    
    // Manually trigger the check mode which runs processing
    await new Promise((resolve) => {
        // We need to inject onComplete into the instance or config if it wasn't there
        // Or re-init. But re-init clears state. 
        // Better to set it on config directly.
        sdk.config.onComplete = (results) => {
            console.log("Import Complete callback triggered.");
            resolve(results);
        };
        
        sdk.startImport('check');
    });
    
    // Assertions
    console.log("------------------------------------------");
    console.log("Test Results:");
    console.log(`Total Rows processed: ${sdk.state.totalCount}`);
    console.log(`Error Count: ${sdk.state.errorCount}`);
    
    const errors = sdk.state.errorRows.map(r => ({ line: r._csvLineNumber, error: r._error }));
    console.log("Caught Errors:", JSON.stringify(errors, null, 2));

    let passed = true;

    // Expected Errors:
    // Row 2: Chip Number length
    // Row 3: Missing MakeId/TypeLabel AND Missing required 'makeId' from requiredColumns check (if configured that way)
    
    // Wait, requiredColumns: ['makeId'] is set. 
    // Row 1, 2, 3 all have EMPTY makeId.
    // The CSV parser produces an object where empty string is usually just empty string or null depending on transform.
    // By default PapaParse keeps them as strings.
    // But 'requiredColumns' in SDK (my implementation) checks strictly on HEADERS presence, right?
    // Let's check implementation of requiredColumns.
    
    // Re-reading code:
    // "const missingColumns = this.config.requiredColumns.filter(col => !fileColumns.includes(col));"
    // So requiredColumns checks if the COLUMN HEADER is present in the CSV file.
    // My CSV has 'makeId' header. So that check passes.
    
    // So validation falls to row-level 'validate' function and 'requiredFields' plugin (if checking value emptiness).
    // The user's validate function:
    // if (!row.makeId && !row.typeLabel) ...
    // If row.makeId is "" (empty string), !row.makeId is true.
    
    // Row 1: makeId="", typeLabel="TypeA". Valid? !"" && !"TypeA" -> true && false -> false. Valid.
    
    // Row 2: makeId="", typeLabel="TypeB". Valid on first rule.
    //        chipNumber="SHORT_ID". Invalid. Error expected.
    
    // Row 3: makeId="", typeLabel="". Invalid. Error expected.
    
    const expectedErrorCount = 2; // Row 2 and Row 3
    
    if (sdk.state.errorCount !== expectedErrorCount) {
        console.error(`FAILED: Expected ${expectedErrorCount} errors, but got ${sdk.state.errorCount}`);
        passed = false;
    } else {
        console.log("SUCCESS: Correct number of errors caught.");
    }
    
    // Check specific error messages
    const row2Error = errors.find(e => e.error && e.error.includes("24 characters"));
    if (row2Error) {
        console.log("SUCCESS: Caught Chip Number length error.");
    } else {
        console.error("FAILED: Did not detect Chip Number length error.");
        passed = false;
    }
    
    const row3Error = errors.find(e => e.error && e.error.includes("Type Label is required"));
    if (row3Error) {
        console.log("SUCCESS: Caught Cross-field validation error.");
    } else {
        console.error("FAILED: Did not detect Cross-field validation error.");
        passed = false;
    }
    
    if (passed) {
        console.log("FINAL VERDICT: TEST PASSED ✅");
        process.exit(0);
    } else {
        console.log("FINAL VERDICT: TEST FAILED ❌");
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error("Test Exception:", e);
    process.exit(1);
});
