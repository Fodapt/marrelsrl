import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function Scadenzario() {
  // ✅ USA IL CONTEXT
  const { 
    lavoratori = [],
    unilav = [],
    certificazioni = [],
    veicoli = [],
    cantieri = [],
    documenti = [],
    rateizzi = [],
    rate = [],
    loading
  } = useData();

  // ✅ MOSTRA LOADING
  if (loading.lavoratori || loading.unilav || loading.certificazioni || loading.veicoli || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento scadenzario...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ✅ USA USEMEMO PER CALCOLARE LE SCADENZE
  const tutteScadenze = useMemo(() => {
    const oggi = new Date();
    const scadenze = [];

    // CORSI E VISITE MEDICHE (certificazioni)
    certificazioni.forEach(item => {
      if (item.data_scadenza) {
        const lavoratore = lavoratori.find(l => l.id === item.lavoratore_id);
        if (!lavoratore) return;
        
        const scadenza = new Date(item.data_scadenza);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= -30) {
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

    // AUTOMEZZI (veicoli) - Assicurazione e Revisione
    veicoli.forEach(mezzo => {
      ['assicurazione', 'revisione'].forEach(tipo => {
        const campo = tipo === 'assicurazione' ? 'scadenza_assicurazione' : 'scadenza_revisione';
        if (mezzo[campo]) {
          const scadenza = new Date(mezzo[campo]);
          const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
          
          if (giorniMancanti <= 30 && giorniMancanti >= -30) {
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

    // DNLT CANTIERI
    cantieri.forEach(cantiere => {
      if (cantiere.scadenza_dnlt) {
        const scadenza = new Date(cantiere.scadenza_dnlt);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= -30) {
          scadenze.push({
            tipo: 'dnlt',
            descrizione: 'Scadenza DNLT',
            lavoratore: `${cantiere.nome}${cantiere.stato === 'completato' ? ' (Completato)' : ''}`,
            scadenza: cantiere.scadenza_dnlt,
            giorniMancanti
          });
        }
      }
    });

    // CONTRATTI UNILAV
    lavoratori.forEach(lav => {
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
          
          if (giorniMancanti <= 30 && giorniMancanti >= -30) {
            const cantiere = cantieri.find(c => c.id === ultimoUnilav.cantiere_id);
            
            // Verifica se lavoratore è attivo
            const isAttivo = univlavLav.every(u => u.tipo_unilav !== 'dimissioni' || new Date(u.data_inizio) > oggi);
            
            scadenze.push({
              tipo: 'contratto',
              descrizione: 'Scadenza Contratto',
              lavoratore: `${lav.nome} ${lav.cognome}${!isAttivo ? ' (Non attivo)' : ''} - ${cantiere ? cantiere.nome : 'N/A'}`,
              scadenza: ultimoUnilav.data_fine,
              giorniMancanti
            });
          }
        }
      }
    });

    // DOCUMENTI/CERTIFICAZIONI
    documenti.forEach(doc => {
      if (doc.data_scadenza) {
        const scadenza = new Date(doc.data_scadenza);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= -30) {
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

    // RATEIZZI E RATE
    rate.forEach(rata => {
      if (rata.data_scadenza && rata.stato !== 'pagato') {
        const scadenza = new Date(rata.data_scadenza);
        const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        
        if (giorniMancanti <= 30 && giorniMancanti >= -30) {
          const rateizzo = rateizzi.find(r => r.id === rata.rateizzazione_id);
          
          scadenze.push({
            tipo: 'rateizzo',
            descrizione: rateizzo 
              ? `Rata ${rata.numero_rata} - ${rateizzo.nome}`
              : `Rata ${rata.numero_rata}`,
            lavoratore: `€ ${parseFloat(rata.importo || 0).toFixed(2)}`,
            scadenza: rata.data_scadenza,
            giorniMancanti
          });
        }
      }
    });

    return scadenze.sort((a, b) => a.giorniMancanti - b.giorniMancanti);
  }, [certificazioni, veicoli, cantieri, unilav, lavoratori, documenti, rateizzi, rate]);

  const scadenzeImminenti = tutteScadenze.filter(s => s.giorniMancanti >= 0);
  const scadenzePassate = tutteScadenze.filter(s => s.giorniMancanti < 0);

  return (
    <div className="space-y-4">
      {/* Scadenze Imminenti */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">📅 Scadenze Imminenti (prossimi 30 giorni)</h3>
        {scadenzeImminenti.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">✅</p>
            <p>Nessuna scadenza imminente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scadenzeImminenti.map((scad, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                scad.giorniMancanti <= 7 ? 'bg-red-50 border-red-500' :
                scad.giorniMancanti <= 15 ? 'bg-orange-50 border-orange-500' :
                'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{scad.descrizione}</div>
                    <p className="text-sm text-gray-600">{scad.lavoratore}</p>
                    <p className="text-xs text-gray-500 mt-1">Scadenza: {formatDate(scad.scadenza)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      scad.giorniMancanti <= 7 ? 'text-red-600' :
                      scad.giorniMancanti <= 15 ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>{scad.giorniMancanti}</div>
                    <div className="text-xs text-gray-600">giorni</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scadenze Passate */}
      {scadenzePassate.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-red-300">
          <h3 className="text-xl font-semibold mb-4 text-red-700">🚨 Scadenze Passate (ultimi 30 giorni)</h3>
          <div className="space-y-3">
            {scadenzePassate.map((scad, idx) => (
              <div key={idx} className="p-4 rounded-lg border-l-4 bg-red-100 border-red-700">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold mb-1 text-red-800">{scad.descrizione}</div>
                    <p className="text-sm text-red-700">{scad.lavoratore}</p>
                    <p className="text-xs text-red-600 mt-1">Scadenza: {formatDate(scad.scadenza)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-700">
                      {Math.abs(scad.giorniMancanti)}
                    </div>
                    <div className="text-xs text-red-600">giorni fa</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Scadenzario;