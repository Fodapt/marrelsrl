// src/utils/exports/exportAutomezziPDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco veicoli/automezzi raggruppati per proprietario
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.veicoli - Array veicoli
 * @param {string} params.nomeAzienda - Nome azienda per footer
 */
export const exportAutomezziPDF = (params) => {
  const { veicoli, nomeAzienda = 'MARREL SRL' } = params;

  // ========================================
  // CSS CUSTOM PER AUTOMEZZI
  // ========================================
  const customStyles = `
    .proprietario-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .proprietario-header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .proprietario-header.azienda {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
    }
    
    .proprietario-header.noleggio {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
    }
    
    .veicolo-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .veicolo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .veicolo-targa {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      font-family: monospace;
      background: #fef3c7 !important;
      padding: 5px 12px;
      border-radius: 6px;
      border: 2px solid #f59e0b;
      -webkit-print-color-adjust: exact !important;
    }
    
    .veicolo-marca {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .tipo-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      background: #dbeafe !important;
      color: #1e40af !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .scadenze-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .scadenza-box {
      background: #f9fafb !important;
      padding: 12px;
      border-radius: 6px;
      border: 2px solid #e5e7eb;
      -webkit-print-color-adjust: exact !important;
    }
    
    .scadenza-label {
      font-size: 10px;
      color: #6b7280;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .scadenza-data {
      font-size: 12px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .stato-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-badge.valido {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .stato-badge.in_scadenza {
      background: #fef3c7 !important;
      color: #92400e !important;
    }
    
    .stato-badge.scaduto {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }
    
    .stato-badge.sconosciuto {
      background: #f3f4f6 !important;
      color: #6b7280 !important;
    }
    
    .note-box {
      background: #fef3c7 !important;
      padding: 10px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin-top: 12px;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
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
    
    .proprietario-stats {
      background: #f3f4f6 !important;
      padding: 10px 15px;
      border-radius: 6px;
      margin-bottom: 15px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      -webkit-print-color-adjust: exact !important;
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
        label: `Valida (${giorniMancanti} giorni)`, 
        giorni: giorniMancanti 
      };
    }
  };

  const tipoLabels = {
    'furgone': '🚐 Furgone',
    'autocarro': '🚚 Autocarro',
    'escavatore': '🏗️ Escavatore',
    'gru': '🏗️ Gru',
    'betoniera': '🚛 Betoniera',
    'rimorchio': '🚙 Rimorchio',
    'auto': '🚗 Auto',
    'camion': '🚛 Camion',
    'altro': '🚜 Altro'
  };

  // ========================================
  // RAGGRUPPA PER PROPRIETARIO
  // ========================================
  const veicoliPerProprietario = {};

  veicoli.forEach(v => {
    const proprietario = v.proprietario || 'Non specificato';
    if (!veicoliPerProprietario[proprietario]) {
      veicoliPerProprietario[proprietario] = [];
    }
    veicoliPerProprietario[proprietario].push(v);
  });

  // Ordina proprietari: "Azienda" prima, poi gli altri in ordine alfabetico
  const proprietariOrdinati = Object.keys(veicoliPerProprietario).sort((a, b) => {
    if (a === 'Azienda') return -1;
    if (b === 'Azienda') return 1;
    return a.localeCompare(b);
  });

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  let assicurazioniScadute = 0;
  let assicurazioniInScadenza = 0;
  let revisioniScadute = 0;
  let revisioniInScadenza = 0;

  veicoli.forEach(v => {
    const statoAss = calcolaStatoScadenza(v.scadenza_assicurazione);
    const statoRev = calcolaStatoScadenza(v.scadenza_revisione);
    
    if (statoAss.stato === 'scaduto') assicurazioniScadute++;
    if (statoAss.stato === 'in_scadenza') assicurazioniInScadenza++;
    if (statoRev.stato === 'scaduto') revisioniScadute++;
    if (statoRev.stato === 'in_scadenza') revisioniInScadenza++;
  });

  // ========================================
  // INFO BOX
  // ========================================
  const infoBox = `
    <div class="info-box">
      <p><strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}</p>
      <p><strong>Totale veicoli:</strong> ${veicoli.length}</p>
      <p><strong>Proprietari:</strong> ${proprietariOrdinati.length}</p>
    </div>
  `;

  // ========================================
  // ALERT BOX (se ci sono scadenze critiche)
  // ========================================
  let alertBox = '';
  if (assicurazioniScadute > 0 || revisioniScadute > 0) {
    alertBox = `
      <div class="alert-box">
        <strong>⚠️ ATTENZIONE - Scadenze Critiche</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          ${assicurazioniScadute > 0 ? `<li><strong>${assicurazioniScadute}</strong> assicurazione/i <strong>SCADUTA/E</strong></li>` : ''}
          ${revisioniScadute > 0 ? `<li><strong>${revisioniScadute}</strong> revisione/i <strong>SCADUTA/E</strong></li>` : ''}
        </ul>
      </div>
    `;
  } else if (assicurazioniInScadenza > 0 || revisioniInScadenza > 0) {
    alertBox = `
      <div class="alert-box warning">
        <strong>⚠️ Scadenze Imminenti (prossimi 30 giorni)</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          ${assicurazioniInScadenza > 0 ? `<li><strong>${assicurazioniInScadenza}</strong> assicurazione/i in scadenza</li>` : ''}
          ${revisioniInScadenza > 0 ? `<li><strong>${revisioniInScadenza}</strong> revisione/i in scadenza</li>` : ''}
        </ul>
      </div>
    `;
  }

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Veicoli</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Veicoli</div>
          <div class="riepilogo-valore">${veicoli.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Assic. Scadute</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${assicurazioniScadute}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Assic. In Scadenza</div>
          <div class="riepilogo-valore" style="color: #d97706;">${assicurazioniInScadenza}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Rev. Scadute</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${revisioniScadute}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Rev. In Scadenza</div>
          <div class="riepilogo-valore" style="color: #d97706;">${revisioniInScadenza}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD VEICOLO
  // ========================================
  const generateVeicoloCard = (veicolo) => {
    const statoAss = calcolaStatoScadenza(veicolo.scadenza_assicurazione);
    const statoRev = calcolaStatoScadenza(veicolo.scadenza_revisione);

    let html = `
      <div class="veicolo-card">
        <div class="veicolo-header">
          <div>
            <div class="veicolo-targa">${veicolo.targa}</div>
            <div class="veicolo-marca">${veicolo.marca || ''} ${veicolo.modello || ''} ${veicolo.anno ? `(${veicolo.anno})` : ''}</div>
          </div>
          ${veicolo.tipo ? `<span class="tipo-badge">${tipoLabels[veicolo.tipo] || veicolo.tipo}</span>` : ''}
        </div>
        
        <div class="scadenze-grid">
          <div class="scadenza-box">
            <div class="scadenza-label">📋 ASSICURAZIONE</div>
            <div class="scadenza-data">${formatDate(veicolo.scadenza_assicurazione)}</div>
            <span class="stato-badge ${statoAss.stato}">${statoAss.label}</span>
          </div>
          
          <div class="scadenza-box">
            <div class="scadenza-label">🔧 REVISIONE</div>
            <div class="scadenza-data">${formatDate(veicolo.scadenza_revisione)}</div>
            <span class="stato-badge ${statoRev.stato}">${statoRev.label}</span>
          </div>
        </div>
    `;

    // Note
    if (veicolo.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${veicolo.note}
        </div>
      `;
    }

    html += `</div>`; // Chiudi veicolo-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER PROPRIETARIO
  // ========================================
  const generateSezioni = () => {
    let html = '';

    proprietariOrdinati.forEach(proprietario => {
      const veicoliProprietario = veicoliPerProprietario[proprietario];
      
      // Ordina veicoli per targa
      veicoliProprietario.sort((a, b) => (a.targa || '').localeCompare(b.targa || ''));

      // Statistiche per proprietario
      const tipiPresenti = [...new Set(veicoliProprietario.map(v => v.tipo).filter(Boolean))];
      
      const headerClass = proprietario === 'Azienda' ? 'azienda' : (proprietario.toLowerCase().includes('noleggio') ? 'noleggio' : '');

      html += `
        <div class="proprietario-section">
          <div class="proprietario-header ${headerClass}">
            ${proprietario === 'Azienda' ? '🏢' : '🚛'} ${proprietario} (${veicoliProprietario.length} veicoli)
          </div>
          
          <div class="proprietario-stats">
            <span><strong>Veicoli:</strong> ${veicoliProprietario.length}</span>
            <span><strong>Tipologie:</strong> ${tipiPresenti.length > 0 ? tipiPresenti.map(t => tipoLabels[t] || t).join(', ') : 'N/D'}</span>
          </div>
      `;

      veicoliProprietario.forEach(v => {
        html += generateVeicoloCard(v);
      });

      html += `</div>`; // Chiudi proprietario-section
    });

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
    title: '🚛 Elenco Veicoli / Automezzi',
    subtitle: `Raggruppati per Proprietario`,
    content: contentHTML,
    customColor: '#059669',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF',
    nomeAzienda  // ✅ PASSA nomeAzienda al footer
  });

  openPrintWindow(htmlDocument, 'Elenco_Veicoli');
};