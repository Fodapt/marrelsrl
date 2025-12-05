import { useAuth } from '../contexts/AuthContext';

function Header({ esportaDati, importaDati }) {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await signOut();
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🏗️ Gestionale Marrel S.r.l.</h1>
            <p className="text-blue-100 text-sm">v. 3.8</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Info utente */}
            {profile && (
              <div className="text-right bg-blue-700 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">
                  {profile.nome} {profile.cognome}
                </p>
                <p className="text-xs text-blue-200">
                  {profile.azienda} • {
                    profile.ruolo === 'admin' ? '👨‍💼 Admin' : 
                    profile.ruolo === 'manager' ? '📋 Manager' : 
                    '👷 Operativo'
                  }
                </p>
              </div>
            )}
            
            {/* Pulsante logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <span>🚪</span>
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;