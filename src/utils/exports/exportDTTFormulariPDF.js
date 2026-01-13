// src/utils/exports/exportDTTFormulariPDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con DTT/Formulari raggruppati per fornitore
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.dttFormulari - Array fatture
 * @param {Array} params.fornitori - Array fornitori
 * @param {Array} params.cantieri - Array cantieri
 */
export const exportDTTFormulariPDF = (params) => {
  const { dttFormulari, fornitori, cantieri } = params;

  // ========================================
  // CSS CUSTOM PER DTT/FORMULARI
  // ========================================
  const customStyles = `
    .fornitore-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .fornitore-header {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%) !important;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fattura-card {
      background: #f9fafb !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fattura-header {
      background: white !important;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .fattura-numero {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .fattura-info {
      font-size: 11px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .documenti-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 12px;
    }
    
    .documento-item {
      padding: 10px;
      border-radius: 6px;
      border: 2px solid;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .documento-ricevuto {
      background: #d1fae5 !important;
      border-color: #10b981 !important;
    }
    
    .documento-mancante {
      background: #fee2e2 !important;
      border-color: #ef4444 !important;
    }
    
    .documento-icon {
      font-size: 16px;
      margin-right: 8px;
    }
    
    .documento-status {
      font-weight: bold;
      font-size: 10px;
    }
    
    .status-ricevuto {
      color: #065f46;
    }
    
    .status-mancante {
      color: #991b1b;
    }
    
    .stato-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      display: inline-block;
      -webkit-print-color-adjust: exact !important;
    }
    
    .stato-completo {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }
    
    .stato-parziale {
      background: #fed7aa !important;
      color: #92400e !important;
    }
    
    .stato-nessuno {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }
    
    .riepilogo-generale {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%) !important;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
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
    
    .note-box {
      background: #fef3c7 !important;
      padding: 10px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin-top: 10px;
      font-size: 11px;
      -webkit-print-color-adjust: exact !important;
    }
  `;

  // ========================================
  // CALCOLA STATO FATTURA
  // ========================================
  const calcolaStatoFattura = (fattura) => {
    const documenti = fattura.documenti || [];
    if (documenti.length === 0) return { label: 'Nessun documento', classe: 'stato-nessuno', mancanti: 0, totale: 0 };
    
    const mancanti = documenti.filter(d => !d.ricevuto).length;
    const totale = documenti.length;
    
    if (mancanti === 0) return { label: 'Completo', classe: 'stato-completo', mancanti, totale };
    if (mancanti === totale) return { label: 'Tutto mancante', classe: 'stato-nessuno', mancanti, totale };
    return { label: `${mancanti}/${totale} mancanti`, classe: 'stato-parziale', mancanti, totale };
  };

  // ========================================
  // RAGGRUPPA PER FORNITORE
  // ========================================
  const fatturePerFornitore = {};
  
  dttFormulari.forEach(f => {
    if (!fatturePerFornitore[f.fornitore_id]) {
      fatturePerFornitore[f.fornitore_id] = [];
    }
    fatturePerFornitore[f.fornitore_id].push(f);
  });

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  let totaleFatture = dttFormulari.length;
  let totaleDocumenti = 0;
  let totaleRicevuti = 0;
  let totaleMancanti = 0;
  let totaleDTT = 0;
  let totaleFormulari = 0;

  dttFormulari.forEach(f => {
    (f.documenti || []).forEach(d => {
      totaleDocumenti++;
      if (d.ricevuto) totaleRicevuti++;
      else totaleMancanti++;
      if (d.tipo === 'dtt') totaleDTT++;
      if (d.tipo === 'formulario') totaleFormulari++;
    });
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
      <p><strong>Fornitori con fatture:</strong> ${Object.keys(fatturePerFornitore).length}</p>
      <p><strong>Totale fatture:</strong> ${totaleFatture}</p>
    </div>
  `;

  // ========================================
  // RIEPILOGO GENERALE
  // ========================================
  const riepilogoGenerale = `
    <div class="riepilogo-generale">
      <h2 style="margin-top: 0; font-size: 18px;">📊 Riepilogo Generale DTT/Formulari</h2>
      <div class="riepilogo-grid">
        <div class="riepilogo-card">
          <div class="riepilogo-label">Fatture</div>
          <div class="riepilogo-valore">${totaleFatture}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">Tot. Documenti</div>
          <div class="riepilogo-valore">${totaleDocumenti}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">⚠️ Mancanti</div>
          <div class="riepilogo-valore" style="color: #dc2626;">${totaleMancanti}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">✅ Ricevuti</div>
          <div class="riepilogo-valore" style="color: #059669;">${totaleRicevuti}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">🚛 DTT</div>
          <div class="riepilogo-valore">${totaleDTT}</div>
        </div>
        <div class="riepilogo-card">
          <div class="riepilogo-label">♻️ Formulari</div>
          <div class="riepilogo-valore">${totaleFormulari}</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // GENERA SEZIONI FORNITORI
  // ========================================
  const generateSezioniFornitori = () => {
    let html = '';

    // Ordina fornitori per nome
    const fornitoriOrdinati = Object.keys(fatturePerFornitore)
      .map(fornId => fornitori.find(f => f.id === fornId))
      .filter(Boolean)
      .sort((a, b) => (a.ragione_sociale || '').localeCompare(b.ragione_sociale || ''));

    fornitoriOrdinati.forEach(fornitore => {
      const fattureFornitore = fatturePerFornitore[fornitore.id];

      html += `
        <div class="fornitore-section">
          <div class="fornitore-header">
            🏢 ${fornitore.ragione_sociale}
          </div>
      `;

      // Ordina fatture per numero decrescente
      const fattureOrdinate = fattureFornitore.sort((a, b) => {
        return (b.numero_fattura || '').localeCompare(a.numero_fattura || '', undefined, { numeric: true });
      });

      fattureOrdinate.forEach(fattura => {
        const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
        const stato = calcolaStatoFattura(fattura);
        const documenti = fattura.documenti || [];

        html += `
          <div class="fattura-card">
            <div class="fattura-header">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span class="fattura-numero">Fattura ${fattura.numero_fattura}</span>
                  <span class="stato-badge ${stato.classe}" style="margin-left: 10px;">${stato.label}</span>
                </div>
                <div class="fattura-info">
                  ${formatDate(fattura.data_fattura)}${cantiere ? ` • ${cantiere.nome}` : ''}
                </div>
              </div>
            </div>
        `;

        // Lista documenti
        if (documenti.length > 0) {
          html += `<div class="documenti-grid">`;

          documenti.forEach(doc => {
            const iconMap = {
              'dtt': '🚛',
              'formulario': '♻️',
              'altro': '📄'
            };

            html += `
              <div class="documento-item ${doc.ricevuto ? 'documento-ricevuto' : 'documento-mancante'}">
                <div style="display: flex; align-items: center; flex: 1;">
                  <span class="documento-icon">${iconMap[doc.tipo] || '📄'}</span>
                  <div style="flex: 1;">
                    <div style="font-weight: bold;">${doc.descrizione || doc.numeroDocumento || 'Documento'}</div>
                    ${doc.numeroDocumento && doc.descrizione ? `<div style="font-size: 9px; color: #6b7280; font-family: monospace;">${doc.numeroDocumento}</div>` : ''}
                  </div>
                </div>
                <span class="documento-status ${doc.ricevuto ? 'status-ricevuto' : 'status-mancante'}">
                  ${doc.ricevuto ? '✅ ' + formatDate(doc.dataRicezione) : '❌ Mancante'}
                </span>
              </div>
            `;
          });

          html += `</div>`;
        } else {
          html += `
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;">
              Nessun documento registrato
            </div>
          `;
        }

        // Note
        if (fattura.note) {
          html += `
            <div class="note-box">
              <strong>📝 Note:</strong> ${fattura.note}
            </div>
          `;
        }

        html += `</div>`; // Chiudi fattura-card
      });

      html += `</div>`; // Chiudi fornitore-section
    });

    return html;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    riepilogoGenerale +
    generateSezioniFornitori();

  const htmlDocument = generateCompleteHTML({
    title: '📋 Report DTT / Formulari',
    subtitle: null,
    content: contentHTML,
    customColor: '#06b6d4',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Report_DTT_Formulari');
};