import { useState } from 'react';
import { useData } from '../contexts/DataContext';

function Certificazioni() {
  const { 
    documenti = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [showStoricoModal, setShowStoricoModal] = useState(false);
  const [certificazioneSelezionata, setCertificazioneSelezionata] = useState(null);
  const [dataAggiornamento, setDataAggiornamento] = useState(new Date().toISOString().split('T')[0]);
  const [nuovaScadenza, setNuovaScadenza] = useState('');
  const [notaAggiornamento, setNotaAggiornamento] = useState('');
  const [saving, setSaving] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!formData.tipo || !formData.nome) {
      return alert('⚠️ Compila i campi obbligatori (Tipo e Nome)');
    }

    setSaving(true);

    const dataForSupabase = {
      tipo: formData.tipo,
      nome: formData.nome,
      data_emissione: formData.dataEmissione || null,
      data_scadenza: formData.dataScadenza || null,
      numero_documento: formData.numeroDocumento || null,
      ente_rilascio: formData.enteRilascio || null,
      note: formData.note || null,
      storico: formData.storico || []
    };

    let result;
    if (editingId) {
      result = await updateRecord('documenti', editingId, dataForSupabase);
    } else {
      result = await addRecord('documenti', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Certificazione aggiornata!' : '✅ Certificazione creata!');
      setShowForm(false);
      setFormData({});
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (doc) => {
    setFormData({
      tipo: doc.tipo,
      nome: doc.nome,
      dataEmissione: doc.data_emissione,
      dataScadenza: doc.data_scadenza,
      numeroDocumento: doc.numero_documento,
      enteRilascio: doc.ente_rilascio,
      note: doc.note,
      storico: doc.storico || []
    });
    setEditingId(doc.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (doc) => {
    if (!confirm(`❌ Eliminare ${doc.nome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('documenti', doc.id);

    if (result.success) {
      alert('✅ Certificazione eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const aggiungiAggiornamento = async (certificazioneId) => {
    if (!nuovaScadenza) {
      return alert('⚠️ Inserisci la nuova scadenza');
    }

    const certificazione = documenti.find(d => d.id === certificazioneId);
    if (!certificazione) return;

    const nuovoStorico = {
      id: Date.now().toString(),
      dataAggiornamento,
      scadenzaPrecedente: certificazione.data_scadenza,
      nuovaScadenza,
      nota: notaAggiornamento
    };

    const result = await updateRecord('documenti', certificazioneId, {
      data_scadenza: nuovaScadenza,
      storico: [...(certificazione.storico || []), nuovoStorico]
    });

    if (result.success) {
      alert('✅ Aggiornamento registrato!');
      setDataAggiornamento(new Date().toISOString().split('T')[0]);
      setNuovaScadenza('');
      setNotaAggiornamento('');
      setCertificazioneSelezionata(result.data);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  if (loading.documenti) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento certificazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button 
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
          setFormData({});
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ➕ Nuova Certificazione
      </button>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Certificazione
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.tipo || ''}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona tipo</option>
                <option value="contratto">Contratto</option>
                <option value="certificato">Certificato</option>
                <option value="autorizzazione">Autorizzazione</option>
                <option value="durc">DURC</option>
                <option value="visura">Visura</option>
                <option value="polizza">Polizza Assicurativa</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input 
                type="text" 
                placeholder="Nome certificazione" 
                className="border rounded px-3 py-2 w-full"
                value={formData.nome || ''} 
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Emissione</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataEmissione || ''}
                onChange={(e) => setFormData({...formData, dataEmissione: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Scadenza</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full" 
                value={formData.dataScadenza || ''}
                onChange={(e) => setFormData({...formData, dataScadenza: e.target.value})}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Numero Documento</label>
              <input 
                type="text" 
                placeholder="Es: ABC123/2025" 
                className="border rounded px-3 py-2 w-full"
                value={formData.numeroDocumento || ''} 
                onChange={(e) => setFormData({...formData, numeroDocumento: e.target.value})}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ente Rilascio</label>
              <input 
                type="text" 
                placeholder="Es: Camera di Commercio" 
                className="border rounded px-3 py-2 w-full"
                value={formData.enteRilascio || ''} 
                onChange={(e) => setFormData({...formData, enteRilascio: e.target.value})}
                disabled={saving}
              />
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

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Tipo</th>
              <th className="px-4 py-3 text-left text-sm">Nome</th>
              <th className="px-4 py-3 text-left text-sm">N. Documento</th>
              <th className="px-4 py-3 text-left text-sm">Ente Rilascio</th>
              <th className="px-4 py-3 text-left text-sm">Emissione</th>
              <th className="px-4 py-3 text-left text-sm">Scadenza</th>
              <th className="px-4 py-3 text-left text-sm">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {documenti.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-4">📄</p>
                  <p>Nessuna certificazione registrata</p>
                </td>
              </tr>
            ) : (
              documenti.map(doc => (
                <tr key={doc.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded text-xs bg-blue-100">{doc.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{doc.nome}</td>
                  <td className="px-4 py-3 text-sm">{doc.numero_documento || '-'}</td>
                  <td className="px-4 py-3 text-sm">{doc.ente_rilascio || '-'}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(doc.data_emissione)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(doc.data_scadenza)}</td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      onClick={() => {
                        setCertificazioneSelezionata(doc);
                        setShowStoricoModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 mr-2"
                      title="Visualizza storico"
                    >
                      📜
                    </button>
                    <button 
                      onClick={() => handleEdit(doc)}
                      className="text-blue-600 hover:text-blue-700 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showStoricoModal && certificazioneSelezionata && (
        <StoricoModal
          certificazione={certificazioneSelezionata}
          onClose={() => {
            setShowStoricoModal(false);
            setCertificazioneSelezionata(null);
          }}
          dataAggiornamento={dataAggiornamento}
          setDataAggiornamento={setDataAggiornamento}
          nuovaScadenza={nuovaScadenza}
          setNuovaScadenza={setNuovaScadenza}
          notaAggiornamento={notaAggiornamento}
          setNotaAggiornamento={setNotaAggiornamento}
          aggiungiAggiornamento={aggiungiAggiornamento}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

function StoricoModal({ 
  certificazione, 
  onClose, 
  dataAggiornamento, 
  setDataAggiornamento, 
  nuovaScadenza, 
  setNuovaScadenza,
  notaAggiornamento,
  setNotaAggiornamento,
  aggiungiAggiornamento,
  formatDate
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          📜 Storico - {certificazione.nome}
        </h3>

        <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-medium">Tipo:</span> {certificazione.tipo}</div>
            {certificazione.numero_documento && (
              <div><span className="font-medium">N. Documento:</span> {certificazione.numero_documento}</div>
            )}
            {certificazione.ente_rilascio && (
              <div><span className="font-medium">Ente Rilascio:</span> {certificazione.ente_rilascio}</div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Scadenza Attuale</div>
          <div className="text-2xl font-bold text-blue-900">{formatDate(certificazione.data_scadenza)}</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
          <h4 className="font-medium mb-3 text-green-900">➕ Registra Aggiornamento/Rinnovo</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data Aggiornamento</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={dataAggiornamento}
                onChange={(e) => setDataAggiornamento(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nuova Scadenza *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={nuovaScadenza}
                onChange={(e) => setNuovaScadenza(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => aggiungiAggiornamento(certificazione.id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                ✓ Aggiungi
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note (opzionale)</label>
            <textarea 
              className="border rounded px-3 py-2 w-full"
              rows="2"
              placeholder="Es: Certificazione rinnovata presso ente Y, nuovo protocollo ABC123..."
              value={notaAggiornamento}
              onChange={(e) => setNotaAggiornamento(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">
            Storico Aggiornamenti ({(certificazione.storico || []).length})
          </h4>
          {(certificazione.storico || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nessun aggiornamento registrato. Usa il form sopra per registrare rinnovi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Data Aggiornamento</th>
                    <th className="px-3 py-2 text-left">Scadenza Precedente</th>
                    <th className="px-3 py-2 text-left">Nuova Scadenza</th>
                    <th className="px-3 py-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(certificazione.storico || [])].reverse().map(agg => (
                    <tr key={agg.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{formatDate(agg.dataAggiornamento)}</td>
                      <td className="px-3 py-2 text-red-600 line-through">{formatDate(agg.scadenzaPrecedente)}</td>
                      <td className="px-3 py-2 text-green-600 font-semibold">{formatDate(agg.nuovaScadenza)}</td>
                      <td className="px-3 py-2 text-gray-600">{agg.nota || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default Certificazioni;