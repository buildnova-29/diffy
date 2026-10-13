# diffy test files

`diffy_test_file_1.xlsx` and `diffy_test_file_2.xlsx` are a matched pair for testing diffy.
Every difference between them was planted on purpose. The numbers below are what diffy should report.
`src/core/__tests__/regression.test.ts` checks these numbers automatically on every `npm test`.

Most sheets have about 100 rows × 20 columns.

| # | Sheet (File 1 → File 2) | What it tests | Key | Changed rows | Changed cells | Added | Removed |
|---|---|---|---|---|---|---|---|
| 1 | Orders | **Row compare.** No column is unique, so rows are compared by position. The last 3 rows were removed and 5 new rows appended. | none, row by row | 12 | – | 2 | 0 |
| 2 | Employees | **Single key.** File 2 rows are shuffled; order must not matter. | Employee ID | 8 | 9 | 6 | 5 |
| 3 | Inventory | **Two-column key.** SKU repeats across warehouses, so neither column is unique on its own. | Warehouse + SKU | 7 | 13 | 2 | 3 |
| 4 | Products | **Data types.** Covers numbers, text, dates, date+time, true/false, tiny decimals. Rows P0001–P0005 only *look* different (upper case, extra spaces, blank vs spaces, number vs number-as-text) and must **not** count as changed. | Product code | 10 | 10 | 0 | 0 |
| 5 | Customers | **Column changes.** In File 2, columns are reordered, "Fax" is removed, "Segment" is renamed to "Customer segment", and "Account manager" is added. | Customer ID | 4 | 4 | 0 | 0 |
| 6 | Tickets | **Messy layout.** Two title rows sit above the header (header on row 3), there are two blank rows inside the data, and one duplicate key (T-7050). | Ticket ID | 4 | 4 | 1 | 1 |
| 7 | Holidays | **Identical.** Nothing differs. | Code | 0 | 0 | 0 | 0 |
| 8 | Discounts → Discounts_Apr | **Similar sheet names.** diffy should auto-pair them and say "Please check". | Discount code | 5 | 5 | 3 | 2 |
| 9 | Archive_2024 | **Only in File 1.** Not compared; listed in the report. | | | | | |
| 10 | Q2_Forecast | **Only in File 2.** Not compared; listed in the report. | | | | | |

**Not covered automatically yet:**
- Sheet 1 needs the row-by-row fallback.
- Sheet 6 needs header-row detection.
- Sheet 8 needs similar-name pairing.

The regression test currently tells the engine the header row and sheet pairs. It should work these out by itself once those features are built (step 4 of the plan).
