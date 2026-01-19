import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function GestioneUtenti() {
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    ruolo: 'operativo'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      alert('Non hai i permessi per accedere a questa pagina');
      window.location.hash = '#/dashboard';
      return;
    }
    loadUsers();
  }, [isAdmin, isSuperAdmin]);

async function loadUsers() {
  setLoading(true);
  try {
    // Usa RPC function invece di query diretta
    const { data, error } = await supabase.rpc('get_company_users');

    if (error) throw error;
    setUsers(data || []);
  } catch (err) {
    console.error('❌ Errore caricamento utenti:', err);
    setError('Errore nel caricamento degli utenti');
  } finally {
    setLoading(false);
  }
}

  async function handleCreateUser(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (formData.password.length < 6) {
        throw new Error('Password deve essere almeno 6 caratteri');
      }

      // Crea utente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            azienda: profile.azienda,
            nome: formData.nome,
            cognome: formData.cognome,
            ruolo: formData.ruolo
          }
        }
      });

      if (authError) throw authError;

      setSuccess(`✅ Utente ${formData.email} creato con successo!`);
      setFormData({
        email: '',
        password: '',
        nome: '',
        cognome: '',
        ruolo: 'operativo'
      });
      setShowModal(false);
      await loadUsers();

    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateRole(userId, newRole) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ruolo: newRole })
        .eq('id', userId)
        .eq('azienda', profile.azienda);

      if (error) throw error;

      setSuccess('✅ Ruolo aggiornato con successo');
      await loadUsers();
    } catch (err) {
      setError('Errore nell\'aggiornamento del ruolo');
    }
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  }

  const getRuoloBadge = (ruolo) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      operativo: 'bg-gray-100 text-gray-800'
    };
    return styles[ruolo] || styles.operativo;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👥 Gestione Utenti</h1>
            <p className="text-gray-600 mt-1">Azienda: {profile.azienda}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>➕</span> Nuovo Utente
          </button>
        </div>
      </div>

      {/* Messaggi */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Lista Utenti */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruolo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.nome} {user.cognome}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRuoloBadge(user.ruolo)}`}>
                    {user.ruolo}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.id !== profile.id && user.ruolo !== 'super_admin' && (
                    <select
                      value={user.ruolo}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="operativo">Operativo</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {user.id === profile.id && (
                    <span className="text-gray-400 text-xs">Tu</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nessun utente trovato
          </div>
        )}
      </div>

      {/* Modal Crea Utente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">➕ Nuovo Utente</h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cognome</label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ruolo *</label>
                <select
                  value={formData.ruolo}
                  onChange={(e) => setFormData({...formData, ruolo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="operativo">Operativo</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    🎲
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimo 6 caratteri</p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Crea Utente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}