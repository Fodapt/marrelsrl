import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate } from '../utils/dateUtils';

function Dashboard() {
  const { 
    lavoratori, 
    unilav, 
    cantieri, 
    veicoli,
    certificazioni,
    documenti, 
    rateizzi,
    rate,  
    loading 
  } = useData();

  // Calcola lavoratori attivi
 const lavoratoriAttivi = useMemo(() => {
  return lavoratori.filter(l => {
    if (l.ruolo === 'amministratore' || l.ruolo === 'direttore_tecnico') return false;
    
    const univlavLav = unilav.filter(u => u.lavoratore_id === l.id);
    if (univlavLav.length === 0) return false;
    
    const ultimoUnilav = univlavLav.sort((a, b) => 
      new Date(b.data_inizio || '1900-01-01') - new Date(a.data_inizio || '1900-01-01')
    )[0];
    
    // Se l'ultimo unilav è dimissioni e la data è passata, NON è attivo
    if (ultimoUnilav.tipo_unilav === 'dimissioni') {
      const dataDimissioni = new Date(ultimoUnilav.data_inizio);
      return dataDimissioni > new Date();
    }
    
    return true;
  });
}, [lavoratori, unilav]);

  // Calcola scadenze imminenti (prossimi 30 giorni)
  const calcolaScadenze = (lavoratoriAttivi) => {
    const oggi = new Date();
    const scadenze = [];

    // Certificazioni (corsi e visite mediche)
    certificazioni.forEach(item => {
      if (item.data_scadenza) {
        const lavoratore = lavoratori.find(l => l.id === item.lavoratore_id);
        if (!lavoratore) return;
        
        const scadenza = new Date(item.data_scadenza);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= 0) {
          scadenze.push({
            tipo: item.tipo,
            descrizione: `${item.tipo === 'corso' ? 'Corso' : 'Visita'}: ${item.nome}`,
            lavoratore: `${lavoratore.nome} ${lavoratore.cognome}`,
            scadenza: item.data_scadenza,
            giorniMancanti
          });
        }
      }
    });

    // Veicoli - Assicurazione e Revisione
    veicoli.forEach(mezzo => {
      ['assicurazione', 'revisione'].forEach(tipo => {
        const campo = tipo === 'assicurazione' ? 'scadenza_assicurazione' : 'scadenza_revisione';
        if (mezzo[campo]) {
          const scadenza = new Date(mezzo[campo]);
          const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
          
          if (giorniMancanti <= 30 && giorniMancanti >= 0) {
            scadenze.push({
              tipo: tipo,
              descrizione: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} ${mezzo.targa}`,
              lavoratore: mezzo.modello,
              scadenza: mezzo[campo],
              giorniMancanti
            });
          }
        }
      });
    });

    // DNLT Cantieri (solo attivi)
    cantieri.forEach(cantiere => {
      if (cantiere.stato === 'completato') return;
      
      if (cantiere.scadenza_dnlt) {
        const scadenza = new Date(cantiere.scadenza_dnlt);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= 0) {
          scadenze.push({
            tipo: 'dnlt',
            descrizione: 'Scadenza DNLT',
            lavoratore: cantiere.nome,
            scadenza: cantiere.scadenza_dnlt,
            giorniMancanti
          });
        }
      }
    });

    // Contratti Unilav (solo lavoratori attivi)
    lavoratoriAttivi.forEach(lav => {
      const univlavLav = unilav.filter(u => u.lavoratore_id === lav.id);
      if (univlavLav.length > 0) {
        const ultimoUnilav = univlavLav.sort((a, b) => {
          const dateA = new Date(a.data_inizio || '1900-01-01');
          const dateB = new Date(b.data_inizio || '1900-01-01');
          return dateB - dateA;
        })[0];
        
        if (ultimoUnilav.tipo_contratto === 'determinato' && ultimoUnilav.data_fine) {
          const scadenza = new Date(ultimoUnilav.data_fine);
          const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
          
          if (giorniMancanti <= 30 && giorniMancanti >= 0) {
            const cantiere = cantieri.find(c => c.id === ultimoUnilav.cantiere_id);
            scadenze.push({
              tipo: 'contratto',
              descrizione: 'Scadenza Contratto',
              lavoratore: `${lav.nome} ${lav.cognome} - ${cantiere ? cantiere.nome : 'N/A'}`,
              scadenza: ultimoUnilav.data_fine,
              giorniMancanti
            });
          }
        }
      }
    });

    // Documenti/Certificazioni
    documenti.forEach(doc => {
      if (doc.data_scadenza) {
        const scadenza = new Date(doc.data_scadenza);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= 0) {
          const cantiere = cantieri.find(c => c.id === doc.riferimento_id);
          scadenze.push({
            tipo: 'documento',
            descrizione: `${doc.tipo}: ${doc.nome}`,
            lavoratore: cantiere ? cantiere.nome : 'N/A',
            scadenza: doc.data_scadenza,
            giorniMancanti
          });
        }
      }
    });

   // Rateizzi - Scadenze rate (rate sono dentro rateizzi come JSONB)
rateizzi.forEach(rateizzo => {
  const rate = rateizzo.rate || [];
  rate.forEach(rata => {
    const isPagata = rata.dataPagamento && rata.dataPagamento !== '';
    
    if (!isPagata && rata.dataScadenza) {
      const scadenza = new Date(rata.dataScadenza);
      const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      
      if (giorniMancanti <= 30 && giorniMancanti >= 0) {
        scadenze.push({
          tipo: 'rateizzo',
          descrizione: `${rateizzo.nome} - Rata ${rata.numeroRata}`,
          lavoratore: `Importo: € ${parseFloat(rata.importo || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          scadenza: rata.dataScadenza,
          giorniMancanti
        });
      }
    }
  });
});

    return scadenze.sort((a, b) => a.giorniMancanti - b.giorniMancanti);
  };

  const scadenzeImminenti = useMemo(() => calcolaScadenze(lavoratoriAttivi), [
    lavoratori, unilav, cantieri, veicoli, certificazioni, documenti, rateizzi, rate, lavoratoriAttivi
  ]);

  // Raggruppa lavoratori per cantiere
  const lavoratoriPerCantiere = useMemo(() => {
    const grouped = {};
    
    lavoratoriAttivi.forEach(lavoratore => {
      const univlavLavoratore = unilav.filter(u => u.lavoratore_id === lavoratore.id);
      if (univlavLavoratore.length > 0) {
        const ultimoUnilav = univlavLavoratore.sort((a, b) => {
          const dateA = new Date(a.data_inizio || '1900-01-01');
          const dateB = new Date(b.data_inizio || '1900-01-01');
          return dateB - dateA;
        })[0];
        
        const cantiereId = ultimoUnilav.cantiere_id;
        if (!grouped[cantiereId]) grouped[cantiereId] = [];
        grouped[cantiereId].push({
          ...lavoratore,
          livello: ultimoUnilav.livello,
          qualifica: ultimoUnilav.qualifica,
          data_inizio: ultimoUnilav.data_inizio
        });
      }
    });
    
    return grouped;
  }, [lavoratoriAttivi, unilav]);

  // ✅ EXPORT PDF LAVORATORI PER CANTIERE
  const exportPDFLavoratori = () => {
    const oggi = new Date();
    const dataStampa = oggi.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let totLavoratori = 0;
    Object.values(lavoratoriPerCantiere).forEach(lav => {
      totLavoratori += lav.length;
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lavoratori per Cantiere</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #2563eb; margin-top: 25px; margin-bottom: 10px; font-size: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #3b82f6; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f3f4f6; }
    .summary { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .cantiere-box { margin-bottom: 30px; page-break-inside: avoid; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      button { display: none !important; }
      .cantiere-box { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">
    🖨️ Stampa / Salva PDF
  </button>
  
  <h1>🏗️ Lavoratori per Cantiere</h1>
  <p><strong>Data Stampa:</strong> ${dataStampa}</p>
  
  <div class="summary">
    <p><strong>Cantieri Attivi:</strong> ${Object.keys(lavoratoriPerCantiere).length}</p>
    <p><strong>Lavoratori Totali:</strong> ${totLavoratori}</p>
  </div>
`;

    // Genera sezione per ogni cantiere
    Object.entries(lavoratoriPerCantiere).forEach(([cantiereId, lav]) => {
      const cantiere = cantieri.find(c => c.id === cantiereId);
      const nomeCantiere = cantiere ? cantiere.nome : `Cantiere ${cantiereId}`;
      const indirizzoCantiere = cantiere ? `${cantiere.indirizzo || ''} ${cantiere.citta || ''}`.trim() : '';

      html += `
  <div class="cantiere-box">
    <h2>📍 ${nomeCantiere}</h2>
    ${indirizzoCantiere ? `<p style="margin-top: -10px; color: #666;"><em>${indirizzoCantiere}</em></p>` : ''}
    <p><strong>Numero Lavoratori:</strong> ${lav.length}</p>
    
    <table>
      <thead>
        <tr>
          <th>Nome Completo</th>
          <th>Qualifica</th>
          <th>Livello</th>
          <th>Data Inizio</th>
        </tr>
      </thead>
      <tbody>
        ${lav.map(l => `
        <tr>
          <td><strong>${l.nome} ${l.cognome}</strong></td>
          <td>${l.qualifica || '-'}</td>
          <td>${l.livello || '-'}</td>
          <td>${formatDate(l.data_inizio)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
    });

    html += `
  <div style="margin-top: 30px; padding: 10px; background: #eff6ff; border-top: 2px solid #1e40af; font-size: 9px;">
    <p>Documento generato automaticamente da Marrel S.r.l. - ${dataStampa}</p>
  </div>
</body>
</html>`;

    const nuovaFinestra = window.open('', '_blank');
    if (nuovaFinestra) {
      nuovaFinestra.document.write(html);
      nuovaFinestra.document.close();
    } else {
      alert('⚠️ Popup bloccato! Abilita i popup per questo sito.');
    }
  };

  // ✅ LOADING DOPO TUTTI GLI HOOK
  if (loading.lavoratori || loading.cantieri || loading.unilav) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Lavoratori</p>
              <p className="text-3xl font-bold text-blue-900">{lavoratoriAttivi.length}</p>
            </div>
            <span className="text-4xl">👷</span>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Cantieri</p>
              <p className="text-3xl font-bold text-green-900">{cantieri.length}</p>
            </div>
            <span className="text-4xl">🏗️</span>
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Veicoli</p>
              <p className="text-3xl font-bold text-orange-900">{veicoli.length}</p>
            </div>
            <span className="text-4xl">🚛</span>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Scadenze</p>
              <p className="text-3xl font-bold text-red-900">{scadenzeImminenti.length}</p>
            </div>
            <span className="text-4xl">⚠️</span>
          </div>
        </div>
      </div>

      {/* Scadenze Imminenti */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📅 Scadenze Imminenti (30 giorni)</h3>
        {scadenzeImminenti.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">✅</p>
            <p>Nessuna scadenza imminente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Tipo</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Descrizione</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Riferimento</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Scadenza</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Giorni</th>
                </tr>
              </thead>
              <tbody>
                {scadenzeImminenti.map((scad, idx) => (
                  <tr key={idx} className={scad.giorniMancanti <= 7 ? 'bg-red-50' : 'bg-yellow-50'}>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100">
                        {scad.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{scad.descrizione}</td>
                    <td className="px-4 py-2 text-sm">{scad.lavoratore}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(scad.scadenza)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`font-semibold ${scad.giorniMancanti <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {scad.giorniMancanti}g
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lavoratori per Cantiere */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">🏗️ Lavoratori per Cantiere</h3>
          {Object.keys(lavoratoriPerCantiere).length > 0 && (
            <button 
              onClick={exportPDFLavoratori}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">
              📄 Esporta PDF
            </button>
          )}
        </div>
        
        {Object.keys(lavoratoriPerCantiere).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">👷</p>
            <p>Nessun lavoratore assegnato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(lavoratoriPerCantiere).map(([cantiereId, lav]) => {
              const cantiere = cantieri.find(c => c.id === cantiereId);
              return (
                <div key={cantiereId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-blue-600 text-lg">
                        {cantiere ? cantiere.nome : `Cantiere ${cantiereId}`}
                      </h4>
                      {cantiere?.indirizzo && (
                        <p className="text-sm text-gray-600">
                          {cantiere.indirizzo} {cantiere.citta}
                        </p>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {lav.length} {lav.length === 1 ? 'lavoratore' : 'lavoratori'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lav.map(l => (
                      <div key={l.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-semibold text-blue-900">{l.nome} {l.cognome}</p>
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          {l.qualifica && <p>👔 {l.qualifica}</p>}
                          {l.livello && <p>📊 Livello: {l.livello}</p>}
                          {l.data_inizio && <p>📅 Dal: {formatDate(l.data_inizio)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;