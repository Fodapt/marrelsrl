// src/utils/exports/exportFornitoriPDF.js
import {
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco fornitori
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.fornitori - Array fornitori
 */
export const exportFornitoriPDF = (params) => {
  const { fornitori } = params;

  // ========================================
  // CSS CUSTOM PER FORNITORI
  // ========================================
  const customStyles = `
    .categoria-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .categoria-header {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fornitore-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fornitore-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .fornitore-nome {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .categoria-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      background: #dbeafe !important;
      color: #1e40af !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fornitore-info-grid {
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
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
  // RAGGRUPPA PER CATEGORIA
  // ========================================
  const fornitoriPerCategoria = {};
  const senzaCategoria = [];

  fornitori.forEach(f => {
    if (f.categoria) {
      if (!fornitoriPerCategoria[f.categoria]) {
        fornitoriPerCategoria[f.categoria] = [];
      }
      fornitoriPerCategoria[f.categoria].push(f);
    } else {
      senzaCategoria.push(f);
    }
  });

  // Ordina categorie alfabeticamente
  const categorieOrdinate = Object.keys(fornitoriPerCategoria).sort();

  // ========================================
  // CALCOLA STATISTICHE
  // ========================================
  const totaleCategorie = categorieOrdinate.length + (senzaCategoria.length > 0 ? 1 : 0);
  const conIBAN = fornitori.filter(f => f.iban).length;
  const conEmail = fornitori.filter(f => f.email).length;
  const conPEC = fornitori.filter(f => f.pec).length;

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
      <p><strong>Totale fornitori:</strong> ${fornitori.length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Fornitori</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Fornitori</div>
          <div class="riepilogo-valore">${fornitori.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Categorie</div>
          <div class="riepilogo-valore">${totaleCategorie}</div>
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
  // GENERA CARD FORNITORE
  // ========================================
  const generateFornitoreCard = (fornitore) => {
    let html = `
      <div class="fornitore-card">
        <div class="fornitore-header">
          <div>
            <div class="fornitore-nome">${fornitore.ragione_sociale}</div>
            ${fornitore.categoria ? `<span class="categoria-badge">${fornitore.categoria}</span>` : ''}
          </div>
        </div>
        
        <div class="fornitore-info-grid">
    `;

    // P.IVA
    if (fornitore.partita_iva) {
      html += `
        <div class="info-item">
          <span class="info-label">P.IVA:</span>
          <span class="info-value">${fornitore.partita_iva}</span>
        </div>
      `;
    }

    // Codice Fiscale
    if (fornitore.codice_fiscale) {
      html += `
        <div class="info-item">
          <span class="info-label">CF:</span>
          <span class="info-value">${fornitore.codice_fiscale}</span>
        </div>
      `;
    }

    // Referente
    if (fornitore.referente) {
      html += `
        <div class="info-item">
          <span class="info-label">Referente:</span>
          <span class="info-value">${fornitore.referente}</span>
        </div>
      `;
    }

    // Sito Web
    if (fornitore.sito_web) {
      html += `
        <div class="info-item">
          <span class="info-label">Sito:</span>
          <span class="info-value">${fornitore.sito_web}</span>
        </div>
      `;
    }

    // IBAN (full width)
    if (fornitore.iban) {
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">IBAN:</span>
          <span class="iban-value">${fornitore.iban}</span>
        </div>
      `;
    }

    // Indirizzo (full width)
    if (fornitore.indirizzo || fornitore.citta) {
      let indirizzo = '';
      if (fornitore.indirizzo) indirizzo += fornitore.indirizzo;
      if (fornitore.cap) indirizzo += `, ${fornitore.cap}`;
      if (fornitore.citta) indirizzo += ` ${fornitore.citta}`;
      if (fornitore.provincia) indirizzo += ` (${fornitore.provincia})`;
      
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">Indirizzo:</span>
          <span class="info-value">${indirizzo}</span>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Contatti Box
    if (fornitore.email || fornitore.pec || fornitore.telefono || fornitore.cellulare) {
      html += `
        <div class="contatti-box">
          <div style="font-weight: bold; margin-bottom: 5px;">📞 Contatti</div>
      `;

      if (fornitore.email) {
        html += `
          <div class="contatti-item">
            <span>📧</span>
            <span>${fornitore.email}</span>
          </div>
        `;
      }

      if (fornitore.pec) {
        html += `
          <div class="contatti-item">
            <span>📨</span>
            <span>PEC: ${fornitore.pec}</span>
          </div>
        `;
      }

      if (fornitore.telefono) {
        html += `
          <div class="contatti-item">
            <span>☎️</span>
            <span>${fornitore.telefono}</span>
          </div>
        `;
      }

      if (fornitore.cellulare) {
        html += `
          <div class="contatti-item">
            <span>📱</span>
            <span>${fornitore.cellulare}</span>
          </div>
        `;
      }

      html += `</div>`; // Chiudi contatti-box
    }

    // Note
    if (fornitore.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${fornitore.note}
        </div>
      `;
    }

    html += `</div>`; // Chiudi fornitore-card

    return html;
  };

  // ========================================
  // GENERA SEZIONI PER CATEGORIA
  // ========================================
  const generateSezioni = () => {
    let html = '';

    // Categorie ordinate
    categorieOrdinate.forEach(categoria => {
      const fornitoriCategoria = fornitoriPerCategoria[categoria];
      
      // Ordina fornitori per ragione sociale
      fornitoriCategoria.sort((a, b) => 
        (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '')
      );

      html += `
        <div class="categoria-section">
          <div class="categoria-header">
            🏪 ${categoria} (${fornitoriCategoria.length})
          </div>
      `;

      fornitoriCategoria.forEach(f => {
        html += generateFornitoreCard(f);
      });

      html += `</div>`; // Chiudi categoria-section
    });

    // Fornitori senza categoria
    if (senzaCategoria.length > 0) {
      senzaCategoria.sort((a, b) => 
        (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '')
      );

      html += `
        <div class="categoria-section">
          <div class="categoria-header">
            📋 Altri Fornitori (${senzaCategoria.length})
          </div>
      `;

      senzaCategoria.forEach(f => {
        html += generateFornitoreCard(f);
      });

      html += `</div>`; // Chiudi categoria-section
    }

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
    title: '🏪 Elenco Fornitori',
    subtitle: null,
    content: contentHTML,
    customColor: '#8b5cf6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Elenco_Fornitori');
};