// src/utils/exports/exportRateizziPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con rateizzi e relative rate
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.rateizzi - Array rateizzi
 * @param {Array} params.noteRateizzi - Array note associate alle rate
 */
export const exportRateizziPDF = (params) => {
  const { rateizzi, noteRateizzi } = params;

  // ========================================
  // CSS CUSTOM PER RATEIZZI
  // ========================================
  const customStyles = `
    .rateizzo-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .rateizzo-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-rateizzo {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .riepilogo-card-small {
      background: white !important;
      padding: 12px;
      border-radius: 6px;
      border: 2px solid #e5e7eb;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-card-small.totale {
      border-color: #3b82f6;
    }
    
    .riepilogo-card-small.pagato {
      border-color: #10b981;
    }
    
    .riepilogo-card-small.rimanente {
      border-color: #f59e0b;
    }
    
    .riepilogo-label-small {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .riepilogo-valore-small {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .rate-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    .rate-table thead {
      background: #f9fafb !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .rate-table th {
      padding: 8px;
      text-align: left;
      border-bottom: 2px solid #e5e7eb;
      font-weight: bold;
      color: #374151;
    }
    
    .rate-table td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .rate-table tbody tr:hover {
      background: #f9fafb !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      display: inline-block;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-badge.da_pagare {
      background: #f3f4f6 !important;
      color: #374151 !important;
    }
    
    .stato-badge.in_scadenza {
      background: #fef3c7 !important;
      color: #92400e !important;
    }
    
    .stato-badge.scaduto {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }
    
    .stato-badge.pagato {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .nota-box {
      background: #fef3c7 !important;
      padding: 8px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin-top: 8px;
      font-size: 9px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
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
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }
  `;

  // ========================================
  // FUNZIONI HELPER
  // ========================================
  const calcolaStato = (rata) => {
    if (rata.dataPagamento && rata.dataPagamento !== '') return 'pagato';
    const oggi = new Date();
    const scadenza = new Date(rata.dataScadenza);
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    if (giorniMancanti < 0) return 'scaduto';
    if (giorniMancanti <= 7 && giorniMancanti >= 0) return 'in_scadenza';
    return 'da_pagare';
  };

  const calcolaRiepilogo = (rateizzo) => {
    const rate = rateizzo.rate || [];
    const totale = rate.reduce((sum, r) => sum + parseFloat(r.importo || 0), 0);
    const pagato = rate.filter(r => calcolaStato(r) === 'pagato').reduce((sum, r) => sum + parseFloat(r.importo || 0), 0);
    const rimanente = totale - pagato;
    return { totale, pagato, rimanente };
  };

  const getNota = (rateizzoId, rataId) => {
    const nota = noteRateizzi.find(n => 
      n.rateizzo_id === rateizzoId && n.rata_id === rataId
    );
    return nota?.nota || '';
  };

  const statoLabels = {
    'da_pagare': 'Da Pagare',
    'in_scadenza': '⚠️ In Scadenza',
    'scaduto': '❌ Scaduto',
    'pagato': '✅ Pagato'
  };

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  let totaleComplessivo = 0;
  let pagatoComplessivo = 0;
  
  rateizzi.forEach(rateizzo => {
    const riepilogo = calcolaRiepilogo(rateizzo);
    totaleComplessivo += riepilogo.totale;
    pagatoComplessivo += riepilogo.pagato;
  });
  
  const rimanenteComplessivo = totaleComplessivo - pagatoComplessivo;

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
      <p><strong>Totale rateizzi:</strong> ${rateizzi.length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Complessivo Rateizzi</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Numero Rateizzi</div>
          <div class="riepilogo-valore">${rateizzi.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Complessivo</div>
          <div class="riepilogo-valore">${formatCurrency(totaleComplessivo)}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Pagato</div>
          <div class="riepilogo-valore" style="color: #059669;">${formatCurrency(pagatoComplessivo)}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Rimanente</div>
          <div class="riepilogo-valore" style="color: #d97706;">${formatCurrency(rimanenteComplessivo)}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA SEZIONI RATEIZZI
  // ========================================
  const generateSezioniRateizzi = () => {
    let html = '';

    // Ordina rateizzi per nome
    const rateizziOrdinati = [...rateizzi].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    rateizziOrdinati.forEach(rateizzo => {
      const riepilogo = calcolaRiepilogo(rateizzo);

      html += `
        <div class="rateizzo-section">
          <div class="rateizzo-header">
            💰 ${rateizzo.nome}
          </div>
          
          <div class="riepilogo-rateizzo">
            <div class="riepilogo-card-small totale">
              <div class="riepilogo-label-small">Totale Rateizzo</div>
              <div class="riepilogo-valore-small">${formatCurrency(riepilogo.totale)}</div>
            </div>
            <div class="riepilogo-card-small pagato">
              <div class="riepilogo-label-small">Pagato</div>
              <div class="riepilogo-valore-small" style="color: #059669;">${formatCurrency(riepilogo.pagato)}</div>
            </div>
            <div class="riepilogo-card-small rimanente">
              <div class="riepilogo-label-small">Rimanente</div>
              <div class="riepilogo-valore-small" style="color: #d97706;">${formatCurrency(riepilogo.rimanente)}</div>
            </div>
          </div>
          
          <table class="rate-table">
            <thead>
              <tr>
                <th style="width: 10%;">Rata</th>
                <th style="width: 15%;">Scadenza</th>
                <th style="width: 15%;">Importo</th>
                <th style="width: 15%;">Stato</th>
                <th style="width: 15%;">Data Pagamento</th>
                <th style="width: 30%;">Note</th>
              </tr>
            </thead>
            <tbody>
      `;

      (rateizzo.rate || []).forEach(rata => {
        const stato = calcolaStato(rata);
        const nota = getNota(rateizzo.id, rata.id);

        html += `
          <tr>
            <td style="font-weight: bold;">Rata ${rata.numeroRata}</td>
            <td>${formatDate(rata.dataScadenza)}</td>
            <td style="font-family: monospace; font-weight: bold;">${formatCurrency(rata.importo || 0)}</td>
            <td>
              <span class="stato-badge ${stato}">${statoLabels[stato]}</span>
            </td>
            <td>${rata.dataPagamento ? formatDate(rata.dataPagamento) : '-'}</td>
            <td>${nota ? `<div class="nota-box">📝 ${nota}</div>` : '-'}</td>
          </tr>
        `;
      });

      html += `
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
    generateSezioniRateizzi();

  const htmlDocument = generateCompleteHTML({
    title: '💰 Report Rateizzi',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Report_Rateizzi');
};