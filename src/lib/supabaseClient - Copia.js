// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Sostituisci con le tue credenziali Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper per gestire errori
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  return {
    success: false,
    error: error.message || 'An error occurred'
  };
};

// Helper per operazioni CRUD comuni
export const supabaseHelpers = {
  // GET all records
  async getAll(table) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  },

  // GET by ID
  async getById(table, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  },

  // CREATE
  async create(table, record) {
    const { data, error } = await supabase
      .from(table)
      .insert([record])
      .select()
      .single();
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  },

  // UPDATE
  async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  },

  // DELETE
  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) return handleSupabaseError(error);
    return { success: true };
  },

  // GET with filter
  async getFiltered(table, column, value) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, value);
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  },

  // GET with multiple filters
  async getWithFilters(table, filters = {}) {
    let query = supabase.from(table).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query = query.eq(key, value);
      }
    });
    
    const { data, error } = await query;
    
    if (error) return handleSupabaseError(error);
    return { success: true, data };
  }
};
