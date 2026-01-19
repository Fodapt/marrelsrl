// src/components/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'reset'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    cognome: '',
    azienda: '',
    ruolo: 'operativo'
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signIn(formData.email, formData.password);
        if (!result.success) {
          setError(result.error || 'Errore durante il login');
        }
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          setError('Le password non coincidono');
          setLoading(false);
          return;
        }
        
        if (!formData.azienda) {
          setError('Il nome azienda è obbligatorio');
          setLoading(false);
          return;
        }

        const result = await signUp(
          formData.email,
          formData.password,
          formData.azienda,
          formData.nome,
          formData.cognome,
          formData.ruolo
        );
        
        if (result.success) {
          setMessage('Registrazione completata! Puoi effettuare il login.');
          setMode('login');
          setFormData({ ...formData, password: '', confirmPassword: '' });
        } else {
          setError(result.error || 'Errore durante la registrazione');
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(formData.email);
        if (result.success) {
          setMessage('Email di reset inviata! Controlla la tua casella di posta.');
        } else {
          setError(result.error || 'Errore durante il reset password');
        }
      }
    } catch (err) {
      setError('Si è verificato un errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Gestionale MARREL
          </h1>
          <p className="text-gray-600">
            {mode === 'login' && 'Accedi al tuo account'}
            {mode === 'signup' && 'Crea un nuovo account'}
            {mode === 'reset' && 'Recupera password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Azienda *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.azienda}
                  onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cognome
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.ruolo}
                  onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                >
                  <option value="operativo">Operativo</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {mode !== 'reset' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conferma Password *
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Caricamento...' : (
              mode === 'login' ? 'Accedi' :
              mode === 'signup' ? 'Registrati' :
              'Invia email di reset'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'login' && (
  <>
    {/* Signup pubblico rimosso - solo super admin può creare aziende */}
              <button
                onClick={() => setMode('reset')}
                className="text-blue-600 hover:underline text-sm block w-full"
              >
                Password dimenticata?
              </button>
            </>
          )}
          
          {(mode === 'signup' || mode === 'reset') && (
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className="text-blue-600 hover:underline text-sm block w-full"
            >
              Torna al login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;