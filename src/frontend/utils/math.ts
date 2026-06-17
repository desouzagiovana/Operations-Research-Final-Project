/**
 * Parses a string or number into a valid float.
 * Supports:
 * - Decimals: "0.4", "2.7", "-1.5"
 * - Comma decimals: "0,4", "-2,7"
 * - Fractions: "1/2", "-3/4", "1.5/3"
 * - Whitespaces and signs
 * Returns NaN if the expression cannot be parsed.
 */
export const parseNumericValue = (val: number | string | undefined | null): number => {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') {
    return isNaN(val) ? NaN : val;
  }
  
  let str = val.trim().replace(',', '.');
  if (str === '') return NaN;
  
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length !== 2) return NaN;
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (isNaN(num) || isNaN(den) || den === 0) return NaN;
    return num / den;
  }
  
  return parseFloat(str);
};

/**
 * Validates if the given string/number resolves to a valid finite number.
 */
export const isValidNumeric = (val: number | string | undefined | null): boolean => {
  const parsed = parseNumericValue(val);
  return !isNaN(parsed) && Number.isFinite(parsed);
};
