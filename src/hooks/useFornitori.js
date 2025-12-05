// src/hooks/useFornitori.js
import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabaseClient';

export const useFornitori = () => {
  const [fornitori, setFornitori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica tutti i fornitori
  const fetchFornitori = async () => {
    setLoading(true);
    setError(null);
    
    const result = await supabaseHelpers.getAll('fornitori');
    
    if (result.success) {
      setFornitori(result.data || []);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchFornitori();
  }, []);

  // Aggiungi fornitore
  const addFornitore = async (fornitore) => {
    const result = await supabaseHelpers.create('fornitori', {
      ...fornitore,
      id: fornitore.id || Date.now().toString(),
      attivo: fornitore.attivo !== false
    });
    
    if (result.success) {
      setFornitori(prev => [result.data, ...prev]);
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Aggiorna fornitore
  const updateFornitore = async (id, updates) => {
    const result = await supabaseHelpers.update('fornitori', id, updates);
    
    if (result.success) {
      setFornitori(prev =>
        prev.map(f => f.id === id ? result.data : f)
      );
      return { success: true, data: result.data };
    }
    
    return result;
  };

  // Elimina fornitore
  const deleteFornitore = async (id) => {
    const result = await supabaseHelpers.delete('fornitori', id);
    
    if (result.success) {
      setFornitori(prev => prev.filter(f => f.id !== id));
      return { success: true };
    }
    
    return result;
  };

  // Ottieni fornitore per ID
  const getFornitoreById = (id) => {
    return fornitori.find(f => f.id === id);
  };

  // Ottieni fornitori attivi
  const getFornitoriAttivi = () => {
    return fornitori.filter(f => f.attivo !== false);
  };

  // Ottieni fornitori per categoria
  const getFornitoriByCategoria = (categoria) => {
    return fornitori.filter(f => f.categoria === categoria);
  };

  return {
    fornitori,
    loading,
    error,
    fetchFornitori,
    addFornitore,
    updateFornitore,
    deleteFornitore,
    getFornitoreById,
    getFornitoriAttivi,
    getFornitoriByCategoria
  };
};
