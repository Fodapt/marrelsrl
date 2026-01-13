// src/utils/exports/exportPresenzePDF.js
import {
  formatDate,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con presenze mensili per un lavoratore
 * @param {Object} params - Parametri per l'export
 * @param {string} params.nomeLavoratore - Nome completo del lavoratore
 * @param {number} params.mese - Mese (0-11)
 * @param {number} params.anno - Anno
 * @param {string} params.meseName - Nome del mese in italiano
 * @param {Array} params.daysInMonth - Array di Date per i giorni del mese
 * @param {Function} params.getPresenzaForDate - Funzione per ottenere presenza per data
 * @param {Function} params.getTipoInfo - Funzione per ottenere info tipo presenza
 * @param {Function} params.getCantiereName - Funzione per ottenere nome cantiere
 * @param {Function} params.getWeekNumber - Funzione per ottenere numero settimana
 * @param {Function} params.formatDateShort - Funzione per formattare data breve
 * @param {Object} params.riepilogo - Oggetto con riepilogo mensile
 * @param {string} params.notaMensile - Nota mensile (opzionale)
 */
export const exportPresenzePDF = (params) => {
  const {
    nomeLavoratore,
    mese,
    anno,
    meseName,
    daysInMonth,
    getPresenzaForDate,
    getTipoInfo,
    getCantiereName,
    getWeekNumber,
    formatDateShort,
    riepilogo,
    notaMensile
  } = params;

  // ========================================
  // CSS CUSTOM PER PRESENZE
  // ========================================
  const customStyles = `
    .calendario { margin: 30px 0; }
    .settimana { margin-bottom: 30px; page-break-inside: avoid; }
    .settimana-title { font-weight: bold; color: #4b5563; margin-bottom: 10px; font-size: 14px; }
    .giorni-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
    
    .giorno-card { 
      border: 2px solid #d1d5db; 
      border-radius: 8px; 
      padding: 10px; 
      min-height: 80px; 
    }
    .giorno-card.lavoro { background: #dcfce7 !important; border-color: #22c55e !important; }
    .giorno-card.lavoro-permesso { background: #fed7aa !important; border-color: #f97316 !important; }
    .giorno-card.malattia { background: #fecaca !important; border-color: #ef4444 !important; }
    .giorno-card.ferie { background: #bfdbfe !important; border-color: #3b82f6 !important; }
    .giorno-card.festivita { background: #e9d5ff !important; border-color: #a855f7 !important; }
    .giorno-card.assenza { background: #e5e7eb !important; border-color: #6b7280 !important; }
    .giorno-card.pioggia { background: #fef08a !important; border-color: #eab308 !important; }
    .giorno-card.weekend { background: #f3f4f6 !important; }
    
    .giorno-header { font-weight: bold; font-size: 12px; color: #374151; margin-bottom: 5px; }
    .giorno-tipo { font-weight: 600; font-size: 13px; color: #1f2937; }
    .giorno-ore { font-size: 11px; color: #4b5563; }
    .giorno-permesso { font-size: 10px; color: #ea580c; font-weight: bold; }
    .giorno-cantiere { font-size: 10px; color: #6b7280; margin-top: 3px; }
    
    .nota-mensile {
      background: #fef9c3 !important;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #facc15 !important;
      margin: 20px 0;
      -webkit-print-color-adjust: exact !important;
    }
    .nota-mensile strong { color: #854d0e; }
    .nota-content { white-space: pre-wrap; margin-top: 8px; font-size: 13px; color: #444; }
    
    .riepilogo { margin-top: 40px; }
    .riepilogo h2 { color: #1f2937; font-size: 20px; margin-bottom: 20px; }
    .riepilogo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    
    .riepilogo-card { 
      border: 2px solid; 
      border-radius: 8px; 
      padding: 15px;
      -webkit-print-color-adjust: exact !important;
    }
    .riepilogo-card.lavoro { background: #dcfce7 !important; border-color: #22c55e !important; }
    .riepilogo-card.malattia { background: #fecaca !important; border-color: #ef4444 !important; }
    .riepilogo-card.ferie { background: #bfdbfe !important; border-color: #3b82f6 !important; }
    .riepilogo-card.festivita { background: #e9d5ff !important; border-color: #a855f7 !important; }
    .riepilogo-card.assenza { background: #e5e7eb !important; border-color: #6b7280 !important; }
    .riepilogo-card.pioggia { background: #fef08a !important; border-color: #eab308 !important; }
    .riepilogo-card.permesso { background: #fed7aa !important; border-color: #f97316 !important; }
    
    .riepilogo-label { font-size: 12px; color: #4b5563; margin-bottom: 5px; }
    .riepilogo-valore { font-size: 24px; font-weight: bold; color: #1f2937; }
    .riepilogo-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
    
    .dettaglio-cantieri { margin-top: 20px; }
    .dettaglio-cantieri h3 { font-size: 16px; color: #1f2937; margin-bottom: 15px; }
    .cantiere-item { 
      display: flex; 
      justify-content: space-between; 
      padding: 12px; 
      background: #f9fafb !important; 
      border-radius: 6px; 
      margin-bottom: 8px;
      -webkit-print-color-adjust: exact !important;
    }
  `;

  // ========================================
  // GENERA CALENDARIO
  // ========================================
  const generateCalendario = () => {
    let html = '<div class="calendario">';
    
    for (let weekNum = 1; weekNum <= 5; weekNum++) {
      const weekDays = daysInMonth.filter(day => getWeekNumber(day) === weekNum);
      if (weekDays.length === 0) continue;
      
      html += `
        <div class="settimana">
          <div class="settimana-title">Settimana ${weekNum}</div>
          <div class="giorni-grid">
      `;
      
      weekDays.forEach(day => {
        const presenza = getPresenzaForDate(day);
        const tipoInfo = presenza ? getTipoInfo(presenza.tipo) : null;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const ore = parseFloat(presenza?.ore || 0);
        const orePermesso = parseFloat(presenza?.ore_permesso || 0);
        const hasPermesso = presenza?.tipo === 'lavoro' && orePermesso > 0;
        
        let cardClass = 'giorno-card';
        if (presenza) {
          if (hasPermesso) {
            cardClass += ' lavoro-permesso';
          } else {
            cardClass += ' ' + presenza.tipo;
          }
        } else if (isWeekend) {
          cardClass += ' weekend';
        }
        
        html += `<div class="${cardClass}">`;
        html += `<div class="giorno-header">${formatDateShort(day)}</div>`;
        
        if (presenza) {
          html += `<div class="giorno-tipo">${tipoInfo.label}</div>`;
          
          if (presenza.ore) {
            html += `<div class="giorno-ore">${presenza.ore} ore${presenza.tipo === 'lavoro' ? ' lav.' : ''}</div>`;
          }
          
          if (hasPermesso) {
            html += `<div class="giorno-permesso">⏰ ${orePermesso}h permesso</div>`;
          }
          
          if (presenza.ore_pioggia && parseFloat(presenza.ore_pioggia) > 0) {
            html += `<div class="giorno-ore" style="color: #ca8a04;">☔ ${presenza.ore_pioggia} ore pioggia</div>`;
          }
          
          if (presenza.cantiere_id) {
            html += `<div class="giorno-cantiere">${getCantiereName(presenza.cantiere_id)}</div>`;
          }
        }
        
        html += '</div>';
      });
      
      html += '</div></div>';
    }
    
    html += '</div>';
    return html;
  };

  // ========================================
  // GENERA RIEPILOGO
  // ========================================
  const generateRiepilogo = () => {
    let html = `
      <div class="riepilogo">
        <h2>Riepilogo Mensile</h2>
        <div class="riepilogo-grid">
          <div class="riepilogo-card lavoro">
            <div class="riepilogo-label">Ore Lavorate</div>
            <div class="riepilogo-valore">${riepilogo.oreLavoro.toFixed(1)} h</div>
            <div class="riepilogo-sub">${riepilogo.giorniLavoro} giorni</div>
          </div>
          <div class="riepilogo-card malattia">
            <div class="riepilogo-label">Giorni Malattia</div>
            <div class="riepilogo-valore">${riepilogo.giorniMalattia}</div>
          </div>
          <div class="riepilogo-card ferie">
            <div class="riepilogo-label">Giorni Ferie</div>
            <div class="riepilogo-valore">${riepilogo.giorniFerie}</div>
          </div>
          <div class="riepilogo-card festivita">
            <div class="riepilogo-label">Festività</div>
            <div class="riepilogo-valore">${riepilogo.giorniFestivita}</div>
          </div>
          <div class="riepilogo-card assenza">
            <div class="riepilogo-label">Giorni Assenza</div>
            <div class="riepilogo-valore">${riepilogo.giorniAssenza}</div>
          </div>
          <div class="riepilogo-card pioggia">
            <div class="riepilogo-label">Ore Pioggia</div>
            <div class="riepilogo-valore">${riepilogo.orePioggia.toFixed(1)} h</div>
          </div>
          <div class="riepilogo-card permesso">
            <div class="riepilogo-label">Ore Permesso</div>
            <div class="riepilogo-valore">${riepilogo.orePermesso.toFixed(1)} h</div>
            <div class="riepilogo-sub">inserite manualmente</div>
          </div>
        </div>
    `;
    
    // Dettaglio cantieri
    if (Object.keys(riepilogo.cantieri).length > 0) {
      html += `
        <div class="dettaglio-cantieri">
          <h3>Dettaglio per Cantiere</h3>
      `;
      
      Object.entries(riepilogo.cantieri).forEach(([cantiereId, ore]) => {
        html += `
          <div class="cantiere-item">
            <span class="cantiere-nome">${getCantiereName(cantiereId)}</span>
            <span class="cantiere-ore">${ore.toFixed(1)} ore</span>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  };

  // ========================================
  // INFO BOX
  // ========================================
  const infoBox = `
    <div style="background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
      <strong>Periodo:</strong> ${meseName} ${anno}<br>
      <strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}
    </div>
  `;

  // ========================================
  // NOTA MENSILE
  // ========================================
  const notaMensileBox = notaMensile ? `
    <div class="nota-mensile">
      <strong>📝 Nota Mensile:</strong>
      <div class="nota-content">${notaMensile}</div>
    </div>
  ` : '';

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    infoBox +
    notaMensileBox +
    generateCalendario() +
    generateRiepilogo();

  const htmlDocument = generateCompleteHTML({
    title: `Presenze ${meseName} ${anno} - ${nomeLavoratore}`,
    heading: `Presenze ${meseName} ${anno} - ${nomeLavoratore}`,
    content: contentHTML,
    customColor: '#2563eb',
    customStyles: customStyles
  });

  openPrintWindow(htmlDocument, `Presenze_${meseName}_${anno}_${nomeLavoratore}`);
};