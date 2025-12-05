import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  useEffect(() => {
  console.log('🔍 ResetPassword: Checking session');
  
  let timeoutId;
  
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('📋 Session:', session?.user?.email || 'none');
    
    if (session?.user) {
      console.log('✅ Ready for password reset');
      setIsReady(true);
      setMessage('Inserisci la tua nuova password');
      return true;
    }
    return false;
  };

  // Controlla subito
  checkSession().then(ready => {
    if (!ready) {
      // Se non c'è sessione, riprova dopo 1 secondo
      timeoutId = setTimeout(async () => {
        const hasSession = await checkSession();
        if (!hasSession) {
          setError('Link non valido o scaduto. Richiedi un nuovo link.');
        }
      }, 1000);
    }
  });

  // Listener per eventi auth
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔔 Event:', event);
    
    if (event === 'PASSWORD_RECOVERY' || (session?.user && event === 'SIGNED_IN')) {
      console.log('✅ Recovery successful');
      setIsReady(true);
      setMessage('Inserisci la tua nuova password');
      setError('');
    }
  });

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    subscription.unsubscribe();
  };
}, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validazione password
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Attempting to update password...');
      
      const result = await updatePassword(password);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ Password updated successfully');
      setMessage('✅ Password aggiornata con successo! Reindirizzamento al login...');
      
      // Logout per forzare nuovo login con nuova password
      await supabase.auth.signOut();
      
      // Redirect al login dopo 2 secondi
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('❌ Exception:', error);
      setError('Errore: ' + (error.message || 'Impossibile aggiornare la password'));
    } finally {
      setLoading(false);
    }
  };

  if (!isReady && !error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Verifica del link in corso...</p>
          <p className="text-xs text-gray-400">
            Attendere mentre verifichiamo il link di recupero password.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            ← Torna al Login
          </button>
        </div>
      </div>
    );
  }

  if (error && !isReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link Non Valido</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Torna al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-sm text-gray-600">Gestionale MARREL S.r.l.</p>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuova Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Almeno 6 caratteri"
              required
              disabled={loading}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">La password deve contenere almeno 6 caratteri</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conferma Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ripeti la password"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '⏳ Aggiornamento...' : '✓ Aggiorna Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Torna al Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
