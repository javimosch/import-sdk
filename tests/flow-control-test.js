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
    console.log("\n=== Flow Control Tests ===\n");
    
    let allPassed = true;
    
    // Test 1: forceCheck - Start button should be disabled until check runs
    console.log("Test 1: flow.forceCheck - Start disabled until check");
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
            flow: {
                forceCheck: true
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age
Alice,25
Bob,30`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        
        // Select file
        sdk.handleFileSelect(file);
        
        // Check if start button is disabled
        const startBtn = document.getElementById('import-sdk-start-btn');
        const isInitiallyDisabled = startBtn.disabled;
        
        if (isInitiallyDisabled) {
            console.log("✅ PASS: Start button initially disabled with forceCheck\n");
        } else {
            console.log("❌ FAIL: Start button should be disabled before check\n");
            allPassed = false;
        }
    }
    
    // Test 2: preventStartOnErrors - Start stays disabled after check with errors
    console.log("Test 2: flow.preventStartOnErrors - Start disabled on errors");
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
            flow: {
                forceCheck: true,
                preventStartOnErrors: true
            },
            validate: (row) => {
                // Fail all rows
                return { isValid: false, error: 'Test error' };
            }
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age
Alice,25
Bob,30`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        // Run check (which will find errors)
        await new Promise((resolve) => {
            sdk.config.onComplete = resolve;
            sdk.startImport('check');
        });
        
        const startBtn = document.getElementById('import-sdk-start-btn');
        
        if (startBtn.disabled && sdk.state.errorCount > 0) {
            console.log("✅ PASS: Start button stays disabled when errors exist\n");
        } else {
            console.log("❌ FAIL: Start button should stay disabled with errors\n");
            console.log(`Button disabled: ${startBtn.disabled}, Error count: ${sdk.state.errorCount}`);
            allPassed = false;
        }
    }
    
    // Test 3: No flow control - Start should be enabled after file select
    console.log("Test 3: No flow control - Start enabled after file select");
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
            // No flow control
        });
        
        sdk.log = () => {}; // Silence logs
        
        const csvContent = `name,age
Alice,25`;
        
        const file = new window.File([csvContent], "test.csv", { type: "text/csv" });
        sdk.handleFileSelect(file);
        
        // Wait a bit for file reader
        await new Promise(r => setTimeout(r, 100));
        
        const startBtn = document.getElementById('import-sdk-start-btn');
        
        if (!startBtn.disabled) {
            console.log("✅ PASS: Start button enabled without flow control\n");
        } else {
            console.log("❌ FAIL: Start button should be enabled without flow control\n");
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
