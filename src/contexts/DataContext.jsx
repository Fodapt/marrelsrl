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
    lavoratori: true,
    cantieri: true,
    fornitori: true,
    subappaltatori: true,
    veicoli: true,
    unilav: true,
    presenze: true,
    notePresenze: true,
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
    documenti: true,
    critical: true,    // ⚡ NUOVO
    secondary: true    // ⚡ NUOVO
  });

  const [errors, setErrors] = useState({});

  // ⚡ Performance logging
  const performanceLog = {
    queries: [],
    logQuery: (table, duration) => {
      performanceLog.queries.push({ table, duration, time: new Date() });
      if (duration > 500) {
        console.warn(`⚠️ Slow query on ${table}: ${duration}ms`);
      }
    },
    getSlowestQueries: () => {
      return performanceLog.queries
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    }
  };

  // Mapping tra nomi visualizzati e nomi tabelle Supabase
  const tableMapping = {
    lavoratori: 'lavoratori',
    cantieri: 'cantieri',
    fornitori: 'fornitori',
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

  // ⚡ Definisci dati critici vs secondari
  const criticalTables = ['lavoratori', 'cantieri', 'fornitori'];
  const secondaryTables = Object.keys(tableMapping).filter(k => !criticalTables.includes(k));

const fetchTable = async (key) => {
  const tableName = tableMapping[key];
  const startTime = performance.now();
  
  setLoading(prev => ({ ...prev, [key]: true }));
  setErrors(prev => ({ ...prev, [key]: null }));

  try {
    const result = await supabaseHelpers.getAll(tableName);
    const duration = performance.now() - startTime;

    if (result.success) {
      setData(prev => ({ ...prev, [key]: result.data || [] }));
    } else {
      console.error(`❌ Failed ${tableName}:`, result.error);
      setErrors(prev => ({ ...prev, [key]: result.error }));
      setData(prev => ({ ...prev, [key]: [] }));
    }
  } catch (error) {
    console.error(`❌ Exception ${tableName}:`, error);
    setErrors(prev => ({ ...prev, [key]: error.message }));
    setData(prev => ({ ...prev, [key]: [] }));
  } finally {
    setLoading(prev => ({ ...prev, [key]: false }));
  }
};

const fetchAllData = async () => {
  console.log('📊 Starting data load');
  const totalStart = performance.now();

  setLoading(prev => ({ ...prev, critical: true, secondary: true }));

  try {
    // FASE 1: Carica dati CRITICI con timeout
    console.log('🔴 Loading critical data...');
    const criticalPromises = criticalTables.map(key => 
      Promise.race([
        fetchTable(key),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout ${key}`)), 10000)
        )
      ]).catch(err => {
        console.error(`Failed to load ${key}:`, err);
        setErrors(prev => ({ ...prev, [key]: err.message }));
      })
    );
    
    await Promise.allSettled(criticalPromises);
    setLoading(prev => ({ ...prev, critical: false }));
    console.log(`✅ Critical data loaded (${(performance.now() - totalStart).toFixed(0)}ms)`);

    // FASE 2: Carica dati SECONDARI (SUBITO, no setTimeout)
    console.log('🟡 Loading secondary data...');
    const secondaryPromises = secondaryTables.map(key => 
      Promise.race([
        fetchTable(key),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout ${key}`)), 10000)
        )
      ]).catch(err => {
        console.error(`Failed to load ${key}:`, err);
        setErrors(prev => ({ ...prev, [key]: err.message }));
      })
    );
    
    await Promise.allSettled(secondaryPromises);
    setLoading(prev => ({ ...prev, secondary: false }));
    console.log(`✅ All data loaded (${(performance.now() - totalStart).toFixed(0)}ms)`);
  } catch (error) {
    console.error('❌ Fatal error loading data:', error);
    setLoading(prev => ({ ...prev, critical: false, secondary: false }));
  }
};

  useEffect(() => {
    fetchAllData();
  }, []);

  // ⚡ CRUD OTTIMIZZATO: Non usa .select() se non necessario
  const addRecord = async (key, record) => {
    const tableName = tableMapping[key];
    const startTime = performance.now();
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`📝 Adding record to ${tableName}`);

    const result = await supabaseHelpers.create(tableName, record);
    const duration = performance.now() - startTime;
    
    performanceLog.logQuery(`${tableName} INSERT`, duration);
    console.log(`✅ Record added to ${tableName} (${duration.toFixed(0)}ms)`);

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
    const startTime = performance.now();
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`✏️ Updating record in ${tableName}:`, id);

    const result = await supabaseHelpers.update(tableName, id, updates);
    const duration = performance.now() - startTime;
    
    performanceLog.logQuery(`${tableName} UPDATE`, duration);
    console.log(`✅ Record updated in ${tableName} (${duration.toFixed(0)}ms)`);

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
    const startTime = performance.now();
    
    if (!tableName) {
      console.error(`❌ Table mapping not found for key: ${key}`);
      return { success: false, error: `Tabella non trovata per chiave: ${key}` };
    }

    console.log(`🗑️ Deleting record from ${tableName}:`, id);

    const result = await supabaseHelpers.delete(tableName, id);
    const duration = performance.now() - startTime;
    
    performanceLog.logQuery(`${tableName} DELETE`, duration);
    console.log(`✅ Record deleted from ${tableName} (${duration.toFixed(0)}ms)`);

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

  const getPresenzeByLavoratore = (lavoratoreId) => {
    return data.presenze.filter(p => p.lavoratore_id === lavoratoreId);
  };

  const getUnilavByLavoratore = (lavoratoreId) => {
    return data.unilav.filter(u => u.lavoratore_id === lavoratoreId);
  };

  const getCertificazioniByLavoratore = (lavoratoreId) => {
    return data.certificazioni.filter(c => c.lavoratore_id === lavoratoreId);
  };

  const getSalByCantiere = (cantiereId) => {
    return data.sal.filter(s => s.cantiere_id === cantiereId);
  };

  const getNotaPresenza = (lavoratoreId, anno, mese) => {
    return data.notePresenze.find(n => 
      n.lavoratore_id === lavoratoreId && 
      n.anno === anno && 
      n.mese === mese
    );
  };

  const getSetting = (chiave, defaultValue = null) => {
    const setting = data.settings.find(s => s.chiave === chiave);
    return setting ? setting.valore : defaultValue;
  };

  const setSetting = async (chiave, valore) => {
    const existing = data.settings.find(s => s.chiave === chiave);
    
    if (existing) {
      return await updateRecord('settings', existing.id, { valore: valore.toString() });
    } else {
      return await addRecord('settings', { chiave, valore: valore.toString() });
    }
  };

  // ⚡ Esponi performance log per debug
  const getPerformanceStats = () => {
    const queries = performanceLog.queries;
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length;
    const slowestQueries = performanceLog.getSlowestQueries();
    
    return {
      totalQueries: queries.length,
      averageDuration: avgDuration.toFixed(0),
      slowestQueries: slowestQueries.map(q => ({
        table: q.table,
        duration: `${q.duration.toFixed(0)}ms`
      }))
    };
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
    getNotaPresenza,
    
    // Settings helpers
    getSetting,
    setSetting,
    
    // ⚡ Performance debugging
    getPerformanceStats
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};