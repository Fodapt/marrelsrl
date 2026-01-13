// src/utils/exports/exportSituazioneFornitori.js
import { 
  formatDate, 
  formatCurrency, 
  openPrintWindow, 
  generateCompleteHTML,
  getTotalsBox 
} from './exportHelpers';

/**
 * Esporta la situazione fornitori in formato HTML/PDF
 * @param {Object} params - Parametri di configurazione
 * @param {Array} params.ordiniFornitori - Array di tutti gli ordini
 * @param {Array} params.fornitori - Array di fornitori
 * @param {Array} params.cantieri - Array di cantieri
 * @param {string|null} params.filtroFornitore - ID fornitore filtrato (opzionale)
 * @param {string} params.tipo - 'situazione' o 'da_saldare'
 * @param {Function} params.calcolaStatoOrdine - Funzione per calcolare stato ordine
 * @param {Function} params.calcolaAccontiFatturaDiretta - Funzione per calcolare acconti fattura diretta
 */
export const exportSituazioneFornitori = ({
  ordiniFornitori,
  fornitori,
  cantieri,
  filtroFornitore = null,
  tipo = 'situazione',
  calcolaStatoOrdine,
  calcolaAccontiFatturaDiretta
}) => {
  // Filtra ordini se necessario
  const ordini = filtroFornitore 
    ? ordiniFornitori.filter(o => o.fornitore_id === filtroFornitore)
    : ordiniFornitori;

  let ordiniFiltrati = [];
  
  // Filtra per tipo export
  if (tipo === 'da_saldare') {
    ordiniFiltrati = ordini.filter(ord => {
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        return accInfo.residuo > 0;
      } else {
        const stato = calcolaStatoOrdine(ord);
        return stato.saldoDaPagare > 0;
      }
    });
  } else {
    ordiniFiltrati = ordini;
  }

  if (ordiniFiltrati.length === 0) {
    alert('✅ Nessun dato da esportare!');
    return;
  }

  // Raggruppa per fornitore
  const ordiniPerFornitore = {};
  ordiniFiltrati.forEach(ord => {
    const fornitoreId = ord.fornitore_id;
    if (!ordiniPerFornitore[fornitoreId]) {
      ordiniPerFornitore[fornitoreId] = [];
    }
    ordiniPerFornitore[fornitoreId].push(ord);
  });
  
  // Ordina fornitori alfabeticamente
  const fornitoriOrdinati = Object.keys(ordiniPerFornitore).sort((a, b) => {
    const nomeA = fornitori.find(f => f.id === a)?.ragione_sociale || '';
    const nomeB = fornitori.find(f => f.id === b)?.ragione_sociale || '';
    return nomeA.localeCompare(nomeB, 'it');
  });
  
  // Calcola totali generali
  let importoTotaleOrdini = 0;
  let importoTotalePagato = 0;
  let importoTotaleDaSaldare = 0;

  ordiniFiltrati.forEach(ord => {
    importoTotaleOrdini += parseFloat(ord.importo || 0);
    
    if (ord.tipo === 'fattura_diretta') {
      const accInfo = calcolaAccontiFatturaDiretta(ord);
      importoTotalePagato += accInfo.pagato;
      importoTotaleDaSaldare += accInfo.residuo;
    } else {
      const stato = calcolaStatoOrdine(ord);
      importoTotalePagato += stato.effettivamentePagato;
      importoTotaleDaSaldare += stato.saldoDaPagare;
    }
  });

  // Configura titolo e colori in base al tipo
  const titolo = tipo === 'da_saldare' ? '⚠️ Fatture da Saldare' : '📊 Situazione Fornitori - Raggruppate per Fornitore';
  const coloreTitolo = tipo === 'da_saldare' ? '#dc2626' : '#3b82f6';

  // Genera box riepilogo generale
  const riepilogoGenerale = getTotalsBox(
    '📊 RIEPILOGO GENERALE',
    [
      { label: 'Totale Fornitori', value: fornitoriOrdinati.length },
      { label: 'Totale Ordini', value: ordiniFiltrati.length },
      { label: 'Importo Totale', value: formatCurrency(importoTotaleOrdini) },
      { label: 'Già Pagato', value: formatCurrency(importoTotalePagato) },
      { 
        label: tipo === 'da_saldare' ? '⚠️ RESIDUO DA SALDARE' : 'Residuo da Pagare', 
        value: formatCurrency(importoTotaleDaSaldare),
        highlight: true
      }
    ],
    coloreTitolo
  );

  // Genera tabelle per ogni fornitore
  let fornitoriHTML = '';
  
  fornitoriOrdinati.forEach(fornitoreId => {
    const ordiniFornitore = ordiniPerFornitore[fornitoreId];
    const fornitore = fornitori.find(f => f.id === fornitoreId);
    
    // Calcola totali fornitore
    let totaleFornitore = 0;
    let pagatoFornitore = 0;
    let residuoFornitore = 0;
    
    ordiniFornitore.forEach(ord => {
      totaleFornitore += parseFloat(ord.importo || 0);
      
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        pagatoFornitore += accInfo.pagato;
        residuoFornitore += accInfo.residuo;
      } else {
        const stato = calcolaStatoOrdine(ord);
        pagatoFornitore += stato.effettivamentePagato;
        residuoFornitore += stato.saldoDaPagare;
      }
    });
    
    // Genera righe tabella
    const righeTabella = ordiniFornitore.map(ord => {
      const cantiere = cantieri.find(c => c.id === ord.cantiere_id);
      
      let giaPagato = 0;
      let residuo = 0;

      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        giaPagato = accInfo.pagato;
        residuo = accInfo.residuo;
      } else {
        const stato = calcolaStatoOrdine(ord);
        giaPagato = stato.effettivamentePagato;
        residuo = stato.saldoDaPagare;
      }

      return `
        <tr>
          <td>${ord.tipo === 'fattura_diretta' ? ord.numero_ordine.replace('DIRETTO-', 'FATTURA-') : ord.numero_ordine}</td>
          <td>${formatDate(ord.data_ordine)}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td>${formatCurrency(ord.importo)}</td>
          <td>${formatCurrency(giaPagato)}</td>
          <td style="font-weight: bold; color: ${coloreTitolo};">${formatCurrency(residuo)}</td>
        </tr>
      `;
    }).join('');
    
    fornitoriHTML += `
      <h2>🏪 ${fornitore?.ragione_sociale || 'N/A'}</h2>
      
      <div class="summary-box">
        <p style="margin: 5px 0;">
          <strong>Ordini:</strong> ${ordiniFornitore.length} | 
          <strong>Totale:</strong> ${formatCurrency(totaleFornitore)} | 
          <strong>Pagato:</strong> ${formatCurrency(pagatoFornitore)} | 
          <strong style="color: ${coloreTitolo};">Residuo: ${formatCurrency(residuoFornitore)}</strong>
        </p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Num. Ordine</th>
            <th>Data</th>
            <th>Cantiere</th>
            <th>Importo</th>
            <th>Pagato</th>
            <th style="background-color: ${coloreTitolo} !important;">Residuo</th>
          </tr>
        </thead>
        <tbody>
          ${righeTabella}
        </tbody>
      </table>
    `;
  });

  // Genera HTML completo
  const htmlContent = generateCompleteHTML({
    title: titolo,
    customColor: coloreTitolo,
    content: `
      ${riepilogoGenerale}
      ${fornitoriHTML}
    `
  });

  // Apri finestra di preview
  openPrintWindow(
    htmlContent, 
    tipo === 'da_saldare' ? 'Fatture da Saldare' : 'Situazione Fornitori'
  );
};