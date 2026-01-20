// src/components/ATI.jsx
import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function ATI() {
  const { 
    ati,
    gare,
    categorieQualificate, // ⚡ Qualifiche SOA di MARREL
    addRecord, 
    updateRecord, 
    deleteRecord,
    fetchTable, // ⚡ AGGIUNTO per refresh
    loading 
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form principale ATI
  const [formData, setFormData] = useState({
    codice_ati: '',
    nome: '',
    tipo: 'orizzontale',
    marrel_ruolo: 'mandataria', // ⚡ NUOVO: ruolo di MARREL
    stato: 'costituenda',
    data_costituzione: '',
    data_scioglimento: '',
    note: ''
  });

  // Membri ATI (ESTERNI - MARREL è implicito)
  const [membri, setMembri] = useState([]);
  const [nuovoMembro, setNuovoMembro] = useState({
    ruolo: 'mandante',
    ragione_sociale: '',
    piva: '',
    quota_percentuale: ''
  });

  // Qualifiche del membro in fase di aggiunta
  const [qualificheMembro, setQualificheMembro] = useState([]);
  const [nuovaQualificaMembro, setNuovaQualificaMembro] = useState({
    categoria: '',
    classifica: '',
    importo_qualificato: ''
  });

  // Stati disponibili
  const statiATI = [
    { value: 'costituenda', label: '📝 In Costituzione', color: 'bg-yellow-50 text-yellow-700' },
    { value: 'attiva', label: '✅ Attiva', color: 'bg-green-50 text-green-700' },
    { value: 'sciolta', label: '❌ Sciolta', color: 'bg-red-50 text-red-700' }
  ];

  const tipiATI = [
    { value: 'orizzontale', label: '➡️ Orizzontale', desc: 'Imprese che svolgono lavori omogenei' },
    { value: 'verticale', label: '⬇️ Verticale', desc: 'Impresa principale + subappaltatori' },
    { value: 'mista', label: '🔄 Mista', desc: 'Combinazione orizzontale e verticale' }
  ];
    // Categorie SOA complete
  const categorieSOA = [
    'OG1', 'OG2', 'OG3', 'OG4', 'OG5', 'OG6', 'OG7', 'OG8', 'OG9', 'OG10', 'OG11', 'OG12', 'OG13',
    'OS1', 'OS2-A', 'OS2-B', 'OS3', 'OS4', 'OS5', 'OS6', 'OS7', 'OS8', 'OS9', 'OS10',
    'OS11', 'OS12-A', 'OS12-B', 'OS13', 'OS14', 'OS15', 'OS16', 'OS17', 'OS18-A', 'OS18-B',
    'OS19', 'OS20-A', 'OS20-B', 'OS21', 'OS22', 'OS23', 'OS24', 'OS25', 'OS26', 'OS27',
    'OS28', 'OS29', 'OS30', 'OS31', 'OS32', 'OS33', 'OS34', 'OS35'
  ];

  // Classifiche SOA con importi
  const classificheSOA = [
    { value: 'I', label: 'I - € 258.000', importo: 258000 },
    { value: 'II', label: 'II - € 516.000', importo: 516000 },
    { value: 'III', label: 'III - € 1.033.000', importo: 1033000 },
    { value: 'III-bis', label: 'III-bis - € 1.500.000', importo: 1500000 },
    { value: 'IV', label: 'IV - € 2.582.000', importo: 2582000 },
    { value: 'IV-bis', label: 'IV-bis - € 3.500.000', importo: 3500000 },
    { value: 'V', label: 'V - € 5.165.000', importo: 5165000 },
    { value: 'VI', label: 'VI - € 10.329.000', importo: 10329000 },
    { value: 'VII', label: 'VII - € 15.494.000', importo: 15494000 },
    { value: 'VIII', label: 'VIII - Illimitato', importo: 999999999 }
  ];

  // Utility
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatoInfo = (stato) => {
    return statiATI.find(s => s.value === stato) || statiATI[0];
  };

  // ⚡ Calcola totale quote MEMBRI (escluso MARREL)
  const totaleQuoteMembri = useMemo(() => {
    return membri.reduce((sum, m) => sum + parseFloat(m.quota_percentuale || 0), 0);
  }, [membri]);

  // ⚡ Quota MARREL (automatica)
  const quotaMarrel = useMemo(() => {
    return Math.max(0, 100 - totaleQuoteMembri);
  }, [totaleQuoteMembri]);

  // Conta gare collegate
  const contaGareCollegate = (atiId) => {
    return gare.filter(g => g.ati_id === atiId).length;
  };

  // ⚡ Qualifiche MARREL (da categorieQualificate)
  const qualificheMarrel = useMemo(() => {
    const map = new Map();
    (categorieQualificate || []).forEach(cq => {
      const existing = map.get(cq.categoria);
      if (!existing || parseFloat(cq.importo_qualificato) > parseFloat(existing.importo_qualificato)) {
        map.set(cq.categoria, {
          categoria: cq.categoria,
          classifica: cq.classifica,
          importo_qualificato: cq.importo_qualificato
        });
      }
    });
    return Array.from(map.values());
  }, [categorieQualificate]);

  // ⚡ Qualifiche aggregate ATI (MARREL + membri)
  const getQualificheAggregate = (atiItem) => {
    const map = new Map();
    
    console.log('🏆 Calcolo qualifiche aggregate per:', atiItem.codice_ati);
    console.log('🏆 Qualifiche MARREL:', qualificheMarrel);
    console.log('🏆 Membri ATI:', atiItem.membri);
    
    // 1. Aggiungi qualifiche MARREL
    qualificheMarrel.forEach(q => {
      map.set(q.categoria, q);
    });
    
    // 2. Aggiungi qualifiche membri
    (atiItem.membri || []).forEach(membro => {
      console.log('🏆 Procesando membro:', membro.ragione_sociale, 'con qualifiche:', membro.qualifiche);
      (membro.qualifiche || []).forEach(q => {
        const existing = map.get(q.categoria);
        if (!existing || parseFloat(q.importo_qualificato) > parseFloat(existing.importo_qualificato)) {
          map.set(q.categoria, q);
        }
      });
    });
    
    const result = Array.from(map.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));
    console.log('🏆 Risultato finale:', result);
    return result;
  };

  // Statistiche
  const statistiche = useMemo(() => {
    return {
      totale: ati.length,
      costituenda: ati.filter(a => a.stato === 'costituenda').length,
      attive: ati.filter(a => a.stato === 'attiva').length,
      sciolte: ati.filter(a => a.stato === 'sciolta').length,
      orizzontali: ati.filter(a => a.tipo === 'orizzontale').length,
      verticali: ati.filter(a => a.tipo === 'verticale').length,
      miste: ati.filter(a => a.tipo === 'mista').length
    };
  }, [ati]);

  // Aggiungi membro
  const aggiungiMembro = () => {
    if (!nuovoMembro.ragione_sociale || !nuovoMembro.piva || !nuovoMembro.quota_percentuale) {
      alert('⚠️ Compila tutti i campi del membro');
      return;
    }

    const quota = parseFloat(nuovoMembro.quota_percentuale);
    if (quota <= 0 || quota > 100) {
      alert('⚠️ La quota deve essere tra 0 e 100%');
      return;
    }

    if (totaleQuoteMembri + quota > 100) {
      alert(`⚠️ Il totale delle quote supererebbe il 100% (attuale membri: ${totaleQuoteMembri.toFixed(2)}%)`);
      return;
    }

    setMembri([...membri, { 
      ...nuovoMembro,
      qualifiche: [...qualificheMembro]
    }]);
    setNuovoMembro({
      ruolo: 'mandante',
      ragione_sociale: '',
      piva: '',
      quota_percentuale: ''
    });
    setQualificheMembro([]);
  };

  // Rimuovi membro
  const rimuoviMembro = (index) => {
    setMembri(membri.filter((_, i) => i !== index));
  };

  // Aggiungi qualifica al membro
  const aggiungiQualificaMembro = () => {
    if (!nuovaQualificaMembro.categoria || !nuovaQualificaMembro.classifica) {
      alert('⚠️ Compila categoria e classifica');
      return;
    }
    
    const importo = nuovaQualificaMembro.classifica === 'VIII' 
      ? 999999999 
      : parseFloat(nuovaQualificaMembro.importo_qualificato);

    if (nuovaQualificaMembro.classifica !== 'VIII' && (!importo || importo <= 0)) {
      alert('⚠️ Inserisci un importo valido');
      return;
    }

    if (qualificheMembro.find(q => q.categoria === nuovaQualificaMembro.categoria)) {
      alert('⚠️ Categoria già presente per questo membro');
      return;
    }

    setQualificheMembro([...qualificheMembro, {
      categoria: nuovaQualificaMembro.categoria,
      classifica: nuovaQualificaMembro.classifica,
      importo_qualificato: importo
    }]);
    
    setNuovaQualificaMembro({ categoria: '', classifica: '', importo_qualificato: '' });
  };

  // Rimuovi qualifica del membro
  const rimuoviQualificaMembro = (index) => {
    setQualificheMembro(qualificheMembro.filter((_, i) => i !== index));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      codice_ati: '',
      nome: '',
      tipo: 'orizzontale',
      marrel_ruolo: 'mandataria',
      stato: 'costituenda',
      data_costituzione: '',
      data_scioglimento: '',
      note: ''
    });
    setMembri([]);
    setNuovoMembro({
      ruolo: 'mandante',
      ragione_sociale: '',
      piva: '',
      quota_percentuale: ''
    });
    setQualificheMembro([]);
    setNuovaQualificaMembro({ categoria: '', classifica: '', importo_qualificato: '' });
    setEditingId(null);
    setShowForm(false);
  };

  // Salva ATI
  const handleSave = async () => {
    if (!formData.codice_ati || !formData.nome) {
      alert('⚠️ Compila i campi obbligatori:\n- Codice ATI\n- Nome');
      return;
    }

    // ⚡ Verifica ruoli: MARREL + almeno un mandante esterno se MARREL è mandataria
    if (formData.marrel_ruolo === 'mandataria' && membri.length === 0) {
      alert('⚠️ Devi aggiungere almeno un membro mandante');
      return;
    }

    // ⚡ Verifica: se MARREL è mandante, deve esserci una mandataria tra i membri
    if (formData.marrel_ruolo === 'mandante') {
      const mandataria = membri.find(m => m.ruolo === 'mandataria');
      if (!mandataria) {
        alert('⚠️ Se MARREL è mandante, deve esserci un membro con ruolo Mandataria');
        return;
      }
    }

    if (Math.abs(totaleQuoteMembri + quotaMarrel - 100) > 0.01) {
      alert(`⚠️ Il totale delle quote deve essere 100%\n\nMembri: ${totaleQuoteMembri.toFixed(2)}%\nMARREL: ${quotaMarrel.toFixed(2)}%\nTotale: ${(totaleQuoteMembri + quotaMarrel).toFixed(2)}%`);
      return;
    }

    setSaving(true);

    const dataToSave = {
      codice_ati: formData.codice_ati,
      nome: formData.nome,
      tipo: formData.tipo,
      marrel_ruolo: formData.marrel_ruolo,
      marrel_quota_percentuale: quotaMarrel,
      stato: formData.stato,
      data_costituzione: formData.data_costituzione || null,
      data_scioglimento: formData.data_scioglimento || null,
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('ati', editingId, dataToSave);
      
      if (result.success) {
        // 1. Elimina tutti i membri esistenti
        const atiCorrente = ati.find(a => a.id === editingId);
        if (atiCorrente && atiCorrente.membri) {
          for (const vecchioMembro of atiCorrente.membri) {
            await deleteRecord('atiMembri', vecchioMembro.id);
          }
        }
        
        // 2. Inserisci i nuovi membri
        for (const membro of membri) {
          const membroResult = await addRecord('atiMembri', {
            ati_id: editingId,
            ruolo: membro.ruolo,
            ragione_sociale: membro.ragione_sociale,
            piva: membro.piva,
            quota_percentuale: parseFloat(membro.quota_percentuale),
            qualifiche: membro.qualifiche || []
          });
          
          if (!membroResult.success) {
            console.error('❌ Errore membro:', membroResult.error);
            alert(`❌ Errore salvando membro: ${membroResult.error}`);
            setSaving(false);
            return;
          }
        }
        
        // 3. Refresh ATI
        await fetchTable('ati');
      }
    } else {
      result = await addRecord('ati', dataToSave);
      
      if (result.success && result.data) {
        // Inserisci membri
        console.log('📥 Salvando membri ATI:', membri);
        for (const membro of membri) {
          console.log('📥 Salvando membro:', membro);
          const membroResult = await addRecord('atiMembri', {
            ati_id: result.data.id,
            ruolo: membro.ruolo,
            ragione_sociale: membro.ragione_sociale,
            piva: membro.piva,
            quota_percentuale: parseFloat(membro.quota_percentuale),
            qualifiche: membro.qualifiche || []
          });
          
          if (!membroResult.success) {
            console.error('❌ Errore membro:', membroResult.error);
            alert(`❌ Errore salvando membro: ${membroResult.error}`);
            setSaving(false);
            return;
          }
          console.log('✅ Membro salvato:', membroResult.data);
        }
        
        // ⚡ REFRESH ATI per ricaricare con i membri
        console.log('🔄 Refresh ATI...');
        await fetchTable('ati');
        console.log('✅ ATI refreshata');
      }
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ ATI aggiornata!' : '✅ ATI creata!');
      resetForm();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Elimina ATI
  const handleDelete = async (atiItem) => {
    const gareCollegate = contaGareCollegate(atiItem.id);
    
    if (gareCollegate > 0) {
      if (!confirm(`⚠️ Questa ATI è collegata a ${gareCollegate} gare.\n\nEliminando l'ATI, le gare perderanno il collegamento.\n\nConfermi l'eliminazione?`)) {
        return;
      }
    } else {
      if (!confirm(`❌ Eliminare l'ATI ${atiItem.codice_ati}?\n\nQuesta azione è irreversibile!`)) {
        return;
      }
    }

    const result = await deleteRecord('ati', atiItem.id);
    if (result.success) {
      alert('✅ ATI eliminata!');
      // ⚡ REFRESH per aggiornare la lista
      await fetchTable('ati');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Edit ATI
  const handleEdit = (atiItem) => {
    console.log('📝 Editing ATI:', atiItem);
    console.log('📝 Membri caricati:', atiItem.membri);
    
    setFormData({
      codice_ati: atiItem.codice_ati,
      nome: atiItem.nome,
      tipo: atiItem.tipo,
      marrel_ruolo: atiItem.marrel_ruolo,
      stato: atiItem.stato,
      data_costituzione: atiItem.data_costituzione || '',
      data_scioglimento: atiItem.data_scioglimento || '',
      note: atiItem.note || ''
    });
    
    // Carica membri
    if (atiItem.membri && atiItem.membri.length > 0) {
      const membriCaricati = atiItem.membri.map(m => {
        console.log('📝 Membro:', m);
        console.log('📝 Qualifiche membro:', m.qualifiche);
        return {
          ruolo: m.ruolo,
          ragione_sociale: m.ragione_sociale,
          piva: m.piva,
          quota_percentuale: m.quota_percentuale,
          qualifiche: m.qualifiche || []
        };
      });
      setMembri(membriCaricati);
    }
    
    setEditingId(atiItem.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading.critical) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento ATI...</p>
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
            <h2 className="text-2xl font-bold text-gray-800">🤝 Gestione ATI</h2>
            <p className="text-sm text-gray-600 mt-1">
              Associazioni Temporanee di Imprese per gare d'appalto
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? '✕ Chiudi' : '+ Nuova ATI'}
          </button>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale ATI</div>
            <div className="text-3xl font-bold text-blue-900">{statistiche.totale}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-700 mb-1">In Costituzione</div>
            <div className="text-3xl font-bold text-yellow-900">{statistiche.costituenda}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Attive</div>
            <div className="text-3xl font-bold text-green-900">{statistiche.attive}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">Sciolte</div>
            <div className="text-3xl font-bold text-red-900">{statistiche.sciolte}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Orizzontali</div>
            <div className="text-3xl font-bold text-purple-900">{statistiche.orizzontali}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="text-sm text-indigo-700 mb-1">Verticali</div>
            <div className="text-3xl font-bold text-indigo-900">{statistiche.verticali}</div>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <div className="text-sm text-cyan-700 mb-1">Miste</div>
            <div className="text-3xl font-bold text-cyan-900">{statistiche.miste}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica ATI' : '➕ Nuova ATI'}
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Codice ATI */}
            <div>
              <label className="block text-sm font-medium mb-1">Codice ATI *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: ATI-2024-001"
                value={formData.codice_ati}
                onChange={(e) => setFormData({...formData, codice_ati: e.target.value})}
              />
            </div>

            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nome ATI *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Nome descrittivo dell'ATI"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
            </div>

            {/* Tipo ATI */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo ATI</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                {tipiATI.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {tipiATI.find(t => t.value === formData.tipo)?.desc}
              </p>
            </div>

            {/* ⚡ RUOLO MARREL */}
            <div>
              <label className="block text-sm font-medium mb-1">Ruolo MARREL SRL *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="marrel_ruolo"
                    value="mandataria"
                    checked={formData.marrel_ruolo === 'mandataria'}
                    onChange={(e) => setFormData({...formData, marrel_ruolo: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">👑 Mandataria</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="marrel_ruolo"
                    value="mandante"
                    checked={formData.marrel_ruolo === 'mandante'}
                    onChange={(e) => setFormData({...formData, marrel_ruolo: e.target.value})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">🤝 Mandante</span>
                </label>
              </div>
            </div>

            {/* Stato */}
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.stato}
                onChange={(e) => setFormData({...formData, stato: e.target.value})}
              >
                {statiATI.map(stato => (
                  <option key={stato.value} value={stato.value}>
                    {stato.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Costituzione */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Costituzione</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.data_costituzione}
                onChange={(e) => setFormData({...formData, data_costituzione: e.target.value})}
              />
            </div>

            {/* Data Scioglimento */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Scioglimento</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.data_scioglimento}
                onChange={(e) => setFormData({...formData, data_scioglimento: e.target.value})}
                disabled={formData.stato !== 'sciolta'}
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

          {/* ⚡ Info MARREL */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white">
                    🏢 MARREL SRL
                  </span>
                  <span className="text-sm text-gray-700">
                    {formData.marrel_ruolo === 'mandataria' ? '👑 Mandataria' : '🤝 Mandante'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Qualifiche SOA: {qualificheMarrel.length} categorie
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Quota</div>
                <div className="text-2xl font-bold text-blue-600">{quotaMarrel.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          {/* Sezione Membri ATI */}
          <div className="mt-6 border-t pt-6">
            <h4 className="font-semibold text-gray-700 mb-4">👥 Altri Membri ATI</h4>
            
            {/* Lista Membri */}
            {membri.length > 0 && (
              <div className="mb-4 space-y-2">
                {membri.map((membro, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            membro.ruolo === 'mandataria' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {membro.ruolo === 'mandataria' ? '👑 Mandataria' : '🤝 Mandante'}
                          </span>
                          <span className="font-semibold text-gray-800">{membro.ragione_sociale}</span>
                          <span className="text-sm text-gray-600">P.IVA: {membro.piva}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-600 text-lg">{membro.quota_percentuale}%</span>
                      </div>
                      <button
                        onClick={() => rimuoviMembro(index)}
                        className="text-red-600 hover:text-red-800 text-xl"
                        title="Rimuovi membro"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {/* Qualifiche del Membro */}
                    {membro.qualifiche && membro.qualifiche.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs text-gray-600 mb-1">Qualifiche SOA:</div>
                        <div className="flex flex-wrap gap-1">
                          {membro.qualifiche.map((qual, qIdx) => (
                            <span key={qIdx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              {qual.categoria} ({qual.classifica})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* ⚡ Totale Quote */}
                <div className="flex justify-end p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Riepilogo Quote</div>
                    <div className="text-sm text-gray-700 mt-1">
                      MARREL: <strong>{quotaMarrel.toFixed(2)}%</strong> + 
                      Altri: <strong>{totaleQuoteMembri.toFixed(2)}%</strong>
                    </div>
                    <div className={`text-2xl font-bold ${
                      Math.abs(totaleQuoteMembri + quotaMarrel - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Totale: {(totaleQuoteMembri + quotaMarrel).toFixed(2)}%
                    </div>
                    {Math.abs(totaleQuoteMembri + quotaMarrel - 100) >= 0.01 && (
                      <div className="text-xs text-red-600">Deve essere 100%</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Aggiungi Membro */}
            <div className="grid grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Ruolo</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={nuovoMembro.ruolo}
                  onChange={(e) => setNuovoMembro({...nuovoMembro, ruolo: e.target.value})}
                >
                  <option value="mandataria">👑 Mandataria</option>
                  <option value="mandante">🤝 Mandante</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Ragione Sociale</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Nome azienda"
                  value={nuovoMembro.ragione_sociale}
                  onChange={(e) => setNuovoMembro({...nuovoMembro, ragione_sociale: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">P.IVA</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="IT..."
                  value={nuovoMembro.piva}
                  onChange={(e) => setNuovoMembro({...nuovoMembro, piva: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quota %</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="border rounded px-3 py-2 w-full"
                    placeholder="0.00"
                    value={nuovoMembro.quota_percentuale}
                    onChange={(e) => setNuovoMembro({...nuovoMembro, quota_percentuale: e.target.value})}
                  />
                  <button
                    onClick={aggiungiMembro}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
                  >
                    + Aggiungi
                  </button>
                </div>
              </div>
            </div>

            {/* Qualifiche del Membro */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-gray-700 mb-3">🏆 Qualifiche SOA del Membro</h5>
              <p className="text-xs text-gray-600 mb-3">
                Aggiungi le categorie SOA possedute da questa azienda associata
              </p>

              {/* Lista Qualifiche del Membro */}
              {qualificheMembro.length > 0 && (
                <div className="mb-3 space-y-2">
                  {qualificheMembro.map((qual, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                      <div className="flex-1">
                        <span className="font-bold text-green-700">{qual.categoria}</span>
                        <span className="text-gray-600 mx-2">•</span>
                        <span className="text-gray-700">Class. {qual.classifica}</span>
                        <span className="text-gray-600 mx-2">•</span>
                        <span className="text-gray-700 text-sm">
                          {qual.importo_qualificato === 999999999 
                            ? 'Illimitato' 
                            : `€ ${parseFloat(qual.importo_qualificato).toLocaleString('it-IT')}`
                          }
                        </span>
                      </div>
                      <button
                        onClick={() => rimuoviQualificaMembro(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Aggiungi Qualifica Membro */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <select
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={nuovaQualificaMembro.categoria}
                    onChange={(e) => setNuovaQualificaMembro({...nuovaQualificaMembro, categoria: e.target.value})}
                  >
                    <option value="">Categoria *</option>
                    {categorieSOA.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={nuovaQualificaMembro.classifica}
                    onChange={(e) => {
                      const classificaSelezionata = classificheSOA.find(c => c.value === e.target.value);
                      setNuovaQualificaMembro({
                        ...nuovaQualificaMembro, 
                        classifica: e.target.value,
                        importo_qualificato: classificaSelezionata?.importo || ''
                      });
                    }}
                  >
                    <option value="">Classifica *</option>
                    {classificheSOA.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full text-sm bg-gray-50"
                    value={nuovaQualificaMembro.importo_qualificato === 999999999 
                      ? 'Illimitato' 
                      : nuovaQualificaMembro.importo_qualificato 
                        ? `€ ${parseFloat(nuovaQualificaMembro.importo_qualificato).toLocaleString('it-IT')}`
                        : ''
                    }
                    readOnly
                    placeholder="Importo"
                  />
                </div>

                <div>
                  <button
                    onClick={aggiungiQualificaMembro}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 w-full"
                  >
                    + Aggiungi
                  </button>
                </div>
              </div>
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

      {/* Lista ATI */}
      <div className="space-y-4">
        {ati.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nessuna ATI registrata. Clicca "+ Nuova ATI" per iniziare.
          </div>
        ) : (
          ati.map(atiItem => {
            const statoInfo = getStatoInfo(atiItem.stato);
            const tipoInfo = tipiATI.find(t => t.value === atiItem.tipo);
            const numGare = contaGareCollegate(atiItem.id);
            const numMembri = (atiItem.membri?.length || 0) + 1; // +1 per MARREL
            const qualificheAgg = getQualificheAggregate(atiItem);
            
            console.log('🎨 Rendering ATI:', atiItem.codice_ati);
            console.log('🎨 Membri trovati:', atiItem.membri);
            console.log('🎨 Qualifiche aggregate:', qualificheAgg);

            return (
              <div key={atiItem.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{atiItem.codice_ati}</h3>
                      <span className={`px-3 py-1 rounded text-sm ${statoInfo.color}`}>
                        {statoInfo.label}
                      </span>
                      <span className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-700">
                        {tipoInfo?.label}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{atiItem.nome}</p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">MARREL:</span>{' '}
                        <span className="font-medium">
                          {atiItem.marrel_ruolo === 'mandataria' ? '👑 Mandataria' : '🤝 Mandante'} 
                          ({atiItem.marrel_quota_percentuale?.toFixed(2) || '0'}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Membri Totali:</span>{' '}
                        <span className="font-medium">{numMembri}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Qualifiche:</span>{' '}
                        <span className="font-medium">{qualificheAgg.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Gare:</span>{' '}
                        <span className="font-medium">{numGare}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(atiItem)}
                      className="text-blue-600 hover:text-blue-800 text-xl"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(atiItem)}
                      className="text-red-600 hover:text-red-800 text-xl"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Membri */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">👥 Composizione ATI</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* ⚡ MARREL */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                            🏢 MARREL SRL
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            atiItem.marrel_ruolo === 'mandataria' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {atiItem.marrel_ruolo === 'mandataria' ? '👑' : '🤝'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Qualifiche: {qualificheMarrel.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-600">{atiItem.marrel_quota_percentuale?.toFixed(2) || '0'}%</span>
                      </div>
                    </div>

                    {/* Altri membri */}
                    {(atiItem.membri || []).map(membro => (
                      <div key={membro.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              membro.ruolo === 'mandataria' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {membro.ruolo === 'mandataria' ? '👑' : '🤝'}
                            </span>
                            <span className="font-semibold text-gray-800">{membro.ragione_sociale}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            P.IVA: {membro.piva} | Qualifiche: {membro.qualifiche?.length || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600">{membro.quota_percentuale}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ⚡ Qualifiche SOA Aggregate */}
                {qualificheAgg.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      🏆 Qualifiche SOA Aggregate ({qualificheAgg.length})
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {qualificheAgg.map((qual, idx) => (
                        <div key={idx} className="p-2 bg-green-50 rounded border border-green-200 text-sm">
                          <span className="font-bold text-green-700">{qual.categoria}</span>
                          <span className="text-gray-600"> • </span>
                          <span className="text-gray-700">Class. {qual.classifica}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ATI;