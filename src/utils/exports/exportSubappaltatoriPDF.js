// src/utils/exports/exportSubappaltatoriPDF.js
import {
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco subappaltatori
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.subappaltatori - Array subappaltatori
 * @param {Array} params.cantieri - Array cantieri
 */
export const exportSubappaltatoriPDF = (params) => {
  const { subappaltatori, cantieri } = params;

  // ========================================
  // CSS CUSTOM PER SUBAPPALTATORI
  // ========================================
  const customStyles = `
    .cantiere-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .cantiere-header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .subappaltatore-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .sub-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .sub-nome {
      font-size: 16px;
      font-weight: bold;
      color: #f59e0b;
    }
    
    .tipologia-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
    }
    
    .tipologia-badge.ritenuta {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .tipologia-badge.subappalto {
      background: #dbeafe !important;
      color: #1e40af !important;
    }
    
    .sub-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 10px;
      margin-bottom: 10px;
    }
    
    .info-item {
      display: flex;
      gap: 5px;
    }
    
    .info-label {
      font-weight: bold;
      color: #6b7280;
      min-width: 70px;
    }
    
    .info-value {
      color: #1f2937;
    }
    
    .info-full-width {
      grid-column: 1 / -1;
    }
    
    .iban-value {
      font-family: monospace;
      font-size: 9px;
      background: #f3f4f6 !important;
      padding: 3px 6px;
      border-radius: 4px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cantieri-box {
      background: #faf5ff !important;
      border-left: 4px solid #9333ea;
      padding: 8px;
      border-radius: 4px;
      font-size: 9px;
      margin-bottom: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cantiere-tag {
      display: inline-block;
      padding: 3px 8px;
      background: #e9d5ff !important;
      color: #6b21a8 !important;
      border-radius: 10px;
      margin-right: 5px;
      margin-top: 3px;
      font-size: 9px;
      font-weight: bold;
      -webkit-print-color-adjust: exact !important;
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
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
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
    
    .contatti-box {
      background: #f0fdf4 !important;
      border-left: 4px solid #10b981;
      padding: 8px;
      border-radius: 4px;
      font-size: 9px;
      margin-top: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .contatti-item {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 3px;
    }
  `;

  // ========================================
  // RAGGRUPPA PER CANTIERE
  // ========================================
  const subappaltatoriPerCantiere = {};

  // Crea mappa cantiere -> subappaltatori
  subappaltatori.forEach(sub => {
    const cantieriIds = sub.cantieri_ids || [];
    cantieriIds.forEach(cantiereId => {
      if (!subappaltatoriPerCantiere[cantiereId]) {
        subappaltatoriPerCantiere[cantiereId] = [];
      }
      subappaltatoriPerCantiere[cantiereId].push(sub);
    });
  });

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  const conIBAN = subappaltatori.filter(s => s.iban).length;
  const conEmail = subappaltatori.filter(s => s.email).length;
  const conPEC = subappaltatori.filter(s => s.pec).length;
  const ritenuta2 = subappaltatori.filter(s => s.tipologia === '2%').length;
  const subappalto = subappaltatori.filter(s => s.tipologia === 'subappalto').length;

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
      <p><strong>Totale subappaltatori:</strong> ${subappaltatori.length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Subappaltatori</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale</div>
          <div class="riepilogo-valore">${subappaltatori.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Ritenuta 2%</div>
          <div class="riepilogo-valore">${ritenuta2}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Subappalto</div>
          <div class="riepilogo-valore">${subappalto}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Con IBAN</div>
          <div class="riepilogo-valore">${conIBAN}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Con Email</div>
          <div class="riepilogo-valore">${conEmail}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Con PEC</div>
          <div class="riepilogo-valore">${conPEC}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD SUBAPPALTATORE
  // ========================================
  const generateSubappaltatoreCard = (sub, mostraCantieri = true) => {
    let html = `
      <div class="subappaltatore-card">
        <div class="sub-header">
          <div>
            <div class="sub-nome">${sub.ragione_sociale}</div>
          </div>
          ${sub.tipologia ? `
            <span class="tipologia-badge ${sub.tipologia === '2%' ? 'ritenuta' : 'subappalto'}">
              ${sub.tipologia}
            </span>
          ` : ''}
        </div>
        
        <div class="sub-info-grid">
    `;

    // P.IVA
    if (sub.partita_iva) {
      html += `
        <div class="info-item">
          <span class="info-label">P.IVA:</span>
          <span class="info-value">${sub.partita_iva}</span>
        </div>
      `;
    }

    // Codice Fiscale
    if (sub.codice_fiscale) {
      html += `
        <div class="info-item">
          <span class="info-label">CF:</span>
          <span class="info-value">${sub.codice_fiscale}</span>
        </div>
      `;
    }

    // IBAN (full width)
    if (sub.iban) {
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">IBAN:</span>
          <span class="iban-value">${sub.iban}</span>
        </div>
      `;
    }

    // Indirizzo (full width)
    if (sub.indirizzo) {
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">Indirizzo:</span>
          <span class="info-value">${sub.indirizzo}</span>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Cantieri Box (solo se mostraCantieri è true)
    if (mostraCantieri && sub.cantieri_ids && sub.cantieri_ids.length > 0) {
      const nomiCantieri = sub.cantieri_ids
        .map(id => cantieri.find(c => c.id === id)?.nome || 'N/A')
        .filter(Boolean);

      if (nomiCantieri.length > 0) {
        html += `
          <div class="cantieri-box">
            <div style="font-weight: bold; margin-bottom: 5px;">🏗️ Cantieri Assegnati</div>
            <div>
              ${nomiCantieri.map(nome => `<span class="cantiere-tag">${nome}</span>`).join('')}
            </div>
          </div>
        `;
      }
    }

    // Contatti Box
    if (sub.email || sub.pec || sub.telefono) {
      html += `
        <div class="contatti-box">
          <div style="font-weight: bold; margin-bottom: 5px;">📞 Contatti</div>
      `;

      if (sub.email) {
        html += `
          <div class="contatti-item">
            <span>📧</span>
            <span>${sub.email}</span>
          </div>
        `;
      }

      if (sub.pec) {
        html += `
          <div class="contatti-item">
            <span>📨</span>
            <span>PEC: ${sub.pec}</span>
          </div>
        `;
      }

      if (sub.telefono) {
        html += `
          <div class="contatti-item">
            <span>☎️</span>
            <span>${sub.telefono}</span>
          </div>
        `;
      }

      html += `</div>`; // Chiudi contatti-box
    }

    // Note
    if (sub.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${sub.note}
        </div>
      `;
    }

    html += `</div>`; // Chiudi subappaltatore-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER CANTIERE
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Ordina cantieri per nome
    const cantieriOrdinati = Object.keys(subappaltatoriPerCantiere)
      .map(id => cantieri.find(c => c.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    cantieriOrdinati.forEach(cantiere => {
      const subappaltatoriCantiere = subappaltatoriPerCantiere[cantiere.id];
      
      // Ordina subappaltatori per ragione sociale
      subappaltatoriCantiere.sort((a, b) => 
        (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '')
      );

      html += `
        <div class="cantiere-section">
          <div class="cantiere-header">
            🏗️ ${cantiere.nome} (${subappaltatoriCantiere.length} subappaltatori)
          </div>
      `;

      subappaltatoriCantiere.forEach(s => {
        // Non mostra i cantieri nella card perché siamo già raggruppati per cantiere
        html += generateSubappaltatoreCard(s, false);
      });

      html += `</div>`; // Chiudi cantiere-section
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
    title: '🏢 Elenco Subappaltatori',
    subtitle: null,
    content: contentHTML,
    customColor: '#f59e0b',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Elenco_Subappaltatori');
};