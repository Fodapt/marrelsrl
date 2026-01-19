// src/components/Polizze.jsx
import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { exportPolizzePDF } from '../utils/exports/exportPolizzePDF';

function Polizze() {
  const { 
    polizze, 
    clienti,
    gare,
    addRecord, 
    updateRecord, 
    deleteRecord,
    loading 
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filtri
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroGara, setFiltroGara] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    tipo: 'provvisoria',
    numero_polizza: '',
    compagnia: '',
    importo_garantito: '',
    percentuale: '',
    data_emissione: '',
    data_scadenza: '',
    cliente_id: '',
    gara_id: '',
    oggetto_gara: '',
    stato: 'richiesta',
    note: ''
  });

  // ✅ DEBUG - Rimuovere dopo aver verificato
  console.log('🔍 DEBUG Polizze:', {
    clienti: clienti,
    numeroClienti: clienti?.length,
    loading: loading,
    primoCliente: clienti?.[0]
  });

  // Opzioni
  const tipiPolizza = [
    { value: 'provvisoria', label: '📄 Provvisoria', icon: '📄', color: 'blue', desc: 'Cauzione per partecipare alla gara' },
    { value: 'definitiva', label: '📋 Definitiva', icon: '📋', color: 'green', desc: 'Cauzione post-aggiudicazione' },
    { value: 'buona_esecuzione', label: '✓ Buona Esecuzione', icon: '✓', color: 'purple', desc: 'Garanzia esecuzione lavori' },
    { value: 'anticipazione', label: '💰 Anticipazione', icon: '💰', color: 'orange', desc: 'Garanzia anticipo prezzo' },
    { value: 'car', label: '🏗️ CAR', icon: '🏗️', color: 'indigo', desc: 'Assicurazione All Risks Cantiere' },
    { value: 'rct', label: '⚠️ RCT', icon: '⚠️', color: 'red', desc: 'Responsabilità Civile Terzi' },
    { value: 'fideiussione_bancaria', label: '🏦 Fideiussione Bancaria', icon: '🏦', color: 'cyan', desc: 'Fideiussione da banca' },
    { value: 'ritenuta_garanzia', label: '💳 Ritenuta Garanzia', icon: '💳', color: 'yellow', desc: 'Ritenuta di garanzia' }
  ];

  const statiPolizza = [
    { value: 'richiesta', label: '📝 Richiesta', color: 'bg-gray-100 text-gray-700' },
    { value: 'emessa', label: '✅ Emessa', color: 'bg-blue-100 text-blue-700' },
    { value: 'in_corso', label: '⏳ In Corso', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'restituita', label: '✓ Restituita', color: 'bg-green-100 text-green-700' },
    { value: 'escussa', label: '❌ Escussa', color: 'bg-red-100 text-red-700' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatCurrency = (value) => {
    if (!value) return '€ 0,00';
    return `€ ${parseFloat(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTipoInfo = (tipo) => {
    return tipiPolizza.find(t => t.value === tipo) || tipiPolizza[0];
  };

  const getStatoInfo = (stato) => {
    return statiPolizza.find(s => s.value === stato) || statiPolizza[0];
  };

  // Calcola giorni alla scadenza
  const calcolaGiorniScadenza = (dataScadenza) => {
    if (!dataScadenza) return null;
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return giorni;
  };

  const getClasseScadenza = (giorni) => {
    if (giorni === null) return '';
    if (giorni < 0) return 'bg-red-100 text-red-700';
    if (giorni <= 30) return 'bg-orange-100 text-orange-700';
    if (giorni <= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  // Filtra polizze
  const polizzeFiltrate = useMemo(() => {
    let filtered = [...polizze];

    if (filtroTipo) {
      filtered = filtered.filter(p => p.tipo === filtroTipo);
    }

    if (filtroStato) {
      filtered = filtered.filter(p => p.stato === filtroStato);
    }

    if (filtroCliente) {
      filtered = filtered.filter(p => p.cliente_id === filtroCliente);
    }

    if (filtroGara) {
      filtered = filtered.filter(p => p.gara_id === filtroGara);
    }

    return filtered.sort((a, b) => {
      // Prima per stato (in corso > emessa > richiesta > restituita > escussa)
      const ordineStato = { 'in_corso': 0, 'emessa': 1, 'richiesta': 2, 'restituita': 3, 'escussa': 4 };
      if (ordineStato[a.stato] !== ordineStato[b.stato]) {
        return ordineStato[a.stato] - ordineStato[b.stato];
      }
      // Poi per data scadenza (più vicine prima)
      if (a.data_scadenza && b.data_scadenza) {
        return new Date(a.data_scadenza) - new Date(b.data_scadenza);
      }
      return 0;
    });
  }, [polizze, filtroTipo, filtroStato, filtroCliente, filtroGara]);

  // Statistiche
  const statistiche = useMemo(() => {
    const totalePolizze = polizze.length;
    const inCorso = polizze.filter(p => p.stato === 'in_corso').length;
    
    // Stati attivi per cui controllare le scadenze (esclude solo restituita e escussa)
    const statiAttivi = ['richiesta', 'emessa', 'in_corso'];
    
    const scadenza30gg = polizze.filter(p => {
      if (!statiAttivi.includes(p.stato)) return false;
      const giorni = calcolaGiorniScadenza(p.data_scadenza);
      return giorni !== null && giorni >= 0 && giorni <= 30;
    }).length;
    
    const scadute = polizze.filter(p => {
      if (!statiAttivi.includes(p.stato)) return false;
      const giorni = calcolaGiorniScadenza(p.data_scadenza);
      return giorni !== null && giorni < 0;
    }).length;
    
    const importoTotale = polizze
      .filter(p => statiAttivi.includes(p.stato))
      .reduce((sum, p) => sum + parseFloat(p.importo_garantito || 0), 0);

    return { totalePolizze, inCorso, scadenza30gg, scadute, importoTotale };
  }, [polizze]);

  // Reset form
  const resetForm = () => {
    setFormData({
      tipo: 'provvisoria',
      numero_polizza: '',
      compagnia: '',
      importo_garantito: '',
      percentuale: '',
      data_emissione: '',
      data_scadenza: '',
      cliente_id: '',
      gara_id: '',
      oggetto_gara: '',
      stato: 'richiesta',
      note: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Salva polizza
  const handleSave = async () => {
    if (!formData.tipo || !formData.numero_polizza || !formData.compagnia) {
      return alert('⚠️ Compila i campi obbligatori:\n- Tipo\n- Numero Polizza\n- Compagnia');
    }

    setSaving(true);

    const dataToSave = {
      tipo: formData.tipo,
      numero_polizza: formData.numero_polizza,
      compagnia: formData.compagnia,
      importo_garantito: formData.importo_garantito ? parseFloat(formData.importo_garantito) : null,
      percentuale: formData.percentuale ? parseFloat(formData.percentuale) : null,
      data_emissione: formData.data_emissione || null,
      data_scadenza: formData.data_scadenza || null,
      cliente_id: formData.cliente_id || null,
      gara_id: formData.gara_id || null,
      oggetto_gara: formData.oggetto_gara || null,
      stato: formData.stato,
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('polizze', editingId, dataToSave);
    } else {
      result = await addRecord('polizze', dataToSave);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Polizza aggiornata!' : '✅ Polizza creata!');
      resetForm();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Elimina polizza
  const handleDelete = async (polizza) => {
    if (!confirm(`❌ Eliminare la polizza ${polizza.numero_polizza}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('polizze', polizza.id);
    if (result.success) {
      alert('✅ Polizza eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Edit polizza
  const handleEdit = (polizza) => {
    setFormData({
      tipo: polizza.tipo,
      numero_polizza: polizza.numero_polizza,
      compagnia: polizza.compagnia,
      importo_garantito: polizza.importo_garantito || '',
      percentuale: polizza.percentuale || '',
      data_emissione: polizza.data_emissione || '',
      data_scadenza: polizza.data_scadenza || '',
      cliente_id: polizza.cliente_id || '',
      gara_id: polizza.gara_id || '',
      oggetto_gara: polizza.oggetto_gara || '',
      stato: polizza.stato,
      note: polizza.note || ''
    });
    setEditingId(polizza.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gestione cambio gara (auto-compila oggetto e cliente)
  const handleGaraChange = (garaId) => {
    const garaSelezionata = gare.find(g => g.id === garaId);
    
    if (garaSelezionata) {
      setFormData(prev => ({
        ...prev,
        gara_id: garaId,
        oggetto_gara: garaSelezionata.titolo,
        cliente_id: garaSelezionata.cliente_id || prev.cliente_id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        gara_id: '',
        oggetto_gara: '',
      }));
    }
  };

  if (loading.polizze || loading.clienti) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento polizze...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-2xl font-bold">🛡️ Polizze Assicurative</h2>
    <p className="text-sm text-gray-600 mt-1">...</p>
  </div>
  
  {/* ✅ INVECE DI UN SINGOLO <button>, METTI QUESTO: */}
  <div className="flex gap-2">
    <button
      onClick={() => exportPolizzePDF(
  polizze, 
  gare,
  { tipo: filtroTipo, stato: filtroStato }
)}
      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
    >
      📄 Esporta PDF
    </button>
    <button
      onClick={() => setShowForm(!showForm)}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
    >
      {showForm ? '✕ Chiudi' : '+ Nuova Polizza'}
    </button>
  </div>
</div>

        {/* Statistiche */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale Polizze</div>
            <div className="text-3xl font-bold text-blue-900">{statistiche.totalePolizze}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">In Corso</div>
            <div className="text-3xl font-bold text-green-900">{statistiche.inCorso}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Scadenza ≤30gg</div>
            <div className="text-3xl font-bold text-orange-900">{statistiche.scadenza30gg}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">Scadute</div>
            <div className="text-3xl font-bold text-red-900">{statistiche.scadute}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Importo Totale</div>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(statistiche.importoTotale)}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica Polizza' : '➕ Nuova Polizza'}
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Polizza *</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                {tipiPolizza.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Numero Polizza */}
            <div>
              <label className="block text-sm font-medium mb-1">Numero Polizza *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: POL-2024-001"
                value={formData.numero_polizza}
                onChange={(e) => setFormData({...formData, numero_polizza: e.target.value})}
              />
            </div>

            {/* Compagnia */}
            <div>
              <label className="block text-sm font-medium mb-1">Compagnia Assicurativa *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: Generali, UnipolSai..."
                value={formData.compagnia}
                onChange={(e) => setFormData({...formData, compagnia: e.target.value})}
              />
            </div>

            {/* Importo */}
            <div>
              <label className="block text-sm font-medium mb-1">Importo Garantito</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                placeholder="0.00"
                value={formData.importo_garantito}
                onChange={(e) => setFormData({...formData, importo_garantito: e.target.value})}
              />
            </div>

            {/* Percentuale */}
            <div>
              <label className="block text-sm font-medium mb-1">Percentuale (%)</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: 10"
                value={formData.percentuale}
                onChange={(e) => setFormData({...formData, percentuale: e.target.value})}
              />
            </div>

            {/* Stato */}
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.stato}
                onChange={(e) => setFormData({...formData, stato: e.target.value})}
              >
                {statiPolizza.map(stato => (
                  <option key={stato.value} value={stato.value}>
                    {stato.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Emissione */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Emissione</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.data_emissione}
                onChange={(e) => setFormData({...formData, data_emissione: e.target.value})}
              />
            </div>

            {/* Data Scadenza */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Scadenza</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.data_scadenza}
                onChange={(e) => setFormData({...formData, data_scadenza: e.target.value})}
              />
            </div>

            {/* Gara Collegata */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">
                🎯 Gara Collegata (opzionale)
              </label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.gara_id}
                onChange={(e) => handleGaraChange(e.target.value)}
              >
                <option value="">-- Nessuna gara --</option>
                {(gare || []).filter(g => ['interessato', 'in_preparazione', 'presentata', 'in_valutazione', 'vinta'].includes(g.stato)).map(gara => {
                  const cliente = clienti.find(c => c.id === gara.cliente_id);
                  return (
                    <option key={gara.id} value={gara.id}>
                      {gara.codice_gara} - {gara.titolo.substring(0, 50)}... ({cliente?.ragione_sociale || 'N/D'})
                    </option>
                  );
                })}
              </select>
              {formData.gara_id && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Oggetto e cliente compilati automaticamente dalla gara
                </p>
              )}
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium mb-1">Cliente / Ente Appaltante</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.cliente_id}
                onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                disabled={loading.critical || clienti.length === 0}
              >
                <option value="">
                  {loading.critical 
                    ? "Caricamento..." 
                    : clienti.length === 0 
                      ? "Nessun cliente disponibile" 
                      : "-- Seleziona --"}
                </option>
                {!loading.critical && clienti && clienti.length > 0 && clienti.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.ragione_sociale}
                  </option>
                ))}
              </select>
              {clienti.length === 0 && !loading.critical && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Crea prima un cliente nella sezione "Clienti"
                </p>
              )}
            </div>

            {/* Oggetto Gara */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Oggetto Gara / Lavori</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Descrizione breve della gara o dei lavori garantiti"
                value={formData.oggetto_gara}
                onChange={(e) => setFormData({...formData, oggetto_gara: e.target.value})}
              />
            </div>

            {/* Note */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                rows="2"
                placeholder="Note aggiuntive..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : (editingId ? 'Aggiorna' : 'Salva')}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Tutti i tipi</option>
              {tipiPolizza.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stato</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
            >
              <option value="">Tutti gli stati</option>
              {statiPolizza.map(stato => (
                <option key={stato.value} value={stato.value}>{stato.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="">Tutti i clienti</option>
              {clienti.map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.ragione_sociale}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Gara</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroGara}
              onChange={(e) => setFiltroGara(e.target.value)}
            >
              <option value="">Tutte le gare</option>
              {(gare || []).map(gara => (
                <option key={gara.id} value={gara.id}>
                  {gara.codice_gara}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroTipo('');
                setFiltroStato('');
                setFiltroCliente('');
                setFiltroGara('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 w-full"
            >
              🔄 Reset Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">N. Polizza</th>
              <th className="px-4 py-3 text-left">Compagnia</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Gara</th>
              <th className="px-4 py-3 text-left">Importo</th>
              <th className="px-4 py-3 text-left">%</th>
              <th className="px-4 py-3 text-left">Emissione</th>
              <th className="px-4 py-3 text-left">Scadenza</th>
              <th className="px-4 py-3 text-left">Stato</th>
              <th className="px-4 py-3 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {polizzeFiltrate.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                  {filtroTipo || filtroStato || filtroCliente || filtroGara
                    ? 'Nessuna polizza trovata con i filtri selezionati'
                    : 'Nessuna polizza registrata. Clicca "+ Nuova Polizza" per iniziare.'}
                </td>
              </tr>
            ) : (
              polizzeFiltrate.map(polizza => {
                const tipoInfo = getTipoInfo(polizza.tipo);
                const statoInfo = getStatoInfo(polizza.stato);
                const cliente = clienti.find(c => c.id === polizza.cliente_id);
                const gara = (gare || []).find(g => g.id === polizza.gara_id);
                const giorniScadenza = calcolaGiorniScadenza(polizza.data_scadenza);
                const classeScadenza = getClasseScadenza(giorniScadenza);

                return (
                  <tr key={polizza.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs bg-${tipoInfo.color}-100 text-${tipoInfo.color}-700`}>
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{polizza.numero_polizza}</td>
                    <td className="px-4 py-3">{polizza.compagnia}</td>
                    <td className="px-4 py-3 text-sm">{cliente?.ragione_sociale || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {gara ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                          📋 {gara.codice_gara}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(polizza.importo_garantito)}</td>
                    <td className="px-4 py-3">{polizza.percentuale ? `${polizza.percentuale}%` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(polizza.data_emissione)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{formatDate(polizza.data_scadenza)}</div>
                      {giorniScadenza !== null && ['richiesta', 'emessa', 'in_corso'].includes(polizza.stato) && (
                        <div className={`text-xs mt-1 px-2 py-1 rounded ${classeScadenza}`}>
                          {giorniScadenza < 0 
                            ? `⚠️ Scaduta da ${Math.abs(giorniScadenza)}gg`
                            : `${giorniScadenza}gg`
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${statoInfo.color}`}>
                        {statoInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(polizza)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(polizza)}
                          className="text-red-600 hover:text-red-800"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Polizze;