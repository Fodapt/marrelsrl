// src/utils/exports/exportFattureEmessePDF.js
import {
  formatDate,
  formatCurrency,
  openPrintWindow,
  generateCompleteHTML
} from './exportHelpers';

/**
 * Esporta PDF con fatture emesse raggruppate per cliente e cantiere
 * @param {Object} params - Parametri per l'export
 * @param {Array} params.fattureFiltrate - Array di fatture filtrate
 * @param {Array} params.clienti - Array di clienti
 * @param {Array} params.cantieri - Array di cantieri
 * @param {Function} params.calcolaIVA - Funzione per calcolare IVA
 * @param {Function} params.calcolaImportoEffettivo - Funzione per calcolare importo effettivo
 * @param {Function} params.calcolaIncassato - Funzione per calcolare incassato
 * @param {Function} params.calcolaResiduo - Funzione per calcolare residuo
 */
export const exportFattureEmessePDF = (params) => {
  const {
    fattureFiltrate,
    clienti,
    cantieri,
    calcolaIVA,
    calcolaImportoEffettivo,
    calcolaIncassato,
    calcolaResiduo
  } = params;

  if (fattureFiltrate.length === 0) {
    alert('⚠️ Nessuna fattura da esportare!');
    return;
  }

  // ========================================
  // CSS CUSTOM PER FATTURE EMESSE
  // ========================================
  const customStyles = `
    @media print {
      @page { 
        size: landscape; 
        margin: 0.5cm;
      }
      
      .totali, .riepilogo-section {
        background-color: #f0f9ff !important;
        border: 2px solid #2563eb !important;
      }
      
      .totale-item {
        background-color: white !important;
        border: 1px solid #bfdbfe !important;
      }
      
      tr, .totali, .totale-item, .riepilogo-section {
        page-break-inside: avoid;
      }
    }
    
    .totali {
      margin-top: 20px;
      padding: 15px;
      background-color: #f0f9ff !important;
      border: 2px solid #2563eb !important;
      border-radius: 6px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totali h2 {
      color: #1e40af;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: bold;
    }
    
    .totali-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    
    .totale-item {
      background-color: white !important;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      -webkit-print-color-adjust: exact !important;
    }
    
    .totale-label {
      font-size: 11px;
      color: #1e40af;
      margin-bottom: 4px;
      font-weight: 600;
    }
    
    .totale-valore {
      font-size: 18px;
      font-weight: bold;
      color: #1e3a8a;
    }
    
    .riepilogo-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #f0fdf4 !important;
      border: 2px solid #10b981 !important;
      border-radius: 6px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .riepilogo-section h2 {
      color: #065f46;
      margin-bottom: 15px;
      font-size: 16px;
    }
    
    .riepilogo-section table {
      margin-top: 10px;
      background-color: white !important;
    }
    
    .riepilogo-section th {
      background-color: #10b981 !important;
      color: white !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .legenda {
      margin-top: 20px;
      text-align: center;
      color: #666;
      font-size: 9px;
      padding: 10px;
      background-color: #f9fafb !important;
      border-radius: 4px;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact !important;
    }
    
    .legenda strong {
      color: #000;
      font-size: 10px;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      margin: 0 4px;
      font-weight: 600;
      font-size: 9px;
    }
    
    .nota-credito-row {
      background-color: #fee2e2 !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .text-red { color: #dc2626; font-weight: bold; }
    .text-green { color: #059669; }
    .text-orange { color: #d97706; }
  `;

  // ========================================
  // CALCOLA TOTALI GENERALI
  // ========================================
  let totaleImponibili = 0;
  let totaleIVA = 0;
  let totaleImponibileConIVA = 0;
  let totaleIncassatoGlobale = 0;
  let totaleResiduoGlobale = 0;

  // ========================================
  // RAGGRUPPA PER CLIENTE E CANTIERE
  // ========================================
  const fatturePerCliente = {};
  const fatturePerCantiere = {};

  fattureFiltrate.forEach(fattura => {
    // Per cliente
    const clienteId = fattura.cliente_id;
    if (!fatturePerCliente[clienteId]) {
      fatturePerCliente[clienteId] = [];
    }
    fatturePerCliente[clienteId].push(fattura);

    // Per cantiere
    const cantiereId = fattura.cantiere_id || 'nessuno';
    if (!fatturePerCantiere[cantiereId]) {
      fatturePerCantiere[cantiereId] = [];
    }
    fatturePerCantiere[cantiereId].push(fattura);
  });

  // ========================================
  // GENERA TABELLA PRINCIPALE
  // ========================================
  const generateTabellaFatture = () => {
    let html = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Numero</th>
            <th>Cliente</th>
            <th>Cantiere</th>
            <th style="text-align: center;">Tipo</th>
            <th style="text-align: right;">Imponibile</th>
            <th style="text-align: right;">IVA</th>
            <th style="text-align: right;">Tot. Imp.+IVA</th>
            <th style="text-align: right;">Tot. Fattura</th>
            <th style="text-align: right;">Residuo</th>
          </tr>
        </thead>
        <tbody>
    `;

    fattureFiltrate.forEach(fattura => {
      const cliente = clienti.find(c => c.id === fattura.cliente_id);
      const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
      const isNotaCredito = fattura.tipo === 'nota_credito';
      const moltiplicatore = isNotaCredito ? -1 : 1;

      const imponibile = parseFloat(fattura.imponibile || 0) * moltiplicatore;
      const iva = fattura.reverse_charge ? 0 : calcolaIVA(fattura.imponibile, fattura.percentuale_iva) * moltiplicatore;
      const imponibileConIVA = imponibile + iva;
      const totaleFattura = (fattura.reverse_charge || fattura.versamento_iva_diretto) 
        ? imponibile 
        : imponibileConIVA;
      const incassato = calcolaIncassato(fattura);
      const residuo = totaleFattura - incassato;

      if (!isNotaCredito) {
        totaleImponibili += imponibile;
        totaleIVA += iva;
        totaleImponibileConIVA += imponibileConIVA;
      }
      totaleIncassatoGlobale += incassato;
      totaleResiduoGlobale += residuo;

      const rowClass = isNotaCredito ? 'nota-credito-row' : '';
      const textClass = isNotaCredito ? 'text-red' : '';

      // Badge tipo documento
      let badge = '';
      if (isNotaCredito) {
        badge = '<span class="badge" style="background-color: #dc2626; color: white;">NC</span>';
      } else if (fattura.versamento_iva_diretto) {
        badge = '<span class="badge" style="background-color: #9333ea; color: white;">IVA DIR</span>';
      } else if (fattura.reverse_charge) {
        badge = '<span class="badge" style="background-color: #f97316; color: white;">RC</span>';
      } else {
        badge = '<span class="badge" style="background-color: #2563eb; color: white;">FATT</span>';
      }

      html += `
        <tr class="${rowClass}">
          <td>${formatDate(fattura.data_fattura)}</td>
          <td style="font-weight: 600;">${fattura.numero_fattura}</td>
          <td>${cliente?.ragione_sociale || '-'}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td style="text-align: center;">${badge}</td>
          <td style="text-align: right;" class="${textClass}">${formatCurrency(imponibile)}</td>
          <td style="text-align: right;" class="${textClass}">${formatCurrency(iva)}</td>
          <td style="text-align: right;" class="${textClass}">${formatCurrency(imponibileConIVA)}</td>
          <td style="text-align: right; font-weight: 600;" class="${textClass}">${formatCurrency(totaleFattura)}</td>
          <td style="text-align: right; font-weight: 600;" class="text-orange">${formatCurrency(residuo)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  };

  // ========================================
  // GENERA TOTALI GENERALI
  // ========================================
  const generateTotaliGenerali = () => {
    return `
      <div class="totali">
        <h2>📊 Riepilogo Totali Generali</h2>
        <div class="totali-grid">
          <div class="totale-item">
            <div class="totale-label">Totale Imponibili</div>
            <div class="totale-valore">${formatCurrency(totaleImponibili)}</div>
          </div>
          <div class="totale-item">
            <div class="totale-label">Totale IVA</div>
            <div class="totale-valore">${formatCurrency(totaleIVA)}</div>
          </div>
          <div class="totale-item">
            <div class="totale-label">Totale Imponibile + IVA</div>
            <div class="totale-valore">${formatCurrency(totaleImponibileConIVA)}</div>
          </div>
          <div class="totale-item">
            <div class="totale-label">Totale Residuo</div>
            <div class="totale-valore" style="color: #d97706;">${formatCurrency(totaleResiduoGlobale)}</div>
          </div>
        </div>
      </div>
    `;
  };

  // ========================================
  // GENERA TOTALI PER CLIENTE
  // ========================================
  const generateTotaliClienti = () => {
    let html = `
      <div class="riepilogo-section">
        <h2>👔 Totali per Cliente</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th style="text-align: center;">N° Fatture</th>
              <th style="text-align: right;">Imponibile</th>
              <th style="text-align: right;">IVA</th>
              <th style="text-align: right;">Imp. + IVA</th>
              <th style="text-align: right;">Residuo</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(fatturePerCliente).forEach(clienteId => {
      const fattureCliente = fatturePerCliente[clienteId];
      const cliente = clienti.find(c => c.id === clienteId);
      
      let totImponibile = 0;
      let totIVA = 0;
      let totImponibileIVA = 0;
      let totIncassato = 0;
      let totResiduo = 0;

      fattureCliente.forEach(f => {
        const isNC = f.tipo === 'nota_credito';
        const molt = isNC ? -1 : 1;
        const imp = parseFloat(f.imponibile || 0) * molt;
        const iva = f.reverse_charge ? 0 : calcolaIVA(f.imponibile, f.percentuale_iva) * molt;
        
        if (!isNC) {
          totImponibile += imp;
          totIVA += iva;
          totImponibileIVA += imp + iva;
        }
        const incassato = calcolaIncassato(f);
        const totaleFatt = (f.reverse_charge || f.versamento_iva_diretto) ? imp : imp + iva;
        totIncassato += incassato;
        totResiduo += (totaleFatt - incassato);
      });

      html += `
        <tr>
          <td style="font-weight: 600;">${cliente?.ragione_sociale || 'Cliente Sconosciuto'}</td>
          <td style="text-align: center;">${fattureCliente.length}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totImponibile)}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totIVA)}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totImponibileIVA)}</td>
          <td style="text-align: right; font-weight: 600; color: #d97706;">${formatCurrency(totResiduo)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  };

  // ========================================
  // GENERA TOTALI PER CANTIERE
  // ========================================
  const generateTotaliCantieri = () => {
    let html = `
      <div class="riepilogo-section">
        <h2>🏗️ Totali per Cantiere</h2>
        <table>
          <thead>
            <tr>
              <th>Cantiere</th>
              <th style="text-align: center;">N° Fatture</th>
              <th style="text-align: right;">Imponibile</th>
              <th style="text-align: right;">IVA</th>
              <th style="text-align: right;">Imp. + IVA</th>
              <th style="text-align: right;">Residuo</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(fatturePerCantiere).forEach(cantiereId => {
      const fattureCantiere = fatturePerCantiere[cantiereId];
      const cantiere = cantiereId === 'nessuno' ? null : cantieri.find(c => c.id === cantiereId);
      
      let totImponibile = 0;
      let totIVA = 0;
      let totImponibileIVA = 0;
      let totIncassato = 0;
      let totResiduo = 0;

      fattureCantiere.forEach(f => {
        const isNC = f.tipo === 'nota_credito';
        const molt = isNC ? -1 : 1;
        const imp = parseFloat(f.imponibile || 0) * molt;
        const iva = f.reverse_charge ? 0 : calcolaIVA(f.imponibile, f.percentuale_iva) * molt;
        
        if (!isNC) {
          totImponibile += imp;
          totIVA += iva;
          totImponibileIVA += imp + iva;
        }
        const incassato = calcolaIncassato(f);
        const totaleFatt = (f.reverse_charge || f.versamento_iva_diretto) ? imp : imp + iva;
        totIncassato += incassato;
        totResiduo += (totaleFatt - incassato);
      });

      html += `
        <tr>
          <td style="font-weight: 600;">${cantiere?.nome || 'Nessun Cantiere'}</td>
          <td style="text-align: center;">${fattureCantiere.length}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totImponibile)}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totIVA)}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(totImponibileIVA)}</td>
          <td style="text-align: right; font-weight: 600; color: #d97706;">${formatCurrency(totResiduo)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  };

  // ========================================
  // GENERA LEGENDA
  // ========================================
  const generateLegenda = () => {
    return `
      <div class="legenda">
        <p><strong>Legenda:</strong></p>
        <p style="margin: 8px 0;">
          <span class="badge" style="background-color: #2563eb; color: white;">FATT</span> = Fattura Normale |
          <span class="badge" style="background-color: #9333ea; color: white;">IVA DIR</span> = IVA Diretta |
          <span class="badge" style="background-color: #f97316; color: white;">RC</span> = Reverse Charge |
          <span class="badge" style="background-color: #dc2626; color: white;">NC</span> = Nota di Credito
        </p>
        <p style="margin-top: 8px; font-size: 8px; line-height: 1.5;">
          <strong>Nota:</strong> Per fatture con IVA Diretta o Reverse Charge, la colonna "Tot. Fattura" mostra solo l'imponibile.<br/>
          La colonna "Tot. Imp.+IVA" mostra sempre il totale teorico con IVA, anche se non addebitata al cliente.
        </p>
      </div>
    `;
  };

  // ========================================
  // ASSEMBLA DOCUMENTO
  // ========================================
  const contentHTML = 
    generateTabellaFatture() +
    generateTotaliGenerali() +
    generateTotaliClienti() +
    generateTotaliCantieri() +
    generateLegenda();

  const htmlDocument = generateCompleteHTML({
    title: '📄 Fatture Emesse - Marrel S.r.l.',
    subtitle: null,
    content: contentHTML,
    customColor: '#2563eb',
    customStyles: customStyles,
    buttonText: '🖨️ Stampa / Salva PDF'
  });

  openPrintWindow(htmlDocument, 'Fatture_Emesse_Marrel');
};