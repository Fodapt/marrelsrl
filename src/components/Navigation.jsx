import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function Navigation({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  const { profile } = useAuth();
  const [openGroups, setOpenGroups] = useState(["risorse-umane"]);

  // 🔐 Filtra i subtabs in base al ruolo
  const filterSubtabsByRole = (subtabs) => {
    if (!profile) return subtabs;
    if (profile.ruolo === "admin") return subtabs;

    const restrictedIds = ["fatture-emesse", "storico-paghe", "contabilita"];
    return subtabs.filter((sub) => !restrictedIds.includes(sub.id));
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", type: "single" },

    {
      id: "risorse-umane",
      label: "Risorse Umane",
      icon: "👷",
      type: "group",
      subtabs: filterSubtabsByRole([
        { id: "lavoratori", label: "Lavoratori", icon: "👤" },
        { id: "unilav", label: "Unilav", icon: "📄" },
        { id: "presenze", label: "Presenze Cantieri", icon: "📅" },
        { id: "corsi", label: "Corsi & Visite", icon: "🎓" },
        { id: "storico-paghe", label: "Storico Paghe", icon: "💼" },
        { id: "acconti", label: "Acconti TFR & Paghe", icon: "💵" },
      ]),
    },

    {
      id: "cantieri-commesse",
      label: "Cantieri & Commesse",
      icon: "🏗️",
      type: "group",
      subtabs: [
        { id: "cantieri", label: "Cantieri", icon: "🏗️" },
        { id: "sal", label: "SAL", icon: "💰" },
        { id: "subappaltatori", label: "Subappaltatori", icon: "🏢" },
      ],
    },

    {
      id: "fornitori-acquisti",
      label: "Fornitori & Acquisti",
      icon: "🏪",
      type: "group",
      subtabs: [
        { id: "fornitori", label: "Fornitori", icon: "🏪" },
        { id: "situazione-fornitori", label: "Ordini & Situazione", icon: "📦" },
        { id: "dtt-formulari", label: "DTT/Formulari", icon: "📋" },
      ],
    },

    {
      id: "clienti-fatturazione",
      label: "Clienti & Fatturazione",
      icon: "👔",
      type: "group",
      subtabs: filterSubtabsByRole([
        { id: "clienti", label: "Clienti", icon: "👔" },
        { id: "fatture-emesse", label: "Fatture Emesse", icon: "🧾" },
      ]),
    },

    {
      id: "contabilita-menu",
      label: "Contabilità",
      icon: "🏦",
      type: "group",
      subtabs: filterSubtabsByRole([
        { id: "contabilita", label: "Prima Nota", icon: "🏦" },
        { id: "casse", label: "Cassa Edile", icon: "💶" },
        { id: "rateizzi", label: "Rateizzi INPS", icon: "💳" },
      ]),
    },

    {
      id: "mezzi",
      label: "Mezzi",
      icon: "🚛",
      type: "group",
      subtabs: [{ id: "automezzi", label: "Automezzi", icon: "🚛" }],
    },

    { id: "certificazioni", label: "Certificazioni", icon: "📋", type: "single" },
    { id: "scadenzario", label: "Scadenzario", icon: "📅", type: "single" },
  ];

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-30 transition-transform duration-300 overflow-y-auto pt-16 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
      

        {/* Menu */}
        <nav className="p-2">
          {tabs.map((tab) =>
            tab.type === "single" ? (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-2xl">{tab.icon}</span>
                {tab.label}
              </button>
            ) : (
              <div key={tab.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(tab.id)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-lg transition ${
                    tab.subtabs.some((s) => s.id === activeTab)
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tab.icon}</span>
                    {tab.label}
                  </div>
                  <span
                    className={`text-xs transition-transform ${
                      openGroups.includes(tab.id) ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {openGroups.includes(tab.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {tab.subtabs.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleTabClick(sub.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                          activeTab === sub.id
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {sub.icon} {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-gray-500 text-center">
          v4.0 • {profile?.azienda}
        </div>
      </aside>
    </>
  );
}

export default Navigation;
