import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';

function EconomicoCantiere() {
  const {
    cantieri = [],
    fattureEmesse = [],
    movimentiContabili = [],
    storicoPaghe = [],
    presenze = [],
    cassaEdileLavoratori = [],
    loading
  } = useData();

  const [cantiereSelezionato, setCantiereSelezionato] = useState('');

  // Calcolo economico cantiere
  const economico = useMemo(() => {
    if (!cantiereSelezionato) return null;

    // RICAVI - Fatture Emesse
    const fatture = fattureEmesse.filter(f => f.cantiere_id === cantiereSelezionato);
    const totaleRicavi = fatture.reduce((sum, f) => {
      const totale = parseFloat(f.imponibile || 0) * (1 + parseFloat(f.percentuale_iva || 22) / 100);
      return sum + totale;
    }, 0);

    const totaleIncassato = fatture.reduce((sum, f) => {
      const incassato = (f.acconti || []).reduce((s, a) => s + parseFloat(a.importo || 0), 0);
      return sum + incassato;
    }, 0);

    const daIncassare = totaleRicavi - totaleIncassato;

    // COSTI - Fornitori (da Contabilità)
    const costiFornitori = movimentiContabili
      .filter(m => m.cantiere_id === cantiereSelezionato && m.tipo === 'uscita')
      .reduce((sum, m) => sum + parseFloat(m.importo || 0) + parseFloat(m.commissione || 0), 0);

    // COSTI - Manodopera (calcolo proporzionale da presenze)
    const presenzeCantiereMap = {};
    presenze.forEach(p => {
      if (p.cantiere_id === cantiereSelezionato && p.tipo === 'lavoro') {
        const lavoratoreId = p.lavoratore_id;
        const ore = parseFloat(p.ore || 0);
        presenzeCantiereMap[lavoratoreId] = (presenzeCantiereMap[lavoratoreId] || 0) + ore;
      }
    });

    let costiManodopera = 0;
    Object.entries(presenzeCantiereMap).forEach(([lavoratoreId, oreCantiere]) => {
      // Trova tutte le paghe del lavoratore
      const paghe = storicoPaghe.filter(p => p.lavoratore_id === lavoratoreId);
      
      paghe.forEach(paga => {
        // Calcola ore totali del lavoratore nel mese della paga
        const mese = paga.mese;
        const anno = paga.anno;
        const oreMese = presenze
          .filter(p => {
            const data = new Date(p.data);
            return p.lavoratore_id === lavoratoreId && 
                   data.getMonth() + 1 === mese && 
                   data.getFullYear() === anno &&
                   p.tipo === 'lavoro';
          })
          .reduce((sum, p) => sum + parseFloat(p.ore || 0), 0);

        if (oreMese > 0) {
          const costoOrario = parseFloat(paga.importo || 0) / oreMese;
          costiManodopera += costoOrario * oreCantiere;
        }
      });
    });

    // COSTI - Cassa Edile
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

    const totaleCosti = costiFornitori + costiManodopera + costiCassa;
    const margine = totaleRicavi - totaleCosti;
    const marginePerc = totaleRicavi > 0 ? (margine / totaleRicavi) * 100 : 0;

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
      numeroFatture: fatture.length
    };
  }, [cantiereSelezionato, fattureEmesse, movimentiContabili, storicoPaghe, presenze, cassaEdileLavoratori]);

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
            className="w-full px-4 py-2 border rounded-lg"
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-green-800 mb-4">💰 RICAVI</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-green-700">Fatturato Totale</div>
                  <div className="text-2xl font-bold text-green-900">€ {economico.totaleRicavi.toFixed(2)}</div>
                  <div className="text-xs text-green-600">{economico.numeroFatture} fatture</div>
                </div>
                <div>
                  <div className="text-sm text-green-700">Incassato</div>
                  <div className="text-2xl font-bold text-green-900">€ {economico.totaleIncassato.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-orange-700">Da Incassare</div>
                  <div className="text-2xl font-bold text-orange-900">€ {economico.daIncassare.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* COSTI */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-red-800 mb-4">💸 COSTI</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-red-700">Fornitori (da Contabilità)</span>
                  <span className="text-xl font-bold text-red-900">€ {economico.costiFornitori.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-700">Manodopera (da Storico Paghe)</span>
                  <span className="text-xl font-bold text-red-900">€ {economico.costiManodopera.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-700">Cassa Edile</span>
                  <span className="text-xl font-bold text-red-900">€ {economico.costiCassa.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-red-300 pt-3 flex justify-between items-center">
                  <span className="text-red-800 font-semibold">TOTALE COSTI</span>
                  <span className="text-2xl font-bold text-red-900">€ {economico.totaleCosti.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* MARGINE */}
            <div className={`border-2 rounded-lg p-6 ${
              economico.margine >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-300'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                economico.margine >= 0 ? 'text-blue-800' : 'text-red-800'
              }`}>
                📈 MARGINE
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-700">Margine €</div>
                  <div className={`text-4xl font-bold ${
                    economico.margine >= 0 ? 'text-blue-900' : 'text-red-900'
                  }`}>
                    € {economico.margine.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-700">Margine %</div>
                  <div className={`text-4xl font-bold ${
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
          <div className="text-center py-8 text-gray-500">
            <p>Nessun dato disponibile per questo cantiere</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EconomicoCantiere;