export const isLavoratoreAttivo = (lavoratoreId, unilav) => {
  const univlavLav = unilav.filter(u => u.lavoratoreId === lavoratoreId);
  if (univlavLav.length === 0) return false;
  
  const ordinati = univlavLav.sort((a, b) => {
    const dateA = new Date(a.dataInizio || '1900-01-01');
    const dateB = new Date(b.dataInizio || '1900-01-01');
    return dateB - dateA;
  });
  
  const ultimoUnilav = ordinati[0];
  
  if (ultimoUnilav.tipoUnilav === 'dimissioni') {
    const oggi = new Date();
    const dataDimissioni = new Date(ultimoUnilav.dataInizio);
    return dataDimissioni > oggi;
  }
  
  return true;
};