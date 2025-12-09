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
  const [authLoading, setAuthLoading] = useState(true);      // Auth loading
  const [profileLoading, setProfileLoading] = useState(true); // Profile loading

  useEffect(() => {
    console.log('🔵 AuthProvider: Starting initialization');
    let refreshInterval;

    const initializeAuth = async () => {
      try {
        const isFromRedirect = window.location.hash.includes('access_token') ||
                               window.location.hash.includes('reset-password');

        if (isFromRedirect) {
          console.log('⏳ Redirect detected, waiting for session...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('❌ Session error:', error);

        if (session?.user) {
          console.log('👤 User found');
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // ⚡ Auto-refresh token ogni 50 minuti
    refreshInterval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('❌ Failed to refresh session:', error);
          await signOut();
        } else if (session) {
          console.log('✅ Session refreshed');
          setUser(session.user);
        }
      }
    }, 50 * 60 * 1000);

    // Listener auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔔 Auth event:', event, 'Session:', session?.user?.email || 'none');
    
    if (event === 'PASSWORD_RECOVERY') {
      window.location.hash = '#/reset-password';
    }
  setUser(session?.user ?? null);

  if (session?.user) {
    if (event !== 'TOKEN_REFRESHED') {
      await fetchProfile(session.user.id, session.user.email);
    }
  } else {
    setProfile(null);
    setProfileLoading(false);
  }

      if (event === 'SIGNED_OUT') {
        clearInterval(refreshInterval);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchProfile = async (userId, userEmail = null) => {
  setProfileLoading(true);
  console.log('🔍 START fetchProfile for:', userId);
  
  try {
    // Timeout di 5 secondi
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    );

    const fetchPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('📊 Profile result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('➕ Creating profile...');
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

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        throw error;
      }
    } else {
      setProfile(data);
    }
  } catch (err) {
    console.error('❌ fetchProfile error:', err.message);
    setProfile(null);
  } finally {
    console.log('🏁 fetchProfile END');
    setProfileLoading(false);
  }
};
  // Login
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('❌ signIn error:', error);
      return { success: false, error: error.message };
    }
  };

  // Registrazione
  const signUp = async (email, password, azienda, nome, cognome, ruolo = 'operativo') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { azienda, nome, cognome, ruolo } }
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('❌ signUp error:', error);
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
      setProfileLoading(false);
      return { success: true };
    } catch (error) {
      console.error('❌ signOut error:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://fodapt.github.io/marrelsrl/`
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('❌ resetPassword error:', error);
      return { success: false, error: error.message };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('❌ updatePassword error:', error);
      return { success: false, error: error.message };
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return false;
      return true;
    } catch {
      return false;
    }
  };

  const hasAccess = (section) => {
    if (!profile) return false;
    if (profile.ruolo === 'admin') return true;

    const restrictedSections = ['storicoPaghe', 'fattureEmesse', 'contabilita'];
    if (restrictedSections.includes(section)) return false;

    return true;
  };

  console.log('🎯 Auth state - authLoading:', authLoading, 'profileLoading:', profileLoading, 'User:', user?.email, 'Profile:', profile?.ruolo);

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
    hasAccess,
    isAdmin: profile?.ruolo === 'admin',
    isManager: profile?.ruolo === 'manager',
    isOperativo: profile?.ruolo === 'operativo'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
