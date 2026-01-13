// src/utils/exports/exportUnilavPDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco comunicazioni Unilav
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.unilav - Array comunicazioni Unilav
 * @param {Array} params.lavoratori - Array lavoratori
 * @param {Array} params.cantieri - Array cantieri
 */
export const exportUnilavPDF = (params) => {
  const { unilav, lavoratori, cantieri } = params;

  // ========================================
  // CSS CUSTOM PER UNILAV
  // ========================================
  const customStyles = `
    .lavoratore-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .lavoratore-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .unilav-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .unilav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .tipo-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipo-badge.assunzione { background: #d1fae5 !important; color: #065f46 !important; }
    .tipo-badge.trasf_part_full { background: #dbeafe !important; color: #1e40af !important; }
    .tipo-badge.trasf_cantiere { background: #f3e8ff !important; color: #6b21a8 !important; }
    .tipo-badge.trasf_livello { background: #e0e7ff !important; color: #3730a3 !important; }
    .tipo-badge.dimissioni { background: #fee2e2 !important; color: #991b1b !important; }
    .tipo-badge.distacco_comando { background: #fed7aa !important; color: #9a3412 !important; }
    .tipo-badge.proroga { background: #fef3c7 !important; color: #92400e !important; }
    .tipo-badge.trasf_det_ind { background: #ccfbf1 !important; color: #115e59 !important; }
    
    .contratto-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
      margin-left: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .contratto-badge.indeterminato {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .contratto-badge.determinato {
      background: #fef3c7 !important;
      color: #92400e !important;
    }
    
    .unilav-info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      font-size: 10px;
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
      -webkit-print-color-adjust: exact !important;
    }
    
    .cantiere-box {
      background: #faf5ff !important;
      border-left: 4px solid #9333ea;
      padding: 8px;
      border-radius: 4px;
      font-size: 10px;
      margin-top: 8px;
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
  `;

  // ========================================
  // TIPI UNILAV
  // ========================================
  const tipiUnilav = {
    'assunzione': 'Assunzione',
    'trasf_part_full': 'Part→Full',
    'trasf_cantiere': 'Trasf. Cantiere',
    'trasf_livello': 'Trasf. Livello',
    'dimissioni': 'Dimissioni',
    'distacco_comando': 'Distacco/Comando',
    'proroga': 'Proroga',
    'trasf_det_ind': 'Det→Ind'
  };

  // ========================================
  // RAGGRUPPA PER LAVORATORE
  // ========================================
  const univlavPerLavoratore = {};

  unilav.forEach(u => {
    if (!univlavPerLavoratore[u.lavoratore_id]) {
      univlavPerLavoratore[u.lavoratore_id] = [];
    }
    univlavPerLavoratore[u.lavoratore_id].push(u);
  });

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  const conteggiPerTipo = {};
  Object.keys(tipiUnilav).forEach(tipo => {
    conteggiPerTipo[tipo] = unilav.filter(u => u.tipo_unilav === tipo).length;
  });

  const contrInd = unilav.filter(u => u.tipo_contratto === 'indeterminato').length;
  const contrDet = unilav.filter(u => u.tipo_contratto === 'determinato').length;

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
      <p><strong>Totale comunicazioni:</strong> ${unilav.length}</p>
      <p><strong>Lavoratori coinvolti:</strong> ${Object.keys(univlavPerLavoratore).length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Comunicazioni Unilav</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale</div>
          <div class="riepilogo-valore">${unilav.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Assunzioni</div>
          <div class="riepilogo-valore">${conteggiPerTipo.assunzione || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Trasf. Cantiere</div>
          <div class="riepilogo-valore">${conteggiPerTipo.trasf_cantiere || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Trasf. Livello</div>
          <div class="riepilogo-valore">${conteggiPerTipo.trasf_livello || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Part→Full</div>
          <div class="riepilogo-valore">${conteggiPerTipo.trasf_part_full || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Det→Ind</div>
          <div class="riepilogo-valore">${conteggiPerTipo.trasf_det_ind || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Proroghe</div>
          <div class="riepilogo-valore">${conteggiPerTipo.proroga || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Dimissioni</div>
          <div class="riepilogo-valore">${conteggiPerTipo.dimissioni || 0}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Contr. Indet.</div>
          <div class="riepilogo-valore">${contrInd}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Contr. Det.</div>
          <div class="riepilogo-valore">${contrDet}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD UNILAV
  // ========================================
  const generateUnilavCard = (u) => {
    const cantiere = cantieri.find(c => c.id === u.cantiere_id);
    const tipoLabel = tipiUnilav[u.tipo_unilav] || u.tipo_unilav;

    let html = `
      <div class="unilav-card">
        <div class="unilav-header">
          <div>
            <span class="tipo-badge ${u.tipo_unilav}">${tipoLabel}</span>
            ${u.tipo_contratto ? `
              <span class="contratto-badge ${u.tipo_contratto}">
                ${u.tipo_contratto === 'indeterminato' ? 'Indet.' : 'Det.'}
              </span>
            ` : ''}
          </div>
          <div style="font-size: 9px; color: #6b7280;">
            ${u.data_comunicazione ? `Comunicato: ${formatDate(u.data_comunicazione)}` : ''}
          </div>
        </div>
        
        <div class="unilav-info-grid">
    `;

    // Date
    html += `
      <div class="info-item">
        <div class="info-label">📅 INIZIO</div>
        <div class="date-box">
          <div class="info-value">${formatDate(u.data_inizio)}</div>
        </div>
      </div>
      
      <div class="info-item">
        <div class="info-label">📅 FINE</div>
        <div class="date-box">
          <div class="info-value">
            ${u.tipo_contratto === 'indeterminato' && u.tipo_unilav !== 'distacco_comando' 
              ? '<span style="color: #059669; font-weight: bold;">Indeterminato</span>' 
              : formatDate(u.data_fine)}
          </div>
        </div>
      </div>
    `;

    // Livello
    if (u.livello) {
      html += `
        <div class="info-item">
          <div class="info-label">📊 LIVELLO</div>
          <div class="info-value">${u.livello}</div>
        </div>
      `;
    }

    // Orario
    if (u.orario) {
      html += `
        <div class="info-item">
          <div class="info-label">⏰ ORARIO</div>
          <div class="info-value">${u.orario === 'full-time' ? 'Full-time' : 'Part-time'}</div>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Cantiere Box
    if (cantiere) {
      html += `
        <div class="cantiere-box">
          <strong>🏗️ Cantiere:</strong> ${cantiere.nome}
        </div>
      `;
    }

    html += `</div>`; // Chiudi unilav-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER LAVORATORE
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Ordina lavoratori per cognome
    const lavoratoriOrdinati = Object.keys(univlavPerLavoratore)
      .map(id => lavoratori.find(l => l.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

    lavoratoriOrdinati.forEach(lavoratore => {
      const univlavLavoratore = univlavPerLavoratore[lavoratore.id];
      
      // Ordina comunicazioni per data inizio (più recenti prima)
      univlavLavoratore.sort((a, b) => {
        const dateA = new Date(a.data_inizio || '1900-01-01');
        const dateB = new Date(b.data_inizio || '1900-01-01');
        return dateB - dateA;
      });

      html += `
        <div class="lavoratore-section">
          <div class="lavoratore-header">
            👤 ${lavoratore.cognome} ${lavoratore.nome} (${univlavLavoratore.length} comunicazioni)
          </div>
      `;

      univlavLavoratore.forEach(u => {
        html += generateUnilavCard(u);
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
    riepilogoGenerale +
    generateSezioni();

  const htmlDocument = generateCompleteHTML({
    title: '📄 Comunicazioni Unilav',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Comunicazioni_Unilav');
};