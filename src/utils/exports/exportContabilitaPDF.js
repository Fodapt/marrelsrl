// src/utils/exports/exportContabilitaPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con report contabilità mensile
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.movimentiMese - Array movimenti del mese
 * @param {Array} params.fornitori - Array fornitori
 * @param {Array} params.clienti - Array clienti
 * @param {Array} params.cantieri - Array cantieri
 * @param {Array} params.tipologieMovimento - Array tipologie movimento
 * @param {string} params.mese - Nome del mese
 * @param {number} params.anno - Anno
 * @param {number} params.saldoIniziale - Saldo iniziale
 * @param {Object} params.totali - Totali calcolati
 */
export const exportContabilitaPDF = (params) => {
  const {
    movimentiMese,
    fornitori,
    clienti,
    cantieri,
    tipologieMovimento,
    mese,
    anno,
    saldoIniziale,
    totali
  } = params;

  // ========================================
  // CSS CUSTOM PER CONTABILITÀ
  // ========================================
  const customStyles = `
    table.movimenti-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 11px;
    }
    
    table.movimenti-table th,
    table.movimenti-table td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    
    table.movimenti-table th {
      background-color: #3b82f6 !important;
      color: white !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.movimenti-table tr:nth-child(even) {
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
    
    .totali {
      background: #dbeafe !important;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totali h2 {
      margin-top: 0;
      color: #1e40af;
      font-size: 18px;
    }
    
    .totali-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .totale-card {
      border: 2px solid;
      border-radius: 8px;
      padding: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totale-card.entrate {
      background: #d1fae5 !important;
      border-color: #10b981;
    }
    
    .totale-card.uscite {
      background: #fee2e2 !important;
      border-color: #ef4444;
    }
    
    .totale-card.storni {
      background: #e5e7eb !important;
      border-color: #6b7280;
    }
    
    .totale-card.saldo-reale {
      background: #e0e7ff !important;
      border-color: #6366f1;
    }
    
    .totale-card.saldo-previsto {
      background: #fef3c7 !important;
      border-color: #f59e0b;
    }
    
    .totale-label {
      font-size: 12px;
      color: #374151;
      margin-bottom: 5px;
    }
    
    .totale-valore {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .text-right {
      text-align: right;
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
      <p><strong>Movimenti totali:</strong> ${movimentiMese.length}</p>
    </div>
  `;

  // ========================================
  // GENERA TABELLA MOVIMENTI
  // ========================================
  const generateTabellaMovimenti = () => {
    let html = `
      <table class="movimenti-table">
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
            <th>Scadenza</th>
            <th>Stato</th>
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
      
      // Calcola saldo progressivo solo per movimenti pagati
      if (mov.pagato) {
        if (mov.tipologia_movimento === 'storno') {
          saldoProgressivo += totale;
        } else if (mov.tipo === 'entrata') {
          saldoProgressivo += totale;
        } else {
          saldoProgressivo -= totale;
        }
      }

      const rowClass = mov.tipo;
      const tipoLabel = mov.tipo === 'entrata' ? '⬆️ Entrata' : '⬇️ Uscita';
      const statoLabel = mov.pagato ? '✅ Pagato' : '⏳ Da pagare';

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
          <td>${mov.tipo === 'uscita' ? formatDate(mov.data_scadenza) : '-'}</td>
          <td>${statoLabel}</td>
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
  // GENERA TOTALI
  // ========================================
  const generateTotali = () => {
    return `
      <div class="totali">
        <h2>💰 Riepilogo Mensile</h2>
        <div class="totali-grid">
          <div class="totale-card entrate">
            <div class="totale-label">Totale Entrate</div>
            <div class="totale-valore">${formatCurrency(totali.totaleEntrateMese)}</div>
          </div>
          <div class="totale-card uscite">
            <div class="totale-label">Totale Uscite</div>
            <div class="totale-valore">${formatCurrency(totali.totaleUsciteMese)}</div>
          </div>
          <div class="totale-card storni">
            <div class="totale-label">Totale Storni</div>
            <div class="totale-valore">${formatCurrency(totali.totaleStorniMese)}</div>
          </div>
          <div class="totale-card saldo-reale">
            <div class="totale-label">Saldo Reale (movimenti pagati)</div>
            <div class="totale-valore">${formatCurrency(totali.saldoRealeMese)}</div>
          </div>
          <div class="totale-card saldo-previsto">
            <div class="totale-label">Saldo Previsto (tutti i movimenti)</div>
            <div class="totale-valore">${formatCurrency(totali.saldoPrevistoMese)}</div>
          </div>
        </div>
      </div>
    `;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    generateTabellaMovimenti() +
    generateTotali();

  const htmlDocument = generateCompleteHTML({
    title: `📊 Report Contabilità - ${mese} ${anno}`,
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, `Report_Contabilita_${mese}_${anno}`);
};