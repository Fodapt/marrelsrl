import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function SAL() {
  const {
    sal = [],
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
  const [filtroCantiere, setFiltroCantiere] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const salFiltrati = useMemo(() => {
    return sal.filter(s => {
      if (filtroCantiere && s.cantiere_id !== filtroCantiere) return false;
      return true;
    }).sort((a, b) => new Date(b.data_sal) - new Date(a.data_sal));
  }, [sal, filtroCantiere]);

  const riepilogoCantiere = useMemo(() => {
    if (!filtroCantiere) return null;

    const salCantiere = sal.filter(s => s.cantiere_id === filtroCantiere);
    const totaleImporto = salCantiere.reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0);
    const numeroSAL = salCantiere.length;
    
    const cantiere = cantieri.find(c => c.id === filtroCantiere);
    const importoLavori = cantiere ? parseFloat(cantiere.importo_lavori) || 0 : 0;
    const percentualeAvanzamento = importoLavori > 0 ? ((totaleImporto / importoLavori) * 100).toFixed(2) : 0;
    const rimanente = importoLavori - totaleImporto;

    return { totaleImporto, numeroSAL, percentualeAvanzamento, importoLavori, rimanente };
  }, [sal, filtroCantiere, cantieri]);

  // ✅ MOSTRA LOADING
  if (loading.sal || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento SAL...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA SAL
  const handleSave = async () => {
    if (!formData.cantiereId || !formData.numeroSAL || !formData.dataSAL || !formData.importo || !formData.stato) {
      return alert('⚠️ Compila tutti i campi obbligatori:\n- Cantiere\n- Numero SAL\n- Data\n- Importo\n- Stato');
    }

    setSaving(true);

    const dataForSupabase = {
      cantiere_id: formData.cantiereId,
      numero_sal: formData.numeroSAL,
      data_sal: formData.dataSAL,
      importo: parseFloat(formData.importo),
      percentuale: parseFloat(formData.percentuale || 0),
      stato: formData.stato,
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('sal', editingId, dataForSupabase);
    } else {
      result = await addRecord('sal', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ SAL aggiornato!' : '✅ SAL creato!');
      setShowForm(false);
      setFormData({});
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA SAL
  const handleDelete = async (s) => {
    if (!confirm(`❌ Eliminare il SAL n. ${s.numero_sal}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('sal', s.id);

    if (result.success) {
      alert('✅ SAL eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT SAL
  const handleEdit = (s) => {
    setFormData({
      cantiereId: s.cantiere_id,
      numeroSAL: s.numero_sal,
      dataSAL: s.data_sal,
      importo: s.importo,
      percentuale: s.percentuale,
      stato: s.stato,
      note: s.note
    });
    setEditingId(s.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({});
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Nuovo SAL
        </button>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Filtra per Cantiere:</label>
          <select 
            className="border rounded px-3 py-2"
            value={filtroCantiere}
            onChange={(e) => setFiltroCantiere(e.target.value)}
          >
            <option value="">Tutti i cantieri</option>
            {cantieri.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {filtroCantiere && (
            <button 
              onClick={() => setFiltroCantiere('')}
              className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Riepilogo Cantiere */}
      {riepilogoCantiere && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg shadow-lg border-2 border-green-300">
          <h3 className="text-lg font-bold text-green-900 mb-4">
            📊 Riepilogo SAL - {cantieri.find(c => c.id === filtroCantiere)?.nome}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Numero SAL</div>
              <div className="text-2xl font-bold text-blue-900">{riepilogoCantiere.numeroSAL}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-blue-700 mb-1">Importo Lavori</div>
              <div className="text-xl font-bold text-blue-900">€ {riepilogoCantiere.importoLavori.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-green-700 mb-1">Totale SAL</div>
              <div className="text-xl font-bold text-green-900">€ {riepilogoCantiere.totaleImporto.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-purple-700 mb-1">Avanzamento</div>
              <div className="text-2xl font-bold text-purple-900">{riepilogoCantiere.percentualeAvanzamento}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-orange-700 mb-1">Rimanente</div>
              <div className="text-xl font-bold text-orange-900">€ {riepilogoCantiere.rimanente.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Modifica' : '➕ Nuovo'} SAL</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cantiere *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.cantiereId || ''}
                onChange={(e) => setFormData({...formData, cantiereId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona cantiere</option>
                {cantieri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">N. SAL *</label>
              <input 
                type="text" 
                placeholder="es: SAL-001" 
                className="border rounded px-3 py-2 w-full"
                value={formData.numeroSAL || ''} 
                onChange={(e) => setFormData({...formData, numeroSAL: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data SAL *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataSAL || ''}
                onChange={(e) => setFormData({...formData, dataSAL: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo (€) *</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                className="border rounded px-3 py-2 w-full"
                value={formData.importo || ''} 
                onChange={(e) => {
                  const imp = parseFloat(e.target.value) || 0;
                  const cant = cantieri.find(c => c.id === formData.cantiereId);
                  const tot = cant ? parseFloat(cant.importo_lavori) || 0 : 0;
                  
                  // Calcola la somma di tutti i SAL precedenti dello stesso cantiere
                  const importoPrecedente = sal
                    .filter(s => s.cantiere_id === formData.cantiereId && s.id !== editingId)
                    .reduce((sum, s) => sum + (parseFloat(s.importo) || 0), 0);
                  
                  // Percentuale cumulativa
                  const importoTotale = importoPrecedente + imp;
                  const perc = tot > 0 ? ((importoTotale / tot) * 100).toFixed(2) : 0;
                  
                  setFormData({...formData, importo: e.target.value, percentuale: perc});
                }}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Avanzamento Cumulativo</label>
              <div className="border rounded px-3 py-2 bg-gray-50 text-lg font-semibold text-purple-700">
                {formData.percentuale || 0}%
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stato *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.stato || ''}
                onChange={(e) => setFormData({...formData, stato: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona stato</option>
                <option value="bozza">📝 Bozza</option>
                <option value="presentato">📤 Presentato</option>
                <option value="approvato">✅ Approvato</option>
                <option value="pagato">💰 Pagato</option>
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
                setFormData({});
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

      {/* Tabella SAL */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Cantiere</th>
              <th className="px-4 py-3 text-left text-sm">N. SAL</th>
              <th className="px-4 py-3 text-left text-sm">Data</th>
              <th className="px-4 py-3 text-right text-sm">Importo</th>
              <th className="px-4 py-3 text-center text-sm">Avanzamento</th>
              <th className="px-4 py-3 text-center text-sm">Stato</th>
              <th className="px-4 py-3 text-center text-sm">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {salFiltrati.map(s => {
              const cant = cantieri.find(c => c.id === s.cantiere_id);
              const statoCols = {
                bozza: 'bg-gray-100 text-gray-700',
                presentato: 'bg-blue-100 text-blue-700',
                approvato: 'bg-green-100 text-green-700',
                pagato: 'bg-purple-100 text-purple-700'
              };
              const statoLabels = {
                bozza: '📝 Bozza',
                presentato: '📤 Presentato',
                approvato: '✅ Approvato',
                pagato: '💰 Pagato'
              };
              return (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{cant?.nome || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{s.numero_sal}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(s.data_sal)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">€ {parseFloat(s.importo).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-semibold">
                      {parseFloat(s.percentuale || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statoCols[s.stato]}`}>
                      {statoLabels[s.stato] || s.stato}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button 
                      onClick={() => handleEdit(s)} 
                      className="text-blue-600 mr-2 text-lg"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(s)} 
                      className="text-red-600 text-lg"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {salFiltrati.length === 0 && filtroCantiere && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-2xl mb-2">🔍</p>
            <p>Nessun SAL trovato per questo cantiere</p>
            <button 
              onClick={() => setFiltroCantiere('')}
              className="mt-2 text-blue-600 hover:underline text-sm"
            >
              ✕ Cancella filtro
            </button>
          </div>
        )}
        {salFiltrati.length === 0 && !filtroCantiere && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">📊</p>
            <p>Nessun SAL registrato</p>
            <p className="text-sm text-gray-400 mt-2">Clicca su "➕ Nuovo SAL" per iniziare</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SAL;