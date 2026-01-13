import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { exportCorsiVisitePDF } from '../utils/exports/exportCorsiVisitePDF';

function CorsiVisite() {
  // ✅ USA IL CONTEXT
  const { certificazioni, lavoratori, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({tipo: 'corso'});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroLavoratoreCorsi, setFiltroLavoratoreCorsi] = useState('');
  const [showStoricoModal, setShowStoricoModal] = useState(false);
  const [corsoSelezionato, setCorsoSelezionato] = useState(null);
  const [dataAggiornamento, setDataAggiornamento] = useState(new Date().toISOString().split('T')[0]);
  const [nuovaScadenza, setNuovaScadenza] = useState('');
  const [notaAggiornamento, setNotaAggiornamento] = useState('');
  const [saving, setSaving] = useState(false);

  const tipi = ['Rischio alto 16h', 'Antincendio', 'Primo Soccorso', 'Cond. Escavatori',
    'RSPP', 'RLS', 'PIMUS', 'Preposto', 'P. Cappotti', 'Patentino Perforatore', 'Visita Medica'];

  // ✅ MOSTRA LOADING
  if (loading.certificazioni || loading.lavoratori) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento corsi e visite...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ✅ SALVA su Supabase
  const handleSave = async () => {
    if (!formData.lavoratoreId || !formData.nome) {
      alert('⚠️ Lavoratore e tipo sono obbligatori!');
      return;
    }

    setSaving(true);

    const dataForSupabase = {
  lavoratore_id: formData.lavoratoreId || formData.lavoratore_id,
  nome: formData.nome,
  nome_certificazione: formData.nome, // ✅ Aggiungi questo
  tipo: formData.tipo,
  data_conseguimento: formData.dataConseguimento || formData.data_conseguimento,
  data_scadenza: formData.dataScadenza || formData.data_scadenza,
  ente_rilascio: formData.enteRilascio || formData.ente_rilascio,
  numero_attestato: formData.numeroAttestato || formData.numero_attestato,
  note: formData.note || '',
  storico: formData.storico || []
};

    let result;
    if (editingId) {
      result = await updateRecord('certificazioni', editingId, dataForSupabase);
    } else {
      result = await addRecord('certificazioni', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({tipo: 'corso'});
      setEditingId(null);
      alert(editingId ? '✅ Corso/Visita aggiornato!' : '✅ Corso/Visita aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA da Supabase
  const handleDelete = async (cv) => {
    if (!confirm(`❌ Eliminare ${cv.nome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('certificazioni', cv.id);

    if (result.success) {
      alert('✅ Corso/Visita eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (cv) => {
  setFormData({
    lavoratoreId: cv.lavoratore_id,
    lavoratore_id: cv.lavoratore_id,
    nome: cv.nome || cv.nome_certificazione,
    tipo: cv.tipo,
    dataConseguimento: cv.data_conseguimento,
    data_conseguimento: cv.data_conseguimento,
    dataScadenza: cv.data_scadenza,
    data_scadenza: cv.data_scadenza,
    enteRilascio: cv.ente_rilascio,
    ente_rilascio: cv.ente_rilascio,
    numeroAttestato: cv.numero_attestato,
    numero_attestato: cv.numero_attestato,
    note: cv.note,
    storico: cv.storico || []
  });
  setEditingId(cv.id);
  setShowForm(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  // ✅ AGGIUNGI AGGIORNAMENTO ALLO STORICO
  const aggiungiAggiornamento = async (corsoId, lavoratoreId) => {
    if (!nuovaScadenza) {
      return alert('⚠️ Inserisci la nuova scadenza');
    }

    const corso = certificazioni.find(c => c.id === corsoId && c.lavoratore_id === lavoratoreId);
    if (!corso) return;

    const nuovoStorico = {
      id: Date.now().toString(),
      dataAggiornamento,
      scadenzaPrecedente: corso.data_scadenza,
      nuovaScadenza,
      nota: notaAggiornamento
    };

    const nuovoStoricoArray = [...(corso.storico || []), nuovoStorico];

    const result = await updateRecord('certificazioni', corsoId, {
      data_scadenza: nuovaScadenza,
      storico: nuovoStoricoArray
    });

    if (result.success) {
      setDataAggiornamento(new Date().toISOString().split('T')[0]);
      setNuovaScadenza('');
      setNotaAggiornamento('');
      setCorsoSelezionato(result.data); // Aggiorna il corso selezionato
      alert('✅ Aggiornamento registrato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ FILTRI CON USEMEMO
  const filteredCorsiVisite = useMemo(() => {
    let filtered = certificazioni;

    // Filtro per lavoratore
    if (filtroLavoratoreCorsi) {
      filtered = filtered.filter(cv => cv.lavoratore_id === filtroLavoratoreCorsi);
    }

    // Filtro per search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cv => {
        const lav = lavoratori.find(l => l.id === cv.lavoratore_id);
        const nomeLav = lav ? `${lav.nome} ${lav.cognome}`.toLowerCase() : '';
        return nomeLav.includes(term) || cv.nome?.toLowerCase().includes(term);
      });
    }

    return filtered;
  }, [certificazioni, filtroLavoratoreCorsi, searchTerm, lavoratori]);
  // ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportCorsiVisitePDF({
      certificazioni: filteredCorsiVisite,
      lavoratori
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-4 flex-1">
          <input
            type="text"
            placeholder="🔍 Cerca per nome lavoratore..."
            className="border rounded px-3 py-2 flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 min-w-[200px]"
            value={filtroLavoratoreCorsi}
            onChange={(e) => setFiltroLavoratoreCorsi(e.target.value)}
          >
            <option value="">Tutti i lavoratori</option>
            {lavoratori.map(l => (
              <option key={l.id} value={l.id}>
                {l.cognome} {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({tipo: 'corso'});
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            ➕ Nuovo
          </button>
          <button 
            onClick={esportaPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap"
          >
            📄 Esporta PDF
          </button>
        </div>
      </div>

      {filteredCorsiVisite.length > 0 && filtroLavoratoreCorsi && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            📊 Visualizzati {filteredCorsiVisite.length} corsi/visite per il lavoratore selezionato
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Corso/Visita
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <select 
              className="border rounded px-3 py-2" 
              value={formData.lavoratoreId || ''}
              onChange={(e) => setFormData({...formData, lavoratoreId: e.target.value})}
              disabled={saving}
            >
              <option value="">Lavoratore *</option>
              {lavoratori.map(l => (
                <option key={l.id} value={l.id}>{l.cognome} {l.nome}</option>
              ))}
            </select>
            <select 
              className="border rounded px-3 py-2" 
              value={formData.nome || ''}
              onChange={(e) => setFormData({...formData, nome: e.target.value, 
                tipo: e.target.value === 'Visita Medica' ? 'visita' : 'corso'})}
              disabled={saving}
            >
              <option value="">Tipo *</option>
              {tipi.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input 
              type="date" 
              className="border rounded px-3 py-2" 
              placeholder="Data Conseguimento"
              value={formData.dataConseguimento || ''}
              onChange={(e) => setFormData({...formData, dataConseguimento: e.target.value})}
              disabled={saving}
            />
            <input 
              type="date" 
              className="border rounded px-3 py-2" 
              placeholder="Data Scadenza"
              value={formData.dataScadenza || ''}
              onChange={(e) => setFormData({...formData, dataScadenza: e.target.value})}
              disabled={saving}
            />
            <input 
  type="text" 
  placeholder="Numero Attestato" 
  className="border rounded px-3 py-2"
  value={formData.numeroAttestato || ''}
  onChange={(e) => setFormData({...formData, numeroAttestato: e.target.value})}
  disabled={saving}
/>
<input 
  type="text" 
  placeholder="Ente Rilascio" 
  className="border rounded px-3 py-2"
  value={formData.enteRilascio || ''}
  onChange={(e) => setFormData({...formData, enteRilascio: e.target.value})}
  disabled={saving}
/>
<textarea
  placeholder="Note (opzionale)"
  className="border rounded px-3 py-2 col-span-2"
  rows="2"
  value={formData.note || ''}
  onChange={(e) => setFormData({...formData, note: e.target.value})}
  disabled={saving}
/>
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
                setFormData({tipo: 'corso'});
                setEditingId(null);
              }}
              disabled={saving}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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
    <th className="px-4 py-3 text-left text-sm">Lavoratore</th>
    <th className="px-4 py-3 text-left text-sm">Nome</th>
    <th className="px-4 py-3 text-left text-sm">N. Attestato</th>
    <th className="px-4 py-3 text-left text-sm">Conseguimento</th>
    <th className="px-4 py-3 text-left text-sm">Scadenza</th>
    <th className="px-4 py-3 text-left text-sm">Stato</th>
    <th className="px-4 py-3 text-left text-sm">Azioni</th>
  </tr>
</thead>
          <tbody>
            {filteredCorsiVisite.map(cv => {
              const lav = lavoratori.find(l => l.id === cv.lavoratore_id);
              const oggi = new Date();
              const scad = new Date(cv.data_scadenza);
              const giorni = Math.ceil((scad - oggi) / (1000 * 60 * 60 * 24));
              let stato = 'Valido', col = 'text-green-600';
              if (giorni < 0) { stato = 'Scaduto'; col = 'text-red-600'; }
              else if (giorni <= 30) { stato = 'In scadenza'; col = 'text-orange-600'; }
              
              return (
                <tr key={cv.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${cv.tipo === 'corso' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {cv.tipo === 'corso' ? 'Corso' : 'Visita'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{lav ? `${lav.nome} ${lav.cognome}` : 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{cv.nome}</td>
                  <td className="px-4 py-3 text-sm">{cv.numero_attestato || '-'}</td>  
                  <td className="px-4 py-3 text-sm">{formatDate(cv.data_conseguimento)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(cv.data_scadenza)}</td>
                  <td className="px-4 py-3 text-sm"><span className={col}>{stato}</span></td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      onClick={() => {
                        setCorsoSelezionato(cv);
                        setShowStoricoModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 mr-2"
                      title="Visualizza storico"
                    >
                      📜
                    </button>
                    <button 
                      onClick={() => handleEdit(cv)} 
                      className="text-blue-600 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(cv)} 
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
        {filteredCorsiVisite.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">🎓</p>
            <p>Nessun corso/visita trovato</p>
          </div>
        )}
      </div>

      {/* Modal Storico */}
      {showStoricoModal && corsoSelezionato && (
        <StoricoModal
          corso={corsoSelezionato}
          lavoratori={lavoratori}
          onClose={() => {
            setShowStoricoModal(false);
            setCorsoSelezionato(null);
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
  corso, 
  lavoratori, 
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
  const lavoratore = lavoratori.find(l => l.id === corso.lavoratore_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          📜 Storico - {corso.nome} - {lavoratore?.nome} {lavoratore?.cognome}
        </h3>

        {/* Scadenza attuale */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Scadenza Attuale</div>
          <div className="text-2xl font-bold text-blue-900">{formatDate(corso.data_scadenza)}</div>
        </div>

        {/* Form Nuovo Aggiornamento */}
        <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
          <h4 className="font-medium mb-3 text-green-900">➕ Registra Aggiornamento</h4>
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
                onClick={() => aggiungiAggiornamento(corso.id, corso.lavoratore_id)}
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
              placeholder="Es: Corso rinnovato presso ente X..."
              value={notaAggiornamento}
              onChange={(e) => setNotaAggiornamento(e.target.value)} 
            />
          </div>
        </div>

        {/* Storico Aggiornamenti */}
        <div>
          <h4 className="font-semibold mb-3">Storico Aggiornamenti ({(corso.storico || []).length})</h4>
          {(corso.storico || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Nessun aggiornamento registrato. Usa il form sopra per registrare aggiornamenti.
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
                  {[...(corso.storico || [])].reverse().map(agg => (
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

export default CorsiVisite;