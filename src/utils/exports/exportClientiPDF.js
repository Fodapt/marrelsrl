// src/utils/exports/exportClientiPDF.js
import {
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con elenco clienti
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.clienti - Array clienti
 */
export const exportClientiPDF = (params) => {
  const { clienti } = params;

  // ========================================
  // CSS CUSTOM PER CLIENTI
  // ========================================
  const customStyles = `
    .cliente-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cliente-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .cliente-nome {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .cliente-info-grid {
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
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
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
  // CALCOLA STATISTICHE
  // ========================================
  const conIBAN = clienti.filter(c => c.iban).length;
  const conEmail = clienti.filter(c => c.email).length;
  const conPEC = clienti.filter(c => c.pec).length;
  const conTelefono = clienti.filter(c => c.telefono || c.cellulare).length;

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
      <p><strong>Totale clienti:</strong> ${clienti.length}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Clienti</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Clienti</div>
          <div class="riepilogo-valore">${clienti.length}</div>
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
        <div class="riepilogo-card">
          <div class="riepilogo-label">Con Telefono</div>
          <div class="riepilogo-valore">${conTelefono}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA CARD CLIENTE
  // ========================================
  const generateClienteCard = (cliente) => {
    let html = `
      <div class="cliente-card">
        <div class="cliente-header">
          <div>
            <div class="cliente-nome">${cliente.ragione_sociale}</div>
          </div>
        </div>
        
        <div class="cliente-info-grid">
    `;

    // P.IVA
    if (cliente.partita_iva) {
      html += `
        <div class="info-item">
          <span class="info-label">P.IVA:</span>
          <span class="info-value">${cliente.partita_iva}</span>
        </div>
      `;
    }

    // Codice Fiscale
    if (cliente.codice_fiscale) {
      html += `
        <div class="info-item">
          <span class="info-label">CF:</span>
          <span class="info-value">${cliente.codice_fiscale}</span>
        </div>
      `;
    }

    // Referente
    if (cliente.referente) {
      html += `
        <div class="info-item">
          <span class="info-label">Referente:</span>
          <span class="info-value">${cliente.referente}</span>
        </div>
      `;
    }

    // Sito Web
    if (cliente.sito_web) {
      html += `
        <div class="info-item">
          <span class="info-label">Sito:</span>
          <span class="info-value">${cliente.sito_web}</span>
        </div>
      `;
    }

    // IBAN (full width)
    if (cliente.iban) {
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">IBAN:</span>
          <span class="iban-value">${cliente.iban}</span>
        </div>
      `;
    }

    // Indirizzo (full width)
    if (cliente.indirizzo || cliente.citta) {
      let indirizzo = '';
      if (cliente.indirizzo) indirizzo += cliente.indirizzo;
      if (cliente.cap) indirizzo += `, ${cliente.cap}`;
      if (cliente.citta) indirizzo += ` ${cliente.citta}`;
      if (cliente.provincia) indirizzo += ` (${cliente.provincia})`;
      
      html += `
        <div class="info-item info-full-width">
          <span class="info-label">Indirizzo:</span>
          <span class="info-value">${indirizzo}</span>
        </div>
      `;
    }

    html += `</div>`; // Chiudi info-grid

    // Contatti Box
    if (cliente.email || cliente.pec || cliente.telefono || cliente.cellulare) {
      html += `
        <div class="contatti-box">
          <div style="font-weight: bold; margin-bottom: 5px;">📞 Contatti</div>
      `;

      if (cliente.email) {
        html += `
          <div class="contatti-item">
            <span>📧</span>
            <span>${cliente.email}</span>
          </div>
        `;
      }

      if (cliente.pec) {
        html += `
          <div class="contatti-item">
            <span>📨</span>
            <span>PEC: ${cliente.pec}</span>
          </div>
        `;
      }

      if (cliente.telefono) {
        html += `
          <div class="contatti-item">
            <span>☎️</span>
            <span>${cliente.telefono}</span>
          </div>
        `;
      }

      if (cliente.cellulare) {
        html += `
          <div class="contatti-item">
            <span>📱</span>
            <span>${cliente.cellulare}</span>
          </div>
        `;
      }

      html += `</div>`; // Chiudi contatti-box
    }

    // Note
    if (cliente.note) {
      html += `
        <div class="note-box">
          <strong>📝 Note:</strong> ${cliente.note}
        </div>
      `;
    }

    html += `</div>`; // Chiudi cliente-card

    return html;
  };

  // ========================================
  // GENERA LISTA CLIENTI
  // ========================================
  const generateListaClienti = () => {
    let html = '';

    // Ordina clienti per ragione sociale
    const clientiOrdinati = [...clienti].sort((a, b) => 
      (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '')
    );

    clientiOrdinati.forEach(c => {
      html += generateClienteCard(c);
    });

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    riepilogoGenerale +
    generateListaClienti();

  const htmlDocument = generateCompleteHTML({
    title: '👔 Elenco Clienti',
    subtitle: null,
    content: contentHTML,
    customColor: '#2563eb',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Elenco_Clienti');
};