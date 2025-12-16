# ImportSDK Tests

This directory contains server-side unit tests for the ImportSDK using JSDOM to simulate browser environment.

## Setup

Dependencies are already installed in this directory:
- `jsdom` - For DOM simulation
- `papaparse` - For CSV parsing

## Running Tests

### Validation Test

Tests the SDK's validation logic including:
- Cross-field validation (e.g., "Either Make ID or Type Label is required")
- Format validation (e.g., "Chip Number must be exactly 24 characters")
- Required columns validation

```bash
node validate-test.js
```

Expected output:
```
SDK Loaded: true
Starting Validation Test...
...
SUCCESS: Correct number of errors caught.
SUCCESS: Caught Chip Number length error.
SUCCESS: Caught Cross-field validation error.
FINAL VERDICT: TEST PASSED ✅
```

## Test Coverage

### validate-test.js

Simulates a CSV import with the following test data:

| Row | makeId | typeLabel | volume | chipNumber | Expected Result |
|-----|--------|-----------|--------|------------|-----------------|
| 1   | (empty) | TypeA     | 1000   | ABC123456789012345678901 | ✅ Valid |
| 2   | (empty) | TypeB     | 2000   | SHORT_ID   | ❌ Invalid (chip length) |
| 3   | (empty) | (empty)   | 3000   | DEF123456789012345678901 | ❌ Invalid (missing both) |

The test verifies:
1. Total row count is correct
2. Error count is 2
3. Chip Number length validation error is caught
4. Cross-field validation error is caught
