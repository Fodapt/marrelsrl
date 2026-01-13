import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { validateIBAN } from '../utils/validators';
import { exportSubappaltatoriPDF } from '../utils/exports/exportSubappaltatoriPDF';

function Subappaltatori() {
  // ✅ USA IL CONTEXT
  const { subappaltatori, cantieri, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCantiereSubappaltatori, setFiltroCantiereSubappaltatori] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ cantieri_ids: [] });
  const [saving, setSaving] = useState(false);

  // ✅ MOSTRA LOADING
  if (loading.subappaltatori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento subappaltatori...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA su Supabase (async)
  const handleSave = async () => {
    if (!formData.ragione_sociale && !formData.ragioneSociale) {
      alert('⚠️ La ragione sociale è obbligatoria!');
      return;
    }

    if ((formData.cantieri_ids || []).length === 0 && (formData.cantieriIds || []).length === 0) {
      alert('⚠️ Seleziona almeno un cantiere!');
      return;
    }

    setSaving(true);

    // Converti i campi per Supabase (snake_case)
    const dataForSupabase = {
      ragione_sociale: formData.ragione_sociale || formData.ragioneSociale,
      partita_iva: formData.partita_iva || formData.piva,
      codice_fiscale: formData.codice_fiscale || formData.codiceFiscale,
      iban: formData.iban,
      cantieri_ids: formData.cantieri_ids || formData.cantieriIds || [],
      tipologia: formData.tipologia,
      indirizzo: formData.indirizzo,
      telefono: formData.telefono,
      email: formData.email,
      pec: formData.pec,
      note: formData.note
    };

    let result;
    if (editingId) {
      result = await updateRecord('subappaltatori', editingId, dataForSupabase);
    } else {
      result = await addRecord('subappaltatori', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({ cantieri_ids: [] });
      setEditingId(null);
      alert(editingId ? '✅ Subappaltatore aggiornato!' : '✅ Subappaltatore aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA da Supabase (async)
  const handleDelete = async (sub) => {
    if (!confirm(`❌ Eliminare il subappaltatore ${sub.ragione_sociale}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('subappaltatori', sub.id);

    if (result.success) {
      alert('✅ Subappaltatore eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (sub) => {
    // Converti da snake_case a camelCase per il form
    setFormData({
      ragione_sociale: sub.ragione_sociale,
      ragioneSociale: sub.ragione_sociale,  // Compatibilità
      partita_iva: sub.partita_iva,
      piva: sub.partita_iva,  // Compatibilità
      codice_fiscale: sub.codice_fiscale,
      codiceFiscale: sub.codice_fiscale,  // Compatibilità
      iban: sub.iban,
      cantieri_ids: sub.cantieri_ids || [],
      cantieriIds: sub.cantieri_ids || [],  // Compatibilità
      tipologia: sub.tipologia,
      indirizzo: sub.indirizzo,
      telefono: sub.telefono,
      email: sub.email,
      pec: sub.pec,
      note: sub.note
    });
    setEditingId(sub.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
// ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportSubappaltatoriPDF({
      subappaltatori: filtered,
      cantieri
    });
  };
  const filteredSubappaltatori = subappaltatori.filter(sub => {
    if (!filtroCantiereSubappaltatori) return true;
    const cantieriSub = sub.cantieri_ids || [];
    return cantieriSub.includes(filtroCantiereSubappaltatori);
  });

  const filtered = filteredSubappaltatori.filter(sub => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return sub.ragione_sociale?.toLowerCase().includes(term) || 
           sub.partita_iva?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-4 flex-1 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Cerca per ragione sociale o P.IVA..."
            className="border rounded px-3 py-2 flex-1 min-w-[250px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 min-w-[200px]"
            value={filtroCantiereSubappaltatori}
            onChange={(e) => setFiltroCantiereSubappaltatori(e.target.value)}
          >
            <option value="">Tutti i cantieri</option>
            {cantieri.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ cantieri_ids: [] });
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            ➕ Nuovo Subappaltatore
          </button>
          <button 
            onClick={esportaPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
          >
            📄 Esporta PDF
          </button>
        </div>
      </div>

      {filtered.length > 0 && filtroCantiereSubappaltatori && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            📊 Visualizzati {filtered.length} subappaltatori per il cantiere selezionato
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Subappaltatore
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Ragione Sociale *" 
              className="border rounded px-3 py-2 col-span-2"
              value={formData.ragioneSociale || formData.ragione_sociale || ''} 
              onChange={(e) => setFormData({...formData, ragioneSociale: e.target.value, ragione_sociale: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Partita IVA" 
              className="border rounded px-3 py-2"
              value={formData.piva || formData.partita_iva || ''} 
              onChange={(e) => setFormData({...formData, piva: e.target.value, partita_iva: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Codice Fiscale" 
              className="border rounded px-3 py-2"
              value={formData.codiceFiscale || formData.codice_fiscale || ''} 
              onChange={(e) => setFormData({...formData, codiceFiscale: e.target.value, codice_fiscale: e.target.value})}
              disabled={saving}
            />
            <div className="relative col-span-2">
              <input 
                type="text" 
                placeholder="IBAN" 
                className={`border rounded px-3 py-2 w-full ${
                  formData.iban && !validateIBAN(formData.iban) 
                    ? 'border-red-500 bg-red-50' 
                    : formData.iban && validateIBAN(formData.iban)
                    ? 'border-green-500 bg-green-50'
                    : ''
                }`}
                value={formData.iban || ''} 
                onChange={(e) => setFormData({...formData, iban: e.target.value.toUpperCase()})}
                disabled={saving}
              />
              {formData.iban && !validateIBAN(formData.iban) && (
                <span className="text-red-500 text-xs mt-1 block">❌ IBAN non valido</span>
              )}
              {formData.iban && validateIBAN(formData.iban) && (
                <span className="text-green-600 text-xs mt-1 block">✅ IBAN valido</span>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Cantieri * (tieni premuto Ctrl/Cmd per selezionare multipli)
              </label>
              <select 
                multiple 
                className="border rounded px-3 py-2 w-full h-32"
                value={formData.cantieriIds || formData.cantieri_ids || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({...formData, cantieriIds: selected, cantieri_ids: selected});
                }}
                disabled={saving}
              >
                {cantieri.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selezionati: {(formData.cantieriIds || formData.cantieri_ids || []).length} cantiere/i
              </p>
            </div>
            <select 
              className="border rounded px-3 py-2" 
              value={formData.tipologia || ''}
              onChange={(e) => setFormData({...formData, tipologia: e.target.value})}
              disabled={saving}
            >
              <option value="">Tipologia</option>
              <option value="2%">Ritenuta 2%</option>
              <option value="subappalto">Subappalto</option>
            </select>
            <input 
              type="tel" 
              placeholder="Telefono" 
              className="border rounded px-3 py-2"
              value={formData.telefono || ''} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="Email" 
              className="border rounded px-3 py-2"
              value={formData.email || ''} 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="PEC" 
              className="border rounded px-3 py-2"
              value={formData.pec || ''} 
              onChange={(e) => setFormData({...formData, pec: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Indirizzo" 
              className="border rounded px-3 py-2 col-span-2"
              value={formData.indirizzo || ''} 
              onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
              disabled={saving}
            />
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
              disabled={saving || !(formData.ragioneSociale || formData.ragione_sociale) || (formData.cantieriIds || formData.cantieri_ids || []).length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:opacity-50"
            >
              {saving ? '⏳ Salvataggio...' : '✓ Salva'}
            </button>
            <button 
              onClick={() => {
                setShowForm(false);
                setFormData({ cantieri_ids: [] });
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
              <th className="px-4 py-3 text-left text-sm font-medium">Ragione Sociale</th>
              <th className="px-4 py-3 text-left text-sm font-medium">P.IVA</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cantieri</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tipologia</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Telefono</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sub => {
              const cantieriAssegnati = (sub.cantieri_ids || [])  // ← snake_case
                .filter(id => id)
                .map(id => cantieri.find(c => c.id === id)?.nome || 'N/A')
                .join(', ');
              
              return (
                <tr key={sub.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{sub.ragione_sociale}</td>
                  <td className="px-4 py-3 text-sm">{sub.partita_iva || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-xs">{cantieriAssegnati || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {sub.tipologia ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        sub.tipologia === '2%' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {sub.tipologia}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{sub.telefono || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      onClick={() => handleEdit(sub)} 
                      className="text-blue-600 mr-2 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(sub)} 
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
            <p className="text-4xl mb-2">🏢</p>
            <p>Nessun subappaltatore trovato</p>
          </div>
        )}
      </div>

      {/* Cards dettagliate per subappaltatori */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📋 Dettagli Subappaltatori</h3>
          {filtered.map(sub => {
            const cantieriAssegnati = (sub.cantieri_ids || [])  // ← snake_case
              .filter(id => id)
              .map(id => {
                const cantiere = cantieri.find(c => c.id === id);
                return cantiere ? cantiere.nome : 'N/A';
              });

            return (
              <div key={sub.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-blue-600">{sub.ragione_sociale}</h4>
                    {sub.tipologia && (
                      <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-medium ${
                        sub.tipologia === '2%' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sub.tipologia}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(sub)} 
                      className="text-blue-600 hover:text-blue-800 text-xl"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(sub)} 
                      className="text-red-600 hover:text-red-800 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {sub.partita_iva && (
                    <div>
                      <span className="text-gray-600 font-medium">P.IVA:</span> {sub.partita_iva}
                    </div>
                  )}
                  {sub.codice_fiscale && (
                    <div>
                      <span className="text-gray-600 font-medium">CF:</span> {sub.codice_fiscale}
                    </div>
                  )}
                  {sub.iban && (
                    <div className="col-span-full">
                      <span className="text-gray-600 font-medium">IBAN:</span> 
                      <span className="font-mono text-xs ml-2">{sub.iban}</span>
                    </div>
                  )}
                  {cantieriAssegnati.length > 0 && (
                    <div className="col-span-full">
                      <span className="text-gray-600 font-medium">Cantieri:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cantieriAssegnati.map((nome, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {sub.telefono && (
                    <div>
                      <span className="text-gray-600 font-medium">Tel:</span> {sub.telefono}
                    </div>
                  )}
                  {sub.email && (
                    <div>
                      <span className="text-gray-600 font-medium">Email:</span> 
                      <a href={`mailto:${sub.email}`} className="text-blue-600 hover:underline ml-1">
                        {sub.email}
                      </a>
                    </div>
                  )}
                  {sub.pec && (
                    <div>
                      <span className="text-gray-600 font-medium">PEC:</span> {sub.pec}
                    </div>
                  )}
                  {sub.indirizzo && (
                    <div className="col-span-full">
                      <span className="text-gray-600 font-medium">Indirizzo:</span> {sub.indirizzo}
                    </div>
                  )}
                </div>

                {sub.note && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📝 Note:</span> {sub.note}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Subappaltatori;