// src/utils/exports/exportCertificazioniPDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco certificazioni
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.documenti - Array certificazioni/documenti
 */
export const exportCertificazioniPDF = (params) => {
  const { documenti } = params;

  // ========================================
  // CSS CUSTOM PER CERTIFICAZIONI
  // ========================================
  const customStyles = `
    .tipo-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .tipo-header {
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .certificazione-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cert-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .cert-nome {
      font-size: 16px;
      font-weight: bold;
      color: #7c3aed;
    }
    
    .tipo-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      background: #ede9fe !important;
      color: #6d28d9 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cert-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 10px;
      margin-bottom: 12px;
    }
    
    .info-item {
      display: flex;
      gap: 5px;
    }
    
    .info-label {
      font-weight: bold;
      color: #6b7280;
      min-width: 100px;
    }
    
    .info-value {
      color: #1f2937;
    }
    
    .scadenza-box {
      background: #f0fdf4 !important;
      border-left: 4px solid #10b981;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .scadenza-box.scaduta {
      background: #fee2e2 !important;
      border-left-color: #dc2626;
    }
    
    .scadenza-box.in_scadenza {
      background: #fef3c7 !important;
      border-left-color: #f59e0b;
    }
    
    .scadenza-label {
      font-size: 9px;
      font-weight: bold;
      color: #6b7280;
      margin-bottom: 3px;
    }
    
    .scadenza-data {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .storico-section {
      background: #f9fafb !important;
      padding: 12px;
      border-radius: 6px;
      margin-top: 12px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .storico-header {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 8px;
      color: #6d28d9;
    }
    
    .storico-table {
      width: 100%;
      font-size: 9px;
      border-collapse: collapse;
    }
    
    .storico-table th {
      background: #e5e7eb !important;
      padding: 5px;
      text-align: left;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .storico-table td {
      padding: 5px;
      border-top: 1px solid #e5e7eb;
    }
    
    .note-box {
      background: #fef3c7 !important;
      padding: 10px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin-top: 10px;
      font-size: 9px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
      font-size: 9px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .riepilogo-valore {
      font-size: 18px;
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
    
    .alert-box.warning {
      background: #fef3c7 !important;
      border-left-color: #f59e0b;
    }
  `;

  // ========================================
  // FUNZIONI HELPER
  // ========================================
  const calcolaStatoScadenza = (dataScadenza) => {
    if (!dataScadenza) return { stato: 'sconosciuto', label: 'Non specificata', giorni: null };
    
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniMancanti < 0) {
      return { 
        stato: 'scaduto', 
        label: `Scaduto da ${Math.abs(giorniMancanti)} giorni`, 
        giorni: giorniMancanti 
      };
    } else if (giorniMancanti <= 30) {
      return { 
        stato: 'in_scadenza', 
        label: `Scade tra ${giorniMancanti} giorni`, 
        giorni: giorniMancanti 
      };
    } else {
      return { 
        stato: 'valido', 
        label: `Valida per ${giorniMancanti} giorni`, 
        giorni: giorniMancanti 
      };
    }
  };

  const tipoLabels = {
    'contratto': '📝 Contratto',
    'certificato': '🎓 Certificato',
    'autorizzazione': '✅ Autorizzazione',
    'durc': '📋 DURC',
    'visura': '🔍 Visura',
    'polizza': '🛡️ Polizza',
    'altro': '📄 Altro'
  };

  // ========================================
  // RAGGRUPPA PER TIPO
  // ========================================
  const documentiPerTipo = {};
  const senzaTipo = [];

  documenti.forEach(d => {
    if (d.tipo) {
      if (!documentiPerTipo[d.tipo]) {
        documentiPerTipo[d.tipo] = [];
      }
      documentiPerTipo[d.tipo].push(d);
    } else {
      senzaTipo.push(d);
    }
  });

  // Ordina tipi
  const tipiOrdinati = Object.keys(documentiPerTipo).sort();

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  let scadute = 0;
  let inScadenza = 0;
  const conteggioPerTipo = {};

  documenti.forEach(d => {
    const stato = calcolaStatoScadenza(d.data_scadenza);
    
    if (stato.stato === 'scaduto') scadute++;
    if (stato.stato === 'in_scadenza') inScadenza++;

    // Conta per tipo
    if (d.tipo) {
      conteggioPerTipo[d.tipo] = (conteggioPerTipo[d.tipo] || 0) + 1;
    }
  });

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
      <p><strong>Totale certificazioni:</strong> ${documenti.length}</p>
    </div>
  `;

  // ========================================
  // ALERT BOX
  // ========================================
  let alertBox = '';
  if (scadute > 0) {
    alertBox = `
      <div class="alert-box">
        <strong>⚠️ ATTENZIONE - Certificazioni Scadute</strong>
        <p style="margin: 8px 0 0 0;"><strong>${scadute}</strong> certificazione/i <strong>SCADUTA/E</strong> - Rinnovo urgente necessario</p>
      </div>
    `;
  } else if (inScadenza > 0) {
    alertBox = `
      <div class="alert-box warning">
        <strong>⚠️ Certificazioni in Scadenza (prossimi 30 giorni)</strong>
        <p style="margin: 8px 0 0 0;"><strong>${inScadenza}</strong> certificazione/i in scadenza - Pianificare rinnovo</p>
      </div>
    `;
  }

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoCards = tipiOrdinati.map(tipo => `
    <div class="riepilogo-card">
      <div class="riepilogo-label">${tipoLabels[tipo] || tipo}</div>
      <div class="riepilogo-valore">${conteggioPerTipo[tipo]}</div>
    </div>
  `).join('');

  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Certificazioni</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale</div>
          <div class="riepilogo-valore">${documenti.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Scadute</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${scadute}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">In Scadenza</div>
          <div class="riepilogo-valore" style="color: #d97706;">${inScadenza}</div>
        </div>
        ${riepilogoCards}
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD CERTIFICAZIONE
  // ========================================
  const generateCertificazioneCard = (doc) => {
    const statoScadenza = calcolaStatoScadenza(doc.data_scadenza);

    let html = `
      <div class="certificazione-card">
        <div class="cert-header">
          <div>
            <div class="cert-nome">${doc.nome}</div>
          </div>
          ${doc.tipo ? `<span class="tipo-badge">${tipoLabels[doc.tipo] || doc.tipo}</span>` : ''}
        </div>
        
        <div class="cert-info-grid">
    `;

    // Numero Documento
    if (doc.numero_documento) {
      html += `
        <div class="info-item">
          <span class="info-label">N. Documento:</span>
          <span class="info-value">${doc.numero_documento}</span>
        </div>
      `;
    }

    // Ente Rilascio
    if (doc.ente_rilascio) {
      html += `
        <div class="info-item">
          <span class="info-label">Ente Rilascio:</span>
          <span class="info-value">${doc.ente_rilascio}</span>
        </div>
      `;
    }

    // Data Emissione
    if (doc.data_emissione) {
      html += `
        <div class="info-item">
          <span class="info-label">Data Emissione:</span>
          <span class="info-value">${formatDate(doc.data_emissione)}</span>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Scadenza Box
    html += `
      <div class="scadenza-box ${statoScadenza.stato}">
        <div class="scadenza-label">📅 SCADENZA</div>
        <div class="scadenza-data">${formatDate(doc.data_scadenza)}</div>
        <div style="font-size: 10px; margin-top: 3px;">${statoScadenza.label}</div>
      </div>
    `;

    // Note
    if (doc.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${doc.note}
        </div>
      `;
    }

    // Storico
    if (doc.storico && doc.storico.length > 0) {
      html += `
        <div class="storico-section">
          <div class="storico-header">📜 Storico Aggiornamenti (${doc.storico.length})</div>
          <table class="storico-table">
            <thead>
              <tr>
                <th>Data Agg.</th>
                <th>Scad. Precedente</th>
                <th>Nuova Scadenza</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
      `;

      [...doc.storico].reverse().slice(0, 5).forEach(agg => {
        html += `
          <tr>
            <td>${formatDate(agg.dataAggiornamento)}</td>
            <td style="text-decoration: line-through; color: #dc2626;">${formatDate(agg.scadenzaPrecedente)}</td>
            <td style="font-weight: bold; color: #059669;">${formatDate(agg.nuovaScadenza)}</td>
            <td>${agg.nota || '-'}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
          ${doc.storico.length > 5 ? `<div style="font-size: 9px; margin-top: 5px; color: #6b7280;">Visualizzati ultimi 5 aggiornamenti su ${doc.storico.length} totali</div>` : ''}
        </div>
      `;
    }

    html += `</div>`; // Chiudi certificazione-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER TIPO
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Tipi ordinati
    tipiOrdinati.forEach(tipo => {
      const documentiTipo = documentiPerTipo[tipo];
      
      // Ordina documenti per nome
      documentiTipo.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      html += `
        <div class="tipo-section">
          <div class="tipo-header">
            ${tipoLabels[tipo] || tipo} (${documentiTipo.length})
          </div>
      `;

      documentiTipo.forEach(d => {
        html += generateCertificazioneCard(d);
      });

      html += `</div>`; // Chiudi tipo-section
    });

    // Documenti senza tipo
    if (senzaTipo.length > 0) {
      senzaTipo.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      html += `
        <div class="tipo-section">
          <div class="tipo-header">
            📄 Altri Documenti (${senzaTipo.length})
          </div>
      `;

      senzaTipo.forEach(d => {
        html += generateCertificazioneCard(d);
      });

      html += `</div>`; // Chiudi tipo-section
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
    title: '📄 Elenco Certificazioni',
    subtitle: null,
    content: contentHTML,
    customColor: '#7c3aed',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Elenco_Certificazioni');
};