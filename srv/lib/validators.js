/** true if `end` is strictly later than `start` (ISO strings or Date objects) */
export const isAfter = (end, start) => new Date(end).getTime() > new Date(start).getTime()

/** Expected IMO check digit, or null if the value is not 7 digits */
export const imoCheckDigit = imo => {
  if (!/^[0-9]{7}$/.test(imo ?? '')) return null
  const sum = [...imo.slice(0, 6)].reduce((s, d, i) => s + Number(d) * (7 - i), 0)
  return sum % 10
}
export const isValidImo = imo => imoCheckDigit(imo) === Number(imo?.[6])

// ISO 6346 letter values: A=10, B=12 … Z=38 (multiples of 11 are skipped)
const LETTER_VALUES = {}
let value = 10
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  if (value % 11 === 0) value++
  LETTER_VALUES[ch] = value++
}

/** Expected container check digit, or null if the value is not 4 letters + 7 digits */
export const containerCheckDigit = number => {
  if (!/^[A-Z]{4}[0-9]{7}$/.test(number ?? '')) return null
  const sum = [...number.slice(0, 10)]
    .reduce((s, ch, i) => s + (LETTER_VALUES[ch] ?? Number(ch)) * 2 ** i, 0)
  return sum % 11 % 10
}
export const isValidContainerNumber = number => containerCheckDigit(number) === Number(number?.[10])