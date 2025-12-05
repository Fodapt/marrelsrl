export const validateIBAN = (iban) => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleanIban.length < 15 || cleanIban.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) return false;
  
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
  
  const numericIban = rearranged.split('').map(char => {
    const code = char.charCodeAt(0);
    return code >= 65 && code <= 90 ? code - 55 : char;
  }).join('');
  
  let remainder = numericIban;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
  }
  
  return parseInt(remainder, 10) % 97 === 1;
};