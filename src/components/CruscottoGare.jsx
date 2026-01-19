// src/components/CruscottoGare.jsx
import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { exportDashboardGarePDF } from '../utils/exports/exportDashboardGarePDF';

function CruscottoGare() {
  const { 
    gare, 
    polizze, 
    categorieQualificate,
    clienti,
    loading 
  } = useData();

  const oggi = new Date();

  // ========================================
  // CALCOLO STATISTICHE PRINCIPALI
  // ========================================
  const statistiche = useMemo(() => {
    const totaleGare = gare.length;
    const interessato = gare.filter(g => g.stato === 'interessato').length;
    const inPreparazione = gare.filter(g => g.stato === 'in_preparazione').length;
    const presentate = gare.filter(g => g.stato === 'presentata' || g.stato === 'in_valutazione').length;
    const vinte = gare.filter(g => g.stato === 'vinta').length;
    const perse = gare.filter(g => g.stato === 'persa').length;
    const rinunciate = gare.filter(g => g.stato === 'rinunciata').length;
    
    const importoVinto = gare
      .filter(g => g.stato === 'vinta')
      .reduce((sum, g) => sum + parseFloat(g.importo_offerto || g.importo_appalto || 0), 0);
    
    const importoPotenziale = gare
      .filter(g => ['interessato', 'in_preparazione', 'presentata', 'in_valutazione'].includes(g.stato))
      .reduce((sum, g) => sum + parseFloat(g.importo_appalto || 0), 0);

    const totalePolizze = polizze.length;
    const polizzeProvvisorie = polizze.filter(p => p.tipo === 'provvisoria').length;
    const polizzeDefinitive = polizze.filter(p => p.tipo === 'definitiva').length;
    const polizzeCAR = polizze.filter(p => p.tipo === 'car').length;
    
    const categorieSOA = categorieQualificate.length;
    const categorieOG = categorieQualificate.filter(c => c.categoria.startsWith('OG')).length;
    const categorieOS = categorieQualificate.filter(c => c.categoria.startsWith('OS')).length;

    // Calcola tasso di successo
    const gareChiuse = vinte + perse;
    const tassoSuccesso = gareChiuse > 0 ? ((vinte / gareChiuse) * 100).toFixed(1) : 0;

    // Analisi ribassi
    const gareConRibasso = gare.filter(g => 
      g.ribasso_offerto && 
      ['presentata', 'in_valutazione', 'vinta'].includes(g.stato)
    );
    
    const ribassoMedio = gareConRibasso.length > 0
      ? (gareConRibasso.reduce((sum, g) => sum + parseFloat(g.ribasso_offerto || 0), 0) / gareConRibasso.length).toFixed(2)
      : 0;

    return {
      totaleGare,
      interessato,
      inPreparazione,
      presentate,
      vinte,
      perse,
      rinunciate,
      importoVinto,
      importoPotenziale,
      totalePolizze,
      polizzeProvvisorie,
      polizzeDefinitive,
      polizzeCAR,
      categorieSOA,
      categorieOG,
      categorieOS,
      tassoSuccesso,
      ribassoMedio
    };
  }, [gare, polizze, categorieQualificate]);

  // ========================================
  // SCADENZE IMMINENTI
  // ========================================
  const scadenzeGare = useMemo(() => {
    return gare
      .filter(g => {
        if (!['interessato', 'in_preparazione', 'presentata'].includes(g.stato)) return false;
        if (!g.scadenza_presentazione) return false;
        
        const scadenza = new Date(g.scadenza_presentazione);
        const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        return giorni >= 0 && giorni <= 30;
      })
      .sort((a, b) => new Date(a.scadenza_presentazione) - new Date(b.scadenza_presentazione))
      .slice(0, 5);
  }, [gare]);

  const polizzeInScadenza = useMemo(() => {
    return polizze
      .filter(p => {
        if (!p.data_scadenza) return false;
        const scadenza = new Date(p.data_scadenza);
        const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        return giorni >= 0 && giorni <= 30;
      })
      .sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza))
      .slice(0, 5);
  }, [polizze]);

  // ========================================
  // TOP CLIENTI
  // ========================================
  const topClienti = useMemo(() => {
    const perCliente = {};
    
    gare.forEach(g => {
      if (!g.cliente_id) return;
      const cliente = clienti.find(c => c.id === g.cliente_id);
      const nomeCliente = cliente ? cliente.ragione_sociale : 'Sconosciuto';
      
      if (!perCliente[nomeCliente]) {
        perCliente[nomeCliente] = {
          totale: 0,
          vinte: 0,
          importoVinto: 0
        };
      }
      
      perCliente[nomeCliente].totale++;
      if (g.stato === 'vinta') {
        perCliente[nomeCliente].vinte++;
        perCliente[nomeCliente].importoVinto += parseFloat(g.importo_offerto || g.importo_appalto || 0);
      }
    });

    return Object.entries(perCliente)
      .sort((a, b) => b[1].importoVinto - a[1].importoVinto)
      .slice(0, 5);
  }, [gare, clienti]);

  // ========================================
  // UTILITY
  // ========================================
  const formatCurrency = (value) => {
    if (!value) return '€ 0,00';
    return `€ ${parseFloat(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const calcolaGiorni = (dataScadenza) => {
    if (!dataScadenza) return null;
    const scadenza = new Date(dataScadenza);
    return Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
  };

  const maxGare = Math.max(
    statistiche.interessato,
    statistiche.inPreparazione,
    statistiche.presentate,
    statistiche.vinte,
    statistiche.perse
  );

  if (loading.critical) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento cruscotto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Cruscotto Ufficio Gare</h1>
            <p className="text-blue-100">Panoramica completa e indicatori di performance</p>
          </div>
          <button
            onClick={() => exportDashboardGarePDF(gare, polizze, categorieQualificate, clienti)}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
          >
            🖨️ Esporta PDF
          </button>
        </div>
      </div>

      {/* KPI Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Totale Gare */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Totale Gare</p>
              <p className="text-3xl font-bold text-blue-600">{statistiche.totaleGare}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        {/* Gare Vinte */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Gare Vinte</p>
              <p className="text-3xl font-bold text-green-600">{statistiche.vinte}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        {/* In Valutazione */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Valutazione</p>
              <p className="text-3xl font-bold text-yellow-600">{statistiche.presentate}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        {/* Tasso Successo */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tasso Successo</p>
              <p className="text-3xl font-bold text-purple-600">{statistiche.tassoSuccesso}%</p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>

        {/* Importo Vinto */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Importo Totale Vinto</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(statistiche.importoVinto)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        {/* Importo Potenziale */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Importo Potenziale in Corso</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(statistiche.importoPotenziale)}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Distribuzione Gare + Polizze */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuzione Gare per Stato */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Distribuzione Gare per Stato</h3>
          
          <div className="space-y-4">
            {/* Interessato */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">👀 Interessato</span>
                <span className="font-semibold">{statistiche.interessato}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-blue-400 h-full flex items-center justify-end pr-2 text-xs text-white font-semibold transition-all duration-500"
                  style={{ width: `${maxGare > 0 ? (statistiche.interessato / maxGare * 100) : 0}%` }}
                >
                  {statistiche.interessato > 0 && statistiche.interessato}
                </div>
              </div>
            </div>

            {/* In Preparazione */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">📝 In Preparazione</span>
                <span className="font-semibold">{statistiche.inPreparazione}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full flex items-center justify-end pr-2 text-xs text-white font-semibold transition-all duration-500"
                  style={{ width: `${maxGare > 0 ? (statistiche.inPreparazione / maxGare * 100) : 0}%` }}
                >
                  {statistiche.inPreparazione > 0 && statistiche.inPreparazione}
                </div>
              </div>
            </div>

            {/* Presentate */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">📤 Presentate / In Valutazione</span>
                <span className="font-semibold">{statistiche.presentate}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-yellow-500 h-full flex items-center justify-end pr-2 text-xs text-white font-semibold transition-all duration-500"
                  style={{ width: `${maxGare > 0 ? (statistiche.presentate / maxGare * 100) : 0}%` }}
                >
                  {statistiche.presentate > 0 && statistiche.presentate}
                </div>
              </div>
            </div>

            {/* Vinte */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">✅ Vinte</span>
                <span className="font-semibold">{statistiche.vinte}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-green-500 h-full flex items-center justify-end pr-2 text-xs text-white font-semibold transition-all duration-500"
                  style={{ width: `${maxGare > 0 ? (statistiche.vinte / maxGare * 100) : 0}%` }}
                >
                  {statistiche.vinte > 0 && statistiche.vinte}
                </div>
              </div>
            </div>

            {/* Perse */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">❌ Perse</span>
                <span className="font-semibold">{statistiche.perse}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-red-500 h-full flex items-center justify-end pr-2 text-xs text-white font-semibold transition-all duration-500"
                  style={{ width: `${maxGare > 0 ? (statistiche.perse / maxGare * 100) : 0}%` }}
                >
                  {statistiche.perse > 0 && statistiche.perse}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Riepilogo Polizze */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🛡️ Riepilogo Polizze Assicurative</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-blue-600">{statistiche.polizzeProvvisorie}</div>
              <div className="text-sm text-gray-600">Provvisorie</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-green-600">{statistiche.polizzeDefinitive}</div>
              <div className="text-sm text-gray-600">Definitive</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🏗️</div>
              <div className="text-2xl font-bold text-yellow-600">{statistiche.polizzeCAR}</div>
              <div className="text-sm text-gray-600">CAR</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-2xl font-bold text-purple-600">{statistiche.totalePolizze}</div>
              <div className="text-sm text-gray-600">Totali</div>
            </div>
          </div>

          {/* Qualifiche SOA */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">🎓 Qualifiche SOA Possedute</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{statistiche.categorieSOA}</div>
                <div className="text-xs text-gray-600">Totali</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-indigo-600">{statistiche.categorieOG}</div>
                <div className="text-xs text-gray-600">OG</div>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-cyan-600">{statistiche.categorieOS}</div>
                <div className="text-xs text-gray-600">OS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scadenze + Top Clienti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scadenze Gare Imminenti */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Scadenze Gare Imminenti (≤30gg)</h3>
          
          {scadenzeGare.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p>Nessuna scadenza imminente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scadenzeGare.map(gara => {
                const giorni = calcolaGiorni(gara.scadenza_presentazione);
                const isUrgent = giorni <= 7;
                
                return (
                  <div 
                    key={gara.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      isUrgent 
                        ? 'bg-red-50 border-red-500' 
                        : 'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{gara.codice_gara}</p>
                        <p className="text-xs text-gray-600 mt-1">{gara.titolo.substring(0, 60)}...</p>
                      </div>
                      <div className="text-right ml-3">
                        <div className={`font-bold text-sm ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}>
                          {isUrgent ? '🔥' : '⚠️'} {giorni}gg
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(gara.scadenza_presentazione)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Polizze in Scadenza */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🛡️ Polizze in Scadenza (≤30gg)</h3>
          
          {polizzeInScadenza.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p>Nessuna polizza in scadenza</p>
            </div>
          ) : (
            <div className="space-y-3">
              {polizzeInScadenza.map(polizza => {
                const giorni = calcolaGiorni(polizza.data_scadenza);
                const isUrgent = giorni <= 15;
                
                const tipiPolizza = {
                  'provvisoria': '🛡️ Provvisoria',
                  'definitiva': '✅ Definitiva',
                  'car': '🏗️ CAR'
                };
                
                return (
                  <div 
                    key={polizza.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      isUrgent 
                        ? 'bg-red-50 border-red-500' 
                        : 'bg-orange-50 border-orange-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          {tipiPolizza[polizza.tipo]} - N° {polizza.numero_polizza}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {polizza.compagnia} • {formatCurrency(polizza.importo_garantito)}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <div className={`font-bold text-sm ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                          {isUrgent ? '🔥' : '⚠️'} {giorni}gg
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(polizza.data_scadenza)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Clienti + Analisi Ribassi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clienti */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top 5 Clienti per Importo Vinto</h3>
          
          {topClienti.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nessuna gara vinta ancora</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topClienti.map(([cliente, dati], index) => (
                <div key={cliente} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-purple-600">#{index + 1}</div>
                    <div>
                      <p className="font-semibold text-gray-800">{cliente}</p>
                      <p className="text-xs text-gray-600">
                        {dati.totale} gare • {dati.vinte} vinte
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(dati.importoVinto)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analisi Ribassi */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📉 Ribasso Medio Offerto</h3>
          
          <div className="text-center py-8">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {statistiche.ribassoMedio}%
            </div>
            <p className="text-gray-600">Ribasso medio sulle gare presentate/vinte</p>
          </div>

          {/* Mini statistiche */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Gare Attive</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistiche.interessato + statistiche.inPreparazione}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Presentate</div>
              <div className="text-2xl font-bold text-yellow-600">
                {statistiche.presentate}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Rinunciate</div>
              <div className="text-2xl font-bold text-orange-600">
                {statistiche.rinunciate}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CruscottoGare;