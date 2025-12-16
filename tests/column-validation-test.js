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
async function runTests() {
    console.log("\n=== Column Validation Tests ===\n");
    
    let allPassed = true;
    
    // Test 1: Required Columns - Missing Column Header
    console.log("Test 1: Required Columns - Missing Column Header");
    {
        const container = document.getElementById('container');
        container.innerHTML = `
            <div id="import-sdk-file-name"></div>
            <div id="import-sdk-file-info" style="display:none"></div>
            <div id="import-sdk-upload-prompt"></div>
            <div id="import-sdk-progress-title"></div>
            <div id="import-sdk-progress" style="display:none"></div>
            <button id="import-sdk-start-btn" disabled></button>
            <button id="import-sdk-check-btn" disabled></button>
        `;
        
        let errorLogs = [];
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            requiredColumns: ['name', 'email'], // Require name and email columns
        });
        
        // Mock logging
        sdk.log = function(msg, type) {
            if (type === 'error') {
                errorLogs.push(msg);
            }
        };
        
        const csvContent = `name,phone
John,123456
Jane,789012`; // Missing 'email' column
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const foundError = errorLogs.some(log => log.includes('Missing required columns') && log.includes('email'));
        
        if (foundError && sdk.state.errorCount > 0) {
            console.log("✅ PASS: Missing required column detected\n");
        } else {
            console.log("❌ FAIL: Missing required column not detected\n");
            console.log("Error logs:", errorLogs);
            allPassed = false;
        }
    }
    
    // Test 2: Allowed Columns - Unknown Column
    console.log("Test 2: Allowed Columns - Unknown Column");
    {
        const container = document.getElementById('container');
        container.innerHTML = `
            <div id="import-sdk-file-name"></div>
            <div id="import-sdk-file-info" style="display:none"></div>
            <div id="import-sdk-upload-prompt"></div>
            <div id="import-sdk-progress-title"></div>
            <div id="import-sdk-progress" style="display:none"></div>
            <button id="import-sdk-start-btn" disabled></button>
            <button id="import-sdk-check-btn" disabled></button>
        `;
        
        let errorLogs = [];
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            allowedColumns: ['name', 'email'], // Only allow name and email
        });
        
        sdk.log = function(msg, type) {
            if (type === 'error') {
                errorLogs.push(msg);
            }
        };
        
        const csvContent = `name,email,age,UNKNOWN_FIELD
John,john@test.com,30,value1
Jane,jane@test.com,25,value2`; // Contains 'age' and 'UNKNOWN_FIELD'
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const foundError = errorLogs.some(log => 
            log.includes('Unknown columns found') && 
            (log.includes('age') || log.includes('UNKNOWN_FIELD'))
        );
        
        if (foundError && sdk.state.errorCount > 0) {
            console.log("✅ PASS: Unknown columns detected\n");
        } else {
            console.log("❌ FAIL: Unknown columns not detected\n");
            console.log("Error logs:", errorLogs);
            allPassed = false;
        }
    }
    
    // Test 3: Both Required and Allowed Columns
    console.log("Test 3: Both Required and Allowed Columns - Valid");
    {
        const container = document.getElementById('container');
        container.innerHTML = `
            <div id="import-sdk-file-name"></div>
            <div id="import-sdk-file-info" style="display:none"></div>
            <div id="import-sdk-upload-prompt"></div>
            <div id="import-sdk-progress-title"></div>
            <div id="import-sdk-progress" style="display:none"></div>
            <button id="import-sdk-start-btn" disabled></button>
            <button id="import-sdk-check-btn" disabled></button>
        `;
        
        let errorLogs = [];
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            requiredColumns: ['id', 'name'],
            allowedColumns: ['id', 'name', 'email'],
        });
        
        sdk.log = function(msg, type) {
            if (type === 'error') {
                errorLogs.push(msg);
            }
        };
        
        const csvContent = `id,name,email
1,John,john@test.com
2,Jane,jane@test.com`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        if (sdk.state.errorCount === 0) {
            console.log("✅ PASS: Valid columns accepted\n");
        } else {
            console.log("❌ FAIL: Valid columns incorrectly rejected\n");
            console.log("Error logs:", errorLogs);
            allPassed = false;
        }
    }
    
    console.log("===================");
    if (allPassed) {
        console.log("FINAL VERDICT: ALL TESTS PASSED ✅");
        process.exit(0);
    } else {
        console.log("FINAL VERDICT: SOME TESTS FAILED ❌");
        process.exit(1);
    }
}

runTests().catch(e => {
    console.error("Test Exception:", e);
    process.exit(1);
});
