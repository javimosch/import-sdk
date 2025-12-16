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
    console.log("\n=== Transform Tests ===\n");
    
    let allPassed = true;
    
    // Test 1: Field Transformers
    console.log("Test 1: Field Transformers - Uppercase Name");
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
        
        let transformedRows = [];
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            resultExport: ['success'],
            transformers: {
                name: (value) => value.toUpperCase(),
                age: (value) => parseInt(value, 10)
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age
john,25
jane,30`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const firstRow = sdk.state.successRows[0];
        
        if (firstRow && firstRow.name === 'JOHN' && firstRow.age === 25) {
            console.log("✅ PASS: Field transformers applied correctly\n");
        } else {
            console.log("❌ FAIL: Field transformers not applied\n");
            console.log("First row:", firstRow);
            allPassed = false;
        }
    }
    
    // Test 2: Field Mapping
    console.log("Test 2: Field Mapping - Rename Columns");
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
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            resultExport: ['success'],
            fieldMapping: {
                'old_name': 'name',
                'old_email': 'email'
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `old_name,old_email
John,john@test.com
Jane,jane@test.com`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const firstRow = sdk.state.successRows[0];
        
        if (firstRow && firstRow.name === 'John' && firstRow.email === 'john@test.com' && !firstRow.old_name) {
            console.log("✅ PASS: Field mapping applied correctly\n");
        } else {
            console.log("❌ FAIL: Field mapping not applied\n");
            console.log("First row:", firstRow);
            allPassed = false;
        }
    }
    
    // Test 3: Combined Mapping and Transformation
    console.log("Test 3: Combined Mapping and Transformation");
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
        
        const sdk = ImportSDK.init(container, {
            apiEndpoint: '/test-api',
            resultExport: ['success'],
            fieldMapping: {
                'user_name': 'name'  // Map user_name -> name
            },
            transformers: {
                name: (value) => value.toUpperCase()  // Then uppercase it
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `user_name,email
alice,alice@test.com
bob,bob@test.com`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const firstRow = sdk.state.successRows[0];
        
        if (firstRow && firstRow.name === 'ALICE' && !firstRow.user_name) {
            console.log("✅ PASS: Combined mapping and transformation applied\n");
        } else {
            console.log("❌ FAIL: Combined operations not applied correctly\n");
            console.log("First row:", firstRow);
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
