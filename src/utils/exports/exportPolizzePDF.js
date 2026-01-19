// src/utils/exports/exportPolizzePDF.js

import { 
  formatDate, 
  formatCurrency, 
  formatDateTime,
  generateCompleteHTML, 
  openPrintWindow 
} from './exportHelpers';

/**
 * ================================================================
 * EXPORT ELENCO POLIZZE - PDF completo delle polizze assicurative
 * ================================================================
 */

export const exportPolizzePDF = (polizze, gare, filtri = {}) => {
  
  // ========================================
  // FILTRI APPLICATI
  // ========================================
  let polizzeFiltrate = [...polizze];
  const filtriApplicati = [];

  if (filtri.tipo) {
    polizzeFiltrate = polizzeFiltrate.filter(p => p.tipo === filtri.tipo);
    const tipiLabels = {
      'provvisoria': '🛡️ Provvisoria',
      'definitiva': '✅ Definitiva',
      'car': '🏗️ CAR'
    };
    filtriApplicati.push(`Tipo: ${tipiLabels[filtri.tipo]}`);
  }

  if (filtri.compagnia) {
    polizzeFiltrate = polizzeFiltrate.filter(p => p.compagnia === filtri.compagnia);
    filtriApplicati.push(`Compagnia: ${filtri.compagnia}`);
  }

  if (filtri.scadenza) {
    const oggi = new Date();
    polizzeFiltrate = polizzeFiltrate.filter(p => {
      if (!p.data_scadenza) return false;
      const scadenza = new Date(p.data_scadenza);
      const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      
      switch (filtri.scadenza) {
        case 'scadute':
          return giorni < 0;
        case 'in_scadenza':
          return giorni >= 0 && giorni <= 30;
        case 'attive':
          return giorni > 30;
        default:
          return true;
      }
    });
    
    const scadenzeLabels = {
      'scadute': '🚨 Scadute',
      'in_scadenza': '⚠️ In scadenza (≤30gg)',
      'attive': '✅ Attive'
    };
    filtriApplicati.push(`Scadenza: ${scadenzeLabels[filtri.scadenza]}`);
  }

  // ========================================
  // CALCOLI E STATISTICHE
  // ========================================
  const oggi = new Date();
  
  const statistiche = {
    totale: polizzeFiltrate.length,
    provvisorie: polizzeFiltrate.filter(p => p.tipo === 'provvisoria').length,
    definitive: polizzeFiltrate.filter(p => p.tipo === 'definitiva').length,
    car: polizzeFiltrate.filter(p => p.tipo === 'car').length,
    scadute: polizzeFiltrate.filter(p => {
      if (!p.data_scadenza) return false;
      return new Date(p.data_scadenza) < oggi;
    }).length,
    inScadenza: polizzeFiltrate.filter(p => {
      if (!p.data_scadenza) return false;
      const scadenza = new Date(p.data_scadenza);
      const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      return giorni >= 0 && giorni <= 30;
    }).length,
    importoTotale: polizzeFiltrate.reduce((sum, p) => sum + parseFloat(p.importo_garantito || 0), 0)
  };

  // Raggruppa per compagnia
  const perCompagnia = {};
  polizzeFiltrate.forEach(p => {
    if (!perCompagnia[p.compagnia]) {
      perCompagnia[p.compagnia] = {
        count: 0,
        importo: 0,
        polizze: []
      };
    }
    perCompagnia[p.compagnia].count++;
    perCompagnia[p.compagnia].importo += parseFloat(p.importo_garantito || 0);
    perCompagnia[p.compagnia].polizze.push(p);
  });

  // ========================================
  // STILI CUSTOM
  // ========================================
  const customStyles = `
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 25px 0;
    }

    .stat-card {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #3b82f6;
      text-align: center;
      page-break-inside: avoid;
    }

    .stat-label {
      color: #1e40af;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .stat-value {
      color: #1e3a8a;
      font-size: 28px;
      font-weight: bold;
    }

    .stat-card.alert {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%) !important;
      border-color: #ef4444;
    }

    .stat-card.alert .stat-label {
      color: #991b1b;
    }

    .stat-card.alert .stat-value {
      color: #dc2626;
    }

    .stat-card.warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
      border-color: #f59e0b;
    }

    .stat-card.warning .stat-label {
      color: #92400e;
    }

    .stat-card.warning .stat-value {
      color: #d97706;
    }

    .polizza-group {
      margin: 30px 0;
      page-break-inside: avoid;
    }

    .polizza-group-header {
      background: #7c3aed !important;
      color: white !important;
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .polizza-card {
      background: white !important;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 20px;
      page-break-inside: avoid;
    }

    .polizza-card:last-child {
      border-radius: 0 0 8px 8px;
    }

    .polizza-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f3f4f6;
    }

    .tipo-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .tipo-provvisoria {
      background: #dbeafe !important;
      color: #1e40af;
    }

    .tipo-definitiva {
      background: #d1fae5 !important;
      color: #065f46;
    }

    .tipo-car {
      background: #fef3c7 !important;
      color: #92400e;
    }

    .scadenza-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .scadenza-ok {
      background: #d1fae5 !important;
      color: #065f46;
    }

    .scadenza-warning {
      background: #fef3c7 !important;
      color: #92400e;
    }

    .scadenza-danger {
      background: #fee2e2 !important;
      color: #991b1b;
    }

    .info-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 15px 0;
    }

    .info-item {
      font-size: 11px;
    }

    .info-item-label {
      color: #6b7280;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 3px;
    }

    .info-item-value {
      color: #1f2937;
      font-weight: 600;
      font-size: 12px;
    }

    .gara-link {
      background: #f0fdf4 !important;
      padding: 10px;
      border-radius: 5px;
      border-left: 3px solid #10b981;
      margin-top: 10px;
      font-size: 11px;
    }

    .compagnia-summary {
      background: #faf5ff !important;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      border: 2px solid #7c3aed;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid;
    }

    .filtri-box {
      background: #fef3c7 !important;
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #f59e0b;
      margin: 20px 0;
      page-break-inside: avoid;
    }
  `;

  // ========================================
  // HEADER INFO
  // ========================================
  let filtriInfo = '';
  if (filtriApplicati.length > 0) {
    filtriInfo = `
      <div class="filtri-box">
        <strong style="color: #92400e;">🔍 Filtri Applicati:</strong>
        <span style="margin-left: 10px;">${filtriApplicati.join(' • ')}</span>
      </div>
    `;
  }

  // ========================================
  // STATISTICHE
  // ========================================
  const statsHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Totale Polizze</div>
        <div class="stat-value">${statistiche.totale}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">🛡️ Provvisorie</div>
        <div class="stat-value">${statistiche.provvisorie}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">✅ Definitive</div>
        <div class="stat-value">${statistiche.definitive}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">🏗️ CAR</div>
        <div class="stat-value">${statistiche.car}</div>
      </div>

      <div class="stat-card alert">
        <div class="stat-label">🚨 Scadute</div>
        <div class="stat-value">${statistiche.scadute}</div>
      </div>

      <div class="stat-card warning">
        <div class="stat-label">⚠️ In Scadenza</div>
        <div class="stat-value">${statistiche.inScadenza}</div>
      </div>

      <div class="stat-card" style="grid-column: span 2;">
        <div class="stat-label">💰 Importo Totale Garantito</div>
        <div class="stat-value" style="font-size: 24px;">${formatCurrency(statistiche.importoTotale)}</div>
      </div>
    </div>
  `;

  // ========================================
  // RIEPILOGO PER COMPAGNIA
  // ========================================
  const compagnieHTML = Object.entries(perCompagnia)
    .sort((a, b) => b[1].importo - a[1].importo)
    .map(([compagnia, dati]) => `
      <div class="compagnia-summary">
        <div>
          <strong style="color: #7c3aed; font-size: 14px;">${compagnia}</strong>
          <span style="color: #6b7280; margin-left: 15px; font-size: 11px;">
            ${dati.count} polizz${dati.count === 1 ? 'a' : 'e'}
          </span>
        </div>
        <div style="font-size: 16px; font-weight: bold; color: #7c3aed;">
          ${formatCurrency(dati.importo)}
        </div>
      </div>
    `).join('');

  const riepilogoCompagnie = `
    <h2 style="color: #7c3aed; margin-top: 40px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">
      📊 Riepilogo per Compagnia
    </h2>
    ${compagnieHTML}
  `;

  // ========================================
  // FUNZIONE CALCOLO SCADENZA
  // ========================================
  const calcolaScadenza = (dataScadenza) => {
    if (!dataScadenza) return { classe: '', testo: 'Non specificata' };
    
    const scadenza = new Date(dataScadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorni < 0) {
      return {
        classe: 'scadenza-danger',
        testo: `🚨 Scaduta da ${Math.abs(giorni)}gg`
      };
    } else if (giorni <= 15) {
      return {
        classe: 'scadenza-danger',
        testo: `🔥 ${giorni} giorni`
      };
    } else if (giorni <= 30) {
      return {
        classe: 'scadenza-warning',
        testo: `⚠️ ${giorni} giorni`
      };
    } else {
      return {
        classe: 'scadenza-ok',
        testo: `✅ ${giorni} giorni`
      };
    }
  };

  // ========================================
  // GRUPPI POLIZZE PER TIPO
  // ========================================
  const tipiPolizza = [
    { value: 'provvisoria', label: '🛡️ Polizze Provvisorie', color: '#3b82f6' },
    { value: 'definitiva', label: '✅ Polizze Definitive', color: '#10b981' },
    { value: 'car', label: '🏗️ Polizze CAR', color: '#f59e0b' }
  ];

  const gruppiPolizze = tipiPolizza.map(tipo => {
    const polizzeTipo = polizzeFiltrate.filter(p => p.tipo === tipo.value);
    
    if (polizzeTipo.length === 0) return '';

    const polizzeCards = polizzeTipo.map(polizza => {
      const gara = gare.find(g => g.id === polizza.gara_id);
      const scadenzaInfo = calcolaScadenza(polizza.data_scadenza);
      
      const tipoBadgeClass = `tipo-${polizza.tipo}`;

      return `
        <div class="polizza-card">
          <div class="polizza-header">
            <div>
              <div>
                <span class="tipo-badge ${tipoBadgeClass}">
                  ${tipo.label.split(' ')[0]} ${tipo.label.split(' ')[1]}
                </span>
              </div>
              <h3 style="margin: 10px 0 5px 0; font-size: 16px; color: #1f2937;">
                N° ${polizza.numero_polizza || 'Non specificato'}
              </h3>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">
                ${polizza.compagnia}${polizza.broker ? ` • Broker: ${polizza.broker}` : ''}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: bold; color: ${tipo.color}; margin-bottom: 5px;">
                ${formatCurrency(polizza.importo_garantito)}
              </div>
              <span class="scadenza-badge ${scadenzaInfo.classe}">
                ${scadenzaInfo.testo}
              </span>
            </div>
          </div>

          <div class="info-row">
            <div class="info-item">
              <div class="info-item-label">Data Emissione</div>
              <div class="info-item-value">${formatDate(polizza.data_emissione)}</div>
            </div>

            <div class="info-item">
              <div class="info-item-label">Data Scadenza</div>
              <div class="info-item-value">${formatDate(polizza.data_scadenza)}</div>
            </div>

            <div class="info-item">
              <div class="info-item-label">Premio</div>
              <div class="info-item-value">${polizza.premio ? formatCurrency(polizza.premio) : 'N/D'}</div>
            </div>

            <div class="info-item">
              <div class="info-item-label">Alert Anticipo</div>
              <div class="info-item-value">${polizza.alert_anticipo_giorni || 30} giorni</div>
            </div>
          </div>

          ${gara ? `
            <div class="gara-link">
              <strong style="color: #065f46;">🎯 Gara Collegata:</strong>
              <span style="margin-left: 10px; color: #047857;">
                ${gara.codice_gara} - ${gara.titolo}
              </span>
            </div>
          ` : ''}

          ${polizza.note ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <strong style="color: #6b7280; font-size: 10px;">📝 Note:</strong>
              <p style="margin: 5px 0 0 0; color: #374151; font-size: 11px; white-space: pre-wrap;">${polizza.note}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="polizza-group">
        <div class="polizza-group-header" style="background: ${tipo.color} !important;">
          <span>${tipo.label}</span>
          <span>${polizzeTipo.length} polizz${polizzeTipo.length === 1 ? 'a' : 'e'}</span>
        </div>
        ${polizzeCards}
      </div>
    `;
  }).join('');

  // ========================================
  // MESSAGGIO SE VUOTO
  // ========================================
  let messaggioVuoto = '';
  if (polizzeFiltrate.length === 0) {
    messaggioVuoto = `
      <div style="background: #f9fafb !important; padding: 40px; border-radius: 8px; text-align: center; color: #6b7280; margin: 40px 0;">
        <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
        <h3 style="color: #6b7280; margin: 0;">Nessuna polizza trovata</h3>
        <p style="margin: 10px 0 0 0;">Prova a modificare i filtri di ricerca</p>
      </div>
    `;
  }

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    filtriInfo +
    statsHTML +
    (polizzeFiltrate.length > 0 ? riepilogoCompagnie : '') +
    messaggioVuoto +
    gruppiPolizze;

  const htmlDocument = generateCompleteHTML({
    title: '🛡️ Elenco Polizze Assicurative',
    subtitle: filtriApplicati.length > 0 
      ? `Filtrato: ${filtriApplicati.join(' • ')}` 
      : 'Report completo di tutte le polizze',
    content: contentHTML,
    customColor: '#7c3aed',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Polizze_Assicurative');
};