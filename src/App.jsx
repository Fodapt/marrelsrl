import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Lavoratori from './components/Lavoratori';
import Unilav from './components/Unilav';
import CorsiVisite from './components/CorsiVisite';
import Automezzi from './components/Automezzi';
import Subappaltatori from './components/Subappaltatori';
import Cantieri from './components/Cantieri';
import Fornitori from './components/Fornitori';
import Clienti from './components/Clienti';
import SAL from './components/SAL';
import Certificazioni from './components/Certificazioni';
import CasseEdili from './components/CasseEdili';
import Scadenzario from './components/Scadenzario';
import Rateizzi from './components/Rateizzi';
import Acconti from './components/Acconti';
import PresenzeCantieri from './components/PresenzeCantieri';
import Contabilita from './components/Contabilita';
import FattureEmesse from './components/FattureEmesse';
import StoricoPaghe from './components/StoricoPaghe';
import DttFormulari from './components/DttFormulari';
import SituazioneFornitori from './components/SituazioneFornitori';
import EconomicoCantiere from './components/EconomicoCantiere';

// Componente principale con logica di autenticazione
function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [notePresenze, setNotePresenze] = useState([]);
  const [noteRateizzi, setNoteRateizzi] = useState([]);
  const [datiCasseLavoratori, setDatiCasseLavoratori] = useState({});
  const [datiCasseTotali, setDatiCasseTotali] = useState({});
  const [saldoIniziale, setSaldoIniziale] = useState(0);

  const commonProps = {
    datiCasseLavoratori, setDatiCasseLavoratori,
    datiCasseTotali, setDatiCasseTotali,
    notePresenze, setNotePresenze,
    noteRateizzi, setNoteRateizzi,
    saldoIniziale, setSaldoIniziale
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Route pubblica per reset password */}
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Route protette */}
      <Route path="/" element={
        !user || !profile ? <Login /> : <Navigate to="/dashboard" replace />
      } />
      
      <Route path="/dashboard" element={
        !user || !profile ? <Navigate to="/" replace /> : (
          <div className="min-h-screen bg-gray-50">
  <Header 
    sidebarOpen={sidebarOpen}
    setSidebarOpen={setSidebarOpen}
  />
  
  <Navigation 
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    sidebarOpen={sidebarOpen}
    setSidebarOpen={setSidebarOpen}
  />

  <main className="md:ml-64 px-4 py-6 pt-20 md:pt-6 pb-16">
              {activeTab === 'dashboard' && <Dashboard {...commonProps} />}
              {activeTab === 'lavoratori' && <Lavoratori {...commonProps} />}
              {activeTab === 'unilav' && <Unilav {...commonProps} />}
              {activeTab === 'corsi' && <CorsiVisite {...commonProps} />}
              {activeTab === 'automezzi' && <Automezzi {...commonProps} />}
              {activeTab === 'subappaltatori' && <Subappaltatori {...commonProps} />}
              {activeTab === 'cantieri' && <Cantieri {...commonProps} />}
              {activeTab === 'fornitori' && <Fornitori {...commonProps} />}
              {activeTab === 'clienti' && <Clienti {...commonProps} />}
              {activeTab === 'sal' && <SAL {...commonProps} />}
              {activeTab === 'certificazioni' && <Certificazioni {...commonProps} />}
              {activeTab === 'casse' && <CasseEdili {...commonProps} />}
              {activeTab === 'scadenzario' && <Scadenzario {...commonProps} />}
              {activeTab === 'rateizzi' && <Rateizzi {...commonProps} />}
              {activeTab === 'acconti' && <Acconti {...commonProps} />}
              {activeTab === 'fatture-emesse' && (profile.ruolo === 'admin' ? <FattureEmesse {...commonProps} /> : <AccessDenied />)}
              {activeTab === 'storico-paghe' && (profile.ruolo === 'admin' ? <StoricoPaghe {...commonProps} /> : <AccessDenied />)}
              {activeTab === 'contabilita' && (profile.ruolo === 'admin' ? <Contabilita {...commonProps} /> : <AccessDenied />)}
              {activeTab === 'dtt-formulari' && <DttFormulari {...commonProps} />}
              {activeTab === 'situazione-fornitori' && <SituazioneFornitori {...commonProps} />}
              {activeTab === 'presenze' && <PresenzeCantieri {...commonProps} />}
              {activeTab === 'economico-cantiere' && <EconomicoCantiere />}
            </main>

            <Footer />
          </div>
        )
      } />
    </Routes>
  );
}

function AccessDenied() {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Accesso Negato</h3>
      <p className="text-gray-600">Non hai i permessi per accedere a questa sezione.</p>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;