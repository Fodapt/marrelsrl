// src/utils/exports/exportPrimaNotaPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con prima nota (solo movimenti pagati)
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.movimentiMese - Array movimenti pagati del mese
 * @param {Array} params.fornitori - Array fornitori
 * @param {Array} params.clienti - Array clienti
 * @param {Array} params.cantieri - Array cantieri
 * @param {Array} params.tipologieMovimento - Array tipologie movimento
 * @param {string} params.mese - Nome del mese
 * @param {number} params.anno - Anno
 * @param {number} params.saldoIniziale - Saldo iniziale
 */
export const exportPrimaNotaPDF = (params) => {
  const {
    movimentiMese,
    fornitori,
    clienti,
    cantieri,
    tipologieMovimento,
    mese,
    anno,
    saldoIniziale
  } = params;

  // ========================================
  // CSS CUSTOM PER PRIMA NOTA
  // ========================================
  const customStyles = `
    table.prima-nota-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 11px;
    }
    
    table.prima-nota-table th,
    table.prima-nota-table td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    
    table.prima-nota-table th {
      background-color: #3b82f6 !important;
      color: white !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.prima-nota-table tr:nth-child(even) {
      background-color: #f3f4f6 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .entrata {
      background-color: #d1fae5 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .uscita {
      background-color: #fee2e2 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .text-right {
      text-align: right;
    }
    
    .nota-info {
      background: #fef3c7 !important;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border: 2px solid #f59e0b;
      font-size: 12px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .nota-info strong {
      color: #92400e;
    }
  `;

  // ========================================
  // INFO BOX
  // ========================================
  const infoBox = `
    <div class="info-box">
      <p><strong>Azienda:</strong> Marrel S.r.l.</p>
      <p><strong>Periodo:</strong> ${mese} ${anno}</p>
      <p><strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}</p>
      <p><strong>Movimenti pagati:</strong> ${movimentiMese.length}</p>
    </div>
  `;

  // ========================================
  // NOTA IMPORTANTE
  // ========================================
  const notaInfo = `
    <div class="nota-info">
      <p><strong>ℹ️ Nota:</strong> Questo documento contiene esclusivamente i movimenti effettivamente pagati nel periodo selezionato. Le uscite programmate o non ancora saldate non sono incluse in questa prima nota.</p>
    </div>
  `;

  // ========================================
  // GENERA TABELLA MOVIMENTI
  // ========================================
  const generateTabellaMovimenti = () => {
    let html = `
      <table class="prima-nota-table">
        <thead>
          <tr>
            <th>Data Movimento</th>
            <th>Tipo</th>
            <th>Tipologia</th>
            <th>Fornitore / Cliente</th>
            <th>Cantiere</th>
            <th>Causale</th>
            <th>Importo</th>
            <th>Comm.</th>
            <th>Totale</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
    `;

    let saldoProgressivo = parseFloat(saldoIniziale);

    movimentiMese.forEach(mov => {
      const fornitore = fornitori.find(f => f.id === mov.fornitore_id);
      const cliente = clienti.find(c => c.id === mov.cliente_id);
      const cantiere = cantieri.find(c => c.id === mov.cantiere_id);
      const tipologia = tipologieMovimento.find(t => t.value === mov.tipologia_movimento);
      const totale = parseFloat(mov.importo || 0) + parseFloat(mov.commissione || 0);
      
      // Calcola saldo progressivo (tutti i movimenti nella prima nota sono pagati)
      if (mov.tipologia_movimento === 'storno') {
        saldoProgressivo += totale;
      } else if (mov.tipo === 'entrata') {
        saldoProgressivo += totale;
      } else {
        saldoProgressivo -= totale;
      }

      const rowClass = mov.tipo;
      const tipoLabel = mov.tipo === 'entrata' ? '⬆️ Entrata' : '⬇️ Uscita';

      html += `
        <tr class="${rowClass}">
          <td>${formatDate(mov.data_movimento)}</td>
          <td>${tipoLabel}</td>
          <td>${tipologia?.label || mov.tipologia_movimento}</td>
          <td>${mov.tipo === 'entrata' ? (cliente?.ragione_sociale || '-') : (fornitore?.ragione_sociale || '-')}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td>${mov.causale || '-'}</td>
          <td class="text-right">${formatCurrency(mov.importo)}</td>
          <td class="text-right">${formatCurrency(mov.commissione)}</td>
          <td class="text-right" style="font-weight: bold;">${formatCurrency(totale)}</td>
          <td class="text-right" style="font-weight: bold;">${formatCurrency(saldoProgressivo)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    notaInfo +
    generateTabellaMovimenti();

  const htmlDocument = generateCompleteHTML({
    title: `📋 Prima Nota - ${mese} ${anno}`,
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, `Prima_Nota_${mese}_${anno}`);
};