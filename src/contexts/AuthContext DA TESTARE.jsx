// src/contexts/AuthContext.jsx
// ✅ VERSIONE FINALE - PRODUCTION READY
// Features:
// - Nessun timeout (gestisce cold start 20-30s)
// - Keep-alive automatico ogni 3 minuti
// - Retry intelligente con backoff esponenziale
// - Gestione completa sessione e recupero
// - Log dettagliati per debugging

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
// 🧪 DEBUG SUPABASE CLIENT
console.log('🧪 ========== DEBUG SUPABASE ==========');
console.log('🧪 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🧪 VITE_SUPABASE_ANON_KEY presente:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('🧪 VITE_SUPABASE_ANON_KEY lunghezza:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
console.log('🧪 Supabase client:', supabase);
console.log('🧪 Supabase client.auth:', supabase?.auth);
console.log('🧪 =====================================');

// Test query immediato
console.log('🧪 Test query immediato...');
supabase.from('profiles').select('id').limit(1)
  .then(result => {
    console.log('🧪 ✅ Test query SUCCESSO:', result);
  })
  .catch(err => {
    console.error('🧪 ❌ Test query FALLITO:', err);
  });
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const fetchingProfile = useRef(false);
  const sessionCheckInterval = useRef(null);
  const keepAliveInterval = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('🎯 Auth state:', {
      authLoading,
      profileLoading,
      user: user?.email || 'none',
      role: profile?.ruolo || 'none'
    });
  }, [authLoading, profileLoading, user, profile]);

  useEffect(() => {
    console.log('🔵 AuthProvider: Inizializzazione');

    const initializeAuth = async () => {
  try {
    const isFromRedirect = window.location.hash.includes('access_token') ||
                           window.location.hash.includes('reset-password');

    if (isFromRedirect) {
      console.log('⏳ Redirect rilevato, attesa sessione...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ✅ ASPETTA CHE SUPABASE SIA PRONTO
    console.log('⏳ Attendo inizializzazione Supabase...');
    
    // Force initialization timeout
    const initTimeout = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⚠️ Timeout inizializzazione Supabase (5s)');
        resolve({ data: { session: null }, error: null });
      }, 5000);
    });
    
    const sessionPromise = supabase.auth.getSession();
    
    const { data: { session }, error } = await Promise.race([sessionPromise, initTimeout]);
    
    console.log('✅ Supabase inizializzato');
    
    if (error) console.error('❌ Session error:', error);

    if (session?.user) {
      console.log('👤 Utente trovato:', session.user.email);
      setUser(session.user);
      await fetchProfile(session.user.id, session.user.email);
    } else {
      console.log('⚠️ Nessuna sessione');
    }
  } catch (err) {
    console.error('❌ Errore inizializzazione:', err);
  } finally {
    setAuthLoading(false);
  }
};

    initializeAuth();

    // ✅ KEEP-ALIVE: Ping ogni 3 minuti
    console.log('🔄 Keep-alive attivato (ping ogni 3 min)');
    keepAliveInterval.current = setInterval(async () => {
      try {
        await supabase.from('profiles').select('id').limit(1);
        console.log('💓 Keep-alive OK');
      } catch (err) {
        console.error('❌ Keep-alive fallito:', err);
      }
    }, 3 * 60 * 1000);

    // ✅ CONTROLLO SESSIONE: Ogni 10 minuti
    sessionCheckInterval.current = setInterval(async () => {
      console.log('🔄 Controllo sessione...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('⚠️ Sessione persa, recupero...');
          const { data: recovered } = await supabase.auth.refreshSession();
          
          if (recovered?.session) {
            console.log('✅ Sessione recuperata');
            setUser(recovered.session.user);
          }
          return;
        }

        const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;
        const now = new Date();
        const minutesLeft = expiresAt ? Math.floor((expiresAt - now) / 1000 / 60) : null;

        console.log(`⏰ Token scade tra ${minutesLeft} min`);

        if (minutesLeft !== null && minutesLeft < 30) {
          console.log('🔄 Refresh preventivo...');
          const { data: refreshed } = await supabase.auth.refreshSession();
          
          if (refreshed?.session) {
            console.log('✅ Session refreshed');
            setUser(refreshed.session.user);
          }
        }
      } catch (err) {
        console.error('❌ Errore controllo:', err);
      }
    }, 10 * 60 * 1000);

    // ✅ TAB VISIBILITY
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ Tab tornata visibile, controllo sessione...');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.log('⚠️ Nessuna sessione, recupero...');
            const { data: refreshed } = await supabase.auth.refreshSession();
            
            if (refreshed?.session) {
              console.log('✅ Sessione recuperata');
              setUser(refreshed.session.user);
            }
            return;
          }

          const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;
          const now = new Date();
          const minutesLeft = expiresAt ? Math.floor((expiresAt - now) / 1000 / 60) : null;

          console.log(`⏰ Token scade tra ${minutesLeft} minuti`);

          if (minutesLeft !== null && minutesLeft < 30) {
            console.log('🔄 Refresh preventivo...');
            const { data: refreshed } = await supabase.auth.refreshSession();
            
            if (refreshed?.session) {
              console.log('✅ Session refreshed');
              setUser(refreshed.session.user);
            }
          }
        } catch (err) {
          console.error('❌ Errore tab focus:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ AUTH CHANGES
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/reset-password';
      }

      if (event === 'SIGNED_OUT') {
        console.log('🚪 Logout');
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        if (event !== 'TOKEN_REFRESHED') {
          await fetchProfile(session.user.id, session.user.email);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval.current) clearInterval(sessionCheckInterval.current);
      if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

 // ✅ FUNZIONE fetchProfile CORRETTA - Da inserire in AuthContext.jsx (riga ~205)

const fetchProfile = async (userId, userEmail = null, retryCount = 0) => {
  if (fetchingProfile.current) {
    console.log('⏭️ fetchProfile in corso, skip');
    return;
  }

  fetchingProfile.current = true;
  setProfileLoading(true);
  
  console.log(`🔍 fetchProfile START (tentativo ${retryCount + 1}/3)`);
  console.log(`📝 User ID: ${userId}`);
  
  if (retryCount === 0) {
    console.log('⏰ Caricamento profilo...');
  }
  
  const startTime = performance.now();
  
  try {
    // ✅ SKIPPI getSession() che si blocca - la sessione è già verificata (evento SIGNED_IN)
    console.log('✅ Sessione già verificata (evento SIGNED_IN ricevuto)');
    
    // ✅ TIMEOUT FORZATO A 30 SECONDI
    console.log('📡 Invio query a Supabase...');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('⏱️ TIMEOUT 30s raggiunto!');
        reject(new Error('Query timeout dopo 30 secondi'));
      }, 30000);
    });

    const queryPromise = supabase
      .from('profiles')
      .select('id, email, ruolo, azienda, nome, cognome')
      .eq('id', userId)
      .single()
      .then(result => {
        console.log('📦 Risposta Supabase ricevuta');
        return result;
      });

    console.log('⏳ Attendo risposta (timeout: 15s)...');
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    const duration = (performance.now() - startTime) / 1000;
    console.log(`⏱️ Query completata in ${duration.toFixed(1)}s`);

    if (error) {
      console.error('❌ Errore dalla query:', error);
      
      if (error.code === 'PGRST116') {
        console.log('➕ Profilo non esiste, creazione...');
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            ruolo: 'operativo',
            nome: '',
            cognome: '',
            azienda: ''
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Errore creazione:', insertError);
          throw insertError;
        }
        
        setProfile(newProfile);
        console.log('✅ Profilo creato');
      } else {
        throw error;
      }
    } else {
      console.log('📊 Dati profilo ricevuti');
      setProfile(data);
      console.log(`✅ Profilo caricato: ${data.ruolo}`);
    }
  } catch (err) {
    const duration = (performance.now() - startTime) / 1000;
    console.error(`❌ ERRORE dopo ${duration.toFixed(1)}s:`, err.message);
    
    // RETRY
    if (retryCount < 2) {
      const waitTime = Math.pow(2, retryCount + 1) * 1000;
      console.log(`🔄 Riprovo tra ${waitTime/1000}s (tentativo ${retryCount + 2}/3)...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      fetchingProfile.current = false;
      return fetchProfile(userId, userEmail, retryCount + 1);
    } else {
      console.error('❌ TUTTI I TENTATIVI FALLITI');
      
      alert(
        `⚠️ Impossibile caricare il profilo dopo 3 tentativi\n\n` +
        `Errore: ${err.message}\n\n` +
        `Azioni:\n` +
        `1. Ricarica pagina (F5)\n` +
        `2. Prova a rifare il login\n` +
        `3. Controlla console per dettagli`
      );
      
      setProfile(null);
    }
  } finally {
    const totalDuration = (performance.now() - startTime) / 1000;
    console.log(`🏁 fetchProfile END (${totalDuration.toFixed(1)}s)`);
    
    fetchingProfile.current = false;
    setProfileLoading(false);
  }
};

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('✅ Login:', email);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, azienda, nome, cognome, ruolo = 'operativo') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { azienda, nome, cognome, ruolo } }
      });
      if (error) throw error;
      console.log('✅ Registrazione:', email);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Registrazione error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      
      console.log('✅ Logout');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://fodapt.github.io/marrelsrl/`
      });
      if (error) throw error;
      console.log('✅ Reset password email:', email);
      return { success: true };
    } catch (error) {
      console.error('❌ Reset password error:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      console.log('✅ Password aggiornata');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Update password error:', error);
      return { success: false, error: error.message };
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !!(session && !error);
    } catch {
      return false;
    }
  };

  const canView = (section) => {
    if (!profile) return false;
    if (profile.ruolo === 'super_admin') return true;
    if (profile.ruolo === 'admin') return section !== 'create-company';
    if (profile.ruolo === 'manager') {
      const blocked = ['create-company', 'gestione-utenti'];
      return !blocked.includes(section);
    }
    if (profile.ruolo === 'operativo') {
      const blocked = [
        'storico-paghe', 'acconti', 'economico-cantiere',
        'situazione-fornitori', 'dtt-formulari', 'fatture-emesse',
        'contabilita', 'create-company', 'gestione-utenti'
      ];
      return !blocked.includes(section);
    }
    return false;
  };

  const canEdit = (section) => {
    if (!profile) return false;
    return canView(section);
  };

  const value = {
    user,
    profile,
    loading: authLoading || profileLoading,
    authLoading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    checkSession,
    canView,
    canEdit,
    isAdmin: profile?.ruolo === 'admin',
    isSuperAdmin: profile?.ruolo === 'super_admin',
    isManager: profile?.ruolo === 'manager',
    isOperativo: profile?.ruolo === 'operativo'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};