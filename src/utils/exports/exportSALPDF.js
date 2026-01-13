// src/utils/exports/exportSALPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con SAL raggruppati per cantiere
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.sal - Array SAL
 * @param {Array} params.cantieri - Array cantieri
 */
export const exportSALPDF = (params) => {
  const { sal, cantieri } = params;

  // ========================================
  // CSS CUSTOM PER SAL
  // ========================================
  const customStyles = `
    .cantiere-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .cantiere-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cantiere-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .info-card {
      background: white !important;
      padding: 12px;
      border-radius: 6px;
      border: 2px solid;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .info-card.contratto {
      border-color: #3b82f6;
      background: #eff6ff !important;
    }
    
    .info-card.totale {
      border-color: #10b981;
      background: #d1fae5 !important;
    }
    
    .info-card.percentuale {
      border-color: #8b5cf6;
      background: #ede9fe !important;
    }
    
    .info-card.rimanente {
      border-color: #f59e0b;
      background: #fef3c7 !important;
    }
    
    .info-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    table.sal-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 11px;
    }
    
    table.sal-table th,
    table.sal-table td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
    }
    
    table.sal-table th {
      background-color: #f3f4f6 !important;
      color: #374151 !important;
      font-weight: bold;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.sal-table tr:hover {
      background-color: #f9fafb !important;
    }
    
    .stato-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      display: inline-block;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-bozza {
      background: #f3f4f6 !important;
      color: #374151 !important;
    }
    
    .stato-presentato {
      background: #dbeafe !important;
      color: #1e40af !important;
    }
    
    .stato-approvato {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .stato-pagato {
      background: #f3e8ff !important;
      color: #6b21a8 !important;
    }
    
    .totale-cantiere-row {
      background-color: #dbeafe !important;
      font-weight: bold;
      border-top: 3px solid #3b82f6 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    
    .riepilogo-card {
      background: white !important;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .riepilogo-valore {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
  `;

  // ========================================
  // RAGGRUPPA SAL PER CANTIERE
  // ========================================
  const salPerCantiere = {};
  
  sal.forEach(s => {
    if (!salPerCantiere[s.cantiere_id]) {
      salPerCantiere[s.cantiere_id] = [];
    }
    salPerCantiere[s.cantiere_id].push(s);
  });

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  const numeroTotaleSAL = sal.length;
  const numeroCantieri = Object.keys(salPerCantiere).length;
  const totaleImportoContratti = cantieri
    .filter(c => salPerCantiere[c.id])
    .reduce((sum, c) => sum + (parseFloat(c.importo_lavori) || 0), 0);
  const totaleImportoSAL = sal.reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0);
  const totaleRimanente = totaleImportoContratti - totaleImportoSAL;
  const percentualeTotale = totaleImportoContratti > 0 
    ? ((totaleImportoSAL / totaleImportoContratti) * 100).toFixed(2) 
    : 0;

  // ========================================
  // INFO BOX
  // ========================================
  const infoBox = `
    <div class="info-box">
      <p><strong>Azienda:</strong> Marrel S.r.l.</p>
      <p><strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}</p>
      <p><strong>Cantieri con SAL:</strong> ${numeroCantieri}</p>
      <p><strong>Totale SAL registrati:</strong> ${numeroTotaleSAL}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Generale SAL</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Cantieri</div>
          <div class="riepilogo-valore">${numeroCantieri}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Tot. Contratti</div>
          <div class="riepilogo-valore">${formatCurrency(totaleImportoContratti)}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Tot. SAL</div>
          <div class="riepilogo-valore">${formatCurrency(totaleImportoSAL)}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Avanzamento</div>
          <div class="riepilogo-valore">${percentualeTotale}%</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Rimanente</div>
          <div class="riepilogo-valore">${formatCurrency(totaleRimanente)}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA SEZIONI CANTIERI
  // ========================================
  const generateSezioniCantieri = () => {
    let html = '';

    // Ordina cantieri per nome
    const cantieriOrdinati = Object.keys(salPerCantiere)
      .map(cantId => cantieri.find(c => c.id === cantId))
      .filter(Boolean)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    cantieriOrdinati.forEach(cantiere => {
      const salCantiere = salPerCantiere[cantiere.id];
      
      // Ordina SAL per numero_sal
      const salOrdinati = salCantiere.sort((a, b) => {
        // Prova a confrontare come numeri
        const numA = parseInt(a.numero_sal.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.numero_sal.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      // Calcola totali cantiere
      const importoContratto = parseFloat(cantiere.importo_lavori) || 0;
      const totaleSAL = salOrdinati.reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0);
      const percentuale = importoContratto > 0 ? ((totaleSAL / importoContratto) * 100).toFixed(2) : 0;
      const rimanente = importoContratto - totaleSAL;

      html += `
        <div class="cantiere-section">
          <div class="cantiere-header">
            🏗️ ${cantiere.nome}
          </div>
          
          <div class="cantiere-info-grid">
            <div class="info-card contratto">
              <div class="info-label">Importo Contratto</div>
              <div class="info-value">${formatCurrency(importoContratto)}</div>
            </div>
            <div class="info-card totale">
              <div class="info-label">Totale SAL</div>
              <div class="info-value">${formatCurrency(totaleSAL)}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 3px;">${salOrdinati.length} SAL</div>
            </div>
            <div class="info-card percentuale">
              <div class="info-label">Avanzamento</div>
              <div class="info-value">${percentuale}%</div>
            </div>
            <div class="info-card rimanente">
              <div class="info-label">Rimanente</div>
              <div class="info-value">${formatCurrency(rimanente)}</div>
            </div>
          </div>
          
          <table class="sal-table">
            <thead>
              <tr>
                <th style="width: 15%;">N. SAL</th>
                <th style="width: 12%;">Data</th>
                <th class="text-right" style="width: 15%;">Importo</th>
                <th class="text-center" style="width: 12%;">Avanzamento</th>
                <th class="text-center" style="width: 12%;">Stato</th>
                <th style="width: 34%;">Note</th>
              </tr>
            </thead>
            <tbody>
      `;

      const statoLabels = {
        bozza: '📝 Bozza',
        presentato: '📤 Presentato',
        approvato: '✅ Approvato',
        pagato: '💰 Pagato'
      };

      salOrdinati.forEach(s => {
        html += `
          <tr>
            <td style="font-family: monospace; font-weight: bold;">${s.numero_sal}</td>
            <td>${formatDate(s.data_sal)}</td>
            <td class="text-right" style="font-family: monospace;">${formatCurrency(s.importo)}</td>
            <td class="text-center">
              <span style="background: #ede9fe; color: #6b21a8; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 10px;">
                ${parseFloat(s.percentuale || 0).toFixed(1)}%
              </span>
            </td>
            <td class="text-center">
              <span class="stato-badge stato-${s.stato}">${statoLabels[s.stato] || s.stato}</span>
            </td>
            <td style="font-size: 9px;">${s.note || '-'}</td>
          </tr>
        `;
      });

      html += `
              <tr class="totale-cantiere-row">
                <td colspan="2" class="text-right"><strong>TOTALE CANTIERE:</strong></td>
                <td class="text-right" style="font-family: monospace;"><strong>${formatCurrency(totaleSAL)}</strong></td>
                <td class="text-center"><strong>${percentuale}%</strong></td>
                <td colspan="2" class="text-center">
                  <strong>Rimanente: ${formatCurrency(rimanente)}</strong>
                </td>
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
    infoBox +
    riepilogoGenerale +
    generateSezioniCantieri();

  const htmlDocument = generateCompleteHTML({
    title: '📊 Report SAL (Stati Avanzamento Lavori)',
    subtitle: null,
    content: contentHTML,
    customColor: '#667eea',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Report_SAL');
};