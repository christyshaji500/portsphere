namespace portsphere;

/** One counter per document type and year, e.g. VC/2026 → 4 */
entity NumberRanges {
  key object     : String(10);   // VC, DO, GP, DOC, INV
  key year       : Integer;
      prefix     : String(5) @mandatory;
      lastNumber : Integer default 0;
}