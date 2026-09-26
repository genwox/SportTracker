export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'back'

const MAX_INTEGER_DIGITS = 4

/**
 * Text typed on the V6 keypad. `fresh` means the field has just been focused: the first digit
 * replaces its value (like the iOS keypad), while ⌫ or « , » edits it.
 */
export function pressKey(text: string, key: KeypadKey, decimals: number, fresh = false): string {
  if (key === 'back') return fresh ? '' : text.slice(0, -1)
  if (key === ',') {
    if (!decimals) return text
    if (fresh) return '0,'
    return text.includes(',') ? text : `${text || '0'},`
  }
  const base = fresh ? '' : text
  const [integer, fraction] = base.split(',')
  if (fraction !== undefined) return fraction.length < decimals ? `${base}${key}` : base
  if (integer === '0') return key
  return integer.length < MAX_INTEGER_DIGITS ? `${integer}${key}` : base
}

/** Number shown by the keypad, French decimal comma included. Empty or « 12, » still read as a number. */
export function keypadNumber(text: string): number {
  const value = Number(text.replace(',', '.').replace(/\.$/, ''))
  return Number.isFinite(value) ? value : 0
}

export function keypadText(value: number, decimals: number): string {
  const rounded = decimals ? Math.round(value * 10 ** decimals) / 10 ** decimals : Math.round(value)
  return String(rounded).replace('.', ',')
}
