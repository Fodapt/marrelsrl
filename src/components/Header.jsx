import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';

function Header({ sidebarOpen, setSidebarOpen }) {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await signOut();
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md sticky top-0 z-50">
  <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left: Hamburger + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div>
              <h1 className="font-bold" style={{ fontSize: '24px' }}>{APP_CONFIG.appFullName}</h1>
            </div>
          </div>
          
          {/* Right: User Info + Logout */}
          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden sm:block text-right bg-blue-700 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">
                  {profile.nome} {profile.cognome}
                </p>
                <p className="text-xs text-blue-200">
  {profile.ruolo === 'super_admin' ? '👑 Super Admin' : 
   profile.ruolo === 'admin' ? '💼 Admin' : 
   profile.ruolo === 'manager' ? '📊 Manager' : 
   '📋 Amministrativo'}
                </p>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <span>🚪</span>
              <span className="hidden sm:inline font-medium">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;