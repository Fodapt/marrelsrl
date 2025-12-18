import { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { isFestivita } from '../utils/dateUtils';

function PresenzeCantieri() {
  const {
    presenze = [],
    lavoratori = [],
    cantieri = [],
    unilav = [],
    notePresenze = [], // ✅ Ora disponibile da DataContext
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWorker, setSelectedWorker] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  // ✅ AGGIUNTO: Campo ore_permesso
  const [formData, setFormData] = useState({ 
    tipo: 'lavoro', 
    ore: '8', 
    orePermesso: '', // ✅ NUOVO
    cantiere: '', 
    note: '' 
  });
  
  const [bulkFormData, setBulkFormData] = useState({ 
    tipo: 'lavoro', 
    ore: '8', 
    orePermesso: '', // ✅ NUOVO
    cantiere: '', 
    note: '' 
  });
  
  const [saving, setSaving] = useState(false);

  const [notaMensile, setNotaMensile] = useState('');
  const [notaMensileId, setNotaMensileId] = useState(null);

  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const anni = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
// Funzione per controllare se il lavoratore ha dimissioni nel periodo
const checkDimissioni = (lavoratoreId, date) => {
  const univlavLav = unilav.filter(u => u.lavoratore_id === lavoratoreId);
  const dimissioni = univlavLav.find(u => u.tipo_unilav === 'dimissioni');
  
  if (!dimissioni || !dimissioni.data_inizio) return null;
  
  // Normalizza la data delle dimissioni a mezzanotte
  const [year, month, day] = dimissioni.data_inizio.split('T')[0].split('-').map(Number);
  const dataDim = new Date(year, month - 1, day);
  
  // Normalizza la data da controllare a mezzanotte
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // ✅ Il lavoratore è dimesso dal giorno delle dimissioni in poi (escluso il giorno prima)
  return targetDate >= dataDim ? dataDim : null;
};

  const tipiPresenza = [
    { value: 'lavoro', label: 'Lavoro', color: 'bg-green-200 border-green-500' },
    { value: 'malattia', label: 'Malattia', color: 'bg-red-200 border-red-500' },
    { value: 'ferie', label: 'Ferie', color: 'bg-blue-200 border-blue-500' },
    { value: 'festivita', label: 'Festività', color: 'bg-purple-200 border-purple-500' },
    { value: 'assenza', label: 'Assenza', color: 'bg-gray-300 border-gray-500' },
    { value: 'pioggia', label: 'Ore Pioggia', color: 'bg-yellow-200 border-yellow-500' }
  ];

  // ✅ Imposta il primo lavoratore come selezionato
  useEffect(() => {
    if (lavoratori.length > 0 && !selectedWorker) {
      setSelectedWorker(lavoratori[0].id);
    }
  }, [lavoratori]);

  // ✅ CARICA NOTA MENSILE (CORRETTO)
  useEffect(() => {
    if (!selectedWorker) return;

    const notaEsistente = notePresenze.find(n => 
      n.lavoratore_id === selectedWorker &&
      n.anno === selectedYear &&
      n.mese === selectedMonth
    );

    if (notaEsistente) {
      setNotaMensile(notaEsistente.nota || '');
      setNotaMensileId(notaEsistente.id);
    } else {
      setNotaMensile('');
      setNotaMensileId(null);
    }
  }, [selectedWorker, selectedYear, selectedMonth, notePresenze]);

  // ✅ MOSTRA LOADING
  if (loading.presenze || loading.lavoratori || loading.cantieri || loading.unilav) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento presenze...</p>
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

  const formatDateShort = (date) => date.toLocaleDateString('it-IT', { 
    weekday: 'short', 
    day: '2-digit', 
    month: '2-digit' 
  });

  const getCantiereFromUnilav = (lavoratoreId, date) => {
  // Normalizza sempre la data a mezzanotte
  let targetDate;
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  
  const univlavLavoratore = unilav.filter(u => u.lavoratore_id === lavoratoreId);
  
  const univlavAttivi = univlavLavoratore.filter(u => {
    // Normalizza anche le date di inizio/fine a mezzanotte
    const inizioStr = u.data_inizio.split('T')[0];
    const [yI, mI, dI] = inizioStr.split('-').map(Number);
    const inizio = new Date(yI, mI - 1, dI);
    
    let fine;
    if (u.data_fine) {
      const fineStr = u.data_fine.split('T')[0];
      const [yF, mF, dF] = fineStr.split('-').map(Number);
      fine = new Date(yF, mF - 1, dF);
    } else {
      fine = new Date(2099, 11, 31);
    }
    
    return targetDate >= inizio && targetDate <= fine;
  });
    if (univlavAttivi.length === 0) return null;
    
    if (univlavAttivi.length > 1) {
      univlavAttivi.sort((a, b) => new Date(b.data_inizio) - new Date(a.data_inizio));
    }
    
    return univlavAttivi[0].cantiere_id;
  };

  const getDaysInMonth = (month, year) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysInMonth = useMemo(() => getDaysInMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  
  const getPresenzaForDate = (workerId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return presenze.find(p => 
      p.lavoratore_id === workerId && 
      p.data === dateStr
    );
  };

  const getCantiereName = (cantiereId) => cantieri.find(c => c.id === cantiereId)?.nome || cantiereId;
  
  const getWeekNumber = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
  };

  const getTipoInfo = (tipo) => tipiPresenza.find(t => t.value === tipo);

  // ✅ APRI MODAL SINGOLA PRESENZA (AGGIUNTO ore_permesso)
  const openModal = (date) => {
    if (selectionMode) { 
      toggleDaySelection(date); 
      return; 
    }
    setSelectedDate(date);
    const existing = getPresenzaForDate(selectedWorker, date);
    
    if (existing) {
      setFormData({
        tipo: existing.tipo,
        ore: existing.ore?.toString() || '',
        orePioggia: existing.ore_pioggia?.toString() || '',
        orePermesso: existing.ore_permesso?.toString() || '', // ✅ CARICA ore_permesso
        cantiere: existing.cantiere_id || '',
        note: existing.note || ''
      });
    } else {
      const suggestedCantiere = getCantiereFromUnilav(selectedWorker, date);
      setFormData({ 
        tipo: 'lavoro', 
        ore: '8', 
        orePioggia: '', 
        orePermesso: '', // ✅ RESET
        cantiere: suggestedCantiere || '', 
        note: '' 
      });
    }
    setShowModal(true);
  };

  // ✅ SALVA PRESENZA SINGOLA (AGGIUNTO ore_permesso)
  const savePresenza = async () => {
    if (!selectedDate) return;
    
    setSaving(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const dataForSupabase = {
      lavoratore_id: selectedWorker,
      data: dateStr,
      tipo: formData.tipo,
      ore: parseFloat(formData.ore) || 0,
      ore_pioggia: parseFloat(formData.orePioggia) || 0,
      ore_permesso: parseFloat(formData.orePermesso) || 0, // ✅ SALVA ore_permesso
      cantiere_id: formData.cantiere || null,
      note: formData.note || null
    };

    const existing = getPresenzaForDate(selectedWorker, selectedDate);
    
    let result;
    if (existing) {
      result = await updateRecord('presenze', existing.id, dataForSupabase);
    } else {
      result = await addRecord('presenze', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setShowModal(false);
      setSelectedDate(null);
      setFormData({ tipo: 'lavoro', ore: '8', orePioggia: '', orePermesso: '', cantiere: '', note: '' });
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA PRESENZA
  const deletePresenza = async (date) => {
    const presenza = getPresenzaForDate(selectedWorker, date);
    if (!presenza) return;

    const result = await deleteRecord('presenze', presenza.id);

    if (!result.success) {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ SELEZIONE MULTIPLA
  const toggleDaySelection = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const startSelectionMode = () => { 
    setSelectionMode(true); 
    setSelectedDays(new Set()); 
  };

  const cancelSelection = () => { 
    setSelectionMode(false); 
    setSelectedDays(new Set()); 
  };

  const openBulkModal = () => {
    if (selectedDays.size === 0) return;
    const firstDate = Array.from(selectedDays)[0];
    const suggestedCantiere = getCantiereFromUnilav(selectedWorker, firstDate) || '';
    setBulkFormData({ tipo: 'lavoro', ore: '8', orePioggia: '', orePermesso: '', cantiere: suggestedCantiere, note: '' });
    setShowBulkModal(true);
  };

  // ✅ APPLICA MODIFICA MULTIPLA (AGGIUNTO ore_permesso)
  const applyBulkEdit = async () => {
    setSaving(true);
    
    const promises = Array.from(selectedDays).map(async (dateStr) => {
      const dataForSupabase = {
        lavoratore_id: selectedWorker,
        data: dateStr,
        tipo: bulkFormData.tipo,
        ore: parseFloat(bulkFormData.ore) || 0,
        ore_pioggia: parseFloat(bulkFormData.orePioggia) || 0,
        ore_permesso: parseFloat(bulkFormData.orePermesso) || 0, // ✅ SALVA ore_permesso
        cantiere_id: bulkFormData.cantiere || null,
        note: bulkFormData.note || null
      };

      const existing = presenze.find(p => 
        p.lavoratore_id === selectedWorker && 
        p.data === dateStr
      );

      if (existing) {
        return await updateRecord('presenze', existing.id, dataForSupabase);
      } else {
        return await addRecord('presenze', dataForSupabase);
      }
    });

    const results = await Promise.all(promises);
    setSaving(false);

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      alert(`❌ ${failed.length} operazioni fallite`);
    } else {
      alert(`✅ ${selectedDays.size} presenze salvate!`);
    }

    setShowBulkModal(false);
    setSelectionMode(false);
    setSelectedDays(new Set());
  };

  // ✅ SELEZIONI RAPIDE
  const selectWeekdays = () => {
    const weekdayDates = daysInMonth
      .filter(day => day.getDay() !== 0 && day.getDay() !== 6)
      .map(day => day.toISOString().split('T')[0]);
    setSelectedDays(new Set(weekdayDates));
  };

  const selectWeekends = () => {
    const weekendDates = daysInMonth
      .filter(day => day.getDay() === 0 || day.getDay() === 6)
      .map(day => day.toISOString().split('T')[0]);
    setSelectedDays(new Set(weekendDates));
  };

  const selectEmptyDays = () => {
    const emptyDates = daysInMonth
      .filter(day => !getPresenzaForDate(selectedWorker, day))
      .map(day => day.toISOString().split('T')[0]);
    setSelectedDays(new Set(emptyDates));
  };

  // ✅ AUTO-COMPILA DA UNILAV
  const autoFillFromUnilav = async () => {
    setSaving(true);
    let giorniAggiunti = 0;
    let festivitaAggiunte = 0;
    
    const promises = daysInMonth
      .filter(day => {
  if (day.getDay() === 0 || day.getDay() === 6) return false;
  const esistente = getPresenzaForDate(selectedWorker, day);
  if (esistente) return false;
  
  // ✅ Controlla dimissioni
  const dataDimissioni = checkDimissioni(selectedWorker, day);
  if (dataDimissioni) return false;
  
  return true;
})
      .map(async (day) => {
        const dateStr = day.toISOString().split('T')[0];
        
        if (isFestivita(day)) {
          festivitaAggiunte++;
          return await addRecord('presenze', {
            lavoratore_id: selectedWorker,
            data: dateStr,
            tipo: 'festivita',
            ore: 0,
            ore_pioggia: 0,
            ore_permesso: 0,
            cantiere_id: null,
            note: 'Festività'
          });
        }
        
        const cantiereId = getCantiereFromUnilav(selectedWorker, day);
        if (cantiereId) {
          giorniAggiunti++;
          return await addRecord('presenze', {
            lavoratore_id: selectedWorker,
            data: dateStr,
            tipo: 'lavoro',
            ore: 8,
            ore_pioggia: 0,
            ore_permesso: 0,
            cantiere_id: cantiereId,
            note: 'Auto-compilato da UniLav'
          });
        }
        
        return null;
      })
      .filter(p => p !== null);

    await Promise.all(promises);
    setSaving(false);
    
    alert(`✅ Auto-compilazione completata!\n\n• ${giorniAggiunti} giorni lavorativi aggiunti\n• ${festivitaAggiunte} festività aggiunte`);
  };

  // ✅ SALVA NOTA MENSILE (CORRETTO)
  const saveNotaMensile = async () => {
    setSaving(true);

    let result;
    if (notaMensileId) {
      // ✅ Aggiorna nota esistente
      result = await updateRecord('notePresenze', notaMensileId, {
        nota: notaMensile
      });
    } else {
      // ✅ Crea nuova nota
      result = await addRecord('notePresenze', {
        lavoratore_id: selectedWorker,
        anno: selectedYear,
        mese: selectedMonth,
        nota: notaMensile
      });
      
      // Se creata con successo, salva l'ID
      if (result.success && result.data) {
        setNotaMensileId(result.data.id);
      }
    }

    setSaving(false);

    if (!result.success) {
      alert('❌ Errore nel salvataggio nota: ' + result.error);
    }
  };

  // ✅ RIEPILOGO MENSILE (AGGIORNATO per usare ore_permesso dal DB)
  const riepilogo = useMemo(() => {
    const summary = { 
      oreLavoro: 0, 
      giorniLavoro: 0, 
      giorniMalattia: 0, 
      giorniFerie: 0, 
      giorniFestivita: 0, 
      giorniAssenza: 0, 
      orePioggia: 0,
      orePermesso: 0, 
      cantieri: {} 
    };
    
    daysInMonth.forEach(day => {
  // ✅ Salta i giorni dopo le dimissioni
  const isDimesso = checkDimissioni(selectedWorker, day);
  if (isDimesso) return;
  
  // ✅ Salta i weekend
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  
  const presenza = getPresenzaForDate(selectedWorker, day);
  if (presenza) {
        const ore = parseFloat(presenza.ore) || 0;
        const orePioggia = parseFloat(presenza.ore_pioggia) || 0;
        const orePermesso = parseFloat(presenza.ore_permesso) || 0; // ✅ LEGGI dal DB
        
        switch (presenza.tipo) {
          case 'lavoro':
            summary.oreLavoro += ore;
            summary.giorniLavoro += 1;
            if (orePioggia > 0) summary.orePioggia += orePioggia;
            
            // ✅ USA ore_permesso dal database
            if (orePermesso > 0) {
              summary.orePermesso += orePermesso;
            }
            
            if (presenza.cantiere_id) {
              summary.cantieri[presenza.cantiere_id] = (summary.cantieri[presenza.cantiere_id] || 0) + ore;
            }
            break;
          case 'malattia': 
            summary.giorniMalattia += 1; 
            break;
          case 'ferie': 
            summary.giorniFerie += 1; 
            break;
          case 'festivita': 
            summary.giorniFestivita += 1; 
            break;
          case 'assenza': 
            summary.giorniAssenza += 1; 
            break;
          case 'pioggia': 
          summary.orePioggia += ore; 
          break;
      }
    } else if (!isWeekend) {
      // ✅ Conta come assenza solo i giorni feriali vuoti (non weekend e non dimessi)
      summary.giorniAssenza += 1;
    }
  });
    return summary;
  }, [presenze, selectedWorker, daysInMonth]);

  if (lavoratori.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          Nessun lavoratore presente. Aggiungi prima dei lavoratori nella sezione "Lavoratori".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selettori mese, anno, lavoratore */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mese</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="w-full px-4 py-2 border rounded-lg"
            >
              {mesi.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Anno</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="w-full px-4 py-2 border rounded-lg"
            >
              {anni.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lavoratore</label>
            <select 
              value={selectedWorker} 
              onChange={(e) => setSelectedWorker(e.target.value)} 
              className="w-full px-4 py-2 border rounded-lg"
            >
              {lavoratori.map(l => (
                <option key={l.id} value={l.id}>
                  {l.cognome} {l.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pulsante auto-compilazione */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <button 
          onClick={autoFillFromUnilav}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '⏳ Elaborazione...' : '🤖 Auto-compila da UniLav (giorni feriali + festività)'}
        </button>
      </div>

      {/* Toolbar inserimento multiplo */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3">
          {!selectionMode ? (
            <button 
              onClick={startSelectionMode} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ✓ Inserimento Multiplo
            </button>
          ) : (
            <>
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                {selectedDays.size} giorni selezionati
              </div>
              <button 
                onClick={selectWeekdays} 
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Giorni Feriali
              </button>
              <button 
                onClick={selectWeekends} 
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Weekend
              </button>
              <button 
                onClick={selectEmptyDays} 
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Giorni Vuoti
              </button>
              <div className="flex-1"></div>
              <button 
                onClick={openBulkModal} 
                disabled={selectedDays.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Applica
              </button>
              <button 
                onClick={cancelSelection} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Annulla
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Calendario Presenze</h2>
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(weekNum => {
            const weekDays = daysInMonth.filter(day => getWeekNumber(day) === weekNum);
            if (weekDays.length === 0) return null;
            
            return (
              <div key={weekNum}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-600">Settimana {weekNum}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weekDays.map((day, index) => {
                    const presenza = getPresenzaForDate(selectedWorker, day);
                    const tipoInfo = presenza ? getTipoInfo(presenza.tipo) : null;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const dateStr = day.toISOString().split('T')[0];
                    const isSelected = selectedDays.has(dateStr);
                    const suggestedCantiere = getCantiereFromUnilav(selectedWorker, day);
                    const hasUnilavAssignment = !!suggestedCantiere;
                    const dataDimissioni = checkDimissioni(selectedWorker, day);
                    const isDimesso = !!dataDimissioni;
                    
                    // ✅ Mostra warning se ci sono ore permesso
                    const hasPermesso = presenza?.ore_permesso && parseFloat(presenza.ore_permesso) > 0;

// ✅ Non mostrare i giorni dopo le dimissioni
if (isDimesso && !presenza) {
  return null;
}

return (
  <div 
                        key={index}
                        className={`border-2 rounded-lg p-3 ${isDimesso ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} transition-all ${
  isDimesso ? 'bg-gray-200 border-gray-400' :
  isSelected ? 'ring-4 ring-blue-400' :
                          presenza ? (
                            hasPermesso 
                              ? 'bg-orange-100 border-orange-400'
                              : tipoInfo.color
                          ) : 
                          isWeekend ? 'bg-gray-50 border-gray-200' : 
                          hasUnilavAssignment ? 'bg-emerald-100 border-emerald-400' :
                          'bg-white border-gray-200'
                        } ${selectionMode ? 'hover:ring-2 hover:ring-blue-300' : 'hover:shadow-md'}`}
                        onClick={() => !isDimesso && openModal(day)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800 text-sm">
                            {formatDateShort(day)}
                          </div>
                          {presenza && !selectionMode && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                deletePresenza(day); 
                              }} 
                              className="text-red-500 hover:text-red-700"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        {presenza ? (
                          <div className="text-sm space-y-1">
                            <div className="font-medium text-gray-700">{tipoInfo.label}</div>
                            {presenza.ore && (
                              <div className="text-gray-600">
                                {presenza.ore} ore{presenza.tipo === 'lavoro' ? ' lavorate' : ''}
                              </div>
                            )}
                            {/* ✅ MOSTRA ORE PERMESSO DAL DATABASE */}
                            {hasPermesso && (
                              <div className="text-orange-600 font-semibold text-xs">
                                ⏰ {presenza.ore_permesso}h permesso
                              </div>
                            )}
                            {presenza.ore_pioggia && parseFloat(presenza.ore_pioggia) > 0 && (
                              <div className="text-yellow-600 text-xs">
                                ☔ {presenza.ore_pioggia} ore pioggia
                              </div>
                            )}
                            {presenza.cantiere_id && (
                              <div className="text-gray-600 text-xs truncate">
                                {getCantiereName(presenza.cantiere_id)}
                              </div>
                            )}
                          </div>
                        ) : hasUnilavAssignment ? (
                          <div className="text-xs text-green-700">
                            <div className="font-medium mb-1">UniLav</div>
                            <div className="truncate">{getCantiereName(suggestedCantiere)}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {selectionMode ? 'Seleziona' : 'Aggiungi'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riepilogo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Riepilogo Mensile</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Ore Lavorate</div>
            <div className="text-2xl font-bold text-green-900">{riepilogo.oreLavoro.toFixed(1)} h</div>
            <div className="text-xs text-green-600 mt-1">{riepilogo.giorniLavoro} giorni</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">Giorni Malattia</div>
            <div className="text-2xl font-bold text-red-900">{riepilogo.giorniMalattia}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Giorni Ferie</div>
            <div className="text-2xl font-bold text-blue-900">{riepilogo.giorniFerie}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Festività</div>
            <div className="text-2xl font-bold text-purple-900">{riepilogo.giorniFestivita}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700 mb-1">Giorni Assenza</div>
            <div className="text-2xl font-bold text-gray-900">{riepilogo.giorniAssenza}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-700 mb-1">Ore Pioggia</div>
            <div className="text-2xl font-bold text-yellow-900">{riepilogo.orePioggia.toFixed(1)} h</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Ore Permesso</div>
            <div className="text-2xl font-bold text-orange-900">{riepilogo.orePermesso.toFixed(1)} h</div>
            <div className="text-xs text-orange-600 mt-1">inserite manualmente</div>
          </div>
        </div>

        {Object.keys(riepilogo.cantieri).length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Dettaglio per Cantiere</h3>
            <div className="space-y-2">
              {Object.entries(riepilogo.cantieri).map(([cantiereId, ore]) => (
                <div key={cantiereId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{getCantiereName(cantiereId)}</span>
                  <span className="font-semibold text-gray-900">{ore.toFixed(1)} ore</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nota mensile */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">📝 Nota Mensile</h2>
        <textarea
          value={notaMensile}
          onChange={(e) => setNotaMensile(e.target.value)}
          onBlur={saveNotaMensile}
          placeholder="Aggiungi una nota per questo mese..."
          className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
          disabled={saving}
        />
        <p className="text-xs text-gray-500 mt-2">💡 La nota viene salvata automaticamente quando esci dal campo</p>
      </div>


   {/* Pulsante Esporta PDF */}
      <div className="bg-white rounded-lg shadow p-4">
        <button 
          onClick={() => {
            const lavoratore = lavoratori.find(l => l.id === selectedWorker);
            const nomeLavoratore = lavoratore ? `${lavoratore.cognome} ${lavoratore.nome}` : 'Lavoratore';
            const meseName = mesi[selectedMonth];
            
            const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Presenze ${meseName} ${selectedYear} - ${nomeLavoratore}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; text-align: center; }
    .info { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
    .calendario { margin: 30px 0; }
    .settimana { margin-bottom: 30px; page-break-inside: avoid; }
    .settimana-title { font-weight: bold; color: #4b5563; margin-bottom: 10px; font-size: 14px; }
    .giorni-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
    .giorno-card { border: 2px solid #d1d5db; border-radius: 8px; padding: 10px; min-height: 80px; }
    .giorno-card.lavoro { background: #dcfce7; border-color: #22c55e; }
    .giorno-card.lavoro-permesso { background: #fed7aa; border-color: #f97316; }
    .giorno-card.malattia { background: #fecaca; border-color: #ef4444; }
    .giorno-card.ferie { background: #bfdbfe; border-color: #3b82f6; }
    .giorno-card.festivita { background: #e9d5ff; border-color: #a855f7; }
    .giorno-card.assenza { background: #e5e7eb; border-color: #6b7280; }
    .giorno-card.pioggia { background: #fef08a; border-color: #eab308; }
    .giorno-card.weekend { background: #f3f4f6; }
    .giorno-header { font-weight: bold; font-size: 12px; color: #374151; margin-bottom: 5px; }
    .giorno-tipo { font-weight: 600; font-size: 13px; color: #1f2937; }
    .giorno-ore { font-size: 11px; color: #4b5563; }
    .giorno-permesso { font-size: 10px; color: #ea580c; font-weight: bold; }
    .giorno-cantiere { font-size: 10px; color: #6b7280; margin-top: 3px; }
    .riepilogo { margin-top: 40px; }
    .riepilogo h2 { color: #1f2937; font-size: 20px; margin-bottom: 20px; }
    .riepilogo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .riepilogo-card { border: 2px solid; border-radius: 8px; padding: 15px; }
    .riepilogo-card.lavoro { background: #dcfce7; border-color: #22c55e; }
    .riepilogo-card.malattia { background: #fecaca; border-color: #ef4444; }
    .riepilogo-card.ferie { background: #bfdbfe; border-color: #3b82f6; }
    .riepilogo-card.festivita { background: #e9d5ff; border-color: #a855f7; }
    .riepilogo-card.assenza { background: #e5e7eb; border-color: #6b7280; }
    .riepilogo-card.pioggia { background: #fef08a; border-color: #eab308; }
    .riepilogo-card.permesso { background: #fed7aa; border-color: #f97316; }
    .riepilogo-label { font-size: 12px; color: #4b5563; margin-bottom: 5px; }
    .riepilogo-valore { font-size: 24px; font-weight: bold; color: #1f2937; }
    .riepilogo-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .dettaglio-cantieri { margin-top: 20px; }
    .dettaglio-cantieri h3 { font-size: 16px; color: #1f2937; margin-bottom: 15px; }
    .cantiere-item { display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px; }
    .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid #d1d5db; padding-top: 20px; }
    @media print { .no-print { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">
    🖨️ Stampa / Salva PDF
  </button>
  
  <h1>Presenze ${meseName} ${selectedYear} - ${nomeLavoratore}</h1>
  
  <div class="info">
    <strong>Periodo:</strong> ${meseName} ${selectedYear}<br>
    <strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
  
  ${notaMensile ? `
    <div class="nota-mensile" style="background:#fef9c3; padding:15px; border-radius:8px; border:1px solid #facc15; margin:20px 0;">
      <strong>📝 Nota Mensile:</strong><br>
      <div style="white-space:pre-wrap; margin-top:8px; font-size:13px; color:#444;">
        ${notaMensile}
      </div>
    </div>
  ` : ''}

  <div class="calendario">
    ${[1, 2, 3, 4, 5].map(weekNum => {
      const weekDays = daysInMonth.filter(day => getWeekNumber(day) === weekNum);
      if (weekDays.length === 0) return '';
      
      const weekHtml = weekDays.map(day => {
        const presenza = getPresenzaForDate(selectedWorker, day);
        const tipoInfo = presenza ? getTipoInfo(presenza.tipo) : null;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const dateStr = formatDateShort(day);
        const ore = parseFloat(presenza?.ore || 0);
        const hasPermesso = presenza?.tipo === 'lavoro' && ore < 8;
        
        let cardClass = 'giorno-card';
        if (presenza) {
          if (hasPermesso) {
            cardClass += ' lavoro-permesso';
          } else {
            cardClass += ' ' + presenza.tipo;
          }
        } else if (isWeekend) {
          cardClass += ' weekend';
        }
        
        let content = '<div class="' + cardClass + '">';
        content += '<div class="giorno-header">' + dateStr + '</div>';
        
        if (presenza) {
          content += '<div class="giorno-tipo">' + tipoInfo.label + '</div>';
          if (presenza.ore) {
            content += '<div class="giorno-ore">' + presenza.ore + ' ore' + (presenza.tipo === 'lavoro' ? ' lav.' : '') + '</div>';
            if (hasPermesso) {
              content += '<div class="giorno-permesso">(-' + (8 - ore).toFixed(1) + 'h permesso)</div>';
            }
          }
          if (presenza.ore_pioggia && parseFloat(presenza.ore_pioggia) > 0) {
            content += '<div class="giorno-ore" style="color: #ca8a04;">☔ ' + presenza.ore_pioggia + ' ore pioggia</div>';
          }
          if (presenza.cantiere_id) {
            content += '<div class="giorno-cantiere">' + getCantiereName(presenza.cantiere_id) + '</div>';
          }
        }
        content += '</div>';
        return content;
      }).join('');
      
      return '<div class="settimana"><div class="settimana-title">Settimana ' + weekNum + '</div><div class="giorni-grid">' + weekHtml + '</div></div>';
    }).join('')}
  </div>
  
  <div class="riepilogo">
    <h2>Riepilogo Mensile</h2>
    <div class="riepilogo-grid">
      <div class="riepilogo-card lavoro">
        <div class="riepilogo-label">Ore Lavorate</div>
        <div class="riepilogo-valore">${riepilogo.oreLavoro.toFixed(1)} h</div>
        <div class="riepilogo-sub">${riepilogo.giorniLavoro} giorni</div>
      </div>
      <div class="riepilogo-card malattia">
        <div class="riepilogo-label">Giorni Malattia</div>
        <div class="riepilogo-valore">${riepilogo.giorniMalattia}</div>
      </div>
      <div class="riepilogo-card ferie">
        <div class="riepilogo-label">Giorni Ferie</div>
        <div class="riepilogo-valore">${riepilogo.giorniFerie}</div>
      </div>
      <div class="riepilogo-card festivita">
        <div class="riepilogo-label">Festività</div>
        <div class="riepilogo-valore">${riepilogo.giorniFestivita}</div>
      </div>
      <div class="riepilogo-card assenza">
        <div class="riepilogo-label">Giorni Assenza</div>
        <div class="riepilogo-valore">${riepilogo.giorniAssenza}</div>
      </div>
      <div class="riepilogo-card pioggia">
        <div class="riepilogo-label">Ore Pioggia</div>
        <div class="riepilogo-valore">${riepilogo.orePioggia.toFixed(1)} h</div>
      </div>
      <div class="riepilogo-card permesso">
        <div class="riepilogo-label">Ore Permesso</div>
        <div class="riepilogo-valore">${riepilogo.orePermesso.toFixed(1)} h</div>
        <div class="riepilogo-sub">ore < 8</div>
      </div>
    </div>
    
    ${Object.keys(riepilogo.cantieri).length > 0 ? `
      <div class="dettaglio-cantieri">
        <h3>Dettaglio per Cantiere</h3>
        ${Object.entries(riepilogo.cantieri).map(([cantiereId, ore]) => `
          <div class="cantiere-item">
            <span class="cantiere-nome">${getCantiereName(cantiereId)}</span>
            <span class="cantiere-ore">${ore.toFixed(1)} ore</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Gestionale Marrel S.r.l. - Report Presenze</p>
    <p>Documento generato automaticamente dal sistema</p>
  </div>
</body>
</html>
            `;
            const newWindow = window.open('', '_blank');
            newWindow.document.write(htmlContent);
            newWindow.document.close();
          }} 
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-center font-semibold"
        >
          📄 Esporta PDF Presenze
        </button>
      </div>



      {/* Modal singola presenza - CON CAMPO ORE PERMESSO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {selectedDate && formatDateShort(selectedDate)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select 
                  value={formData.tipo} 
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={saving}
                >
                  {tipiPresenza.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              
              {(formData.tipo === 'lavoro' || formData.tipo === 'pioggia') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.tipo === 'lavoro' ? 'Ore Lavorate' : 'Ore'}
                  </label>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={formData.ore} 
                    onChange={(e) => setFormData({ ...formData, ore: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" 
                    placeholder="8.0"
                    disabled={saving}
                  />
                </div>
              )}
              
              {/* ✅ CAMPO ORE PERMESSO */}
              {formData.tipo === 'lavoro' && (
                <>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <label className="block text-sm font-medium mb-2 text-orange-800">
                      ⏰ Ore Permesso
                    </label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.orePermesso || ''} 
                      onChange={(e) => setFormData({ ...formData, orePermesso: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg" 
                      placeholder="0"
                      disabled={saving}
                    />
                    <p className="text-xs text-orange-600 mt-1">
                      Inserisci le ore di permesso prese (es: 2 = 2 ore di permesso)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ore Pioggia</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.orePioggia || ''} 
                      onChange={(e) => setFormData({ ...formData, orePioggia: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg" 
                      placeholder="0"
                      disabled={saving}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Cantiere</label>
                    <select 
                      value={formData.cantiere} 
                      onChange={(e) => setFormData({ ...formData, cantiere: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={saving}
                    >
                      <option value="">Seleziona cantiere</option>
                      {cantieri.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <textarea 
                  value={formData.note} 
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" 
                  rows="3" 
                  placeholder="Note..."
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Annulla
              </button>
              <button 
                onClick={savePresenza} 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '⏳...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal inserimento multiplo - CON CAMPO ORE PERMESSO */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Inserimento per {selectedDays.size} giorni
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select 
                  value={bulkFormData.tipo} 
                  onChange={(e) => setBulkFormData({ ...bulkFormData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={saving}
                >
                  {tipiPresenza.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              
              {(bulkFormData.tipo === 'lavoro' || bulkFormData.tipo === 'pioggia') && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ore</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={bulkFormData.ore}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, ore: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={saving}
                    />
                  </div>
                  
                  {/* ✅ CAMPO ORE PERMESSO PER BULK */}
                  {bulkFormData.tipo === 'lavoro' && (
                    <>
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <label className="block text-sm font-medium mb-2 text-orange-800">
                          ⏰ Ore Permesso
                        </label>
                        <input 
                          type="number" 
                          step="0.5" 
                          value={bulkFormData.orePermesso || ''} 
                          onChange={(e) => setBulkFormData({ ...bulkFormData, orePermesso: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg" 
                          placeholder="0"
                          disabled={saving}
                        />
                        <p className="text-xs text-orange-600 mt-1">
                          Applicato a tutti i giorni selezionati
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Cantiere</label>
                        <select 
                          value={bulkFormData.cantiere} 
                          onChange={(e) => setBulkFormData({ ...bulkFormData, cantiere: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          disabled={saving}
                        >
                          <option value="">Seleziona cantiere</option>
                          {cantieri.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowBulkModal(false)} 
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Annulla
              </button>
              <button 
                onClick={applyBulkEdit} 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '⏳...' : 'Applica a tutti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresenzeCantieri;