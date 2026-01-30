import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate } from '../utils/dateUtils';
import { exportManutenzionePDF } from '../utils/exports/exportManutenzionePDF';

function ManutenzioneMezzi() {
  const { 
    veicoli, 
    fornitori = [],
    manutenzioniVeicoli = [], 
    loading, 
    addRecord, 
    updateRecord, 
    deleteRecord 
  } = useData();

  const [selectedVeicolo, setSelectedVeicolo] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('storico'); // 'storico' | 'programmate'

  const [formData, setFormData] = useState({
    veicolo_id: '',
    data_intervento: '',
    tipo_intervento: '',
    descrizione: '',
    km_veicolo: '',
    prossima_data: '',
    prossimi_km: '',
    intervallo_km: '',
    intervallo_mesi: '',
    alert_anticipo_giorni: 30,
    alert_anticipo_km: 1000,
    costo: '',
    fornitore: '',
    fattura_numero: '',
    note: '',
    completato: true
  });

  const tipiIntervento = [
    { value: 'tagliando', label: '🔧 Tagliando', intervallo_km: 15000, intervallo_mesi: 12 },
    { value: 'cambio_olio', label: '🛢️ Cambio Olio', intervallo_km: 10000, intervallo_mesi: 6 },
    { value: 'cambio_gomme', label: '🚗 Cambio Gomme', intervallo_mesi: 6 },
    { value: 'filtri', label: '🌬️ Filtri', intervallo_km: 15000, intervallo_mesi: 12 },
    { value: 'freni', label: '🛑 Freni', intervallo_km: 30000 },
    { value: 'frizione', label: '⚙️ Frizione', intervallo_km: 80000 },
    { value: 'batteria', label: '🔋 Batteria', intervallo_mesi: 36 },
    { value: 'revisione_interna', label: '✅ Revisione Interna', intervallo_mesi: 12 },
    { value: 'altro', label: '🔨 Altro' }
  ];



  // Filtra manutenzioni
  const filteredManutenzioni = useMemo(() => {
    let filtered = manutenzioniVeicoli;

    // Filtra per veicolo
    if (selectedVeicolo) {
      filtered = filtered.filter(m => m.veicolo_id === selectedVeicolo);
    }

    // Filtra per tipo
    if (selectedTipo) {
      filtered = filtered.filter(m => m.tipo_intervento === selectedTipo);
    }

    // Filtra per view mode
    if (viewMode === 'storico') {
      filtered = filtered.filter(m => m.completato === true);
    } else {
      filtered = filtered.filter(m => m.completato === false);
    }

    return filtered.sort((a, b) => new Date(b.data_intervento) - new Date(a.data_intervento));
  }, [manutenzioniVeicoli, selectedVeicolo, selectedTipo, viewMode]);

  // Calcola statistiche
  const statistiche = useMemo(() => {
    const veicoloFiltrato = selectedVeicolo 
      ? manutenzioniVeicoli.filter(m => m.veicolo_id === selectedVeicolo && m.completato)
      : manutenzioniVeicoli.filter(m => m.completato);

    const costoTotale = veicoloFiltrato.reduce((sum, m) => sum + (parseFloat(m.costo) || 0), 0);
    const numInterventi = veicoloFiltrato.length;

    // Conta manutenzioni in scadenza
    const oggi = new Date();
    const inScadenza = manutenzioniVeicoli.filter(m => {
      if (!m.prossima_data || !m.completato) return false;
      const prossima = new Date(m.prossima_data);
      const giorniMancanti = Math.ceil((prossima - oggi) / (1000 * 60 * 60 * 24));
      const alertGiorni = m.alert_anticipo_giorni || 30;
      return giorniMancanti >= 0 && giorniMancanti <= alertGiorni;
    }).length;

    const scadute = manutenzioniVeicoli.filter(m => {
      if (!m.prossima_data || !m.completato) return false;
      const prossima = new Date(m.prossima_data);
      return prossima < oggi;
    }).length;

    const programmate = manutenzioniVeicoli.filter(m => !m.completato).length;

    return { costoTotale, numInterventi, inScadenza, scadute, programmate };
  }, [manutenzioniVeicoli, selectedVeicolo]);

  //LOADING CHECK
  if (loading.veicoli || loading.manutenzioniVeicoli || loading.fornitori) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento manutenzioni...</p>
        </div>
      </div>
    );
  }


  // Salva manutenzione
  const handleSave = async () => {
    if (!formData.veicolo_id || !formData.data_intervento || !formData.tipo_intervento) {
      alert('⚠️ Compila i campi obbligatori: Veicolo, Data, Tipo intervento');
      return;
    }

    setSaving(true);

    const dataToSave = {
  azienda: localStorage.getItem('selectedAzienda'), 
  veicolo_id: formData.veicolo_id,
  data_intervento: formData.data_intervento,
  tipo_intervento: formData.tipo_intervento,
  descrizione: formData.descrizione || null,
  km_veicolo: formData.km_veicolo ? parseInt(formData.km_veicolo) : null,
  prossima_data: formData.prossima_data || null,
  prossimi_km: formData.prossimi_km ? parseInt(formData.prossimi_km) : null,
  intervallo_km: formData.intervallo_km ? parseInt(formData.intervallo_km) : null,
  intervallo_mesi: formData.intervallo_mesi ? parseInt(formData.intervallo_mesi) : null,
  alert_anticipo_giorni: formData.alert_anticipo_giorni ? parseInt(formData.alert_anticipo_giorni) : 30,
  alert_anticipo_km: formData.alert_anticipo_km ? parseInt(formData.alert_anticipo_km) : 1000,
  costo: formData.costo ? parseFloat(formData.costo) : null,
  fornitore: formData.fornitore || null,
  fattura_numero: formData.fattura_numero || null,
  note: formData.note || null,
  completato: formData.completato ?? true
};
    let result;
    if (editingId) {
      result = await updateRecord('manutenzioniVeicoli', editingId, dataToSave);
    } else {
      result = await addRecord('manutenzioniVeicoli', dataToSave);
    }

    setSaving(false);

    if (result.success) {
      setShowForm(false);
      setFormData({
        veicolo_id: '',
        data_intervento: '',
        tipo_intervento: '',
        descrizione: '',
        km_veicolo: '',
        prossima_data: '',
        prossimi_km: '',
        intervallo_km: '',
        intervallo_mesi: '',
        alert_anticipo_giorni: 30,
        alert_anticipo_km: 1000,
        costo: '',
        fornitore: '',
        fattura_numero: '',
        note: '',
        completato: true
      });
      setEditingId(null);
      alert(editingId ? '✅ Manutenzione aggiornata!' : '✅ Manutenzione registrata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (manutenzione) => {
    setFormData({
      veicolo_id: manutenzione.veicolo_id,
      data_intervento: manutenzione.data_intervento,
      tipo_intervento: manutenzione.tipo_intervento,
      descrizione: manutenzione.descrizione || '',
      km_veicolo: manutenzione.km_veicolo || '',
      prossima_data: manutenzione.prossima_data || '',
      prossimi_km: manutenzione.prossimi_km || '',
      intervallo_km: manutenzione.intervallo_km || '',
      intervallo_mesi: manutenzione.intervallo_mesi || '',
      alert_anticipo_giorni: manutenzione.alert_anticipo_giorni || 30,
      alert_anticipo_km: manutenzione.alert_anticipo_km || 1000,
      costo: manutenzione.costo || '',
      fornitore: manutenzione.fornitore || '',
      fattura_numero: manutenzione.fattura_numero || '',
      note: manutenzione.note || '',
      completato: manutenzione.completato ?? true
    });
    setEditingId(manutenzione.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (manutenzione) => {
    const veicolo = veicoli.find(v => v.id === manutenzione.veicolo_id);
    if (!confirm(`❌ Eliminare questa manutenzione di ${veicolo?.targa}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('manutenzioniVeicoli', manutenzione.id);
    if (result.success) {
      alert('✅ Manutenzione eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Auto-compila intervalli suggeriti
  const handleTipoChange = (tipo) => {
    const tipoInfo = tipiIntervento.find(t => t.value === tipo);
    if (tipoInfo) {
      setFormData(prev => ({
        ...prev,
        tipo_intervento: tipo,
        intervallo_km: tipoInfo.intervallo_km || prev.intervallo_km,
        intervallo_mesi: tipoInfo.intervallo_mesi || prev.intervallo_mesi
      }));
    } else {
      setFormData(prev => ({ ...prev, tipo_intervento: tipo }));
    }
  };

  // Calcola prossima data automaticamente
  const calcolaProssimaData = () => {
    if (formData.data_intervento && formData.intervallo_mesi) {
      const dataIntervento = new Date(formData.data_intervento);
      dataIntervento.setMonth(dataIntervento.getMonth() + parseInt(formData.intervallo_mesi));
      const prossimaData = dataIntervento.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, prossima_data: prossimaData }));
    }
  };

  // Calcola prossimi km automaticamente
  const calcolaProssimiKm = () => {
    if (formData.km_veicolo && formData.intervallo_km) {
      const prossimiKm = parseInt(formData.km_veicolo) + parseInt(formData.intervallo_km);
      setFormData(prev => ({ ...prev, prossimi_km: prossimiKm }));
    }
  };

  // Calcola stato scadenza
  const calcolaStatoScadenza = (manutenzione) => {
    if (!manutenzione.prossima_data || !manutenzione.completato) {
      return { stato: 'ok', label: '-', color: 'bg-gray-100' };
    }

    const oggi = new Date();
    const prossima = new Date(manutenzione.prossima_data);
    const giorniMancanti = Math.ceil((prossima - oggi) / (1000 * 60 * 60 * 24));
    const alertGiorni = manutenzione.alert_anticipo_giorni || 30;

    if (giorniMancanti < 0) {
      return { 
        stato: 'scaduto', 
        label: `Scaduto da ${Math.abs(giorniMancanti)}g`, 
        color: 'bg-red-100 text-red-700' 
      };
    } else if (giorniMancanti <= alertGiorni) {
      return { 
        stato: 'in_scadenza', 
        label: `${giorniMancanti} giorni`, 
        color: 'bg-yellow-100 text-yellow-700' 
      };
    } else {
      return { 
        stato: 'ok', 
        label: `${giorniMancanti} giorni`, 
        color: 'bg-green-100 text-green-700' 
      };
    }
  };

  const getVeicoloInfo = (veicoloId) => {
    const veicolo = veicoli.find(v => v.id === veicoloId);
    return veicolo ? `${veicolo.targa} - ${veicolo.marca} ${veicolo.modello}` : 'N/D';
  };

  const getTipoLabel = (tipo) => {
    const tipoInfo = tipiIntervento.find(t => t.value === tipo);
    return tipoInfo ? tipoInfo.label : tipo;
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!selectedVeicolo) {
      alert('⚠️ Seleziona un veicolo per esportare il registro manutenzioni');
      return;
    }

    const veicolo = veicoli.find(v => v.id === selectedVeicolo);
    const manutenzioniVeicolo = manutenzioniVeicoli.filter(m => m.veicolo_id === selectedVeicolo);

    if (!veicolo) {
      alert('❌ Veicolo non trovato');
      return;
    }

    exportManutenzionePDF(veicolo, manutenzioniVeicolo);
  };

  return (
    <div className="space-y-4">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Totale Interventi</p>
          <p className="text-3xl font-bold text-blue-900">{statistiche.numInterventi}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Costo Totale</p>
          <p className="text-2xl font-bold text-purple-900">€{statistiche.costoTotale.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600 font-medium">Scadute</p>
          <p className="text-3xl font-bold text-red-900">{statistiche.scadute}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600 font-medium">In Scadenza</p>
          <p className="text-3xl font-bold text-yellow-900">{statistiche.inScadenza}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-medium">Programmate</p>
          <p className="text-3xl font-bold text-green-900">{statistiche.programmate}</p>
        </div>
      </div>

      {/* Filtri e Azioni */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            className="border rounded px-3 py-2"
            value={selectedVeicolo}
            onChange={(e) => setSelectedVeicolo(e.target.value)}
          >
            <option value="">🚛 Tutti i Veicoli</option>
            {veicoli.map(v => (
              <option key={v.id} value={v.id}>
                {v.targa} - {v.marca} {v.modello}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-3 py-2"
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
          >
            <option value="">🔧 Tutti i Tipi</option>
            {tipiIntervento.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode('storico')}
              className={`px-4 py-2 rounded ${
                viewMode === 'storico' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Storico
            </button>
            <button
              onClick={() => setViewMode('programmate')}
              className={`px-4 py-2 rounded ${
                viewMode === 'programmate' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📅 Programmate
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              disabled={!selectedVeicolo}
              title={!selectedVeicolo ? 'Seleziona un veicolo per esportare' : 'Esporta registro manutenzioni in PDF'}
            >
              📄 Export PDF
            </button>
          </div>

          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                veicolo_id: selectedVeicolo || '',
                data_intervento: new Date().toISOString().split('T')[0],
                tipo_intervento: '',
                descrizione: '',
                km_veicolo: '',
                prossima_data: '',
                prossimi_km: '',
                intervallo_km: '',
                intervallo_mesi: '',
                alert_anticipo_giorni: 30,
                alert_anticipo_km: 1000,
                costo: '',
                fornitore: '',
                fattura_numero: '',
                note: '',
                completato: viewMode === 'storico'
              });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Nuova Manutenzione
          </button>
        </div>
      </div>

      {/* Form Manutenzione */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Manutenzione
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Colonna 1: Dati Base */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">📋 Dati Base</h4>
              
              <div>
                <label className="block text-sm font-medium mb-1">Veicolo *</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={formData.veicolo_id}
                  onChange={(e) => setFormData({...formData, veicolo_id: e.target.value})}
                  disabled={saving}
                  required
                >
                  <option value="">Seleziona veicolo</option>
                  {veicoli.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.targa} - {v.marca} {v.modello}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Intervento *</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={formData.data_intervento}
                  onChange={(e) => setFormData({...formData, data_intervento: e.target.value})}
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo Intervento *</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={formData.tipo_intervento}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  disabled={saving}
                  required
                >
                  <option value="">Seleziona tipo</option>
                  {tipiIntervento.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  rows="3"
                  placeholder="Dettagli intervento..."
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">KM Veicolo</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="es: 45000"
                  value={formData.km_veicolo}
                  onChange={(e) => setFormData({...formData, km_veicolo: e.target.value})}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Colonna 2: Programmazione */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">📅 Prossimo Intervento</h4>

              <div>
                <label className="block text-sm font-medium mb-1">Intervallo KM</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="es: 10000"
                  value={formData.intervallo_km}
                  onChange={(e) => setFormData({...formData, intervallo_km: e.target.value})}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">Ogni quanti km ripetere</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prossimi KM</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="es: 55000"
                    value={formData.prossimi_km}
                    onChange={(e) => setFormData({...formData, prossimi_km: e.target.value})}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={calcolaProssimiKm}
                    className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                    title="Calcola automaticamente"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Intervallo Mesi</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="es: 12"
                  value={formData.intervallo_mesi}
                  onChange={(e) => setFormData({...formData, intervallo_mesi: e.target.value})}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">Ogni quanti mesi ripetere</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prossima Data</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={formData.prossima_data}
                    onChange={(e) => setFormData({...formData, prossima_data: e.target.value})}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={calcolaProssimaData}
                    className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                    title="Calcola automaticamente"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Alert Giorni</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="30"
                    value={formData.alert_anticipo_giorni}
                    onChange={(e) => setFormData({...formData, alert_anticipo_giorni: e.target.value})}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alert KM</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="1000"
                    value={formData.alert_anticipo_km}
                    onChange={(e) => setFormData({...formData, alert_anticipo_km: e.target.value})}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Colonna 3: Costi */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">💰 Costi</h4>

              <div>
                <label className="block text-sm font-medium mb-1">Costo €</label>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="es: 250.00"
                  value={formData.costo}
                  onChange={(e) => setFormData({...formData, costo: e.target.value})}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fornitore</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={formData.fornitore || ''}
                  onChange={(e) => setFormData({...formData, fornitore: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Seleziona fornitore</option>
                  {fornitori.map(f => (
                    <option key={f.id} value={f.ragione_sociale}>
                      {f.ragione_sociale}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Numero Fattura</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="es: FT2024/001"
                  value={formData.fattura_numero}
                  onChange={(e) => setFormData({...formData, fattura_numero: e.target.value})}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  rows="5"
                  placeholder="Note aggiuntive..."
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="completato"
                  checked={formData.completato}
                  onChange={(e) => setFormData({...formData, completato: e.target.checked})}
                  disabled={saving}
                />
                <label htmlFor="completato" className="text-sm">
                  Intervento completato
                </label>
              </div>
            </div>
          </div>

          {/* Bottoni Form */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                  veicolo_id: '',
                  data_intervento: '',
                  tipo_intervento: '',
                  descrizione: '',
                  km_veicolo: '',
                  prossima_data: '',
                  prossimi_km: '',
                  intervallo_km: '',
                  intervallo_mesi: '',
                  alert_anticipo_giorni: 30,
                  alert_anticipo_km: 1000,
                  costo: '',
                  fornitore: '',
                  fattura_numero: '',
                  note: '',
                  completato: true
                });
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : (editingId ? 'Aggiorna' : 'Salva')}
            </button>
          </div>
        </div>
      )}

      {/* Tabella Manutenzioni */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Veicolo</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Descrizione</th>
              <th className="px-4 py-3 text-left">KM</th>
              {viewMode === 'storico' && (
                <>
                  <th className="px-4 py-3 text-left">Prossima</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                </>
              )}
              <th className="px-4 py-3 text-left">Costo</th>
              <th className="px-4 py-3 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredManutenzioni.map(m => {
              const statoScadenza = calcolaStatoScadenza(m);
              return (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(m.data_intervento)}</td>
                  <td className="px-4 py-3 text-sm">{getVeicoloInfo(m.veicolo_id)}</td>
                  <td className="px-4 py-3">{getTipoLabel(m.tipo_intervento)}</td>
                  <td className="px-4 py-3 text-sm">{m.descrizione || '-'}</td>
                  <td className="px-4 py-3">{m.km_veicolo || '-'}</td>
                  {viewMode === 'storico' && (
                    <>
                      <td className="px-4 py-3 text-sm">
                        {m.prossima_data ? (
                          <div>
                            <div>{formatDate(m.prossima_data)}</div>
                            {m.prossimi_km && (
                              <div className="text-xs text-gray-500">{m.prossimi_km} km</div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${statoScadenza.color}`}>
                          {statoScadenza.label}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {m.costo ? `€${parseFloat(m.costo).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-blue-600 mr-2 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
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

        {filteredManutenzioni.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">🔧</p>
            <p>Nessuna manutenzione trovata</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManutenzioneMezzi;