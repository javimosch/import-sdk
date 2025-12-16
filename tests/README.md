# ImportSDK Tests

This directory contains server-side unit tests for the ImportSDK using JSDOM to simulate browser environment.

## Setup

Dependencies are already installed in this directory:
- `jsdom` - For DOM simulation
- `papaparse` - For CSV parsing

## Running Tests

### Run All Tests

```bash
# From project root
./run-all-tests.sh
```

### Run Individual Tests

```bash
# Validation tests
node tests/validate-test.js

# Column validation
node tests/column-validation-test.js

# Transformers and mapping
node tests/transform-test.js

# Row filters
node tests/filter-test.js

# Flow control
node tests/flow-control-test.js
```

## Test Suites

### 1. validate-test.js
Tests custom validation logic including:
- Cross-field validation (e.g., "Either Make ID or Type Label is required")
- Format validation (e.g., "Chip Number must be exactly 24 characters")
- Error counting and reporting

### 2. column-validation-test.js
Tests column-level validation:
- `requiredColumns` - Ensures missing required column headers trigger errors
- `allowedColumns` - Ensures unknown columns are rejected
- Combined required and allowed column validation

### 3. transform-test.js
Tests data transformation features:
- Custom field transformers (e.g., uppercase, parseInt)
- Field mapping (renaming columns)
- Combined mapping and transformation

### 4. filter-test.js
Tests row filtering capabilities:
- Simple value filters (e.g., age >= 21)
- Multiple filters with AND logic
- Regex-based filters

### 5. flow-control-test.js
Tests UI flow control:
- `flow.forceCheck` - Ensures start button is disabled until check runs
- `flow.preventStartOnErrors` - Ensures start button stays disabled when errors exist
- Default behavior without flow control

## Test Results

All tests use the following status indicators:
- ✅ PASS - Test passed successfully
- ❌ FAIL - Test failed with details

The test runner (`run-all-tests.sh`) provides a summary showing total passed/failed tests.

