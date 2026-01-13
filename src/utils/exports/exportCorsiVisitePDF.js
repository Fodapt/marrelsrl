// src/utils/exports/exportCorsiVisitePDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco corsi e visite mediche
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.certificazioni - Array corsi/visite
 * @param {Array} params.lavoratori - Array lavoratori
 */
export const exportCorsiVisitePDF = (params) => {
  const { certificazioni, lavoratori } = params;

  // ========================================
  // CSS CUSTOM PER CORSI/VISITE
  // ========================================
  const customStyles = `
    .lavoratore-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .lavoratore-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .corso-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .corso-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .corso-nome {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .tipo-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      margin-right: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipo-badge.corso {
      background: #dbeafe !important;
      color: #1e40af !important;
    }
    
    .tipo-badge.visita {
      background: #f3e8ff !important;
      color: #6b21a8 !important;
    }
    
    .stato-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-badge.valido {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .stato-badge.in_scadenza {
      background: #fed7aa !important;
      color: #9a3412 !important;
    }
    
    .stato-badge.scaduto {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }
    
    .corso-info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      font-size: 10px;
      margin-bottom: 10px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .info-label {
      font-weight: bold;
      color: #6b7280;
      font-size: 9px;
    }
    
    .info-value {
      color: #1f2937;
      font-weight: 500;
    }
    
    .date-box {
      background: #f9fafb !important;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .storico-section {
      background: #f9fafb !important;
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .storico-header {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 6px;
      color: #10b981;
    }
    
    .storico-table {
      width: 100%;
      font-size: 8px;
      border-collapse: collapse;
    }
    
    .storico-table th {
      background: #e5e7eb !important;
      padding: 4px;
      text-align: left;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .storico-table td {
      padding: 4px;
      border-top: 1px solid #e5e7eb;
    }
    
    .note-box {
      background: #fef3c7 !important;
      padding: 8px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin-top: 8px;
      font-size: 9px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
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
    
    .alert-box.warning {
      background: #fed7aa !important;
      border-left-color: #ea580c;
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
        label: `Valido (${giorniMancanti} giorni)`, 
        giorni: giorniMancanti 
      };
    }
  };

  // ========================================
  // RAGGRUPPA PER LAVORATORE
  // ========================================
  const certificazioniPerLavoratore = {};

  certificazioni.forEach(c => {
    if (!certificazioniPerLavoratore[c.lavoratore_id]) {
      certificazioniPerLavoratore[c.lavoratore_id] = [];
    }
    certificazioniPerLavoratore[c.lavoratore_id].push(c);
  });

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  let totaleCorsi = 0;
  let totaleVisite = 0;
  let scaduti = 0;
  let inScadenza = 0;
  let validi = 0;

  certificazioni.forEach(c => {
    if (c.tipo === 'corso') totaleCorsi++;
    if (c.tipo === 'visita') totaleVisite++;

    const stato = calcolaStatoScadenza(c.data_scadenza);
    if (stato.stato === 'scaduto') scaduti++;
    else if (stato.stato === 'in_scadenza') inScadenza++;
    else if (stato.stato === 'valido') validi++;
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
      <p><strong>Totale certificazioni:</strong> ${certificazioni.length}</p>
      <p><strong>Lavoratori coinvolti:</strong> ${Object.keys(certificazioniPerLavoratore).length}</p>
    </div>
  `;

  // ========================================
  // ALERT BOX
  // ========================================
  let alertBox = '';
  if (scaduti > 0) {
    alertBox = `
      <div class="alert-box">
        <strong>⚠️ ATTENZIONE - Certificazioni Scadute</strong>
        <p style="margin: 8px 0 0 0;"><strong>${scaduti}</strong> certificazione/i <strong>SCADUTA/E</strong> - Rinnovo urgente necessario</p>
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
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Corsi e Visite</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale</div>
          <div class="riepilogo-valore">${certificazioni.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Corsi</div>
          <div class="riepilogo-valore">${totaleCorsi}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Visite</div>
          <div class="riepilogo-valore">${totaleVisite}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Validi</div>
          <div class="riepilogo-valore" style="color: #059669;">${validi}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">In Scadenza</div>
          <div class="riepilogo-valore" style="color: #ea580c;">${inScadenza}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Scaduti</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${scaduti}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD CORSO/VISITA
  // ========================================
  const generateCorsoCard = (c) => {
    const statoScadenza = calcolaStatoScadenza(c.data_scadenza);

    let html = `
      <div class="corso-card">
        <div class="corso-header">
          <div>
            <span class="tipo-badge ${c.tipo}">${c.tipo === 'corso' ? 'Corso' : 'Visita'}</span>
            <span class="corso-nome">${c.nome || c.nome_certificazione}</span>
          </div>
          <span class="stato-badge ${statoScadenza.stato}">
            ${statoScadenza.label}
          </span>
        </div>
        
        <div class="corso-info-grid">
    `;

    // Data Conseguimento
    if (c.data_conseguimento) {
      html += `
        <div class="info-item">
          <div class="info-label">📅 CONSEGUIMENTO</div>
          <div class="date-box">
            <div class="info-value">${formatDate(c.data_conseguimento)}</div>
          </div>
        </div>
      `;
    }

    // Data Scadenza
    html += `
      <div class="info-item">
        <div class="info-label">📅 SCADENZA</div>
        <div class="date-box">
          <div class="info-value">${formatDate(c.data_scadenza)}</div>
        </div>
      </div>
    `;

    // Numero Attestato
    if (c.numero_attestato) {
      html += `
        <div class="info-item">
          <div class="info-label">🔢 N. ATTESTATO</div>
          <div class="info-value">${c.numero_attestato}</div>
        </div>
      `;
    }

    // Ente Rilascio
    if (c.ente_rilascio) {
      html += `
        <div class="info-item">
          <div class="info-label">🏛️ ENTE</div>
          <div class="info-value">${c.ente_rilascio}</div>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Note
    if (c.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${c.note}
        </div>
      `;
    }

    // Storico (ultimi 3 aggiornamenti)
    if (c.storico && c.storico.length > 0) {
      const storicoRecente = [...c.storico].reverse().slice(0, 3);
      
      html += `
        <div class="storico-section">
          <div class="storico-header">📜 Storico Aggiornamenti (ultimi ${storicoRecente.length}/${c.storico.length})</div>
          <table class="storico-table">
            <thead>
              <tr>
                <th>Data Agg.</th>
                <th>Scad. Prec.</th>
                <th>Nuova Scad.</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
      `;

      storicoRecente.forEach(agg => {
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
        </div>
      `;
    }

    html += `</div>`; // Chiudi corso-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER LAVORATORE
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Ordina lavoratori per cognome
    const lavoratoriOrdinati = Object.keys(certificazioniPerLavoratore)
      .map(id => lavoratori.find(l => l.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

    lavoratoriOrdinati.forEach(lavoratore => {
      const certificazioniLavoratore = certificazioniPerLavoratore[lavoratore.id];
      
      // Ordina certificazioni per scadenza (più urgenti prima)
      certificazioniLavoratore.sort((a, b) => {
        const dateA = new Date(a.data_scadenza || '9999-12-31');
        const dateB = new Date(b.data_scadenza || '9999-12-31');
        return dateA - dateB;
      });

      html += `
        <div class="lavoratore-section">
          <div class="lavoratore-header">
            👤 ${lavoratore.cognome} ${lavoratore.nome} (${certificazioniLavoratore.length} certificazioni)
          </div>
      `;

      certificazioniLavoratore.forEach(c => {
        html += generateCorsoCard(c);
      });

      html += `</div>`; // Chiudi lavoratore-section
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
    title: '🎓 Corsi e Visite Mediche',
    subtitle: null,
    content: contentHTML,
    customColor: '#10b981',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Corsi_Visite_Mediche');
};