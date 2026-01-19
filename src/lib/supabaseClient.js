// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Sostituisci con le tue credenziali Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'marrel-gestionale/1.0'
    }
  }
});

// ⚡ HELPER: Pulisce oggetti da undefined, null, stringhe vuote (per CREATE)
const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Mantieni false, 0, array vuoti, ma rimuovi undefined, null, stringhe vuote
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// 🆕 HELPER: Per UPDATE - mantiene null per cancellare valori
const cleanObjectForUpdate = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Rimuovi solo undefined
    if (value !== undefined) {
      // Converti stringhe vuote in null
      acc[key] = value === '' ? null : value;
    }
    return acc;
  }, {});
};

// Helper per gestire errori
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  return {
    success: false,
    error: error.message || 'An error occurred'
  };
};

// ✅ FUNZIONE PER OTTENERE L'AZIENDA DELL'UTENTE LOGGATO
export const getUserCompany = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Utente non autenticato' };
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('azienda')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    
    if (!profile || !profile.azienda) {
      return { success: false, error: 'Profilo o azienda non trovati' };
    }
    
    return { success: true, azienda: profile.azienda };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper per operazioni CRUD comuni
export const supabaseHelpers = {
  // ✅ GET all records (FILTRA PER AZIENDA)
  async getAll(table) {
    console.log(`🔵 GET ALL ${table} START`);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('azienda', companyResult.azienda)
      .order('created_at', { ascending: false });
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ GET ALL ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ GET ALL ${table} SUCCESS (${duration.toFixed(0)}ms): ${data?.length || 0} records`);
    return { success: true, data };
  },

  // ✅ GET by ID (FILTRA PER AZIENDA)
  async getById(table, id) {
    console.log(`🔵 GET BY ID ${table} START:`, id);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('azienda', companyResult.azienda)
      .single();
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ GET BY ID ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ GET BY ID ${table} SUCCESS (${duration.toFixed(0)}ms)`);
    return { success: true, data };
  },

  // ✅ CREATE (AGGIUNGE AUTOMATICAMENTE AZIENDA + PULIZIA CAMPI)
  async create(table, record) {
    console.log(`🔵 CREATE ${table} START`);
    console.log(`📤 Original data:`, record);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    // ⚡ PULIZIA: Rimuovi campi undefined, null, stringhe vuote
    const cleanRecord = cleanObject(record);
    console.log(`📤 Clean data:`, cleanRecord);

    const { data, error } = await supabase
      .from(table)
      .insert([{
        ...cleanRecord,
        azienda: companyResult.azienda
      }])
      .select()
      .single();
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ CREATE ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ CREATE ${table} SUCCESS (${duration.toFixed(0)}ms)`);
    return { success: true, data };
  },

  // ✅ UPDATE (VERIFICA CHE APPARTENGA ALL'AZIENDA + PULIZIA CAMPI)
  async update(table, id, updates) {
    console.log(`🔵 UPDATE ${table} START:`, id);
    console.log(`📤 Original updates:`, updates);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    // ⚡ PULIZIA: Rimuovi campi undefined, null, stringhe vuote
    const cleanUpdates = cleanObjectForUpdate(updates);
    console.log(`📤 Clean updates:`, cleanUpdates);

    const { data, error } = await supabase
      .from(table)
      .update(cleanUpdates)
      .eq('id', id)
      .eq('azienda', companyResult.azienda)
      .select()
      .single();
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ UPDATE ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ UPDATE ${table} SUCCESS (${duration.toFixed(0)}ms)`);
    return { success: true, data };
  },

  // ✅ DELETE (VERIFICA CHE APPARTENGA ALL'AZIENDA)
  async delete(table, id) {
    console.log(`🔵 DELETE ${table} START:`, id);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('azienda', companyResult.azienda);
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ DELETE ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ DELETE ${table} SUCCESS (${duration.toFixed(0)}ms)`);
    return { success: true };
  },

  // ✅ GET with filter (FILTRA PER AZIENDA)
  async getFiltered(table, column, value) {
    console.log(`🔵 GET FILTERED ${table} START: ${column}=${value}`);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('azienda', companyResult.azienda)
      .eq(column, value);
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ GET FILTERED ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ GET FILTERED ${table} SUCCESS (${duration.toFixed(0)}ms): ${data?.length || 0} records`);
    return { success: true, data };
  },

  // ✅ GET with multiple filters (FILTRA PER AZIENDA)
  async getWithFilters(table, filters = {}) {
    console.log(`🔵 GET WITH FILTERS ${table} START:`, filters);
    const startTime = performance.now();
    
    const companyResult = await getUserCompany();
    if (!companyResult.success) {
      return companyResult;
    }

    let query = supabase
      .from(table)
      .select('*')
      .eq('azienda', companyResult.azienda);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query = query.eq(key, value);
      }
    });
    
    const { data, error } = await query;
    
    const duration = performance.now() - startTime;
    
    if (error) {
      console.error(`❌ GET WITH FILTERS ${table} ERROR (${duration.toFixed(0)}ms):`, error);
      return handleSupabaseError(error);
    }
    
    console.log(`✅ GET WITH FILTERS ${table} SUCCESS (${duration.toFixed(0)}ms): ${data?.length || 0} records`);
    return { success: true, data };
  }
};
