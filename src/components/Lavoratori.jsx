import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { validateIBAN } from '../utils/validators';

function Lavoratori() {
  // ✅ USA IL CONTEXT invece delle props
  const { lavoratori, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // ✅ MOSTRA LOADING
  if (loading.lavoratori) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento lavoratori...</p>
        </div>
      </div>
    );
  }

  const filtered = lavoratori.filter(l => 
    l.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.codice_fiscale?.toLowerCase().includes(searchTerm.toLowerCase())  // ← snake_case
  );

  // ✅ SALVA su Supabase (async)
  const handleSave = async () => {
    if (!formData.nome || !formData.cognome) {
      alert('⚠️ Nome e Cognome sono obbligatori!');
      return;
    }

    setSaving(true);

    // Converti i campi da camelCase a snake_case per Supabase
    const dataForSupabase = {
      nome: formData.nome,
      cognome: formData.cognome,
      codice_fiscale: formData.codice_fiscale || formData.codiceFiscale,  // Supporta entrambi
      indirizzo: formData.indirizzo,
      telefono: formData.telefono,
      email: formData.email,
      iban_primario: formData.iban_primario || formData.ibanPrimario,
      iban_secondario: formData.iban_secondario || formData.ibanSecondario,
      ruolo: formData.ruolo || 'operaio'
    };

    let result;
    if (editingId) {
      // UPDATE
      result = await updateRecord('lavoratori', editingId, dataForSupabase);
    } else {
      // CREATE
      result = await addRecord('lavoratori', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      alert(editingId ? '✅ Lavoratore aggiornato!' : '✅ Lavoratore aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA da Supabase (async)
  const handleDelete = async (lav) => {
    if (!confirm(`❌ Eliminare il lavoratore ${lav.nome} ${lav.cognome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('lavoratori', lav.id);

    if (result.success) {
      alert('✅ Lavoratore eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (lav) => {
    // Converti da snake_case a camelCase per il form
    setFormData({
      nome: lav.nome,
      cognome: lav.cognome,
      codice_fiscale: lav.codice_fiscale,
      codiceFiscale: lav.codice_fiscale,  // Mantieni compatibilità
      indirizzo: lav.indirizzo,
      telefono: lav.telefono,
      email: lav.email,
      iban_primario: lav.iban_primario,
      ibanPrimario: lav.iban_primario,  // Mantieni compatibilità
      iban_secondario: lav.iban_secondario,
      ibanSecondario: lav.iban_secondario,  // Mantieni compatibilità
      ruolo: lav.ruolo
    });
    setEditingId(lav.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Cerca..."
          className="border rounded px-3 py-2 w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({});
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Nuovo
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Lavoratore
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nome *" 
              className="border rounded px-3 py-2"
              value={formData.nome || ''} 
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Cognome *" 
              className="border rounded px-3 py-2"
              value={formData.cognome || ''} 
              onChange={(e) => setFormData({...formData, cognome: e.target.value})}
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
            <div className="relative">
              <input 
                type="text" 
                placeholder="IBAN Primario" 
                className={`border rounded px-3 py-2 w-full ${
                  (formData.ibanPrimario || formData.iban_primario) && !validateIBAN(formData.ibanPrimario || formData.iban_primario) 
                    ? 'border-red-500 bg-red-50' 
                    : (formData.ibanPrimario || formData.iban_primario) && validateIBAN(formData.ibanPrimario || formData.iban_primario)
                    ? 'border-green-500 bg-green-50'
                    : ''
                }`}
                value={formData.ibanPrimario || formData.iban_primario || ''} 
                onChange={(e) => setFormData({...formData, ibanPrimario: e.target.value.toUpperCase(), iban_primario: e.target.value.toUpperCase()})}
                disabled={saving}
              />
              {(formData.ibanPrimario || formData.iban_primario) && !validateIBAN(formData.ibanPrimario || formData.iban_primario) && (
                <span className="text-red-500 text-xs mt-1 block">❌ IBAN non valido</span>
              )}
              {(formData.ibanPrimario || formData.iban_primario) && validateIBAN(formData.ibanPrimario || formData.iban_primario) && (
                <span className="text-green-600 text-xs mt-1 block">✅ IBAN valido</span>
              )}
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="IBAN Secondario" 
                className={`border rounded px-3 py-2 w-full ${
                  (formData.ibanSecondario || formData.iban_secondario) && !validateIBAN(formData.ibanSecondario || formData.iban_secondario) 
                    ? 'border-red-500 bg-red-50' 
                    : (formData.ibanSecondario || formData.iban_secondario) && validateIBAN(formData.ibanSecondario || formData.iban_secondario)
                    ? 'border-green-500 bg-green-50'
                    : ''
                }`}
                value={formData.ibanSecondario || formData.iban_secondario || ''} 
                onChange={(e) => setFormData({...formData, ibanSecondario: e.target.value.toUpperCase(), iban_secondario: e.target.value.toUpperCase()})}
                disabled={saving}
              />
              {(formData.ibanSecondario || formData.iban_secondario) && !validateIBAN(formData.ibanSecondario || formData.iban_secondario) && (
                <span className="text-red-500 text-xs mt-1 block">❌ IBAN non valido</span>
              )}
              {(formData.ibanSecondario || formData.iban_secondario) && validateIBAN(formData.ibanSecondario || formData.iban_secondario) && (
                <span className="text-green-600 text-xs mt-1 block">✅ IBAN valido</span>
              )}
            </div>
            <input 
              type="email" 
              placeholder="Email" 
              className="border rounded px-3 py-2"
              value={formData.email || ''} 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Telefono" 
              className="border rounded px-3 py-2"
              value={formData.telefono || ''} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Indirizzo" 
              className="border rounded px-3 py-2"
              value={formData.indirizzo || ''} 
              onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
              disabled={saving}
            />
            <select 
              className="border rounded px-3 py-2" 
              value={formData.ruolo || 'operaio'}
              onChange={(e) => setFormData({...formData, ruolo: e.target.value})}
              disabled={saving}
            >
              <option value="operaio">Operaio</option>
              <option value="amministratore">Amministratore Unico</option>
              <option value="direttore_tecnico">Direttore Tecnico</option>
            </select>
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
              <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cognome</th>
              <th className="px-4 py-3 text-left text-sm font-medium">C.F.</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">IBAN Primario</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lav => (
              <tr key={lav.id} className="hover:bg-gray-50 border-t">
                <td className="px-4 py-3 text-sm">{lav.nome}</td>
                <td className="px-4 py-3 text-sm">{lav.cognome}</td>
                <td className="px-4 py-3 text-sm">{lav.codice_fiscale}</td>
                <td className="px-4 py-3 text-sm">{lav.email}</td>
                <td className="px-4 py-3 text-sm font-mono text-xs">{lav.iban_primario}</td>
                <td className="px-4 py-3 text-sm">
                  <button 
                    onClick={() => handleEdit(lav)} 
                    className="text-blue-600 mr-2 hover:text-blue-800"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(lav)} 
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">👷</p>
            <p>Nessun lavoratore trovato</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lavoratori;