// src/hooks/useCantieri.js
import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabaseClient';

export const useCantieri = () => {
  const [cantieri, setCantieri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica tutti i cantieri
  const fetchCantieri = async () => {
    setLoading(true);
    setError(null);
    
    const result = await supabaseHelpers.getAll('cantieri');
    
    if (result.success) {
      setCantieri(result.data || []);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCantieri();
  }, []);

  // Aggiungi cantiere
  const addCantiere = async (cantiere) => {
    const result = await supabaseHelpers.create('cantieri', {
      ...cantiere,
      id: cantiere.id || Date.now().toString(),
      attivo: cantiere.attivo !== false
    });
    
    if (result.success) {
      setCantieri(prev => [result.data, ...prev]);
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Aggiorna cantiere
  const updateCantiere = async (id, updates) => {
    const result = await supabaseHelpers.update('cantieri', id, updates);
    
    if (result.success) {
      setCantieri(prev =>
        prev.map(c => c.id === id ? result.data : c)
      );
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Elimina cantiere
  const deleteCantiere = async (id) => {
    const result = await supabaseHelpers.delete('cantieri', id);
    
    if (result.success) {
      setCantieri(prev => prev.filter(c => c.id !== id));
      return { success: true };
    }
    
    return result;
  };

  // Ottieni cantiere per ID
  const getCantiereById = (id) => {
    return cantieri.find(c => c.id === id);
  };

  // Ottieni cantieri attivi
  const getCantieriAttivi = () => {
    return cantieri.filter(c => c.attivo !== false && c.stato !== 'completato' && c.stato !== 'annullato');
  };

  // Ottieni cantieri per stato
  const getCantieriByStato = (stato) => {
    return cantieri.filter(c => c.stato === stato);
  };

  return {
    cantieri,
    loading,
    error,
    fetchCantieri,
    addCantiere,
    updateCantiere,
    deleteCantiere,
    getCantiereById,
    getCantieriAttivi,
    getCantieriByStato
  };
};
