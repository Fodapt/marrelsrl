import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function FattureEmesse() {
  const {
  fattureEmesse = [],
  clienti = [],
  cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ tipo: 'fattura' });
  const [saving, setSaving] = useState(false);
  const [showAccontiModal, setShowAccontiModal] = useState(false);
  const [fatturaSelezionata, setFatturaSelezionata] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState('');
const [filtroCantiere, setFiltroCantiere] = useState('');
const [filtroTipo, setFiltroTipo] = useState('');

  // ✅ MOSTRA LOADING
  if (loading.fattureEmesse || loading.fornitori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento fatture...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calcolaIVA = (imponibile, percentualeIVA) => {
    return (parseFloat(imponibile || 0) * parseFloat(percentualeIVA || 22)) / 100;
  };

  const calcolaTotale = (imponibile, percentualeIVA) => {
  return parseFloat(imponibile || 0) + calcolaIVA(imponibile, percentualeIVA);
};

const calcolaImportoEffettivo = (fattura) => {
  const totale = (fattura.reverse_charge || fattura.versamento_iva_diretto) 
  ? parseFloat(fattura.imponibile || 0) 
  : calcolaTotale(fattura.imponibile, fattura.percentuale_iva);
  return fattura.tipo === 'nota_credito' ? -totale : totale;
};

const calcolaIncassato = (fattura) => {
  if (!fattura.acconti || fattura.acconti.length === 0) return 0;
  return fattura.acconti.reduce((sum, acc) => sum + parseFloat(acc.importo || 0), 0);
};

const calcolaResiduo = (fattura) => {
  // Se versamento IVA diretto o reverse charge, il residuo va calcolato solo sull'imponibile
  if (fattura.versamento_iva_diretto || fattura.reverse_charge) {
    const imponibile = parseFloat(fattura.imponibile || 0);
    const imponibileEffettivo = fattura.tipo === 'nota_credito' ? -imponibile : imponibile;
    return imponibileEffettivo - calcolaIncassato(fattura);
  }
  
  // Altrimenti calcolo normale con IVA inclusa
  const totale = calcolaImportoEffettivo(fattura);
  return totale - calcolaIncassato(fattura);
};
  const fattureFiltrate = useMemo(() => {
  return fattureEmesse.filter(f => {
    if (filtroCliente && f.cliente_id !== filtroCliente) return false;
    if (filtroCantiere && f.cantiere_id !== filtroCantiere) return false;
    if (filtroTipo) {
      const tipoFattura = f.tipo || 'fattura';
      if (tipoFattura !== filtroTipo) return false;
    }
    return true;
  }).sort((a, b) => {
    // Prima ordina per anno (dal più recente al più vecchio)
    const annoA = new Date(a.data_fattura).getFullYear();
    const annoB = new Date(b.data_fattura).getFullYear();
    if (annoB !== annoA) return annoB - annoA;
    
    // Poi per numero fattura (dal più alto al più basso)
    const numA = a.numero_fattura || '';
    const numB = b.numero_fattura || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  });
}, [fattureEmesse, filtroCliente, filtroCantiere, filtroTipo]);

  const riepilogoCliente = useMemo(() => {
    if (!filtroCliente && !filtroCantiere) return null; 
    
    const fatture = fattureEmesse.filter(f => {
    if (filtroCliente && f.cliente_id !== filtroCliente) return false; 
    if (filtroCantiere && f.cantiere_id !== filtroCantiere) return false; 
    return true; 
  });
    const totaleEmesso = fatture.reduce((sum, f) => {
  const totale = calcolaTotale(f.imponibile, f.percentuale_iva);
  return f.tipo === 'nota_credito' ? sum - totale : sum + totale;
}, 0);
    const totaleIncassato = fatture.reduce((sum, f) => 
      sum + calcolaIncassato(f), 0);
    const residuo = totaleEmesso - totaleIncassato;
    
    return { totaleEmesso, totaleIncassato, residuo };
  }, [fattureEmesse, filtroCliente, filtroCantiere]);

  // ✅ SALVA FATTURA
  const handleSave = async () => {
  if (!formData.dataFattura || !formData.numeroFattura || !formData.clienteId || !formData.imponibile) {
    return alert('⚠️ Compila tutti i campi obbligatori:\n- Data Fattura\n- Numero Fattura\n- Cliente\n- Imponibile');
  }

  if (formData.tipo === 'nota_credito' && !formData.fatturaRiferimento) {
    return alert('⚠️ Per le note di credito è obbligatorio indicare la fattura di riferimento');
  }

    setSaving(true);

    const dataForSupabase = {
  data_fattura: formData.dataFattura,
  numero_fattura: formData.numeroFattura,
  cliente_id: formData.clienteId,
  cantiere_id: formData.cantiereId || null,
  imponibile: parseFloat(formData.imponibile),
  percentuale_iva: formData.reverseCharge ? 0 : parseFloat(formData.percentualeIVA || 22),
  tipo: formData.tipo || 'fattura',
  fattura_riferimento: formData.fatturaRiferimento || null,
  acconti: formData.acconti || [],
  note: formData.note || null,
  versamento_iva_diretto: formData.versamentoIvaDiretto || false,
  reverse_charge: formData.reverseCharge || false
};
    let result;
    if (editingId) {
      result = await updateRecord('fattureEmesse', editingId, dataForSupabase);
    } else {
      result = await addRecord('fattureEmesse', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Fattura aggiornata!' : '✅ Fattura creata!');
      setShowForm(false);
      setFormData({ tipo: 'fattura', percentualeIVA: 22, acconti: [] });
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA FATTURA
  const handleDelete = async (fattura) => {
    if (!confirm(`❌ Eliminare la fattura ${fattura.numero_fattura}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('fattureEmesse', fattura.id);

    if (result.success) {
      alert('✅ Fattura eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT FATTURA
  const handleEdit = (fattura) => {
  setFormData({
    dataFattura: fattura.data_fattura,
    numeroFattura: fattura.numero_fattura,
    clienteId: fattura.cliente_id,
    cantiereId: fattura.cantiere_id,
    imponibile: fattura.imponibile,
    percentualeIVA: fattura.percentuale_iva,
    acconti: fattura.acconti || [],
    note: fattura.note,
    tipo: fattura.tipo || 'fattura',
    fatturaRiferimento: fattura.fattura_riferimento,
    versamentoIvaDiretto: fattura.versamento_iva_diretto || false,
    reverseCharge: fattura.reverse_charge || false
  });
    setEditingId(fattura.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ AGGIUNGI ACCONTO
  const aggiungiAcconto = async (fatturaId, importo, dataIncasso) => {
    const fattura = fattureEmesse.find(f => f.id === fatturaId);
    if (!fattura) return;

    const nuovoAcconto = {
      id: Date.now().toString(),
      importo: parseFloat(importo),
      dataIncasso,
      data: new Date().toISOString()
    };

    const result = await updateRecord('fattureEmesse', fatturaId, {
      acconti: [...(fattura.acconti || []), nuovoAcconto]
    });

    if (result.success) {
      setFatturaSelezionata(result.data);
      alert('✅ Acconto aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ RIMUOVI ACCONTO
  const rimuoviAcconto = async (fatturaId, accontoId) => {
    const fattura = fattureEmesse.find(f => f.id === fatturaId);
    if (!fattura) return;

    const result = await updateRecord('fattureEmesse', fatturaId, {
      acconti: (fattura.acconti || []).filter(a => a.id !== accontoId)
    });

    if (result.success) {
      setFatturaSelezionata(result.data);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };


  // ✅ EXPORT PDF CON TOTALI PER CLIENTE E CANTIERE
  const exportPDF = () => {
    const fatture = fattureFiltrate;

    if (fatture.length === 0) {
      alert('✅ Nessuna fattura da esportare!');
      return;
    }

    // ========== CALCOLA TOTALI GENERALI ==========
    let totaleImponibili = 0;
    let totaleIVA = 0;
    let totaleImponibileConIVA = 0;
    let totaleIncassatoGlobale = 0;

    // ========== RAGGRUPPA PER CLIENTE ==========
    const fatturePerCliente = {};
    fatture.forEach(fattura => {
      const clienteId = fattura.cliente_id;
      if (!fatturePerCliente[clienteId]) {
        fatturePerCliente[clienteId] = [];
      }
      fatturePerCliente[clienteId].push(fattura);
    });

    // ========== RAGGRUPPA PER CANTIERE ==========
    const fatturePerCantiere = {};
    fatture.forEach(fattura => {
      const cantiereId = fattura.cantiere_id || 'nessuno';
      if (!fatturePerCantiere[cantiereId]) {
        fatturePerCantiere[cantiereId] = [];
      }
      fatturePerCantiere[cantiereId].push(fattura);
    });

    // ========== GENERA RIGHE HTML ==========
    const righeHTML = fatture.map(fattura => {
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

      if (!isNotaCredito) {
        totaleImponibili += imponibile;
        totaleIVA += iva;
        totaleImponibileConIVA += imponibileConIVA;
      }
      totaleIncassatoGlobale += incassato;

      const styleClass = isNotaCredito ? 'color: #dc2626; font-weight: bold;' : '';
      const bgClass = isNotaCredito ? 'background-color: #fee2e2;' : '';

      return `
        <tr style="${bgClass}">
          <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(fattura.data_fattura)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">${fattura.numero_fattura}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${cliente?.ragione_sociale || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${cantiere?.nome || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
            ${isNotaCredito ? '<span style="background-color: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">NC</span>' : 
              fattura.versamento_iva_diretto ? '<span style="background-color: #9333ea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">IVA DIR</span>' :
              fattura.reverse_charge ? '<span style="background-color: #f97316; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">RC</span>' : 
              '<span style="background-color: #2563eb; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">FATT</span>'}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; ${styleClass}">€ ${imponibile.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; ${styleClass}">€ ${iva.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; ${styleClass}">€ ${imponibileConIVA.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600; ${styleClass}">€ ${totaleFattura.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #16a34a; font-weight: 600;">€ ${incassato.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // ========== GENERA TOTALI PER CLIENTE ==========
    const totaliClientiHTML = Object.keys(fatturePerCliente).map(clienteId => {
      const fattureCliente = fatturePerCliente[clienteId];
      const cliente = clienti.find(c => c.id === clienteId);
      
      let totImponibile = 0;
      let totIVA = 0;
      let totImponibileIVA = 0;
      let totIncassato = 0;

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
        totIncassato += calcolaIncassato(f);
      });

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">${cliente?.ragione_sociale || 'Cliente Sconosciuto'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${fattureCliente.length}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totImponibile.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totIVA.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totImponibileIVA.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600; color: #16a34a;">€ ${totIncassato.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // ========== GENERA TOTALI PER CANTIERE ==========
    const totaliCantieriHTML = Object.keys(fatturePerCantiere).map(cantiereId => {
      const fattureCantiere = fatturePerCantiere[cantiereId];
      const cantiere = cantiereId === 'nessuno' ? null : cantieri.find(c => c.id === cantiereId);
      
      let totImponibile = 0;
      let totIVA = 0;
      let totImponibileIVA = 0;
      let totIncassato = 0;

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
        totIncassato += calcolaIncassato(f);
      });

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">${cantiere?.nome || 'Nessun Cantiere'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${fattureCantiere.length}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totImponibile.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totIVA.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">€ ${totImponibileIVA.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600; color: #16a34a;">€ ${totIncassato.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const dataStampa = new Date().toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fatture Emesse - Marrel S.r.l.</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      padding: 20px;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: white;
    }
    
    @media print {
      body { 
        margin: 0; 
        padding: 10px;
      }
      
      @page { 
        size: landscape; 
        margin: 0.5cm;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      table, th, td {
        border: 1px solid #000 !important;
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
      
      button, .no-print {
        display: none !important;
      }
    }
    
    h1 { 
      text-align: center; 
      color: #1e40af; 
      margin-bottom: 8px;
      font-size: 22px;
      font-weight: bold;
    }
    
    h2 {
      color: #1e40af;
      margin: 20px 0 12px 0;
      font-size: 16px;
      font-weight: bold;
    }
    
    .info { 
      text-align: center; 
      color: #666; 
      margin-bottom: 15px;
      font-size: 10px;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      font-size: 10px;
    }
    
    th { 
      background-color: #2563eb; 
      color: white; 
      padding: 8px 6px; 
      text-align: left; 
      border: 1px solid #1e40af;
      font-size: 10px;
      font-weight: 600;
    }
    
    td { 
      border: 1px solid #ddd; 
      padding: 6px;
      font-size: 10px;
    }
    
    tr:nth-child(even) { 
      background-color: #f9fafb; 
    }
    
    .totali {
      margin-top: 20px;
      padding: 15px;
      background-color: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 6px;
      page-break-inside: avoid;
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
      background-color: white;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
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
      background-color: #f0fdf4;
      border: 2px solid #10b981;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    
    .riepilogo-section h2 {
      color: #065f46;
      margin-bottom: 15px;
    }
    
    .riepilogo-section table {
      margin-top: 10px;
      background-color: white;
    }
    
    .riepilogo-section th {
      background-color: #10b981;
      color: white;
    }
    
    .legenda {
      margin-top: 20px;
      text-align: center;
      color: #666;
      font-size: 9px;
      padding: 10px;
      background-color: #f9fafb;
      border-radius: 4px;
      page-break-inside: avoid;
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
    
    .button-container {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background-color: #f0f9ff;
      border-radius: 6px;
    }
    
    button {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      margin: 0 10px;
    }
    
    button:hover {
      background-color: #1e40af;
    }
    
    button.secondary {
      background-color: #10b981;
    }
    
    button.secondary:hover {
      background-color: #059669;
    }
  </style>
</head>
<body>
  <h1>📄 Fatture Emesse - Marrel S.r.l.</h1>
  <p class="info">Report generato il: ${dataStampa}</p>
  
  <div class="button-container no-print">
    <button onclick="window.print()">🖨️ Stampa / Salva PDF</button>
    <button class="secondary" onclick="window.close()">✕ Chiudi</button>
  </div>
  
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
        <th style="text-align: right;">Incassato</th>
      </tr>
    </thead>
    <tbody>
      ${righeHTML}
    </tbody>
  </table>

  <div class="totali">
    <h2>📊 Riepilogo Totali Generali</h2>
    <div class="totali-grid">
      <div class="totale-item">
        <div class="totale-label">Totale Imponibili</div>
        <div class="totale-valore">€ ${totaleImponibili.toFixed(2)}</div>
      </div>
      <div class="totale-item">
        <div class="totale-label">Totale IVA</div>
        <div class="totale-valore">€ ${totaleIVA.toFixed(2)}</div>
      </div>
      <div class="totale-item">
        <div class="totale-label">Totale Imponibile + IVA</div>
        <div class="totale-valore">€ ${totaleImponibileConIVA.toFixed(2)}</div>
      </div>
      <div class="totale-item">
        <div class="totale-label">Totale Incassato</div>
        <div class="totale-valore">€ ${totaleIncassatoGlobale.toFixed(2)}</div>
      </div>
    </div>
  </div>

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
          <th style="text-align: right;">Incassato</th>
        </tr>
      </thead>
      <tbody>
        ${totaliClientiHTML}
      </tbody>
    </table>
  </div>

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
          <th style="text-align: right;">Incassato</th>
        </tr>
      </thead>
      <tbody>
        ${totaliCantieriHTML}
      </tbody>
    </table>
  </div>

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
</body>
</html>`;

    const nuovaFinestra = window.open('', '_blank');
    if (nuovaFinestra) {
      nuovaFinestra.document.write(html);
      nuovaFinestra.document.close();
    } else {
      alert('⚠️ Popup bloccato! Abilita i popup per questo sito.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con filtri */}
      <div className="flex gap-2 items-center flex-wrap">
  <button 
    onClick={() => {
      setShowForm(true);
      setEditingId(null);
      setFormData({ tipo: 'fattura', percentualeIVA: 22, acconti: [] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }} 
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
  >
    ➕ Nuova Fattura
  </button>

  <button 
    onClick={exportPDF}
    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 whitespace-nowrap"
    disabled={fattureFiltrate.length === 0}
  >
    📄 Export PDF
  </button>


  <select 
    className="border rounded px-3 py-2 flex-1 min-w-[200px]"
    value={filtroCliente}
    onChange={(e) => setFiltroCliente(e.target.value)}
  >
          <option value="">Tutti i clienti</option>
          {clienti.map(f => (
            <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
          ))}
        </select>

        <select 
  className="border rounded px-3 py-2 flex-1 min-w-[200px]"
  value={filtroCantiere}
  onChange={(e) => setFiltroCantiere(e.target.value)}
>
  <option value="">Tutti i cantieri</option>
  {cantieri.map(c => (
    <option key={c.id} value={c.id}>{c.nome}</option>
  ))}
</select>
<select 
  className="border rounded px-3 py-2 flex-1 min-w-[200px]"
  value={filtroTipo}
  onChange={(e) => setFiltroTipo(e.target.value)}
>
  <option value="">Tutti i documenti</option>
  <option value="fattura">Solo Fatture</option>
  <option value="nota_credito">Solo Note di Credito</option>
</select>
      </div>

     

      {/* Riepilogo Cliente */}
      {riepilogoCliente && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale Emesso</div>
            <div className="text-2xl font-bold text-blue-900">
              € {riepilogoCliente.totaleEmesso.toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Totale Incassato</div>
            <div className="text-2xl font-bold text-green-900">
              € {riepilogoCliente.totaleIncassato.toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Residuo</div>
            <div className="text-2xl font-bold text-orange-900">
              € {riepilogoCliente.residuo.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Form Nuova Fattura */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Fattura
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Fattura *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={formData.dataFattura || ''}
                onChange={(e) => setFormData({...formData, dataFattura: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numero Fattura *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="es: 2025/001"
                value={formData.numeroFattura || ''}
                onChange={(e) => setFormData({...formData, numeroFattura: e.target.value})}
                disabled={saving}
              />
            </div>



    <div>
              <label className="block text-sm font-medium mb-1">Cliente *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.clienteId || ''}
                onChange={(e) => setFormData({...formData, clienteId: e.target.value, fatturaRiferimento: null})}
                disabled={saving}
              >
                <option value="">Seleziona cliente</option>
                {clienti.map(f => (
                  <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo Documento *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.tipo || 'fattura'}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                disabled={saving}
              >
                <option value="fattura">Fattura</option>
                <option value="nota_credito">Nota di Credito</option>
              </select>
            </div>

            {formData.tipo === 'nota_credito' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Fattura di Riferimento *</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.fatturaRiferimento || ''}
                  onChange={(e) => setFormData({...formData, fatturaRiferimento: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Seleziona fattura...</option>
                  {fattureEmesse
                    .filter(f => (!f.tipo || f.tipo === 'fattura') && f.cliente_id === formData.clienteId)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.numero_fattura} - {formatDate(f.data_fattura)} - € {calcolaTotale(f.imponibile, f.percentuale_iva).toFixed(2)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>



            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantiere</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.cantiereId || ''}
                onChange={(e) => setFormData({...formData, cantiereId: e.target.value})}
                disabled={saving}
              >
                <option value="">Nessun cantiere</option>
                {cantieri.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imponibile * (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={formData.imponibile || ''}
                onChange={(e) => setFormData({...formData, imponibile: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
  <label className="block text-sm font-medium mb-1">IVA (%)</label>
  <input 
    type="number" 
    step="0.01" 
    className="border rounded px-3 py-2 w-full bg-gray-50"
    value={formData.reverseCharge ? 0 : (formData.percentualeIVA || 22)}
    onChange={(e) => setFormData({...formData, percentualeIVA: e.target.value})}
    disabled={saving || formData.reverseCharge}
    readOnly={formData.reverseCharge}
  />
  {formData.reverseCharge && (
    <p className="text-xs text-orange-700 mt-1">
      IVA impostata a 0% per Reverse Charge
    </p>
  )}
</div>

            <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
  <label className="flex items-center gap-2 cursor-pointer">
    <input 
      type="checkbox" 
      className="w-4 h-4"
      checked={formData.versamentoIvaDiretto || false}
      onChange={(e) => setFormData({...formData, versamentoIvaDiretto: e.target.checked})}
      disabled={saving}
    />
    <span className="text-sm font-medium">
      🏦 Versamento IVA diretto (cliente paga solo imponibile, IVA versata allo stato)
    </span>
  </label>
  {formData.versamentoIvaDiretto && (
    <p className="text-xs text-blue-700 mt-1 ml-6">
      ⚠️ Con questa opzione, quando l'imponibile è pagato, la fattura risulterà saldata
    </p>
  )}
</div>
<div className="col-span-2 bg-orange-50 p-3 rounded border border-orange-200">
  <label className="flex items-center gap-2 cursor-pointer">
    <input 
      type="checkbox" 
      className="w-4 h-4"
      checked={formData.reverseCharge || false}
      onChange={(e) => setFormData({
        ...formData, 
        reverseCharge: e.target.checked,
        percentualeIVA: e.target.checked ? 0 : (formData.percentualeIVA || 22)
      })}
      disabled={saving}
    />
    <span className="text-sm font-medium">
      🔄 Reverse Charge (IVA a carico del cliente - IVA 0%)
    </span>
  </label>
  {formData.reverseCharge && (
    <p className="text-xs text-orange-700 mt-1 ml-6">
      ⚠️ L'IVA è automaticamente impostata a 0%. Il cliente applicherà l'IVA autonomamente.
    </p>
  )}
</div>

            

            <div className="col-span-2 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
  <div className="text-sm text-gray-600">IVA</div>
  <div className="text-xl font-bold">
    € {formData.reverseCharge ? '0.00' : calcolaIVA(formData.imponibile, formData.percentualeIVA).toFixed(2)}
  </div>
</div>
                <div>
  <div className="text-sm text-gray-600">Totale</div>
  <div className={`text-2xl font-bold ${formData.tipo === 'nota_credito' ? 'text-red-600' : 'text-blue-600'}`}>
    € {(formData.tipo === 'nota_credito' ? -1 : 1) * (formData.reverseCharge ? parseFloat(formData.imponibile || 0) : calcolaTotale(formData.imponibile, formData.percentualeIVA)).toFixed(2)}
  </div>
</div>
                <div>
                  <div className="text-sm text-gray-600">Residuo</div>
                  <div className="text-xl font-bold text-orange-600">
                    € {(calcolaTotale(formData.imponibile, formData.percentualeIVA) - calcolaIncassato(formData)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea 
                className="border rounded px-3 py-2 w-full"
                rows="2"
                placeholder="Note aggiuntive..."
                value={formData.note || ''}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '⏳ Salvataggio...' : '✓ Salva'}
            </button>
            <button 
              onClick={() => {
                setShowForm(false);
                setFormData({ percentualeIVA: 22, acconti: [] });
                setEditingId(null);
              }} 
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              disabled={saving}
            >
              ✕ Annulla
            </button>
          </div>
        </div>
      )}

      {/* Tabella Fatture */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Numero</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Cantiere</th>
              <th className="px-3 py-2 text-right">Imponibile</th>
              <th className="px-3 py-2 text-right">IVA</th>
              <th className="px-3 py-2 text-right">Totale</th>
              <th className="px-3 py-2 text-right">Incassato</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-right">Residuo</th>
              <th className="px-3 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {fattureFiltrate.map(fattura => {
              const cliente = clienti.find(c => c.id === fattura.cliente_id);
              const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
              const totale = calcolaImportoEffettivo(fattura);
const incassato = calcolaIncassato(fattura);
const residuo = calcolaResiduo(fattura);
const isNotaCredito = fattura.tipo === 'nota_credito';

              return (
                <tr key={fattura.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{formatDate(fattura.data_fattura)}</td>
                  <td className="px-3 py-2 font-mono">{fattura.numero_fattura}</td>
                  <td className="px-3 py-2">{cliente?.ragione_sociale || '-'}</td>
                  <td className="px-3 py-2">{cantiere?.nome || '-'}</td>
                  <td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {((isNotaCredito ? -1 : 1) * parseFloat(fattura.imponibile || 0)).toFixed(2)}
</td>
<td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {fattura.reverse_charge ? '0.00' : ((isNotaCredito ? -1 : 1) * calcolaIVA(fattura.imponibile, fattura.percentuale_iva)).toFixed(2)}
</td>
<td className={`px-3 py-2 text-right font-medium ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {(fattura.versamento_iva_diretto 
      ? ((isNotaCredito ? -1 : 1) * parseFloat(fattura.imponibile || 0))
      : (fattura.reverse_charge 
          ? ((isNotaCredito ? -1 : 1) * parseFloat(fattura.imponibile || 0))
          : totale)
     ).toFixed(2)}
</td>
<td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : 'text-green-600'}`}>
  € {incassato.toFixed(2)}
</td>
<td className="px-3 py-2">
  <div className="flex flex-col gap-1">
    {isNotaCredito ? (
      <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
        Nota Credito
      </span>
    ) : (
      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
        Fattura
      </span>
    )}
    {fattura.versamento_iva_diretto && (
      <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
        🏦 IVA Diretta
      </span>
    )}
    {fattura.reverse_charge && (
      <span className="inline-block bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
        🔄 Reverse Charge
      </span>
    )}
  </div>
</td>
<td className={`px-3 py-2 text-right font-medium ${isNotaCredito ? 'text-red-600' : 'text-orange-600'}`}>
  € {residuo.toFixed(2)}
</td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => {
                        setFatturaSelezionata(fattura);
                        setShowAccontiModal(true);
                      }} 
                      className="text-green-600 mr-2" 
                      title="Gestisci Acconti"
                    >
                      💰
                    </button>
                    <button 
                      onClick={() => handleEdit(fattura)} 
                      className="text-blue-600 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(fattura)} 
                      className="text-red-600"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {fattureFiltrate.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">📄</p>
            <p>Nessuna fattura registrata</p>
            <p className="text-sm mt-2 text-gray-400">Clicca su "➕ Nuova Fattura" per iniziare</p>
          </div>
        )}
      </div>

      {/* Modal Acconti */}
      {showAccontiModal && fatturaSelezionata && (
        <AccontiModal
          fattura={fatturaSelezionata}
          onClose={() => {
            setShowAccontiModal(false);
            setFatturaSelezionata(null);
          }}
          aggiungiAcconto={aggiungiAcconto}
          rimuoviAcconto={rimuoviAcconto}
          formatDate={formatDate}
          calcolaTotale={calcolaTotale}
          calcolaIncassato={calcolaIncassato}
        />
      )}
    </div>
  );
}

function AccontiModal({ fattura, onClose, aggiungiAcconto, rimuoviAcconto, formatDate, calcolaTotale, calcolaIncassato }) {
  const [importoAcconto, setImportoAcconto] = useState('');
  const [dataIncasso, setDataIncasso] = useState(new Date().toISOString().split('T')[0]);

  const totale = (fattura.reverse_charge || fattura.versamento_iva_diretto) ? parseFloat(fattura.imponibile || 0) : calcolaTotale(fattura.imponibile, fattura.percentuale_iva);
  const incassato = calcolaIncassato(fattura);
  const residuo = totale - incassato;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          💰 Acconti - Fattura {fattura.numero_fattura}
        </h3>

        {/* Riepilogo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-700">Totale Fattura</div>
            <div className="text-xl font-bold">€ {totale.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-700">Incassato</div>
            <div className="text-xl font-bold">€ {incassato.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-sm text-orange-700">Residuo</div>
            <div className="text-xl font-bold">€ {residuo.toFixed(2)}</div>
          </div>
        </div>

        {/* Form Nuovo Acconto */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold mb-3">Registra Nuovo Acconto</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Importo (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={importoAcconto}
                onChange={(e) => setImportoAcconto(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Data Incasso</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={dataIncasso}
                onChange={(e) => setDataIncasso(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {
                  if (!importoAcconto || parseFloat(importoAcconto) <= 0) {
                    return alert('⚠️ Inserisci un importo valido');
                  }
                  aggiungiAcconto(fattura.id, importoAcconto, dataIncasso);
                  setImportoAcconto('');
                  setDataIncasso(new Date().toISOString().split('T')[0]);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                ➕ Aggiungi
              </button>
            </div>
          </div>
        </div>

        {/* Lista Acconti */}
        <div>
          <h4 className="font-semibold mb-3">Acconti Registrati</h4>
          {(fattura.acconti || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6 bg-gray-50 rounded">
              Nessun acconto registrato
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Data Incasso</th>
                  <th className="px-3 py-2 text-right">Importo</th>
                  <th className="px-3 py-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {fattura.acconti.map(acc => (
                  <tr key={acc.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(acc.dataIncasso)}</td>
                    <td className="px-3 py-2 text-right font-semibold">€ {parseFloat(acc.importo).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => {
                          if (confirm('Eliminare questo acconto?')) {
                            rimuoviAcconto(fattura.id, acc.id);
                          }
                        }} 
                        className="text-red-600"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ✓ Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default FattureEmesse;