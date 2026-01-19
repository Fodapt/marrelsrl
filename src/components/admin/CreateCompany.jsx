import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateCompany() {
  const { profile, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    aziendaNome: '',
    adminEmail: '',
    adminPassword: '',
    adminNomeCompleto: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      alert('Non hai i permessi per accedere a questa pagina');
      window.location.hash = '#/dashboard';
      return;
    }
    setLoading(false);
    loadCompanies();
  }, [isSuperAdmin]);

  async function loadCompanies() {
    // Carica tutte le aziende (solo admin possono vederle)
    const { data } = await supabase
      .from('profiles')
      .select('azienda, email, ruolo, created_at')
      .in('ruolo', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    // Raggruppa per azienda
    const uniqueCompanies = {};
    data?.forEach(profile => {
      if (!uniqueCompanies[profile.azienda]) {
        uniqueCompanies[profile.azienda] = {
          azienda: profile.azienda,
          adminEmail: profile.email,
          createdAt: profile.created_at
        };
      }
    });

    setCompanies(Object.values(uniqueCompanies));
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, adminPassword: password });
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // Pulisci nome azienda
      const aziendaNomeClean = formData.aziendaNome.toLowerCase().replace(/\s+/g, '_');
      if (!/^[a-z0-9_]+$/.test(aziendaNomeClean)) {
        throw new Error('Nome azienda: solo lettere, numeri e underscore');
      }

      if (formData.adminPassword.length < 6) {
        throw new Error('Password deve essere almeno 6 caratteri');
      }

      // Verifica che l'azienda non esista già
      const { data: existing } = await supabase
        .from('profiles')
        .select('azienda')
        .eq('azienda', aziendaNomeClean)
        .maybeSingle();

      if (existing) {
        throw new Error('Nome azienda già in uso');
      }

      // Crea l'utente admin per la nuova azienda
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          data: {
            azienda: aziendaNomeClean,
            nome_completo: formData.adminNomeCompleto,
            nome: formData.adminNomeCompleto.split(' ')[0] || '',
            cognome: formData.adminNomeCompleto.split(' ').slice(1).join(' ') || '',
            ruolo: 'admin'  // Admin dell'azienda, NON super_admin
          }
        }
      });

      if (authError) throw authError;

      setSuccess(
        `✅ Azienda "${aziendaNomeClean}" creata con successo!\n\n` +
        `📧 Email inviata a: ${formData.adminEmail}\n` +
        `Il cliente deve confermare l'email prima di accedere.\n\n` +
        `Credenziali temporanee:\n` +
        `Email: ${formData.adminEmail}\n` +
        `Password: ${formData.adminPassword}\n\n` +
        `⚠️ Invita il cliente a cambiare la password al primo accesso.`
      );

      // Reset form
      setFormData({
        aziendaNome: '',
        adminEmail: '',
        adminPassword: '',
        adminNomeCompleto: ''
      });

      // Ricarica lista aziende
      await loadCompanies();

    } catch (err) {
      console.error('Errore creazione azienda:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="text-sm font-medium text-blue-900">
          🔒 Pannello Super Admin - {profile.email}
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Solo tu puoi creare nuove aziende clienti
        </p>
      </div>

      <h1 className="text-3xl font-bold mb-6">Crea Nuova Azienda Cliente</h1>

      <form onSubmit={handleCreateCompany} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nome Azienda *
          </label>
          <input
            type="text"
            placeholder="es: rossi_costruzioni"
            value={formData.aziendaNome}
            onChange={(e) => setFormData({...formData, aziendaNome: e.target.value})}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Solo lettere minuscole, numeri e underscore
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Nome Amministratore Cliente *
          </label>
          <input
            type="text"
            placeholder="Mario Rossi"
            value={formData.adminNomeCompleto}
            onChange={(e) => setFormData({...formData, adminNomeCompleto: e.target.value})}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Email Amministratore *
          </label>
          <input
            type="email"
            placeholder="admin@aziendacliente.com"
            value={formData.adminEmail}
            onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Password Temporanea *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Minimo 6 caratteri"
              value={formData.adminPassword}
              onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
              className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              🎲 Genera
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Il cliente dovrà cambiarla al primo accesso
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <pre className="text-sm text-green-800 whitespace-pre-wrap">{success}</pre>
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {creating ? '⏳ Creazione in corso...' : '✨ Crea Azienda Cliente'}
        </button>
      </form>

      {/* Lista aziende esistenti */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Aziende Clienti Esistenti</h2>
        
        {companies.length === 0 ? (
          <p className="text-gray-500">Nessuna azienda cliente ancora</p>
        ) : (
          <div className="space-y-3">
            {companies.map((company, idx) => (
              <div key={idx} className="p-3 border rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-lg">🏢 {company.azienda}</p>
                    <p className="text-sm text-gray-600">Admin: {company.adminEmail}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}