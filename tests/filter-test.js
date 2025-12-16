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
    console.log("\n=== Filter Tests ===\n");
    
    let allPassed = true;
    
    // Test 1: Simple Value Filter
    console.log("Test 1: Simple Value Filter - Age >= 21");
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
            resultExport: ['success', 'filtered'],
            filters: {
                age: (value) => parseInt(value) >= 21  // Only allow age >= 21
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age
Alice,25
Bob,18
Charlie,30
Diana,16`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        if (sdk.state.successCount === 2 && sdk.state.filteredCount === 2) {
            console.log("✅ PASS: Filter correctly passed 2 rows and filtered 2 rows\n");
        } else {
            console.log("❌ FAIL: Filter counts incorrect\n");
            console.log(`Success: ${sdk.state.successCount}, Filtered: ${sdk.state.filteredCount}`);
            allPassed = false;
        }
    }
    
    // Test 2: Multiple Filters (AND logic)
    console.log("Test 2: Multiple Filters - Age >= 21 AND Active = true");
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
            resultExport: ['success', 'filtered'],
            filters: {
                age: (value) => parseInt(value) >= 21,
                active: (value) => value === 'true'
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age,active
Alice,25,true
Bob,30,false
Charlie,18,true
Diana,22,true`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        // Alice: age=25, active=true -> PASS
        // Bob: age=30, active=false -> FAIL (active)
        // Charlie: age=18, active=true -> FAIL (age)
        // Diana: age=22, active=true -> PASS
        
        if (sdk.state.successCount === 2 && sdk.state.filteredCount === 2) {
            console.log("✅ PASS: Multiple filters applied correctly (AND logic)\n");
        } else {
            console.log("❌ FAIL: Multiple filters incorrect\n");
            console.log(`Success: ${sdk.state.successCount}, Filtered: ${sdk.state.filteredCount}`);
            allPassed = false;
        }
    }
    
    // Test 3: Regex Filter
    console.log("Test 3: Regex Filter - Email must end with @company.com");
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
            resultExport: ['success', 'filtered'],
            filters: {
                email: (value) => /@company\.com$/.test(value)
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,email
Alice,alice@company.com
Bob,bob@gmail.com
Charlie,charlie@company.com
Diana,diana@yahoo.com`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        if (sdk.state.successCount === 2 && sdk.state.filteredCount === 2) {
            console.log("✅ PASS: Regex filter applied correctly\n");
        } else {
            console.log("❌ FAIL: Regex filter incorrect\n");
            console.log(`Success: ${sdk.state.successCount}, Filtered: ${sdk.state.filteredCount}`);
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
