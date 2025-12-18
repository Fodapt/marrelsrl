import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';

function EconomicoCantiere() {
  const {
    cantieri = [],
    fattureEmesse = [],
    movimentiContabili = [],
    storicoPaghe = [],
    cassaEdileLavoratori = [],
    loading
  } = useData();

  const [cantiereSelezionato, setCantiereSelezionato] = useState('');

  // Calcolo economico cantiere
  const economico = useMemo(() => {
    if (!cantiereSelezionato) return null;

    // ========== RICAVI - Fatture Emesse ==========
    const fatture = fattureEmesse.filter(f => f.cantiere_id === cantiereSelezionato);
    
    const totaleRicavi = fatture.reduce((sum, f) => {
      const imponibile = parseFloat(f.imponibile || 0);
      const iva = parseFloat(f.percentuale_iva || 22);
      const totale = imponibile * (1 + iva / 100);
      return sum + totale;
    }, 0);

    const totaleIncassato = fatture.reduce((sum, f) => {
      const incassato = (f.acconti || []).reduce((s, a) => s + parseFloat(a.importo || 0), 0);
      return sum + incassato;
    }, 0);

    const daIncassare = totaleRicavi - totaleIncassato;

    // ========== COSTI - Fornitori (da Contabilità) ==========
    const costiFornitori = movimentiContabili
      .filter(m => m.cantiere_id === cantiereSelezionato && m.tipo === 'uscita')
      .reduce((sum, m) => {
        const importo = parseFloat(m.importo || 0);
        const commissione = parseFloat(m.commissione || 0);
        return sum + importo + commissione;
      }, 0);

    // ========== COSTI - Manodopera (da Storico Paghe per cantiere) ==========
    const pagheCantiere = storicoPaghe.filter(p => p.cantiere_id === cantiereSelezionato);
    const costiManodopera = pagheCantiere.reduce((sum, p) => sum + parseFloat(p.importo || 0), 0);

    // ========== COSTI - Cassa Edile ==========
    const costiCassa = cassaEdileLavoratori
      .filter(c => c.cantiere_id === cantiereSelezionato)
      .reduce((sum, c) => {
        return sum + 
          parseFloat(c.accant || 0) + 
          parseFloat(c.contr || 0) + 
          parseFloat(c.previdenz || 0) + 
          parseFloat(c.fondo_sai || 0) + 
          parseFloat(c.fondo_oc || 0) + 
          parseFloat(c.acc_mal || 0) + 
          parseFloat(c.ape || 0);
      }, 0);

    // ========== TOTALI ==========
    const totaleCosti = costiFornitori + costiManodopera + costiCassa;
    const margine = totaleRicavi - totaleCosti;
    const marginePerc = totaleRicavi > 0 ? (margine / totaleRicavi) * 100 : 0;

    // Conta lavoratori unici
    const lavoratoriUnici = new Set(pagheCantiere.map(p => p.lavoratore_id)).size;

    return {
      totaleRicavi,
      totaleIncassato,
      daIncassare,
      costiFornitori,
      costiManodopera,
      costiCassa,
      totaleCosti,
      margine,
      marginePerc,
      numeroFatture: fatture.length,
      numeroLavoratori: lavoratoriUnici,
      numeroPaghe: pagheCantiere.length
    };
  }, [cantiereSelezionato, fattureEmesse, movimentiContabili, storicoPaghe, cassaEdileLavoratori]);

  if (loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">📊 Economico Cantiere</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Seleziona Cantiere</label>
          <select
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={cantiereSelezionato}
            onChange={(e) => setCantiereSelezionato(e.target.value)}
          >
            <option value="">-- Seleziona un cantiere --</option>
            {cantieri.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {economico && (
          <>
            {/* RICAVI */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">💰</span> RICAVI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-green-700 mb-1">Fatturato Totale</div>
                  <div className="text-3xl font-bold text-green-900">
                    € {economico.totaleRicavi.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-600 mt-1">{economico.numeroFatture} fatture</div>
                </div>
                <div>
                  <div className="text-sm text-green-700 mb-1">Incassato</div>
                  <div className="text-3xl font-bold text-green-900">
                    € {economico.totaleIncassato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-orange-700 mb-1">Da Incassare</div>
                  <div className="text-3xl font-bold text-orange-900">
                    € {economico.daIncassare.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* COSTI */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">💸</span> COSTI
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded">
                  <div>
                    <span className="text-red-700 font-medium">Fornitori</span>
                    <span className="text-xs text-gray-500 ml-2">(da Contabilità)</span>
                  </div>
                  <span className="text-xl font-bold text-red-900">
                    € {economico.costiFornitori.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded">
                  <div>
                    <span className="text-red-700 font-medium">Manodopera</span>
                    <span className="text-xs text-gray-500 ml-2">({economico.numeroLavoratori} lavoratori, {economico.numeroPaghe} paghe)</span>
                  </div>
                  <span className="text-xl font-bold text-red-900">
                    € {economico.costiManodopera.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded">
                  <span className="text-red-700 font-medium">Cassa Edile</span>
                  <span className="text-xl font-bold text-red-900">
                    € {economico.costiCassa.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t-2 border-red-300 pt-3 flex justify-between items-center">
                  <span className="text-red-800 font-semibold text-lg">TOTALE COSTI</span>
                  <span className="text-2xl font-bold text-red-900">
                    € {economico.totaleCosti.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* MARGINE */}
            <div className={`border-2 rounded-lg p-6 ${
              economico.margine >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-300'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                economico.margine >= 0 ? 'text-blue-800' : 'text-red-800'
              }`}>
                <span className="text-2xl">📈</span> MARGINE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-700 mb-1">Margine €</div>
                  <div className={`text-5xl font-bold ${
                    economico.margine >= 0 ? 'text-blue-900' : 'text-red-900'
                  }`}>
                    € {economico.margine.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-700 mb-1">Margine %</div>
                  <div className={`text-5xl font-bold ${
                    economico.margine >= 0 ? 'text-blue-900' : 'text-red-900'
                  }`}>
                    {economico.marginePerc.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!economico && cantiereSelezionato && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-lg">Nessun dato disponibile per questo cantiere</p>
            <p className="text-sm mt-2">Assicurati di aver inserito fatture, movimenti contabili e paghe</p>
          </div>
        )}

        {!cantiereSelezionato && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-lg">Seleziona un cantiere per visualizzare l'analisi economica</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EconomicoCantiere;