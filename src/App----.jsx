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


// App principale con Provider e HashRouter
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // ✅ AGGIUNGI
  const [openDropdown, setOpenDropdown] = useState(null);  // ✅ AGGIUNGI

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header onMenuClick={() => {/* Non serve più */}} />
        
        {/* ✅ Navigation orizzontale SOPRA il main */}
        <Navigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />
        
        {/* ✅ Main senza flex-1 e senza div flex wrapper */}
        <main className="max-w-7xl mx-auto px-4 py-6 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lavoratori" element={<Lavoratori />} />
            <Route path="/unilav" element={<Unilav />} />
            <Route path="/corsi-visite" element={<CorsiVisite />} />
            <Route path="/automezzi" element={<Automezzi />} />
            <Route path="/subappaltatori" element={<Subappaltatori />} />
            <Route path="/cantieri" element={<Cantieri />} />
            <Route path="/fornitori" element={<Fornitori />} />
            <Route path="/sal" element={<SAL />} />
            <Route path="/certificazioni" element={<Certificazioni />} />
            <Route path="/casse-edili" element={<CasseEdili />} />
            <Route path="/scadenzario" element={<Scadenzario />} />
            <Route path="/rateizzi" element={<Rateizzi />} />
            <Route path="/acconti" element={<Acconti />} />
            <Route path="/presenze-cantieri" element={<PresenzeCantieri />} />
            <Route path="/contabilita" element={<Contabilita />} />
            <Route path="/fatture-emesse" element={<FattureEmesse />} />
            <Route path="/storico-paghe" element={<StoricoPaghe />} />
            <Route path="/dtt-formulari" element={<DttFormulari />} />
            <Route path="/situazione-fornitori" element={<SituazioneFornitori />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </DataProvider>
  );
}

export default App;