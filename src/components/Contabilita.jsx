import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function Contabilita() {
  // ✅ USA IL CONTEXT
  const { 
  movimentiContabili, 
  fornitori, 
  clienti, 
  cantieri, 
  loading,
    addRecord, 
    updateRecord, 
    deleteRecord,
    getSetting,      // ✅ AGGIUNGI
    setSetting       // ✅ AGGIUNGI
  } = useData();

  // ✅ LEGGI IL SALDO INIZIALE DA SUPABASE
  const saldoIniziale = getSetting('saldo_iniziale', '0.00');

  // Stati locali
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'uscita',
    tipologiaMovimento: 'bonifico',
    pagato: false,
    modalitaUscita: 'pagata'
  });
  const [saving, setSaving] = useState(false);
  
  // Filtri
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');
  const [filtroFornitore, setFiltroFornitore] = useState('');
  const [filtroCantiere, setFiltroCantiere] = useState('');
  const [filtroTipologia, setFiltroTipologia] = useState('');
  const [filtroStatoPagamento, setFiltroStatoPagamento] = useState('');
  const [meseReport, setMeseReport] = useState(new Date().getMonth() + 1);
  const [annoReport, setAnnoReport] = useState(new Date().getFullYear());
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [movimentoDaPagare, setMovimentoDaPagare] = useState(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [showSaldoInizialeModal, setShowSaldoInizialeModal] = useState(false);
  const [movimentoStornato, setMovimentoStornato] = useState(null);

 // Configurazione commissioni
const [showCommissioniModal, setShowCommissioniModal] = useState(false);
const commissioniDefault = {
  bonifico: { tipo: 'fisso', valore: 1.50 },
  cbill: { tipo: 'fisso', valore: 1.00 },
  f24: { tipo: 'fisso', valore: 0 },
  bollo: { tipo: 'fisso', valore: 0 },
  canone: { tipo: 'fisso', valore: 0 },
  interessi: { tipo: 'fisso', valore: 0 },
  addebito: { tipo: 'fisso', valore: 0 },
  ricarica: { tipo: 'fisso', valore: 0 },
  riba: { tipo: 'percentuale', valore: 0.5 },
  mav: { tipo: 'fisso', valore: 1.50 },
  compensato: { tipo: 'fisso', valore: 0 },
  'f24_compensato': { tipo: 'fisso', valore: 0 },
  assegno_circolare: { tipo: 'fisso', valore: 5.00 },
  bonifico_st: { tipo: 'fisso', valore: 10.00 },
  storno: { tipo: 'fisso', valore: 0 },
  f23: { tipo: 'fisso', valore: 0 }
};

// ✅ Carica commissioni da Supabase
const commissioniSalvate = getSetting('commissioni', null);
const [commissioni, setCommissioni] = useState(() => {
  if (commissioniSalvate) {
    try {
      return JSON.parse(commissioniSalvate);
    } catch {
      return commissioniDefault;
    }
  }
  return commissioniDefault;
});

  const tipologieMovimento = [
    { value: 'bonifico', label: 'Bonifico' },
    { value: 'cbill', label: 'CBILL' },
    { value: 'f24', label: 'F24' },
    { value: 'bollo', label: 'Bollo' },
    { value: 'canone', label: 'Canone' },
    { value: 'interessi', label: 'Interessi' },
    { value: 'addebito', label: 'Addebito' },
    { value: 'ricarica', label: 'Ricarica' },
    { value: 'riba', label: 'Ri.Ba' },
    { value: 'mav', label: 'MAV' },
    { value: 'compensato', label: 'Compensato' },
    { value: 'f24_compensato', label: 'F24/Compensato' },
    { value: 'assegno_circolare', label: 'Assegno circolare' },
    { value: 'bonifico_st', label: 'Bonifico ST' },
    { value: 'storno', label: 'Storno' },
    { value: 'f23', label: 'F23' }
  ];

  const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  // ✅ MOSTRA LOADING
  if (loading.movimentiContabili || loading.fornitori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento contabilità...</p>
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

  const calcolaCommissione = (tipologia, importo) => {
    const config = commissioni[tipologia];
    if (!config) return 0;
    if (config.tipo === 'percentuale') {
      return (parseFloat(importo) * parseFloat(config.valore)) / 100;
    }
    return parseFloat(config.valore) || 0;
  };

  // ✅ SALVA su Supabase
  const handleSave = async () => {
    if (!formData.fornitoreId || !formData.causale) {
      alert('⚠️ Fornitore e causale sono obbligatori!');
      return;
    }

    if (formData.tipo !== 'storno' && !formData.importo) {
      alert('⚠️ Importo obbligatorio!');
      return;
    }

    setSaving(true);

    const dataForSupabase = {
  tipo: formData.tipo,
  tipologia_movimento: formData.tipologiaMovimento || formData.tipologia_movimento,
  fornitore_id: formData.fornitoreId || formData.fornitore_id || null,
  cliente_id: formData.clienteId || formData.cliente_id || null,
  cantiere_id: formData.cantiereId || formData.cantiere_id || null,
  causale: formData.causale,
      importo: parseFloat(formData.importo || 0),
      commissione: parseFloat(formData.commissione || 0),
      data_movimento: formData.dataMovimento || formData.data_movimento || null,
      data_scadenza: formData.dataScadenza || formData.data_scadenza || null,
      pagato: formData.pagato || false,
      note: formData.note || null,
      movimento_stornato_id: formData.movimentoStornatoId || formData.movimento_stornato_id || null
    };

    let result;
    if (editingId) {
  result = await updateRecord('movimentiContabili', editingId, dataForSupabase);  // ✅ camelCase
} else {
  result = await addRecord('movimentiContabili', dataForSupabase);  // ✅ camelCase
}

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({tipo: 'uscita', tipologiaMovimento: 'bonifico', pagato: false, modalitaUscita: 'pagata'});
      setEditingId(null);
      alert(editingId ? '✅ Movimento aggiornato!' : '✅ Movimento aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA da Supabase
  const handleDelete = async (movimento) => {
    if (!confirm(`❌ Eliminare il movimento del ${formatDate(movimento.data_movimento || movimento.data_scadenza)}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('movimentiContabili', movimento.id);  // ✅ camelCase

    if (result.success) {
      alert('✅ Movimento eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (movimento) => {
  setFormData({
    tipo: movimento.tipo,
    tipologiaMovimento: movimento.tipologia_movimento,
    tipologia_movimento: movimento.tipologia_movimento,
    fornitoreId: movimento.fornitore_id,
    fornitore_id: movimento.fornitore_id,
    clienteId: movimento.cliente_id,
    cliente_id: movimento.cliente_id,
    cantiereId: movimento.cantiere_id,
      causale: movimento.causale,
      importo: movimento.importo,
      commissione: movimento.commissione,
      dataMovimento: movimento.data_movimento,
      data_movimento: movimento.data_movimento,
      dataScadenza: movimento.data_scadenza,
      data_scadenza: movimento.data_scadenza,
      pagato: movimento.pagato,
      note: movimento.note,
      movimentoStornatoId: movimento.movimento_stornato_id,
      movimento_stornato_id: movimento.movimento_stornato_id,
      modalitaUscita: movimento.pagato ? 'pagata' : 'programmata'
    });
    setEditingId(movimento.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ MARCA PAGAMENTO
  const marcaPagamento = async (movimentoId) => {
    const movimento = movimentiContabili.find(m => m.id === movimentoId);
    
    if (movimento.pagato) {
      // Rimuovi pagamento
      const result = await updateRecord('movimentiContabili', movimentoId, {  // ✅ camelCase
  pagato: false,
  data_movimento: null
});
      
      if (!result.success) {
        alert('❌ Errore: ' + result.error);
      }
    } else {
      // Registra pagamento
      setMovimentoDaPagare(movimento);
      setDataPagamento(new Date().toISOString().split('T')[0]);
      setShowPagamentoModal(true);
    }
  };

  const confermaDataPagamento = async () => {
    if (!dataPagamento) {
      return alert('⚠️ Inserisci la data di pagamento');
    }
    
    const result = await updateRecord('movimentiContabili', movimentoDaPagare.id, {  // ✅ camelCase
  pagato: true,
  data_movimento: dataPagamento
});
    
    if (result.success) {
      setShowPagamentoModal(false);
      setMovimentoDaPagare(null);
      setDataPagamento('');
      alert('✅ Pagamento registrato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

// ✅ MOVIMENTI FILTRATI
  const movimentiFiltrati = useMemo(() => {
    return movimentiContabili.filter(mov => {
      if (filtroDataDa && mov.data_movimento && mov.data_movimento < filtroDataDa) return false;
      if (filtroDataA && mov.data_movimento && mov.data_movimento > filtroDataA) return false;
      if (filtroFornitore && mov.fornitore_id !== filtroFornitore && mov.cliente_id !== filtroFornitore) return false;
      if (filtroCantiere && mov.cantiere_id !== filtroCantiere) return false;
      if (filtroTipologia && mov.tipologia_movimento !== filtroTipologia) return false;
      if (filtroStatoPagamento === 'pagato' && !mov.pagato) return false;
      if (filtroStatoPagamento === 'non_pagato' && mov.pagato) return false;
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.data_movimento || a.data_scadenza || '9999-12-31');
      const dateB = new Date(b.data_movimento || b.data_scadenza || '9999-12-31');
      return dateA - dateB;
    });
  }, [movimentiContabili, filtroDataDa, filtroDataA, filtroFornitore, filtroCantiere, filtroTipologia, filtroStatoPagamento]);

  // ✅ CALCOLI CONTABILI
  const calcoliContabili = useMemo(() => {
    let saldoRealeProgressivo = parseFloat(saldoIniziale);
    const movimentiConSaldo = movimentiFiltrati.map(mov => {
      const importoTotale = parseFloat(mov.importo || 0) + parseFloat(mov.commissione || 0);
      
      if (mov.pagato) {
        if (mov.tipologia_movimento === 'storno') {
          saldoRealeProgressivo += importoTotale;
        } else if (mov.tipo === 'entrata') {
          saldoRealeProgressivo += importoTotale;
        } else {
          saldoRealeProgressivo -= importoTotale;
        }
      }
      return { ...mov, saldoProgressivo: saldoRealeProgressivo };
    });

    const totaleEntrate = movimentiFiltrati
      .filter(m => m.tipo === 'entrata' && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const totaleUscite = movimentiFiltrati
      .filter(m => m.tipo === 'uscita' && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const totaleEntratePagate = movimentiFiltrati
      .filter(m => m.tipo === 'entrata' && m.pagato && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const totaleUscitePagate = movimentiFiltrati
      .filter(m => m.tipo === 'uscita' && m.pagato && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const totaleStorniPagati = movimentiFiltrati
      .filter(m => m.tipologia_movimento === 'storno' && m.pagato)
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    return {
      movimentiConSaldo,
      totaleEntrate,
      totaleUscite,
      saldoReale: parseFloat(saldoIniziale) + totaleEntratePagate - totaleUscitePagate + totaleStorniPagati,
      saldoPrevisto: parseFloat(saldoIniziale) + totaleEntrate - totaleUscite
    };
  }, [movimentiFiltrati, saldoIniziale]);

  // ✅ SALDO PREVISTO FINE MESE
  const saldoPrevistoFineMese = useMemo(() => {
    const oggi = new Date();
    const meseCorrente = oggi.getMonth();
    const annoCorrente = oggi.getFullYear();
    
    const movimentiMeseCorrente = movimentiContabili.filter(m => {
      const dataRif = m.data_movimento || m.data_scadenza;
      if (!dataRif) return false;
      const data = new Date(dataRif);
      return data.getMonth() === meseCorrente && data.getFullYear() === annoCorrente;
    });
    
    const entrateNonPagateFineMese = movimentiMeseCorrente
      .filter(m => m.tipo === 'entrata' && m.tipologia_movimento !== 'storno' && !m.pagato)
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const usciteNonPagateFineMese = movimentiMeseCorrente
      .filter(m => m.tipo === 'uscita' && m.tipologia_movimento !== 'storno' && !m.pagato)
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const storniNonPagatiFineMese = movimentiMeseCorrente
      .filter(m => m.tipologia_movimento === 'storno' && !m.pagato)
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    return calcoliContabili.saldoReale + entrateNonPagateFineMese - usciteNonPagateFineMese + storniNonPagatiFineMese;
  }, [movimentiContabili, calcoliContabili.saldoReale]);

  // ✅ SCADENZE IMMINENTI
  const scadenzeImminenti = useMemo(() => {
    const oggi = new Date();
    return movimentiContabili
      .filter(m => m.data_scadenza && !m.pagato && m.tipo === 'uscita')
      .map(m => ({
        ...m,
        giorniMancanti: Math.ceil((new Date(m.data_scadenza) - oggi) / (1000 * 60 * 60 * 24))
      }))
      .filter(m => m.giorniMancanti >= -7 && m.giorniMancanti <= 30)
      .sort((a, b) => a.giorniMancanti - b.giorniMancanti);
  }, [movimentiContabili]);

  // ✅ ESPORTA PDF
  const esportaPDF = () => {
    const movimentiMese = movimentiContabili.filter(m => {
      const dataRiferimento = m.data_movimento || m.data_scadenza;
      if (!dataRiferimento) return false;
      const data = new Date(dataRiferimento);
      return data.getMonth() + 1 === meseReport && data.getFullYear() === annoReport;
    }).sort((a, b) => {
      const dateA = new Date(a.data_movimento || a.data_scadenza || '9999-12-31');
      const dateB = new Date(b.data_movimento || b.data_scadenza || '9999-12-31');
      return dateA - dateB;
    });

    const totaleEntrateMese = movimentiMese
      .filter(m => m.tipo === 'entrata' && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const totaleUsciteMese = movimentiMese
      .filter(m => m.tipo === 'uscita' && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const totaleStorniMese = movimentiMese
      .filter(m => m.tipologia_movimento === 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const totaleEntratePagateMese = movimentiMese
      .filter(m => m.tipo === 'entrata' && m.pagato && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);
    
    const totaleUscitePagateMese = movimentiMese
      .filter(m => m.tipo === 'uscita' && m.pagato && m.tipologia_movimento !== 'storno')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const totaleStorniPagatiMese = movimentiMese
      .filter(m => m.tipologia_movimento === 'storno' && m.pagato)
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    const saldoRealeMese = parseFloat(saldoIniziale) + totaleEntratePagateMese - totaleUscitePagateMese + totaleStorniPagatiMese;
    const saldoPrevistoMese = parseFloat(saldoIniziale) + totaleEntrateMese - totaleUsciteMese + totaleStorniMese;

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Report Contabilità - ${mesiNomi[meseReport - 1]} ${annoReport}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; text-align: center; }
    .info { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 11px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #3b82f6; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f3f4f6; }
    .entrata { background-color: #d1fae5 !important; }
    .uscita { background-color: #fee2e2 !important; }
    .totali { background: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .totali-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .totale-card { border: 2px solid; border-radius: 8px; padding: 15px; }
    .totale-card.entrate { background: #d1fae5; border-color: #10b981; }
    .totale-card.uscite { background: #fee2e2; border-color: #ef4444; }
    .totale-card.saldo-reale { background: #e0e7ff; border-color: #6366f1; }
    .totale-card.saldo-previsto { background: #fef3c7; border-color: #f59e0b; }
    .totale-label { font-size: 12px; color: #374151; margin-bottom: 5px; }
    .totale-valore { font-size: 24px; font-weight: bold; color: #1f2937; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 11px; border-top: 1px solid #ccc; padding-top: 20px; }
    @media print {
      .no-print { display: none; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; font-size: 14px;">
    🖨️ Stampa / Salva PDF
  </button>
  
  <h1>📊 Report Contabilità - ${mesiNomi[meseReport - 1]} ${annoReport}</h1>
  
  <div class="info">
    <strong>Azienda:</strong> Marrel S.r.l.<br>
    <strong>Periodo:</strong> ${mesiNomi[meseReport - 1]} ${annoReport}<br>
    <strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
    <strong>Movimenti totali:</strong> ${movimentiMese.length}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Data Movimento</th>
        <th>Tipo</th>
        <th>Tipologia</th>
        <th>Fornitore</th>
        <th>Cantiere</th>
        <th>Causale</th>
        <th>Importo</th>
        <th>Comm.</th>
        <th>Totale</th>
        <th>Scadenza</th>
        <th>Stato</th>
      </tr>
    </thead>
    <tbody>
      ${movimentiMese.map(mov => {
        const fornitore = fornitori.find(f => f.id === mov.fornitore_id);
        const cliente = clienti.find(c => c.id === movimento.cliente_id);
        const cantiere = cantieri.find(c => c.id === mov.cantiere_id);
        const tipologia = tipologieMovimento.find(t => t.value === mov.tipologia_movimento);
        const totale = parseFloat(mov.importo || 0) + parseFloat(mov.commissione || 0);
        return `
        <tr class="${mov.tipo}">
          <td>${formatDate(mov.data_movimento)}</td>
          <td>${mov.tipo === 'entrata' ? '⬆️ Entrata' : '⬇️ Uscita'}</td>
          <td>${tipologia?.label || mov.tipologia_movimento}</td>
          <td>${fornitore?.ragione_sociale || '-'}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td>${mov.causale || '-'}</td>
          <td style="text-align: right;">€ ${parseFloat(mov.importo || 0).toFixed(2)}</td>
          <td style="text-align: right;">€ ${parseFloat(mov.commissione || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">€ ${totale.toFixed(2)}</td>
          <td>${mov.tipo === 'uscita' ? formatDate(mov.data_scadenza) : '-'}</td>
          <td>${mov.pagato ? '✅ Pagato' : '⏳ Da pagare'}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="totali">
    <h2 style="margin-top: 0;">💰 Riepilogo Mensile</h2>
    <div class="totali-grid">
      <div class="totale-card entrate">
        <div class="totale-label">Totale Entrate</div>
        <div class="totale-valore">€ ${totaleEntrateMese.toFixed(2)}</div>
      </div>
      <div class="totale-card uscite">
        <div class="totale-label">Totale Uscite</div>
        <div class="totale-valore">€ ${totaleUsciteMese.toFixed(2)}</div>
      </div>
      <div class="totale-card" style="background: #e5e7eb; border-color: #6b7280;">
        <div class="totale-label">Totale Storni</div>
        <div class="totale-valore">€ ${totaleStorniMese.toFixed(2)}</div>
      </div>
      <div class="totale-card saldo-reale">
        <div class="totale-label">Saldo Reale (movimenti pagati)</div>
        <div class="totale-valore">€ ${saldoRealeMese.toFixed(2)}</div>
      </div>
      <div class="totale-card saldo-previsto">
        <div class="totale-label">Saldo Previsto (tutti i movimenti)</div>
        <div class="totale-valore">€ ${saldoPrevistoMese.toFixed(2)}</div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>Gestionale Marrel S.r.l. - Report Contabilità</p>
    <p>Documento generato automaticamente dal sistema</p>
  </div>
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };
    // ✅ INCOLLA QUI LA NUOVA FUNZIONE
  const esportaPrimaNota = () => {
    const movimentiMese = movimentiContabili.filter(m => {
      const dataRiferimento = m.data_movimento || m.data_scadenza;
      if (!dataRiferimento) return false;
      const data = new Date(dataRiferimento);
      return data.getMonth() + 1 === meseReport && data.getFullYear() === annoReport && m.pagato;
    }).sort((a, b) => {
      const dateA = new Date(a.data_movimento || a.data_scadenza || '9999-12-31');
      const dateB = new Date(b.data_movimento || b.data_scadenza || '9999-12-31');
      return dateA - dateB;
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Prima Nota - ${mesiNomi[meseReport - 1]} ${annoReport}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; text-align: center; }
    .info { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 11px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #3b82f6; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f3f4f6; }
    .entrata { background-color: #d1fae5 !important; }
    .uscita { background-color: #fee2e2 !important; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 11px; border-top: 1px solid #ccc; padding-top: 20px; }
    @media print {
      .no-print { display: none; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; font-size: 14px;">
    🖨️ Stampa / Salva PDF
  </button>
  
  <h1>📋 Prima Nota - ${mesiNomi[meseReport - 1]} ${annoReport}</h1>
  
  <div class="info">
    <strong>Azienda:</strong> Marrel S.r.l.<br>
    <strong>Periodo:</strong> ${mesiNomi[meseReport - 1]} ${annoReport}<br>
    <strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
    <strong>Movimenti pagati:</strong> ${movimentiMese.length}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Data Movimento</th>
        <th>Tipo</th>
        <th>Tipologia</th>
        <th>Fornitore</th>
        <th>Cantiere</th>
        <th>Causale</th>
        <th>Importo</th>
        <th>Comm.</th>
        <th>Totale</th>
      </tr>
    </thead>
    <tbody>
      ${movimentiMese.map(mov => {
        const fornitore = fornitori.find(f => f.id === mov.fornitore_id);
        const cantiere = cantieri.find(c => c.id === mov.cantiere_id);
        const tipologia = tipologieMovimento.find(t => t.value === mov.tipologia_movimento);
        const totale = parseFloat(mov.importo || 0) + parseFloat(mov.commissione || 0);
        return `
        <tr class="${mov.tipo}">
          <td>${formatDate(mov.data_movimento)}</td>
          <td>${mov.tipo === 'entrata' ? '⬆️ Entrata' : '⬇️ Uscita'}</td>
          <td>${tipologia?.label || mov.tipologia_movimento}</td>
          <td>${fornitore?.ragione_sociale || '-'}</td>
          <td>${cantiere?.nome || '-'}</td>
          <td>${mov.causale || '-'}</td>
          <td style="text-align: right;">€ ${parseFloat(mov.importo || 0).toFixed(2)}</td>
          <td style="text-align: right;">€ ${parseFloat(mov.commissione || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">€ ${totale.toFixed(2)}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Gestionale Marrel S.r.l. - Prima Nota</p>
    <p>Documento generato automaticamente dal sistema - Solo movimenti pagati</p>
  </div>
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };
  return (
    <div className="space-y-4">
      {/* Header con saldi */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="text-sm text-green-700 mb-1">Totale Entrate</div>
          <div className="text-3xl font-bold text-green-900">€ {calcoliContabili.totaleEntrate.toFixed(2)}</div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="text-sm text-red-700 mb-1">Totale Uscite</div>
          <div className="text-3xl font-bold text-red-900">€ {calcoliContabili.totaleUscite.toFixed(2)}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Saldo Reale</div>
          <div className="text-3xl font-bold text-blue-900">€ {calcoliContabili.saldoReale.toFixed(2)}</div>
          <div className="text-xs text-blue-600 mt-1">Solo movimenti pagati</div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-700 mb-1">Saldo Previsto Fine Mese</div>
          <div className="text-3xl font-bold text-yellow-900">€ {saldoPrevistoFineMese.toFixed(2)}</div>
          <div className="text-xs text-yellow-600 mt-1">
            {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Scadenze imminenti */}
      {scadenzeImminenti.length > 0 && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="font-semibold text-orange-900 mb-2">⚠️ Scadenze Imminenti ({scadenzeImminenti.length})</h3>
          <div className="space-y-2">
            {scadenzeImminenti.slice(0, 5).map(scad => {
              const fornitore = fornitori.find(f => f.id === scad.fornitore_id);
              return (
                <div key={scad.id} className="text-sm text-orange-800 flex justify-between">
                  <span>{fornitore?.ragione_sociale || 'N/A'} - {scad.causale}</span>
                  <span className="font-semibold">
                    {scad.giorniMancanti < 0 ? `${Math.abs(scad.giorniMancanti)}gg fa` : `tra ${scad.giorniMancanti}gg`}
                    {' '}€ {parseFloat(scad.importo || 0).toFixed(2)}
                  </span>
                </div>
              );
            })}
            {scadenzeImminenti.length > 5 && (
              <div className="text-xs text-orange-600 mt-2">... e altre {scadenzeImminenti.length - 5} scadenze</div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar azioni */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ tipo: 'uscita', tipologiaMovimento: 'bonifico', pagato: false, modalitaUscita: 'pagata' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Nuovo Movimento
        </button>
        <button 
          onClick={() => setShowCommissioniModal(true)} 
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          ⚙️ Configura Commissioni
        </button>
        <button 
          onClick={esportaPDF} 
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          📄 Esporta PDF
        </button>
        <button 
    onClick={esportaPrimaNota}  // ✅ NUOVO PULSANTE
    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
  >
    📋 PDF Prima Nota
  </button>
        <button 
          onClick={() => setShowSaldoInizialeModal(true)} 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          💰 Saldo Iniziale: € {parseFloat(saldoIniziale).toFixed(2)}
        </button>
      </div>

      {/* Filtri */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">🔍 Filtri</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input 
            type="date" 
            className="border rounded px-3 py-2 text-sm" 
            placeholder="Da"
            value={filtroDataDa} 
            onChange={(e) => setFiltroDataDa(e.target.value)} 
          />
          <input 
            type="date" 
            className="border rounded px-3 py-2 text-sm" 
            placeholder="A"
            value={filtroDataA} 
            onChange={(e) => setFiltroDataA(e.target.value)} 
          />
          <select 
  className="border rounded px-3 py-2 text-sm"
  value={filtroFornitore} 
  onChange={(e) => setFiltroFornitore(e.target.value)}
>
  <option value="">Tutti fornitori/clienti</option>
  <optgroup label="🏪 Fornitori">
    {fornitori.map(f => (
      <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
    ))}
  </optgroup>
  <optgroup label="👔 Clienti">
    {clienti.map(c => (
      <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
    ))}
  </optgroup>
</select>
          <select 
            className="border rounded px-3 py-2 text-sm"
            value={filtroCantiere} 
            onChange={(e) => setFiltroCantiere(e.target.value)}
          >
            <option value="">Tutti i cantieri</option>
            {cantieri.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <select 
            className="border rounded px-3 py-2 text-sm"
            value={filtroTipologia} 
            onChange={(e) => setFiltroTipologia(e.target.value)}
          >
            <option value="">Tutte le tipologie</option>
            {tipologieMovimento.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select 
            className="border rounded px-3 py-2 text-sm"
            value={filtroStatoPagamento} 
            onChange={(e) => setFiltroStatoPagamento(e.target.value)}
          >
            <option value="">Tutti gli stati</option>
            <option value="pagato">Pagati</option>
            <option value="non_pagato">Da pagare</option>
          </select>
        </div>
        {(filtroDataDa || filtroDataA || filtroFornitore || filtroCantiere || filtroTipologia || filtroStatoPagamento) && (
          <button 
            onClick={() => {
              setFiltroDataDa('');
              setFiltroDataA('');
              setFiltroFornitore('');
              setFiltroCantiere('');
              setFiltroTipologia('');
              setFiltroStatoPagamento('');
            }} 
            className="mt-3 text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ✕ Reset Filtri
          </button>
        )}
      </div>

      {/* Form Nuovo Movimento */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Modifica' : '➕ Nuovo'} Movimento</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Movimento *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.tipo || 'uscita'}
                onChange={(e) => {
                  const tipo = e.target.value;
                  if (tipo === 'entrata') {
                    setFormData({
                      ...formData, 
                      tipo, 
                      pagato: true,
                      dataMovimento: new Date().toISOString().split('T')[0],
                      dataScadenza: '',
                      modalitaUscita: 'pagata',
                      tipologiaMovimento: 'bonifico'
                    });
                  } else if (tipo === 'storno') {
                    setFormData({
                      ...formData, 
                      tipo, 
                      pagato: false,
                      dataMovimento: '',
                      tipologiaMovimento: 'storno',
                      modalitaUscita: 'pagata'
                    });
                  } else {
                    setFormData({
                      ...formData, 
                      tipo, 
                      pagato: false,
                      dataMovimento: '',
                      modalitaUscita: 'pagata',
                      tipologiaMovimento: 'bonifico'
                    });
                  }
                }}
                disabled={saving}
              >
                <option value="entrata">⬆️ Entrata</option>
                <option value="uscita">⬇️ Uscita</option>
                <option value="storno">🔄 Storno</option>
              </select>
            </div>

            {formData.tipo === 'uscita' && formData.tipologiaMovimento !== 'storno' && (
              <div>
                <label className="block text-sm font-medium mb-1">Modalità Uscita *</label>
                <select 
                  className="border rounded px-3 py-2 w-full" 
                  value={formData.modalitaUscita || 'pagata'}
                  onChange={(e) => {
                    const modalita = e.target.value;
                    if (modalita === 'pagata') {
                      setFormData({
                        ...formData,
                        modalitaUscita: modalita,
                        pagato: true,
                        dataMovimento: new Date().toISOString().split('T')[0]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        modalitaUscita: modalita,
                        pagato: false,
                        dataMovimento: ''
                      });
                    }
                  }}
                  disabled={saving}
                >
                  <option value="pagata">💰 Pagata subito</option>
                  <option value="programmata">📅 Programmata (da pagare)</option>
                </select>
              </div>
            )}

            {formData.tipo === 'entrata' && (
              <div>
                <label className="block text-sm font-medium mb-1">Data Movimento *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.dataMovimento || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, dataMovimento: e.target.value})}
                  disabled={saving}
                />
                <div className="text-xs text-gray-500 mt-1">Data registrazione entrata</div>
              </div>
            )}

            {formData.tipo === 'storno' && (
              <div>
                <label className="block text-sm font-medium mb-1">Data Storno *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.dataMovimento || ''}
                  onChange={(e) => setFormData({...formData, dataMovimento: e.target.value, pagato: true})}
                  disabled={saving}
                />
                <div className="text-xs text-gray-500 mt-1">Data in cui viene effettuato lo storno</div>
              </div>
            )}

            {formData.tipo === 'uscita' && formData.modalitaUscita === 'pagata' && (
              <div>
                <label className="block text-sm font-medium mb-1">Data Pagamento *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.dataMovimento || ''}
                  onChange={(e) => setFormData({...formData, dataMovimento: e.target.value, pagato: true})}
                  disabled={saving}
                />
              </div>
            )}

            {formData.tipo === 'uscita' && formData.modalitaUscita === 'programmata' && (
              <div>
                <label className="block text-sm font-medium mb-1">Data Scadenza *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.dataScadenza || ''}
                  onChange={(e) => setFormData({...formData, dataScadenza: e.target.value})}
                  disabled={saving}
                />
                <div className="text-xs text-gray-500 mt-1">Verrà impostata la data di pagamento quando paghi</div>
              </div>
            )}

            {formData.tipo !== 'storno' && (
  <div>
    <label className="block text-sm font-medium mb-1">
      {formData.tipo === 'entrata' ? 'Cliente' : 'Fornitore'}
    </label>
    <select 
      className="border rounded px-3 py-2 w-full" 
      value={formData.tipo === 'entrata' ? (formData.clienteId || '') : (formData.fornitoreId || '')}
      onChange={(e) => {
        if (formData.tipo === 'entrata') {
          setFormData({...formData, clienteId: e.target.value, fornitoreId: null});
        } else {
          setFormData({...formData, fornitoreId: e.target.value, clienteId: null});
        }
      }}
      disabled={saving}
    >
      <option value="">Seleziona {formData.tipo === 'entrata' ? 'cliente' : 'fornitore'}</option>
      {formData.tipo === 'entrata' ? (
        clienti.map(c => (
          <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
        ))
      ) : (
        fornitori.map(f => (
          <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
        ))
      )}
    </select>
  </div>
)}

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

            {formData.tipo !== 'storno' && (
              <div>
                <label className="block text-sm font-medium mb-1">Tipologia *</label>
                <select 
                  className="border rounded px-3 py-2 w-full" 
                  value={formData.tipologiaMovimento || 'bonifico'}
                  onChange={(e) => {
                    const tipologia = e.target.value;
                    setFormData({...formData, tipologiaMovimento: tipologia});
                  }}
                  disabled={saving}
                >
                  {tipologieMovimento.filter(t => t.value !== 'storno').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.tipo === 'storno' && (
              <div>
                <label className="block text-sm font-medium mb-1">Movimento da Stornare *</label>
                <select 
                  className="border rounded px-3 py-2 w-full" 
                  value={formData.movimentoStornatoId || ''}
                  onChange={(e) => {
                    const movId = e.target.value;
                    const movimento = movimentiContabili.find(m => m.id === movId);
                    if (movimento) {
                      setMovimentoStornato(movimento);
                      setFormData({
                        ...formData, 
                        movimentoStornatoId: movId,
                        importo: movimento.importo,
                        commissione: movimento.commissione || '0.00',
                        fornitoreId: movimento.fornitore_id,
                        cantiereId: movimento.cantiere_id
                      });
                    }
                  }}
                  disabled={saving}
                >
                  <option value="">Seleziona movimento</option>
                  {movimentiContabili
                    .filter(m => m.tipologia_movimento !== 'storno')
                    .map(m => {
                      const fornitore = fornitori.find(f => f.id === m.fornitore_id);
                      const totale = parseFloat(m.importo || 0) + parseFloat(m.commissione || 0);
                      return (
                        <option key={m.id} value={m.id}>
                          {formatDate(m.data_movimento)} - {fornitore?.ragione_sociale || 'N/A'} - {m.causale} - € {totale.toFixed(2)}
                        </option>
                      );
                    })}
                </select>
                {movimentoStornato && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                    <p><strong>Importo:</strong> € {parseFloat(movimentoStornato.importo || 0).toFixed(2)}</p>
                    <p><strong>Commissione:</strong> € {parseFloat(movimentoStornato.commissione || 0).toFixed(2)}</p>
                    <p><strong>Totale:</strong> € {(parseFloat(movimentoStornato.importo || 0) + parseFloat(movimentoStornato.commissione || 0)).toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {formData.tipo !== 'storno' && (
              <div>
                <label className="block text-sm font-medium mb-1">Importo * (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.importo || ''}
                  onChange={(e) => {
                    const importo = e.target.value;
                    const commissione = formData.tipo === 'uscita' 
                      ? calcolaCommissione(formData.tipologiaMovimento, importo)
                      : 0;
                    setFormData({...formData, importo, commissione: commissione.toFixed(2)});
                  }}
                  disabled={saving}
                />
              </div>
            )}

            {formData.tipo === 'uscita' && (
              <div>
                <label className="block text-sm font-medium mb-1">Commissione (€)</label>
                <input 
                  type="text" 
                  className="border rounded px-3 py-2 w-full bg-gray-50" 
                  readOnly
                  value={formData.commissione || '0.00'} 
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Causale *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                value={formData.causale || ''}
                onChange={(e) => setFormData({...formData, causale: e.target.value})}
                disabled={saving}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea 
                className="border rounded px-3 py-2 w-full" 
                rows="2"
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
                setFormData({tipo: 'uscita', tipologiaMovimento: 'bonifico', pagato: false, modalitaUscita: 'pagata'});
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

      {/* Selezione periodo export */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">📄 Esporta Report PDF</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Mese</label>
            <select 
              className="border rounded px-3 py-2" 
              value={meseReport}
              onChange={(e) => setMeseReport(Number(e.target.value))}
            >
              {mesiNomi.map((nome, index) => (
                <option key={index} value={index + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anno</label>
            <input 
              type="number" 
              className="border rounded px-3 py-2" 
              value={annoReport}
              onChange={(e) => setAnnoReport(Number(e.target.value))} 
            />
          </div>
        </div>
      </div>

      {/* Tabella Prima Nota */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Data Movimento</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Tipologia</th>
              <th className="px-3 py-2 text-left">Fornitore</th>
              <th className="px-3 py-2 text-left">Cantiere</th>
              <th className="px-3 py-2 text-left">Causale</th>
              <th className="px-3 py-2 text-right">Importo</th>
              <th className="px-3 py-2 text-right">Comm.</th>
              <th className="px-3 py-2 text-right">Totale</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2 text-center">Scad.</th>
              <th className="px-3 py-2 text-center">Stato</th>
              <th className="px-3 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {calcoliContabili.movimentiConSaldo.map(mov => {
              const fornitore = fornitori.find(f => f.id === mov.fornitore_id);
              const cantiere = cantieri.find(c => c.id === mov.cantiere_id);
              const tipologia = tipologieMovimento.find(t => t.value === mov.tipologia_movimento);
              const totale = parseFloat(mov.importo || 0) + parseFloat(mov.commissione || 0);
              
              return (
                <tr 
                  key={mov.id} 
                  className={`border-t hover:bg-gray-50 ${mov.tipo === 'entrata' ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <td className="px-3 py-2">{formatDate(mov.data_movimento)}</td>
                  <td className="px-3 py-2">
                    {mov.tipologia_movimento === 'storno' ? (
                      <span className="px-2 py-1 rounded text-xs bg-gray-200">🔄 Storno</span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${mov.tipo === 'entrata' ? 'bg-green-200' : 'bg-red-200'}`}>
                        {mov.tipo === 'entrata' ? '⬆️ Entrata' : '⬇️ Uscita'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{tipologia?.label || mov.tipologia_movimento}</td>
                  <td className="px-3 py-2">{fornitore?.ragione_sociale || cliente?.ragione_sociale || '-'}</td>
                  <td className="px-3 py-2">{cantiere?.nome || '-'}</td>
                  <td className="px-3 py-2 max-w-xs">
                    {mov.causale}
                    {mov.tipologia_movimento === 'storno' && mov.movimento_stornato_id && (
                      <div className="text-xs text-gray-500 mt-1">
                        Storno di: {(() => {
                          const movStornato = movimentiContabili.find(m => m.id === mov.movimento_stornato_id);
                          return movStornato ? formatDate(movStornato.data_movimento) : 'N/A';
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">€ {parseFloat(mov.importo || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">€ {parseFloat(mov.commissione || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {mov.tipologia_movimento === 'storno' ? '+' : ''} € {totale.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {mov.tipologia_movimento === 'storno' ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      `€ ${mov.saldoProgressivo.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {mov.tipo === 'uscita' ? formatDate(mov.data_scadenza) : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {mov.tipo === 'entrata' ? (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">✅ Pagato</span>
                    ) : (
                      <button 
                        onClick={() => marcaPagamento(mov.id)}
                        className={`px-2 py-1 rounded text-xs ${mov.pagato ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                      >
                        {mov.pagato ? '✅ Pagato' : '⏳ Da pagare'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => handleEdit(mov)} 
                      className="text-blue-600 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(mov)} 
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
        {calcoliContabili.movimentiConSaldo.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">📊</p>
            <p>Nessun movimento registrato</p>
            <p className="text-sm mt-2">Clicca su "➕ Nuovo Movimento" per iniziare</p>
          </div>
        )}
      </div>

    {/* MODALI */}
      <>
        {/* Modal Commissioni */}
        {showCommissioniModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">⚙️ Configurazione Commissioni</h3>
              <div className="grid grid-cols-2 gap-4">
                {tipologieMovimento.filter(t => t.value !== 'storno').map(tip => (
                  <div key={tip.value} className="border rounded p-3">
                    <div className="font-medium mb-2">{tip.label}</div>
                    <div className="flex gap-2">
                      <select 
                        className="border rounded px-2 py-1 text-sm"
                        value={commissioni[tip.value]?.tipo || 'fisso'}
                        onChange={(e) => setCommissioni({
                          ...commissioni,
                          [tip.value]: { ...commissioni[tip.value], tipo: e.target.value }
                        })}
                      >
                        <option value="fisso">Fisso (€)</option>
                        <option value="percentuale">Percentuale (%)</option>
                      </select>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="border rounded px-2 py-1 text-sm flex-1"
                        value={commissioni[tip.value]?.valore || 0}
                        onChange={(e) => setCommissioni({
                          ...commissioni,
                          [tip.value]: { ...commissioni[tip.value], valore: e.target.value }
                        })} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={async () => {
                    const result = await setSetting('commissioni', JSON.stringify(commissioni));
                    
                    if (result.success) {
                      alert('✅ Commissioni salvate!');
                      setShowCommissioniModal(false);
                    } else {
                      alert('❌ Errore: ' + result.error);
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  ✓ Salva Configurazione
                </button>
                <button 
                  onClick={() => setShowCommissioniModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Data Pagamento */}
        {showPagamentoModal && movimentoDaPagare && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">💰 Registra Pagamento</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Fornitore:</strong> {fornitori.find(f => f.id === movimentoDaPagare.fornitore_id)?.ragione_sociale || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Causale:</strong> {movimentoDaPagare.causale}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Importo:</strong> € {(parseFloat(movimentoDaPagare.importo || 0) + parseFloat(movimentoDaPagare.commissione || 0)).toFixed(2)}
                </p>
                <label className="block text-sm font-medium mb-2">Data Pagamento *</label>
                <input 
                  type="date" 
                  className="border rounded px-3 py-2 w-full"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={confermaDataPagamento}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  ✓ Conferma Pagamento
                </button>
                <button 
                  onClick={() => {
                    setShowPagamentoModal(false);
                    setMovimentoDaPagare(null);
                    setDataPagamento('');
                  }} 
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Saldo Iniziale */}
        {showSaldoInizialeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">💰 Imposta Saldo Iniziale</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Il saldo iniziale rappresenta il capitale di partenza della contabilità. 
                  Verrà sommato a tutti i calcoli (saldo reale e saldo previsto).
                </p>
                <label className="block text-sm font-medium mb-2">Saldo Iniziale (€)</label>
                <input 
                  id="input-saldo-iniziale"
                  type="number" 
                  step="0.01" 
                  className="border rounded px-3 py-2 w-full"
                  defaultValue={saldoIniziale}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Inserisci il valore positivo o negativo del saldo di partenza
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    const input = document.getElementById('input-saldo-iniziale');
                    const nuovoSaldo = input.value;
                    
                    const result = await setSetting('saldo_iniziale', nuovoSaldo);
                    
                    if (result.success) {
                      alert('✅ Saldo iniziale salvato!');
                      setShowSaldoInizialeModal(false);
                      window.location.reload();
                    } else {
                      alert('❌ Errore: ' + result.error);
                    }
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  ✓ Salva
                </button>
                <button 
                  onClick={() => setShowSaldoInizialeModal(false)} 
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
}

export default Contabilita;