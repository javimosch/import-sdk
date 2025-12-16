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
    console.log("Starting Collect All Errors Test...");
    
    // Mock SDK logging
    ImportSDK.prototype.log = function(msg, type) {
        // console.log(`[SDK ${type}]: ${msg}`);
    };

    const container = document.getElementById('container');
    let passed = true;
    
    // Test 1: Function-based validator returning multiple errors (New Feature)
    console.log("\n=== Test 1: Function-based Validator returning multiple errors array ===");
    
    const sdk1 = ImportSDK.init(container, {
        apiEndpoint: '/test-api',
        collectAllErrors: true,
        resultExport: ['errors'],
        validate: (row) => {
            return {
                isValid: false,
                errors: ['Error 1', 'Error 2']
            };
        }
    });

    // Mock active mapping
    sdk1.activeMapping = { validate: sdk1.config.validate, fieldMapping: {}, transformers: {} };
    sdk1.activePlugins = { field: [], row: [] }; 
    
    const row1 = { field1: 'invalid', field2: 'invalid' };
    const result1 = sdk1.validateRow(row1);
    
    if (!result1.isValid && result1.error.includes("Error 1") && result1.error.includes("Error 2")) {
        console.log("✅ PASS: Multiple errors collected from function validator");
    } else {
        console.error("❌ FAIL: Failed to collect multiple errors from function validator");
        console.error("Result:", JSON.stringify(result1, null, 2));
        passed = false;
    }
    
    // Test 1.5: Object-based Validators collecting multiple errors
    console.log("\n=== Test 1.5: Object-based Validators collecting multiple errors ===");
    
    const sdk1b = ImportSDK.init(container, {
        apiEndpoint: '/test-api',
        collectAllErrors: true,
        resultExport: ['errors'],
        validate: {
            field1: [(val) => val === 'valid', 'Invalid field1'], 
            field2: [(val) => val === 'valid', 'Invalid field2'] 
        }
    });

    // Mock active mapping
    sdk1b.activeMapping = { validate: sdk1b.config.validate, fieldMapping: {}, transformers: {} };
    sdk1b.activePlugins = { field: [], row: [] }; 
    
    const result1b = sdk1b.validateRow(row1);
    
    if (!result1b.isValid && result1b.error.includes("Invalid field1") && result1b.error.includes("Invalid field2")) {
       console.log("✅ PASS: Multiple errors collected from object validators");
    } else {
       console.error("❌ FAIL: Failed to collect multiple errors from object validators");
       console.error("Result:", JSON.stringify(result1b, null, 2));
       passed = false;
    }


    // Test 2: Plugin-based validation errors + Main validator errors
    console.log("\n=== Test 2: Combining Plugin errors with Main errors ===");
    
    // Register a plugin that always fails
    ImportSDK.use({
        name: 'failPlugin',
        type: 'row',
        validate: (row) => {
            return { isValid: false, error: 'Plugin Error' };
        }
    });
    
    const sdk2 = ImportSDK.init(container, {
        apiEndpoint: '/test-api',
        collectAllErrors: true, 
        validate: (row) => {
            return { isValid: false, error: 'Main Error' };
        }
    });
    
    // Mock active mapping
    sdk2.activeMapping = { validate: sdk2.config.validate, fieldMapping: {}, transformers: {} };
    // Need to re-initialize activePlugins since they are set in constructor
    sdk2.activePlugins.row = ImportSDK.getPluginsByType('row');
    
    const row2 = { any: 'data' };
    const result2 = sdk2.validateRow(row2);
    
    if (!result2.isValid && result2.error.includes("Main Error") && result2.error.includes("Plugin Error")) {
        console.log("✅ PASS: Combined errors from main validator and plugins");
    } else {
        console.error("❌ FAIL: Failed to combine errors");
        console.error("Result:", JSON.stringify(result2, null, 2));
        passed = false;
    }
    
    // Clean up plugin
    ImportSDK.removePlugin('failPlugin');


    // Test 3: Disabled collectAllErrors (Legacy Mode)
    console.log("\n=== Test 3: Legacy Mode (collectAllErrors: false) ===");
    
    const sdk3 = ImportSDK.init(container, {
        apiEndpoint: '/test-api',
        collectAllErrors: false,
        validate: {
            field1: [(val) => false, 'Error 1'], 
            field2: [(val) => false, 'Error 2'] 
        }
    });
    
    sdk3.activeMapping = { validate: sdk3.config.validate, fieldMapping: {}, transformers: {} };
    sdk3.activePlugins = { field: [], row: [] };
    
    const result3 = sdk3.validateRow(row1);
    
    // Should only have the first error (Error 1) and NOT Error 2
    if (!result3.isValid && result3.error === 'Error 1') {
        console.log("✅ PASS: Legacy mode stopped at first error");
    } else {
        console.error("❌ FAIL: Legacy mode behavior incorrect");
        console.error("Result:", JSON.stringify(result3, null, 2));
        passed = false;
    }


    console.log("\n===================");
    if (passed) {
        console.log("FINAL VERDICT: ALL TESTS PASSED ✅");
        process.exit(0);
    } else {
        console.log("FINAL VERDICT: SOME TESTS FAILED ❌");
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error("Test Exception:", e);
    process.exit(1);
});
