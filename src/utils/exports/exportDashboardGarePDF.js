// src/utils/exports/exportDashboardGarePDF.js

import { 
  formatDate, 
  formatCurrency, 
  formatDateTime,
  generateCompleteHTML, 
  openPrintWindow 
} from './exportHelpers';

/**
 * ================================================================
 * EXPORT DASHBOARD UFFICIO GARE - Report completo con KPI e statistiche avanzate
 * ================================================================
 */

export const exportDashboardGarePDF = (gare, polizze, categorieQualificate, clienti) => {
  
  const oggi = new Date();

  // ========================================
  // CALCOLO STATISTICHE GENERALI
  // ========================================
  const stats = {
    totaleGare: gare.length,
    interessato: gare.filter(g => g.stato === 'interessato').length,
    inPreparazione: gare.filter(g => g.stato === 'in_preparazione').length,
    presentate: gare.filter(g => g.stato === 'presentata' || g.stato === 'in_valutazione').length,
    vinte: gare.filter(g => g.stato === 'vinta').length,
    perse: gare.filter(g => g.stato === 'persa').length,
    rinunciate: gare.filter(g => g.stato === 'rinunciata').length,
    
    importoVinto: gare
      .filter(g => g.stato === 'vinta')
      .reduce((sum, g) => sum + parseFloat(g.importo_offerto || g.importo_appalto || 0), 0),
    
    importoPotenziale: gare
      .filter(g => ['interessato', 'in_preparazione', 'presentata', 'in_valutazione'].includes(g.stato))
      .reduce((sum, g) => sum + parseFloat(g.importo_appalto || 0), 0),

    totalePolizze: polizze.length,
    polizzeProvvisorie: polizze.filter(p => p.tipo === 'provvisoria').length,
    polizzeDefinitive: polizze.filter(p => p.tipo === 'definitiva').length,
    polizzeCAR: polizze.filter(p => p.tipo === 'car').length,
    
    categorieSOA: categorieQualificate.length,
    categorieOG: categorieQualificate.filter(c => c.categoria.startsWith('OG')).length,
    categorieOS: categorieQualificate.filter(c => c.categoria.startsWith('OS')).length
  };

  // Calcola tasso di successo
  const gareChiuse = stats.vinte + stats.perse;
  const tassoSuccesso = gareChiuse > 0 ? ((stats.vinte / gareChiuse) * 100).toFixed(1) : 0;

  // Scadenze imminenti (prossimi 30 giorni)
  const scadenzeImminenti = gare.filter(g => {
    if (!['interessato', 'in_preparazione', 'presentata'].includes(g.stato)) return false;
    if (!g.scadenza_presentazione) return false;
    
    const scadenza = new Date(g.scadenza_presentazione);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return giorni >= 0 && giorni <= 30;
  });

  // Polizze in scadenza (prossimi 30 giorni)
  const polizzeInScadenza = polizze.filter(p => {
    if (!p.data_scadenza) return false;
    const scadenza = new Date(p.data_scadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return giorni >= 0 && giorni <= 30;
  });

  // ========================================
  // ANALISI PER CLIENTE (TOP 5)
  // ========================================
  const perCliente = {};
  gare.forEach(g => {
    if (!g.cliente_id) return;
    const cliente = clienti.find(c => c.id === g.cliente_id);
    const nomeCliente = cliente ? cliente.ragione_sociale : 'Sconosciuto';
    
    if (!perCliente[nomeCliente]) {
      perCliente[nomeCliente] = {
        totale: 0,
        vinte: 0,
        perse: 0,
        presentate: 0,
        importoVinto: 0
      };
    }
    
    perCliente[nomeCliente].totale++;
    if (g.stato === 'vinta') {
      perCliente[nomeCliente].vinte++;
      perCliente[nomeCliente].importoVinto += parseFloat(g.importo_offerto || g.importo_appalto || 0);
    }
    if (g.stato === 'persa') {
      perCliente[nomeCliente].perse++;
    }
    if (['presentata', 'in_valutazione', 'vinta', 'persa'].includes(g.stato)) {
      perCliente[nomeCliente].presentate++;
    }
  });

  const topClienti = Object.entries(perCliente)
    .sort((a, b) => b[1].importoVinto - a[1].importoVinto)
    .slice(0, 5);

  // ========================================
  // ANALISI RIBASSI
  // ========================================
  const gareConRibasso = gare.filter(g => 
    g.ribasso_offerto && 
    ['presentata', 'in_valutazione', 'vinta', 'persa'].includes(g.stato)
  );
  
  const ribassoMedio = gareConRibasso.length > 0
    ? (gareConRibasso.reduce((sum, g) => sum + parseFloat(g.ribasso_offerto || 0), 0) / gareConRibasso.length).toFixed(2)
    : 0;

  const ribassoMin = gareConRibasso.length > 0
    ? Math.min(...gareConRibasso.map(g => parseFloat(g.ribasso_offerto || 0))).toFixed(2)
    : 0;

  const ribassoMax = gareConRibasso.length > 0
    ? Math.max(...gareConRibasso.map(g => parseFloat(g.ribasso_offerto || 0))).toFixed(2)
    : 0;

  // Ribassi per esito (vinte vs perse)
  const ribassiVinte = gareConRibasso.filter(g => g.stato === 'vinta');
  const ribassiPerse = gareConRibasso.filter(g => g.stato === 'persa');

  const ribassoMedioVinte = ribassiVinte.length > 0
    ? (ribassiVinte.reduce((sum, g) => sum + parseFloat(g.ribasso_offerto || 0), 0) / ribassiVinte.length).toFixed(2)
    : 0;

  const ribassoMedioPerse = ribassiPerse.length > 0
    ? (ribassiPerse.reduce((sum, g) => sum + parseFloat(g.ribasso_offerto || 0), 0) / ribassiPerse.length).toFixed(2)
    : 0;

  // ========================================
  // ANALISI PER CATEGORIA SOA
  // ========================================
  const perCategoria = {};
  gare.forEach(g => {
    if (!g.categorie_richieste) return;
    const categorie = g.categorie_richieste.split(',').map(c => c.trim());
    
    categorie.forEach(cat => {
      if (!perCategoria[cat]) {
        perCategoria[cat] = { 
          totale: 0, 
          vinte: 0, 
          perse: 0, 
          presentate: 0,
          importoVinto: 0
        };
      }
      perCategoria[cat].totale++;
      if (g.stato === 'vinta') {
        perCategoria[cat].vinte++;
        perCategoria[cat].importoVinto += parseFloat(g.importo_offerto || g.importo_appalto || 0);
      }
      if (g.stato === 'persa') perCategoria[cat].perse++;
      if (['presentata', 'in_valutazione', 'vinta', 'persa'].includes(g.stato)) {
        perCategoria[cat].presentate++;
      }
    });
  });

  // ========================================
  // ANDAMENTO TEMPORALE
  // ========================================
  const mesiNomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  
  const perMese = {};
  gare.forEach(g => {
    if (!g.data_aggiudicazione && !g.data_presentazione) return;
    const data = new Date(g.data_aggiudicazione || g.data_presentazione);
    const anno = data.getFullYear();
    const mese = data.getMonth() + 1;
    const chiave = `${anno}-${String(mese).padStart(2, '0')}`;
    
    if (!perMese[chiave]) {
      perMese[chiave] = { 
        totale: 0, 
        vinte: 0, 
        perse: 0,
        importoVinto: 0 
      };
    }
    perMese[chiave].totale++;
    if (g.stato === 'vinta') {
      perMese[chiave].vinte++;
      perMese[chiave].importoVinto += parseFloat(g.importo_offerto || g.importo_appalto || 0);
    }
    if (g.stato === 'persa') {
      perMese[chiave].perse++;
    }
  });

  // Ultimi 12 mesi
  const ultimi12Mesi = Object.entries(perMese)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .reverse();

  // ========================================
  // ANALISI IMPORTI
  // ========================================
  const gareVinte = gare.filter(g => g.stato === 'vinta');
  const importoMedioVinto = gareVinte.length > 0
    ? stats.importoVinto / gareVinte.length
    : 0;

  const importoMinVinto = gareVinte.length > 0
    ? Math.min(...gareVinte.map(g => parseFloat(g.importo_offerto || g.importo_appalto || 0)))
    : 0;

  const importoMaxVinto = gareVinte.length > 0
    ? Math.max(...gareVinte.map(g => parseFloat(g.importo_offerto || g.importo_appalto || 0)))
    : 0;

  // ========================================
  // STILI CUSTOM
  // ========================================
  const customStyles = `
    .dashboard-header {
      background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%) !important;
      color: white !important;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
      text-align: center;
      page-break-inside: avoid;
    }

    .dashboard-title {
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }

    .dashboard-subtitle {
      font-size: 16px;
      opacity: 0.9;
      margin: 0;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 30px 0;
    }

    .kpi-card {
      background: white !important;
      padding: 20px;
      border-radius: 10px;
      border: 3px solid #e5e7eb;
      text-align: center;
      page-break-inside: avoid;
      transition: all 0.3s;
    }

    .kpi-card.primary {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
    }

    .kpi-card.success {
      border-color: #10b981;
      background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%) !important;
    }

    .kpi-card.warning {
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
    }

    .kpi-card.danger {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
    }

    .kpi-card.purple {
      border-color: #7c3aed;
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%) !important;
    }

    .kpi-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .kpi-value {
      font-size: 36px;
      font-weight: bold;
      margin: 10px 0 5px 0;
    }

    .kpi-label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 600;
      opacity: 0.8;
    }

    .section-box {
      background: white !important;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
      page-break-inside: avoid;
    }

    .section-header {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
    }

    .chart-bar {
      background: #f3f4f6 !important;
      height: 30px;
      border-radius: 5px;
      margin: 15px 0;
      position: relative;
      overflow: hidden;
    }

    .chart-fill {
      background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%) !important;
      height: 100%;
      display: flex;
      align-items: center;
      justify-end pr-2;
      color: white;
      font-weight: 600;
      font-size: 12px;
      transition: width 0.5s;
    }

    .chart-fill.success {
      background: linear-gradient(90deg, #10b981 0%, #059669 100%) !important;
    }

    .chart-fill.warning {
      background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%) !important;
    }

    .chart-fill.danger {
      background: linear-gradient(90deg, #f87171 0%, #ef4444 100%) !important;
    }

    .chart-label {
      font-size: 12px;
      color: #374151;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .alert-item {
      background: #fef3c7 !important;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      page-break-inside: avoid;
    }

    .alert-item.urgent {
      background: #fee2e2 !important;
      border-left-color: #ef4444;
    }

    .cliente-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .cliente-row:last-child {
      border-bottom: none;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 10px;
    }

    .badge-success {
      background: #d1fae5 !important;
      color: #065f46;
    }

    .badge-primary {
      background: #dbeafe !important;
      color: #1e40af;
    }

    .badge-warning {
      background: #fef3c7 !important;
      color: #92400e;
    }

    .qualifica-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 15px 0;
    }

    .qualifica-badge {
      background: #eff6ff !important;
      border: 2px solid #3b82f6;
      padding: 8px;
      border-radius: 5px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #1e40af;
    }

    .timeline-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .timeline-item:last-child {
      border-bottom: none;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }

    .stat-item {
      text-align: center;
      padding: 15px;
      background: #f9fafb !important;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      margin: 5px 0;
    }

    .stat-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .page-break {
      page-break-before: always;
      margin-top: 0;
    }
  `;

  // ========================================
  // HEADER DASHBOARD
  // ========================================
  const headerHTML = `
    <div class="dashboard-header">
      <div class="dashboard-title">📋 Dashboard Ufficio Gare - Report Completo</div>
      <div class="dashboard-subtitle">Analisi KPI e Statistiche Avanzate</div>
      <div class="dashboard-subtitle" style="margin-top: 15px; font-size: 14px;">
        Generato il ${formatDateTime()}
      </div>
    </div>
  `;

  // ========================================
  // KPI PRINCIPALI
  // ========================================
  const kpiHTML = `
    <h2 style="color: #1e40af; margin: 40px 0 25px 0;">📊 Indicatori Chiave di Performance</h2>
    
    <div class="kpi-grid">
      <div class="kpi-card primary">
        <div class="kpi-icon">📋</div>
        <div class="kpi-value" style="color: #1e40af;">${stats.totaleGare}</div>
        <div class="kpi-label" style="color: #1e40af;">Totale Gare</div>
      </div>

      <div class="kpi-card success">
        <div class="kpi-icon">✅</div>
        <div class="kpi-value" style="color: #059669;">${stats.vinte}</div>
        <div class="kpi-label" style="color: #059669;">Gare Vinte</div>
      </div>

      <div class="kpi-card warning">
        <div class="kpi-icon">📝</div>
        <div class="kpi-value" style="color: #d97706;">${stats.presentate}</div>
        <div class="kpi-label" style="color: #d97706;">In Valutazione</div>
      </div>

      <div class="kpi-card success">
        <div class="kpi-icon">📈</div>
        <div class="kpi-value" style="color: #059669;">${tassoSuccesso}%</div>
        <div class="kpi-label" style="color: #059669;">Tasso Successo</div>
      </div>

      <div class="kpi-card success" style="grid-column: span 2;">
        <div class="kpi-icon">💰</div>
        <div class="kpi-value" style="color: #059669; font-size: 28px;">${formatCurrency(stats.importoVinto)}</div>
        <div class="kpi-label" style="color: #059669;">Importo Totale Vinto</div>
      </div>

      <div class="kpi-card primary" style="grid-column: span 2;">
        <div class="kpi-icon">🎯</div>
        <div class="kpi-value" style="color: #1e40af; font-size: 28px;">${formatCurrency(stats.importoPotenziale)}</div>
        <div class="kpi-label" style="color: #1e40af;">Importo Potenziale in Corso</div>
      </div>

      <div class="kpi-card purple">
        <div class="kpi-icon">🛡️</div>
        <div class="kpi-value" style="color: #7c3aed;">${stats.totalePolizze}</div>
        <div class="kpi-label" style="color: #7c3aed;">Polizze Attive</div>
      </div>

      <div class="kpi-card primary">
        <div class="kpi-icon">🎓</div>
        <div class="kpi-value" style="color: #1e40af;">${stats.categorieSOA}</div>
        <div class="kpi-label" style="color: #1e40af;">Qualifiche SOA</div>
      </div>

      <div class="kpi-card warning">
        <div class="kpi-icon">📉</div>
        <div class="kpi-value" style="color: #d97706;">${ribassoMedio}%</div>
        <div class="kpi-label" style="color: #d97706;">Ribasso Medio</div>
      </div>

      <div class="kpi-card danger">
        <div class="kpi-icon">❌</div>
        <div class="kpi-value" style="color: #dc2626;">${stats.perse}</div>
        <div class="kpi-label" style="color: #dc2626;">Gare Perse</div>
      </div>
    </div>
  `;

  // ========================================
  // DISTRIBUZIONE GARE PER STATO
  // ========================================
  const maxGare = Math.max(stats.interessato, stats.inPreparazione, stats.presentate, stats.vinte, stats.perse, stats.rinunciate) || 1;
  
  const distribuzioneHTML = `
    <div class="section-box">
      <div class="section-header">📊 Distribuzione Gare per Stato</div>
      
      <div class="chart-label">👀 Interessato (${stats.interessato})</div>
      <div class="chart-bar">
        <div class="chart-fill" style="width: ${(stats.interessato / maxGare * 100)}%; background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%) !important;">
          ${stats.interessato}
        </div>
      </div>

      <div class="chart-label">📝 In Preparazione (${stats.inPreparazione})</div>
      <div class="chart-bar">
        <div class="chart-fill" style="width: ${(stats.inPreparazione / maxGare * 100)}%;">
          ${stats.inPreparazione}
        </div>
      </div>

      <div class="chart-label">📤 Presentate / In Valutazione (${stats.presentate})</div>
      <div class="chart-bar">
        <div class="chart-fill warning" style="width: ${(stats.presentate / maxGare * 100)}%;">
          ${stats.presentate}
        </div>
      </div>

      <div class="chart-label">✅ Vinte (${stats.vinte})</div>
      <div class="chart-bar">
        <div class="chart-fill success" style="width: ${(stats.vinte / maxGare * 100)}%;">
          ${stats.vinte}
        </div>
      </div>

      <div class="chart-label">❌ Perse (${stats.perse})</div>
      <div class="chart-bar">
        <div class="chart-fill danger" style="width: ${(stats.perse / maxGare * 100)}%;">
          ${stats.perse}
        </div>
      </div>

      ${stats.rinunciate > 0 ? `
        <div class="chart-label">⚠️ Rinunciate (${stats.rinunciate})</div>
        <div class="chart-bar">
          <div class="chart-fill" style="width: ${(stats.rinunciate / maxGare * 100)}%; background: linear-gradient(90deg, #fb923c 0%, #f97316 100%) !important;">
            ${stats.rinunciate}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // ========================================
  // SCADENZE IMMINENTI
  // ========================================
  let scadenzeHTML = '';
  if (scadenzeImminenti.length > 0) {
    const scadenzeItems = scadenzeImminenti
      .sort((a, b) => new Date(a.scadenza_presentazione) - new Date(b.scadenza_presentazione))
      .slice(0, 10)
      .map(gara => {
        const scadenza = new Date(gara.scadenza_presentazione);
        const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        const isUrgent = giorni <= 7;
        
        return `
          <div class="alert-item ${isUrgent ? 'urgent' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <strong style="color: #1f2937; font-size: 13px;">${gara.codice_gara}</strong>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">${gara.titolo}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600; font-size: 14px; color: ${isUrgent ? '#dc2626' : '#d97706'};">
                  ${isUrgent ? '🔥' : '⚠️'} ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}
                </div>
                <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
                  ${formatDate(gara.scadenza_presentazione)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

    scadenzeHTML = `
      <div class="section-box" style="border-color: #f59e0b; background: #fffbeb !important;">
        <div class="section-header" style="color: #92400e; border-bottom-color: #f59e0b;">
          ⚠️ Scadenze Gare Imminenti (${scadenzeImminenti.length})
        </div>
        ${scadenzeItems}
        ${scadenzeImminenti.length > 10 ? `
          <p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 15px;">
            ... e altre ${scadenzeImminenti.length - 10} scadenze nei prossimi 30 giorni
          </p>
        ` : ''}
      </div>
    `;
  }

  // ========================================
  // POLIZZE IN SCADENZA
  // ========================================
  let polizzeScadenzaHTML = '';
  if (polizzeInScadenza.length > 0) {
    const polizzeItems = polizzeInScadenza
      .sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza))
      .slice(0, 10)
      .map(polizza => {
        const scadenza = new Date(polizza.data_scadenza);
        const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        const isUrgent = giorni <= 15;
        
        const tipiPolizza = {
          'provvisoria': '🛡️ Provvisoria',
          'definitiva': '✅ Definitiva',
          'car': '🏗️ CAR'
        };
        
        return `
          <div class="alert-item ${isUrgent ? 'urgent' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <strong style="color: #1f2937; font-size: 13px;">
                  ${tipiPolizza[polizza.tipo] || polizza.tipo} - N° ${polizza.numero_polizza || 'N/D'}
                </strong>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">
                  ${polizza.compagnia} • ${formatCurrency(polizza.importo_garantito)}
                </p>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600; font-size: 14px; color: ${isUrgent ? '#dc2626' : '#d97706'};">
                  ${isUrgent ? '🔥' : '⚠️'} ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}
                </div>
                <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
                  ${formatDate(polizza.data_scadenza)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

    polizzeScadenzaHTML = `
      <div class="section-box" style="border-color: #7c3aed; background: #faf5ff !important;">
        <div class="section-header" style="color: #6b21a8; border-bottom-color: #7c3aed;">
          🛡️ Polizze in Scadenza (${polizzeInScadenza.length})
        </div>
        ${polizzeItems}
        ${polizzeInScadenza.length > 10 ? `
          <p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 15px;">
            ... e altre ${polizzeInScadenza.length - 10} polizze in scadenza nei prossimi 30 giorni
          </p>
        ` : ''}
      </div>
    `;
  }

  // ========================================
  // TOP CLIENTI
  // ========================================
  let topClientiHTML = '';
  if (topClienti.length > 0) {
    const clientiRows = topClienti.map(([cliente, dati]) => {
      const tassoVittoria = dati.presentate > 0 ? ((dati.vinte / dati.presentate) * 100).toFixed(0) : 0;
      
      return `
        <div class="cliente-row">
          <div>
            <strong style="color: #1f2937; font-size: 13px;">${cliente}</strong>
            <span class="badge badge-primary">${dati.totale} gare</span>
            <span class="badge badge-success">${dati.vinte} vinte</span>
            <span class="badge badge-warning">${tassoVittoria}% successo</span>
          </div>
          <div style="font-size: 16px; font-weight: bold; color: #059669;">
            ${formatCurrency(dati.importoVinto)}
          </div>
        </div>
      `;
    }).join('');

    topClientiHTML = `
      <div class="section-box">
        <div class="section-header">🏆 Top 5 Enti Appaltanti per Importo Vinto</div>
        ${clientiRows}
      </div>
    `;
  }

  // ========================================
  // PERFORMANCE PER CATEGORIA SOA
  // ========================================
  let performanceCategorieHTML = '';
  const categorieConDati = Object.entries(perCategoria)
    .filter(([_, dati]) => dati.presentate > 0)
    .sort((a, b) => {
      const tassoA = (a[1].vinte / a[1].presentate) * 100;
      const tassoB = (b[1].vinte / b[1].presentate) * 100;
      return tassoB - tassoA;
    })
    .slice(0, 10);

  if (categorieConDati.length > 0) {
    const maxPresentate = Math.max(...categorieConDati.map(([_, d]) => d.presentate)) || 1;
    
    const categorieRows = categorieConDati.map(([cat, dati]) => {
      const tasso = ((dati.vinte / dati.presentate) * 100).toFixed(0);
      const widthPercentage = (dati.presentate / maxPresentate * 100);
      
      return `
        <div style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #1f2937;">${cat}</strong>
            <div>
              <span style="font-size: 12px; color: #6b7280; margin-right: 10px;">
                ${dati.vinte}/${dati.presentate} gare
              </span>
              <span class="badge ${tasso >= 50 ? 'badge-success' : 'badge-warning'}">
                ${tasso}% successo
              </span>
            </div>
          </div>
          <div class="chart-bar" style="height: 25px;">
            <div class="chart-fill ${tasso >= 50 ? 'success' : 'warning'}" style="width: ${widthPercentage}%;">
              ${formatCurrency(dati.importoVinto)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    performanceCategorieHTML = `
      <div class="section-box page-break">
        <div class="section-header">📊 Performance per Categoria SOA</div>
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px;">
          Top 10 categorie per tasso di successo (su gare presentate)
        </p>
        ${categorieRows}
      </div>
    `;
  }

  // ========================================
  // ANALISI RIBASSI DETTAGLIATA
  // ========================================
  let ribassiDettagliatiHTML = '';
  if (gareConRibasso.length > 0) {
    ribassiDettagliatiHTML = `
      <div class="section-box">
        <div class="section-header">📉 Analisi Ribassi Offerti</div>
        
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #3b82f6;">
            <div class="stat-label">Ribasso Medio Generale</div>
            <div class="stat-value" style="color: #1e40af;">${ribassoMedio}%</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">
              ${gareConRibasso.length} gare
            </div>
          </div>
          
          <div class="stat-item" style="border-color: #10b981;">
            <div class="stat-label">Ribasso Medio Gare Vinte</div>
            <div class="stat-value" style="color: #059669;">${ribassoMedioVinte}%</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">
              ${ribassiVinte.length} gare vinte
            </div>
          </div>

          <div class="stat-item" style="border-color: #ef4444;">
            <div class="stat-label">Ribasso Medio Gare Perse</div>
            <div class="stat-value" style="color: #dc2626;">${ribassoMedioPerse}%</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">
              ${ribassiPerse.length} gare perse
            </div>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <div class="chart-label">Range Ribassi</div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb !important; border-radius: 8px; margin-top: 10px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 5px;">Minimo</div>
              <div style="font-size: 24px; font-weight: bold; color: #059669;">${ribassoMin}%</div>
            </div>
            <div style="border-left: 2px solid #e5e7eb; height: 40px;"></div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 5px;">Medio</div>
              <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${ribassoMedio}%</div>
            </div>
            <div style="border-left: 2px solid #e5e7eb; height: 40px;"></div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 5px;">Massimo</div>
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${ribassoMax}%</div>
            </div>
          </div>
        </div>

        ${ribassoMedioVinte && ribassoMedioPerse && parseFloat(ribassoMedioVinte) < parseFloat(ribassoMedioPerse) ? `
          <div style="margin-top: 20px; padding: 15px; background: #eff6ff !important; border-left: 4px solid #3b82f6; border-radius: 5px;">
            <strong style="color: #1e40af; font-size: 12px;">💡 Insight:</strong>
            <p style="margin: 5px 0 0 0; color: #374151; font-size: 11px;">
              Le gare vinte hanno un ribasso medio inferiore (${ribassoMedioVinte}%) rispetto alle gare perse (${ribassoMedioPerse}%). 
              Questo suggerisce che ribassi troppo aggressivi potrebbero ridurre le probabilità di aggiudicazione.
            </p>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ========================================
  // ANDAMENTO TEMPORALE
  // ========================================
  let andamentoTemporaleHTML = '';
  if (ultimi12Mesi.length > 0) {
    const maxTotale = Math.max(...ultimi12Mesi.map(([_, d]) => d.totale)) || 1;
    
    const timelineRows = ultimi12Mesi.map(([chiave, dati]) => {
      const [anno, mese] = chiave.split('-');
      const nomeMese = mesiNomi[parseInt(mese) - 1];
      const tassoSuccesso = (dati.vinte + dati.perse) > 0 
        ? ((dati.vinte / (dati.vinte + dati.perse)) * 100).toFixed(0) 
        : 0;
      
      return `
        <div class="timeline-item">
          <div style="flex: 0 0 100px; font-weight: 600; color: #1f2937;">
            ${nomeMese} ${anno}
          </div>
          <div style="flex: 1; padding: 0 20px;">
            <div style="display: flex; gap: 15px; font-size: 11px; margin-bottom: 5px;">
              <span>📋 ${dati.totale} totali</span>
              <span style="color: #059669;">✅ ${dati.vinte} vinte</span>
              <span style="color: #dc2626;">❌ ${dati.perse} perse</span>
              ${tassoSuccesso > 0 ? `<span style="color: #3b82f6;">📈 ${tassoSuccesso}% successo</span>` : ''}
            </div>
            <div class="chart-bar" style="height: 20px; margin: 5px 0 0 0;">
              <div class="chart-fill success" style="width: ${(dati.totale / maxTotale * 100)}%; font-size: 10px;">
                ${dati.totale}
              </div>
            </div>
          </div>
          <div style="flex: 0 0 120px; text-align: right; font-weight: 600; color: #059669; font-size: 13px;">
            ${formatCurrency(dati.importoVinto)}
          </div>
        </div>
      `;
    }).join('');

    andamentoTemporaleHTML = `
      <div class="section-box page-break">
        <div class="section-header">📈 Andamento Temporale Gare (Ultimi 12 Mesi)</div>
        ${timelineRows}
      </div>
    `;
  }

  // ========================================
  // ANALISI IMPORTI
  // ========================================
  let analisiImportiHTML = '';
  if (gareVinte.length > 0) {
    analisiImportiHTML = `
      <div class="section-box">
        <div class="section-header">💰 Analisi Importi Gare Vinte</div>
        
        <div class="stat-grid">
          <div class="stat-item" style="border-color: #3b82f6;">
            <div class="stat-label">Importo Medio</div>
            <div class="stat-value" style="color: #1e40af; font-size: 20px;">
              ${formatCurrency(importoMedioVinto)}
            </div>
          </div>
          
          <div class="stat-item" style="border-color: #10b981;">
            <div class="stat-label">Importo Minimo</div>
            <div class="stat-value" style="color: #059669; font-size: 20px;">
              ${formatCurrency(importoMinVinto)}
            </div>
          </div>

          <div class="stat-item" style="border-color: #7c3aed;">
            <div class="stat-label">Importo Massimo</div>
            <div class="stat-value" style="color: #6b21a8; font-size: 20px;">
              ${formatCurrency(importoMaxVinto)}
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #f0fdf4 !important; border-left: 4px solid #10b981; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #059669; font-size: 12px;">💼 Portafoglio Lavori Vinti</strong>
              <p style="margin: 5px 0 0 0; color: #374151; font-size: 11px;">
                ${stats.vinte} gare aggiudicate per un valore complessivo di ${formatCurrency(stats.importoVinto)}
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================
  // QUALIFICHE SOA POSSEDUTE
  // ========================================
  const categorieOG = categorieQualificate
    .filter(c => c.categoria.startsWith('OG'))
    .sort((a, b) => a.categoria.localeCompare(b.categoria));
  
  const categorieOS = categorieQualificate
    .filter(c => c.categoria.startsWith('OS'))
    .sort((a, b) => a.categoria.localeCompare(b.categoria));

  const qualificheHTML = `
    <div class="section-box page-break">
      <div class="section-header">🎓 Qualifiche SOA Possedute (${stats.categorieSOA})</div>
      
      ${categorieOG.length > 0 ? `
        <h4 style="color: #1e40af; margin: 20px 0 15px 0; font-size: 14px;">
          🏗️ Opere Generali (${stats.categorieOG})
        </h4>
        <div class="qualifica-grid">
          ${categorieOG.map(c => `
            <div class="qualifica-badge">
              ${c.categoria}${c.classifica ? ` - ${c.classifica}` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${categorieOS.length > 0 ? `
        <h4 style="color: #1e40af; margin: 30px 0 15px 0; font-size: 14px;">
          🔧 Opere Specializzate (${stats.categorieOS})
        </h4>
        <div class="qualifica-grid">
          ${categorieOS.map(c => `
            <div class="qualifica-badge">
              ${c.categoria}${c.classifica ? ` - ${c.classifica}` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // ========================================
  // RIEPILOGO POLIZZE
  // ========================================
  const riepilogoPolizzeHTML = `
    <div class="section-box" style="background: #faf5ff !important; border-color: #7c3aed;">
      <div class="section-header" style="color: #6b21a8; border-bottom-color: #7c3aed;">
        🛡️ Riepilogo Polizze Assicurative
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
        <div style="text-align: center; padding: 15px; background: #dbeafe !important; border-radius: 8px;">
          <div style="font-size: 24px; margin-bottom: 5px;">🛡️</div>
          <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${stats.polizzeProvvisorie}</div>
          <div style="color: #1e40af; font-size: 11px; margin-top: 5px;">Provvisorie</div>
        </div>
        
        <div style="text-align: center; padding: 15px; background: #d1fae5 !important; border-radius: 8px;">
          <div style="font-size: 24px; margin-bottom: 5px;">✅</div>
          <div style="font-size: 24px; font-weight: bold; color: #059669;">${stats.polizzeDefinitive}</div>
          <div style="color: #059669; font-size: 11px; margin-top: 5px;">Definitive</div>
        </div>
        
        <div style="text-align: center; padding: 15px; background: #fef3c7 !important; border-radius: 8px;">
          <div style="font-size: 24px; margin-bottom: 5px;">🏗️</div>
          <div style="font-size: 24px; font-weight: bold; color: #d97706;">${stats.polizzeCAR}</div>
          <div style="color: #d97706; font-size: 11px; margin-top: 5px;">CAR</div>
        </div>
      </div>
    </div>
  `;

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    headerHTML +
    kpiHTML +
    distribuzioneHTML +
    scadenzeHTML +
    polizzeScadenzaHTML +
    topClientiHTML +
    performanceCategorieHTML +
    ribassiDettagliatiHTML +
    andamentoTemporaleHTML +
    analisiImportiHTML +
    riepilogoPolizzeHTML +
    qualificheHTML;

  const htmlDocument = generateCompleteHTML({
    title: '📋 Dashboard Ufficio Gare - Report Completo',
    subtitle: null,
    content: contentHTML,
    customColor: '#1e40af',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Dashboard_Ufficio_Gare_Report_Completo');
};