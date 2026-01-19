// src/components/AttestazionSOA.jsx
import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

function AttestazioniSOA() {
 const { 
  qualificheSoa: attestazioni,
  categorieQualificate: categorieQualificate,
  addRecord, 
  updateRecord, 
  deleteRecord,
  loading 
} = useData();
const { profile } = useAuth();

  const [showFormAttestazione, setShowFormAttestazione] = useState(false);
  const [editingAttestazioneId, setEditingAttestazioneId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [showFormCategoria, setShowFormCategoria] = useState(null); // ID attestazione per cui aggiungere categoria
  const [mostraDashboard, setMostraDashboard] = useState(true);

  // Form attestazione
  const [formAttestazione, setFormAttestazione] = useState({
    attestazione_numero: '',
    organismo: '',
    data_rilascio: '',
    data_scadenza: '',
    documento_url: '',
    stato: 'Attiva' 
  });

  // Form categoria
  const [formCategoria, setFormCategoria] = useState({
    attestazione_id: '',
    categoria: '',
    classifica: '',
    importo_qualificato: '',
    note: ''
  });

 // Stati attestazione
const statiAttestazione = [
  { value: 'Attiva', label: '✅ Attiva', color: 'bg-green-100 text-green-700' },
  { value: 'Scaduta', label: '❌ Scaduta', color: 'bg-red-100 text-red-700' },
  { value: 'In rinnovo', label: '🔄 In rinnovo', color: 'bg-orange-100 text-orange-700' }
];
  // Classifiche SOA con importi
  const classifiche = [
    { value: 'I', label: 'I', importo: 258000 },
    { value: 'II', label: 'II', importo: 516000 },
    { value: 'III', label: 'III', importo: 1033000 },
    { value: 'III-bis', label: 'III-bis', importo: 1500000 },
    { value: 'IV', label: 'IV', importo: 2582000 },
    { value: 'IV-bis', label: 'IV-bis', importo: 3500000 },
    { value: 'V', label: 'V', importo: 5165000 },
    { value: 'VI', label: 'VI', importo: 10330000 },
    { value: 'VII', label: 'VII', importo: 15500000 },
    { value: 'VIII', label: 'VIII', importo: 'Illimitato' }
  ];

  // Categorie SOA complete (stesso array del componente Gare)
  const categorieSOA = [
    // Opere Generali (OG)
    { id: 'OG1', label: 'OG1 - Edifici civili e industriali', tipo: 'OG' },
    { id: 'OG2', label: 'OG2 - Restauro e manutenzione dei beni immobili', tipo: 'OG' },
    { id: 'OG3', label: 'OG3 - Strade, autostrade, ponti, viadotti', tipo: 'OG' },
    { id: 'OG4', label: 'OG4 - Opere d\'arte nel sottosuolo', tipo: 'OG' },
    { id: 'OG5', label: 'OG5 - Dighe', tipo: 'OG' },
    { id: 'OG6', label: 'OG6 - Acquedotti, gasdotti, oleodotti, opere di irrigazione', tipo: 'OG' },
    { id: 'OG7', label: 'OG7 - Opere marittime e lavori di dragaggio', tipo: 'OG' },
    { id: 'OG8', label: 'OG8 - Opere fluviali, di difesa, di sistemazione idraulica', tipo: 'OG' },
    { id: 'OG9', label: 'OG9 - Impianti per la produzione di energia elettrica', tipo: 'OG' },
    { id: 'OG10', label: 'OG10 - Impianti per la trasformazione alta/media tensione', tipo: 'OG' },
    { id: 'OG11', label: 'OG11 - Impianti tecnologici', tipo: 'OG' },
    { id: 'OG12', label: 'OG12 - Opere ed impianti di bonifica e protezione ambientale', tipo: 'OG' },
    { id: 'OG13', label: 'OG13 - Opere di ingegneria naturalistica', tipo: 'OG' },
    // Opere Specializzate (OS) - Principali
    { id: 'OS1', label: 'OS1 - Lavori in terra', tipo: 'OS' },
    { id: 'OS2-A', label: 'OS2-A - Superfici decorate di beni immobili del patrimonio culturale', tipo: 'OS' },
    { id: 'OS2-B', label: 'OS2-B - Beni culturali mobili di interesse archivistico e librario', tipo: 'OS' },
    { id: 'OS3', label: 'OS3 - Impianti idrico-sanitario, cucine, lavanderie', tipo: 'OS' },
    { id: 'OS4', label: 'OS4 - Impianti elettromeccanici trasportatori', tipo: 'OS' },
    { id: 'OS5', label: 'OS5 - Impianti pneumatici e antintrusione', tipo: 'OS' },
    { id: 'OS6', label: 'OS6 - Finiture di opere generali in materiali lignei, plastici, metallici', tipo: 'OS' },
    { id: 'OS7', label: 'OS7 - Finiture di opere generali di natura edile e tecnica', tipo: 'OS' },
    { id: 'OS8', label: 'OS8 - Opere di impermeabilizzazione', tipo: 'OS' },
    { id: 'OS9', label: 'OS9 - Impianti per la segnaletica luminosa e la sicurezza del traffico', tipo: 'OS' },
    { id: 'OS10', label: 'OS10 - Segnaletica stradale non luminosa', tipo: 'OS' },
    { id: 'OS11', label: 'OS11 - Armamento ferroviario', tipo: 'OS' },
    { id: 'OS12-A', label: 'OS12-A - Barriere stradali di sicurezza', tipo: 'OS' },
    { id: 'OS12-B', label: 'OS12-B - Barriere paramassi, fermaneve e simili', tipo: 'OS' },
    { id: 'OS13', label: 'OS13 - Strutture prefabbricate in cemento armato', tipo: 'OS' },
    { id: 'OS14', label: 'OS14 - Impianti di smaltimento e recupero rifiuti', tipo: 'OS' },
    { id: 'OS15', label: 'OS15 - Pulizia di acque marine, lacustri, fluviali', tipo: 'OS' },
    { id: 'OS16', label: 'OS16 - Impianti per centrali produzione energia elettrica', tipo: 'OS' },
    { id: 'OS17', label: 'OS17 - Linee telefoniche ed impianti di telefonia', tipo: 'OS' },
    { id: 'OS18-A', label: 'OS18-A - Componenti strutturali in acciaio', tipo: 'OS' },
    { id: 'OS18-B', label: 'OS18-B - Componenti per facciate continue', tipo: 'OS' },
    { id: 'OS19', label: 'OS19 - Impianti di reti di telecomunicazione e di trasmissioni', tipo: 'OS' },
    { id: 'OS20-A', label: 'OS20-A - Rilevamenti topografici', tipo: 'OS' },
    { id: 'OS20-B', label: 'OS20-B - Indagini geognostiche', tipo: 'OS' },
    { id: 'OS21', label: 'OS21 - Opere strutturali speciali', tipo: 'OS' },
    { id: 'OS22', label: 'OS22 - Impianti di potabilizzazione e depurazione', tipo: 'OS' },
    { id: 'OS23', label: 'OS23 - Demolizione di opere', tipo: 'OS' },
    { id: 'OS24', label: 'OS24 - Verde e arredo urbano', tipo: 'OS' },
    { id: 'OS25', label: 'OS25 - Scavi archeologici', tipo: 'OS' },
    { id: 'OS26', label: 'OS26 - Pavimentazioni e sovrastrutture speciali', tipo: 'OS' },
    { id: 'OS27', label: 'OS27 - Impianti per la trazione elettrica', tipo: 'OS' },
    { id: 'OS28', label: 'OS28 - Impianti termici e di condizionamento', tipo: 'OS' },
    { id: 'OS29', label: 'OS29 - Armamento di binari ferroviari', tipo: 'OS' },
    { id: 'OS30', label: 'OS30 - Impianti interni elettrici, telefonici, radiotelefonici', tipo: 'OS' },
    { id: 'OS31', label: 'OS31 - Impianti per la mobilità sospesa', tipo: 'OS' },
    { id: 'OS32', label: 'OS32 - Strutture in legno', tipo: 'OS' },
    { id: 'OS33', label: 'OS33 - Coperture speciali', tipo: 'OS' },
    { id: 'OS34', label: 'OS34 - Sistemi antirumore per infrastrutture di mobilità', tipo: 'OS' },
    { id: 'OS35', label: 'OS35 - Interventi a basso impatto ambientale', tipo: 'OS' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatCurrency = (value) => {
    if (!value) return '€ 0';
    if (value === 'Illimitato') return value;
    return `€ ${parseFloat(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatoInfo = (stato) => {
    return statiAttestazione.find(s => s.value === stato) || statiAttestazione[0];
  };

  // Calcola giorni alla scadenza
  const calcolaGiorniScadenza = (dataScadenza) => {
    if (!dataScadenza) return null;
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return giorni;
  };

  // Categorie possedute dall'azienda
  const categoriePossedute = useMemo(() => {
    const map = new Map();
    (categorieQualificate || []).forEach(cq => {
      const existing = map.get(cq.categoria);
      if (!existing || parseFloat(cq.importo_qualificato) > parseFloat(existing.importo_qualificato)) {
        map.set(cq.categoria, cq);
      }
    });
    return map;
  }, [categorieQualificate]);

  // Statistiche
  const statistiche = useMemo(() => {
    const totaleAttestazioni = (attestazioni || []).length;
    const attestazioniAttive = (attestazioni || []).filter(a => a.stato === 'attiva').length;
    
    const oggi = new Date();
    const scadenzaImminente = (attestazioni || []).filter(a => {
      if (a.stato !== 'attiva') return false;
      const giorni = calcolaGiorniScadenza(a.data_scadenza);
      return giorni !== null && giorni >= 0 && giorni <= 90;
    }).length;

    const totaleCategorie = 55;
    const categoriePosseduteTot = categoriePossedute.size;
    const percentualeCompletamento = Math.round((categoriePosseduteTot / totaleCategorie) * 100);

    return { 
      totaleAttestazioni, 
      attestazioniAttive, 
      scadenzaImminente, 
      categoriePosseduteTot,
      percentualeCompletamento
    };
  }, [attestazioni, categoriePossedute]);

  // Reset form attestazione
  const resetFormAttestazione = () => {
    setFormAttestazione({
      attestazione_numero: '',
      organismo: '',
      data_rilascio: '',
      data_scadenza: '',
      documento_url: '',
      stato: 'Attiva'
    });
    setEditingAttestazioneId(null);
    setShowFormAttestazione(false);
  };

  // Reset form categoria
  const resetFormCategoria = () => {
    setFormCategoria({
      attestazione_id: '',
      categoria: '',
      classifica: '',
      importo_qualificato: '',
      note: ''
    });
    setShowFormCategoria(null);
  };

  // Salva attestazione
  const handleSaveAttestazione = async () => {
    if (!formAttestazione.attestazione_numero || !formAttestazione.data_scadenza) {
      return alert('⚠️ Compila i campi obbligatori:\n- Numero Attestazione\n- Data Scadenza');
    }

    setSaving(true);

    const dataToSave = {
      attestazione_numero: formAttestazione.attestazione_numero,
      organismo: formAttestazione.organismo || null,
      data_rilascio: formAttestazione.data_rilascio || null,
      data_scadenza: formAttestazione.data_scadenza,
      documento_url: formAttestazione.documento_url || null,
      stato: formAttestazione.stato
    };

    let result;
    if (editingAttestazioneId) {
      result = await updateRecord('qualificheSoa', editingAttestazioneId, dataToSave);
    } else {
      result = await addRecord('qualificheSoa', dataToSave);
    }

    setSaving(false);

    if (result.success) {
      alert(editingAttestazioneId ? '✅ Attestazione aggiornata!' : '✅ Attestazione creata!');
      resetFormAttestazione();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Salva categoria
  const handleSaveCategoria = async () => {
    if (!formCategoria.categoria || !formCategoria.classifica) {
      return alert('⚠️ Compila i campi obbligatori:\n- Categoria\n- Classifica');
    }

    setSaving(true);

    // Calcola importo dalla classifica se non specificato
    const classifica = classifiche.find(c => c.value === formCategoria.classifica);
    const importo = formCategoria.importo_qualificato || classifica?.importo || 0;

    const dataToSave = {
  attestazione_id: showFormCategoria,
  categoria: formCategoria.categoria,
  classifica: formCategoria.classifica,
  importo_qualificato: typeof importo === 'number' ? importo : 999999999,
  note: formCategoria.note || null,
  azienda: profile.azienda  // <-- AGGIUNGI
};

    const result = await addRecord('categorieQualificate', dataToSave);

    setSaving(false);

    if (result.success) {
      alert('✅ Categoria aggiunta!');
      resetFormCategoria();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Elimina attestazione
  const handleDeleteAttestazione = async (attestazione) => {
    const categorie = (categorieQualificate || []).filter(c => c.attestazione_id === attestazione.id);
    
    if (categorie.length > 0) {
      if (!confirm(`❌ Eliminando l'attestazione ${attestazione.attestazione_numero} verranno eliminate anche ${categorie.length} categorie collegate.\n\nContinuare?`)) {
        return;
      }
    } else {
      if (!confirm(`❌ Eliminare l'attestazione ${attestazione.attestazione_numero}?`)) {
        return;
      }
    }

    const result = await deleteRecord('qualificheSoa', attestazione.id);
    if (result.success) {
      alert('✅ Attestazione eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Elimina categoria
  const handleDeleteCategoria = async (categoria) => {
    if (!confirm(`❌ Eliminare la qualifica ${categoria.categoria}?`)) {
      return;
    }

    const result = await deleteRecord('categorieQualificate', categoria.id);
    if (result.success) {
      alert('✅ Categoria eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Edit attestazione
  const handleEditAttestazione = (attestazione) => {
    setFormAttestazione({
      attestazione_numero: attestazione.attestazione_numero,
      organismo: attestazione.organismo || '',
      data_rilascio: attestazione.data_rilascio || '',
      data_scadenza: attestazione.data_scadenza,
      documento_url: attestazione.documento_url || '',
      stato: attestazione.stato
    });
    setEditingAttestazioneId(attestazione.id);
    setShowFormAttestazione(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get categorie per attestazione
  const getCategoriePerAttestazione = (attestazioneId) => {
    return (categorieQualificate || []).filter(c => c.attestazione_id === attestazioneId);
  };

  if (loading.critical) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento qualifiche SOA...</p>
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
            <h2 className="text-2xl font-bold text-gray-800">🏆 Attestazioni SOA</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gestione attestazioni e categorie qualificate dell'azienda
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostraDashboard(!mostraDashboard)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              {mostraDashboard ? '📊 Nascondi Dashboard' : '📊 Mostra Dashboard'}
            </button>
            <button
              onClick={() => setShowFormAttestazione(!showFormAttestazione)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showFormAttestazione ? '✕ Chiudi' : '+ Nuova Attestazione'}
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Attestazioni</div>
            <div className="text-3xl font-bold text-blue-900">{statistiche.totaleAttestazioni}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Attive</div>
            <div className="text-3xl font-bold text-green-900">{statistiche.attestazioniAttive}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Scadenza ≤90gg</div>
            <div className="text-3xl font-bold text-orange-900">{statistiche.scadenzaImminente}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Categorie Possedute</div>
            <div className="text-3xl font-bold text-purple-900">{statistiche.categoriePosseduteTot}/55</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="text-sm text-indigo-700 mb-1">Completamento</div>
            <div className="text-3xl font-bold text-indigo-900">{statistiche.percentualeCompletamento}%</div>
          </div>
        </div>
      </div>

      {/* Dashboard Categorie */}
      {mostraDashboard && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Dashboard Categorie SOA</h3>
          
          {/* Opere Generali */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-3">🏗️ Opere Generali (OG)</h4>
            <div className="grid grid-cols-6 gap-2">
              {categorieSOA.filter(c => c.tipo === 'OG').map(categoria => {
                const posseduta = categoriePossedute.get(categoria.id);
                return (
                  <div
                    key={categoria.id}
                    className={`p-3 rounded border-2 ${
                      posseduta
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    title={categoria.label}
                  >
                    <div className="text-sm font-bold">{categoria.id}</div>
                    {posseduta && (
                      <div className="text-xs text-green-700 mt-1">
                        {posseduta.classifica} - {formatCurrency(posseduta.importo_qualificato)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opere Specializzate */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">🔧 Opere Specializzate (OS)</h4>
            <div className="grid grid-cols-8 gap-2">
              {categorieSOA.filter(c => c.tipo === 'OS').map(categoria => {
                const posseduta = categoriePossedute.get(categoria.id);
                return (
                  <div
                    key={categoria.id}
                    className={`p-2 rounded border-2 ${
                      posseduta
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    title={categoria.label}
                  >
                    <div className="text-xs font-bold">{categoria.id}</div>
                    {posseduta && (
                      <div className="text-xs text-green-700">
                        {posseduta.classifica}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Form Nuova Attestazione */}
      {showFormAttestazione && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingAttestazioneId ? '✏️ Modifica Attestazione' : '➕ Nuova Attestazione SOA'}
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Numero Attestazione */}
            <div>
              <label className="block text-sm font-medium mb-1">Numero Attestazione *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: 12345/2024"
                value={formAttestazione.attestazione_numero}
                onChange={(e) => setFormAttestazione({...formAttestazione, attestazione_numero: e.target.value})}
              />
            </div>

            {/* Organismo */}
            <div>
              <label className="block text-sm font-medium mb-1">Organismo di Attestazione</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: Cqop SOA"
                value={formAttestazione.organismo}
                onChange={(e) => setFormAttestazione({...formAttestazione, organismo: e.target.value})}
              />
            </div>

            {/* Stato */}
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formAttestazione.stato}
                onChange={(e) => setFormAttestazione({...formAttestazione, stato: e.target.value})}
              >
                {statiAttestazione.map(stato => (
                  <option key={stato.value} value={stato.value}>
                    {stato.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Rilascio */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Rilascio</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formAttestazione.data_rilascio}
                onChange={(e) => setFormAttestazione({...formAttestazione, data_rilascio: e.target.value})}
              />
            </div>

            {/* Data Scadenza */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Scadenza *</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formAttestazione.data_scadenza}
                onChange={(e) => setFormAttestazione({...formAttestazione, data_scadenza: e.target.value})}
              />
            </div>

            {/* URL Documento */}
            <div>
              <label className="block text-sm font-medium mb-1">URL Documento PDF</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="https://..."
                value={formAttestazione.documento_url}
                onChange={(e) => setFormAttestazione({...formAttestazione, documento_url: e.target.value})}
              />
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSaveAttestazione}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : (editingAttestazioneId ? 'Aggiorna' : 'Salva')}
            </button>
            <button
              onClick={resetFormAttestazione}
              disabled={saving}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista Attestazioni */}
      <div className="space-y-4">
        {(attestazioni || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nessuna attestazione SOA registrata. Clicca "+ Nuova Attestazione" per iniziare.
          </div>
        ) : (
          (attestazioni || []).map(attestazione => {
            const statoInfo = getStatoInfo(attestazione.stato);
            const giorniScadenza = calcolaGiorniScadenza(attestazione.data_scadenza);
            const categorieAtt = getCategoriePerAttestazione(attestazione.id);

            return (
              <div key={attestazione.id} className="bg-white rounded-lg shadow p-6">
                {/* Header Attestazione */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        📜 Attestazione n. {attestazione.attestazione_numero}
                      </h3>
                      <span className={`px-3 py-1 rounded text-sm ${statoInfo.color}`}>
                        {statoInfo.label}
                      </span>
                      {giorniScadenza !== null && giorniScadenza <= 90 && giorniScadenza >= 0 && (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm">
                          ⏰ Scade tra {giorniScadenza} giorni
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-600">Organismo:</span>{' '}
                        <span className="font-medium">{attestazione.organismo || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Rilascio:</span>{' '}
                        <span className="font-medium">{formatDate(attestazione.data_rilascio)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Scadenza:</span>{' '}
                        <span className="font-medium">{formatDate(attestazione.data_scadenza)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {attestazione.documento_url && (
                      <a
                        href={attestazione.documento_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="Visualizza PDF"
                      >
                        📄
                      </a>
                    )}
                    <button
                      onClick={() => handleEditAttestazione(attestazione)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteAttestazione(attestazione)}
                      className="text-red-600 hover:text-red-800"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Categorie Qualificate */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">
                      Categorie Qualificate ({categorieAtt.length})
                    </h4>
                    <button
                      onClick={() => setShowFormCategoria(attestazione.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      + Aggiungi Categoria
                    </button>
                  </div>

                  {/* Form Aggiungi Categoria */}
                  {showFormCategoria === attestazione.id && (
                    <div className="bg-gray-50 p-4 rounded mb-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Categoria *</label>
                          <select
                            className="border rounded px-2 py-1 w-full text-sm"
                            value={formCategoria.categoria}
                            onChange={(e) => setFormCategoria({...formCategoria, categoria: e.target.value})}
                          >
                            <option value="">-- Seleziona --</option>
                            {categorieSOA.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Classifica *</label>
                          <select
                            className="border rounded px-2 py-1 w-full text-sm"
                            value={formCategoria.classifica}
                            onChange={(e) => {
                              const classifica = classifiche.find(c => c.value === e.target.value);
                              setFormCategoria({
                                ...formCategoria, 
                                classifica: e.target.value,
                                importo_qualificato: classifica?.importo || ''
                              });
                            }}
                          >
                            <option value="">-- Seleziona --</option>
                            {classifiche.map(cl => (
                              <option key={cl.value} value={cl.value}>
                                {cl.label} - {formatCurrency(cl.importo)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Importo</label>
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-full text-sm bg-gray-100"
                            value={formCategoria.importo_qualificato}
                            readOnly
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            onClick={handleSaveCategoria}
                            disabled={saving}
                            className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Salva
                          </button>
                          <button
                            onClick={resetFormCategoria}
                            className="bg-gray-500 text-white px-4 py-1 rounded text-sm hover:bg-gray-600"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabella Categorie */}
                  {categorieAtt.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">
                      Nessuna categoria qualificata. Clicca "+ Aggiungi Categoria".
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {categorieAtt.map(cat => {
                        const infoCategoria = categorieSOA.find(c => c.id === cat.categoria);
                        return (
                          <div
                            key={cat.id}
                            className="border rounded p-3 bg-green-50 border-green-200 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-green-900">
                                {cat.categoria} - {infoCategoria?.label.split(' - ')[1] || cat.categoria}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                Classifica <strong>{cat.classifica}</strong> - {formatCurrency(cat.importo_qualificato)}
                              </div>
                              {cat.note && (
                                <div className="text-xs text-gray-600 mt-1">{cat.note}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteCategoria(cat)}
                              className="text-red-600 hover:text-red-800 ml-2"
                              title="Elimina"
                            >
                              🗑️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AttestazioniSOA;