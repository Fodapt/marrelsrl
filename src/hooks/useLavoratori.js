// src/hooks/useLavoratori.js
import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabaseClient';

export const useLavoratori = () => {
  const [lavoratori, setLavoratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica tutti i lavoratori
  const fetchLavoratori = async () => {
    setLoading(true);
    setError(null);
    
    const result = await supabaseHelpers.getAll('lavoratori');
    
    if (result.success) {
      setLavoratori(result.data || []);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  // Carica lavoratori all'avvio
  useEffect(() => {
    fetchLavoratori();
  }, []);

  // Aggiungi lavoratore
  const addLavoratore = async (lavoratore) => {
    const result = await supabaseHelpers.create('lavoratori', {
      ...lavoratore,
      id: lavoratore.id || Date.now().toString()
    });
    
    if (result.success) {
      setLavoratori(prev => [result.data, ...prev]);
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Aggiorna lavoratore
  const updateLavoratore = async (id, updates) => {
    const result = await supabaseHelpers.update('lavoratori', id, updates);
    
    if (result.success) {
      setLavoratori(prev =>
        prev.map(l => l.id === id ? result.data : l)
      );
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Elimina lavoratore
  const deleteLavoratore = async (id) => {
    const result = await supabaseHelpers.delete('lavoratori', id);
    
    if (result.success) {
      setLavoratori(prev => prev.filter(l => l.id !== id));
      return { success: true };
    }
    
    return result;
  };

  // Ottieni lavoratore per ID
  const getLavoratoreById = (id) => {
    return lavoratori.find(l => l.id === id);
  };

  // Ottieni lavoratori attivi
  const getLavoratoriAttivi = () => {
    return lavoratori.filter(l => l.attivo !== false);
  };

  // Ottieni lavoratori per ruolo
  const getLavoratoriByRuolo = (ruolo) => {
    return lavoratori.filter(l => l.ruolo === ruolo);
  };

  return {
    lavoratori,
    loading,
    error,
    fetchLavoratori,
    addLavoratore,
    updateLavoratore,
    deleteLavoratore,
    getLavoratoreById,
    getLavoratoriAttivi,
    getLavoratoriByRuolo
  };
};
