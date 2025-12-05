import { useState, useRef, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';

function Navigation({ activeTab, setActiveTab, openDropdown, setOpenDropdown }) {
  const { profile } = useAuth();
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRefs = useRef({});

  // ✅ Filtra i subtab in base al ruolo
  const filterSubtabsByRole = (subtabs) => {
    if (!profile) return subtabs;
    
    // Se è admin, mostra tutto
    if (profile.ruolo === 'admin') return subtabs;
    
    // Altrimenti nascondi le sezioni riservate agli admin
    const restrictedIds = ['fatture-emesse', 'storico-paghe', 'contabilita'];
    return subtabs.filter(sub => !restrictedIds.includes(sub.id));
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", type: "single" },
    {
      id: "anagrafiche",
      label: "Anagrafiche",
      icon: "📁",
      type: "group",
      subtabs: [
        { id: "lavoratori", label: "Lavoratori", icon: "👷" },
        { id: "automezzi", label: "Automezzi", icon: "🚛" },
        { id: "subappaltatori", label: "Subappaltatori", icon: "🏢" },
        { id: "cantieri", label: "Cantieri", icon: "🏗️" },
        { id: "fornitori", label: "Fornitori", icon: "🏪" },
      ],
    },
    {
      id: "amministrazione",
      label: "Amministrazione",
      icon: "📊",
      type: "group",
      subtabs: filterSubtabsByRole([
        { id: "unilav", label: "Unilav", icon: "📄" },
        { id: "presenze", label: "Presenze", icon: "📅" },
        { id: "casse", label: "Cassa Edile", icon: "💶" },
        { id: "acconti", label: "Acconti", icon: "💵" },
        { id: "fatture-emesse", label: "Fatture Emesse", icon: "🧾" },  // ⚠️ SOLO ADMIN
        { id: "storico-paghe", label: "Storico Paghe", icon: "💼" },  // ⚠️ SOLO ADMIN
        { id: "dtt-formulari", label: "DTT/Formulari", icon: "📋" },
        { id: "situazione-fornitori", label: "Situazione Fornitori", icon: "📦" },
        { id: "rateizzi", label: "Rateizzi", icon: "💳" },
        { id: "sal", label: "SAL", icon: "💰" },
        { id: 'contabilita', label: 'Contabilità', icon: '🏦' }  // ⚠️ SOLO ADMIN
      ]),
    },
    { id: "corsi", label: "Corsi/Visite", icon: "🎓", type: "single" },
    { id: "certificazioni", label: "Certificazioni", icon: "📋", type: "single" },
    { id: "scadenzario", label: "Scadenzario", icon: "📅", type: "single" },
  ];

  // Calcola posizione assoluta del dropdown rispetto allo schermo
  useEffect(() => {
    if (openDropdown && buttonRefs.current[openDropdown]) {
      const rect = buttonRefs.current[openDropdown].getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
      });
    }
  }, [openDropdown]);

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              if (tab.type === "single") {
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setOpenDropdown(null);
                    }}
                    className={`px-4 py-3 border-b-2 whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600 font-medium"
                        : "border-transparent text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              } else {
                const isGroupActive = tab.subtabs.some(
                  (sub) => sub.id === activeTab
                );
                const isOpen = openDropdown === tab.id;

                return (
                  <div key={tab.id} className="relative flex-shrink-0">
                    <button
                      ref={(el) => (buttonRefs.current[tab.id] = el)}
                      onClick={() => setOpenDropdown(isOpen ? null : tab.id)}
                      className={`px-4 py-3 border-b-2 whitespace-nowrap flex items-center gap-1 transition-colors ${
                        isGroupActive
                          ? "border-blue-600 text-blue-600 font-medium"
                          : "border-transparent text-gray-600 hover:text-blue-600"
                      }`}
                    >
                      {tab.icon} {tab.label}
                      <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                    </button>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </nav>

      {/* Overlay per chiudere cliccando fuori */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Dropdown fluttuante con posizione assoluta */}
      {openDropdown && (
        <div
          className="bg-white shadow-xl border border-gray-200 rounded-b-lg overflow-hidden z-50"
          style={dropdownStyle}
        >
          {tabs
            .find((t) => t.id === openDropdown)
            ?.subtabs.map((subtab, index, array) => (
              <button
                key={subtab.id}
                onClick={() => {
                  setActiveTab(subtab.id);
                  setOpenDropdown(null);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 transition-colors ${
                  activeTab === subtab.id
                    ? "bg-blue-100 text-blue-600 font-medium"
                    : "text-gray-700"
                } ${index === array.length - 1 ? "rounded-b-lg" : ""}`}
              >
                <span className="text-lg">{subtab.icon}</span>
                <span>{subtab.label}</span>
              </button>
            ))}
        </div>
      )}
    </>
  );
}

export default Navigation;