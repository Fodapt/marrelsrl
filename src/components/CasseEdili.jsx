import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function CassaEdile() {
  const { 
    cassaEdileLavoratori = [],
    cassaEdileTotali = [],
    lavoratori = [],
    cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [subTabCassa, setSubTabCassa] = useState(0);
  const [editingIdLav, setEditingIdLav] = useState(null);
  const [editingIdTot, setEditingIdTot] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formLavoratore, setFormLavoratore] = useState({
    lavoratoreId: '',
    cantiereId: '',
    giornoInizio: 1,
    giornoFine: 1,
    mese: new Date().getMonth() + 1,
    anno: new Date().getFullYear(),
    accant: 0,
    contr: 0,
    previdenz: 0,
    fondo_sai: 0,
    fondo_oc: 0,
    acc_mal: 0,
    ape: 0
  });

  const [formTotali, setFormTotali] = useState({
    cassaEdile: '',
    mese: new Date().getMonth() + 1,
    anno: new Date().getFullYear(),
    accant: 0,
    contr: 0,
    previdenz: 0,
    fondo_sai: 0,
    fondo_oc: 0,
    acc_mal: 0,
    ape: 0
  });

  const [meseTab, setMeseTab] = useState(new Date().getMonth() + 1);
  const [annoTab, setAnnoTab] = useState(new Date().getFullYear());
  const [cassaControllo, setCassaControllo] = useState('');
  const [meseReport, setMeseReport] = useState(new Date().getMonth() + 1);
  const [annoReport, setAnnoReport] = useState(new Date().getFullYear());
  const [discrepanze, setDiscrepanze] = useState({});

  const vociCassa = [
    { key: 'accant', label: 'accant.' },
    { key: 'contr', label: 'contr.' },
    { key: 'previdenz', label: 'previdenz.' },
    { key: 'fondo_sai', label: 'fondo sai' },
    { key: 'fondo_oc', label: 'fondo oc' },
    { key: 'acc_mal', label: 'acc. mal' },
    { key: 'ape', label: 'ape' }
  ];

  const mesiNomi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  if (loading.cassaEdileLavoratori || loading.cassaEdileTotali || loading.lavoratori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento Cassa Edile...</p>
        </div>
      </div>
    );
  }

  const casseUniche = useMemo(() => {
    return [...new Set(cantieri.map(c => c.casse_edile).filter(Boolean))];
  }, [cantieri]);

  const cifreFiltrate = useMemo(() => {
    return cassaEdileLavoratori.filter(c => c.mese === meseTab && c.anno === annoTab);
  }, [cassaEdileLavoratori, meseTab, annoTab]);

  const totaliFiltrati = useMemo(() => {
    return cassaEdileTotali.filter(c => c.mese === meseTab && c.anno === annoTab);
  }, [cassaEdileTotali, meseTab, annoTab]);

  const handleSaveLavoratore = async () => {
    if (!formLavoratore.lavoratoreId || !formLavoratore.cantiereId) {
      return alert('⚠️ Seleziona lavoratore e cantiere!');
    }

    setSaving(true);

    const dataForSupabase = {
      lavoratore_id: formLavoratore.lavoratoreId,
      cantiere_id: formLavoratore.cantiereId,
      mese: formLavoratore.mese,
      anno: formLavoratore.anno,
      giorno_inizio: formLavoratore.giornoInizio,
      giorno_fine: formLavoratore.giornoFine,
      accant: parseFloat(formLavoratore.accant) || 0,
      contr: parseFloat(formLavoratore.contr) || 0,
      previdenz: parseFloat(formLavoratore.previdenz) || 0,
      fondo_sai: parseFloat(formLavoratore.fondo_sai) || 0,
      fondo_oc: parseFloat(formLavoratore.fondo_oc) || 0,
      acc_mal: parseFloat(formLavoratore.acc_mal) || 0,
      ape: parseFloat(formLavoratore.ape) || 0
    };

    let result;
    if (editingIdLav) {
      result = await updateRecord('cassaEdileLavoratori', editingIdLav, dataForSupabase);
    } else {
      result = await addRecord('cassaEdileLavoratori', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setFormLavoratore({
        lavoratoreId: '',
        cantiereId: '',
        giornoInizio: 1,
        giornoFine: 1,
        mese: new Date().getMonth() + 1,
        anno: new Date().getFullYear(),
        accant: 0,
        contr: 0,
        previdenz: 0,
        fondo_sai: 0,
        fondo_oc: 0,
        acc_mal: 0,
        ape: 0
      });
      setEditingIdLav(null);
      alert(editingIdLav ? '✅ Cifre aggiornate!' : '✅ Cifre salvate!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleDeleteLavoratore = async (id) => {
    if (!confirm('❌ Eliminare questa voce?\n\nQuesta azione è irreversibile!')) return;
    const result = await deleteRecord('cassaEdileLavoratori', id);
    if (result.success) {
      alert('✅ Voce eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEditLavoratore = (record) => {
    setFormLavoratore({
      lavoratoreId: record.lavoratore_id,
      cantiereId: record.cantiere_id,
      giornoInizio: record.giorno_inizio,
      giornoFine: record.giorno_fine,
      mese: record.mese,
      anno: record.anno,
      accant: record.accant,
      contr: record.contr,
      previdenz: record.previdenz,
      fondo_sai: record.fondo_sai,
      fondo_oc: record.fondo_oc,
      acc_mal: record.acc_mal,
      ape: record.ape
    });
    setEditingIdLav(record.id);
    setSubTabCassa(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTotali = async () => {
    if (!formTotali.cassaEdile) {
      return alert('⚠️ Seleziona una cassa edile!');
    }

    setSaving(true);

    const dataForSupabase = {
      cassa_edile: formTotali.cassaEdile,
      mese: formTotali.mese,
      anno: formTotali.anno,
      accant: parseFloat(formTotali.accant) || 0,
      contr: parseFloat(formTotali.contr) || 0,
      previdenz: parseFloat(formTotali.previdenz) || 0,
      fondo_sai: parseFloat(formTotali.fondo_sai) || 0,
      fondo_oc: parseFloat(formTotali.fondo_oc) || 0,
      acc_mal: parseFloat(formTotali.acc_mal) || 0,
      ape: parseFloat(formTotali.ape) || 0
    };

    let result;
    if (editingIdTot) {
      result = await updateRecord('cassaEdileTotali', editingIdTot, dataForSupabase);
    } else {
      result = await addRecord('cassaEdileTotali', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      setFormTotali({
        cassaEdile: '',
        mese: new Date().getMonth() + 1,
        anno: new Date().getFullYear(),
        accant: 0,
        contr: 0,
        previdenz: 0,
        fondo_sai: 0,
        fondo_oc: 0,
        acc_mal: 0,
        ape: 0
      });
      setEditingIdTot(null);
      alert(editingIdTot ? '✅ Totali aggiornati!' : '✅ Totali salvati!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleDeleteTotali = async (id) => {
    if (!confirm('❌ Eliminare questa voce?\n\nQuesta azione è irreversibile!')) return;
    const result = await deleteRecord('cassaEdileTotali', id);
    if (result.success) {
      alert('✅ Voce eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  const handleEditTotali = (record) => {
    setFormTotali({
      cassaEdile: record.cassa_edile,
      mese: record.mese,
      anno: record.anno,
      accant: record.accant,
      contr: record.contr,
      previdenz: record.previdenz,
      fondo_sai: record.fondo_sai,
      fondo_oc: record.fondo_oc,
      acc_mal: record.acc_mal,
      ape: record.ape
    });
    setEditingIdTot(record.id);
    setSubTabCassa(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calcolaDiscrepanze = () => {
    if (!cassaControllo) return alert('⚠️ Seleziona una cassa edile!');

    const cantieriCassa = cantieri
      .filter(c => c.casse_edile === cassaControllo)
      .map(c => c.id);

    const report = {};
    
    vociCassa.forEach(({ key }) => {
      let sommaLav = 0;
      
      cassaEdileLavoratori.forEach(record => {
        if (cantieriCassa.includes(record.cantiere_id) && 
            record.mese === meseTab && 
            record.anno === annoTab) {
          sommaLav += parseFloat(record[key]) || 0;
        }
      });

      const totCassa = cassaEdileTotali.find(
        t => t.cassa_edile === cassaControllo && t.mese === meseTab && t.anno === annoTab
      );
      
      const totaleCassa = totCassa ? (parseFloat(totCassa[key]) || 0) : 0;
      const diff = sommaLav - totaleCassa;
      
      report[key] = {
        sommaLavoratori: sommaLav,
        totaleCassa: totaleCassa,
        differenza: diff,
        alert: Math.abs(diff) > 0.01
      };
    });

    setDiscrepanze(report);
  };

  const reportData = useMemo(() => {
    const data = {};
    
    cantieri.forEach(cantiere => {
      const cassaEdile = cantiere.casse_edile;
      if (!cassaEdile) return;

      const lavoratoriCantiere = cassaEdileLavoratori.filter(
        l => l.cantiere_id === cantiere.id && 
             l.mese === meseReport && 
             l.anno === annoReport
      );

      const totaleCantiere = lavoratoriCantiere.reduce((sum, l) => {
        return sum + vociCassa.reduce((acc, { key }) => 
          acc + (parseFloat(l[key]) || 0), 0);
      }, 0);

      if (!data[cassaEdile]) data[cassaEdile] = {};
      data[cassaEdile][cantiere.nome] = totaleCantiere;
    });

    return data;
  }, [cantieri, cassaEdileLavoratori, meseReport, annoReport, vociCassa]);

  const esportaPDFReport = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Report Casse Edili - ${mesiNomi[meseReport - 1]} ${annoReport}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; }
    .info { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #333; padding: 12px; text-align: left; }
    th { background-color: #3b82f6; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f3f4f6; }
    .total { font-weight: bold; text-align: right; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ccc; padding-top: 20px; }
    @media print { .no-print { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">
    🖨️ Stampa / Salva PDF
  </button>
  <h1>📊 Report Casse Edili</h1>
  <div class="info">
    <strong>Azienda:</strong> Marrel S.r.l.<br>
    <strong>Periodo:</strong> ${mesiNomi[meseReport - 1]} ${annoReport}<br>
    <strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
  ${Object.entries(reportData).map(([cassa, cantieriObj]) => {
    const totaleGenerale = Object.values(cantieriObj).reduce((sum, val) => sum + val, 0);
    return `
    <h2>Cassa Edile: ${cassa}</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 70%">Cantiere</th>
          <th style="width: 30%; text-align: right">Totale Contributi (€)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(cantieriObj).map(([cantiere, totale]) => `
        <tr>
          <td>${cantiere}</td>
          <td class="total">${totale.toFixed(2)}</td>
        </tr>
        `).join('')}
        <tr style="background-color: #dbeafe; font-weight: bold;">
          <td>TOTALE ${cassa}</td>
          <td class="total">${totaleGenerale.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    `;
  }).join('')}
  <div class="footer">
    <p>Gestionale Marrel S.r.l. - Report Casse Edili</p>
    <p>Documento generato automaticamente dal sistema</p>
  </div>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  const subTabs = ["Cifre Lavoratore", "Totali Casse", "Controllo", "Report"];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          💼 Sistema calcolo contributi Cassa Edile integrato con cantieri e lavoratori
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab, i) => (
          <button 
            key={i}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              subTabCassa === i ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setSubTabCassa(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTabCassa === 0 && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
            <h3 className="text-lg font-semibold mb-4">
              {editingIdLav ? '✏️ Modifica' : '➕ Nuove'} Cifre Lavoratore
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lavoratore *</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formLavoratore.lavoratoreId}
                  onChange={(e) => setFormLavoratore({...formLavoratore, lavoratoreId: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Seleziona lavoratore</option>
                  {lavoratori.map(l => (
                    <option key={l.id} value={l.id}>{l.cognome} {l.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cantiere *</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formLavoratore.cantiereId}
                  onChange={(e) => setFormLavoratore({...formLavoratore, cantiereId: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Seleziona cantiere</option>
                  {cantieri.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Periodo (gg)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="31"
                    className="border rounded px-3 py-2"
                    value={formLavoratore.giornoInizio}
                    onChange={(e) => setFormLavoratore({...formLavoratore, giornoInizio: Number(e.target.value)})}
                    disabled={saving}
                  />
                  <input 
                    type="number" 
                    min="1" 
                    max="31"
                    className="border rounded px-3 py-2"
                    value={formLavoratore.giornoFine}
                    onChange={(e) => setFormLavoratore({...formLavoratore, giornoFine: Number(e.target.value)})}
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mese/Anno</label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="border rounded px-3 py-2"
                    value={formLavoratore.mese}
                    onChange={(e) => setFormLavoratore({...formLavoratore, mese: Number(e.target.value)})}
                    disabled={saving}
                  >
                    {mesiNomi.map((nome, index) => (
                      <option key={index} value={index + 1}>{index + 1}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    className="border rounded px-3 py-2"
                    value={formLavoratore.anno}
                    onChange={(e) => setFormLavoratore({...formLavoratore, anno: Number(e.target.value)})}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vociCassa.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="border rounded px-3 py-2 w-full"
                    value={formLavoratore[key] === 0 ? '' : formLavoratore[key]}
                    onChange={(e) => setFormLavoratore({...formLavoratore, [key]: e.target.value})}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={handleSaveLavoratore}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '⏳ Salvataggio...' : '💾 Salva'}
              </button>
              {editingIdLav && (
                <button 
                  onClick={() => {
                    setEditingIdLav(null);
                    setFormLavoratore({
                      lavoratoreId: '',
                      cantiereId: '',
                      giornoInizio: 1,
                      giornoFine: 1,
                      mese: new Date().getMonth() + 1,
                      anno: new Date().getFullYear(),
                      accant: 0,
                      contr: 0,
                      previdenz: 0,
                      fondo_sai: 0,
                      fondo_oc: 0,
                      acc_mal: 0,
                      ape: 0
                    });
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  disabled={saving}
                >
                  ✕ Annulla
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-4">
              <select 
                className="border rounded px-3 py-2"
                value={meseTab}
                onChange={(e) => setMeseTab(Number(e.target.value))}
              >
                {mesiNomi.map((nome, index) => (
                  <option key={index} value={index + 1}>{nome}</option>
                ))}
              </select>
              <input 
                type="number" 
                className="border rounded px-3 py-2"
                value={annoTab}
                onChange={(e) => setAnnoTab(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Lavoratore</th>
                  <th className="px-3 py-2 text-left">Cantiere</th>
                  <th className="px-3 py-2 text-center">Periodo</th>
                  {vociCassa.map(({ key, label }) => (
                    <th key={key} className="px-3 py-2 text-right">{label}</th>
                  ))}
                  <th className="px-3 py-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {cifreFiltrate.map(record => {
                  const lav = lavoratori.find(l => l.id === record.lavoratore_id);
                  const cant = cantieri.find(c => c.id === record.cantiere_id);
                  
                  return (
                    <tr key={record.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {lav ? `${lav.nome} {lav.cognome}` : 'N/A'}
                      </td>
                      <td className="px-3 py-2">{cant?.nome || 'N/A'}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {record.giorno_inizio}-{record.giorno_fine}
                      </td>
                      {vociCassa.map(({ key }) => (
                        <td key={key} className="px-3 py-2 text-right font-mono">
                          {parseFloat(record[key] || 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <button 
                          onClick={() => handleEditLavoratore(record)}
                          className="text-blue-600 mr-2"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteLavoratore(record.id)}
                          className="text-red-600"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {cifreFiltrate.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-4">📊</p>
                <p>Nessuna cifra registrata per questo periodo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {subTabCassa === 1 && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
            <h3 className="text-lg font-semibold mb-4">
              {editingIdTot ? '✏️ Modifica' : '➕ Nuovi'} Totali Cassa Edile
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cassa Edile *</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formTotali.cassaEdile}
                  onChange={(e) => setFormTotali({...formTotali, cassaEdile: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Seleziona cassa</option>
                  {casseUniche.map(cassa => (
                    <option key={cassa} value={cassa}>{cassa}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mese</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formTotali.mese}
                  onChange={(e) => setFormTotali({...formTotali, mese: Number(e.target.value)})}
                  disabled={saving}
                >
                  {mesiNomi.map((nome, index) => (
                    <option key={index} value={index + 1}>{nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Anno</label>
                <input 
                  type="number" 
                  className="border rounded px-3 py-2 w-full"
                  value={formTotali.anno}
                  onChange={(e) => setFormTotali({...formTotali, anno: Number(e.target.value)})}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vociCassa.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="border rounded px-3 py-2 w-full"
                    value={formTotali[key] === 0 ? '' : formTotali[key]}
                    onChange={(e) => setFormTotali({...formTotali, [key]: e.target.value})}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={handleSaveTotali}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '⏳ Salvataggio...' : '💾 Salva'}
              </button>
              {editingIdTot && (
                <button 
                  onClick={() => {
                    setEditingIdTot(null);
                    setFormTotali({
                      cassaEdile: '',
                      mese: new Date().getMonth() + 1,
                      anno: new Date().getFullYear(),
                      accant: 0,
                      contr: 0,
                      previdenz: 0,
                      fondo_sai: 0,
                      fondo_oc: 0,
                      acc_mal: 0,
                      ape: 0
                    });
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  disabled={saving}
                >
                  ✕ Annulla
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-4">
              <select 
                className="border rounded px-3 py-2"
                value={meseTab}
                onChange={(e) => setMeseTab(Number(e.target.value))}
              >
                {mesiNomi.map((nome, index) => (
                  <option key={index} value={index + 1}>{nome}</option>
                ))}
              </select>
              <input 
                type="number" 
                className="border rounded px-3 py-2"
                value={annoTab}
                onChange={(e) => setAnnoTab(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Cassa Edile</th>
                  {vociCassa.map(({ key, label }) => (
                    <th key={key} className="px-3 py-2 text-right">{label}</th>
                  ))}
                  <th className="px-3 py-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {totaliFiltrati.map(record => (
                  <tr key={record.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{record.cassa_edile}</td>
                    {vociCassa.map(({ key }) => (
                      <td key={key} className="px-3 py-2 text-right font-mono">
                        {parseFloat(record[key] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => handleEditTotali(record)}
                        className="text-blue-600 mr-2"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteTotali(record.id)}
                        className="text-red-600"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totaliFiltrati.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-4">📊</p>
                <p>Nessun totale registrato per questo periodo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {subTabCassa === 2 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">🔍 Controllo Discrepanze</h3>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-4">
              <select 
                className="border rounded px-3 py-2 flex-1"
                value={cassaControllo}
                onChange={(e) => setCassaControllo(e.target.value)}
              >
                <option value="">Seleziona Cassa Edile</option>
                {casseUniche.map(cassa => (
                  <option key={cassa} value={cassa}>{cassa}</option>
                ))}
              </select>
              <select 
                className="border rounded px-3 py-2"
                value={meseTab}
                onChange={(e) => setMeseTab(Number(e.target.value))}
              >
                {mesiNomi.map((nome, index) => (
                  <option key={index} value={index + 1}>{nome}</option>
                ))}
              </select>
              <input 
                type="number" 
                className="border rounded px-3 py-2"
                value={annoTab}
                onChange={(e) => setAnnoTab(Number(e.target.value))}
              />
              <button 
                onClick={calcolaDiscrepanze}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                🔍 Calcola
              </button>
            </div>
          </div>

          {Object.keys(discrepanze).length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Voce</th>
                    <th className="px-4 py-3 text-right">Somma Lavoratori</th>
                    <th className="px-4 py-3 text-right">Totale Cassa</th>
                    <th className="px-4 py-3 text-right">Differenza</th>
                  </tr>
                </thead>
                <tbody>
                  {vociCassa.map(({ key, label }) => {
                    const dati = discrepanze[key];
                    if (!dati) return null;
                    
                    return (
                      <tr 
                        key={key} 
                        className={`border-t ${dati.alert ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium">{label}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          € {dati.sommaLavoratori.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          € {dati.totaleCassa.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={dati.alert ? 'text-red-600 font-bold' : ''}>
                            € {dati.differenza.toFixed(2)} {dati.alert && '⚠️'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTabCassa === 3 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">📊 Report Cantieri per Cassa</h3>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Mese</label>
                <select 
                  className="border rounded px-3 py-2"
                  value={meseReport}
                  onChange={(e) => setMeseReport(Number(e.target.value))}
                >
                  {mesiNomi.map((nome, index) => (
                    <option key={index} value={index + 1}>{nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Anno</label>
                <input 
                  type="number" 
                  className="border rounded px-3 py-2"
                  value={annoReport}
                  onChange={(e) => setAnnoReport(Number(e.target.value))}
                />
              </div>
              <button 
                onClick={esportaPDFReport}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                📄 Esporta PDF
              </button>
            </div>
          </div>

          {Object.entries(reportData).map(([cassa, cantieriObj]) => {
            const totaleGenerale = Object.values(cantieriObj).reduce((sum, val) => sum + val, 0);
            
            return (
              <div key={cassa} className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold text-blue-700 mb-4">{cassa}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Cantiere</th>
                        <th className="px-4 py-3 text-right">Totale Contributi (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(cantieriObj).map(([cantiere, totale]) => (
                        <tr key={cantiere} className="border-t">
                          <td className="px-4 py-3">{cantiere}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            {totale.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-blue-50 font-bold">
                        <td className="px-4 py-3">TOTALE {cassa}</td>
                        <td className="px-4 py-3 text-right font-mono text-lg">
                          € {totaleGenerale.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {Object.keys(reportData).length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <p className="text-4xl mb-4">📊</p>
              <p>Nessun dato disponibile per il periodo selezionato</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CassaEdile;