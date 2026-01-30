import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { exportUnilavPDF } from '../utils/exports/exportUnilavPDF';

function Unilav() {
  const {
    unilav = [],
    lavoratori = [],
    cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroLavoratore, setFiltroLavoratore] = useState('');
  const [dataInizioPeriodo, setDataInizioPeriodo] = useState('');
  const [dataFinePeriodo, setDataFinePeriodo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const tipiUnilav = [
    { value: 'assunzione', label: 'Assunzione', color: 'bg-green-100' },
    { value: 'trasf_part_full', label: 'Part→Full', color: 'bg-blue-100' },
    { value: 'trasf_cantiere', label: 'Trasf. Cantiere', color: 'bg-purple-100' },
    { value: 'trasf_livello', label: 'Trasf. Livello', color: 'bg-indigo-100' },
    { value: 'dimissioni', label: 'Dimissioni', color: 'bg-red-100' },
    { value: 'distacco_comando', label: 'Distacco/Comando', color: 'bg-orange-100' },
    { value: 'proroga', label: 'Proroga', color: 'bg-yellow-100' },
    { value: 'trasf_det_ind', label: 'Det→Ind', color: 'bg-teal-100' }
  ];

  // ✅ MOSTRA LOADING
  if (loading.unilav || loading.lavoratori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento Unilav...</p>
        </div>
      </div>
    );
  }

// ✅ FILTRO MIGLIORATO - LOGICA CORRETTA
const filteredUnilav = (() => {
  let filtered = unilav;

  // Filtro per lavoratore specifico
  if (filtroLavoratore) {
    filtered = filtered.filter(u => u.lavoratore_id === filtroLavoratore);
  }

  // Filtro per periodo
  if (dataInizioPeriodo && dataFinePeriodo) {
    const periodoInizio = new Date(dataInizioPeriodo);
    const periodoFine = new Date(dataFinePeriodo);

    // Raggruppa per lavoratore
    const univlavPerLavoratore = {};
    filtered.forEach(u => {
      if (!univlavPerLavoratore[u.lavoratore_id]) {
        univlavPerLavoratore[u.lavoratore_id] = [];
      }
      univlavPerLavoratore[u.lavoratore_id].push(u);
    });

    const risultato = [];

    Object.entries(univlavPerLavoratore).forEach(([lavoratoreId, univlavList]) => {
      // STEP 1: Trova tutti gli Unilav che INIZIANO nel periodo
      const univlavNelPeriodo = univlavList.filter(u => {
        const dataInizio = new Date(u.data_inizio);
        return dataInizio >= periodoInizio && dataInizio <= periodoFine;
      });

      if (univlavNelPeriodo.length > 0) {
        // Se ci sono Unilav nel periodo, mostrarli tutti
        risultato.push(...univlavNelPeriodo);
      } else {
        // STEP 2: Se NON ci sono Unilav nel periodo, cerca l'ultimo precedente valido
        const univlavPrecedenti = univlavList.filter(u => {
          const dataInizio = new Date(u.data_inizio);
          const dataFine = u.data_fine ? new Date(u.data_fine) : null;

          // L'Unilav deve essere iniziato PRIMA del periodo
          if (dataInizio >= periodoInizio) return false;

          // CASO A: Contratto con data fine
          if (dataFine) {
            // La data fine deve essere DOPO l'inizio del periodo (ancora valido)
            return dataFine >= periodoInizio;
          }

          // CASO B: Contratto indeterminato (data_fine = null)
          // È sempre valido se iniziato prima del periodo
          return true;
        });

        if (univlavPrecedenti.length > 0) {
          // Prendi l'Unilav più recente tra quelli precedenti
          const piuRecente = univlavPrecedenti.reduce((latest, current) => {
            const latestInizio = new Date(latest.data_inizio);
            const currentInizio = new Date(current.data_inizio);
            return currentInizio > latestInizio ? current : latest;
          });

          risultato.push(piuRecente);
        }
      }
    });

    return risultato;
  }

  return filtered;
})();

  const lavoratoriUnici = [...new Set(filteredUnilav.map(u => u.lavoratore_id))];

  const handleSave = async () => {
    if (!formData.tipoUnilav || !formData.lavoratoreId || !formData.dataInizio) {
      return alert('⚠️ Compila i campi obbligatori (Tipo Unilav, Lavoratore, Data Inizio)');
    }

    setSaving(true);

    const dataForSupabase = {
  tipo_unilav: formData.tipoUnilav,
  lavoratore_id: formData.lavoratoreId,
  cantiere_id: formData.cantiereId || null,
  data_comunicazione: formData.dataComunicazione || null,
  data_inizio: formData.dataInizio,
  data_fine: (formData.tipoContratto === 'indeterminato' && formData.tipoUnilav !== 'distacco_comando') 
    ? null 
    : (formData.dataFine || null),
  livello: formData.livello || null,
  tipo_contratto: formData.tipoContratto || null,
  orario: formData.orario || null,
  note: formData.note || null  
};

    let result;
    if (editingId) {
      result = await updateRecord('unilav', editingId, dataForSupabase);
    } else {
      result = await addRecord('unilav', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Unilav aggiornato!' : '✅ Unilav creato!');
      setShowForm(false);
      setFormData({});
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleDelete = async (u) => {
    const lav = lavoratori.find(l => l.id === u.lavoratore_id);
    const nomeLav = lav ? `${lav.nome} ${lav.cognome}` : 'questo Unilav';
    
    if (!confirm(`❌ Eliminare l'Unilav di ${nomeLav}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('unilav', u.id);

    if (result.success) {
      alert('✅ Unilav eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (u) => {
  setFormData({
    tipoUnilav: u.tipo_unilav,
    lavoratoreId: u.lavoratore_id,
    cantiereId: u.cantiere_id,
    dataComunicazione: u.data_comunicazione,
    dataInizio: u.data_inizio,
    dataFine: u.data_fine,
    livello: u.livello,
    tipoContratto: u.tipo_contratto,
    orario: u.orario,
    note: u.note || ''  
  });
    setEditingId(u.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFiltri = () => {
    setDataInizioPeriodo('');
    setDataFinePeriodo('');
    setFiltroLavoratore('');
    setSearchTerm('');
  };
// ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportUnilavPDF({
      unilav: filteredUnilav,
      lavoratori,
      cantieri
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-4 flex-1 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Cerca per nome lavoratore o cantiere..."
            className="border rounded px-3 py-2 flex-1 min-w-[200px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 min-w-[200px]"
            value={filtroLavoratore}
            onChange={(e) => setFiltroLavoratore(e.target.value)}
          >
            <option value="">Tutti i lavoratori</option>
            {lavoratori.map(l => (
              <option key={l.id} value={l.id}>
                {l.cognome} {l.nome}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dataInizioPeriodo}
            onChange={(e) => setDataInizioPeriodo(e.target.value)}
            placeholder="Data inizio"
          />
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dataFinePeriodo}
            onChange={(e) => setDataFinePeriodo(e.target.value)}
            placeholder="Data fine"
          />
          {(dataInizioPeriodo || dataFinePeriodo || filtroLavoratore) && (
            <button 
              onClick={resetFiltri}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ✕ Reset
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({});
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            ➕ Nuovo Unilav
          </button>
          <button 
            onClick={esportaPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
          >
            📄 Esporta PDF
          </button>
        </div>
      </div>

      {filteredUnilav.length > 0 && (filtroLavoratore || (dataInizioPeriodo && dataFinePeriodo)) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            📊 Visualizzati {filteredUnilav.length} Unilav
            {dataInizioPeriodo && dataFinePeriodo && (
              <span className="font-semibold"> - {lavoratoriUnici.length} lavoratori attivi dal {formatDate(dataInizioPeriodo)} al {formatDate(dataFinePeriodo)}</span>
            )}
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Unilav
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Unilav *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.tipoUnilav || ''}
                onChange={(e) => setFormData({...formData, tipoUnilav: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona tipo</option>
                {tipiUnilav.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Lavoratore *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.lavoratoreId || ''}
                onChange={(e) => setFormData({...formData, lavoratoreId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona lavoratore</option>
                {lavoratori.map(l => <option key={l.id} value={l.id}>{l.cognome} {l.nome}</option>)}
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
                <option value="">Seleziona cantiere</option>
                {cantieri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Comunicazione</label>
              <input 
                type="date"
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataComunicazione || ''}
                onChange={(e) => setFormData({...formData, dataComunicazione: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Inizio *</label>
              <input 
                type="date"
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataInizio || ''}
                onChange={(e) => setFormData({...formData, dataInizio: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Fine</label>
              <input 
                type="date"
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataFine || ''}
                onChange={(e) => setFormData({...formData, dataFine: e.target.value})}
                disabled={saving || (formData.tipoContratto === 'indeterminato' && formData.tipoUnilav !== 'distacco_comando')}
              />
              {formData.tipoContratto === 'indeterminato' && formData.tipoUnilav !== 'distacco_comando' && (
                <p className="text-xs text-gray-500 mt-1">Disabilitato per contratti indeterminati</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Livello</label>
              <input 
                type="text" 
                placeholder="es: 3°" 
                className="border rounded px-3 py-2 w-full" 
                value={formData.livello || ''}
                onChange={(e) => setFormData({...formData, livello: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Contratto</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.tipoContratto || ''}
                onChange={(e) => setFormData({...formData, tipoContratto: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona tipo</option>
                <option value="determinato">Determinato</option>
                <option value="indeterminato">Indeterminato</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Orario</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.orario || ''}
                onChange={(e) => setFormData({...formData, orario: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona orario</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
              </select>
            </div>
          </div>
            {/* ✅ CAMPO NOTE*/}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">📝 Note</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows="3"
              placeholder="Aggiungi note importanti per questo Unilav..."
              value={formData.note || ''}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Es: Cambio mansione, richieste particolari, scadenze...
            </p>
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

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Lavoratore</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cantiere</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Inizio</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Fine</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Livello</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Contratto</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Note</th> 
              <th className="px-4 py-3 text-left text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnilav
              .filter(u => {
                if (!searchTerm) return true;
                const lav = lavoratori.find(l => l.id === u.lavoratore_id);
                const cant = cantieri.find(c => c.id === u.cantiere_id);
                const nomeLav = lav ? `${lav.nome} ${lav.cognome}`.toLowerCase() : '';
                const nomeCant = cant ? cant.nome.toLowerCase() : '';
                const term = searchTerm.toLowerCase();
                return nomeLav.includes(term) || nomeCant.includes(term);
              })
              .sort((a, b) => {
                const dateA = new Date(a.data_inizio || '9999-12-31');
                const dateB = new Date(b.data_inizio || '9999-12-31');
                return dateB - dateA;
              })
              .map(u => {
                const lav = lavoratori.find(l => l.id === u.lavoratore_id);
                const cant = cantieri.find(c => c.id === u.cantiere_id);
                const tipo = tipiUnilav.find(t => t.value === u.tipo_unilav);
                
                return (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${tipo?.color || 'bg-gray-100'}`}>
                        {tipo?.label || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
  {lav ? `${lav.nome} ${lav.cognome}` : 'N/A'}
</td>
                    <td className="px-4 py-3 text-sm">{cant?.nome || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(u.data_inizio)}</td>
                    <td className="px-4 py-3 text-sm">
                      {u.tipo_contratto === 'indeterminato' && u.tipo_unilav !== 'distacco_comando' ? (
                        <span className="text-green-600 font-medium">Indet.</span>
                      ) : (
                        formatDate(u.data_fine)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{u.livello || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.tipo_contratto === 'indeterminato' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {u.tipo_contratto === 'indeterminato' ? 'Indet.' : 'Det.'}
                      </span>
                    </td>
                    {/* ✅ COLONNA NOTE */}
<td className="px-4 py-3 text-sm">
  {u.note ? (
    <span 
      className="text-blue-600 cursor-pointer hover:text-blue-800" 
      title="Clicca per leggere la nota"
      onClick={() => {
        const lav = lavoratori.find(l => l.id === u.lavoratore_id);
        const nomeLav = lav ? `${lav.nome} ${lav.cognome}` : 'Lavoratore';
        alert(`📝 Note per ${nomeLav}:\n\n${u.note}`);
      }}
    >
      📝
    </span>
  ) : (
    <span className="text-gray-300">-</span>
  )}
</td>
                    <td className="px-4 py-3 text-sm">
                      <button 
                        onClick={() => handleEdit(u)} 
                        className="text-blue-600 mr-2 hover:text-blue-800"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(u)} 
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {filteredUnilav.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">📄</p>
            <p>Nessun Unilav trovato</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Unilav;