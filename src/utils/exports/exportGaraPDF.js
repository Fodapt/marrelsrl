// src/utils/exports/exportGaraPDF.js

import { 
  formatDate, 
  formatCurrency, 
  generateCompleteHTML, 
  openPrintWindow 
} from './exportHelpers';

/**
 * ================================================================
 * EXPORT DETTAGLIO GARA - PDF completo di una singola gara
 * ================================================================
 */

export const exportGaraPDF = (gara, verificaQualifiche, cliente, polizze, categorieQualificate) => {
  
  // ========================================
  // DATI BASE
  // ========================================
  const ente = cliente || { ragione_sociale: 'Non specificato' };
  const polizzeCollegate = (polizze || []).filter(p => p.gara_id === gara.id);
  const verifica = verificaQualifiche || {
    stato: 'non_specificato',
    label: '❓ Categorie non specificate',
    dettagli: [],
    messaggi: []
  };

  // Stati gara con emoji
  const statiGara = {
    'interessato': '👀 Interessato',
    'in_preparazione': '📝 In Preparazione',
    'presentata': '📤 Presentata',
    'in_valutazione': '⏳ In Valutazione',
    'vinta': '✅ Vinta',
    'persa': '❌ Persa',
    'rinunciata': '⚠️ Rinunciata'
  };

  // ========================================
  // CALCOLI
  // ========================================
  const importoAppalto = parseFloat(gara.importo_appalto || 0);
  const oneriSicurezza = parseFloat(gara.oneri_sicurezza || 0);
  const ribassoOfferto = parseFloat(gara.ribasso_offerto || 0);
  const importoOfferto = parseFloat(gara.importo_offerto || 0);

  const baseLavorazioni = importoAppalto - oneriSicurezza;
  const ribassoEuro = baseLavorazioni * (ribassoOfferto / 100);
  const importoRibassato = baseLavorazioni - ribassoEuro;

  // Giorni alla scadenza
  let giorniScadenza = null;
  let testoScadenza = '-';
  if (gara.scadenza_presentazione) {
    const oggi = new Date();
    const scadenza = new Date(gara.scadenza_presentazione);
    giorniScadenza = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniScadenza < 0) {
      testoScadenza = `⚠️ Scaduta da ${Math.abs(giorniScadenza)} giorni`;
    } else if (giorniScadenza === 0) {
      testoScadenza = '🔥 OGGI!';
    } else if (giorniScadenza <= 7) {
      testoScadenza = `🔥 Tra ${giorniScadenza} giorni`;
    } else {
      testoScadenza = `Tra ${giorniScadenza} giorni`;
    }
  }

  // ========================================
  // STILI CUSTOM
  // ========================================
  const customStyles = `
    .gara-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%) !important;
      color: white !important;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .gara-title {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 15px 0;
    }

    .gara-codice {
      font-size: 18px;
      opacity: 0.9;
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }

    .info-card {
      background: #f9fafb !important;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      page-break-inside: avoid;
    }

    .info-label {
      color: #6b7280;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .info-value {
      color: #1f2937;
      font-size: 14px;
      font-weight: 600;
    }

    .section-title {
      background: #eff6ff !important;
      color: #1e40af;
      padding: 12px 20px;
      border-radius: 8px;
      margin: 30px 0 15px 0;
      font-size: 16px;
      font-weight: bold;
      border-left: 5px solid #1e40af;
      page-break-after: avoid;
    }

    .stato-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 10px;
    }

    .stato-interessato { background: #dbeafe !important; color: #1e40af; }
    .stato-in_preparazione { background: #f3f4f6 !important; color: #374151; }
    .stato-presentata { background: #dbeafe !important; color: #1e3a8a; }
    .stato-in_valutazione { background: #fef3c7 !important; color: #92400e; }
    .stato-vinta { background: #d1fae5 !important; color: #065f46; }
    .stato-persa { background: #fee2e2 !important; color: #991b1b; }
    .stato-rinunciata { background: #fed7aa !important; color: #9a3412; }

    .qualifica-ok {
      background: #d1fae5 !important;
      border-left: 4px solid #10b981;
      padding: 12px;
      margin: 8px 0;
      border-radius: 5px;
      page-break-inside: avoid;
    }

    .qualifica-ati {
      background: #fed7aa !important;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 8px 0;
      border-radius: 5px;
      page-break-inside: avoid;
    }

    .qualifica-mancante {
      background: #fee2e2 !important;
      border-left: 4px solid #ef4444;
      padding: 12px;
      margin: 8px 0;
      border-radius: 5px;
      page-break-inside: avoid;
    }

    .calcolo-box {
      background: #faf5ff !important;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #7c3aed;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .calcolo-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .calcolo-row.total {
      border-top: 3px solid #7c3aed;
      border-bottom: none;
      font-size: 16px;
      font-weight: bold;
      color: #7c3aed;
      margin-top: 10px;
      padding-top: 15px;
    }

    .polizza-card {
      background: #fffbeb !important;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .scadenza-alert {
      background: #fee2e2 !important;
      color: #991b1b;
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #ef4444;
      margin: 20px 0;
      font-weight: 600;
      page-break-inside: avoid;
    }

    .scadenza-ok {
      background: #d1fae5 !important;
      color: #065f46;
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #10b981;
      margin: 20px 0;
      font-weight: 600;
      page-break-inside: avoid;
    }
  `;

  // ========================================
  // HEADER GARA
  // ========================================
  const headerGara = `
    <div class="gara-header">
      <h2 class="gara-title">${gara.titolo}</h2>
      <p class="gara-codice">Codice Gara: ${gara.codice_gara}</p>
      <div class="stato-badge stato-${gara.stato}">
        ${statiGara[gara.stato] || gara.stato}
      </div>
    </div>
  `;

  // ========================================
  // INFORMAZIONI GENERALI
  // ========================================
  const infoGenerali = `
    <div class="section-title">📋 Informazioni Generali</div>
    
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">CIG</div>
        <div class="info-value">${gara.cig || 'Non specificato'}</div>
      </div>

      <div class="info-card">
        <div class="info-label">CUP</div>
        <div class="info-value">${gara.cup || 'Non specificato'}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Ente Appaltante</div>
        <div class="info-value">${ente.ragione_sociale}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Importo Appalto</div>
        <div class="info-value">${formatCurrency(importoAppalto)}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Oneri Sicurezza</div>
        <div class="info-value">${formatCurrency(oneriSicurezza)}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Base Lavorazioni</div>
        <div class="info-value">${formatCurrency(baseLavorazioni)}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Scadenza Presentazione</div>
        <div class="info-value">${formatDate(gara.scadenza_presentazione)}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Tempo Rimanente</div>
        <div class="info-value">${testoScadenza}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Data Presentazione Offerta</div>
        <div class="info-value">${formatDate(gara.data_presentazione)}</div>
      </div>

      <div class="info-card">
        <div class="info-label">Data Aggiudicazione</div>
        <div class="info-value">${formatDate(gara.data_aggiudicazione)}</div>
      </div>
    </div>
  `;

  // ========================================
  // ALERT SCADENZA
  // ========================================
  let alertScadenza = '';
  if (giorniScadenza !== null && ['interessato', 'in_preparazione', 'presentata'].includes(gara.stato)) {
    if (giorniScadenza < 0) {
      alertScadenza = `
        <div class="scadenza-alert">
          ⚠️ ATTENZIONE: Questa gara è scaduta da ${Math.abs(giorniScadenza)} giorni!
        </div>
      `;
    } else if (giorniScadenza <= 7) {
      alertScadenza = `
        <div class="scadenza-alert">
          🔥 URGENTE: Scadenza tra ${giorniScadenza} giorni! Preparare urgentemente la documentazione.
        </div>
      `;
    } else if (giorniScadenza <= 14) {
      alertScadenza = `
        <div class="scadenza-ok" style="background: #fef3c7 !important; color: #92400e; border-color: #f59e0b;">
          ⏰ Scadenza tra ${giorniScadenza} giorni. Iniziare la preparazione.
        </div>
      `;
    }
  }

  // ========================================
  // CALCOLO OFFERTA
  // ========================================
  let calcoloOfferta = '';
  if (ribassoOfferto > 0) {
    calcoloOfferta = `
      <div class="section-title">💰 Calcolo Offerta Economica</div>
      
      <div class="calcolo-box">
        <div class="calcolo-row">
          <span>Importo Appalto Base</span>
          <strong>${formatCurrency(importoAppalto)}</strong>
        </div>
        <div class="calcolo-row">
          <span>- Oneri Sicurezza (non ribassabili)</span>
          <strong>${formatCurrency(oneriSicurezza)}</strong>
        </div>
        <div class="calcolo-row" style="border-top: 2px solid #9ca3af; margin-top: 5px; padding-top: 10px;">
          <span>= Base Lavorazioni (ribassabile)</span>
          <strong>${formatCurrency(baseLavorazioni)}</strong>
        </div>
        <div class="calcolo-row" style="background: #faf5ff !important; margin: 10px -20px; padding: 12px 20px;">
          <span>Ribasso Offerto</span>
          <strong style="color: #7c3aed; font-size: 18px;">${ribassoOfferto}%</strong>
        </div>
        <div class="calcolo-row">
          <span>Ribasso in Euro</span>
          <strong style="color: #dc2626;">- ${formatCurrency(ribassoEuro)}</strong>
        </div>
        <div class="calcolo-row">
          <span>= Lavorazioni Ribassate</span>
          <strong>${formatCurrency(importoRibassato)}</strong>
        </div>
        <div class="calcolo-row">
          <span>+ Oneri Sicurezza</span>
          <strong>${formatCurrency(oneriSicurezza)}</strong>
        </div>
        <div class="calcolo-row total">
          <span>IMPORTO TOTALE OFFERTO</span>
          <span>${formatCurrency(importoOfferto)}</span>
        </div>
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 10px; margin-top: 15px;">
        Formula: (Importo Appalto - Oneri) × (1 - Ribasso%) + Oneri
      </p>
    `;
  }

  // ========================================
  // VERIFICA QUALIFICHE SOA
  // ========================================
  let verificaQualificheHTML = '';
  if (gara.categorie_richieste) {
    const categorieRichieste = gara.categorie_richieste.split(',').map(c => c.trim());
    
    let statoGenerale = '';
    let coloreBadge = '';
    switch (verifica.stato) {
      case 'qualificato':
        statoGenerale = '✅ QUALIFICATO - Puoi partecipare in forma singola';
        coloreBadge = '#10b981';
        break;
      case 'ati':
        statoGenerale = '⚠️ SERVE ATI - Puoi partecipare in Associazione Temporanea Imprese';
        coloreBadge = '#f59e0b';
        break;
      case 'non_qualificato':
        statoGenerale = '❌ NON QUALIFICATO - Mancano categorie SOA necessarie';
        coloreBadge = '#ef4444';
        break;
      default:
        statoGenerale = '❓ Categorie non specificate';
        coloreBadge = '#6b7280';
    }

    let dettagliHTML = '';
    if (verifica.dettagli && verifica.dettagli.length > 0) {
      dettagliHTML = verifica.dettagli.map(det => {
        const classe = det.stato === 'ok' ? 'qualifica-ok' : 
                      det.stato === 'ati' ? 'qualifica-ati' : 
                      'qualifica-mancante';
        
        return `
          <div class="${classe}">
            <strong style="font-size: 16px;">${det.icon}</strong>
            <span style="margin-left: 10px;">${det.messaggio}</span>
          </div>
        `;
      }).join('');
    }

    verificaQualificheHTML = `
      <div class="section-title">🎓 Verifica Categorie SOA</div>
      
      <div style="background: ${coloreBadge === '#10b981' ? '#d1fae5' : coloreBadge === '#f59e0b' ? '#fed7aa' : '#fee2e2'} !important; 
                  border: 3px solid ${coloreBadge}; 
                  padding: 20px; 
                  border-radius: 10px; 
                  margin: 20px 0;
                  page-break-inside: avoid;">
        <h3 style="margin: 0; font-size: 18px; color: ${coloreBadge};">
          ${statoGenerale}
        </h3>
      </div>

      <p style="margin: 20px 0 15px 0;"><strong>Categorie Richieste:</strong> ${categorieRichieste.join(', ')}</p>

      ${dettagliHTML}

      ${verifica.messaggi && verifica.messaggi.length > 0 ? `
        <div style="background: #f9fafb !important; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #3b82f6; page-break-inside: avoid;">
          <h4 style="margin: 0 0 10px 0; color: #1e40af;">💡 Note:</h4>
          ${verifica.messaggi.map(msg => `<p style="margin: 5px 0;">• ${msg}</p>`).join('')}
        </div>
      ` : ''}
    `;
  } else {
    verificaQualificheHTML = `
      <div class="section-title">🎓 Verifica Categorie SOA</div>
      <div style="background: #f3f4f6 !important; padding: 20px; border-radius: 8px; text-align: center; color: #6b7280;">
        ❓ Nessuna categoria SOA specificata per questa gara
      </div>
    `;
  }

  // ========================================
  // POLIZZE COLLEGATE
  // ========================================
  let polizzeHTML = '';
  if (polizzeCollegate.length > 0) {
    const polizzeCards = polizzeCollegate.map(polizza => {
      const tipiPolizza = {
        'provvisoria': '🛡️ Provvisoria',
        'definitiva': '✅ Definitiva',
        'car': '🏗️ CAR'
      };

      return `
        <div class="polizza-card">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
              <strong style="font-size: 14px;">${tipiPolizza[polizza.tipo] || polizza.tipo}</strong>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 10px;">
                N° ${polizza.numero_polizza || 'N/D'}
              </p>
            </div>
            <span style="background: white; padding: 5px 10px; border-radius: 5px; font-size: 11px; font-weight: 600;">
              ${formatCurrency(polizza.importo_garantito)}
            </span>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; font-size: 11px;">
            <div>
              <span style="color: #6b7280;">Compagnia:</span><br>
              <strong>${polizza.compagnia}</strong>
            </div>
            <div>
              <span style="color: #6b7280;">Broker:</span><br>
              <strong>${polizza.broker || 'N/D'}</strong>
            </div>
            <div>
              <span style="color: #6b7280;">Data Emissione:</span><br>
              <strong>${formatDate(polizza.data_emissione)}</strong>
            </div>
            <div>
              <span style="color: #6b7280;">Scadenza:</span><br>
              <strong>${formatDate(polizza.data_scadenza)}</strong>
            </div>
          </div>

          ${polizza.note ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fbbf24;">
              <span style="color: #92400e; font-size: 10px; font-weight: 600;">Note:</span>
              <p style="margin: 5px 0 0 0; font-size: 11px;">${polizza.note}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    polizzeHTML = `
      <div class="section-title">🛡️ Polizze Assicurative Collegate</div>
      ${polizzeCards}
    `;
  }

  // ========================================
  // NOTE
  // ========================================
  let noteHTML = '';
  if (gara.note) {
    noteHTML = `
      <div class="section-title">📝 Note</div>
      <div style="background: #f9fafb !important; padding: 20px; border-radius: 8px; border-left: 4px solid #6b7280; white-space: pre-wrap;">
        ${gara.note}
      </div>
    `;
  }

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    headerGara +
    alertScadenza +
    infoGenerali +
    calcoloOfferta +
    verificaQualificheHTML +
    polizzeHTML +
    noteHTML;

  const htmlDocument = generateCompleteHTML({
    title: '📋 Dettaglio Gara d\'Appalto',
    subtitle: `Documento completo per: ${gara.codice_gara}`,
    content: contentHTML,
    customColor: '#1e40af',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, `Gara_${gara.codice_gara}`);
};