# Generic send/handle patterns for ImportSDK

This document proposes **generic** behaviour for `defaultSendHandler` and `handleBatchResult` so that:

- `import-sdk.js` remains backend‑agnostic.
- Project‑specific logic (e.g. `bin`, `tankNumber`, `errorMessage`) lives in small override files such as `import-sdk-contenant.js`.

## 1. Generic `defaultSendHandler`

### 1.1. Responsibilities

The default implementation should:

- **Build a request payload** from the current batch.
- **Perform a fetch call** to `config.apiEndpoint` with merged headers/options.
- **Normalise the response** into a simple structure:
  - `success: number` – count of successfully processed rows in this batch.
  - `errors: Array<{
      message: string,
      data?: any
    }>` – one entry per failed row.

Nothing in this logic should assume:

- specific payload keys (`bins`, `items`, …),
- specific field names on a row (`tankNumber`, `id`, …),
- specific response shape (`data.bins`, `errorMessage`, …).

### 1.2. Suggested generic shape

The generic code should be driven by **configurable mapping**, e.g. fields on `config.sendMapping` or similar (exact naming TBD when we refactor):

- `config.sendMapping.payloadKey: string` – name of the array field in the request payload that holds the batch (e.g. `"records"`).
- `config.sendMapping.responseArrayPath: string` – dot‑path to the array in the response (e.g. `"records"`, `"data.records"`).
- `config.sendMapping.isError: (item: any) => boolean` – function to detect whether an element of the response array represents an error.
- `config.sendMapping.errorMessage: (item: any) => string` – function to extract a human‑readable error message.
- `config.sendMapping.errorData?: (item: any, batchRow: any) => any` – (optional) function to build the `data` payload per error (e.g. merging server error and original row, including `_csvLineNumber`).

**Algorithm (generic):**

1. Build payload as:
   - `payload[payloadKey] = batch`
   - plus any other project‑agnostic flags from config (e.g. `updateMode`, etc. – *kept generic*).
2. Execute fetch with merged headers/options.
3. Resolve the response JSON and navigate to the configured `responseArrayPath` to obtain an array `items`.
4. For each `items[index]`:
   - If `isError(item)` is `true`:
     - Build `errors.push({ message, data })` using `errorMessage` + `errorData` and the original `batch[index]`.
   - Else, increment `success`.
5. If the HTTP status indicates a global error (non‑2xx/422, or missing `items`), build a fallback `errors` array using a generic message.

This keeps the **shape** fixed and delegates all backend‑specific assumptions to configuration or overrides.

## 2. Generic `handleBatchResult`

### 2.1. Responsibilities

The generic `handleBatchResult` should:

- Update `state.successCount`, `state.errorCount`, `state.totalCount`.
- Optionally keep `successRows` / `errorRows` according to `config.resultExport`.
- Emit generic log messages.
- Notify `onError` / `onProgress` callbacks.

It should **not**:

- Assume specific properties like `bin`, `tankNumber`, `errorMessage`.
- Do any backend‑specific projection of `err.data`.

### 2.2. Suggested generic shape

Input (from send handler):

```ts
{
  success: number,
  errors: Array<{
    message: string,
    data?: any
  }>
}
```

Behaviour:

- **Counters**:
  - `successCount += result.success`
  - `errorCount += result.errors.length`
  - `totalCount += result.success + result.errors.length`

- **Success rows (optional)**:
  - If `resultExport` includes `'success'`, push the first `success` rows of the **original batch** into `state.successRows`.
  - Keep any metadata already on the row (e.g. `_csvLineNumber`).

- **Error rows (optional)**:
  - If `resultExport` includes `'errors'`, build `errorRow` as:

    ```js
    const errorRow = {
      ...(err.data || {}),
      _error: err.message,
      _errorType: 'server-validation'
    };
    ```

  - If `err.data` contains `_csvLineNumber`, copy it through so exports and logs show the CSV line.

- **Logging**:
  - Generic log message format:

    ```js
    const suffix = errorRow._csvLineNumber != null
      ? ` [Line ${errorRow._csvLineNumber}]`
      : '';
    this.log(`Error: ${err.message}${suffix}`, 'error');
    ```

- **Metrics & callbacks**: keep current generic behaviour (`sendErrorSample`, `onError`, `onProgress`, `updateStats`).

## 3. Project‑specific overrides

For a concrete backend (e.g. *contenants* using `bins`, `tankNumber`, `errorMessage`):

- Provide a small JS file, e.g. `import-sdk-contenant.js`, loaded **after** `import-sdk.js`.
- In that file, override:
  - `ImportSDK.prototype.defaultSendHandler` – to build container‑specific payloads and parse `data.bins`.
  - `ImportSDK.prototype.handleBatchResult` – to project `err.data.bin` into flat rows, keep `_csvLineNumber`, and log `tankNumber`, etc.

This gives:

- A stable, generic `import-sdk.js` suitable for any project.
- Thin, explicit override layers per domain (contenants, users, orders, etc.).
