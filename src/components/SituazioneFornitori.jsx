import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function SituazioneFornitori() {
  // ✅ USA IL CONTEXT
  const { 
    ordiniFornitori = [],
    fornitori = [],
    cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  // Stati locali
  const [showOrdineForm, setShowOrdineForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingIdFatturaDiretta, setEditingIdFatturaDiretta] = useState(null);
  const [ordineFormData, setOrdineFormData] = useState({});
  const [showDettaglioModal, setShowDettaglioModal] = useState(false);
  const [ordineSelezionato, setOrdineSelezionato] = useState(null);
  const [filtroFornitore, setFiltroFornitore] = useState('');
  const [showFatturaDirettaForm, setShowFatturaDirettaForm] = useState(false);
  const [fatturaDirettaFormData, setFatturaDirettaFormData] = useState({});
  const [showAccontiModal, setShowAccontiModal] = useState(false);
  const [fatturaDirettaSelezionata, setFatturaDirettaSelezionata] = useState(null);
  const [searchNumeroFattura, setSearchNumeroFattura] = useState('');
  const [filtroCantiere, setFiltroCantiere] = useState('');
  const [filtroStato, setFiltroStato] = useState('');
  const [ordinamento, setOrdinamento] = useState('data-desc');
  const [saving, setSaving] = useState(false);

  // ✅ LOADING
  if (loading.ordiniFornitori || loading.fornitori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento situazione fornitori...</p>
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

  const calcolaAccontiFatturaDiretta = (ordine) => {
  if (!ordine || ordine.tipo !== 'fattura_diretta') return { totale: 0, pagato: 0, residuo: 0, acconti: [], noteCredito: [], totaleNoteCredito: 0 };
  
  const acconti = ordine.acconti_pagamento || [];
  const noteCredito = ordine.note_credito || [];
  
  const totalePagato = acconti.reduce((sum, acc) => sum + parseFloat(acc.importo || 0), 0);
  const totaleNoteCredito = noteCredito.reduce((sum, nc) => sum + parseFloat(nc.importo || 0), 0);
  
  const importoOriginale = parseFloat(ordine.importo || 0);
  const totaleEffettivo = importoOriginale - totaleNoteCredito;
  const residuo = totaleEffettivo - totalePagato;
  
  return { 
    totale: importoOriginale, 
    totaleEffettivo, 
    totaleNoteCredito,
    pagato: totalePagato, 
    residuo, 
    acconti,
    noteCredito 
  };
};

  const calcolaStatoOrdine = (ordine) => {
    const fatture = ordine.fatture || [];
    const acconti = fatture.filter(f => f.tipo === 'acconto');
    const finali = fatture.filter(f => f.tipo === 'finale');
    
    const totaleAcconti = acconti.reduce((sum, f) => sum + parseFloat(f.importo || 0), 0);
    const totaleFinali = finali.reduce((sum, f) => sum + parseFloat(f.importo || 0), 0);
    
    const accontiPagati = acconti
      .filter(a => a.pagato)
      .reduce((sum, f) => sum + parseFloat(f.importo || 0), 0);
    
    let residuoDaPagare = 0;
    let effettivamentePagato = accontiPagati;
    
    finali.forEach(finale => {
      const importoFinale = parseFloat(finale.importo || 0);
      let accontiDettratti = 0;
      
      (finale.accontiDettratti || []).forEach(accontoId => {
        const acconto = acconti.find(a => a.id === accontoId);
        if (acconto) {
          accontiDettratti += parseFloat(acconto.importo || 0);
        }
      });
      
      const saldoFinale = importoFinale - accontiDettratti;
      
      if (finale.pagato) {
        effettivamentePagato += saldoFinale;
      } else {
        residuoDaPagare += saldoFinale;
      }
    });
    
    if (finali.length === 0 && acconti.length > 0) {
      const importoOrdine = parseFloat(ordine.importo || 0);
      residuoDaPagare = importoOrdine - accontiPagati;
    }
    
    if (fatture.length === 0) {
      residuoDaPagare = parseFloat(ordine.importo || 0);
    }
    
    let totaleDettratto = 0;
    finali.forEach(finale => {
      (finale.accontiDettratti || []).forEach(accontoId => {
        const acconto = acconti.find(a => a.id === accontoId);
        if (acconto) totaleDettratto += parseFloat(acconto.importo || 0);
      });
    });
    
    const importoOrdine = parseFloat(ordine.importo || 0);
    const totaleFatturato = totaleAcconti + totaleFinali;
    const residuoOrdine = importoOrdine - totaleFatturato;
    
    return {
      totaleAcconti,
      totaleFinali,
      totaleFatturato,
      totaleDettratto,
      saldoDaPagare: residuoDaPagare,
      residuoOrdine,
      numeroAcconti: acconti.length,
      numeroFinali: finali.length,
      effettivamentePagato,
      accontiPagati
    };
  };

  const ordiniFiltrati = useMemo(() => {
    let risultato = ordiniFornitori.filter(ord => {
      if (filtroFornitore && ord.fornitore_id !== filtroFornitore) return false;
      if (filtroCantiere && ord.cantiere_id !== filtroCantiere) return false;
      
      if (searchNumeroFattura) {
        const searchLower = searchNumeroFattura.toLowerCase();
        if (ord.tipo === 'fattura_diretta') {
          if (!ord.numero_fattura?.toLowerCase().includes(searchLower)) {
            return false;
          }
        } else {
          const hasFatturaMatch = (ord.fatture || []).some(f => 
            f.numeroFattura?.toLowerCase().includes(searchLower)
          );
          if (!hasFatturaMatch) return false;
        }
      }
      
      if (filtroStato) {
        if (ord.tipo === 'fattura_diretta') {
          const accInfo = calcolaAccontiFatturaDiretta(ord);
          if (filtroStato === 'pagato' && accInfo.residuo > 0) return false;
          if (filtroStato === 'non_pagato' && accInfo.residuo <= 0) return false;
        } else {
          const stato = calcolaStatoOrdine(ord);
          if (filtroStato === 'pagato' && stato.saldoDaPagare > 0) return false;
          if (filtroStato === 'non_pagato' && stato.saldoDaPagare <= 0) return false;
        }
      }
      
      return true;
    });

    if (ordinamento === 'data-desc') {
      risultato.sort((a, b) => new Date(b.data_ordine) - new Date(a.data_ordine));
    } else if (ordinamento === 'data-asc') {
      risultato.sort((a, b) => new Date(a.data_ordine) - new Date(b.data_ordine));
    } else if (ordinamento === 'importo-desc') {
      risultato.sort((a, b) => parseFloat(b.importo || 0) - parseFloat(a.importo || 0));
    } else if (ordinamento === 'importo-asc') {
      risultato.sort((a, b) => parseFloat(a.importo || 0) - parseFloat(b.importo || 0));
    }

    return risultato;
  }, [ordiniFornitori, filtroFornitore, filtroCantiere, searchNumeroFattura, filtroStato, ordinamento]);

  const riepilogoGenerale = useMemo(() => {
    let totaleOrdini = 0;
    let totalePagato = 0;
    let saldoTotale = 0;
    
    ordiniFornitori.forEach(ord => {
      totaleOrdini += parseFloat(ord.importo || 0);
      
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        totalePagato += accInfo.pagato;
        saldoTotale += accInfo.residuo;
      } else {
        const stato = calcolaStatoOrdine(ord);
        totalePagato += stato.effettivamentePagato;
        saldoTotale += stato.saldoDaPagare;
      }
    });
    
    return { 
      numeroOrdini: ordiniFornitori.length,
      totaleOrdini, 
      totalePagato,
      saldoTotale 
    };
  }, [ordiniFornitori]);

  const riepilogoFornitore = useMemo(() => {
    if (!filtroFornitore) return null;
    
    const ordini = ordiniFornitori.filter(o => o.fornitore_id === filtroFornitore);
    let totaleOrdini = 0;
    let totalePagato = 0;
    let saldoTotale = 0;
    
    ordini.forEach(ord => {
      totaleOrdini += parseFloat(ord.importo || 0);
      
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        totalePagato += accInfo.pagato;
        saldoTotale += accInfo.residuo;
      } else {
        const stato = calcolaStatoOrdine(ord);
        totalePagato += stato.effettivamentePagato;
        saldoTotale += stato.saldoDaPagare;
      }
    });
    
    return { 
      numeroOrdini: ordini.length,
      totaleOrdini, 
      totaleAcconti: totalePagato,
      saldoTotale 
    };
  }, [ordiniFornitori, filtroFornitore]);

  // ✅ SALVA ORDINE
  const handleSaveOrdine = async () => {
    if (!ordineFormData.numeroOrdine || !ordineFormData.dataOrdine || !ordineFormData.fornitoreId || !ordineFormData.importo) {
      return alert('⚠️ Compila tutti i campi obbligatori');
    }

    setSaving(true);

    const dataForSupabase = {
      numero_ordine: ordineFormData.numeroOrdine,
      data_ordine: ordineFormData.dataOrdine,
      fornitore_id: ordineFormData.fornitoreId,
      cantiere_id: ordineFormData.cantiereId || null,
      importo: parseFloat(ordineFormData.importo),
      descrizione: ordineFormData.descrizione || null,
      tipo: 'ordine',
      fatture: ordineFormData.fatture || []
    };

    let result;
    if (editingId) {
      result = await updateRecord('ordiniFornitori', editingId, dataForSupabase);
    } else {
      result = await addRecord('ordiniFornitori', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowOrdineForm(false);
      setOrdineFormData({});
      setEditingId(null);
      alert(editingId ? '✅ Ordine aggiornato!' : '✅ Ordine aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ SALVA FATTURA DIRETTA
  const handleSaveFatturaDiretta = async () => {
  if (!fatturaDirettaFormData.numeroFattura || !fatturaDirettaFormData.dataFattura || !fatturaDirettaFormData.fornitoreId || !fatturaDirettaFormData.importo) {
    return alert('⚠️ Compila tutti i campi obbligatori');
  }

  setSaving(true);

  const dataForSupabase = {
    numero_ordine: `DIRETTO-${fatturaDirettaFormData.numeroFattura}`,
    data_ordine: fatturaDirettaFormData.dataFattura,
    fornitore_id: fatturaDirettaFormData.fornitoreId,
    cantiere_id: fatturaDirettaFormData.cantiereId || null,
    importo: parseFloat(fatturaDirettaFormData.importo),
    descrizione: fatturaDirettaFormData.descrizione || null,
    tipo: 'fattura_diretta',
    numero_fattura: fatturaDirettaFormData.numeroFattura,
    data_fattura: fatturaDirettaFormData.dataFattura,
    acconti_pagamento: fatturaDirettaFormData.acconti_pagamento || []
  };

  let result;
  if (editingIdFatturaDiretta) {
    result = await updateRecord('ordiniFornitori', editingIdFatturaDiretta, dataForSupabase);
  } else {
    result = await addRecord('ordiniFornitori', dataForSupabase);
  }

  setSaving(false);

  if (result.success) {
    setShowFatturaDirettaForm(false);
    setFatturaDirettaFormData({});
    setEditingIdFatturaDiretta(null);
    alert(editingIdFatturaDiretta ? '✅ Fattura diretta aggiornata!' : '✅ Fattura diretta aggiunta!');
  } else {
    alert('❌ Errore: ' + result.error);
  }
};

  // ✅ ELIMINA ORDINE
  const handleDeleteOrdine = async (ordineId, numeroOrdine) => {
    if (!confirm(`❌ Eliminare l'ordine ${numeroOrdine}?\n\nQuesta azione è irreversibile!`)) return;

    const result = await deleteRecord('ordiniFornitori', ordineId);
    
    if (result.success) {
      alert('✅ Ordine eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ MODIFICA ORDINE
  const handleEditOrdine = (ordine) => {
  // Se è una fattura diretta, usa il form specifico
  if (ordine.tipo === 'fattura_diretta') {
    setFatturaDirettaFormData({
      numeroFattura: ordine.numero_fattura || ordine.numero_ordine.replace('DIRETTO-', ''),
      dataFattura: ordine.data_fattura || ordine.data_ordine,
      fornitoreId: ordine.fornitore_id,
      cantiereId: ordine.cantiere_id,
      importo: ordine.importo,
      descrizione: ordine.descrizione
    });
    setEditingIdFatturaDiretta(ordine.id);
    setShowFatturaDirettaForm(true);
  } else {
    // Altrimenti usa il form ordini normale
    setOrdineFormData({
      numeroOrdine: ordine.numero_ordine,
      dataOrdine: ordine.data_ordine,
      fornitoreId: ordine.fornitore_id,
      cantiereId: ordine.cantiere_id,
      importo: ordine.importo,
      descrizione: ordine.descrizione,
      fatture: ordine.fatture || []
    });
    setEditingId(ordine.id);
    setShowOrdineForm(true);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

 const exportPDF = (tipo = 'situazione') => {
  const ordini = filtroFornitore 
    ? ordiniFornitori.filter(o => o.fornitore_id === filtroFornitore)
    : ordiniFornitori;

  let ordiniFiltrati = [];
  
  if (tipo === 'da_saldare') {
    ordiniFiltrati = ordini.filter(ord => {
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        return accInfo.residuo > 0;
      } else {
        const stato = calcolaStatoOrdine(ord);
        return stato.saldoDaPagare > 0;
      }
    });
  } else {
    ordiniFiltrati = ordini;
  }

  if (ordiniFiltrati.length === 0) {
    alert('✅ Nessun dato da esportare!');
    return;
  }

  // Raggruppa per fornitore
  const ordiniPerFornitore = {};
  ordiniFiltrati.forEach(ord => {
    const fornitoreId = ord.fornitore_id;
    if (!ordiniPerFornitore[fornitoreId]) {
      ordiniPerFornitore[fornitoreId] = [];
    }
    ordiniPerFornitore[fornitoreId].push(ord);
  });
  
  // Ordina fornitori alfabeticamente
  const fornitoriOrdinati = Object.keys(ordiniPerFornitore).sort((a, b) => {
    const nomeA = fornitori.find(f => f.id === a)?.ragione_sociale || '';
    const nomeB = fornitori.find(f => f.id === b)?.ragione_sociale || '';
    return nomeA.localeCompare(nomeB);
  });
  
  // Calcola totali generali
  let importoTotaleOrdini = 0;
  let importoTotalePagato = 0;
  let importoTotaleDaSaldare = 0;

  ordiniFiltrati.forEach(ord => {
    importoTotaleOrdini += parseFloat(ord.importo || 0);
    
    if (ord.tipo === 'fattura_diretta') {
      const accInfo = calcolaAccontiFatturaDiretta(ord);
      importoTotalePagato += accInfo.pagato;
      importoTotaleDaSaldare += accInfo.residuo;
    } else {
      const stato = calcolaStatoOrdine(ord);
      importoTotalePagato += stato.effettivamentePagato;
      importoTotaleDaSaldare += stato.saldoDaPagare;
    }
  });

  const oggi = new Date();
  const dataStampa = oggi.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const titolo = tipo === 'da_saldare' ? '⚠️ Fatture da Saldare' : '📊 Situazione Fornitori';
  const coloreTitolo = tipo === 'da_saldare' ? '#dc2626' : '#3b82f6';

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titolo}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #7c3aed; margin-top: 30px; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #3b82f6; color: white; }
    tr:nth-child(even) { background-color: #f3f4f6; }
    .fornitore-summary { background: #faf5ff; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #7c3aed; }
    .totale-generale { background: ${tipo === 'da_saldare' ? '#fee2e2' : '#eff6ff'}; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid ${coloreTitolo}; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      button { display: none !important; }
      h2 { page-break-before: always; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" style="background: ${coloreTitolo}; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">
    🖨️ Stampa / Salva PDF
  </button>
  
  <h1>${titolo} - Raggruppate per Fornitore</h1>
  <p><strong>Data Stampa:</strong> ${dataStampa}</p>
  
  <div class="totale-generale">
    <h3 style="margin-top: 0; color: ${coloreTitolo};">📊 RIEPILOGO GENERALE</h3>
    <p><strong>Totale Fornitori:</strong> ${fornitoriOrdinati.length}</p>
    <p><strong>Totale Ordini:</strong> ${ordiniFiltrati.length}</p>
    <p><strong>Importo Totale:</strong> € ${importoTotaleOrdini.toFixed(2)}</p>
    <p><strong>Già Pagato:</strong> € ${importoTotalePagato.toFixed(2)}</p>
    <p style="font-size: 14px; color: ${coloreTitolo};"><strong>${tipo === 'da_saldare' ? '⚠️ RESIDUO DA SALDARE:' : 'Residuo da Pagare:'} € ${importoTotaleDaSaldare.toFixed(2)}</strong></p>
  </div>
`;

  // Genera tabelle per ogni fornitore
  fornitoriOrdinati.forEach(fornitoreId => {
    const ordiniFornitore = ordiniPerFornitore[fornitoreId];
    const fornitore = fornitori.find(f => f.id === fornitoreId);
    
    // Calcola totali fornitore
    let totaleFornitore = 0;
    let pagatoFornitore = 0;
    let residuoFornitore = 0;
    
    ordiniFornitore.forEach(ord => {
      totaleFornitore += parseFloat(ord.importo || 0);
      
      if (ord.tipo === 'fattura_diretta') {
        const accInfo = calcolaAccontiFatturaDiretta(ord);
        pagatoFornitore += accInfo.pagato;
        residuoFornitore += accInfo.residuo;
      } else {
        const stato = calcolaStatoOrdine(ord);
        pagatoFornitore += stato.effettivamentePagato;
        residuoFornitore += stato.saldoDaPagare;
      }
    });
    
    html += `
  <h2>🏪 ${fornitore?.ragione_sociale || 'N/A'}</h2>
  
  <div class="fornitore-summary">
    <p><strong>Ordini:</strong> ${ordiniFornitore.length} | <strong>Totale:</strong> € ${totaleFornitore.toFixed(2)} | <strong>Pagato:</strong> € ${pagatoFornitore.toFixed(2)} | <strong style="color: ${coloreTitolo};">Residuo: € ${residuoFornitore.toFixed(2)}</strong></p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Num. Ordine</th>
        <th>Data</th>
        <th>Cantiere</th>
        <th>Importo</th>
        <th>Pagato</th>
        <th style="background-color: ${coloreTitolo};">Residuo</th>
      </tr>
    </thead>
    <tbody>
      ${ordiniFornitore.map(ord => {
        const cantiere = cantieri.find(c => c.id === ord.cantiere_id);
        
        let giaPagato = 0;
        let residuo = 0;

        if (ord.tipo === 'fattura_diretta') {
          const accInfo = calcolaAccontiFatturaDiretta(ord);
          giaPagato = accInfo.pagato;
          residuo = accInfo.residuo;
        } else {
          const stato = calcolaStatoOrdine(ord);
          giaPagato = stato.effettivamentePagato;
          residuo = stato.saldoDaPagare;
        }

        return `
        <tr>
          <td>${ord.tipo === 'fattura_diretta' ? ord.numero_ordine.replace('DIRETTO-', 'FATTURA-') : ord.numero_ordine}</td>
          <td>${formatDate(ord.data_ordine)}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td>€ ${parseFloat(ord.importo).toFixed(2)}</td>
          <td>€ ${giaPagato.toFixed(2)}</td>
          <td style="font-weight: bold; color: ${coloreTitolo};">€ ${residuo.toFixed(2)}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>
`;
  });

  html += `
  <div style="margin-top: 30px; padding: 10px; background: #eff6ff; border-top: 2px solid #1e40af; font-size: 9px;">
    <p>Documento generato automaticamente da Marrel S.r.l. - ${dataStampa}</p>
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
      {/* Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">📦 Situazione Fornitori</h2>
          <div className="flex gap-2">
            <select 
              className="border rounded px-4 py-2 bg-purple-600 text-white font-medium hover:bg-purple-700 cursor-pointer"
              onChange={(e) => {
                if (e.target.value) {
                  exportPDF(e.target.value);
                  e.target.value = '';
                }
              }}
              value="">
              <option value="">📄 Export PDF...</option>
              <option value="situazione">Situazione Generale</option>
              <option value="da_saldare">Fatture da Saldare</option>
            </select>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <select 
              className="border rounded px-3 py-2"
              value={filtroFornitore}
              onChange={(e) => setFiltroFornitore(e.target.value)}>
              <option value="">Tutti i fornitori</option>
              {fornitori.map(f => (
                <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
              ))}
            </select>

            <select 
              className="border rounded px-3 py-2"
              value={filtroCantiere}
              onChange={(e) => setFiltroCantiere(e.target.value)}>
              <option value="">Tutti i cantieri</option>
              {cantieri.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>

            <select 
              className="border rounded px-3 py-2"
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}>
              <option value="">Tutti gli stati</option>
              <option value="pagato">Pagato</option>
              <option value="non_pagato">Non Pagato</option>
            </select>

            <select 
              className="border rounded px-3 py-2"
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}>
              <option value="data-desc">Data (più recente)</option>
              <option value="data-asc">Data (più vecchia)</option>
              <option value="importo-desc">Importo (maggiore)</option>
              <option value="importo-asc">Importo (minore)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                className="border rounded px-3 py-2 w-full pl-10"
                placeholder="🔍 Cerca per numero fattura..."
                value={searchNumeroFattura}
                onChange={(e) => setSearchNumeroFattura(e.target.value)}
              />
              {searchNumeroFattura && (
                <button 
                  onClick={() => setSearchNumeroFattura('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                setShowFatturaDirettaForm(true);
                setFatturaDirettaFormData({});
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap">
              ➕ Fattura Diretta
            </button>
            <button 
              onClick={() => {
                setShowOrdineForm(true);
                setEditingId(null);
                setOrdineFormData({ fatture: [] });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">
              ➕ Nuovo Ordine
            </button>
          </div>
        </div>
      </div>

      {/* Indicatore Filtri Attivi */}
      {(filtroFornitore || filtroCantiere || searchNumeroFattura || filtroStato) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="font-medium text-blue-900">Filtri attivi:</span>
            {filtroFornitore && (
              <span className="bg-white px-3 py-1 rounded border border-blue-300">
                Fornitore: {fornitori.find(f => f.id === filtroFornitore)?.ragione_sociale}
              </span>
            )}
            {filtroCantiere && (
              <span className="bg-white px-3 py-1 rounded border border-blue-300">
                Cantiere: {cantieri.find(c => c.id === filtroCantiere)?.nome}
              </span>
            )}
            {filtroStato && (
              <span className="bg-white px-3 py-1 rounded border border-blue-300">
                Stato: {filtroStato === 'pagato' ? 'Pagato' : 'Non Pagato'}
              </span>
            )}
            {searchNumeroFattura && (
              <span className="bg-white px-3 py-1 rounded border border-blue-300">
                Numero fattura: "{searchNumeroFattura}"
              </span>
            )}
            <span className="text-blue-700">
              • {ordiniFiltrati.length} {ordiniFiltrati.length === 1 ? 'risultato' : 'risultati'}
            </span>
          </div>
          <button 
            onClick={() => {
              setFiltroFornitore('');
              setFiltroCantiere('');
              setSearchNumeroFattura('');
              setFiltroStato('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ✕ Cancella filtri
          </button>
        </div>
      )}

      {/* Riepilogo Generale */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-lg border-2 border-blue-300">
        <h3 className="text-lg font-bold text-blue-900 mb-4">📊 Riepilogo Generale</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Ordini Totali</div>
            <div className="text-2xl font-bold text-blue-900">{riepilogoGenerale.numeroOrdini}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-blue-700 mb-1">Totale Ordini</div>
            <div className="text-2xl font-bold text-blue-900">€ {riepilogoGenerale.totaleOrdini.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-green-700 mb-1">Già Pagato</div>
            <div className="text-2xl font-bold text-green-900">€ {riepilogoGenerale.totalePagato.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-orange-700 mb-1">Residuo da Pagare</div>
            <div className="text-2xl font-bold text-orange-900">€ {riepilogoGenerale.saldoTotale.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Riepilogo Fornitore */}
      {riepilogoFornitore && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow-lg border-2 border-purple-300">
          <h3 className="text-lg font-bold text-purple-900 mb-4">
            📊 Riepilogo - {fornitori.find(f => f.id === filtroFornitore)?.ragione_sociale}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Ordini Attivi</div>
              <div className="text-2xl font-bold text-blue-900">{riepilogoFornitore.numeroOrdini}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-blue-700 mb-1">Totale Ordini</div>
              <div className="text-2xl font-bold text-blue-900">€ {riepilogoFornitore.totaleOrdini.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-green-700 mb-1">Già Pagato</div>
              <div className="text-2xl font-bold text-green-900">€ {riepilogoFornitore.totaleAcconti.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-orange-700 mb-1">Residuo da Pagare</div>
              <div className="text-2xl font-bold text-orange-900">€ {riepilogoFornitore.saldoTotale.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form Nuovo Ordine */}
      {showOrdineForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Ordine
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numero Ordine *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="es: ORD-245"
                value={ordineFormData.numeroOrdine || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, numeroOrdine: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Ordine *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={ordineFormData.dataOrdine || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, dataOrdine: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornitore *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={ordineFormData.fornitoreId || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, fornitoreId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona fornitore</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantiere</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={ordineFormData.cantiereId || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, cantiereId: e.target.value})}
                disabled={saving}
              >
                <option value="">Nessun cantiere</option>
                {cantieri.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo Ordine * (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={ordineFormData.importo || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, importo: e.target.value})}
                disabled={saving}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea 
                className="border rounded px-3 py-2 w-full" 
                rows="2"
                placeholder="Descrizione ordine..."
                value={ordineFormData.descrizione || ''}
                onChange={(e) => setOrdineFormData({...ordineFormData, descrizione: e.target.value})}
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleSaveOrdine}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
              {saving ? '⏳ Salvataggio...' : '✓ Salva'}
            </button>
            <button 
              onClick={() => {
                setShowOrdineForm(false);
                setOrdineFormData({});
                setEditingId(null);
              }} 
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              disabled={saving}>
              ✕ Annulla
            </button>
          </div>
        </div>
      )}

      {/* Form Fattura Diretta */}
      {showFatturaDirettaForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-4">
  {editingIdFatturaDiretta ? '✏️ Modifica' : '➕ Nuova'} Fattura Diretta (senza ordine)
</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numero Fattura *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="es: FATT-381"
                value={fatturaDirettaFormData.numeroFattura || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, numeroFattura: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fattura *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={fatturaDirettaFormData.dataFattura || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, dataFattura: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fornitore *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={fatturaDirettaFormData.fornitoreId || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, fornitoreId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona fornitore</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantiere</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={fatturaDirettaFormData.cantiereId || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, cantiereId: e.target.value})}
                disabled={saving}
              >
                <option value="">Nessun cantiere</option>
                {cantieri.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo * (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={fatturaDirettaFormData.importo || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, importo: e.target.value})}
                disabled={saving}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea 
                className="border rounded px-3 py-2 w-full" 
                rows="2"
                placeholder="Descrizione fattura..."
                value={fatturaDirettaFormData.descrizione || ''}
                onChange={(e) => setFatturaDirettaFormData({...fatturaDirettaFormData, descrizione: e.target.value})}
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleSaveFatturaDiretta}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
              {saving ? '⏳ Salvataggio...' : '✓ Salva'}
            </button>
            <button 
              onClick={() => {
                setShowFatturaDirettaForm(false);
                setFatturaDirettaFormData({});
              }} 
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              disabled={saving}>
              ✕ Annulla
            </button>
          </div>
        </div>
      )}

    {/* Lista Ordini */}
      <div className="space-y-4">
        {ordiniFiltrati.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-500">Nessun ordine trovato</p>
            <p className="text-sm text-gray-400 mt-2">
              {(filtroFornitore || filtroCantiere || searchNumeroFattura || filtroStato) 
                ? 'Prova a modificare i filtri' 
                : 'Clicca su "➕ Nuovo Ordine" per iniziare'}
            </p>
          </div>
        ) : (
          ordiniFiltrati.map(ordine => {
            const fornitore = fornitori.find(f => f.id === ordine.fornitore_id);
            const cantiere = cantieri.find(c => c.id === ordine.cantiere_id);
            
            const stato = ordine.tipo === 'fattura_diretta' 
              ? null 
              : calcolaStatoOrdine(ordine);
            
            const accInfo = ordine.tipo === 'fattura_diretta' 
              ? calcolaAccontiFatturaDiretta(ordine) 
              : null;

            return (
              <div key={ordine.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
  <h3 className="text-xl font-bold text-blue-600">
    {ordine.tipo === 'fattura_diretta' ? 'Fattura Diretta' : 'Ordine'} {ordine.numero_ordine.replace('DIRETTO-', '')}
  </h3>
  {ordine.tipo === 'fattura_diretta' ? (
    (() => {
      const hasNoteCredito = ordine.note_credito && ordine.note_credito.length > 0;
      
      if (!hasNoteCredito) {
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Fattura Diretta
          </span>
        );
      }
      
      const totaleNoteCredito = ordine.note_credito.reduce((sum, nc) => sum + parseFloat(nc.importo || 0), 0);
      const importoFattura = parseFloat(ordine.importo || 0);
      const isAnnullamento = totaleNoteCredito >= importoFattura;
      
      return (
        <>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Fattura Diretta
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isAnnullamento ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
          }`}>
            📋 {isAnnullamento ? 'Annullata' : 'Nota Credito'} (€ {totaleNoteCredito.toFixed(2)})
          </span>
        </>
      );
    })()
  ) : (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      stato.residuoOrdine <= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
    }`}>
      {stato.residuoOrdine <= 0 ? 'Completato' : 'In corso'}
    </span>
  )}
</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">{fornitore?.ragione_sociale || '-'}</span>
                      {cantiere && <span> • {cantiere.nome}</span>}
                      <span> • {formatDate(ordine.data_ordine)}</span>
                    </div>
                    {ordine.descrizione && (
                      <p className="text-sm text-gray-500 mt-1">{ordine.descrizione}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {ordine.tipo === 'fattura_diretta' ? (
                      <button 
                        onClick={() => {
                          setFatturaDirettaSelezionata(ordine);
                          setShowAccontiModal(true);
                        }}
                        className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm">
                        💰 Gestisci Acconti
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setOrdineSelezionato(ordine);
                          setShowDettaglioModal(true);
                        }}
                        className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm">
                        📋 Gestisci Fatture
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditOrdine(ordine)} 
                      className="text-blue-600 text-xl">
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteOrdine(ordine.id, ordine.numero_ordine)} 
                      className="text-red-600 text-xl">
                      🗑️
                    </button>
                  </div>
                </div>

                {ordine.tipo === 'fattura_diretta' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <div className="text-sm text-blue-700 mb-1">Totale Fattura</div>
                      <div className="text-2xl font-bold text-blue-900">€ {accInfo.totale.toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <div className="text-sm text-green-700 mb-1">Già Pagato ({accInfo.acconti.length} acc.)</div>
                      <div className="text-2xl font-bold text-green-900">€ {accInfo.pagato.toFixed(2)}</div>
                    </div>
                    <div className={`p-4 rounded border ${
                      accInfo.residuo > 0 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`text-sm mb-1 ${
                        accInfo.residuo > 0 ? 'text-orange-700' : 'text-gray-700'
                      }`}>Residuo da Pagare</div>
                      <div className={`text-2xl font-bold ${
                        accInfo.residuo > 0 ? 'text-orange-900' : 'text-gray-900'
                      }`}>€ {accInfo.residuo.toFixed(2)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <div className="text-sm text-blue-700 mb-1">Totale Ordine</div>
                      <div className="text-2xl font-bold text-blue-900">€ {parseFloat(ordine.importo).toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <div className="text-sm text-green-700 mb-1">Già Pagato</div>
                      <div className="text-2xl font-bold text-green-900">€ {stato.effettivamentePagato.toFixed(2)}</div>
                    </div>
                    <div className={`p-4 rounded border ${
                      stato.saldoDaPagare > 0 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`text-sm mb-1 ${
                        stato.saldoDaPagare > 0 ? 'text-orange-700' : 'text-gray-700'
                      }`}>Residuo da Pagare</div>
                      <div className={`text-2xl font-bold ${
                        stato.saldoDaPagare > 0 ? 'text-orange-900' : 'text-gray-900'
                      }`}>€ {stato.saldoDaPagare.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Gestione Fatture */}
      {showDettaglioModal && ordineSelezionato && (
        <DettaglioOrdineModal
          ordine={ordineSelezionato}
          fornitori={fornitori}
          cantieri={cantieri}
          onClose={() => {
            setShowDettaglioModal(false);
            setOrdineSelezionato(null);
          }}
          ordiniFornitori={ordiniFornitori}
          updateRecord={updateRecord}
          formatDate={formatDate}
          calcolaStatoOrdine={calcolaStatoOrdine}
        />
      )}

      {/* Modal Gestione Acconti Fatture Dirette */}
      {showAccontiModal && fatturaDirettaSelezionata && (
        <GestioneAccontiModal
          fattura={fatturaDirettaSelezionata}
          fornitori={fornitori}
          cantieri={cantieri}
          onClose={() => {
            setShowAccontiModal(false);
            setFatturaDirettaSelezionata(null);
          }}
          updateRecord={updateRecord}
          formatDate={formatDate}
          calcolaAccontiFatturaDiretta={calcolaAccontiFatturaDiretta}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL DETTAGLIO ORDINE (gestione fatture)
// ============================================
function DettaglioOrdineModal({ 
  ordine, 
  fornitori,
  cantieri,
  onClose, 
  updateRecord,
  formatDate,
  calcolaStatoOrdine
}) {
  const [tipoFattura, setTipoFattura] = useState('acconto');
  const [numeroFattura, setNumeroFattura] = useState('');
  const [dataFattura, setDataFattura] = useState(new Date().toISOString().split('T')[0]);
  const [importoFattura, setImportoFattura] = useState('');
  const [accontiSelezionati, setAccontiSelezionati] = useState([]);
  const [saving, setSaving] = useState(false);

  const fornitore = fornitori.find(f => f.id === ordine.fornitore_id);
  const cantiere = cantieri.find(c => c.id === ordine.cantiere_id);
  const stato = calcolaStatoOrdine(ordine);

  const acconti = (ordine.fatture || []).filter(f => f.tipo === 'acconto');
  const finali = (ordine.fatture || []).filter(f => f.tipo === 'finale');

  const accontiDisponibili = acconti.filter(acconto => {
    const giàDettratto = finali.some(finale => 
      (finale.accontiDettratti || []).includes(acconto.id)
    );
    return !giàDettratto;
  });

  const totaleAccontiSelezionati = accontiSelezionati.reduce((sum, accontoId) => {
    const acconto = acconti.find(a => a.id === accontoId);
    return sum + (acconto ? parseFloat(acconto.importo || 0) : 0);
  }, 0);

  const saldoFinale = parseFloat(importoFattura || 0) - totaleAccontiSelezionati;

  const aggiungiAcconto = async () => {
    if (!numeroFattura || !importoFattura) {
      return alert('⚠️ Inserisci numero fattura e importo');
    }

    setSaving(true);

    const nuovoAcconto = {
      id: Date.now().toString(),
      numeroFattura,
      dataFattura,
      importo: parseFloat(importoFattura),
      tipo: 'acconto',
      pagato: false,
      dataPagamento: ''
    };

    const nuoveFatture = [...(ordine.fatture || []), nuovoAcconto];
    const result = await updateRecord('ordiniFornitori', ordine.id, { fatture: nuoveFatture });

    setSaving(false);

    if (result.success) {
      setNumeroFattura('');
      setImportoFattura('');
      setDataFattura(new Date().toISOString().split('T')[0]);
      alert('✅ Acconto aggiunto!');
      onClose(); // Ricarica
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const aggiungiFatturaFinale = async () => {
    if (!numeroFattura || !importoFattura) {
      return alert('⚠️ Inserisci numero fattura e importo');
    }

    setSaving(true);

    const nuovaFattura = {
      id: Date.now().toString(),
      numeroFattura,
      dataFattura,
      importo: parseFloat(importoFattura),
      tipo: 'finale',
      accontiDettratti: accontiSelezionati,
      pagato: false,
      dataPagamento: ''
    };

    const nuoveFatture = [...(ordine.fatture || []), nuovaFattura];
    const result = await updateRecord('ordiniFornitori', ordine.id, { fatture: nuoveFatture });

    setSaving(false);

    if (result.success) {
      setNumeroFattura('');
      setImportoFattura('');
      setAccontiSelezionati([]);
      setDataFattura(new Date().toISOString().split('T')[0]);
      alert('✅ Fattura finale aggiunta!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const rimuoviFattura = async (fatturaId) => {
    setSaving(true);
    const nuoveFatture = (ordine.fatture || []).filter(f => f.id !== fatturaId);
    const result = await updateRecord('ordiniFornitori', ordine.id, { fatture: nuoveFatture });
    setSaving(false);

    if (result.success) {
      alert('✅ Fattura eliminata!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const toggleAccontoSelezionato = (accontoId) => {
    if (accontiSelezionati.includes(accontoId)) {
      setAccontiSelezionati(accontiSelezionati.filter(id => id !== accontoId));
    } else {
      setAccontiSelezionati([...accontiSelezionati, accontoId]);
    }
  };

  const togglePagato = async (fatturaId, pagato) => {
    setSaving(true);
    const nuoveFatture = ordine.fatture.map(f => {
      if (f.id === fatturaId) {
        return {
          ...f,
          pagato,
          dataPagamento: pagato ? new Date().toISOString().split('T')[0] : ''
        };
      }
      return f;
    });
    
    const result = await updateRecord('ordiniFornitori', ordine.id, { fatture: nuoveFatture });
    setSaving(false);

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    } else {
      onClose();
    }
  };

  const aggiornaDataPagamento = async (fatturaId, data) => {
    setSaving(true);
    const nuoveFatture = ordine.fatture.map(f => {
      if (f.id === fatturaId) {
        return { ...f, dataPagamento: data };
      }
      return f;
    });
    
    const result = await updateRecord('ordiniFornitori', ordine.id, { fatture: nuoveFatture });
    setSaving(false);

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          📋 Gestione Fatture - Ordine {ordine.numero_ordine}
        </h3>

        {/* Info Ordine */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="font-medium">Fornitore:</span> {fornitore?.ragione_sociale}
            </div>
            <div>
              <span className="font-medium">Cantiere:</span> {cantiere?.nome || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Data Ordine:</span> {formatDate(ordine.data_ordine)}
            </div>
            <div>
              <span className="font-medium">Importo Ordine:</span> € {parseFloat(ordine.importo).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Riepilogo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Totale Ordine</div>
            <div className="text-lg font-bold text-blue-900">€ {parseFloat(ordine.importo).toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <div className="text-xs text-green-700 mb-1">Già Pagato</div>
            <div className="text-lg font-bold text-green-900">€ {stato.effettivamentePagato.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded border border-orange-200">
            <div className="text-xs text-orange-700 mb-1">Residuo da Pagare</div>
            <div className="text-lg font-bold text-orange-900">€ {stato.saldoDaPagare.toFixed(2)}</div>
          </div>
        </div>

        {/* Form Nuova Fattura */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <h4 className="font-medium mb-3 text-blue-900">➕ Aggiungi Fattura</h4>
          
          <div className="mb-3">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  value="acconto" 
                  checked={tipoFattura === 'acconto'}
                  onChange={(e) => setTipoFattura(e.target.value)}
                  className="mr-2" 
                  disabled={saving}
                />
                <span className="font-medium">Fattura di Acconto</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  value="finale" 
                  checked={tipoFattura === 'finale'}
                  onChange={(e) => setTipoFattura(e.target.value)}
                  className="mr-2" 
                  disabled={saving}
                />
                <span className="font-medium">Fattura Finale</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Numero Fattura *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="es: FATT-183"
                value={numeroFattura}
                onChange={(e) => setNumeroFattura(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fattura *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={dataFattura}
                onChange={(e) => setDataFattura(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo * (€)</label>
              <input 
                type="number" 
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                value={importoFattura}
                onChange={(e) => setImportoFattura(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Selezione Acconti per Fattura Finale */}
          {tipoFattura === 'finale' && accontiDisponibili.length > 0 && (
            <div className="bg-white p-3 rounded border mb-3">
              <label className="block text-sm font-medium mb-2">Seleziona Acconti da Detrarre:</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {accontiDisponibili.map(acconto => (
                  <label key={acconto.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <input 
                      type="checkbox"
                      checked={accontiSelezionati.includes(acconto.id)}
                      onChange={() => toggleAccontoSelezionato(acconto.id)}
                      disabled={saving}
                    />
                    <span className="flex-1">
                      Acconto {acconto.numeroFattura} - {formatDate(acconto.dataFattura)}
                    </span>
                    <span className="font-semibold">€ {parseFloat(acconto.importo).toFixed(2)}</span>
                  </label>
                ))}
              </div>
              {accontiSelezionati.length > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex justify-between text-sm">
                    <span>Importo Fattura:</span>
                    <span className="font-semibold">€ {parseFloat(importoFattura || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Acconti Detratti:</span>
                    <span className="font-semibold text-green-700">- € {totaleAccontiSelezionati.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
                    <span>Saldo Finale:</span>
                    <span className={saldoFinale > 0 ? 'text-orange-700' : 'text-green-700'}>
                      € {saldoFinale.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={tipoFattura === 'acconto' ? aggiungiAcconto : aggiungiFatturaFinale}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full disabled:opacity-50">
            {saving ? '⏳ Salvataggio...' : `✓ Aggiungi ${tipoFattura === 'acconto' ? 'Acconto' : 'Fattura Finale'}`}
          </button>
        </div>

        {/* Lista Fatture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Acconti */}
          <div>
            <h4 className="font-semibold mb-3 text-purple-900">💰 Acconti ({acconti.length})</h4>
            {acconti.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nessun acconto registrato</p>
            ) : (
              <div className="space-y-2">
                {acconti.map(acconto => {
                  const giàDettratto = finali.some(finale => 
                    (finale.accontiDettratti || []).includes(acconto.id)
                  );
                  return (
                    <div key={acconto.id} className={`p-3 rounded border ${
                      giàDettratto ? 'bg-gray-50 border-gray-300 opacity-60' : 'bg-purple-50 border-purple-200'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{acconto.numeroFattura}</div>
                          <div className="text-xs text-gray-600">{formatDate(acconto.dataFattura)}</div>
                          {giàDettratto && (
                            <div className="text-xs text-green-600 mt-1">✓ Già detratto</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-900">€ {parseFloat(acconto.importo).toFixed(2)}</div>
                          <button 
                            onClick={() => {
                              if (confirm('Eliminare questo acconto?')) {
                                rimuoviFattura(acconto.id);
                              }
                            }}
                            disabled={saving}
                            className="text-red-600 text-sm mt-1 disabled:opacity-50">
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="border-t pt-2 space-y-2">
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={acconto.pagato || false}
                            onChange={(e) => togglePagato(acconto.id, e.target.checked)}
                            disabled={saving}
                          />
                          <span className={`text-sm font-medium ${acconto.pagato ? 'text-green-700' : 'text-orange-700'}`}>
                            {acconto.pagato ? '✓ Pagato' : 'Non Pagato'}
                          </span>
                        </label>
                        
                        {acconto.pagato && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Data Pagamento:</label>
                            <input 
                              type="date"
                              className="border rounded px-2 py-1 text-xs w-full"
                              value={acconto.dataPagamento || ''}
                              onChange={(e) => aggiornaDataPagamento(acconto.id, e.target.value)}
                              disabled={saving}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fatture Finali */}
          <div>
            <h4 className="font-semibold mb-3 text-cyan-900">📄 Fatture Finali ({finali.length})</h4>
            {finali.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nessuna fattura finale registrata</p>
            ) : (
              <div className="space-y-2">
                {finali.map(finale => {
                  const accontiDetratti = (finale.accontiDettratti || []).map(id => 
                    acconti.find(a => a.id === id)
                  ).filter(Boolean);
                  const totaleDetratto = accontiDetratti.reduce((sum, a) => sum + parseFloat(a.importo), 0);
                  const saldo = parseFloat(finale.importo) - totaleDetratto;

                  return (
                    <div key={finale.id} className="p-3 rounded border bg-cyan-50 border-cyan-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{finale.numeroFattura}</div>
                          <div className="text-xs text-gray-600">{formatDate(finale.dataFattura)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-cyan-900">€ {parseFloat(finale.importo).toFixed(2)}</div>
                          <button 
                            onClick={() => {
                              if (confirm('Eliminare questa fattura?')) {
                                rimuoviFattura(finale.id);
                              }
                            }}
                            disabled={saving}
                            className="text-red-600 text-sm mt-1 disabled:opacity-50">
                            🗑️
                          </button>
                        </div>
                      </div>
                      {accontiDetratti.length > 0 && (
                        <div className="text-xs border-t pt-2 mb-2">
                          <div className="font-medium mb-1">Acconti detratti:</div>
                          {accontiDetratti.map(acc => (
                            <div key={acc.id} className="flex justify-between text-gray-600">
                              <span>• {acc.numeroFattura}</span>
                              <span>- € {parseFloat(acc.importo).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t mt-1 pt-1">
                            <span>Saldo da pagare:</span>
                            <span className={saldo > 0 ? 'text-orange-700' : 'text-green-700'}>
                              € {saldo.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t pt-2 space-y-2">
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={finale.pagato || false}
                            onChange={(e) => togglePagato(finale.id, e.target.checked)}
                            disabled={saving}
                          />
                          <span className={`text-sm font-medium ${finale.pagato ? 'text-green-700' : 'text-orange-700'}`}>
                            {finale.pagato ? '✓ Pagato' : 'Non Pagato'}
                          </span>
                        </label>
                        
                        {finale.pagato && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Data Pagamento:</label>
                            <input 
                              type="date"
                              className="border rounded px-2 py-1 text-xs w-full"
                              value={finale.dataPagamento || ''}
                              onChange={(e) => aggiornaDataPagamento(finale.id, e.target.value)}
                              disabled={saving}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button 
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            ✓ Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL GESTIONE ACCONTI (fatture dirette)
// ============================================
function GestioneAccontiModal({ 
  fattura, 
  fornitori,
  cantieri,
  onClose, 
  updateRecord,
  formatDate,
  calcolaAccontiFatturaDiretta
}) {
  const [dataAcconto, setDataAcconto] = useState(new Date().toISOString().split('T')[0]);
  const [importoAcconto, setImportoAcconto] = useState('');
  const [notaAcconto, setNotaAcconto] = useState('');
  const [saving, setSaving] = useState(false);
  const [dataNotaCredito, setDataNotaCredito] = useState(new Date().toISOString().split('T')[0]);
  const [importoNotaCredito, setImportoNotaCredito] = useState('');
  const [motivoNotaCredito, setMotivoNotaCredito] = useState('');
  const [showNoteCreditoSection, setShowNoteCreditoSection] = useState(false);

  const fornitore = fornitori.find(f => f.id === fattura.fornitore_id);
  const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
  const accInfo = calcolaAccontiFatturaDiretta(fattura);

  const aggiungiAcconto = async () => {
    const importo = parseFloat(importoAcconto);
    if (!importo || importo <= 0) {
      return alert('⚠️ Inserisci un importo valido');
    }

    if (importo > accInfo.residuo) {
      return alert(`⚠️ L'importo non può superare il residuo di € ${accInfo.residuo.toFixed(2)}`);
    }

    setSaving(true);

    const nuovoAcconto = {
      id: Date.now().toString(),
      data: dataAcconto,
      importo,
      nota: notaAcconto
    };

    const nuoviAcconti = [...(fattura.acconti_pagamento || []), nuovoAcconto];
    const result = await updateRecord('ordiniFornitori', fattura.id, { acconti_pagamento: nuoviAcconti });

    setSaving(false);

    if (result.success) {
      setImportoAcconto('');
      setNotaAcconto('');
      setDataAcconto(new Date().toISOString().split('T')[0]);
      alert('✅ Acconto registrato!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const rimuoviAcconto = async (accontoId) => {
    setSaving(true);
    const nuoviAcconti = (fattura.acconti_pagamento || []).filter(a => a.id !== accontoId);
    const result = await updateRecord('ordiniFornitori', fattura.id, { acconti_pagamento: nuoviAcconti });
    setSaving(false);

    if (result.success) {
      alert('✅ Acconto eliminato!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };


  const aggiungiNotaCredito = async () => {
    const importo = parseFloat(importoNotaCredito);
    if (!importo || importo <= 0) {
      return alert('⚠️ Inserisci un importo valido');
    }

    if (!motivoNotaCredito.trim()) {
      return alert('⚠️ Inserisci un motivo per la nota di credito');
    }

    setSaving(true);

    const nuovaNotaCredito = {
      id: Date.now().toString(),
      data: dataNotaCredito,
      importo,
      motivo: motivoNotaCredito
    };

    const nuoveNoteCredito = [...(fattura.note_credito || []), nuovaNotaCredito];
    const result = await updateRecord('ordiniFornitori', fattura.id, { note_credito: nuoveNoteCredito });

    setSaving(false);

    if (result.success) {
      setImportoNotaCredito('');
      setMotivoNotaCredito('');
      setDataNotaCredito(new Date().toISOString().split('T')[0]);
      setShowNoteCreditoSection(false);
      alert('✅ Nota di credito registrata!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const rimuoviNotaCredito = async (notaCreditoId) => {
    if (!confirm('❌ Eliminare questa nota di credito?')) return;

    setSaving(true);
    const nuoveNoteCredito = (fattura.note_credito || []).filter(nc => nc.id !== notaCreditoId);
    const result = await updateRecord('ordiniFornitori', fattura.id, { note_credito: nuoveNoteCredito });
    setSaving(false);

    if (result.success) {
      alert('✅ Nota di credito eliminata!');
      onClose();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          💰 Gestione Acconti - Fattura {fattura.numero_fattura}
        </h3>

        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="font-medium">Fornitore:</span> {fornitore?.ragione_sociale}
            </div>
            <div>
              <span className="font-medium">Cantiere:</span> {cantiere?.nome || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Data Fattura:</span> {formatDate(fattura.data_fattura)}
            </div>
            <div>
              <span className="font-medium">Numero:</span> {fattura.numero_fattura}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <div className="bg-blue-50 p-3 rounded border border-blue-200">
    <div className="text-xs text-blue-700 mb-1">Totale Originale</div>
    <div className="text-lg font-bold text-blue-900">€ {accInfo.totale.toFixed(2)}</div>
  </div>
  <div className="bg-red-50 p-3 rounded border border-red-200">
    <div className="text-xs text-red-700 mb-1">Note di Credito</div>
    <div className="text-lg font-bold text-red-900">- € {accInfo.totaleNoteCredito.toFixed(2)}</div>
  </div>
  <div className="bg-purple-50 p-3 rounded border border-purple-200">
    <div className="text-xs text-purple-700 mb-1">Totale Effettivo</div>
    <div className="text-lg font-bold text-purple-900">€ {accInfo.totaleEffettivo.toFixed(2)}</div>
  </div>
  <div className="bg-green-50 p-3 rounded border border-green-200">
    <div className="text-xs text-green-700 mb-1">Già Pagato</div>
    <div className="text-lg font-bold text-green-900">€ {accInfo.pagato.toFixed(2)}</div>
  </div>
</div>
<div className="mb-6">
  <div className={`p-3 rounded border ${
    accInfo.residuo > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
  }`}>
    <div className={`text-xs mb-1 ${accInfo.residuo > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
      Residuo da Pagare
    </div>
    <div className={`text-2xl font-bold ${accInfo.residuo > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
      € {accInfo.residuo.toFixed(2)}
    </div>
  </div>
</div>

        {accInfo.residuo > 0 && (
          <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
            <h4 className="font-medium mb-3 text-green-900">➕ Registra Pagamento</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Data Pagamento *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={dataAcconto}
                  onChange={(e) => setDataAcconto(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Importo * (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  max={accInfo.residuo}
                  className="border rounded px-3 py-2 w-full"
                  placeholder={`Max € ${accInfo.residuo.toFixed(2)}`}
                  value={importoAcconto}
                  onChange={(e) => setImportoAcconto(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Nota (opzionale)</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: Bonifico, Assegno n. 123..."
                value={notaAcconto}
                onChange={(e) => setNotaAcconto(e.target.value)}
                disabled={saving}
              />
            </div>
            <button 
              onClick={aggiungiAcconto}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full disabled:opacity-50">
              {saving ? '⏳ Salvataggio...' : '✓ Aggiungi Pagamento'}
            </button>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-3">Storico Pagamenti ({accInfo.acconti.length})</h4>
          {accInfo.acconti.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nessun pagamento registrato
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Importo</th>
                    <th className="px-3 py-2 text-left">Nota</th>
                    <th className="px-3 py-2 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {[...accInfo.acconti].reverse().map(acc => (
                    <tr key={acc.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{formatDate(acc.data)}</td>
                      <td className="px-3 py-2 font-semibold text-green-700">€ {parseFloat(acc.importo).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-600">{acc.nota || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button 
                          onClick={() => {
                            if (confirm('Eliminare questo pagamento?')) {
                              rimuoviAcconto(acc.id);
                            }
                          }}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
{/* Sezione Note di Credito */}
<div className="mb-6">
  <div className="flex justify-between items-center mb-3">
    <h4 className="font-semibold text-red-900">📋 Note di Credito ({(accInfo.noteCredito || []).length})</h4>
    <button 
      onClick={() => setShowNoteCreditoSection(!showNoteCreditoSection)}
      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
    >
      {showNoteCreditoSection ? '✕ Chiudi' : '➕ Aggiungi Nota Credito'}
    </button>
  </div>

  {showNoteCreditoSection && (
    <div className="bg-red-50 p-4 rounded border border-red-200 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Data Nota Credito</label>
          <input 
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={dataNotaCredito}
            onChange={(e) => setDataNotaCredito(e.target.value)}
            disabled={saving}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Importo (€)</label>
          <input 
            type="number"
            step="0.01"
            className="border rounded px-3 py-2 w-full"
            placeholder="0.00"
            value={importoNotaCredito}
            onChange={(e) => setImportoNotaCredito(e.target.value)}
            disabled={saving}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Motivo</label>
          <input 
            type="text"
            className="border rounded px-3 py-2 w-full"
            placeholder="es: Sconto, Reso..."
            value={motivoNotaCredito}
            onChange={(e) => setMotivoNotaCredito(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <button 
        onClick={aggiungiNotaCredito}
        disabled={saving}
        className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 w-full"
      >
        {saving ? '⏳ Salvataggio...' : '✓ Aggiungi Nota di Credito'}
      </button>
    </div>
  )}

  {/* Lista Note di Credito */}
  {(accInfo.noteCredito || []).length > 0 && (
    <div className="space-y-2">
      {accInfo.noteCredito.map(nc => (
        <div key={nc.id} className="p-3 bg-red-50 border border-red-200 rounded flex justify-between items-center">
          <div className="flex-1">
            <div className="font-medium text-red-900">€ {parseFloat(nc.importo).toFixed(2)}</div>
            <div className="text-sm text-gray-600">{formatDate(nc.data)} - {nc.motivo}</div>
          </div>
          <button 
            onClick={() => rimuoviNotaCredito(nc.id)}
            disabled={saving}
            className="text-red-600 hover:text-red-800 disabled:opacity-50 ml-3"
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  )}
</div>
        <div className="flex gap-2 mt-6">
          <button 
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            ✓ Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default SituazioneFornitori;