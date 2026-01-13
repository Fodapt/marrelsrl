// src/utils/exports/exportEconomicoCantiererPDF.js
import {
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con analisi economica cantiere
 * @param {Object} params - Parametri per l'export
 * @param {Object} params.cantiere - Oggetto cantiere selezionato
 * @param {Object} params.economico - Dati economici calcolati
 */
export const exportEconomicoCantiererPDF = (params) => {
  const { cantiere, economico } = params;

  if (!cantiere || !economico) {
    alert('⚠️ Seleziona un cantiere per esportare il report economico');
    return;
  }

  // ========================================
  // CSS CUSTOM PER ECONOMICO CANTIERE
  // ========================================
  const customStyles = `
    .economico-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-header {
      padding: 15px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      color: white;
      -webkit-print-color-adjust: exact !important;
    }
    
    .section-header.ricavi {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    }
    
    .section-header.costi {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    }
    
    .section-header.margine {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    }
    
    .section-header.margine.negativo {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
    }
    
    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .economico-card {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .economico-card.verde {
      background: #f0fdf4 !important;
      border-color: #10b981;
    }
    
    .economico-card.arancione {
      background: #fff7ed !important;
      border-color: #f59e0b;
    }
    
    .economico-card.rosso {
      background: #fef2f2 !important;
      border-color: #ef4444;
    }
    
    .card-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .card-valore {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .card-subtitle {
      font-size: 9px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .costi-list {
      background: white !important;
      border-radius: 8px;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
    }
    
    .costo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .costo-item:last-child {
      border-bottom: none;
    }
    
    .costo-label {
      font-size: 12px;
      color: #4b5563;
      font-weight: 500;
    }
    
    .costo-subtitle {
      font-size: 9px;
      color: #9ca3af;
      margin-left: 8px;
    }
    
    .costo-valore {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .costo-totale {
      background: #fee2e2 !important;
      border-top: 3px solid #dc2626;
      padding: 15px;
      margin-top: 10px;
      border-radius: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    
    .margine-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .margine-card {
      background: white !important;
      border: 3px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      -webkit-print-color-adjust: exact !important;
    }
    
    .margine-card.negativo {
      border-color: #dc2626;
    }
    
    .margine-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .margine-valore {
      font-size: 40px;
      font-weight: bold;
      color: #1f2937;
      line-height: 1;
    }
    
    .margine-valore.positivo {
      color: #2563eb;
    }
    
    .margine-valore.negativo {
      color: #dc2626;
    }
    
    .barra-progresso {
      height: 30px;
      background: #f3f4f6 !important;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
      position: relative;
      -webkit-print-color-adjust: exact !important;
    }
    
    .barra-fill {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: white;
      -webkit-print-color-adjust: exact !important;
    }
    
    .barra-fill.ricavi {
      background: #10b981 !important;
    }
    
    .barra-fill.costi {
      background: #ef4444 !important;
    }
    
    .legenda {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 10px;
      font-size: 10px;
    }
    
    .legenda-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .legenda-box {
      width: 15px;
      height: 15px;
      border-radius: 3px;
      -webkit-print-color-adjust: exact !important;
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
      background: #fff7ed !important;
      border-left-color: #f59e0b;
    }
    
    .alert-box.success {
      background: #f0fdf4 !important;
      border-left-color: #10b981;
    }
  `;

  // ========================================
  // INFO BOX
  // ========================================
  const infoBox = `
    <div class="info-box">
      <p><strong>Azienda:</strong> Marrel S.r.l.</p>
      <p><strong>Cantiere:</strong> ${cantiere.nome}</p>
      <p><strong>Data report:</strong> ${new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}</p>
      ${cantiere.committente ? `<p><strong>Committente:</strong> ${cantiere.committente}</p>` : ''}
      ${cantiere.stato ? `<p><strong>Stato:</strong> ${cantiere.stato}</p>` : ''}
    </div>
  `;

  // ========================================
  // ALERT BOX
  // ========================================
  let alertBox = '';
  if (economico.margine < 0) {
    alertBox = `
      <div class="alert-box">
        <strong>⚠️ ATTENZIONE - Margine Negativo</strong>
        <p style="margin: 8px 0 0 0;">Il cantiere sta registrando una <strong>perdita di € ${Math.abs(economico.margine).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. È necessario verificare i costi e valutare azioni correttive.</p>
      </div>
    `;
  } else if (economico.marginePerc < 10) {
    alertBox = `
      <div class="alert-box warning">
        <strong>⚠️ Margine Ridotto</strong>
        <p style="margin: 8px 0 0 0;">Il margine del ${economico.marginePerc.toFixed(1)}% è inferiore al 10%. Monitorare attentamente l'evoluzione dei costi.</p>
      </div>
    `;
  } else if (economico.daIncassare > economico.totaleRicavi * 0.5) {
    alertBox = `
      <div class="alert-box warning">
        <strong>⚠️ Crediti Elevati</strong>
        <p style="margin: 8px 0 0 0;">Oltre il 50% del fatturato (€ ${economico.daIncassare.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) è ancora da incassare. Sollecitare i pagamenti.</p>
      </div>
    `;
  } else if (economico.marginePerc >= 20) {
    alertBox = `
      <div class="alert-box success">
        <strong>✅ Ottimo Margine</strong>
        <p style="margin: 8px 0 0 0;">Il cantiere registra un margine eccellente del ${economico.marginePerc.toFixed(1)}% (€ ${economico.margine.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).</p>
      </div>
    `;
  }

  // ========================================
  // SEZIONE RICAVI
  // ========================================
  const sezioneRicavi = `
    <div class="economico-section">
      <div class="section-header ricavi">
        💰 RICAVI
      </div>
      <div class="card-grid">
        <div class="economico-card verde">
          <div class="card-label">FATTURATO TOTALE</div>
          <div class="card-valore">€ ${economico.totaleRicavi.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="card-subtitle">${economico.numeroFatture} fatture emesse</div>
        </div>
        <div class="economico-card verde">
          <div class="card-label">INCASSATO</div>
          <div class="card-valore">€ ${economico.totaleIncassato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="card-subtitle">${((economico.totaleIncassato / economico.totaleRicavi) * 100).toFixed(1)}% del totale</div>
        </div>
        <div class="economico-card arancione">
          <div class="card-label">DA INCASSARE</div>
          <div class="card-valore">€ ${economico.daIncassare.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="card-subtitle">${((economico.daIncassare / economico.totaleRicavi) * 100).toFixed(1)}% del totale</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // SEZIONE COSTI
  // ========================================
  const sezioneCosti = `
    <div class="economico-section">
      <div class="section-header costi">
        💸 COSTI
      </div>
      <div class="costi-list">
        <div class="costo-item">
          <div>
            <span class="costo-label">Fornitori</span>
            <span class="costo-subtitle">(da Contabilità)</span>
          </div>
          <span class="costo-valore">€ ${economico.costiFornitori.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="costo-item">
          <div>
            <span class="costo-label">Manodopera</span>
            <span class="costo-subtitle">(${economico.numeroLavoratori} lavoratori, ${economico.numeroPaghe} paghe)</span>
          </div>
          <span class="costo-valore">€ ${economico.costiManodopera.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="costo-item">
          <div>
            <span class="costo-label">Cassa Edile</span>
            <span class="costo-subtitle">(contributi previdenziali)</span>
          </div>
          <span class="costo-valore">€ ${economico.costiCassa.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="costo-totale">
        <div class="costo-item" style="border: none; padding: 0;">
          <span class="costo-label" style="font-size: 16px; font-weight: bold; color: #991b1b;">TOTALE COSTI</span>
          <span class="costo-valore" style="font-size: 24px; color: #991b1b;">€ ${economico.totaleCosti.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // BREAKDOWN COSTI (Grafico a Barre)
  // ========================================
  const percFornitori = (economico.costiFornitori / economico.totaleCosti) * 100;
  const percManodopera = (economico.costiManodopera / economico.totaleCosti) * 100;
  const percCassa = (economico.costiCassa / economico.totaleCosti) * 100;

  const breakdownCosti = `
    <div style="margin: 20px 0;">
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 10px; color: #4b5563;">📊 Composizione Costi</div>
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
          <span>Fornitori</span>
          <span>${percFornitori.toFixed(1)}%</span>
        </div>
        <div style="height: 20px; background: #f3f4f6; border-radius: 10px; overflow: hidden;">
          <div style="height: 100%; width: ${percFornitori}%; background: #f59e0b; -webkit-print-color-adjust: exact;"></div>
        </div>
      </div>
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
          <span>Manodopera</span>
          <span>${percManodopera.toFixed(1)}%</span>
        </div>
        <div style="height: 20px; background: #f3f4f6; border-radius: 10px; overflow: hidden;">
          <div style="height: 100%; width: ${percManodopera}%; background: #ef4444; -webkit-print-color-adjust: exact;"></div>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
          <span>Cassa Edile</span>
          <span>${percCassa.toFixed(1)}%</span>
        </div>
        <div style="height: 20px; background: #f3f4f6; border-radius: 10px; overflow: hidden;">
          <div style="height: 100%; width: ${percCassa}%; background: #dc2626; -webkit-print-color-adjust: exact;"></div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // SEZIONE MARGINE
  // ========================================
  const classeMargine = economico.margine >= 0 ? 'margine' : 'margine negativo';
  const classeValore = economico.margine >= 0 ? 'positivo' : 'negativo';

  const sezioneMargine = `
    <div class="economico-section">
      <div class="section-header ${classeMargine}">
        📈 MARGINE
      </div>
      <div class="margine-grid">
        <div class="margine-card ${economico.margine < 0 ? 'negativo' : ''}">
          <div class="margine-label">MARGINE €</div>
          <div class="margine-valore ${classeValore}">
            € ${economico.margine.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div class="margine-card ${economico.margine < 0 ? 'negativo' : ''}">
          <div class="margine-label">MARGINE %</div>
          <div class="margine-valore ${classeValore}">
            ${economico.marginePerc.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // CONFRONTO RICAVI vs COSTI (Barra)
  // ========================================
  const maxValore = Math.max(economico.totaleRicavi, economico.totaleCosti);
  const percRicavi = (economico.totaleRicavi / maxValore) * 100;
  const percCosti = (economico.totaleCosti / maxValore) * 100;

  const confrontoVisuale = `
    <div style="margin: 30px 0;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #1f2937; text-align: center;">📊 Ricavi vs Costi</div>
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; font-weight: bold; color: #059669;">
          <span>RICAVI</span>
          <span>€ ${economico.totaleRicavi.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style="height: 30px; background: #f3f4f6; border-radius: 15px; overflow: hidden;">
          <div style="height: 100%; width: ${percRicavi}%; background: #10b981; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; -webkit-print-color-adjust: exact;">
            ${percRicavi.toFixed(1)}%
          </div>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; font-weight: bold; color: #991b1b;">
          <span>COSTI</span>
          <span>€ ${economico.totaleCosti.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style="height: 30px; background: #f3f4f6; border-radius: 15px; overflow: hidden;">
          <div style="height: 100%; width: ${percCosti}%; background: #ef4444; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; -webkit-print-color-adjust: exact;">
            ${percCosti.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    alertBox +
    sezioneRicavi +
    sezioneCosti +
    breakdownCosti +
    sezioneMargine +
    confrontoVisuale;

  const htmlDocument = generateCompleteHTML({
    title: '📊 Report Economico Cantiere',
    subtitle: cantiere.nome,
    content: contentHTML,
    customColor: '#3b82f6',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, `Economico_${cantiere.nome.replace(/\s+/g, '_')}`);
};