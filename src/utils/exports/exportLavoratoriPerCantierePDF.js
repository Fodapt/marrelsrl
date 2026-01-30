// src/utils/exports/exportLavoratoriPerCantierePDF.js
import { 
  generateCompleteHTML, 
  openPrintWindow, 
  formatDate 
} from './exportHelpers';

export const exportLavoratoriPerCantierePDF = (lavoratoriPerCantiere, cantieri) => {
  let totLavoratori = 0;
  Object.values(lavoratoriPerCantiere).forEach(lav => {
    totLavoratori += lav.length;
  });

  // Box riepilogo
  const summaryBox = `
    <div style="background: #eff6ff !important; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #3b82f6;">
      <p><strong>Cantieri Attivi:</strong> ${Object.keys(lavoratoriPerCantiere).length}</p>
      <p><strong>Lavoratori Totali:</strong> ${totLavoratori}</p>
    </div>
  `;

  // Genera sezione per ogni cantiere
  const cantieriContent = Object.entries(lavoratoriPerCantiere).map(([cantiereId, lav]) => {
    const cantiere = cantieri.find(c => c.id === cantiereId);
    const nomeCantiere = cantiere ? cantiere.nome : `Cantiere ${cantiereId}`;
    const indirizzoCantiere = cantiere ? `${cantiere.indirizzo || ''} ${cantiere.citta || ''}`.trim() : '';

    return `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <h2>📍 ${nomeCantiere}</h2>
        ${indirizzoCantiere ? `<p style="margin-top: -10px; color: #666;"><em>${indirizzoCantiere}</em></p>` : ''}
        <p><strong>Numero Lavoratori:</strong> ${lav.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>Nome Completo</th>
              <th>Qualifica</th>
              <th>Livello</th>
              <th>Data Inizio</th>
            </tr>
          </thead>
          <tbody>
            ${lav.map(l => `
            <tr>
              <td><strong>${l.nome} ${l.cognome}</strong></td>
              <td>${l.qualifica || '-'}</td>
              <td>${l.livello || '-'}</td>
              <td>${formatDate(l.data_inizio)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  // Genera HTML completo
  const html = generateCompleteHTML({
    title: '🏗️ Lavoratori per Cantiere',
    subtitle: null,
    customColor: '#3b82f6',
    content: summaryBox + cantieriContent,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(html, 'Lavoratori per Cantiere');
};