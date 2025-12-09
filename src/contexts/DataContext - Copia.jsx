// src/contexts/DataContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabaseClient';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({
    lavoratori: [],
    cantieri: [],
    fornitori: [],
    subappaltatori: [],
    veicoli: [],
    unilav: [],
    presenze: [],
    notePresenze: [],  // ✅ AGGIUNTO
    certificazioni: [],
    sal: [],
    fattureEmesse: [],
    acconti: [],
    rateizzi: [],
    noteRateizzi: [],
    rate: [],
    movimentiContabili: [],
    settings: [],
    storicoPaghe: [],
    dttFormulari: [],
    cassaEdileLavoratori: [],
    cassaEdileTotali: [],
    ordiniFornitori: [],
    documenti: []
  });

  const [loading, setLoading] = useState({
    lavoratori: true,
    cantieri: true,
    fornitori: true,
    subappaltatori: true,
    veicoli: true,
    unilav: true,
    presenze: true,
    notePresenze: true,  // ✅ AGGIUNTO
    certificazioni: true,
    sal: true,
    fattureEmesse: true,
    acconti: true,
    rateizzi: true,
    noteRateizzi: true,
    rate: true,
    movimentiContabili: true,
    settings: true,
    storicoPaghe: true,
    dttFormulari: true,
    cassaEdileLavoratori: true,
    cassaEdileTotali: true,
    ordiniFornitori: true,
    documenti: true
  });

  const [errors, setErrors] = useState({});

  // Mapping tra nomi visualizzati e nomi tabelle Supabase
  const tableMapping = {
    lavoratori: 'lavoratori',
    cantieri: 'cantieri',
    fornitori: 'fornitori',
    subappaltatori: 'subappaltatori',
    veicoli: 'veicoli',
    unilav: 'unilav',
    presenze: 'presenze',
    notePresenze: 'note_presenze',  // ✅ AGGIUNTO
    certificazioni: 'certificazioni',
    sal: 'sal',
    fattureEmesse: 'fatture_emesse',
    acconti: 'acconti',
    rateizzi: 'rateizzi',
    noteRateizzi: 'note_rateizzi',
    rate: 'rate',
    movimentiContabili: 'movimenti_contabili',
    settings: 'settings',
    storicoPaghe: 'storico_paghe',
    dttFormulari: 'dtt_formulari',
    cassaEdileLavoratori: 'cassa_edile_lavoratori',
    cassaEdileTotali: 'cassa_edile_totali',
    ordiniFornitori: 'ordini_fornitori',
    documenti: 'documenti'
  };

  // Carica dati per una specifica tabella
const fetchTable = async (key) => {
  const tableName = tableMapping[key];
  
  setLoading(prev => ({ ...prev, [key]: true }));
  setErrors(prev => ({ ...prev, [key]: null }));

  try {
    const result = await supabaseHelpers.getAll(tableName);

    if (result.success) {
      console.log(`✅ Loaded ${tableName}:`, result.data?.length || 0, 'records');
      setData(prev => ({ ...prev, [key]: result.data || [] }));
    } else {
      console.error(`❌ Failed to load ${tableName}:`, result.error);
      setErrors(prev => ({ ...prev, [key]: result.error }));
      setData(prev => ({ ...prev, [key]: [] })); // ✅ Imposta array vuoto invece di bloccare
    }
  } catch (error) {
    console.error(`❌ Exception loading ${tableName}:`, error);
    setErrors(prev => ({ ...prev, [key]: error.message }));
    setData(prev => ({ ...prev, [key]: [] })); // ✅ Imposta array vuoto
  }

  setLoading(prev => ({ ...prev, [key]: false }));
};

  // Carica tutti i dati all'avvio
const fetchAllData = async () => {
  const keys = Object.keys(tableMapping);
  
  // ✅ Carica in parallelo MA gestisci errori individualmente
  const results = await Promise.allSettled(
    keys.map(key => fetchTable(key))
  );
  
  // Log risultati
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'rejected') {
      console.error(`❌ Failed to load ${key}:`, result.reason);
    }
  });
  
  console.log('✅ Data loading completed');
};

  useEffect(() => {
    fetchAllData();
  }, []);

  // Operazioni CRUD generiche
  const addRecord = async (key, record) => {
    const tableName = tableMapping[key];
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`📝 Adding record to ${tableName}:`, record);

    const result = await supabaseHelpers.create(tableName, record);

    if (result.success) {
      setData(prev => ({
        ...prev,
        [key]: [result.data, ...prev[key]]
      }));
      return { success: true, data: result.data };
    }

    return result;
  };

  const updateRecord = async (key, id, updates) => {
    const tableName = tableMapping[key];
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`✏️ Updating record in ${tableName}:`, id, updates);

    const result = await supabaseHelpers.update(tableName, id, updates);

    if (result.success) {
      setData(prev => ({
        ...prev,
        [key]: prev[key].map(item => item.id === id ? result.data : item)
      }));
      return { success: true, data: result.data };
    }

    return result;
  };

  const deleteRecord = async (key, id) => {
    const tableName = tableMapping[key];
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`🗑️ Deleting record from ${tableName}:`, id);

    const result = await supabaseHelpers.delete(tableName, id);

    if (result.success) {
      setData(prev => ({
        ...prev,
        [key]: prev[key].filter(item => item.id !== id)
      }));
      return { success: true };
    }

    return result;
  };

  // Helper functions specifiche
  const getLavoratoreById = (id) => {
    return data.lavoratori.find(l => l.id === id);
  };

  const getCantiereById = (id) => {
    return data.cantieri.find(c => c.id === id);
  };

  const getFornitoreById = (id) => {
    return data.fornitori.find(f => f.id === id);
  };

  const getCantieriAttivi = () => {
    return data.cantieri.filter(c => 
      c.attivo !== false && 
      c.stato !== 'completato' && 
      c.stato !== 'annullato'
    );
  };

  const getLavoratoriAttivi = () => {
    return data.lavoratori.filter(l => l.attivo !== false);
  };

  const getFornitoriAttivi = () => {
    return data.fornitori.filter(f => f.attivo !== false);
  };

  // Presenze per lavoratore
  const getPresenzeByLavoratore = (lavoratoreId) => {
    return data.presenze.filter(p => p.lavoratore_id === lavoratoreId);
  };

  // UniLav per lavoratore
  const getUnilavByLavoratore = (lavoratoreId) => {
    return data.unilav.filter(u => u.lavoratore_id === lavoratoreId);
  };

  // Certificazioni per lavoratore
  const getCertificazioniByLavoratore = (lavoratoreId) => {
    return data.certificazioni.filter(c => c.lavoratore_id === lavoratoreId);
  };

  // SAL per cantiere
  const getSalByCantiere = (cantiereId) => {
    return data.sal.filter(s => s.cantiere_id === cantiereId);
  };

  // ✅ Note presenze per lavoratore/mese
  const getNotaPresenza = (lavoratoreId, anno, mese) => {
    return data.notePresenze.find(n => 
      n.lavoratore_id === lavoratoreId && 
      n.anno === anno && 
      n.mese === mese
    );
  };

  // ✅ HELPER PER SETTINGS
  const getSetting = (chiave, defaultValue = null) => {
    const setting = data.settings.find(s => s.chiave === chiave);
    return setting ? setting.valore : defaultValue;
  };

  const setSetting = async (chiave, valore) => {
    // Cerca se esiste già
    const existing = data.settings.find(s => s.chiave === chiave);
    
    if (existing) {
      // Aggiorna
      return await updateRecord('settings', existing.id, { valore: valore.toString() });
    } else {
      // Crea nuovo
      return await addRecord('settings', { chiave, valore: valore.toString() });
    }
  };

  const value = {
    // Data
    ...data,
    
    // Loading states
    loading,
    errors,
    
    // Refresh functions
    fetchTable,
    fetchAllData,
    
    // CRUD operations
    addRecord,
    updateRecord,
    deleteRecord,
    
    // Helper functions
    getLavoratoreById,
    getCantiereById,
    getFornitoreById,
    getCantieriAttivi,
    getLavoratoriAttivi,
    getFornitoriAttivi,
    getPresenzeByLavoratore,
    getUnilavByLavoratore,
    getCertificazioniByLavoratore,
    getSalByCantiere,
    getNotaPresenza,  // ✅ AGGIUNTO
    
    // Settings helpers
    getSetting,
    setSetting
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};