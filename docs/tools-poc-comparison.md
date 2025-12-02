# Tools POC Comparison: ref-poc vs. ImportSDK

This document compares the features of the `ref-poc` (a collection of proof-of-concept code snippets) with the `ImportSDK` and identifies potential features from `ref-poc` that could be repatriated into `ImportSDK`.

## Feature Comparison

| Feature Area | `ref-poc` (Snippets) | `ImportSDK` (`frontend/import-sdk.js`) |
| :--- | :--- | :--- |
| **Configuration** | Advanced config import/export with overwrite/delete options. | Simple configuration via constructor. |
| **Data Schema** | Handles complex schemas like OpenAPI, with `$ref` and circular reference resolution. Fetches schemas from external services. | No explicit schema handling. Validation seems to be based on code. |
| **Import Lifecycle** | Manages a "load" as a long-running process with a full lifecycle (create, update, delete, cleanup) via a dedicated service. | Manages an "import" process, but the lifecycle management is less explicit and complete than in `ref-poc`. No explicit cleanup or reset. |
| **Metrics** | Includes functions for creating metric visualizations. | Collects metrics, but no built-in visualization. |
| **Plugins/Actions**| Suggests a pattern for defining and validating actions/plugins. | No explicit plugin architecture. |
| **Data Filtering** | Simple query engine for filtering data. | No built-in data filtering capabilities before import. |

## Proposed Features for ImportSDK

Based on the comparison, the following features from `ref-poc` are proposed for repatriation into `ImportSDK`:

### 1. Advanced Configuration Management

**Current State:** `ImportSDK` is configured through a simple object passed to its constructor.

**Proposed Feature:** Implement a more flexible configuration system that allows:

*   Loading configuration from a remote URL.
*   Importing settings from a file or a JSON object.
*   Options to merge, overwrite, or delete existing settings.

This would make `ImportSDK` easier to configure and manage in different environments.

### 2. Schema-Driven Imports

**Current State:** `ImportSDK` does not have an explicit concept of a data schema. Validation is done programmatically.

**Proposed Feature:** Add support for data schemas (e.g., JSON Schema, OpenAPI/AsyncAPI). The SDK could:

*   Accept a schema as a parameter.
*   Fetch a schema from a URL.
*   Use the schema for:
    *   **Validation:** Automatically validate data against the schema.
    *   **Data Mapping:** Guide the mapping of input data to the target format.
    *   **UI Generation:** Potentially auto-generate a UI for mapping columns based on the schema.

This would greatly improve the robustness and flexibility of the import process.

### 3. Full Import Lifecycle Management

**Current State:** `ImportSDK` manages an import process, but the lifecycle management is not fully fleshed out.

**Proposed Feature:** Introduce a more explicit `Import` object with a well-defined lifecycle, inspired by the `LoadService` in `ref-poc`. This would include methods for:

*   **Pausing and Resuming:** `import.pause()`, `import.resume()`
*   **Canceling:** `import.cancel()`
*   **Resetting and Cleaning up:** `import.reset()` to clear the state and data of an import, and `import.cleanup()` to remove any associated resources.

This would give developers more control over the import process.

### 4. Built-in Metrics Visualization

**Current State:** `ImportSDK` collects metrics, but it's up to the developer to visualize them.

**Proposed Feature:** Provide basic UI components for visualizing import metrics. This could include:

*   A chart showing successful vs. failed rows.
*   A summary of errors.
*   A timeline of the import process.

This would provide immediate feedback to the user and reduce the amount of boilerplate code developers need to write.

### 5. Plugin Architecture

**Current State:** `ImportSDK` is monolithic.

**Proposed Feature:** Introduce a plugin system that allows developers to extend the SDK's functionality. This would enable the community to create and share plugins for:

*   **Custom Data Sources:** e.g., importing from Google Sheets, a specific CRM, etc.
*   **Custom Validation Rules:** e.g., for specific data formats or business logic.
*   **Data Transformation:** e.g., for cleaning, normalizing, or enriching data during the import process.

### 6. Pre-import Data Filtering

**Current State:** `ImportSDK` does not provide a way to filter data before importing it.

**Proposed Feature:** Add a pre-import filtering step that allows developers to specify which data to import using a simple query language or a filter function. This would be useful for importing only a subset of a larger dataset.
