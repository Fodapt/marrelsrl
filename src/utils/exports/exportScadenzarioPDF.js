// src/utils/exports/exportScadenzarioPDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con scadenzario completo
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.scadenzeImminenti - Array scadenze imminenti
 * @param {Array} params.scadenzePassate - Array scadenze passate
 */
export const exportScadenzarioPDF = (params) => {
  const { scadenzeImminenti, scadenzePassate } = params;

  const tutteScadenze = [...scadenzeImminenti, ...scadenzePassate];

  // ========================================
  // CSS CUSTOM PER SCADENZARIO
  // ========================================
  const customStyles = `
    .scadenza-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-header {
      padding: 12px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .section-header.imminenti {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      color: white;
    }
    
    .section-header.passate {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
      color: white;
    }
    
    .scadenza-card {
      background: white !important;
      border-left: 6px solid;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .scadenza-card.critica {
      background: #fee2e2 !important;
      border-left-color: #dc2626;
    }
    
    .scadenza-card.urgente {
      background: #fed7aa !important;
      border-left-color: #ea580c;
    }
    
    .scadenza-card.attenzione {
      background: #fef3c7 !important;
      border-left-color: #f59e0b;
    }
    
    .scadenza-card.passata {
      background: #fee2e2 !important;
      border-left-color: #991b1b;
    }
    
    .scadenza-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    
    .scadenza-titolo {
      font-size: 13px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .giorni-badge {
      display: inline-block;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: bold;
      text-align: center;
      min-width: 60px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .giorni-badge.critico {
      background: #dc2626 !important;
      color: white !important;
      font-size: 18px;
    }
    
    .giorni-badge.urgente {
      background: #ea580c !important;
      color: white !important;
      font-size: 16px;
    }
    
    .giorni-badge.attenzione {
      background: #f59e0b !important;
      color: white !important;
      font-size: 14px;
    }
    
    .giorni-badge.passato {
      background: #991b1b !important;
      color: white !important;
      font-size: 16px;
    }
    
    .giorni-label {
      font-size: 9px;
      margin-top: 2px;
    }
    
    .tipo-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
      margin-right: 6px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipo-badge.corso { background: #dbeafe !important; color: #1e40af !important; }
    .tipo-badge.visita { background: #f3e8ff !important; color: #6b21a8 !important; }
    .tipo-badge.assicurazione { background: #fed7aa !important; color: #9a3412 !important; }
    .tipo-badge.revisione { background: #fef3c7 !important; color: #92400e !important; }
    .tipo-badge.contratto { background: #dbeafe !important; color: #1e40af !important; }
    .tipo-badge.dnlt { background: #fecaca !important; color: #991b1b !important; }
    .tipo-badge.documento { background: #e0e7ff !important; color: #3730a3 !important; }
    .tipo-badge.rateizzo { background: #d1fae5 !important; color: #065f46 !important; }
    .tipo-badge.manutenzione_veicolo { background: #ccfbf1 !important; color: #115e59 !important; }
    
    .scadenza-dettagli {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.5;
    }
    
    .scadenza-data {
      font-size: 9px;
      color: #6b7280;
      margin-top: 4px;
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
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }
    
    .riepilogo-card {
      background: white !important;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-label {
      font-size: 8px;
      color: #6b7280;
      margin-bottom: 3px;
      font-weight: bold;
    }
    
    .riepilogo-valore {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .alert-box {
      background: #fee2e2 !important;
      border-left: 4px solid #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 11px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
      font-size: 12px;
    }
    
    .empty-state-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }
  `;

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  const critiche = scadenzeImminenti.filter(s => s.giorniMancanti <= 7).length;
  const urgenti = scadenzeImminenti.filter(s => s.giorniMancanti > 7 && s.giorniMancanti <= 15).length;
  const attenzione = scadenzeImminenti.filter(s => s.giorniMancanti > 15).length;

  // Conta per tipo
  const conteggioPerTipo = {};
  tutteScadenze.forEach(s => {
    conteggioPerTipo[s.tipo] = (conteggioPerTipo[s.tipo] || 0) + 1;
  });

  const tipiLabels = {
    'corso': 'Corsi',
    'visita': 'Visite',
    'assicurazione': 'Assicurazioni',
    'revisione': 'Revisioni',
    'contratto': 'Contratti',
    'dnlt': 'DNLT',
    'documento': 'Documenti',
    'rateizzo': 'Rateizzi',
    'manutenzione_veicolo': 'Manutenzioni'
  };

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
      <p><strong>Periodo:</strong> 30 giorni passati + 30 giorni futuri</p>
      <p><strong>Totale scadenze:</strong> ${tutteScadenze.length}</p>
    </div>
  `;

  // ========================================
  // ALERT BOX
  // ========================================
  let alertBox = '';
  if (critiche > 0 || scadenzePassate.length > 0) {
    alertBox = `
      <div class="alert-box">
        <strong>⚠️ ATTENZIONE - Azioni Urgenti Richieste</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          ${scadenzePassate.length > 0 ? `<li><strong>${scadenzePassate.length}</strong> scadenze <strong>GIÀ PASSATE</strong></li>` : ''}
          ${critiche > 0 ? `<li><strong>${critiche}</strong> scadenze <strong>CRITICHE</strong> (entro 7 giorni)</li>` : ''}
          ${urgenti > 0 ? `<li><strong>${urgenti}</strong> scadenze <strong>URGENTI</strong> (8-15 giorni)</li>` : ''}
        </ul>
      </div>
    `;
  } else if (urgenti > 0 || attenzione > 0) {
    alertBox = `
      <div class="alert-box" style="background: #fed7aa !important; border-left-color: #ea580c;">
        <strong>⚠️ Scadenze da Monitorare</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          ${urgenti > 0 ? `<li><strong>${urgenti}</strong> scadenze <strong>URGENTI</strong> (8-15 giorni)</li>` : ''}
          ${attenzione > 0 ? `<li><strong>${attenzione}</strong> scadenze da monitorare (16-30 giorni)</li>` : ''}
        </ul>
      </div>
    `;
  }

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoCards = Object.keys(tipiLabels)
    .filter(tipo => conteggioPerTipo[tipo] > 0)
    .map(tipo => `
      <div class="riepilogo-card">
        <div class="riepilogo-label">${tipiLabels[tipo]}</div>
        <div class="riepilogo-valore">${conteggioPerTipo[tipo]}</div>
      </div>
    `).join('');

  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Scadenzario</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale</div>
          <div class="riepilogo-valore">${tutteScadenze.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Passate</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${scadenzePassate.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Critiche</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${critiche}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Urgenti</div>
          <div class="riepilogo-valore" style="color: #ea580c;">${urgenti}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Da Monitorare</div>
          <div class="riepilogo-valore" style="color: #f59e0b;">${attenzione}</div>
        </div>
        ${riepilogoCards}
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD SCADENZA
  // ========================================
  const generateScadenzaCard = (scad) => {
    let classeUrgenza, classeGiorni, testoGiorni;
    
    if (scad.giorniMancanti < 0) {
      classeUrgenza = 'passata';
      classeGiorni = 'passato';
      testoGiorni = `<div style="font-size: 16px;">${Math.abs(scad.giorniMancanti)}</div><div class="giorni-label">giorni fa</div>`;
    } else if (scad.giorniMancanti <= 7) {
      classeUrgenza = 'critica';
      classeGiorni = 'critico';
      testoGiorni = `<div style="font-size: 18px;">${scad.giorniMancanti}</div><div class="giorni-label">giorni</div>`;
    } else if (scad.giorniMancanti <= 15) {
      classeUrgenza = 'urgente';
      classeGiorni = 'urgente';
      testoGiorni = `<div style="font-size: 16px;">${scad.giorniMancanti}</div><div class="giorni-label">giorni</div>`;
    } else {
      classeUrgenza = 'attenzione';
      classeGiorni = 'attenzione';
      testoGiorni = `<div style="font-size: 14px;">${scad.giorniMancanti}</div><div class="giorni-label">giorni</div>`;
    }

    const iconaManutenzione = scad.tipo === 'manutenzione_veicolo' ? '🔧 ' : '';

    return `
      <div class="scadenza-card ${classeUrgenza}">
        <div class="scadenza-header">
          <div style="flex: 1;">
            <div>
              <span class="tipo-badge ${scad.tipo}">${tipiLabels[scad.tipo] || scad.tipo}</span>
            </div>
            <div class="scadenza-titolo">${iconaManutenzione}${scad.descrizione}</div>
            <div class="scadenza-dettagli">${scad.lavoratore}</div>
            <div class="scadenza-data">📅 Scadenza: ${formatDate(scad.scadenza)}</div>
          </div>
          <div class="giorni-badge ${classeGiorni}">
            ${testoGiorni}
          </div>
        </div>
      </div>
    `;
  };

  // ========================================
  // GENERA SEZIONI
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Scadenze Imminenti
    html += `
      <div class="scadenza-section">
        <div class="section-header imminenti">
          📅 Scadenze Imminenti - Prossimi 30 Giorni (${scadenzeImminenti.length})
        </div>
    `;

    if (scadenzeImminenti.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div>Nessuna scadenza imminente nei prossimi 30 giorni</div>
        </div>
      `;
    } else {
      scadenzeImminenti.forEach(scad => {
        html += generateScadenzaCard(scad);
      });
    }

    html += `</div>`; // Chiudi scadenza-section

    // Scadenze Passate
    if (scadenzePassate.length > 0) {
      html += `
        <div class="scadenza-section">
          <div class="section-header passate">
            🚨 Scadenze Passate - Ultimi 30 Giorni (${scadenzePassate.length})
          </div>
      `;

      scadenzePassate.forEach(scad => {
        html += generateScadenzaCard(scad);
      });

      html += `</div>`; // Chiudi scadenza-section
    }

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    alertBox +
    riepilogoGenerale +
    generateSezioni();

  const htmlDocument = generateCompleteHTML({
    title: '📅 Scadenzario Generale',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Scadenzario_Generale');
};