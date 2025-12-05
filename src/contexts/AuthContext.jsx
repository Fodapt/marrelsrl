// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔵 AuthProvider: Starting initialization');
    
    const initializeAuth = async () => {
      try {
        // IMPORTANTE: Aspetta un attimo se stiamo arrivando da un redirect
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isFromRedirect = window.location.hash.includes('access_token') || 
                               window.location.hash.includes('reset-password');
        
        if (isFromRedirect) {
          console.log('⏳ Redirect detected, waiting for session...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Controlla la sessione corrente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📋 Session:', session?.user?.email || 'none');
        
        if (error) {
          console.error('❌ Session error:', error);
        }

        if (session?.user) {
          console.log('👤 User found');
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('❌ Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // ⚡ AUTO-REFRESH TOKEN ogni 50 minuti per evitare scadenza sessione
    const refreshInterval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('🔄 Auto-refreshing session...');
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('❌ Failed to refresh session:', error);
          // Se il refresh fallisce, probabilmente la sessione è scaduta
          console.log('🔒 Session expired, logging out...');
          await signOut();
        } else if (session) {
          console.log('✅ Session refreshed successfully');
          setUser(session.user);
        }
      }
    }, 50 * 60 * 1000); // 50 minuti

    // Listener per cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event, 'Session:', session?.user?.email || 'none');
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ Password recovery detected!');
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed automatically');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        clearInterval(refreshInterval); // ⚡ Ferma il refresh quando logout
      }
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval); // ⚡ Cleanup
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📊 Profile data:', data);
      
      if (error) {
        console.error('❌ Profile error:', error);
        setLoading(false);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Exception fetching profile:', error);
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  };

  // Login
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error.message };
    }
  };

  // Registrazione
  const signUp = async (email, password, azienda, nome, cognome, ruolo = 'operativo') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            azienda,
            nome,
            cognome,
            ruolo
          }
        }
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  // Reset Password Request
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://192.168.1.5/#/reset-password'
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  };

  // Update Password (dopo il recovery)
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  };

  // ⚡ VERIFICA SE LA SESSIONE È ANCORA VALIDA
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('🔒 Session invalid or expired');
        return false;
      }
      
      console.log('✅ Session is valid');
      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  };

  // Controlla se l'utente ha accesso a una sezione
  const hasAccess = (section) => {
    if (!profile) return false;
    
    // Admin ha accesso a tutto
    if (profile.ruolo === 'admin') return true;
    
    // Manager e Operativo NON hanno accesso a:
    const restrictedSections = ['storicoPaghe', 'fattureEmesse', 'contabilita'];
    
    if (restrictedSections.includes(section)) {
      return false;
    }
    
    return true;
  };

  console.log('🎯 Current state - Loading:', loading, 'User:', user?.email || null, 'Profile:', profile?.ruolo || null);

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    checkSession, // ⚡ NUOVA FUNZIONE
    hasAccess,
    isAdmin: profile?.ruolo === 'admin',
    isManager: profile?.ruolo === 'manager',
    isOperativo: profile?.ruolo === 'operativo'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};