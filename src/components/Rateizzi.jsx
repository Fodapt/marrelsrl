import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function Rateizzi() {
  const {
    rateizzi = [],
    noteRateizzi = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', rate: [] });
  const [saving, setSaving] = useState(false);
  const [rateizziEspansi, setRateizziEspansi] = useState({});
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [rateizzoSelezionato, setRateizzoSelezionato] = useState(null);
  const [rataSelezionata, setRataSelezionata] = useState(null);
  const [notaCorrente, setNotaCorrente] = useState('');
  const [modificheTemporanee, setModificheTemporanee] = useState({});

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calcolaStato = (rata) => {
    if (rata.dataPagamento && rata.dataPagamento !== '') return 'pagato';
    const oggi = new Date();
    const scadenza = new Date(rata.dataScadenza);
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    if (giorniMancanti < 0) return 'scaduto';
    if (giorniMancanti <= 7 && giorniMancanti >= 0) return 'in_scadenza';
    return 'da_pagare';
  };

  const aggiornaStatiRate = (rateizzo) => {
  return {
    ...rateizzo,
    rate: (rateizzo.rate || []).map(rata => ({
      ...rata,
      stato: calcolaStato(rata)
    }))
  };
};

  const calcolaRiepilogo = (rateizzo) => {
  // ✅ Controllo sicurezza: rate potrebbe essere undefined o null
  const rate = rateizzo.rate || [];
  
  const totale = rate.reduce((sum, r) => sum + parseFloat(r.importo || 0), 0);
  const pagato = rate.filter(r => r.stato === 'pagato').reduce((sum, r) => sum + parseFloat(r.importo || 0), 0);
  const rimanente = totale - pagato;
  return { totale, pagato, rimanente };
};

  const riepilogoTotale = useMemo(() => {
    let totaleComplessivo = 0;
    let pagatoComplessivo = 0;
    
    rateizzi.forEach(rateizzo => {
      const riepilogo = calcolaRiepilogo(rateizzo);
      totaleComplessivo += riepilogo.totale;
      pagatoComplessivo += riepilogo.pagato;
    });
    
    const rimanenteComplessivo = totaleComplessivo - pagatoComplessivo;
    
    return { 
      totale: totaleComplessivo, 
      pagato: pagatoComplessivo, 
      rimanente: rimanenteComplessivo,
      numeroRateizzi: rateizzi.length
    };
  }, [rateizzi]);

  // ✅ MOSTRA LOADING
  if (loading.rateizzi || loading.noteRateizzi) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento rateizzi...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA RATEIZZO
  const handleSave = async () => {
    if (!formData.nome || (formData.rate || []).length === 0) {
      return alert('⚠️ Compila tutti i campi:\n- Nome Rateizzo\n- Almeno una rata');
    }

    setSaving(true);

    const dataForSupabase = {
      nome: formData.nome,
      rate: (formData.rate || []).map(r => ({
        ...r,
        stato: r.stato || 'da_pagare',
        dataPagamento: r.dataPagamento || ''
      }))
    };

    let result;
    if (editingId) {
      result = await updateRecord('rateizzi', editingId, dataForSupabase);
    } else {
      result = await addRecord('rateizzi', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Rateizzo aggiornato!' : '✅ Rateizzo creato!');
      setShowForm(false);
      setFormData({ nome: '', rate: [] });
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA RATEIZZO
  const handleDelete = async (rateizzo) => {
    if (!confirm(`❌ Eliminare il rateizzo ${rateizzo.nome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('rateizzi', rateizzo.id);

    if (result.success) {
      alert('✅ Rateizzo eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT RATEIZZO
  const handleEdit = (rateizzo) => {
    const rateConStato = {
      ...rateizzo,
      rate: (rateizzo.rate || []).map(r => ({
        ...r,
        stato: r.stato || 'da_pagare'
      }))
    };
    setFormData(rateConStato);
    setEditingId(rateizzo.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ AGGIORNA RATA
  const aggiornaRata = async (rateizzoId, rataId, updates) => {
    const rateizzo = rateizzi.find(r => r.id === rateizzoId);
    if (!rateizzo) return;

    const result = await updateRecord('rateizzi', rateizzoId, {
      rate: rateizzo.rate.map(rt => 
        rt.id === rataId 
          ? { ...rt, ...updates }
          : rt
      )
    });

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ GESTIONE NOTE
  const getNota = (rateizzoId, rataId) => {
    const nota = noteRateizzi.find(n => 
      n.rateizzo_id === rateizzoId && n.rata_id === rataId
    );
    return nota?.nota || '';
  };

  const apriModalNota = (rateizzoId, rataId) => {
    const notaEsistente = noteRateizzi.find(n => 
      n.rateizzo_id === rateizzoId && n.rata_id === rataId
    );
    setRateizzoSelezionato(rateizzoId);
    setRataSelezionata(rataId);
    setNotaCorrente(notaEsistente?.nota || '');
    setShowNotaModal(true);
  };

  const salvaNota = async () => {
    const notaEsistente = noteRateizzi.find(n => 
      n.rateizzo_id === rateizzoSelezionato && n.rata_id === rataSelezionata
    );

    if (notaCorrente.trim() === '') {
      // Elimina nota se vuota
      if (notaEsistente) {
        await deleteRecord('noteRateizzi', notaEsistente.id);
      }
    } else if (notaEsistente) {
      // Aggiorna nota esistente
      await updateRecord('noteRateizzi', notaEsistente.id, {
        nota: notaCorrente
      });
    } else {
      // Crea nuova nota
      await addRecord('noteRateizzi', {
        rateizzo_id: rateizzoSelezionato,
        rata_id: rataSelezionata,
        nota: notaCorrente
      });
    }

    setShowNotaModal(false);
    setRateizzoSelezionato(null);
    setRataSelezionata(null);
    setNotaCorrente('');
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ nome: '', rate: [] });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ➕ Nuovo Rateizzo
      </button>

      {/* Riepilogo Totale */}
      {rateizzi.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-lg border-2 border-blue-300">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📊 Riepilogo Complessivo Rateizzi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Numero Rateizzi</div>
              <div className="text-2xl font-bold text-blue-900">{riepilogoTotale.numeroRateizzi}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-blue-700 mb-1">Totale Complessivo</div>
              <div className="text-2xl font-bold text-blue-900">€ {riepilogoTotale.totale.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-green-700 mb-1">Totale Pagato</div>
              <div className="text-2xl font-bold text-green-900">€ {riepilogoTotale.pagato.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-orange-700 mb-1">Totale Rimanente</div>
              <div className="text-2xl font-bold text-orange-900">€ {riepilogoTotale.rimanente.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Modifica' : '➕ Nuovo'} Rateizzo</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome Rateizzo *</label>
              <input 
                type="text" 
                placeholder="es: Fornitore XYZ - Fornitura materiali" 
                className="border rounded px-3 py-2 w-full"
                value={formData.nome || ''} 
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Numero Rate</label>
                <input 
                  type="number" 
                  placeholder="es: 12" 
                  className="border rounded px-3 py-2 w-full"
                  value={formData.numeroRate || ''} 
                  onChange={(e) => setFormData({...formData, numeroRate: e.target.value})}
                  disabled={saving}
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    const num = parseInt(formData.numeroRate || 0);
                    if (num > 0) {
                      const nuoveRate = Array.from({length: num}, (_, i) => ({
                        id: `r${Date.now()}_${i}`,
                        numeroRata: i + 1,
                        dataScadenza: '',
                        importo: '',
                        stato: 'da_pagare',
                        dataPagamento: ''
                      }));
                      setFormData({...formData, rate: nuoveRate});
                    }
                  }} 
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
                  disabled={saving}
                >
                  🔄 Genera Rate
                </button>
              </div>
            </div>

            {(formData.rate || []).length > 0 && (
              <div className="border rounded p-4 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-3">Rate generate ({formData.rate.length}):</h4>
                <div className="space-y-3">
                  {formData.rate.map((rata, idx) => (
                    <div key={rata.id} className="border rounded p-3 bg-gray-50">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="font-semibold self-center">Rata {rata.numeroRata}</div>
                        <div>
                          <label className="block text-xs mb-1">Scadenza</label>
                          <input 
                            type="date" 
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={rata.dataScadenza}
                            onChange={(e) => {
                              const newRate = [...formData.rate];
                              newRate[idx].dataScadenza = e.target.value;
                              setFormData({...formData, rate: newRate});
                            }} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Importo €</label>
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={rata.importo}
                            onChange={(e) => {
                              const newRate = [...formData.rate];
                              newRate[idx].importo = e.target.value;
                              setFormData({...formData, rate: newRate});
                            }} 
                          />
                        </div>
                        <div className="self-center text-center">
                          <button 
                            onClick={() => {
                              const newRate = formData.rate.filter((_, i) => i !== idx);
                              setFormData({...formData, rate: newRate});
                            }} 
                            className="text-red-600 text-xl hover:text-red-700"
                            title="Elimina rata"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                setFormData({ nome: '', rate: [] });
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

      {/* Lista Rateizzi */}
      <div className="space-y-4">
        {rateizzi.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-gray-500">Nessun rateizzo registrato</p>
            <p className="text-sm text-gray-400 mt-2">Clicca su "➕ Nuovo Rateizzo" per iniziare</p>
          </div>
        ) : (
          rateizzi.map(rateizzo => {
            const rateizzoAggiornato = aggiornaStatiRate(rateizzo);
            const riepilogo = calcolaRiepilogo(rateizzoAggiornato);
            
            return (
              <div key={rateizzo.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setRateizziEspansi({
                        ...rateizziEspansi, 
                        [rateizzo.id]: !rateizziEspansi[rateizzo.id]
                      })}
                      className="text-2xl text-blue-600 hover:text-blue-700"
                    >
                      {rateizziEspansi[rateizzo.id] ? '▼' : '▶'}
                    </button>
                    <h3 className="text-xl font-bold text-blue-600">{rateizzo.nome}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(rateizzo)} 
                      className="text-blue-600 text-xl"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(rateizzo)} 
                      className="text-red-600 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700 mb-1">Totale Rateizzo</div>
                    <div className="text-2xl font-bold text-blue-900">€ {riepilogo.totale.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 mb-1">Pagato</div>
                    <div className="text-2xl font-bold text-green-900">€ {riepilogo.pagato.toFixed(2)}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-700 mb-1">Rimanente</div>
                    <div className="text-2xl font-bold text-orange-900">€ {riepilogo.rimanente.toFixed(2)}</div>
                  </div>
                </div>

                {rateizziEspansi[rateizzo.id] && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm">Rata</th>
                          <th className="px-4 py-3 text-left text-sm">Scadenza</th>
                          <th className="px-4 py-3 text-left text-sm">Importo</th>
                          <th className="px-4 py-3 text-left text-sm">Stato</th>
                          <th className="px-4 py-3 text-left text-sm">Data Pagamento</th>
                          <th className="px-4 py-3 text-center text-sm">Note</th>
                          <th className="px-4 py-3 text-left text-sm">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateizzoAggiornato.rate.map((rata) => {
                          const statoColors = {
                            'da_pagare': 'bg-gray-100 text-gray-700',
                            'in_scadenza': 'bg-yellow-100 text-yellow-700',
                            'scaduto': 'bg-red-100 text-red-700',
                            'pagato': 'bg-green-100 text-green-700'
                          };
                          const statoLabels = {
                            'da_pagare': 'Da Pagare',
                            'in_scadenza': 'In Scadenza',
                            'scaduto': 'Scaduto',
                            'pagato': 'Pagato'
                          };
                          
                          return (
                            <tr key={rata.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium">Rata {rata.numeroRata}</td>
                              <td className="px-4 py-3 text-sm">{formatDate(rata.dataScadenza)}</td>
                              <td className="px-4 py-3 text-sm font-mono">€ {parseFloat(rata.importo || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${statoColors[rata.stato]}`}>
                                  {statoLabels[rata.stato]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
  {rata.stato === 'pagato' ? (
    <span>{formatDate(rata.dataPagamento)}</span>
  ) : (
    <div className="flex gap-2 items-center">
      <input 
        type="date" 
        className="border rounded px-2 py-1 text-sm"
        value={modificheTemporanee[`${rateizzo.id}-${rata.id}`] || rata.dataPagamento || ''}
        onChange={(e) => {
          setModificheTemporanee({
            ...modificheTemporanee,
            [`${rateizzo.id}-${rata.id}`]: e.target.value
          });
        }} 
      />
      {modificheTemporanee[`${rateizzo.id}-${rata.id}`] && (
        <button
          onClick={() => {
            aggiornaRata(rateizzo.id, rata.id, {
              dataPagamento: modificheTemporanee[`${rateizzo.id}-${rata.id}`],
              stato: 'pagato'
            });
            setModificheTemporanee({
              ...modificheTemporanee,
              [`${rateizzo.id}-${rata.id}`]: undefined
            });
          }}
          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
          title="Conferma pagamento"
        >
          ✓
        </button>
      )}
    </div>
  )}
</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => apriModalNota(rateizzo.id, rata.id)}
                                  className={`text-sm px-2 py-1 rounded ${
                                    getNota(rateizzo.id, rata.id) 
                                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  title={getNota(rateizzo.id, rata.id) || 'Aggiungi nota'}
                                >
                                  📝 {getNota(rateizzo.id, rata.id) && '✓'}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rata.stato === 'pagato' && (
                                  <button 
                                    onClick={() => {
                                      aggiornaRata(rateizzo.id, rata.id, {
                                        dataPagamento: '',
                                        stato: 'da_pagare'
                                      });
                                    }} 
                                    className="text-orange-600 hover:text-orange-700" 
                                    title="Annulla pagamento"
                                  >
                                    ↩️
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nota */}
      {showNotaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold mb-4">📝 Nota per Rata</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nota</label>
              <textarea 
                className="border rounded px-3 py-2 w-full" 
                rows="6"
                value={notaCorrente}
                onChange={(e) => setNotaCorrente(e.target.value)}
                placeholder="Es: Importo modificato da €500 a €450 per accordi con fornitore del 15/01/2025..."
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Usa questo campo per annotare variazioni di importo, accordi speciali o altre note importanti
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={salvaNota}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ✓ Salva Nota
              </button>
              <button 
                onClick={() => {
                  setShowNotaModal(false);
                  setRateizzoSelezionato(null);
                  setRataSelezionata(null);
                  setNotaCorrente('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rateizzi;