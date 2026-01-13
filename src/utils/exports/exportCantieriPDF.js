// src/utils/exports/exportCantieriPDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con cantieri raggruppati per stato
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.cantieri - Array cantieri
 */
export const exportCantieriPDF = (params) => {
  const { cantieri } = params;

  // ========================================
  // CSS CUSTOM PER CANTIERI
  // ========================================
  const customStyles = `
    .stato-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .stato-header {
      padding: 15px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: white;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-header.pianificato {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    }
    
    .stato-header.in_corso {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    }
    
    .stato-header.sospeso {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
    }
    
    .stato-header.completato {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
    }
    
    .stato-header.annullato {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    }
    
    .cantiere-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .cantiere-header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .cantiere-nome {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .cantiere-indirizzo {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .info-item {
      font-size: 10px;
    }
    
    .info-label {
      color: #6b7280;
      font-weight: bold;
    }
    
    .info-value {
      color: #1f2937;
    }
    
    .sezione-contatti {
      background: #f9fafb !important;
      padding: 12px;
      border-radius: 6px;
      margin-top: 15px;
      border-top: 2px solid #e5e7eb;
      -webkit-print-color-adjust: exact !important;
    }
    
    .contatti-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    
    .contatto-box {
      background: white !important;
      padding: 10px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .contatto-ruolo {
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    
    .contatto-nome {
      color: #1f2937;
      margin-bottom: 3px;
    }
    
    .contatto-info {
      color: #6b7280;
      font-size: 9px;
    }
    
    .badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      display: inline-block;
      margin-left: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .badge.a_corpo {
      background: #dbeafe !important;
      color: #1e40af !important;
    }
    
    .badge.a_misura {
      background: #fef3c7 !important;
      color: #92400e !important;
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
  // RAGGRUPPA PER STATO
  // ========================================
  const cantieriPerStato = {
    pianificato: [],
    in_corso: [],
    sospeso: [],
    completato: [],
    annullato: []
  };
  
  cantieri.forEach(c => {
    const stato = c.stato || 'pianificato';
    if (cantieriPerStato[stato]) {
      cantieriPerStato[stato].push(c);
    }
  });

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  const totaleCantieri = cantieri.length;
  const totaleImportoLavori = cantieri.reduce((sum, c) => sum + (parseFloat(c.importo_lavori) || 0), 0);
  const totaleImportoContratti = cantieri.reduce((sum, c) => sum + (parseFloat(c.importo_contratto) || 0), 0);
  const totaleOneriSicurezza = cantieri.reduce((sum, c) => sum + (parseFloat(c.oneri_sicurezza) || 0), 0);

  const statoLabels = {
    pianificato: 'Pianificato',
    in_corso: 'In Corso',
    sospeso: 'Sospeso',
    completato: 'Completato',
    annullato: 'Annullato'
  };

  const statoIcons = {
    pianificato: '📋',
    in_corso: '🏗️',
    sospeso: '⏸️',
    completato: '✅',
    annullato: '❌'
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
      <p><strong>Totale cantieri:</strong> ${totaleCantieri}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">🏗️ Riepilogo Generale Cantieri</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Totale Cantieri</div>
          <div class="riepilogo-valore">${totaleCantieri}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Pianificati</div>
          <div class="riepilogo-valore">${cantieriPerStato.pianificato.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">In Corso</div>
          <div class="riepilogo-valore">${cantieriPerStato.in_corso.length}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Tot. Lavori</div>
          <div class="riepilogo-valore">${formatCurrency(totaleImportoLavori)}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Tot. Contratti</div>
          <div class="riepilogo-valore">${formatCurrency(totaleImportoContratti)}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA SEZIONI PER STATO
  // ========================================
  const generateSezioniStati = () => {
    let html = '';

    Object.keys(cantieriPerStato).forEach(stato => {
      const cantieris = cantieriPerStato[stato];
      
      if (cantieris.length === 0) return;

      html += `
        <div class="stato-section">
          <div class="stato-header ${stato}">
            ${statoIcons[stato]} ${statoLabels[stato]} (${cantieris.length})
          </div>
      `;

      // Ordina cantieri per nome
      const cantieriOrdinati = cantieris.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      cantieriOrdinati.forEach(cant => {
        html += `
          <div class="cantiere-card">
            <div class="cantiere-header">
              <div class="cantiere-nome">${cant.nome}</div>
              ${cant.indirizzo ? `<div class="cantiere-indirizzo">📍 ${cant.indirizzo}${cant.comune ? `, ${cant.comune}` : ''}${cant.provincia ? ` (${cant.provincia})` : ''}</div>` : ''}
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">CIG:</span>
                <span class="info-value">${cant.cig || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">CUP:</span>
                <span class="info-value">${cant.cup || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cassa Edile:</span>
                <span class="info-value">${cant.casse_edile || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Importo Lavori:</span>
                <span class="info-value">${cant.importo_lavori ? formatCurrency(cant.importo_lavori) : '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Importo Contratto:</span>
                <span class="info-value">${cant.importo_contratto ? formatCurrency(cant.importo_contratto) : '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipologia:</span>
                <span class="info-value">
                  ${cant.tipologia_lavoro === 'a_corpo' ? '<span class="badge a_corpo">📦 A Corpo</span>' : ''}
                  ${cant.tipologia_lavoro === 'a_misura' ? '<span class="badge a_misura">📏 A Misura</span>' : ''}
                  ${!cant.tipologia_lavoro ? '-' : ''}
                </span>
              </div>
              ${cant.oneri_sicurezza > 0 ? `
              <div class="info-item">
                <span class="info-label">Oneri Sicurezza:</span>
                <span class="info-value">${formatCurrency(cant.oneri_sicurezza)}</span>
              </div>
              ` : ''}
              ${cant.ribasso_asta > 0 ? `
              <div class="info-item">
                <span class="info-label">Ribasso d'Asta:</span>
                <span class="info-value">${parseFloat(cant.ribasso_asta).toFixed(2)}%</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Data Inizio:</span>
                <span class="info-value">${formatDate(cant.data_inizio)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fine Prevista:</span>
                <span class="info-value">${formatDate(cant.data_fine_prevista)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Com. DNLT:</span>
                <span class="info-value">${formatDate(cant.data_comunicazione_dnlt)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Scad. DNLT:</span>
                <span class="info-value">${formatDate(cant.scadenza_dnlt)}</span>
              </div>
            </div>
        `;

        // Sezione Contatti
        if (cant.rup_nome || cant.cse_nome || cant.dl_nome || cant.collaudatore_nome) {
          html += `
            <div class="sezione-contatti">
              <div style="font-weight: bold; font-size: 11px; color: #374151; margin-bottom: 8px;">👥 Contatti</div>
              <div class="contatti-grid">
          `;

          if (cant.rup_nome) {
            html += `
              <div class="contatto-box">
                <div class="contatto-ruolo">RUP - Responsabile Unico</div>
                <div class="contatto-nome">${cant.rup_nome}</div>
                ${cant.rup_email ? `<div class="contatto-info">✉️ ${cant.rup_email}</div>` : ''}
                ${cant.rup_telefono ? `<div class="contatto-info">📞 ${cant.rup_telefono}</div>` : ''}
                ${cant.rup_pec ? `<div class="contatto-info">📧 PEC: ${cant.rup_pec}</div>` : ''}
              </div>
            `;
          }

          if (cant.cse_nome) {
            html += `
              <div class="contatto-box">
                <div class="contatto-ruolo">CSE - Coord. Sicurezza</div>
                <div class="contatto-nome">${cant.cse_nome}</div>
                ${cant.cse_email ? `<div class="contatto-info">✉️ ${cant.cse_email}</div>` : ''}
                ${cant.cse_telefono ? `<div class="contatto-info">📞 ${cant.cse_telefono}</div>` : ''}
              </div>
            `;
          }

          if (cant.dl_nome) {
            html += `
              <div class="contatto-box">
                <div class="contatto-ruolo">DL - Direttore Lavori</div>
                <div class="contatto-nome">${cant.dl_nome}</div>
                ${cant.dl_email ? `<div class="contatto-info">✉️ ${cant.dl_email}</div>` : ''}
                ${cant.dl_telefono ? `<div class="contatto-info">📞 ${cant.dl_telefono}</div>` : ''}
              </div>
            `;
          }

          if (cant.collaudatore_nome) {
            html += `
              <div class="contatto-box">
                <div class="contatto-ruolo">Collaudatore</div>
                <div class="contatto-nome">${cant.collaudatore_nome}</div>
                ${cant.collaudatore_email ? `<div class="contatto-info">✉️ ${cant.collaudatore_email}</div>` : ''}
                ${cant.collaudatore_telefono ? `<div class="contatto-info">📞 ${cant.collaudatore_telefono}</div>` : ''}
              </div>
            `;
          }

          html += `
              </div>
            </div>
          `;
        }

        html += `</div>`; // Chiudi cantiere-card
      });

      html += `</div>`; // Chiudi stato-section
    });

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    riepilogoGenerale +
    generateSezioniStati();

  const htmlDocument = generateCompleteHTML({
    title: '🏗️ Report Cantieri',
    subtitle: null,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Report_Cantieri');
};