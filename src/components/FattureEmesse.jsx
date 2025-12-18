import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

function FattureEmesse() {
  const {
    fattureEmesse = [],
    fornitori = [],
    cantieri = [],
    loading,
    addRecord,
    updateRecord,
    deleteRecord
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ tipo: 'fattura' });
  const [saving, setSaving] = useState(false);
  const [showAccontiModal, setShowAccontiModal] = useState(false);
  const [fatturaSelezionata, setFatturaSelezionata] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroCantiere, setFiltroCantiere] = useState('');

  // ✅ MOSTRA LOADING
  if (loading.fattureEmesse || loading.fornitori || loading.cantieri) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento fatture...</p>
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

  const calcolaIVA = (imponibile, percentualeIVA) => {
    return (parseFloat(imponibile || 0) * parseFloat(percentualeIVA || 22)) / 100;
  };

  const calcolaTotale = (imponibile, percentualeIVA) => {
  return parseFloat(imponibile || 0) + calcolaIVA(imponibile, percentualeIVA);
};

const calcolaImportoEffettivo = (fattura) => {
  const totale = calcolaTotale(fattura.imponibile, fattura.percentuale_iva);
  return fattura.tipo === 'nota_credito' ? -totale : totale;
};

const calcolaIncassato = (fattura) => {
  if (!fattura.acconti || fattura.acconti.length === 0) return 0;
  return fattura.acconti.reduce((sum, acc) => sum + parseFloat(acc.importo || 0), 0);
};

const calcolaResiduo = (fattura) => {
  const totale = calcolaImportoEffettivo(fattura);
  const incassato = calcolaIncassato(fattura);
  return fattura.tipo === 'nota_credito' ? totale + incassato : totale - incassato;
};

  const fattureFiltrate = useMemo(() => {
    return fattureEmesse.filter(f => {
      if (filtroCliente && f.cliente_id !== filtroCliente) return false;
      if (filtroCantiere && f.cantiere_id !== filtroCantiere) return false;
      return true;
    }).sort((a, b) => {
      const numA = a.numero_fattura || '';
      const numB = b.numero_fattura || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [fattureEmesse, filtroCliente, filtroCantiere]);

  const riepilogoCliente = useMemo(() => {
    if (!filtroCliente && !filtroCantiere) return null; 
    
    const fatture = fattureEmesse.filter(f => {
    if (filtroCliente && f.cliente_id !== filtroCliente) return false; 
    if (filtroCantiere && f.cantiere_id !== filtroCantiere) return false; 
    return true; 
  });
    const totaleEmesso = fatture.reduce((sum, f) => {
  const totale = calcolaTotale(f.imponibile, f.percentuale_iva);
  return f.tipo === 'nota_credito' ? sum - totale : sum + totale;
}, 0);
    const totaleIncassato = fatture.reduce((sum, f) => 
      sum + calcolaIncassato(f), 0);
    const residuo = totaleEmesso - totaleIncassato;
    
    return { totaleEmesso, totaleIncassato, residuo };
  }, [fattureEmesse, filtroCliente, filtroCantiere]);

  // ✅ SALVA FATTURA
  const handleSave = async () => {
  if (!formData.dataFattura || !formData.numeroFattura || !formData.clienteId || !formData.imponibile) {
    return alert('⚠️ Compila tutti i campi obbligatori:\n- Data Fattura\n- Numero Fattura\n- Cliente\n- Imponibile');
  }

  if (formData.tipo === 'nota_credito' && !formData.fatturaRiferimento) {
    return alert('⚠️ Per le note di credito è obbligatorio indicare la fattura di riferimento');
  }

    setSaving(true);

    const dataForSupabase = {
  data_fattura: formData.dataFattura,
  numero_fattura: formData.numeroFattura,
  cliente_id: formData.clienteId,
  cantiere_id: formData.cantiereId || null,
  imponibile: parseFloat(formData.imponibile),
  percentuale_iva: parseFloat(formData.percentualeIVA || 22),
  acconti: formData.acconti || [],
  note: formData.note || null,
  tipo: formData.tipo || 'fattura',
  fattura_riferimento: formData.fatturaRiferimento || null
};
    let result;
    if (editingId) {
      result = await updateRecord('fattureEmesse', editingId, dataForSupabase);
    } else {
      result = await addRecord('fattureEmesse', dataForSupabase);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Fattura aggiornata!' : '✅ Fattura creata!');
      setShowForm(false);
      setFormData({ tipo: 'fattura', percentualeIVA: 22, acconti: [] });
      setEditingId(null);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ ELIMINA FATTURA
  const handleDelete = async (fattura) => {
    if (!confirm(`❌ Eliminare la fattura ${fattura.numero_fattura}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('fattureEmesse', fattura.id);

    if (result.success) {
      alert('✅ Fattura eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ EDIT FATTURA
  const handleEdit = (fattura) => {
  setFormData({
    dataFattura: fattura.data_fattura,
    numeroFattura: fattura.numero_fattura,
    clienteId: fattura.cliente_id,
    cantiereId: fattura.cantiere_id,
    imponibile: fattura.imponibile,
    percentualeIVA: fattura.percentuale_iva,
    acconti: fattura.acconti || [],
    note: fattura.note,
    tipo: fattura.tipo || 'fattura',
    fatturaRiferimento: fattura.fattura_riferimento
  });
    setEditingId(fattura.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ AGGIUNGI ACCONTO
  const aggiungiAcconto = async (fatturaId, importo, dataIncasso) => {
    const fattura = fattureEmesse.find(f => f.id === fatturaId);
    if (!fattura) return;

    const nuovoAcconto = {
      id: Date.now().toString(),
      importo: parseFloat(importo),
      dataIncasso,
      data: new Date().toISOString()
    };

    const result = await updateRecord('fattureEmesse', fatturaId, {
      acconti: [...(fattura.acconti || []), nuovoAcconto]
    });

    if (result.success) {
      setFatturaSelezionata(result.data);
      alert('✅ Acconto aggiunto!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // ✅ RIMUOVI ACCONTO
  const rimuoviAcconto = async (fatturaId, accontoId) => {
    const fattura = fattureEmesse.find(f => f.id === fatturaId);
    if (!fattura) return;

    const result = await updateRecord('fattureEmesse', fatturaId, {
      acconti: (fattura.acconti || []).filter(a => a.id !== accontoId)
    });

    if (result.success) {
      setFatturaSelezionata(result.data);
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con filtri */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ percentualeIVA: 22, acconti: [] });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Nuova Fattura
        </button>

        <select 
          className="border rounded px-3 py-2"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
        >
          <option value="">Tutti i clienti</option>
          {fornitori.map(f => (
            <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
          ))}
        </select>

        <select 
  className="border rounded px-3 py-2"
  value={filtroCantiere}
  onChange={(e) => setFiltroCantiere(e.target.value)}
>
  <option value="">Tutti i cantieri</option>
  {cantieri.map(c => (
    <option key={c.id} value={c.id}>{c.nome}</option>
  ))}
</select>
      </div>

     

      {/* Riepilogo Cliente */}
      {riepilogoCliente && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale Emesso</div>
            <div className="text-2xl font-bold text-blue-900">
              € {riepilogoCliente.totaleEmesso.toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Totale Incassato</div>
            <div className="text-2xl font-bold text-green-900">
              € {riepilogoCliente.totaleIncassato.toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Residuo</div>
            <div className="text-2xl font-bold text-orange-900">
              € {riepilogoCliente.residuo.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Form Nuova Fattura */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica' : '➕ Nuova'} Fattura
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Fattura *</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={formData.dataFattura || ''}
                onChange={(e) => setFormData({...formData, dataFattura: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numero Fattura *</label>
              <input 
                type="text" 
                className="border rounded px-3 py-2 w-full"
                placeholder="es: 2025/001"
                value={formData.numeroFattura || ''}
                onChange={(e) => setFormData({...formData, numeroFattura: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cliente *</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.clienteId || ''}
                onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                disabled={saving}
              >
                <option value="">Seleziona cliente</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                ))}
              </select>
              <div>
  <label className="block text-sm font-medium mb-1">Tipo Documento *</label>
  <select 
    className="border rounded px-3 py-2 w-full"
    value={formData.tipo || 'fattura'}
    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
    disabled={saving}
  >
    <option value="fattura">Fattura</option>
    <option value="nota_credito">Nota di Credito</option>
  </select>
</div>

{formData.tipo === 'nota_credito' && (
  <div className="col-span-2">
    <label className="block text-sm font-medium mb-1">Fattura di Riferimento *</label>
    <select 
      className="border rounded px-3 py-2 w-full"
      value={formData.fatturaRiferimento || ''}
      onChange={(e) => setFormData({...formData, fatturaRiferimento: e.target.value})}
      disabled={saving}
    >
      <option value="">Seleziona fattura...</option>
      {fattureEmesse
        .filter(f => f.tipo !== 'nota_credito' && f.cliente_id === formData.clienteId)
        .map(f => (
          <option key={f.id} value={f.id}>
            {f.numero_fattura} - {formatDate(f.data_fattura)} - € {calcolaTotale(f.imponibile, f.percentuale_iva).toFixed(2)}
          </option>
        ))}
    </select>
  </div>
)}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantiere</label>
              <select 
                className="border rounded px-3 py-2 w-full"
                value={formData.cantiereId || ''}
                onChange={(e) => setFormData({...formData, cantiereId: e.target.value})}
                disabled={saving}
              >
                <option value="">Nessun cantiere</option>
                {cantieri.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imponibile * (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={formData.imponibile || ''}
                onChange={(e) => setFormData({...formData, imponibile: e.target.value})}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IVA (%)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={formData.percentualeIVA || 22}
                onChange={(e) => setFormData({...formData, percentualeIVA: e.target.value})}
                disabled={saving}
              />
            </div>
            <div className="col-span-2 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">IVA</div>
                  <div className="text-xl font-bold">
                    € {calcolaIVA(formData.imponibile, formData.percentualeIVA).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Totale</div>
<div className={`text-2xl font-bold ${formData.tipo === 'nota_credito' ? 'text-red-600' : 'text-blue-600'}`}>
  € {(formData.tipo === 'nota_credito' ? -1 : 1) * calcolaTotale(formData.imponibile, formData.percentualeIVA).toFixed(2)}
</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Residuo</div>
                  <div className="text-xl font-bold text-orange-600">
                    € {(calcolaTotale(formData.imponibile, formData.percentualeIVA) - calcolaIncassato(formData)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea 
                className="border rounded px-3 py-2 w-full"
                rows="2"
                placeholder="Note aggiuntive..."
                value={formData.note || ''}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '⏳ Salvataggio...' : '✓ Salva'}
            </button>
            <button 
              onClick={() => {
                setShowForm(false);
                setFormData({ percentualeIVA: 22, acconti: [] });
                setEditingId(null);
              }} 
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              disabled={saving}
            >
              ✕ Annulla
            </button>
          </div>
        </div>
      )}

      {/* Tabella Fatture */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Numero</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Cantiere</th>
              <th className="px-3 py-2 text-right">Imponibile</th>
              <th className="px-3 py-2 text-right">IVA</th>
              <th className="px-3 py-2 text-right">Totale</th>
              <th className="px-3 py-2 text-right">Incassato</th>
              <th className="px-3 py-2 text-right">Residuo</th>
              <th className="px-3 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {fattureFiltrate.map(fattura => {
              const cliente = fornitori.find(f => f.id === fattura.cliente_id);
              const cantiere = cantieri.find(c => c.id === fattura.cantiere_id);
              const totale = calcolaImportoEffettivo(fattura);
const incassato = calcolaIncassato(fattura);
const residuo = calcolaResiduo(fattura);
const isNotaCredito = fattura.tipo === 'nota_credito';

              return (
                <tr key={fattura.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{formatDate(fattura.data_fattura)}</td>
                  <td className="px-3 py-2 font-mono">{fattura.numero_fattura}</td>
                  <td className="px-3 py-2">{cliente?.ragione_sociale || '-'}</td>
                  <td className="px-3 py-2">{cantiere?.nome || '-'}</td>
                  <td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {(isNotaCredito ? -1 : 1) * parseFloat(fattura.imponibile).toFixed(2)}
</td>
<td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {(isNotaCredito ? -1 : 1) * calcolaIVA(fattura.imponibile, fattura.percentuale_iva).toFixed(2)}
</td>
<td className={`px-3 py-2 text-right font-medium ${isNotaCredito ? 'text-red-600' : ''}`}>
  € {totale.toFixed(2)}
</td>
<td className={`px-3 py-2 text-right ${isNotaCredito ? 'text-red-600' : 'text-green-600'}`}>
  € {incassato.toFixed(2)}
</td>
<td className={`px-3 py-2 text-right font-medium ${isNotaCredito ? 'text-red-600' : 'text-orange-600'}`}>
  € {residuo.toFixed(2)}
</td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => {
                        setFatturaSelezionata(fattura);
                        setShowAccontiModal(true);
                      }} 
                      className="text-green-600 mr-2" 
                      title="Gestisci Acconti"
                    >
                      💰
                    </button>
                    <button 
                      onClick={() => handleEdit(fattura)} 
                      className="text-blue-600 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(fattura)} 
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
        {fattureFiltrate.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">📄</p>
            <p>Nessuna fattura registrata</p>
            <p className="text-sm mt-2 text-gray-400">Clicca su "➕ Nuova Fattura" per iniziare</p>
          </div>
        )}
      </div>

      {/* Modal Acconti */}
      {showAccontiModal && fatturaSelezionata && (
        <AccontiModal
          fattura={fatturaSelezionata}
          onClose={() => {
            setShowAccontiModal(false);
            setFatturaSelezionata(null);
          }}
          aggiungiAcconto={aggiungiAcconto}
          rimuoviAcconto={rimuoviAcconto}
          formatDate={formatDate}
          calcolaTotale={calcolaTotale}
          calcolaIncassato={calcolaIncassato}
        />
      )}
    </div>
  );
}

function AccontiModal({ fattura, onClose, aggiungiAcconto, rimuoviAcconto, formatDate, calcolaTotale, calcolaIncassato }) {
  const [importoAcconto, setImportoAcconto] = useState('');
  const [dataIncasso, setDataIncasso] = useState(new Date().toISOString().split('T')[0]);

  const totale = calcolaTotale(fattura.imponibile, fattura.percentuale_iva);
  const incassato = calcolaIncassato(fattura);
  const residuo = totale - incassato;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          💰 Acconti - Fattura {fattura.numero_fattura}
        </h3>

        {/* Riepilogo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-700">Totale Fattura</div>
            <div className="text-xl font-bold">€ {totale.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-700">Incassato</div>
            <div className="text-xl font-bold">€ {incassato.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-sm text-orange-700">Residuo</div>
            <div className="text-xl font-bold">€ {residuo.toFixed(2)}</div>
          </div>
        </div>

        {/* Form Nuovo Acconto */}
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold mb-3">Registra Nuovo Acconto</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Importo (€)</label>
              <input 
                type="number" 
                step="0.01" 
                className="border rounded px-3 py-2 w-full"
                value={importoAcconto}
                onChange={(e) => setImportoAcconto(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Data Incasso</label>
              <input 
                type="date" 
                className="border rounded px-3 py-2 w-full"
                value={dataIncasso}
                onChange={(e) => setDataIncasso(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {
                  if (!importoAcconto || parseFloat(importoAcconto) <= 0) {
                    return alert('⚠️ Inserisci un importo valido');
                  }
                  aggiungiAcconto(fattura.id, importoAcconto, dataIncasso);
                  setImportoAcconto('');
                  setDataIncasso(new Date().toISOString().split('T')[0]);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                ➕ Aggiungi
              </button>
            </div>
          </div>
        </div>

        {/* Lista Acconti */}
        <div>
          <h4 className="font-semibold mb-3">Acconti Registrati</h4>
          {(fattura.acconti || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6 bg-gray-50 rounded">
              Nessun acconto registrato
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Data Incasso</th>
                  <th className="px-3 py-2 text-right">Importo</th>
                  <th className="px-3 py-2 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {fattura.acconti.map(acc => (
                  <tr key={acc.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(acc.dataIncasso)}</td>
                    <td className="px-3 py-2 text-right font-semibold">€ {parseFloat(acc.importo).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => {
                          if (confirm('Eliminare questo acconto?')) {
                            rimuoviAcconto(fattura.id, acc.id);
                          }
                        }} 
                        className="text-red-600"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ✓ Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default FattureEmesse;