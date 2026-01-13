// src/utils/exports/exportStoricoPaghePDF.js
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML,
  getTotalsBox
} from './exportHelpers';

/**
 * Esporta PDF con storico paghe raggruppato per lavoratore
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.pagheFiltrate - Array di paghe filtrate
 * @param {Array} params.lavoratori - Array di lavoratori
 * @param {Array} params.cantieri - Array di cantieri
 * @param {Array} params.mesiNomi - Array con nomi dei mesi
 * @param {Array} params.tipologie - Array con tipologie paghe
 * @param {Function} params.calcolaBonificato - Funzione per calcolare bonifico
 * @param {Function} params.calcolaResiduo - Funzione per calcolare residuo
 * @param {string} params.filtroLavoratore - ID lavoratore filtrato (opzionale)
 */
export const exportStoricoPaghePDF = (params) => {
  const {
    pagheFiltrate,
    lavoratori,
    cantieri,
    mesiNomi,
    tipologie,
    calcolaBonificato,
    calcolaResiduo,
    filtroLavoratore
  } = params;

  if (pagheFiltrate.length === 0) {
    alert('⚠️ Nessuna paga da esportare');
    return;
  }

  // ========================================
  // CSS CUSTOM PER STORICO PAGHE
  // ========================================
  const customStyles = `
    .lavoratore-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .lavoratore-header {
      color: #2563eb;
      font-size: 16px;
      margin-top: 25px;
      margin-bottom: 10px;
      background: #eff6ff !important;
      padding: 10px;
      border-left: 4px solid #3b82f6;
      page-break-after: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .lavoratore-info {
      font-size: 11px;
      color: #374151;
      margin-bottom: 15px;
    }
    
    table.paghe-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    table.paghe-table th,
    table.paghe-table td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
      font-size: 11px;
    }
    
    table.paghe-table th {
      background-color: #3b82f6 !important;
      color: white !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.paghe-table tr:nth-child(even) {
      background-color: #f3f4f6 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .text-right {
      text-align: right;
    }
    
    .lavoratore-totale {
      background-color: #dbeafe !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    
    .summary-box {
      background: white !important;
      padding: 15px;
      border-radius: 8px;
      border: 2px solid;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .summary-box.totale {
      border-color: #3b82f6;
    }
    
    .summary-box.bonificato {
      border-color: #10b981;
    }
    
    .summary-box.residuo {
      border-color: #f59e0b;
    }
    
    .summary-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .summary-value {
      font-size: 20px;
      font-weight: bold;
    }
    
    .summary-value.totale { color: #1e3a8a; }
    .summary-value.bonificato { color: #047857; }
    .summary-value.residuo { color: #b45309; }
    
    .color-green { color: #059669; }
    .color-orange { color: #d97706; }
  `;

  // ========================================
  // RAGGRUPPA PER LAVORATORE
  // ========================================
  const paghePerLavoratore = {};
  pagheFiltrate.forEach(paga => {
    if (!paghePerLavoratore[paga.lavoratore_id]) {
      paghePerLavoratore[paga.lavoratore_id] = [];
    }
    paghePerLavoratore[paga.lavoratore_id].push(paga);
  });

  // Ordina le paghe di ogni lavoratore per data (anno e mese)
  Object.keys(paghePerLavoratore).forEach(lavoratoreId => {
    paghePerLavoratore[lavoratoreId].sort((a, b) => {
      if (a.anno !== b.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  });

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  const totaleImporti = pagheFiltrate.reduce((sum, p) => sum + parseFloat(p.importo || 0), 0);
  const totaleBonificato = pagheFiltrate.reduce((sum, p) => sum + calcolaBonificato(p), 0);
  const totaleResiduo = totaleImporti - totaleBonificato;

  // ========================================
  // TITOLO
  // ========================================
  const lavoratoreFiltrato = filtroLavoratore 
    ? lavoratori.find(l => l.id === filtroLavoratore)
    : null;
  
  const titolo = lavoratoreFiltrato
    ? `Storico Paghe - ${lavoratoreFiltrato.nome} ${lavoratoreFiltrato.cognome}`
    : 'Storico Paghe - Tutti i Lavoratori';

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div style="background: #eff6ff !important; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #3b82f6;">
      <div class="summary-grid">
        <div class="summary-box totale">
          <div class="summary-label">Totale Importi</div>
          <div class="summary-value totale">${formatCurrency(totaleImporti)}</div>
        </div>
        <div class="summary-box bonificato">
          <div class="summary-label">Totale Bonificato</div>
          <div class="summary-value bonificato">${formatCurrency(totaleBonificato)}</div>
        </div>
        <div class="summary-box residuo">
          <div class="summary-label">Residuo Totale</div>
          <div class="summary-value residuo">${formatCurrency(totaleResiduo)}</div>
        </div>
      </div>
    </div>
    <p><strong>Numero Record:</strong> ${pagheFiltrate.length}</p>
  `;

  // ========================================
  // GENERA SEZIONI PER LAVORATORE
  // ========================================
  const generateSezioniLavoratori = () => {
    let html = '';

    Object.entries(paghePerLavoratore).forEach(([lavoratoreId, paghe]) => {
      const lavoratore = lavoratori.find(l => l.id === lavoratoreId);
      const nomeLavoratore = lavoratore 
        ? `${lavoratore.nome} ${lavoratore.cognome}` 
        : 'Lavoratore Sconosciuto';
      
      // Calcola totali per questo lavoratore
      const totLavoratore = paghe.reduce((sum, p) => sum + parseFloat(p.importo || 0), 0);
      const bonLavoratore = paghe.reduce((sum, p) => sum + calcolaBonificato(p), 0);
      const resLavoratore = totLavoratore - bonLavoratore;

      html += `
        <div class="lavoratore-section">
          <h2 class="lavoratore-header">👤 ${nomeLavoratore}</h2>
          <p class="lavoratore-info"><strong>Numero Paghe:</strong> ${paghe.length}</p>
          
          <table class="paghe-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Tipologia</th>
                <th>Cantiere</th>
                <th class="text-right">Importo</th>
                <th class="text-right">Bonificato</th>
                <th class="text-right">Residuo</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Righe paghe
      paghe.forEach(paga => {
        const cantiere = cantieri.find(c => c.id === paga.cantiere_id);
        const tipologia = tipologie.find(t => t.value === paga.tipologia);
        const bonificato = calcolaBonificato(paga);
        const residuo = calcolaResiduo(paga);

        html += `
          <tr>
            <td>${mesiNomi[paga.mese - 1]} ${paga.anno}</td>
            <td>${tipologia?.label || paga.tipologia}</td>
            <td>${cantiere?.nome || '-'}</td>
            <td class="text-right">${formatCurrency(paga.importo)}</td>
            <td class="text-right color-green">${formatCurrency(bonificato)}</td>
            <td class="text-right color-orange" style="font-weight: bold;">${formatCurrency(residuo)}</td>
            <td>${paga.note || '-'}</td>
          </tr>
        `;
      });

      // Riga totale lavoratore
      html += `
              <tr class="lavoratore-totale">
                <td colspan="3" style="text-align: right; padding-right: 10px;">
                  TOTALE ${nomeLavoratore.toUpperCase()}:
                </td>
                <td class="text-right">${formatCurrency(totLavoratore)}</td>
                <td class="text-right color-green">${formatCurrency(bonLavoratore)}</td>
                <td class="text-right color-orange">${formatCurrency(resLavoratore)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    riepilogoGenerale +
    generateSezioniLavoratori();

  const htmlDocument = generateCompleteHTML({
    title: titolo,
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, titolo.replace(/ /g, '_'));
};