// src/utils/exports/exportCassaEdilePDF.js
import {
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con report casse edili raggruppato per cantiere
 * @param {Object} params - Parametri per l'export
 * @param {Object} params.reportData - Dati report (casse -> cantieri -> totali)
 * @param {string} params.mese - Nome del mese
 * @param {number} params.anno - Anno
 */
export const exportCassaEdilePDF = (params) => {
  const {
    reportData,
    mese,
    anno
  } = params;

  // ========================================
  // CSS CUSTOM PER CASSA EDILE
  // ========================================
  const customStyles = `
    .cassa-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .cassa-header {
      color: #1e3a8a;
      font-size: 18px;
      margin-bottom: 15px;
      background: #eff6ff !important;
      padding: 12px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.cassa-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white !important;
    }
    
    table.cassa-table th {
      background-color: #3b82f6 !important;
      color: white !important;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      font-size: 12px;
      border: 1px solid #2563eb;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.cassa-table td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      font-size: 11px;
    }
    
    table.cassa-table tr:nth-child(even) {
      background-color: #f9fafb !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totale-row {
      background-color: #dbeafe !important;
      font-weight: bold;
      border-top: 2px solid #3b82f6 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totale-row td {
      padding: 14px 12px !important;
      font-size: 14px !important;
    }
    
    .text-right {
      text-align: right;
    }
    
    .info-box {
      background: #eff6ff !important;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border: 2px solid #3b82f6;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .info-box p {
      margin: 8px 0;
      line-height: 1.6;
      font-size: 12px;
    }
    
    .info-box strong {
      color: #1e40af;
      font-weight: 600;
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
    </div>
  `;

  // ========================================
  // GENERA SEZIONI PER CASSA
  // ========================================
  const generateSezioniCasse = () => {
    let html = '';

    Object.entries(reportData).forEach(([cassa, cantieriObj]) => {
      const totaleGenerale = Object.values(cantieriObj).reduce((sum, val) => sum + val, 0);

      html += `
        <div class="cassa-section">
          <h2 class="cassa-header">Cassa Edile: ${cassa}</h2>
          
          <table class="cassa-table">
            <thead>
              <tr>
                <th style="width: 70%">Cantiere</th>
                <th style="width: 30%; text-align: right">Totale Contributi (€)</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Righe cantieri
      Object.entries(cantieriObj).forEach(([cantiere, totale]) => {
        html += `
          <tr>
            <td>${cantiere}</td>
            <td class="text-right">${formatCurrency(totale)}</td>
          </tr>
        `;
      });

      // Riga totale cassa
      html += `
              <tr class="totale-row">
                <td>TOTALE ${cassa}</td>
                <td class="text-right">${formatCurrency(totaleGenerale)}</td>
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
    generateSezioniCasse();

  const htmlDocument = generateCompleteHTML({
    title: '📊 Report Casse Edili',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, `Report_Casse_Edili_${mese}_${anno}`);
};