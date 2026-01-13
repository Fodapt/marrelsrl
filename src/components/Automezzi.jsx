import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate } from '../utils/dateUtils';
import { exportAutomezziPDF } from '../utils/exports/exportAutomezziPDF';

function Automezzi() {
  // ✅ USA IL CONTEXT - Nota: la tabella si chiama "veicoli" in Supabase
  const { veicoli, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // ✅ MOSTRA LOADING
  if (loading.veicoli) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento veicoli...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA su Supabase (async)
  const handleSave = async () => {
    if (!formData.targa) {
      alert('⚠️ La targa è obbligatoria!');
      return;
    }

    setSaving(true);

    // Converti i campi per Supabase (snake_case)
    const dataForSupabase = {
      targa: formData.targa,
      marca: formData.marca || null,
      modello: formData.modello || null,
      anno: formData.anno || null,  // ← FIX: stringa vuota → null
      tipo: formData.tipo || null,
      scadenza_assicurazione: formData.scadenza_assicurazione || formData.scadenzaAssicurazione || null,  // ← FIX
      scadenza_revisione: formData.scadenza_revisione || formData.scadenzaRevisione || null,  // ← FIX
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('veicoli', editingId, dataForSupabase);
    } else {
      result = await addRecord('veicoli', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      alert(editingId ? '✅ Veicolo aggiornato!' : '✅ Veicolo aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA da Supabase (async)
  const handleDelete = async (auto) => {
    if (!confirm(`❌ Eliminare il veicolo ${auto.targa}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('veicoli', auto.id);

    if (result.success) {
      alert('✅ Veicolo eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (auto) => {
    // Converti da snake_case a camelCase per il form
    setFormData({
      targa: auto.targa,
      marca: auto.marca,
      modello: auto.modello,
      anno: auto.anno,
      tipo: auto.tipo,
      scadenza_assicurazione: auto.scadenza_assicurazione,
      scadenzaAssicurazione: auto.scadenza_assicurazione,  // Compatibilità
      scadenza_revisione: auto.scadenza_revisione,
      scadenzaRevisione: auto.scadenza_revisione,  // Compatibilità
      note: auto.note
    });
    setEditingId(auto.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = veicoli.filter(a => 
    a.targa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.modello?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcola scadenze
  const calcolaStatoScadenza = (dataScadenza) => {
    if (!dataScadenza) return { stato: 'sconosciuto', label: '-', color: 'bg-gray-100' };
    
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniMancanti < 0) {
      return { stato: 'scaduto', label: `Scaduto da ${Math.abs(giorniMancanti)}g`, color: 'bg-red-100 text-red-700' };
    } else if (giorniMancanti <= 30) {
      return { stato: 'in_scadenza', label: `${giorniMancanti}g`, color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { stato: 'valido', label: `${giorniMancanti}g`, color: 'bg-green-100 text-green-700' };
    }
  };

  // Statistiche
  const statistiche = useMemo(() => {
    let totale = veicoli.length;
    let assicurazioniScadute = 0;
    let assicurazioniInScadenza = 0;
    let revisioniScadute = 0;
    let revisioniInScadenza = 0;

    veicoli.forEach(auto => {
      const statoAss = calcolaStatoScadenza(auto.scadenza_assicurazione);  // ← snake_case
      const statoRev = calcolaStatoScadenza(auto.scadenza_revisione);  // ← snake_case
      
      if (statoAss.stato === 'scaduto') assicurazioniScadute++;
      if (statoAss.stato === 'in_scadenza') assicurazioniInScadenza++;
      if (statoRev.stato === 'scaduto') revisioniScadute++;
      if (statoRev.stato === 'in_scadenza') revisioniInScadenza++;
    });

    return {
      totale,
      assicurazioniScadute,
      assicurazioniInScadenza,
      revisioniScadute,
      revisioniInScadenza
    };
  }, [veicoli]);

  // ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportAutomezziPDF({
      veicoli: filtered
    });
  };

  return (
    <div className="space-y-4">
      {/* Statistiche */}
      {veicoli.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Totale Veicoli</p>
            <p className="text-3xl font-bold text-blue-900">{statistiche.totale}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium">Assic. Scadute</p>
            <p className="text-3xl font-bold text-red-900">{statistiche.assicurazioniScadute}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-600 font-medium">Assic. In Scadenza</p>
            <p className="text-3xl font-bold text-yellow-900">{statistiche.assicurazioniInScadenza}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium">Rev. Scadute</p>
            <p className="text-3xl font-bold text-red-900">{statistiche.revisioniScadute}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-600 font-medium">Rev. In Scadenza</p>
            <p className="text-3xl font-bold text-yellow-900">{statistiche.revisioniInScadenza}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-4">
        <input
          type="text"
          placeholder="🔍 Cerca per targa, marca, modello o tipo..."
          className="border rounded px-3 py-2 flex-1 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({});
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            ➕ Nuovo Veicolo
          </button>
          <button
            onClick={esportaPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
          >
            📄 Esporta PDF
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Veicolo
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Targa (es: AB123CD) *" 
              className="border rounded px-3 py-2 uppercase"
              value={formData.targa || ''} 
              onChange={(e) => setFormData({...formData, targa: e.target.value.toUpperCase()})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Marca" 
              className="border rounded px-3 py-2"
              value={formData.marca || ''} 
              onChange={(e) => setFormData({...formData, marca: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Modello" 
              className="border rounded px-3 py-2"
              value={formData.modello || ''} 
              onChange={(e) => setFormData({...formData, modello: e.target.value})}
              disabled={saving}
            />
            <input 
              type="number" 
              placeholder="Anno (es: 2020)" 
              className="border rounded px-3 py-2"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.anno || ''} 
              onChange={(e) => {
                const val = e.target.value;
                // Accetta solo numeri di 4 cifre o vuoto
                if (val === '' || (/^\d{0,4}$/.test(val) && parseInt(val) >= 1900)) {
                  setFormData({...formData, anno: val || null});  // ← Salva null se vuoto
                }
              }}
              disabled={saving}
            />
            <select
              className="border rounded px-3 py-2"
              value={formData.tipo || ''}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              disabled={saving}
            >
              <option value="">Seleziona Tipo</option>
              <option value="furgone">Furgone</option>
              <option value="autocarro">Autocarro</option>
              <option value="escavatore">Escavatore</option>
              <option value="gru">Gru</option>
              <option value="betoniera">Betoniera</option>
              <option value="rimorchio">Rimorchio</option>
              <option value="auto">Auto</option>
              <option value="camion">Camion</option>
              <option value="altro">Altro</option>
            </select>
            <div>
              <label className="block text-sm font-medium mb-1">Scadenza Assicurazione</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={formData.scadenzaAssicurazione || formData.scadenza_assicurazione || ''} 
                onChange={(e) => setFormData({...formData, scadenzaAssicurazione: e.target.value, scadenza_assicurazione: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scadenza Revisione</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={formData.scadenzaRevisione || formData.scadenza_revisione || ''} 
                onChange={(e) => setFormData({...formData, scadenzaRevisione: e.target.value, scadenza_revisione: e.target.value})}
                disabled={saving}
              />
            </div>
            <textarea
              placeholder="Note (optional)"
              className="border rounded px-3 py-2 col-span-2"
              rows="3"
              value={formData.note || ''}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              disabled={saving}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleSave} 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={saving}
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
              <th className="px-4 py-3 text-left text-sm font-medium">Targa</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Marca/Modello</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Anno</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Assicurazione</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Stato Ass.</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Revisione</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Stato Rev.</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(auto => {
              const statoAss = calcolaStatoScadenza(auto.scadenza_assicurazione);  // ← snake_case
              const statoRev = calcolaStatoScadenza(auto.scadenza_revisione);  // ← snake_case
              
              return (
                <tr key={auto.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold">{auto.targa}</td>
                  <td className="px-4 py-3 text-sm">{auto.marca} {auto.modello}</td>
                  <td className="px-4 py-3 text-sm">{auto.anno}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded text-xs bg-blue-100">
                      {auto.tipo || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(auto.scadenza_assicurazione)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statoAss.color}`}>
                      {statoAss.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(auto.scadenza_revisione)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statoRev.color}`}>
                      {statoRev.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      onClick={() => handleEdit(auto)} 
                      className="text-blue-600 mr-2 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(auto)} 
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
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">🚛</p>
            <p>Nessun veicolo trovato</p>
          </div>
        )}
      </div>

      {/* Dettagli veicoli con note */}
      {filtered.some(a => a.note) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📝 Veicoli con Note</h3>
          {filtered.filter(a => a.note).map(auto => (
            <div key={auto.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{auto.targa} - {auto.marca} {auto.modello}</p>
                  <p className="text-sm text-gray-600 mt-2">{auto.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Automezzi;