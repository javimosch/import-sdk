#!/bin/bash

# Run all ImportSDK tests

echo "======================================"
echo "  ImportSDK Test Suite Runner"
echo "======================================"
echo ""

FAILED=0
PASSED=0

run_test() {
    TEST_NAME=$1
    TEST_FILE=$2
    
    echo "Running: $TEST_NAME"
    echo "--------------------------------------"
    
    if node "$TEST_FILE"; then
        PASSED=$((PASSED + 1))
        echo ""
    else
        FAILED=$((FAILED + 1))
        echo ""
        echo "⚠️  Test failed: $TEST_NAME"
        echo ""
    fi
}

# Run all tests
run_test "Validation Tests" "tests/validate-test.js"
run_test "Column Validation Tests" "tests/column-validation-test.js"
run_test "Transform Tests" "tests/transform-test.js"
run_test "Filter Tests" "tests/filter-test.js"
run_test "Flow Control Tests" "tests/flow-control-test.js"

echo "======================================"
echo "  Test Summary"
echo "======================================"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
