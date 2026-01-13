// src/utils/exports/exportAccontiPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con acconti raggruppati per lavoratore e tipo
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.acconti - Array acconti
 * @param {Array} params.lavoratori - Array lavoratori
 * @param {Array} params.mesiNomi - Array nomi mesi
 * @param {Function} params.calcolaStatoAcconto - Funzione per calcolare stato
 * @param {Function} params.calcolaRiepilogo - Funzione per calcolare riepilogo
 */
export const exportAccontiPDF = (params) => {
  const {
    acconti,
    lavoratori,
    mesiNomi,
    calcolaStatoAcconto,
    calcolaRiepilogo
  } = params;

  // ========================================
  // CSS CUSTOM PER ACCONTI
  // ========================================
  const customStyles = `
    .lavoratore-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .lavoratore-header {
      background: #eff6ff !important;
      color: #1e40af;
      padding: 15px;
      border-radius: 8px;
      border-left: 5px solid #3b82f6;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipo-subsection {
      margin-bottom: 25px;
    }
    
    .tipo-header {
      background: #f3f4f6 !important;
      color: #374151;
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      border-left: 3px solid #6b7280;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipo-header.paga {
      background: #dbeafe !important;
      color: #1e40af;
      border-left-color: #3b82f6;
    }
    
    .tipo-header.tfr {
      background: #f3e8ff !important;
      color: #6b21a8;
      border-left-color: #9333ea;
    }
    
    table.acconti-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 11px;
    }
    
    table.acconti-table th,
    table.acconti-table td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
    }
    
    table.acconti-table th {
      background-color: #f9fafb !important;
      color: #374151 !important;
      font-weight: bold;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    table.acconti-table tr:hover {
      background-color: #f9fafb !important;
    }
    
    .detrazioni-box {
      background: #fef3c7 !important;
      padding: 10px;
      margin: 8px 0;
      border-radius: 4px;
      border-left: 3px solid #f59e0b;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .detrazioni-list {
      margin-top: 5px;
      padding-left: 15px;
    }
    
    .stato-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      display: inline-block;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-saldato {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .stato-in_corso {
      background: #fef3c7 !important;
      color: #92400e !important;
    }
    
    .stato-da_recuperare {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }
    
    .stato-completo {
      background: #f3e8ff !important;
      color: #6b21a8 !important;
    }
    
    .totale-row {
      background-color: #e0e7ff !important;
      font-weight: bold;
      border-top: 2px solid #6366f1 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totale-lavoratore {
      background: #dbeafe !important;
      padding: 12px;
      border-radius: 6px;
      margin-top: 15px;
      font-weight: bold;
      border: 2px solid #3b82f6;
      -webkit-print-color-adjust: exact !important;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .riepilogo-generale {
      background: #eff6ff !important;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border: 2px solid #3b82f6;
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
      border: 2px solid;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-card.totale {
      border-color: #3b82f6;
    }
    
    .riepilogo-card.tfr {
      border-color: #9333ea;
    }
    
    .riepilogo-card.paga {
      border-color: #06b6d4;
    }
    
    .riepilogo-card.recuperato {
      border-color: #10b981;
    }
    
    .riepilogo-card.residuo {
      border-color: #f59e0b;
    }
    
    .riepilogo-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .riepilogo-valore {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
  `;

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  const totaleAcconti = acconti.reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
  const totaleTFR = acconti.filter(a => a.tipo === 'tfr').reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
  const totaleAccontiPaga = acconti.filter(a => a.tipo !== 'tfr').reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
  const totaleRecuperato = acconti
    .filter(a => a.tipo !== 'tfr')
    .reduce((sum, a) => {
      const detratto = (a.detrazioni || []).reduce((s, d) => s + parseFloat(d.importo || 0), 0);
      return sum + detratto;
    }, 0);
  const residuo = totaleAccontiPaga - totaleRecuperato;

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
      <p><strong>Totale acconti registrati:</strong> ${acconti.length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; color: #1e40af; font-size: 18px;">💰 Riepilogo Generale</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card totale">
          <div class="riepilogo-label">Totale Acconti</div>
          <div class="riepilogo-valore">${formatCurrency(totaleAcconti)}</div>
        </div>
        <div class="riepilogo-card tfr">
          <div class="riepilogo-label">Totale TFR</div>
          <div class="riepilogo-valore">${formatCurrency(totaleTFR)}</div>
        </div>
        <div class="riepilogo-card paga">
          <div class="riepilogo-label">Totale Acconti Paga</div>
          <div class="riepilogo-valore">${formatCurrency(totaleAccontiPaga)}</div>
        </div>
        <div class="riepilogo-card recuperato">
          <div class="riepilogo-label">Totale Recuperato</div>
          <div class="riepilogo-valore">${formatCurrency(totaleRecuperato)}</div>
        </div>
        <div class="riepilogo-card residuo">
          <div class="riepilogo-label">Residuo da Recuperare</div>
          <div class="riepilogo-valore">${formatCurrency(residuo)}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // RAGGRUPPA ACCONTI PER LAVORATORE
  // ========================================
  const accontiPerLavoratore = {};
  
  acconti.forEach(acconto => {
    if (!accontiPerLavoratore[acconto.lavoratore_id]) {
      accontiPerLavoratore[acconto.lavoratore_id] = [];
    }
    accontiPerLavoratore[acconto.lavoratore_id].push(acconto);
  });

  // ========================================
  // GENERA SEZIONI LAVORATORI
  // ========================================
  const generateSezioniLavoratori = () => {
    let html = '';

    // Ordina lavoratori per cognome
    const lavoratoriOrdinati = Object.keys(accontiPerLavoratore)
      .map(lavId => lavoratori.find(l => l.id === lavId))
      .filter(Boolean)
      .sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

    lavoratoriOrdinati.forEach(lavoratore => {
      const accontiLavoratore = accontiPerLavoratore[lavoratore.id];
      
      // Raggruppa per tipo
      const accontiPaga = accontiLavoratore.filter(a => a.tipo !== 'tfr');
      const accontiTFR = accontiLavoratore.filter(a => a.tipo === 'tfr');

      // Calcola totali lavoratore
      const totaleAccontiLav = accontiLavoratore.reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
      const totaleTFRLav = accontiTFR.reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
      const totaleAccontiPagaLav = accontiPaga.reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
      const totaleRecuperatoLav = accontiPaga.reduce((sum, a) => {
        const detratto = (a.detrazioni || []).reduce((s, d) => s + parseFloat(d.importo || 0), 0);
        return sum + detratto;
      }, 0);
      const residuoLav = totaleAccontiPagaLav - totaleRecuperatoLav;

      html += `
        <div class="lavoratore-section">
          <div class="lavoratore-header">
            👤 ${lavoratore.nome} ${lavoratore.cognome}
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin-bottom: 12px;">📊 Riepilogo Lavoratore</h3>
            <div class="riepilogo-grid">
              <div class="riepilogo-card totale">
                <div class="riepilogo-label">Totale Acconti</div>
                <div class="riepilogo-valore">${formatCurrency(totaleAccontiLav)}</div>
                <div style="font-size: 9px; color: #6b7280; margin-top: 3px;">${accontiLavoratore.length} acconti</div>
              </div>
              <div class="riepilogo-card tfr">
                <div class="riepilogo-label">Totale TFR</div>
                <div class="riepilogo-valore">${formatCurrency(totaleTFRLav)}</div>
                <div style="font-size: 9px; color: #6b7280; margin-top: 3px;">${accontiTFR.length} TFR</div>
              </div>
              <div class="riepilogo-card paga">
                <div class="riepilogo-label">Tot. Acc. Paghe</div>
                <div class="riepilogo-valore">${formatCurrency(totaleAccontiPagaLav)}</div>
                <div style="font-size: 9px; color: #6b7280; margin-top: 3px;">${accontiPaga.length} paghe</div>
              </div>
              <div class="riepilogo-card recuperato">
                <div class="riepilogo-label">Recuperato</div>
                <div class="riepilogo-valore">${formatCurrency(totaleRecuperatoLav)}</div>
              </div>
              <div class="riepilogo-card residuo">
                <div class="riepilogo-label">Residuo</div>
                <div class="riepilogo-valore">${formatCurrency(residuoLav)}</div>
              </div>
            </div>
          </div>
      `;

      // ===== ACCONTI PAGA =====
      if (accontiPaga.length > 0) {
        html += `
          <div class="tipo-subsection">
            <div class="tipo-header paga">💰 Acconti Paga (${accontiPaga.length})</div>
            <table class="acconti-table">
              <thead>
                <tr>
                  <th>Mese Rif.</th>
                  <th>Data Bonifico</th>
                  <th class="text-right">Importo</th>
                  <th class="text-right">Detratto</th>
                  <th class="text-right">Rimanente</th>
                  <th class="text-center">Stato</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
        `;

        accontiPaga.forEach(acconto => {
          const stato = calcolaStatoAcconto(acconto);
          const riepilogo = calcolaRiepilogo(acconto);
          const meseRif = mesiNomi[(acconto.mese_riferimento || 1) - 1];

          html += `
            <tr>
              <td>${meseRif} ${acconto.anno_riferimento}</td>
              <td>${formatDate(acconto.data_bonifico)}</td>
              <td class="text-right">${formatCurrency(riepilogo.totale)}</td>
              <td class="text-right">${formatCurrency(riepilogo.pagato)}</td>
              <td class="text-right">${formatCurrency(riepilogo.rimanente)}</td>
              <td class="text-center">
                <span class="stato-badge stato-${stato.stato}">${stato.label}</span>
              </td>
              <td>${acconto.note || '-'}</td>
            </tr>
          `;

          // Mostra detrazioni se presenti
          if (acconto.detrazioni && acconto.detrazioni.length > 0) {
            html += `
              <tr>
                <td colspan="7">
                  <div class="detrazioni-box">
                    <strong>📋 Detrazioni:</strong>
                    <div class="detrazioni-list">
            `;

            acconto.detrazioni
              .sort((a, b) => {
                if (a.anno !== b.anno) return a.anno - b.anno;
                return a.mese - b.mese;
              })
              .forEach(det => {
                html += `• ${mesiNomi[det.mese - 1]} ${det.anno}: ${formatCurrency(det.importo)}<br>`;
              });

            html += `
                    </div>
                  </div>
                </td>
              </tr>
            `;
          }
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      // ===== ACCONTI TFR =====
      if (accontiTFR.length > 0) {
        html += `
          <div class="tipo-subsection">
            <div class="tipo-header tfr">💼 Acconti TFR (${accontiTFR.length})</div>
            <table class="acconti-table">
              <thead>
                <tr>
                  <th>Mese Rif.</th>
                  <th>Data Bonifico</th>
                  <th class="text-right">Importo</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
        `;

        accontiTFR.forEach(acconto => {
          const meseRif = mesiNomi[(acconto.mese_riferimento || 1) - 1];

          html += `
            <tr>
              <td>${meseRif} ${acconto.anno_riferimento}</td>
              <td>${formatDate(acconto.data_bonifico)}</td>
              <td class="text-right">${formatCurrency(acconto.importo)}</td>
              <td>${acconto.note || '-'}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      // Chiusura sezione lavoratore
      html += `
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
    generateSezioniLavoratori();

  const htmlDocument = generateCompleteHTML({
    title: '💰 Report Acconti Lavoratori',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Report_Acconti_Lavoratori');
};