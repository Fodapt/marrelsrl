import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function Acconti() {
  const {
    acconti = [],
    lavoratori = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    tipo: 'paga', 
    meseRiferimento: new Date().getMonth() + 1, 
    annoRiferimento: new Date().getFullYear() 
  });
  const [saving, setSaving] = useState(false);

  const [accontoEspanso, setAccontoEspanso] = useState({});
  const [meseDetrazione, setMeseDetrazione] = useState(new Date().getMonth() + 1);
  const [annoDetrazione, setAnnoDetrazione] = useState(new Date().getFullYear());
  const [importoDetrazione, setImportoDetrazione] = useState('');
  const [filtroLavoratore, setFiltroLavoratore] = useState('');
  const [filtroStato, setFiltroStato] = useState('');

  const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calcolaStatoAcconto = (acconto) => {
    if (acconto.tipo === 'tfr') return { stato: 'completo', label: 'TFR', color: 'bg-purple-100 text-purple-700' };
    
    const totaleDetratto = (acconto.detrazioni || []).reduce((sum, d) => sum + parseFloat(d.importo || 0), 0);
    const rimanente = parseFloat(acconto.importo || 0) - totaleDetratto;
    
    if (rimanente <= 0) return { stato: 'saldato', label: 'Saldato', color: 'bg-green-100 text-green-700' };
    if (totaleDetratto > 0) return { stato: 'in_corso', label: 'In recupero', color: 'bg-yellow-100 text-yellow-700' };
    return { stato: 'da_recuperare', label: 'Da recuperare', color: 'bg-red-100 text-red-700' };
  };

  const calcolaRiepilogo = (acconto) => {
    const totale = parseFloat(acconto.importo || 0);
    const pagato = (acconto.detrazioni || []).reduce((sum, d) => sum + parseFloat(d.importo || 0), 0);
    const rimanente = totale - pagato;
    return { totale, pagato, rimanente };
  };

  const accontiFiltrati = useMemo(() => {
    return acconti.filter(acc => {
      if (filtroLavoratore && acc.lavoratore_id !== filtroLavoratore) return false;
      if (filtroStato) {
        const stato = calcolaStatoAcconto(acc);
        if (filtroStato === 'da_recuperare' && stato.stato !== 'da_recuperare') return false;
        if (filtroStato === 'tfr' && acc.tipo !== 'tfr') return false;
        if (filtroStato === 'saldato' && stato.stato !== 'saldato') return false;
      }
      return true;
    });
  }, [acconti, filtroLavoratore, filtroStato]);

  const riepilogoFiltrato = useMemo(() => {
    const totaleAcconti = accontiFiltrati.reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
    const totaleTFR = accontiFiltrati.filter(a => a.tipo === 'tfr').reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
    
    const totaleRecuperato = accontiFiltrati
      .filter(a => a.tipo !== 'tfr')
      .reduce((sum, a) => {
        const detratto = (a.detrazioni || []).reduce((s, d) => s + parseFloat(d.importo || 0), 0);
        return sum + detratto;
      }, 0);
    
    const totaleAccontiPaga = accontiFiltrati
      .filter(a => a.tipo !== 'tfr')
      .reduce((sum, a) => sum + parseFloat(a.importo || 0), 0);
    const residuo = totaleAccontiPaga - totaleRecuperato;
    
    return { totaleAcconti, totaleTFR, totaleAccontiPaga, totaleRecuperato, residuo };
  }, [accontiFiltrati]);

  // ✅ MOSTRA LOADING - DOPO TUTTI GLI HOOKS
  if (loading.acconti || loading.lavoratori) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento acconti...</p>
        </div>
      </div>
    );
  }

 

  // ✅ SALVA ACCONTO
  const handleSave = async () => {
    if (!formData.lavoratoreId || !formData.importo || !formData.dataBonifico) {
      return alert('⚠️ Compila tutti i campi obbligatori:\n- Lavoratore\n- Importo\n- Data Bonifico');
    }
    if (!formData.meseRiferimento || !formData.annoRiferimento) {
      return alert('⚠️ Compila Mese e Anno di riferimento');
    }

    setSaving(true);

    const dataForSupabase = {
      lavoratore_id: formData.lavoratoreId,
      tipo: formData.tipo || 'paga',
      importo: parseFloat(formData.importo),
      data_bonifico: formData.dataBonifico,
      mese_riferimento: parseInt(formData.meseRiferimento),
      anno_riferimento: parseInt(formData.annoRiferimento),
      note: formData.note || null,
      detrazioni: formData.detrazioni || []
    };

    let result;
    if (editingId) {
      result = await updateRecord('acconti', editingId, dataForSupabase);
    } else {
      result = await addRecord('acconti', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Acconto aggiornato!' : '✅ Acconto creato!');
      setShowForm(false);
      setFormData({ 
        tipo: 'paga', 
        meseRiferimento: new Date().getMonth() + 1, 
        annoRiferimento: new Date().getFullYear() 
      });
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA ACCONTO
  const handleDelete = async (acconto) => {
    const lav = lavoratori.find(l => l.id === acconto.lavoratore_id);
    const nome = lav ? `${lav.nome} ${lav.cognome}` : 'questo acconto';
    
    if (!confirm(`❌ Eliminare l'acconto di ${nome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('acconti', acconto.id);

    if (result.success) {
      alert('✅ Acconto eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT ACCONTO
  const handleEdit = (acconto) => {
    setFormData({
      lavoratoreId: acconto.lavoratore_id,
      tipo: acconto.tipo,
      importo: acconto.importo,
      dataBonifico: acconto.data_bonifico,
      meseRiferimento: acconto.mese_riferimento,
      annoRiferimento: acconto.anno_riferimento,
      note: acconto.note,
      detrazioni: acconto.detrazioni || []
    });
    setEditingId(acconto.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ AGGIUNGI DETRAZIONE
  const aggiungiDetrazione = async (accontoId) => {
    if (!importoDetrazione || parseFloat(importoDetrazione) <= 0) {
      return alert('⚠️ Inserisci un importo valido maggiore di 0');
    }

    const acconto = acconti.find(a => a.id === accontoId);
    if (!acconto) return;

    const nuovaDetrazione = {
      id: Date.now().toString(),
      mese: meseDetrazione,
      anno: annoDetrazione,
      importo: parseFloat(importoDetrazione).toFixed(2)
    };

    const result = await updateRecord('acconti', accontoId, {
      detrazioni: [...(acconto.detrazioni || []), nuovaDetrazione]
    });

    if (result.success) {
      setImportoDetrazione('');
      alert('✅ Detrazione aggiunta!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA DETRAZIONE
  const eliminaDetrazione = async (accontoId, detrazioneId) => {
    if (!confirm('❌ Eliminare questa detrazione?')) return;

    const acconto = acconti.find(a => a.id === accontoId);
    if (!acconto) return;

    const result = await updateRecord('acconti', accontoId, {
      detrazioni: acconto.detrazioni.filter(d => d.id !== detrazioneId)
    });

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ 
            tipo: 'paga', 
            meseRiferimento: new Date().getMonth() + 1, 
            annoRiferimento: new Date().getFullYear() 
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ➕ Nuovo Acconto
      </button>

      {/* Filtri */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">🔍 Filtri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Filtra per Lavoratore</label>
            <select 
              className="border rounded px-3 py-2 w-full"
              value={filtroLavoratore}
              onChange={(e) => setFiltroLavoratore(e.target.value)}
            >
              <option value="">Tutti i lavoratori</option>
              {lavoratori.map(l => (
                <option key={l.id} value={l.id}>{l.nome} {l.cognome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filtra per Stato</label>
            <select 
              className="border rounded px-3 py-2 w-full"
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
            >
              <option value="">Tutti gli stati</option>
              <option value="da_recuperare">Da Recuperare</option>
              <option value="tfr">TFR</option>
              <option value="saldato">Saldato</option>
            </select>
          </div>
        </div>
        {(filtroLavoratore || filtroStato) && (
          <button 
            onClick={() => {
              setFiltroLavoratore('');
              setFiltroStato('');
            }} 
            className="mt-3 text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ✕ Reset Filtri
          </button>
        )}
      </div>

      {/* Riepilogo Totali */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Totale Acconti</div>
          <div className="text-2xl font-bold text-blue-900">
            € {riepilogoFiltrato.totaleAcconti.toFixed(2)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {accontiFiltrati.length} acconti
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-700 mb-1">Totale TFR</div>
          <div className="text-2xl font-bold text-purple-900">
            € {riepilogoFiltrato.totaleTFR.toFixed(2)}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {accontiFiltrati.filter(a => a.tipo === 'tfr').length} TFR
          </div>
        </div>
        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
          <div className="text-sm text-cyan-700 mb-1">Totale Acconto Paghe</div>
          <div className="text-2xl font-bold text-cyan-900">
            € {riepilogoFiltrato.totaleAccontiPaga.toFixed(2)}
          </div>
          <div className="text-xs text-cyan-600 mt-1">
            {accontiFiltrati.filter(a => a.tipo !== 'tfr').length} acconti paga
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-700 mb-1">Totale Recuperato</div>
          <div className="text-2xl font-bold text-green-900">
            € {riepilogoFiltrato.totaleRecuperato.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {accontiFiltrati.filter(a => calcolaStatoAcconto(a).stato === 'saldato').length} saldati
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-700 mb-1">Residuo da Recuperare</div>
          <div className="text-2xl font-bold text-orange-900">
            € {riepilogoFiltrato.residuo.toFixed(2)}
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {accontiFiltrati.filter(a => calcolaStatoAcconto(a).stato === 'da_recuperare').length} da recuperare
          </div>
        </div>
      </div>

      {/* Form Acconto */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Modifica' : '➕ Nuovo'} Acconto</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lavoratore *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.lavoratoreId || ''}
                onChange={(e) => setFormData({...formData, lavoratoreId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona Lavoratore</option>
                {lavoratori.map(l => <option key={l.id} value={l.id}>{l.nome} {l.cognome}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.tipo || 'paga'}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                disabled={saving}
              >
                <option value="paga">Acconto Paga</option>
                <option value="tfr">Acconto TFR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Importo (€) *</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                className="border rounded px-3 py-2 w-full"
                value={formData.importo || ''} 
                onChange={(e) => setFormData({...formData, importo: e.target.value})}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Bonifico *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={formData.dataBonifico || ''}
                onChange={(e) => setFormData({...formData, dataBonifico: e.target.value})}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mese Riferimento *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.meseRiferimento || ''}
                onChange={(e) => setFormData({...formData, meseRiferimento: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona mese</option>
                {mesiNomi.map((nome, index) => <option key={index} value={index + 1}>{nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Anno Riferimento *</label>
              <input 
                type="number" 
                placeholder="2025" 
                className="border rounded px-3 py-2 w-full"
                value={formData.annoRiferimento || new Date().getFullYear()}
                onChange={(e) => setFormData({...formData, annoRiferimento: e.target.value})}
                disabled={saving}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea 
                placeholder="Note aggiuntive..." 
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
                setFormData({ 
                  tipo: 'paga', 
                  meseRiferimento: new Date().getMonth() + 1, 
                  annoRiferimento: new Date().getFullYear() 
                });
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

      {/* Lista Acconti */}
      <div className="space-y-4">
        {accontiFiltrati.length === 0 && !filtroLavoratore && !filtroStato ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-4xl mb-4">💰</p>
            <p className="text-gray-500">Nessun acconto registrato</p>
            <p className="text-sm text-gray-400 mt-2">Clicca su "➕ Nuovo Acconto" per iniziare</p>
          </div>
        ) : accontiFiltrati.length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center shadow">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500">Nessun acconto trovato con i filtri selezionati</p>
            <button 
              onClick={() => {
                setFiltroLavoratore('');
                setFiltroStato('');
              }}
              className="mt-3 text-blue-600 hover:underline text-sm"
            >
              ✕ Cancella filtri
            </button>
          </div>
        ) : (
          accontiFiltrati.map(acconto => {
            const lavoratore = lavoratori.find(l => l.id === acconto.lavoratore_id);
            const stato = calcolaStatoAcconto(acconto);
            const riepilogo = calcolaRiepilogo(acconto);
            const isEspanso = accontoEspanso[acconto.id];

            return (
              <div key={acconto.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {acconto.tipo === 'paga' && (
                      <button 
                        onClick={() => setAccontoEspanso({
                          ...accontoEspanso, 
                          [acconto.id]: !isEspanso
                        })}
                        className="text-2xl text-blue-600 hover:text-blue-700 transition-transform"
                        style={{ transform: isEspanso ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        ▶
                      </button>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-blue-600">
                        {lavoratore ? `${lavoratore.nome} ${lavoratore.cognome}` : '⚠️ Lavoratore non trovato'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {acconto.tipo === 'tfr' ? '💼 Acconto TFR' : '💰 Acconto Paga'} - 
                        {' '}{mesiNomi[(acconto.mese_riferimento || 1) - 1]} {acconto.anno_riferimento}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stato.color}`}>
                      {stato.label}
                    </span>
                    <button 
                      onClick={() => handleEdit(acconto)} 
                      className="text-blue-600 hover:text-blue-700 text-xl"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(acconto)} 
                      className="text-red-600 hover:text-red-700 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700 mb-1">Importo Acconto</div>
                    <div className="text-2xl font-bold text-blue-900">€ {riepilogo.totale.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 mb-1">Data Bonifico</div>
                    <div className="text-lg font-bold text-green-900">{formatDate(acconto.data_bonifico)}</div>
                  </div>
                  {acconto.tipo === 'paga' && (
                    <>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-700 mb-1">Detratto</div>
                        <div className="text-2xl font-bold text-yellow-900">€ {riepilogo.pagato.toFixed(2)}</div>
                      </div>
                      <div className={`p-4 rounded-lg border ${riepilogo.rimanente > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`text-sm mb-1 ${riepilogo.rimanente > 0 ? 'text-orange-700' : 'text-green-700'}`}>Rimanente</div>
                        <div className={`text-2xl font-bold ${riepilogo.rimanente > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                          € {riepilogo.rimanente.toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {acconto.note && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4 border-l-4 border-gray-400">
                    <p className="text-sm text-gray-700"><strong>📝 Note:</strong> {acconto.note}</p>
                  </div>
                )}

                {acconto.tipo === 'paga' && isEspanso && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3 text-lg">📋 Recupero Acconto - Detrazioni mensili</h4>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                      <h5 className="font-medium mb-3 text-blue-900">➕ Aggiungi Detrazione</h5>
                      <div className="grid grid-cols-4 gap-3">
                        <select 
                          className="border rounded px-3 py-2 bg-white"
                          value={meseDetrazione}
                          onChange={(e) => setMeseDetrazione(Number(e.target.value))}
                        >
                          {mesiNomi.map((nome, index) => <option key={index} value={index + 1}>{nome}</option>)}
                        </select>
                        <input 
                          type="number" 
                          className="border rounded px-3 py-2"
                          placeholder="Anno"
                          value={annoDetrazione}
                          onChange={(e) => setAnnoDetrazione(Number(e.target.value))} 
                        />
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="Importo €" 
                          className="border rounded px-3 py-2"
                          value={importoDetrazione}
                          onChange={(e) => setImportoDetrazione(e.target.value)} 
                        />
                        <button 
                          onClick={() => aggiungiDetrazione(acconto.id)} 
                          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                        >
                          ➕ Aggiungi
                        </button>
                      </div>
                    </div>

                    {(acconto.detrazioni || []).length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border px-4 py-2 text-left">Mese</th>
                              <th className="border px-4 py-2 text-left">Anno</th>
                              <th className="border px-4 py-2 text-right">Importo</th>
                              <th className="border px-4 py-2 text-center">Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {acconto.detrazioni.sort((a, b) => {
                              if (a.anno !== b.anno) return a.anno - b.anno;
                              return a.mese - b.mese;
                            }).map(detrazione => (
                              <tr key={detrazione.id} className="hover:bg-gray-50">
                                <td className="border px-4 py-2">{mesiNomi[detrazione.mese - 1]}</td>
                                <td className="border px-4 py-2">{detrazione.anno}</td>
                                <td className="border px-4 py-2 text-right font-mono">€ {parseFloat(detrazione.importo).toFixed(2)}</td>
                                <td className="border px-4 py-2 text-center">
                                  <button 
                                    onClick={() => eliminaDetrazione(acconto.id, detrazione.id)} 
                                    className="text-red-600 hover:text-red-700 text-xl"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-blue-50 font-bold">
                              <td colSpan="2" className="border px-4 py-2 text-right">TOTALE DETRATTO:</td>
                              <td className="border px-4 py-2 text-right font-mono text-blue-900">€ {riepilogo.pagato.toFixed(2)}</td>
                              <td className="border px-4 py-2"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200">
                        <p className="text-gray-500">Nessuna detrazione registrata</p>
                        <p className="text-sm text-gray-400 mt-1">Usa il form sopra per aggiungere detrazioni mensili</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Acconti;