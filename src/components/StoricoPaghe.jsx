import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { exportStoricoPaghePDF } from '../utils/exports/exportStoricoPaghePDF';

function StoricoPaghe() {
  const {
    storicoPaghe = [],
    lavoratori = [],
    cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showBonificiModal, setShowBonificiModal] = useState(false);
  const [pagaSelezionata, setPagaSelezionata] = useState(null);
  const [filtroLavoratore, setFiltroLavoratore] = useState('');

  const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const tipologie = [
    { value: 'stipendio', label: 'Stipendio' },
    { value: 'paga', label: 'Paga' },
    { value: 'tfr', label: 'TFR' },
    { value: 'tredicesima', label: '13ª Mensilità' },
    { value: 'quattordicesima', label: '14ª Mensilità' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calcolaBonificato = (paga) => {
    if (!paga.bonifici || paga.bonifici.length === 0) return 0;
    return paga.bonifici.reduce((sum, bon) => sum + parseFloat(bon.importo || 0), 0);
  };

  const calcolaResiduo = (paga) => {
    return parseFloat(paga.importo || 0) - calcolaBonificato(paga);
  };

  const pagheFiltrate = useMemo(() => {
    return storicoPaghe.filter(p => {
      if (filtroLavoratore && p.lavoratore_id !== filtroLavoratore) return false;
      return true;
    }).sort((a, b) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [storicoPaghe, filtroLavoratore]);

  const riepilogoLavoratore = useMemo(() => {
    if (!filtroLavoratore) return null;
    
    const paghe = storicoPaghe.filter(p => p.lavoratore_id === filtroLavoratore);
    const totaleImporti = paghe.reduce((sum, p) => sum + parseFloat(p.importo || 0), 0);
    const totaleBonificato = paghe.reduce((sum, p) => sum + calcolaBonificato(p), 0);
    const residuo = totaleImporti - totaleBonificato;
    
    return { totaleImporti, totaleBonificato, residuo };
  }, [storicoPaghe, filtroLavoratore]);

  // ✅ EXPORT PDF RAGGRUPPATO PER LAVORATORE
  const exportPDF = () => {
    exportStoricoPaghePDF({
      pagheFiltrate,
      lavoratori,
      cantieri,
      mesiNomi,
      tipologie,
      calcolaBonificato,
      calcolaResiduo,
      filtroLavoratore
    });
  };

  // ✅ MOSTRA LOADING
  if (loading.storicoPaghe || loading.lavoratori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento storico paghe...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA PAGA
  const handleSave = async () => {
    if (!formData.lavoratoreId || !formData.tipologia || !formData.mese || !formData.anno || !formData.importo) {
      return alert('⚠️ Compila tutti i campi obbligatori:\n- Dipendente\n- Tipologia\n- Mese\n- Anno\n- Importo');
    }

    setSaving(true);

    const dataForSupabase = {
      lavoratore_id: formData.lavoratoreId,
      mese: parseInt(formData.mese),
      anno: parseInt(formData.anno),
      tipologia: formData.tipologia,
      importo: parseFloat(formData.importo),
      cantiere_id: formData.cantiereId || null,
      bonifici: formData.bonifici || [],
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('storicoPaghe', editingId, dataForSupabase);
    } else {
      result = await addRecord('storicoPaghe', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Paga aggiornata!' : '✅ Paga creata!');
      setShowForm(false);
      setFormData({ 
        mese: new Date().getMonth() + 1,
        anno: new Date().getFullYear(),
        tipologia: 'stipendio',
        bonifici: []
      });
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA PAGA
  const handleDelete = async (paga) => {
    const lavoratore = lavoratori.find(l => l.id === paga.lavoratore_id);
    const nomeLav = lavoratore ? `${lavoratore.nome} ${lavoratore.cognome}` : 'questo dipendente';
    
    if (!confirm(`❌ Eliminare la paga di ${nomeLav} - ${mesiNomi[paga.mese - 1]} ${paga.anno}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('storicoPaghe', paga.id);

    if (result.success) {
      alert('✅ Paga eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT PAGA
  const handleEdit = (paga) => {
    setFormData({
      lavoratoreId: paga.lavoratore_id,
      mese: paga.mese,
      anno: paga.anno,
      tipologia: paga.tipologia,
      importo: paga.importo,
      cantiereId: paga.cantiere_id,
      bonifici: paga.bonifici || [],
      note: paga.note
    });
    setEditingId(paga.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ AGGIUNGI BONIFICO
  const aggiungiBonifico = async (pagaId, importo, dataBonifico) => {
    const paga = storicoPaghe.find(p => p.id === pagaId);
    if (!paga) return;

    const nuovoBonifico = {
      id: Date.now().toString(),
      importo: parseFloat(importo),
      dataBonifico,
      data: new Date().toISOString()
    };

    const result = await updateRecord('storicoPaghe', pagaId, {
      bonifici: [...(paga.bonifici || []), nuovoBonifico]
    });

    if (result.success) {
      setPagaSelezionata(result.data);
      alert('✅ Bonifico aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ RIMUOVI BONIFICO
  const rimuoviBonifico = async (pagaId, bonificoId) => {
    const paga = storicoPaghe.find(p => p.id === pagaId);
    if (!paga) return;

    const result = await updateRecord('storicoPaghe', pagaId, {
      bonifici: (paga.bonifici || []).filter(b => b.id !== bonificoId)
    });

    if (result.success) {
      setPagaSelezionata(result.data);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con filtri */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ 
                mese: new Date().getMonth() + 1,
                anno: new Date().getFullYear(),
                tipologia: 'stipendio',
                bonifici: []
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Nuova Paga
          </button>
          
          {pagheFiltrate.length > 0 && (
            <button 
              onClick={exportPDF}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              📄 Esporta PDF
            </button>
          )}
        </div>

        <select 
          className="border rounded px-3 py-2"
          value={filtroLavoratore}
          onChange={(e) => setFiltroLavoratore(e.target.value)}
        >
          <option value="">Tutti i lavoratori</option>
          {lavoratori.map(l => (
            <option key={l.id} value={l.id}>{l.cognome} {l.nome}</option>
          ))}
        </select>
      </div>

      {/* Riepilogo Lavoratore */}
      {riepilogoLavoratore && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale Importi</div>
            <div className="text-2xl font-bold text-blue-900">
              € {riepilogoLavoratore.totaleImporti.toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Totale Bonificato</div>
            <div className="text-2xl font-bold text-green-900">
              € {riepilogoLavoratore.totaleBonificato.toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Residuo</div>
            <div className="text-2xl font-bold text-orange-900">
              € {riepilogoLavoratore.residuo.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Form Nuova Paga */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Paga
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dipendente *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.lavoratoreId || ''}
                onChange={(e) => setFormData({...formData, lavoratoreId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona dipendente</option>
                {lavoratori.map(l => (
                  <option key={l.id} value={l.id}>{l.cognome} {l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipologia *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.tipologia || 'stipendio'}
                onChange={(e) => setFormData({...formData, tipologia: e.target.value})}
                disabled={saving}
              >
                {tipologie.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mese *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.mese || new Date().getMonth() + 1}
                onChange={(e) => setFormData({...formData, mese: parseInt(e.target.value)})}
                disabled={saving}
              >
                {mesiNomi.map((nome, idx) => (
                  <option key={idx} value={idx + 1}>{nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anno *</label>
              <input 
                type="number" 
                className="border rounded px-3 py-2 w-full"
                value={formData.anno || new Date().getFullYear()}
                onChange={(e) => setFormData({...formData, anno: parseInt(e.target.value)})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo * (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={formData.importo || ''}
                onChange={(e) => setFormData({...formData, importo: e.target.value})}
                disabled={saving}
              />
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
            <div className="col-span-2 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">Importo Totale</div>
                  <div className="text-2xl font-bold text-blue-600">
                    € {parseFloat(formData.importo || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Bonificato</div>
                  <div className="text-xl font-bold text-green-600">
                    € {calcolaBonificato(formData).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Residuo</div>
                  <div className="text-xl font-bold text-orange-600">
                    € {(parseFloat(formData.importo || 0) - calcolaBonificato(formData)).toFixed(2)}
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
                setFormData({ 
                  mese: new Date().getMonth() + 1,
                  anno: new Date().getFullYear(),
                  tipologia: 'stipendio',
                  bonifici: []
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

      {/* Tabella Paghe */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Dipendente</th>
              <th className="px-3 py-2 text-left">Periodo</th>
              <th className="px-3 py-2 text-left">Tipologia</th>
              <th className="px-3 py-2 text-left">Cantiere</th>
              <th className="px-3 py-2 text-right">Importo</th>
              <th className="px-3 py-2 text-right">Bonificato</th>
              <th className="px-3 py-2 text-right">Residuo</th>
              <th className="px-3 py-2 text-left">Note</th>
              <th className="px-3 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pagheFiltrate.map(paga => {
              const lavoratore = lavoratori.find(l => l.id === paga.lavoratore_id);
              const cantiere = cantieri.find(c => c.id === paga.cantiere_id);
              const tipologia = tipologie.find(t => t.value === paga.tipologia);
              const bonificato = calcolaBonificato(paga);
              const residuo = calcolaResiduo(paga);

              return (
                <tr key={paga.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold">
                    {lavoratore ? `${lavoratore.nome} ${lavoratore.cognome}` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{mesiNomi[paga.mese - 1]} {paga.anno}</div>
                    {cantiere && (
                      <div className="text-xs text-blue-600 mt-1">
                        📍 {cantiere.nome}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{tipologia?.label || paga.tipologia}</td>
                  <td className="px-3 py-2">{cantiere?.nome || '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">€ {parseFloat(paga.importo).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-green-700 font-mono">€ {bonificato.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-orange-700 font-mono">
                    € {residuo.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 italic text-xs">
                    {paga.note || '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => {
                        setPagaSelezionata(paga);
                        setShowBonificiModal(true);
                      }} 
                      className="text-green-600 mr-2" 
                      title="Gestisci Bonifici"
                    >
                      💰
                    </button>
                    <button 
                      onClick={() => handleEdit(paga)} 
                      className="text-blue-600 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(paga)} 
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
        {pagheFiltrate.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">💼</p>
            <p>Nessuna paga registrata</p>
            <p className="text-sm mt-2 text-gray-400">Clicca su "➕ Nuova Paga" per iniziare</p>
          </div>
        )}
      </div>

      {/* Modal Bonifici */}
      {showBonificiModal && pagaSelezionata && (
        <BonificiModal
          paga={pagaSelezionata}
          lavoratori={lavoratori}
          mesiNomi={mesiNomi}
          onClose={() => {
            setShowBonificiModal(false);
            setPagaSelezionata(null);
          }}
          aggiungiBonifico={aggiungiBonifico}
          rimuoviBonifico={rimuoviBonifico}
          formatDate={formatDate}
          calcolaBonificato={calcolaBonificato}
        />
      )}
    </div>
  );
}

function BonificiModal({ paga, lavoratori, mesiNomi, onClose, aggiungiBonifico, rimuoviBonifico, formatDate, calcolaBonificato }) {
  const [importoBonifico, setImportoBonifico] = useState('');
  const [dataBonifico, setDataBonifico] = useState(new Date().toISOString().split('T')[0]);

  const lavoratore = lavoratori.find(l => l.id === paga.lavoratore_id);
  const totale = parseFloat(paga.importo || 0);
  const bonificato = calcolaBonificato(paga);
  const residuo = totale - bonificato;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          💰 Bonifici - {lavoratore?.nome} {lavoratore?.cognome} - {mesiNomi[paga.mese - 1]} {paga.anno}
        </h3>

        {/* Riepilogo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-700">Importo Totale</div>
            <div className="text-xl font-bold">€ {totale.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-700">Bonificato</div>
            <div className="text-xl font-bold">€ {bonificato.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-sm text-orange-700">Residuo</div>
            <div className="text-xl font-bold">€ {residuo.toFixed(2)}</div>
          </div>
        </div>

        {/* Form Nuovo Bonifico */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold mb-3">Registra Nuovo Bonifico</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Importo (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={importoBonifico}
                onChange={(e) => setImportoBonifico(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Data Bonifico</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={dataBonifico}
                onChange={(e) => setDataBonifico(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {
                  if (!importoBonifico || parseFloat(importoBonifico) <= 0) {
                    return alert('⚠️ Inserisci un importo valido');
                  }
                  aggiungiBonifico(paga.id, importoBonifico, dataBonifico);
                  setImportoBonifico('');
                  setDataBonifico(new Date().toISOString().split('T')[0]);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                ➕ Aggiungi
              </button>
            </div>
          </div>
        </div>

        {/* Lista Bonifici */}
        <div>
          <h4 className="font-semibold mb-3">Bonifici Registrati</h4>
          {(paga.bonifici || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6 bg-gray-50 rounded">
              Nessun bonifico registrato
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Data Bonifico</th>
                  <th className="px-3 py-2 text-right">Importo</th>
                  <th className="px-3 py-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paga.bonifici.map(bon => (
                  <tr key={bon.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(bon.dataBonifico)}</td>
                    <td className="px-3 py-2 text-right font-semibold">€ {parseFloat(bon.importo).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => {
                          if (confirm('Eliminare questo bonifico?')) {
                            rimuoviBonifico(paga.id, bon.id);
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

export default StoricoPaghe;