// src/contexts/DataContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { authLoading, profile, user } = useAuth();

  const [data, setData] = useState({
  lavoratori: [],
  cantieri: [],
  fornitori: [],
  clienti: [],
    subappaltatori: [],
    veicoli: [],
    unilav: [],
    presenze: [],
    notePresenze: [],
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
    critical: true,
    secondary: true
  });

  const [errors, setErrors] = useState({});

  // ---------------------------
  // PERFORMANCE LOG
  // ---------------------------
  const performanceLog = {
    queries: [],
    logQuery: (table, duration) => {
      performanceLog.queries.push({ table, duration, time: new Date() });
      if (duration > 500) console.warn(`⚠️ Slow query on ${table}: ${duration}ms`);
    },
    getSlowestQueries: () =>
      performanceLog.queries.sort((a, b) => b.duration - a.duration).slice(0, 10)
  };

  const tableMapping = {
  lavoratori: 'lavoratori',
  cantieri: 'cantieri',
  fornitori: 'fornitori',
  clienti: 'clienti',
    subappaltatori: 'subappaltatori',
    veicoli: 'veicoli',
    unilav: 'unilav',
    presenze: 'presenze',
    notePresenze: 'note_presenze',
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

  const criticalTables = ['lavoratori', 'cantieri', 'fornitori', 'clienti'];
  const secondaryTables = Object.keys(tableMapping).filter(k => !criticalTables.includes(k));

  // ---------------------------
  // FETCH DI UNA TAB.
  // ---------------------------
  const fetchTable = async (key) => {
  const tableName = tableMapping[key];
  const startTime = performance.now();

  setErrors(prev => ({ ...prev, [key]: null }));

  try {
    const result = await supabaseHelpers.getAll(tableName);
    const duration = performance.now() - startTime;
    performanceLog.logQuery(tableName, duration);

    if (result.success) {
      // Ordina alfabeticamente i dati
      let sortedData = result.data || [];
      
      if (key === 'lavoratori') {
        sortedData = sortedData.sort((a, b) => 
          `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it')
        );
      } else if (key === 'fornitori' || key === 'clienti') {
        sortedData = sortedData.sort((a, b) => 
          (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '', 'it')
        );
      } else if (key === 'cantieri') {
        sortedData = sortedData.sort((a, b) => 
          (a.nome || '').localeCompare(b.nome || '', 'it')
        );
      }
      
      setData(prev => ({ ...prev, [key]: sortedData }));
    } else {
        setErrors(prev => ({ ...prev, [key]: result.error }));
        setData(prev => ({ ...prev, [key]: [] }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: error.message }));
      setData(prev => ({ ...prev, [key]: [] }));
    }
  };

  // ---------------------------
  // FETCH ALL
  // ---------------------------
  const fetchAllData = async () => {
    console.log('📊 DataContext: Loading all data…');

    // CRITICAL FIRST
    await Promise.allSettled(criticalTables.map(fetchTable));
    setLoading(prev => ({ ...prev, critical: false }));

    // SECONDARY
    await Promise.allSettled(secondaryTables.map(fetchTable));
    setLoading(prev => ({ ...prev, secondary: false }));

    console.log('✅ Data fully loaded');
  };

  // ---------------------------
  // SYNC WITH AUTH CONTEXT
  // ---------------------------
  useEffect(() => {
    if (authLoading) return; // wait for AuthContext
    if (!user) return;        // no user → skip
    if (!profile) return;     // wait for profile

    console.log('🟢 DataContext: Auth ready → loading data');
    fetchAllData();
  }, [authLoading, user, profile]);

  // ---------------------------
  // CRUD + HELPERS
  // ---------------------------
  const addRecord = async (key, record) => {
    const tableName = tableMapping[key];
    const result = await supabaseHelpers.create(tableName, record);
    if (result.success) {
      setData(prev => ({ ...prev, [key]: [result.data, ...prev[key]] }));
    }
    return result;
  };

  const updateRecord = async (key, id, updates) => {
    const tableName = tableMapping[key];
    const result = await supabaseHelpers.update(tableName, id, updates);
    if (result.success) {
      setData(prev => ({
        ...prev,
        [key]: prev[key].map(item => item.id === id ? result.data : item)
      }));
    }
    return result;
  };

  const deleteRecord = async (key, id) => {
    const tableName = tableMapping[key];
    const result = await supabaseHelpers.delete(tableName, id);
    if (result.success) {
      setData(prev => ({
        ...prev,
        [key]: prev[key].filter(item => item.id !== id)
      }));
    }
    return result;
  };

  const getSetting = (chiave, defaultValue = null) => {
    const setting = data.settings.find(s => s.chiave === chiave);
    return setting ? setting.valore : defaultValue;
  };

  const setSetting = async (chiave, valore) => {
    const existing = data.settings.find(s => s.chiave === chiave);
    if (existing) {
      return await updateRecord('settings', existing.id, { valore });
    } else {
      return await addRecord('settings', { chiave, valore, azienda: profile.azienda });
    }
  };

  const value = {
    ...data,
    loading,
    errors,
    fetchTable,
    fetchAllData,
    addRecord,
    updateRecord,
    deleteRecord,
    getSetting,
    setSetting
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
