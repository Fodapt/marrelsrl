import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate } from '../utils/dateUtils';
import { exportCantieriPDF } from '../utils/exports/exportCantieriPDF';

function Cantieri() {
  // ✅ USA IL CONTEXT
  const { cantieri, gare, ati, loading, addRecord, updateRecord, deleteRecord } = useData();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [ricerca, setRicerca] = useState('');
  const [saving, setSaving] = useState(false);

   // ✅ CALCOLO AUTOMATICO IMPORTO LAVORI
  const importoLavoriCalcolato = () => {
    const contratto = parseFloat(formData.importoContratto || formData.importo_contratto || 0);
    const oneri = parseFloat(formData.oneriSicurezza || formData.oneri_sicurezza || 0);
    return contratto - oneri;
  };

  // ✅ MOSTRA LOADING
  if (loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento cantieri...</p>
        </div>
      </div>
    );
  }

  // ✅ SALVA su Supabase (async)
const handleSave = async () => {
  if (!formData.nome) {
    alert('⚠️ Il nome del cantiere è obbligatorio!');
    return;
  }


  setSaving(true);

  // Converti i campi per Supabase (snake_case) - SCHEMA CORRETTO
  const dataForSupabase = {
    nome: formData.nome,
    cliente_id: formData.cliente_id || formData.clienteId || null,
    cliente_nome: formData.cliente_nome || formData.clienteNome || null,
    indirizzo: formData.indirizzo || null,
    comune: formData.comune || null,
    provincia: formData.provincia || null,
    cap: formData.cap || null,
    stato: formData.stato || 'pianificato',
    cig: formData.cig || null,
    cup: formData.cup || null,
    casse_edile: formData.casse_edile || formData.casseEdile || formData.cassaEdile || null,
    data_inizio: formData.data_inizio || formData.dataInizio || null,
    data_fine: formData.data_fine || formData.dataFine || null,
    data_fine_prevista: formData.data_fine_prevista || formData.dataFinePrevista || null,
    importo_contratto: formData.importo_contratto || formData.importoContratto ? parseFloat(formData.importo_contratto || formData.importoContratto) : null,
    oneri_sicurezza: formData.oneri_sicurezza || formData.oneriSicurezza ? parseFloat(formData.oneri_sicurezza || formData.oneriSicurezza) : 0,
    importo_lavori: importoLavoriCalcolato(), // ← CALCOLO AUTOMATICO
    codice_commessa: formData.codice_commessa || formData.codiceCommessa || null,
    tipologia_lavoro: formData.tipologia_lavoro || formData.tipologiaLavoro || null,
    oneri_sicurezza: formData.oneri_sicurezza || formData.oneriSicurezza ? parseFloat(formData.oneri_sicurezza || formData.oneriSicurezza) : 0,
    ribasso_asta: formData.ribasso_asta || formData.ribassoAsta ? parseFloat(formData.ribasso_asta || formData.ribassoAsta) : 0,
    modalita_calcolo_sal: formData.modalita_calcolo_sal || formData.modalitaCalcoloSal || 'solo_lavori',
    
    // RUP
    rup_nome: formData.rup_nome || formData.rupNome || null,
    rup_email: formData.rup_email || formData.rupEmail || null,
    rup_pec: formData.rup_pec || formData.rupPec || null,
    rup_telefono: formData.rup_telefono || formData.rupTelefono || null,
    rup_cellulare: formData.rup_cellulare || formData.rupCellulare || null,
    
    // CSE
    cse_nome: formData.cse_nome || formData.cseNome || null,
    cse_email: formData.cse_email || formData.cseEmail || null,
    cse_pec: formData.cse_pec || formData.csePec || null,
    cse_telefono: formData.cse_telefono || formData.cseTelefono || null,
    cse_cellulare: formData.cse_cellulare || formData.cseCellulare || null,
    
    // DL
    dl_nome: formData.dl_nome || formData.dlNome || null,
    dl_email: formData.dl_email || formData.dlEmail || null,
    dl_pec: formData.dl_pec || formData.dlPec || null,
    dl_telefono: formData.dl_telefono || formData.dlTelefono || null,
    dl_cellulare: formData.dl_cellulare || formData.dlCellulare || null,
    
    // Collaudatore
collaudatore_nome: formData.collaudatore_nome || formData.collaudatoreNome || null,
collaudatore_email: formData.collaudatore_email || formData.collaudatoreEmail || null,
collaudatore_telefono: formData.collaudatore_telefono || formData.collaudatoreTelefono || null,
collaudatore_cellulare: formData.collaudatore_cellulare || formData.collaudatoreCellulare || null,
collaudatore_pec: formData.collaudatore_pec || formData.collaudatorePec || null,
    
    // DNLT
    data_comunicazione_dnlt: formData.data_comunicazione_dnlt || formData.dataComunicazioneDNLT || null,
    scadenza_dnlt: formData.scadenza_dnlt || formData.scadenzaDNLT || null,
    
    // Altri campi
    direttore_lavori: formData.direttore_lavori || formData.direttoreLavori || null,
    responsabile_sicurezza: formData.responsabile_sicurezza || formData.responsabileSicurezza || null,
    note: formData.note || null,
    attivo: formData.attivo !== undefined ? formData.attivo : true
  };

  let result;
  if (editingId) {
    result = await updateRecord('cantieri', editingId, dataForSupabase);
  } else {
    result = await addRecord('cantieri', dataForSupabase);
  }

  setSaving(false);

  if (result.success) {
    setShowForm(false);
    setFormData({});
    setEditingId(null);
    alert(editingId ? '✅ Cantiere aggiornato!' : '✅ Cantiere aggiunto!');
  } else {
    alert('❌ Errore: ' + result.error);
  }
};

  // ✅ ELIMINA da Supabase (async)
  const handleDelete = async (cantiere) => {
    if (!confirm(`❌ Eliminare il cantiere ${cantiere.nome}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('cantieri', cantiere.id);

    if (result.success) {
      alert('✅ Cantiere eliminato!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEdit = (cantiere) => {
  // Converti da snake_case a camelCase per il form - SCHEMA CORRETTO
  setFormData({
    nome: cantiere.nome,
    cliente_id: cantiere.cliente_id,
    clienteId: cantiere.cliente_id,
    cliente_nome: cantiere.cliente_nome,
    clienteNome: cantiere.cliente_nome,
    indirizzo: cantiere.indirizzo,
    comune: cantiere.comune,
    provincia: cantiere.provincia,
    cap: cantiere.cap,
    stato: cantiere.stato,
    cig: cantiere.cig,
    cup: cantiere.cup,
    casse_edile: cantiere.casse_edile,
    casseEdile: cantiere.casse_edile,
    cassaEdile: cantiere.casse_edile,
    data_inizio: cantiere.data_inizio,
    dataInizio: cantiere.data_inizio,
    data_fine: cantiere.data_fine,
    dataFine: cantiere.data_fine,
    data_fine_prevista: cantiere.data_fine_prevista,
    dataFinePrevista: cantiere.data_fine_prevista,
    importo_contratto: cantiere.importo_contratto,
    importoContratto: cantiere.importo_contratto,
    importo_lavori: cantiere.importo_lavori,
    importoLavori: cantiere.importo_lavori,
    codice_commessa: cantiere.codice_commessa,
    codiceCommessa: cantiere.codice_commessa,
    tipologia_lavoro: cantiere.tipologia_lavoro,
    tipologiaLavoro: cantiere.tipologia_lavoro,
    oneri_sicurezza: cantiere.oneri_sicurezza,
    oneriSicurezza: cantiere.oneri_sicurezza,
    ribasso_asta: cantiere.ribasso_asta,
    ribassoAsta: cantiere.ribasso_asta,
    modalita_calcolo_sal: cantiere.modalita_calcolo_sal,
    modalitaCalcoloSal: cantiere.modalita_calcolo_sal,
    
    // RUP
    rup_nome: cantiere.rup_nome,
    rupNome: cantiere.rup_nome,
    rup_email: cantiere.rup_email,
    rupEmail: cantiere.rup_email,
    rup_pec: cantiere.rup_pec,
    rupPec: cantiere.rup_pec,
    rup_telefono: cantiere.rup_telefono,
    rupTelefono: cantiere.rup_telefono,
    rup_cellulare: cantiere.rup_cellulare,
    rupCellulare: cantiere.rup_cellulare,
    
    // CSE
    cse_nome: cantiere.cse_nome,
    cseNome: cantiere.cse_nome,
    cse_email: cantiere.cse_email,
    cseEmail: cantiere.cse_email,
    cse_pec: cantiere.cse_pec,
    csePec: cantiere.cse_pec,
    cse_telefono: cantiere.cse_telefono,
    cseTelefono: cantiere.cse_telefono,
    cse_cellulare: cantiere.cse_cellulare,
    cseCellulare: cantiere.cse_cellulare,
    
    // DL
    dl_nome: cantiere.dl_nome,
    dlNome: cantiere.dl_nome,
    dl_email: cantiere.dl_email,
    dlEmail: cantiere.dl_email,
    dl_pec: cantiere.dl_pec,
    dlPec: cantiere.dl_pec,
    dl_telefono: cantiere.dl_telefono,
    dlTelefono: cantiere.dl_telefono,
    dl_cellulare: cantiere.dl_cellulare,
    dlCellulare: cantiere.dl_cellulare,
    
    // Collaudatore
collaudatore_nome: cantiere.collaudatore_nome,
collaudatoreNome: cantiere.collaudatore_nome,
collaudatore_email: cantiere.collaudatore_email,
collaudatoreEmail: cantiere.collaudatore_email,
collaudatore_telefono: cantiere.collaudatore_telefono,
collaudatoreTelefono: cantiere.collaudatore_telefono,
collaudatore_cellulare: cantiere.collaudatore_cellulare,
collaudatoreCellulare: cantiere.collaudatore_cellulare,
collaudatore_pec: cantiere.collaudatore_pec,
collaudatorePec: cantiere.collaudatore_pec,
    
    // DNLT
    data_comunicazione_dnlt: cantiere.data_comunicazione_dnlt,
    dataComunicazioneDNLT: cantiere.data_comunicazione_dnlt,
    scadenza_dnlt: cantiere.scadenza_dnlt,
    scadenzaDNLT: cantiere.scadenza_dnlt,
    
    // Altri
    direttore_lavori: cantiere.direttore_lavori,
    direttoreLavori: cantiere.direttore_lavori,
    responsabile_sicurezza: cantiere.responsabile_sicurezza,
responsabileSicurezza: cantiere.responsabile_sicurezza,
    note: cantiere.note,
    attivo: cantiere.attivo
  });
  setEditingId(cantiere.id);
  setShowForm(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
  const statoColors = {
  pianificato: 'bg-blue-100 text-blue-700',
  in_corso: 'bg-green-100 text-green-700',
  sospeso: 'bg-orange-100 text-orange-700',
  completato: 'bg-gray-100 text-gray-700',
  annullato: 'bg-red-100 text-red-700'
};

const statoLabels = {
  pianificato: 'Pianificato',
  in_corso: 'In Corso',
  sospeso: 'Sospeso',
  completato: 'Completato',
  annullato: 'Annullato'
};

  const cantieriFiltrati = useMemo(() => {
    if (!ricerca) return cantieri;
    
    const searchLower = ricerca.toLowerCase();
    return cantieri.filter(c => 
      c.nome?.toLowerCase().includes(searchLower) ||
      c.indirizzo?.toLowerCase().includes(searchLower) ||
      c.cig?.toLowerCase().includes(searchLower) ||
      c.cup?.toLowerCase().includes(searchLower) ||
      c.rup_nome?.toLowerCase().includes(searchLower) ||
      c.cse_nome?.toLowerCase().includes(searchLower) ||
      c.dl_nome?.toLowerCase().includes(searchLower)
    );
  }, [cantieri, ricerca]);
// ✅ ESPORTA PDF
  const esportaPDF = () => {
    exportCantieriPDF({
      cantieri: cantieriFiltrati
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold">Cantieri</h2>
        
        <div className="flex-1 max-w-md">
          <input 
            type="text"
            placeholder="🔍 Cerca cantieri (nome, indirizzo, CIG, CUP, contatti...)"
            className="border rounded px-4 py-2 w-full"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ stato: 'pianificato' });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            ➕ Nuovo Cantiere
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
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuovo'} Cantiere
          </h3>
          
          <h4 className="font-semibold text-gray-700 mb-2 mt-4">Dati Generali</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nome Cantiere *" 
              className="border rounded px-3 py-2 col-span-2"
              value={formData.nome || ''} 
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              disabled={saving}
            />
            <select 
  className="border rounded px-3 py-2" 
  value={formData.stato || 'pianificato'}
  onChange={(e) => setFormData({...formData, stato: e.target.value})}
  disabled={saving}
>
  <option value="pianificato">Pianificato</option>
  <option value="in_corso">In Corso</option>
  <option value="sospeso">Sospeso</option>
  <option value="completato">Completato</option>
  <option value="annullato">Annullato</option>
</select>
            <input 
              type="text" 
              placeholder="CIG" 
              className="border rounded px-3 py-2"
              value={formData.cig || ''} 
              onChange={(e) => setFormData({...formData, cig: e.target.value})}
              disabled={saving}
            />
            <input 
              type="text" 
              placeholder="CUP" 
              className="border rounded px-3 py-2"
              value={formData.cup || ''} 
              onChange={(e) => setFormData({...formData, cup: e.target.value})}
              disabled={saving}
            />
            <input 
  type="text" 
  placeholder="Cassa Edile"
  className="border rounded px-3 py-2"
  value={formData.casseEdile || formData.casse_edile || ''} 
  onChange={(e) => setFormData({...formData, casseEdile: e.target.value, casse_edile: e.target.value})}
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
  placeholder="Comune" 
  className="border rounded px-3 py-2"
  value={formData.comune || ''} 
  onChange={(e) => setFormData({...formData, comune: e.target.value})}
  disabled={saving}
/>
<input 
  type="text" 
  placeholder="Provincia (es: CE)" 
  className="border rounded px-3 py-2"
  value={formData.provincia || ''} 
  onChange={(e) => setFormData({...formData, provincia: e.target.value})}
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
              type="date" 
              placeholder="Data Inizio" 
              className="border rounded px-3 py-2"
              value={formData.dataInizio || formData.data_inizio || ''} 
              onChange={(e) => setFormData({...formData, dataInizio: e.target.value, data_inizio: e.target.value})}
              disabled={saving}
            />
            <input 
              type="date" 
              placeholder="Data Fine Prevista" 
              className="border rounded px-3 py-2"
              value={formData.dataFinePrevista || formData.data_fine_prevista || ''} 
              onChange={(e) => setFormData({...formData, dataFinePrevista: e.target.value, data_fine_prevista: e.target.value})}
              disabled={saving}
            />
               {/* ========== SEZIONE ECONOMICA ========== */}
            
            {/* 1. IMPORTO CONTRATTO */}
            <input 
              type="number" 
              step="0.01"
              placeholder="Importo Contratto € *" 
              className="border rounded px-3 py-2"
              value={formData.importoContratto || formData.importo_contratto || ''} 
              onChange={(e) => setFormData({...formData, importoContratto: e.target.value, importo_contratto: e.target.value})}
              disabled={saving}
            />

            {/* 2. ONERI SICUREZZA */}
            <input 
              type="number" 
              step="0.01"
              placeholder="Oneri Sicurezza €" 
              className="border rounded px-3 py-2"
              value={formData.oneriSicurezza || formData.oneri_sicurezza || ''} 
              onChange={(e) => setFormData({...formData, oneriSicurezza: e.target.value, oneri_sicurezza: e.target.value})}
              disabled={saving}
            />

            {/* 3. IMPORTO LAVORI - CALCOLATO AUTOMATICAMENTE */}
            <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">💶 Importo Lavori (Calcolato):</span>
                <span className="text-lg font-bold text-blue-600">
                  € {importoLavoriCalcolato().toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Formula: Importo Contratto - Oneri Sicurezza
              </div>
            </div>

            {/* 4. TIPOLOGIA LAVORO */}
            <select 
              className="border rounded px-3 py-2" 
              value={formData.tipologiaLavoro || formData.tipologia_lavoro || ''}
              onChange={(e) => setFormData({...formData, tipologiaLavoro: e.target.value, tipologia_lavoro: e.target.value})}
              disabled={saving}
            >
              <option value="">Tipologia Lavoro</option>
              <option value="a_corpo">📦 A Corpo</option>
              <option value="a_misura">📏 A Misura</option>
            </select>

            {/* 5. RIBASSO D'ASTA */}
            <input 
              type="number" 
              step="0.01"
              min="0"
              max="100"
              placeholder="Ribasso d'Asta %" 
              className="border rounded px-3 py-2"
              value={formData.ribassoAsta || formData.ribasso_asta || ''} 
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 100) {
                  setFormData({...formData, ribassoAsta: e.target.value, ribasso_asta: e.target.value});
                } else if (e.target.value === '') {
                  setFormData({...formData, ribassoAsta: '', ribasso_asta: ''});
                }
              }}
              disabled={saving}
            />
            
            {/* ========== FINE SEZIONE ECONOMICA ========== */}
            {/* ========== MODALITÀ CALCOLO SAL ========== */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">📊 Modalità Calcolo SAL</label>
              <select 
                className="border rounded px-3 py-2 w-full" 
                value={formData.modalitaCalcoloSal || formData.modalita_calcolo_sal || 'solo_lavori'}
                onChange={(e) => setFormData({...formData, modalitaCalcoloSal: e.target.value, modalita_calcolo_sal: e.target.value})}
                disabled={saving}
              >
                <option value="solo_lavori">💶 Solo Lavori (esclusi oneri sicurezza)</option>
                <option value="contratto_completo">📄 Contratto Completo (lavori + oneri)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Scegli come calcolare i SAL in base alle richieste del Direttore Lavori
              </p>
            </div>
            {/* ========== FINE MODALITÀ CALCOLO SAL ========== */}
          </div>

          <h4 className="font-semibold text-gray-700 mb-2 mt-4">RUP - Responsabile Unico Procedimento</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nome RUP" 
              className="border rounded px-3 py-2"
              value={formData.rupNome || formData.rup_nome || ''} 
              onChange={(e) => setFormData({...formData, rupNome: e.target.value, rup_nome: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="Email RUP" 
              className="border rounded px-3 py-2"
              value={formData.rupEmail || formData.rup_email || ''} 
              onChange={(e) => setFormData({...formData, rupEmail: e.target.value, rup_email: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="PEC RUP" 
              className="border rounded px-3 py-2"
              value={formData.rupPec || formData.rup_pec || ''} 
              onChange={(e) => setFormData({...formData, rupPec: e.target.value, rup_pec: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Telefono RUP" 
              className="border rounded px-3 py-2"
              value={formData.rupTelefono || formData.rup_telefono || ''} 
              onChange={(e) => setFormData({...formData, rupTelefono: e.target.value, rup_telefono: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Cellulare RUP" 
              className="border rounded px-3 py-2"
              value={formData.rupCellulare || formData.rup_cellulare || ''} 
              onChange={(e) => setFormData({...formData, rupCellulare: e.target.value, rup_cellulare: e.target.value})}
              disabled={saving}
            />
          </div>

          <h4 className="font-semibold text-gray-700 mb-2 mt-4">CSE - Coordinatore Sicurezza Esecuzione</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nome CSE" 
              className="border rounded px-3 py-2"
              value={formData.cseNome || formData.cse_nome || ''} 
              onChange={(e) => setFormData({...formData, cseNome: e.target.value, cse_nome: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="Email CSE" 
              className="border rounded px-3 py-2"
              value={formData.cseEmail || formData.cse_email || ''} 
              onChange={(e) => setFormData({...formData, cseEmail: e.target.value, cse_email: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="PEC CSE" 
              className="border rounded px-3 py-2"
              value={formData.csePec || formData.cse_pec || ''} 
              onChange={(e) => setFormData({...formData, csePec: e.target.value, cse_pec: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Telefono CSE" 
              className="border rounded px-3 py-2"
              value={formData.cseTelefono || formData.cse_telefono || ''} 
              onChange={(e) => setFormData({...formData, cseTelefono: e.target.value, cse_telefono: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Cellulare CSE" 
              className="border rounded px-3 py-2"
              value={formData.cseCellulare || formData.cse_cellulare || ''} 
              onChange={(e) => setFormData({...formData, cseCellulare: e.target.value, cse_cellulare: e.target.value})}
              disabled={saving}
            />
          </div>

          <h4 className="font-semibold text-gray-700 mb-2 mt-4">DL - Direttore Lavori</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nome DL" 
              className="border rounded px-3 py-2"
              value={formData.dlNome || formData.dl_nome || ''} 
              onChange={(e) => setFormData({...formData, dlNome: e.target.value, dl_nome: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="Email DL" 
              className="border rounded px-3 py-2"
              value={formData.dlEmail || formData.dl_email || ''} 
              onChange={(e) => setFormData({...formData, dlEmail: e.target.value, dl_email: e.target.value})}
              disabled={saving}
            />
            <input 
              type="email" 
              placeholder="PEC DL" 
              className="border rounded px-3 py-2"
              value={formData.dlPec || formData.dl_pec || ''} 
              onChange={(e) => setFormData({...formData, dlPec: e.target.value, dl_pec: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Telefono DL" 
              className="border rounded px-3 py-2"
              value={formData.dlTelefono || formData.dl_telefono || ''} 
              onChange={(e) => setFormData({...formData, dlTelefono: e.target.value, dl_telefono: e.target.value})}
              disabled={saving}
            />
            <input 
              type="tel" 
              placeholder="Cellulare DL" 
              className="border rounded px-3 py-2"
              value={formData.dlCellulare || formData.dl_cellulare || ''} 
              onChange={(e) => setFormData({...formData, dlCellulare: e.target.value, dl_cellulare: e.target.value})}
              disabled={saving}
            />
          </div>

          <h4 className="font-semibold text-gray-700 mb-2 mt-4">Collaudatore</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
  type="text" 
  placeholder="Nome Collaudatore" 
  className="border rounded px-3 py-2"
  value={formData.collaudatoreNome || formData.collaudatore_nome || ''} 
  onChange={(e) => setFormData({...formData, collaudatoreNome: e.target.value, collaudatore_nome: e.target.value})}
  disabled={saving}
/>
<input 
  type="email" 
  placeholder="Email Collaudatore" 
  className="border rounded px-3 py-2"
  value={formData.collaudatoreEmail || formData.collaudatore_email || ''} 
  onChange={(e) => setFormData({...formData, collaudatoreEmail: e.target.value, collaudatore_email: e.target.value})}
  disabled={saving}
/>
<input 
  type="email" 
  placeholder="PEC Collaudatore" 
  className="border rounded px-3 py-2"
  value={formData.collaudatorePec || formData.collaudatore_pec || ''} 
  onChange={(e) => setFormData({...formData, collaudatorePec: e.target.value, collaudatore_pec: e.target.value})}
  disabled={saving}
/>
<input 
  type="tel" 
  placeholder="Telefono Collaudatore" 
  className="border rounded px-3 py-2"
  value={formData.collaudatoreTelefono || formData.collaudatore_telefono || ''} 
  onChange={(e) => setFormData({...formData, collaudatoreTelefono: e.target.value, collaudatore_telefono: e.target.value})}
  disabled={saving}
/>
<input 
  type="tel" 
  placeholder="Cellulare Collaudatore" 
  className="border rounded px-3 py-2"
  value={formData.collaudatoreCellulare || formData.collaudatore_cellulare || ''} 
  onChange={(e) => setFormData({...formData, collaudatoreCellulare: e.target.value, collaudatore_cellulare: e.target.value})}
  disabled={saving}
/>
          </div>

          <h4 className="font-semibold text-gray-700 mb-2 mt-4">DNLT</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="date" 
              placeholder="Data Comunicazione DNLT" 
              className="border rounded px-3 py-2"
              value={formData.dataComunicazioneDNLT || formData.data_comunicazione_dnlt || ''} 
              onChange={(e) => setFormData({...formData, dataComunicazioneDNLT: e.target.value, data_comunicazione_dnlt: e.target.value})}
              disabled={saving}
            />
            <input 
              type="date" 
              placeholder="Scadenza DNLT" 
              className="border rounded px-3 py-2"
              value={formData.scadenzaDNLT || formData.scadenza_dnlt || ''} 
              onChange={(e) => setFormData({...formData, scadenzaDNLT: e.target.value, scadenza_dnlt: e.target.value})}
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

      <div className="space-y-4">
        {cantieriFiltrati.length === 0 && !ricerca ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-gray-500">Nessun cantiere presente</p>
            <p className="text-sm text-gray-400 mt-2">Clicca su "➕ Nuovo Cantiere" per iniziare</p>
          </div>
        ) : cantieriFiltrati.length === 0 && ricerca ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500">Nessun cantiere trovato per "{ricerca}"</p>
            <button 
              onClick={() => setRicerca('')}
              className="mt-3 text-blue-600 hover:underline text-sm">
              ✕ Cancella ricerca
            </button>
          </div>
        ) : (
          cantieriFiltrati.map(cant => {
            const stato = cant.stato || 'pianificato';
            
            return (
              <div key={cant.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-blue-600">{cant.nome}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statoColors[stato]}`}>
                        {statoLabels[stato]}
                      </span>
                        {/* ✅ BADGE ATI */}
  {cant.gara_id && (() => {
    const gara = gare.find(g => g.id === cant.gara_id);
    if (gara?.ati_id) {
      const atiCantiere = ati.find(a => a.id === gara.ati_id);
      return atiCantiere && (
        <span className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-700 font-medium">
          🤝 ATI: {atiCantiere.codice_ati}
        </span>
      );
    }
  })()}
                    </div>
                    <p className="text-gray-600">{cant.indirizzo}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(cant)} 
                      className="text-blue-600 hover:text-blue-800 text-xl"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(cant)} 
                      className="text-red-600 hover:text-red-800 text-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">CIG:</span> {cant.cig || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">CUP:</span> {cant.cup || '-'}
                  </div>
                  <div>
  <span className="text-gray-600 font-medium">Cassa:</span> {cant.casse_edile || '-'}
</div>
                  <div>
                    <span className="text-gray-600 font-medium">Contratto:</span> {cant.importo_contratto ? `€ ${parseFloat(cant.importo_contratto).toFixed(2)}` : '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Lavori:</span> {cant.importo_lavori ? `€ ${parseFloat(cant.importo_lavori).toFixed(2)}` : '-'}
                  </div>
                  {cant.tipologia_lavoro && (
                    <div>
                      <span className="text-gray-600 font-medium">Tipologia:</span>{' '}
                      {cant.tipologia_lavoro === 'a_corpo' ? '📦 A Corpo' : '📏 A Misura'}
                    </div>
                  )}
                  {cant.oneri_sicurezza > 0 && (
                    <div>
                      <span className="text-gray-600 font-medium">Oneri Sic.:</span> € {parseFloat(cant.oneri_sicurezza).toFixed(2)}
                    </div>
                  )}
                  {cant.ribasso_asta > 0 && (
                    <div>
                      <span className="text-gray-600 font-medium">Ribasso:</span> {parseFloat(cant.ribasso_asta).toFixed(2)}%
                    </div>
                  )}

                  <div>
                    <span className="text-gray-600 font-medium">Inizio:</span> {formatDate(cant.data_inizio)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Fine Prevista:</span> {formatDate(cant.data_fine_prevista)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Com. DNLT:</span> {formatDate(cant.data_comunicazione_dnlt)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Scad. DNLT:</span> {formatDate(cant.scadenza_dnlt)}
                  </div>
                </div>

                {/* Sezione contatti */}
                {(cant.rup_nome || cant.cse_nome || cant.dl_nome || cant.collaudatore_nome) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-gray-700 mb-2">Contatti</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {cant.rup_nome && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-blue-600">RUP</p>
                          <p>{cant.rup_nome}</p>
                          {cant.rup_email && <p className="text-gray-600">{cant.rup_email}</p>}
                          {cant.rup_telefono && <p className="text-gray-600">{cant.rup_telefono}</p>}
                        </div>
                      )}
                      {cant.cse_nome && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-blue-600">CSE</p>
                          <p>{cant.cse_nome}</p>
                          {cant.cse_email && <p className="text-gray-600">{cant.cse_email}</p>}
                          {cant.cse_telefono && <p className="text-gray-600">{cant.cse_telefono}</p>}
                        </div>
                      )}
                      {cant.dl_nome && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-blue-600">DL</p>
                          <p>{cant.dl_nome}</p>
                          {cant.dl_email && <p className="text-gray-600">{cant.dl_email}</p>}
                          {cant.dl_telefono && <p className="text-gray-600">{cant.dl_telefono}</p>}
                        </div>
                      )}
                      {cant.collaudatore_nome && (
  <div className="bg-gray-50 p-3 rounded">
    <p className="font-medium text-blue-600">Collaudatore</p>
    <p>{cant.collaudatore_nome}</p>
    {cant.collaudatore_email && <p className="text-gray-600">{cant.collaudatore_email}</p>}
    {cant.collaudatore_pec && <p className="text-gray-600">PEC: {cant.collaudatore_pec}</p>}
    {cant.collaudatore_telefono && <p className="text-gray-600">{cant.collaudatore_telefono}</p>}
  </div>
)}
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

export default Cantieri;