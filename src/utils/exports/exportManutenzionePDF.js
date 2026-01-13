// src/utils/exports/exportManutenzionePDF.js
import { 
  formatDate, 
  formatCurrency,
  openPrintWindow, 
  generateCompleteHTML,
  getInfoBoxStyles 
} from './exportHelpers';

/**
 * Esporta il registro manutenzioni veicolo in formato HTML/PDF
 * @param {Object} veicolo - Oggetto veicolo
 * @param {Array} manutenzioni - Array delle manutenzioni del veicolo
 */
export const exportManutenzionePDF = (veicolo, manutenzioni) => {
  const oggi = new Date();
  
  // Filtra e ordina manutenzioni
  const manutenzioniCompletate = manutenzioni
    .filter(m => m.completato)
    .sort((a, b) => new Date(b.data_intervento) - new Date(a.data_intervento));
  
  const manutenzioniProgrammate = manutenzioni
    .filter(m => m.completato && m.prossima_data)
    .sort((a, b) => new Date(a.prossima_data) - new Date(b.prossima_data));
  
  // Calcola statistiche
  const costoTotale = manutenzioniCompletate.reduce((sum, m) => sum + (parseFloat(m.costo) || 0), 0);
  const numInterventi = manutenzioniCompletate.length;
  const kmMax = Math.max(...manutenzioniCompletate.map(m => m.km_veicolo || 0), 0);
  const mediaCosto = numInterventi > 0 ? costoTotale / numInterventi : 0;
  
  // Calcola stato scadenze
  const calcolaStatoScadenza = (dataScadenza) => {
    if (!dataScadenza) return { label: '-', color: '#6b7280' };
    
    const scadenza = new Date(dataScadenza);
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniMancanti < 0) {
      return { label: '⚠️ SCADUTA', color: '#dc2626' };
    } else if (giorniMancanti <= 30) {
      return { label: '⚠️ IN SCADENZA', color: '#f59e0b' };
    } else {
      return { label: '✓ Valida', color: '#16a34a' };
    }
  };
  
  const statoRevisione = calcolaStatoScadenza(veicolo.scadenza_revisione);
  const statoAssicurazione = calcolaStatoScadenza(veicolo.scadenza_assicurazione);
  
  // Genera contenuto HTML
  const contenutoHTML = `
    <!-- Info Veicolo -->
    <div class="info-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: white !important; border-radius: 4px;">
        <span style="font-weight: bold; color: #374151;">🚛 Veicolo:</span>
        <span>${veicolo.targa} - ${veicolo.marca} ${veicolo.modello}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: white !important; border-radius: 4px;">
        <span style="font-weight: bold; color: #374151;">📅 Anno:</span>
        <span>${veicolo.anno || 'N/D'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px; background: white !important; border-radius: 4px;">
        <span style="font-weight: bold; color: #374151;">🔧 Tipo:</span>
        <span>${veicolo.tipo || 'N/D'}</span>
      </div>
    </div>
    
    <!-- Scadenze -->
    <div class="warning-box">
      <h3 style="margin-top: 0; border: none; color: #f59e0b;">⚠️ SCADENZE</h3>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; color: #374151;">🔍 Revisione:</span>
        <span style="color: ${statoRevisione.color}; font-weight: bold;">
          ${formatDate(veicolo.scadenza_revisione)} - ${statoRevisione.label}
        </span>
      </div>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; color: #374151;">🛡️ Assicurazione:</span>
        <span style="color: ${statoAssicurazione.color}; font-weight: bold;">
          ${formatDate(veicolo.scadenza_assicurazione)} - ${statoAssicurazione.label}
        </span>
      </div>
    </div>
    
    <!-- Storico Interventi -->
    <h2>📝 STORICO INTERVENTI</h2>
    ${manutenzioniCompletate.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo Intervento</th>
            <th>KM</th>
            <th>Costo</th>
            <th>Fornitore</th>
            <th>Descrizione</th>
          </tr>
        </thead>
        <tbody>
          ${manutenzioniCompletate.map(m => `
            <tr>
              <td>${formatDate(m.data_intervento)}</td>
              <td>${getTipoLabel(m.tipo_intervento)}</td>
              <td>${m.km_veicolo ? m.km_veicolo.toLocaleString('it-IT') + ' km' : '-'}</td>
              <td>${formatCurrency(m.costo)}</td>
              <td>${m.fornitore || '-'}</td>
              <td style="max-width: 200px;">${m.descrizione || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="text-align: center; color: #6b7280; padding: 20px;">Nessun intervento registrato</p>'}
    
    <!-- Prossime Manutenzioni -->
    <h2>🗓️ PROSSIME MANUTENZIONI PROGRAMMATE</h2>
    ${manutenzioniProgrammate.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Data Prevista</th>
            <th>Tipo Intervento</th>
            <th>KM Previsti</th>
            <th>Giorni Mancanti</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          ${manutenzioniProgrammate.map(m => {
            const prossima = new Date(m.prossima_data);
            const giorniMancanti = Math.ceil((prossima - oggi) / (1000 * 60 * 60 * 24));
            const statoClasse = giorniMancanti < 0 ? 'stato-danger' : giorniMancanti <= 30 ? 'stato-warning' : 'stato-ok';
            const statoLabel = giorniMancanti < 0 ? 'SCADUTO' : giorniMancanti <= 30 ? 'IN SCADENZA' : 'OK';
            
            return `
              <tr>
                <td>${formatDate(m.prossima_data)}</td>
                <td>${getTipoLabel(m.tipo_intervento)}</td>
                <td>${m.prossimi_km ? m.prossimi_km.toLocaleString('it-IT') + ' km' : '-'}</td>
                <td>${giorniMancanti} giorni</td>
                <td class="${statoClasse}">${statoLabel}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '<p style="text-align: center; color: #6b7280; padding: 20px;">Nessuna manutenzione programmata</p>'}
    
    <!-- Statistiche -->
    <div class="success-box">
      <h3 style="margin-top: 0; border: none; color: #16a34a;">📊 STATISTICHE</h3>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold; color: #374151;">🔢 Totale interventi:</span>
        <span>${numInterventi}</span>
      </div>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold; color: #374151;">💰 Costo totale manutenzioni:</span>
        <span>${formatCurrency(costoTotale)}</span>
      </div>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold; color: #374151;">📊 Costo medio per intervento:</span>
        <span>${formatCurrency(mediaCosto)}</span>
      </div>
      <div style="margin: 10px 0; padding: 10px; background: white !important; border-radius: 4px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold; color: #374151;">🛣️ KM totali registrati:</span>
        <span>${kmMax.toLocaleString('it-IT')} km</span>
      </div>
    </div>
  `;
  
  // CSS custom per stati
  const customStyles = `
    .stato-ok {
      color: #16a34a !important;
      font-weight: bold;
    }
    
    .stato-warning {
      color: #f59e0b !important;
      font-weight: bold;
    }
    
    .stato-danger {
      color: #dc2626 !important;
      font-weight: bold;
    }
  `;
  
  // Genera HTML completo usando gli helper
  const htmlContent = generateCompleteHTML({
    title: '📋 REGISTRO MANUTENZIONI VEICOLO',
    subtitle: `${veicolo.targa} - ${veicolo.marca} ${veicolo.modello}`,
    customColor: '#1e40af',
    customStyles: customStyles,
    content: contenutoHTML,
    buttonText: '🖨️ Stampa / Salva PDF'
  });
  
  // Apri finestra di preview
  openPrintWindow(htmlContent, `Manutenzioni - ${veicolo.targa}`);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converte il tipo intervento in etichetta con emoji
 */
const getTipoLabel = (tipo) => {
  const tipi = {
    'tagliando': '🔧 Tagliando',
    'cambio_olio': '🛢️ Cambio Olio',
    'cambio_gomme': '🚗 Cambio Gomme',
    'filtri': '🌬️ Filtri',
    'freni': '🛑 Freni',
    'frizione': '⚙️ Frizione',
    'batteria': '🔋 Batteria',
    'revisione_interna': '✅ Revisione',
    'altro': '🔨 Altro'
  };
  return tipi[tipo] || tipo;
};