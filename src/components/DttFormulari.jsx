import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { exportDTTFormulariPDF } from '../utils/exports/exportDTTFormulariPDF';

function DttFormulari() {
  const {
    dttFormulari = [],
    fornitori = [],
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
  const [showDocumentiModal, setShowDocumentiModal] = useState(false);
  const [fatturaSelezionata, setFatturaSelezionata] = useState(null);
  const [filtroFornitore, setFiltroFornitore] = useState('');
  const [filtroStato, setFiltroStato] = useState('');
  const [fattureEspanse, setFattureEspanse] = useState({});

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calcolaStatoFattura = (fattura) => {
    const documenti = fattura.documenti || [];
    if (documenti.length === 0) return { label: 'Nessun documento', color: 'bg-gray-100 text-gray-700', mancanti: 0, totale: 0 };
    
    const mancanti = documenti.filter(d => !d.ricevuto).length;
    const totale = documenti.length;
    
    if (mancanti === 0) return { label: 'Completo', color: 'bg-green-100 text-green-700', mancanti, totale };
    if (mancanti === totale) return { label: 'Tutto mancante', color: 'bg-red-100 text-red-700', mancanti, totale };
    return { label: `${mancanti}/${totale} mancanti`, color: 'bg-orange-100 text-orange-700', mancanti, totale };
  };

  const fattureFiltrate = useMemo(() => {
    return dttFormulari.filter(f => {
      if (filtroFornitore && f.fornitore_id !== filtroFornitore) return false;
      if (filtroStato) {
        const stato = calcolaStatoFattura(f);
        if (filtroStato === 'completo' && stato.mancanti > 0) return false;
        if (filtroStato === 'mancante' && stato.mancanti === 0) return false;
      }
      return true;
    }).sort((a, b) => {
      const numA = a.numero_fattura || '';
      const numB = b.numero_fattura || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [dttFormulari, filtroFornitore, filtroStato]);

  const riepilogo = useMemo(() => {
    const totaleFatture = fattureFiltrate.length;
    let totaleDocumenti = 0;
    let totaleRicevuti = 0;
    let totaleMancanti = 0;
    let totaleDTT = 0;
    let totaleFormulari = 0;

    fattureFiltrate.forEach(f => {
      (f.documenti || []).forEach(d => {
        totaleDocumenti++;
        if (d.ricevuto) totaleRicevuti++;
        else totaleMancanti++;
        if (d.tipo === 'dtt') totaleDTT++;
        if (d.tipo === 'formulario') totaleFormulari++;
      });
    });

    return { totaleFatture, totaleDocumenti, totaleRicevuti, totaleMancanti, totaleDTT, totaleFormulari };
  }, [fattureFiltrate]);

  // ✅ MOSTRA LOADING
  if (loading.dttFormulari || loading.fornitori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento DTT/Formulari...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA FATTURA
  const handleSave = async () => {
    if (!formData.numeroFattura || !formData.dataFattura || !formData.fornitoreId) {
      return alert('⚠️ Compila tutti i campi obbligatori:\n- Numero Fattura\n- Data Fattura\n- Fornitore');
    }

    setSaving(true);

    const dataForSupabase = {
      numero_fattura: formData.numeroFattura,
      data_fattura: formData.dataFattura,
      fornitore_id: formData.fornitoreId,
      cantiere_id: formData.cantiereId || null,
      documenti: formData.documenti || [],
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('dttFormulari', editingId, dataForSupabase);
    } else {
      result = await addRecord('dttFormulari', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Fattura aggiornata!' : '✅ Fattura creata!');
      setShowForm(false);
      setFormData({ documenti: [] });
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

    const result = await deleteRecord('dttFormulari', fattura.id);

    if (result.success) {
      alert('✅ Fattura eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT FATTURA
  const handleEdit = (fattura) => {
    setFormData({
      numeroFattura: fattura.numero_fattura,
      dataFattura: fattura.data_fattura,
      fornitoreId: fattura.fornitore_id,
      cantiereId: fattura.cantiere_id,
      documenti: fattura.documenti || [],
      note: fattura.note
    });
    setEditingId(fattura.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ CONFERMA RICEZIONE
  const confermaRicezione = async (fatturaId, documentoId) => {
    const fattura = dttFormulari.find(f => f.id === fatturaId);
    if (!fattura) return;

    const result = await updateRecord('dttFormulari', fatturaId, {
      documenti: fattura.documenti.map(d => 
        d.id === documentoId 
          ? { ...d, ricevuto: true, dataRicezione: new Date().toISOString().split('T')[0] }
          : d
      )
    });

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ANNULLA RICEZIONE
  const annullaRicezione = async (fatturaId, documentoId) => {
    const fattura = dttFormulari.find(f => f.id === fatturaId);
    if (!fattura) return;

    const result = await updateRecord('dttFormulari', fatturaId, {
      documenti: fattura.documenti.map(d => 
        d.id === documentoId 
          ? { ...d, ricevuto: false, dataRicezione: '' }
          : d
      )
    });

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA DOCUMENTO
  const eliminaDocumento = async (fatturaId, documentoId) => {
    if (!confirm('❌ Eliminare questo documento?')) return;

    const fattura = dttFormulari.find(f => f.id === fatturaId);
    if (!fattura) return;

    const result = await updateRecord('dttFormulari', fatturaId, {
      documenti: fattura.documenti.filter(d => d.id !== documentoId)
    });

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };
  // ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportDTTFormulariPDF({
      dttFormulari: fattureFiltrate,
      fornitori,
      cantieri
    });
  };
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">DTT / Formulari</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ documenti: [] });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Nuova Fattura
          </button>
          <button 
            onClick={esportaPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            📄 Esporta PDF
          </button>
        </div>
      </div>
      {/* Filtri */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">🔍 Filtri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Fornitore</label>
            <select 
              className="border rounded px-3 py-2 w-full"
              value={filtroFornitore}
              onChange={(e) => setFiltroFornitore(e.target.value)}
            >
              <option value="">Tutti i fornitori</option>
              {fornitori.map(f => (
                <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stato</label>
            <select 
              className="border rounded px-3 py-2 w-full"
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
            >
              <option value="">Tutti gli stati</option>
              <option value="mancante">⚠️ Con documenti mancanti</option>
              <option value="completo">✅ Completi</option>
            </select>
          </div>
        </div>
        {(filtroFornitore || filtroStato) && (
          <button 
            onClick={() => {
              setFiltroFornitore('');
              setFiltroStato('');
            }} 
            className="mt-3 text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ✕ Reset Filtri
          </button>
        )}
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Fatture</div>
          <div className="text-2xl font-bold text-blue-900">{riepilogo.totaleFatture}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-700 mb-1">Tot. Documenti</div>
          <div className="text-2xl font-bold text-purple-900">{riepilogo.totaleDocumenti}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-700 mb-1">⚠️ Mancanti</div>
          <div className="text-2xl font-bold text-red-900">{riepilogo.totaleMancanti}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-700 mb-1">✅ Ricevuti</div>
          <div className="text-2xl font-bold text-green-900">{riepilogo.totaleRicevuti}</div>
        </div>
        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
          <div className="text-sm text-cyan-700 mb-1">🚛 DTT</div>
          <div className="text-2xl font-bold text-cyan-900">{riepilogo.totaleDTT}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-700 mb-1">♻️ Formulari</div>
          <div className="text-2xl font-bold text-orange-900">{riepilogo.totaleFormulari}</div>
        </div>
      </div>

      {/* Form Nuova Fattura */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Fattura
          </h3>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Fornitore *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.fornitoreId || ''}
                onChange={(e) => setFormData({...formData, fornitoreId: e.target.value})}
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
                setFormData({ documenti: [] });
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

      {/* Lista Fatture */}
      <div className="space-y-4">
        {fattureFiltrate.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-500">Nessuna fattura registrata</p>
            <p className="text-sm text-gray-400 mt-2">Clicca su "➕ Nuova Fattura" per iniziare</p>
          </div>
        ) : (
          fattureFiltrate.map(fattura => {
            const fornitore = fornitori.find(f => f.id === fattura.fornitore_id);
            const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
            const stato = calcolaStatoFattura(fattura);

            return (
              <div key={fattura.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {(fattura.documenti || []).length > 0 && (
                      <button 
                        onClick={() => setFattureEspanse({
                          ...fattureEspanse, 
                          [fattura.id]: !fattureEspanse[fattura.id]
                        })}
                        className="text-2xl text-blue-600 hover:text-blue-700 transition-transform"
                        style={{ transform: fattureEspanse[fattura.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        ▶
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-blue-600">
                          Fattura {fattura.numero_fattura}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stato.color}`}>
                          {stato.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{fornitore?.ragione_sociale || '-'}</span>
                        {cantiere && <span> • {cantiere.nome}</span>}
                        <span> • {formatDate(fattura.data_fattura)}</span>
                        {(fattura.documenti || []).length > 0 && !fattureEspanse[fattura.id] && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {stato.mancanti > 0 
                              ? `${stato.mancanti} doc. mancanti` 
                              : `${stato.totale} doc. completi`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setFatturaSelezionata(fattura);
                        setShowDocumentiModal(true);
                      }}
                      className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      📋 Gestisci Documenti
                    </button>
                    <button 
                      onClick={() => handleEdit(fattura)} 
                      className="text-blue-600 text-xl"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(fattura)} 
                      className="text-red-600 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Lista documenti */}
                {(fattura.documenti || []).length > 0 && fattureEspanse[fattura.id] && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 text-sm">Documenti richiesti:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {fattura.documenti.map(doc => (
                        <div key={doc.id} className={`flex items-center justify-between p-3 rounded border ${
                          doc.ricevuto ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {doc.tipo === 'dtt' ? '🚛' : doc.tipo === 'formulario' ? '♻️' : '📄'}
                            </span>
                            <div>
                              <div className="font-medium text-sm">
                                {doc.descrizione || doc.numeroDocumento || 'Documento senza descrizione'}
                              </div>
                              {doc.numeroDocumento && doc.descrizione && (
                                <div className="text-xs text-gray-600 font-mono">{doc.numeroDocumento}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.ricevuto ? (
                              <>
                                <span className="text-xs text-green-700 font-semibold">
                                  ✅ {formatDate(doc.dataRicezione)}
                                </span>
                                <button 
                                  onClick={() => annullaRicezione(fattura.id, doc.id)}
                                  className="text-orange-600 hover:text-orange-700 text-sm"
                                  title="Annulla ricezione"
                                >
                                  ↩️
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => confermaRicezione(fattura.id, doc.id)}
                                className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                                title="Conferma ricezione"
                              >
                                📥 Conferma ricezione
                              </button>
                            )}
                            <button 
                              onClick={() => eliminaDocumento(fattura.id, doc.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Elimina documento"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fattura.note && (
                  <div className="mt-4 bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                    <p className="text-sm text-gray-700"><strong>📝 Note:</strong> {fattura.note}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Gestione Documenti */}
      {showDocumentiModal && fatturaSelezionata && (
        <DocumentiModal
          fattura={fatturaSelezionata}
          onClose={() => {
            setShowDocumentiModal(false);
            setFatturaSelezionata(null);
          }}
          updateRecord={updateRecord}
        />
      )}
    </div>
  );
}

function DocumentiModal({ fattura, onClose, updateRecord }) {
  const [tipoDocumento, setTipoDocumento] = useState('dtt');
  const [descrizione, setDescrizione] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  const tipiDocumento = [
    { value: 'dtt', label: '🚛 DTT (Documento Trasporto)' },
    { value: 'formulario', label: '♻️ Formulario Rifiuti' },
    { value: 'altro', label: '📄 Altro Documento' }
  ];

  const aggiungiDocumento = async () => {
    const nuovoDocumento = {
      id: Date.now().toString(),
      tipo: tipoDocumento,
      descrizione,
      numeroDocumento,
      ricevuto: false,
      dataRicezione: ''
    };

    const result = await updateRecord('dttFormulari', fattura.id, {
      documenti: [...(fattura.documenti || []), nuovoDocumento]
    });

    if (result.success) {
      setDescrizione('');
      setNumeroDocumento('');
      alert('✅ Documento aggiunto!');
      // Aggiorna la fattura locale
      fattura.documenti = result.data.documenti;
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const rimuoviDocumento = async (docId) => {
    if (!confirm('Eliminare questo documento?')) return;

    const result = await updateRecord('dttFormulari', fattura.id, {
      documenti: fattura.documenti.filter(d => d.id !== docId)
    });

    if (result.success) {
      fattura.documenti = result.data.documenti;
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          📋 Gestione Documenti - Fattura {fattura.numero_fattura}
        </h3>

        {/* Form Aggiungi Documento */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <h4 className="font-medium mb-3 text-blue-900">➕ Aggiungi Documento</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <select 
              className="border rounded px-3 py-2 bg-white"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
            >
              {tipiDocumento.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input 
              type="text" 
              className="border rounded px-3 py-2 col-span-2"
              placeholder="Descrizione documento (opzionale)"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input 
              type="text" 
              className="border rounded px-3 py-2 col-span-2"
              placeholder="Numero documento (opzionale)"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)} 
            />
            <button 
              onClick={aggiungiDocumento}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ➕ Aggiungi
            </button>
          </div>
        </div>

        {/* Lista Documenti */}
        <div>
          <h4 className="font-semibold mb-3">Documenti Registrati ({(fattura.documenti || []).length})</h4>
          {(fattura.documenti || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nessun documento registrato. Usa il form sopra per aggiungere documenti.
            </p>
          ) : (
            <div className="space-y-2">
              {fattura.documenti.map(doc => {
                const tipo = tipiDocumento.find(t => t.value === doc.tipo);
                return (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded border ${
                    doc.ricevuto ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xl">{tipo?.label.split(' ')[0]}</span>
                      <div className="flex-1">
                        <div className="font-medium">
                          {doc.descrizione || doc.numeroDocumento || 'Documento senza descrizione'}
                        </div>
                        {doc.numeroDocumento && doc.descrizione && (
                          <div className="text-xs text-gray-600 font-mono">{doc.numeroDocumento}</div>
                        )}
                      </div>
                      {doc.ricevuto && (
                        <span className="text-xs text-green-700 font-semibold">
                          ✅ Ricevuto
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => rimuoviDocumento(doc.id)}
                      className="text-red-600 hover:text-red-700 ml-3"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
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

export default DttFormulari;