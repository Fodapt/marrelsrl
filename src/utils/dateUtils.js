export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

export const isFestivita = (date) => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  
  const festivitaFisse = [
    { m: 1, d: 1 }, { m: 1, d: 6 }, { m: 4, d: 25 }, { m: 5, d: 1 },
    { m: 6, d: 2 }, { m: 8, d: 15 }, { m: 11, d: 1 }, { m: 12, d: 8 },
    { m: 12, d: 25 }, { m: 12, d: 26 }
  ];
  
  if (festivitaFisse.some(f => f.m === month && f.d === day)) {
    return true;
  }
  
  // Calcolo Pasqua
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthPasqua = Math.floor((h + l - 7 * m + 114) / 31);
  const dayPasqua = ((h + l - 7 * m + 114) % 31) + 1;
  
  if (month === monthPasqua && day === dayPasqua) return true;
  
  const pasqua = new Date(year, monthPasqua - 1, dayPasqua);
  const pasquetta = new Date(pasqua);
  pasquetta.setDate(pasqua.getDate() + 1);
  if (month === pasquetta.getMonth() + 1 && day === pasquetta.getDate()) return true;
  
  return false;
};