import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { validateIBAN } from '../utils/validators';

function Clienti() {
  const { clienti, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  if (loading.clienti) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento clienti...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!formData.ragioneSociale) {
      alert('⚠️ La ragione sociale è obbligatoria!');
      return;
    }

    setSaving(true);

    const dataForSupabase = {
  ragione_sociale: formData.ragioneSociale || formData.ragione_sociale,
  partita_iva: formData.piva || formData.partita_iva,
  codice_fiscale: formData.codiceFiscale || formData.codice_fiscale,
  iban: formData.iban,
  email: formData.email,
  pec: formData.pec,
  telefono: formData.telefono,
  cellulare: formData.cellulare,
  indirizzo: formData.indirizzo,
  citta: formData.citta,
  cap: formData.cap,
  provincia: formData.provincia,
  referente: formData.referente,
  sito_web: formData.sitoWeb || formData.sito_web,
  note: formData.note,
  attivo: formData.attivo !== undefined ? formData.attivo : true
};

    let result;
    if (editingId) {
      result = await updateRecord('clienti', editingId, dataForSupabase);
    } else {
      result = await addRecord('clienti', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      alert(editingId ? '✅ Cliente aggiornato!' : '✅ Cliente aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleDelete = async (cliente) => {
    if (!confirm(`❌ Eliminare il cliente ${cliente.ragione_sociale}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('clienti', cliente.id);

    if (result.success) {
      alert('✅ Cliente eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (cliente) => {
    setFormData({
      ragioneSociale: cliente.ragione_sociale,
      ragione_sociale: cliente.ragione_sociale,
      piva: cliente.partita_iva,
      partita_iva: cliente.partita_iva,
      codiceFiscale: cliente.codice_fiscale,
      codice_fiscale: cliente.codice_fiscale,
      iban: cliente.iban,
      email: cliente.email,
      pec: cliente.pec,
      telefono: cliente.telefono,
      cellulare: cliente.cellulare,
      indirizzo: cliente.indirizzo,
      citta: cliente.citta,
      cap: cliente.cap,
      provincia: cliente.provincia,
      categoria: cliente.categoria,
      referente: cliente.referente,
      sitoWeb: cliente.sito_web,
      sito_web: cliente.sito_web,
      note: cliente.note,
      attivo: cliente.attivo
    });
    setEditingId(cliente.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return clienti;
    
    const searchLower = searchTerm.toLowerCase();
    return clienti.filter(c => 
      c.ragione_sociale?.toLowerCase().includes(searchLower) ||
      c.partita_iva?.toLowerCase().includes(searchLower) ||
      c.codice_fiscale?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  }, [clienti, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Cerca per ragione sociale, P.IVA, CF o email..."
          className="border rounded px-3 py-2 w-96"
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
          ➕ Nuovo Cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Cliente
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Ragione Sociale *" 
              className="border rounded px-3 py-2 col-span-2"
              value={formData.ragioneSociale || ''} 
              onChange={(e) => setFormData({...formData, ragioneSociale: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Partita IVA" 
              className="border rounded px-3 py-2"
              value={formData.piva || ''} 
              onChange={(e) => setFormData({...formData, piva: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Codice Fiscale" 
              className="border rounded px-3 py-2"
              value={formData.codiceFiscale || ''} 
              onChange={(e) => setFormData({...formData, codiceFiscale: e.target.value})} 
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
              type="tel" 
              placeholder="Telefono" 
              className="border rounded px-3 py-2"
              value={formData.telefono || ''} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Cellulare" 
              className="border rounded px-3 py-2"
              value={formData.cellulare || ''} 
              onChange={(e) => setFormData({...formData, cellulare: e.target.value})} 
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
            <input 
              type="text" 
              placeholder="Città" 
              className="border rounded px-3 py-2"
              value={formData.citta || ''} 
              onChange={(e) => setFormData({...formData, citta: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="CAP" 
              className="border rounded px-3 py-2"
              value={formData.cap || ''} 
              onChange={(e) => setFormData({...formData, cap: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Provincia" 
              className="border rounded px-3 py-2"
              value={formData.provincia || ''} 
              onChange={(e) => setFormData({...formData, provincia: e.target.value.toUpperCase()})}
              maxLength="2"
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Referente" 
              className="border rounded px-3 py-2"
              value={formData.referente || ''} 
              onChange={(e) => setFormData({...formData, referente: e.target.value})} 
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="Sito Web" 
              className="border rounded px-3 py-2"
              value={formData.sitoWeb || ''} 
              onChange={(e) => setFormData({...formData, sitoWeb: e.target.value})} 
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
              disabled={!formData.ragioneSociale || saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300"
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
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Ragione Sociale</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Contatti</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">IBAN</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(cliente => (
              <tr key={cliente.id} className="hover:bg-gray-50 border-t">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-blue-600">{cliente.ragione_sociale}</div>
                  {cliente.partita_iva && (
                    <div className="text-xs text-gray-500">P.IVA: {cliente.partita_iva}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="space-y-1">
                    {cliente.email && (
                      <div className="flex items-center gap-1 text-xs">
                        <span>📧</span>
                        <a href={`mailto:${cliente.email}`} className="text-blue-600 hover:underline">
                          {cliente.email}
                        </a>
                      </div>
                    )}
                    {(cliente.telefono || cliente.cellulare) && (
                      <div className="flex items-center gap-1 text-xs">
                        <span>📞</span>
                        <span>{cliente.telefono || cliente.cellulare}</span>
                      </div>
                    )}
                    {!cliente.email && !cliente.telefono && !cliente.cellulare && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {cliente.iban ? (
                    <div className="font-mono text-xs">{cliente.iban}</div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <button 
                    onClick={() => handleEdit(cliente)} 
                    className="text-blue-600 mr-2 hover:text-blue-800"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente)} 
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
            <p className="text-4xl mb-2">👔</p>
            <p>Nessun cliente trovato</p>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📋 Dettagli Clienti</h3>
          {filtered.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-blue-600">{cliente.ragione_sociale}</h4>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(cliente)} 
                    className="text-blue-600 hover:text-blue-800 text-xl"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente)} 
                    className="text-red-600 hover:text-red-800 text-xl"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {cliente.partita_iva && (
                  <div>
                    <span className="text-gray-600 font-medium">P.IVA:</span> {cliente.partita_iva}
                  </div>
                )}
                {cliente.codice_fiscale && (
                  <div>
                    <span className="text-gray-600 font-medium">CF:</span> {cliente.codice_fiscale}
                  </div>
                )}
                {cliente.iban && (
                  <div className="col-span-full">
                    <span className="text-gray-600 font-medium">IBAN:</span> 
                    <span className="font-mono text-xs ml-2">{cliente.iban}</span>
                  </div>
                )}
                {cliente.telefono && (
                  <div>
                    <span className="text-gray-600 font-medium">Tel:</span> {cliente.telefono}
                  </div>
                )}
                {cliente.cellulare && (
                  <div>
                    <span className="text-gray-600 font-medium">Cell:</span> {cliente.cellulare}
                  </div>
                )}
                {cliente.email && (
                  <div>
                    <span className="text-gray-600 font-medium">Email:</span> 
                    <a href={`mailto:${cliente.email}`} className="text-blue-600 hover:underline ml-1">
                      {cliente.email}
                    </a>
                  </div>
                )}
                {cliente.pec && (
                  <div>
                    <span className="text-gray-600 font-medium">PEC:</span> {cliente.pec}
                  </div>
                )}
                {cliente.sito_web && (
                  <div>
                    <span className="text-gray-600 font-medium">Sito:</span> 
                    <a href={cliente.sito_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                      {cliente.sito_web}
                    </a>
                  </div>
                )}
                {cliente.referente && (
                  <div>
                    <span className="text-gray-600 font-medium">Referente:</span> {cliente.referente}
                  </div>
                )}
                {(cliente.indirizzo || cliente.citta) && (
                  <div className="col-span-full">
                    <span className="text-gray-600 font-medium">Indirizzo:</span> 
                    {cliente.indirizzo && <span> {cliente.indirizzo}</span>}
                    {cliente.cap && <span>, {cliente.cap}</span>}
                    {cliente.citta && <span> {cliente.citta}</span>}
                    {cliente.provincia && <span> ({cliente.provincia})</span>}
                  </div>
                )}
              </div>

              {cliente.note && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">📝 Note:</span> {cliente.note}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clienti;