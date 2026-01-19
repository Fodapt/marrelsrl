// src/components/Gare.jsx
import { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { exportGaraPDF } from '../utils/exports/exportGaraPDF';


function Gare({ setActiveTab }) {
  const { 
    gare, 
    categorieQualificate,
    clienti, 
    polizze,
    cantieri,
    ati,
    addRecord, 
    updateRecord, 
    deleteRecord,
    loading 
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [categorieSelezionate, setCategorieSelezionate] = useState([]);
  const [mostraCategorie, setMostraCategorie] = useState(false);
  
  // Filtri
const [filtroStato, setFiltroStato] = useState('');
const [filtroCliente, setFiltroCliente] = useState('');
const [filtroQualifiche, setFiltroQualifiche] = useState('tutte'); // 'tutte' | 'qualificato' | 'ati' | 'non_qualificato'

  // Form data
  const [formData, setFormData] = useState({
    codice_gara: '',
    cig: '',
    cup: '',
    titolo: '',
    cliente_id: '',
    importo_appalto: '',
    oneri_sicurezza: '',
    scadenza_presentazione: '',
    data_presentazione: '',
    stato: 'in_preparazione',
    categorie_richieste: '',
    ribasso_offerto: '',
    importo_offerto: '',
    data_aggiudicazione: '',
    polizza_provvisoria_id: '',
    modalita_partecipazione: 'singola',  
    ati_id: '',
    modalita_partecipazione: 'singola',  
    ati_id: '',
    note: ''
  });

  // Stati gara
  const statiGara = [
    { value: 'interessato', label: '👀 Interessato', color: 'bg-blue-50 text-blue-600' },
    { value: 'in_preparazione', label: '📝 In Preparazione', color: 'bg-gray-100 text-gray-700' },
    { value: 'presentata', label: '📤 Presentata', color: 'bg-blue-100 text-blue-700' },
    { value: 'in_valutazione', label: '⏳ In Valutazione', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'vinta', label: '✅ Vinta', color: 'bg-green-100 text-green-700' },
    { value: 'persa', label: '❌ Persa', color: 'bg-red-100 text-red-700' },
    { value: 'rinunciata', label: '⚠️ Rinunciata', color: 'bg-orange-100 text-orange-700' }
  ];

  // Categorie SOA complete
  const categorieSOA = [
    // Opere Generali (OG)
    { id: 'OG1', label: 'OG1 - Edifici civili e industriali', tipo: 'OG' },
    { id: 'OG2', label: 'OG2 - Restauro e manutenzione dei beni immobili', tipo: 'OG' },
    { id: 'OG3', label: 'OG3 - Strade, autostrade, ponti, viadotti', tipo: 'OG' },
    { id: 'OG4', label: 'OG4 - Opere d\'arte nel sottosuolo', tipo: 'OG' },
    { id: 'OG5', label: 'OG5 - Dighe', tipo: 'OG' },
    { id: 'OG6', label: 'OG6 - Acquedotti, gasdotti, oleodotti, opere di irrigazione', tipo: 'OG' },
    { id: 'OG7', label: 'OG7 - Opere marittime e lavori di dragaggio', tipo: 'OG' },
    { id: 'OG8', label: 'OG8 - Opere fluviali, di difesa, di sistemazione idraulica', tipo: 'OG' },
    { id: 'OG9', label: 'OG9 - Impianti per la produzione di energia elettrica', tipo: 'OG' },
    { id: 'OG10', label: 'OG10 - Impianti per la trasformazione alta/media tensione', tipo: 'OG' },
    { id: 'OG11', label: 'OG11 - Impianti tecnologici', tipo: 'OG' },
    { id: 'OG12', label: 'OG12 - Opere ed impianti di bonifica e protezione ambientale', tipo: 'OG' },
    { id: 'OG13', label: 'OG13 - Opere di ingegneria naturalistica', tipo: 'OG' },
    // Opere Specializzate (OS) - Principali
    { id: 'OS1', label: 'OS1 - Lavori in terra', tipo: 'OS' },
    { id: 'OS2-A', label: 'OS2-A - Superfici decorate di beni immobili del patrimonio culturale', tipo: 'OS' },
    { id: 'OS2-B', label: 'OS2-B - Beni culturali mobili di interesse archivistico e librario', tipo: 'OS' },
    { id: 'OS3', label: 'OS3 - Impianti idrico-sanitario, cucine, lavanderie', tipo: 'OS' },
    { id: 'OS4', label: 'OS4 - Impianti elettromeccanici trasportatori', tipo: 'OS' },
    { id: 'OS5', label: 'OS5 - Impianti pneumatici e antintrusione', tipo: 'OS' },
    { id: 'OS6', label: 'OS6 - Finiture di opere generali in materiali lignei, plastici, metallici', tipo: 'OS' },
    { id: 'OS7', label: 'OS7 - Finiture di opere generali di natura edile e tecnica', tipo: 'OS' },
    { id: 'OS8', label: 'OS8 - Opere di impermeabilizzazione', tipo: 'OS' },
    { id: 'OS9', label: 'OS9 - Impianti per la segnaletica luminosa e la sicurezza del traffico', tipo: 'OS' },
    { id: 'OS10', label: 'OS10 - Segnaletica stradale non luminosa', tipo: 'OS' },
    { id: 'OS11', label: 'OS11 - Armamento ferroviario', tipo: 'OS' },
    { id: 'OS12-A', label: 'OS12-A - Barriere stradali di sicurezza', tipo: 'OS' },
    { id: 'OS12-B', label: 'OS12-B - Barriere paramassi, fermaneve e simili', tipo: 'OS' },
    { id: 'OS13', label: 'OS13 - Strutture prefabbricate in cemento armato', tipo: 'OS' },
    { id: 'OS14', label: 'OS14 - Impianti di smaltimento e recupero rifiuti', tipo: 'OS' },
    { id: 'OS15', label: 'OS15 - Pulizia di acque marine, lacustri, fluviali', tipo: 'OS' },
    { id: 'OS16', label: 'OS16 - Impianti per centrali produzione energia elettrica', tipo: 'OS' },
    { id: 'OS17', label: 'OS17 - Linee telefoniche ed impianti di telefonia', tipo: 'OS' },
    { id: 'OS18-A', label: 'OS18-A - Componenti strutturali in acciaio', tipo: 'OS' },
    { id: 'OS18-B', label: 'OS18-B - Componenti per facciate continue', tipo: 'OS' },
    { id: 'OS19', label: 'OS19 - Impianti di reti di telecomunicazione e di trasmissioni', tipo: 'OS' },
    { id: 'OS20-A', label: 'OS20-A - Rilevamenti topografici', tipo: 'OS' },
    { id: 'OS20-B', label: 'OS20-B - Indagini geognostiche', tipo: 'OS' },
    { id: 'OS21', label: 'OS21 - Opere strutturali speciali', tipo: 'OS' },
    { id: 'OS22', label: 'OS22 - Impianti di potabilizzazione e depurazione', tipo: 'OS' },
    { id: 'OS23', label: 'OS23 - Demolizione di opere', tipo: 'OS' },
    { id: 'OS24', label: 'OS24 - Verde e arredo urbano', tipo: 'OS' },
    { id: 'OS25', label: 'OS25 - Scavi archeologici', tipo: 'OS' },
    { id: 'OS26', label: 'OS26 - Pavimentazioni e sovrastrutture speciali', tipo: 'OS' },
    { id: 'OS27', label: 'OS27 - Impianti per la trazione elettrica', tipo: 'OS' },
    { id: 'OS28', label: 'OS28 - Impianti termici e di condizionamento', tipo: 'OS' },
    { id: 'OS29', label: 'OS29 - Armamento di binari ferroviari', tipo: 'OS' },
    { id: 'OS30', label: 'OS30 - Impianti interni elettrici, telefonici, radiotelefonici', tipo: 'OS' },
    { id: 'OS31', label: 'OS31 - Impianti per la mobilità sospesa', tipo: 'OS' },
    { id: 'OS32', label: 'OS32 - Strutture in legno', tipo: 'OS' },
    { id: 'OS33', label: 'OS33 - Coperture speciali', tipo: 'OS' },
    { id: 'OS34', label: 'OS34 - Sistemi antirumore per infrastrutture di mobilità', tipo: 'OS' },
    { id: 'OS35', label: 'OS35 - Interventi a basso impatto ambientale', tipo: 'OS' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatCurrency = (value) => {
    if (!value) return '€ 0,00';
    return `€ ${parseFloat(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatoInfo = (stato) => {
    return statiGara.find(s => s.value === stato) || statiGara[0];
  };

  // Calcola giorni alla scadenza
  const calcolaGiorniScadenza = (dataScadenza) => {
    if (!dataScadenza) return null;
    const oggi = new Date();
    const scadenza = new Date(dataScadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return giorni;
  };

  const getClasseScadenza = (giorni) => {
    if (giorni === null) return '';
    if (giorni < 0) return 'bg-red-100 text-red-700';
    if (giorni <= 7) return 'bg-orange-100 text-orange-700';
    if (giorni <= 14) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  // Verifica qualifiche per una gara (considera anche ATI)
const verificaQualifiche = (gara) => {
  if (!gara.categorie_richieste) {
    return {
      stato: 'non_specificato',
      label: '❓ Categorie non specificate',
      color: 'bg-gray-100 text-gray-700',
      dettagli: [],
      puoPartecipare: false,
      messaggi: ['Categorie SOA non specificate nella gara']
    };
  }

  const categorieRichieste = gara.categorie_richieste.split(',').map(c => c.trim());
  const dettagli = [];
  let tutteOK = true;
  let serveATI = false;
  const messaggi = [];

  // 🤝 Se la gara è in ATI, verifica le qualifiche dell'ATI
  if (gara.ati_id) {
    const atiGara = ati.find(a => a.id === gara.ati_id);
    
    if (atiGara && atiGara.qualifiche) {
      categorieRichieste.forEach(catRichiesta => {
        const qualificaATI = atiGara.qualifiche.find(q => q.categoria === catRichiesta);
        
        if (!qualificaATI) {
          tutteOK = false;
          dettagli.push({
            categoria: catRichiesta,
            stato: 'mancante',
            icon: '❌',
            messaggio: `ATI non possiede ${catRichiesta}`
          });
          messaggi.push(`❌ Mancante: ${catRichiesta}`);
        } else {
          const importoGara = parseFloat(gara.importo_offerto || gara.importo_appalto || 0);
          const importoQualificato = parseFloat(qualificaATI.importo_qualificato);

          if (importoQualificato === 999999999 || importoQualificato >= importoGara) {
            dettagli.push({
              categoria: catRichiesta,
              stato: 'ok',
              icon: '✅',
              messaggio: `${catRichiesta} - ATI qualificata (€${importoQualificato.toLocaleString('it-IT')})`
            });
          } else {
            tutteOK = false;
            dettagli.push({
              categoria: catRichiesta,
              stato: 'mancante',
              icon: '❌',
              messaggio: `${catRichiesta} - ATI insufficiente (€${importoQualificato.toLocaleString('it-IT')} < €${importoGara.toLocaleString('it-IT')})`
            });
            messaggi.push(`❌ ${catRichiesta}: importo ATI insufficiente`);
          }
        }
      });

      if (tutteOK) {
        return {
          stato: 'qualificato',
          label: '✅ Qualificato (ATI)',
          color: 'bg-green-100 text-green-800',
          dettagli,
          puoPartecipare: true,
          messaggi: [`Puoi partecipare in ATI: ${atiGara.nome}`]
        };
      } else {
        return {
          stato: 'non_qualificato',
          label: '❌ ATI non qualificata',
          color: 'bg-red-100 text-red-800',
          dettagli,
          puoPartecipare: false,
          messaggi
        };
      }
    }
  }

  // 👤 Verifica qualifiche singole (codice esistente)
  categorieRichieste.forEach(catRichiesta => {
    const qualificaPosseduta = (categorieQualificate || []).find(
      q => q.categoria === catRichiesta
    );

    if (!qualificaPosseduta) {
      tutteOK = false;
      dettagli.push({
        categoria: catRichiesta,
        stato: 'mancante',
        icon: '❌',
        messaggio: `Non possiedi ${catRichiesta}`
      });
      messaggi.push(`❌ Mancante: ${catRichiesta}`);
    } else {
      const importoGara = parseFloat(gara.importo_offerto || gara.importo_appalto || 0);
      const importoQualificato = parseFloat(qualificaPosseduta.importo_qualificato);

      if (importoQualificato === 999999999 || importoQualificato >= importoGara) {
        dettagli.push({
          categoria: catRichiesta,
          stato: 'ok',
          icon: '✅',
          messaggio: `${catRichiesta} - Classifica ${qualificaPosseduta.classifica} (€${importoQualificato.toLocaleString('it-IT')})`
        });
      } else {
        serveATI = true;
        dettagli.push({
          categoria: catRichiesta,
          stato: 'ati',
          icon: '⚠️',
          messaggio: `${catRichiesta} - Classifica ${qualificaPosseduta.classifica} insufficiente (hai €${importoQualificato.toLocaleString('it-IT')}, servono €${importoGara.toLocaleString('it-IT')})`
        });
        messaggi.push(`⚠️ ${catRichiesta}: importo insufficiente, serve ATI`);
      }
    }
  });

  if (tutteOK && !serveATI) {
    return {
      stato: 'qualificato',
      label: '✅ Qualificato',
      color: 'bg-green-100 text-green-800',
      dettagli,
      puoPartecipare: true,
      messaggi: ['Puoi partecipare alla gara in forma singola']
    };
  } else if (!tutteOK) {
    return {
      stato: 'non_qualificato',
      label: '❌ Non qualificato',
      color: 'bg-red-100 text-red-800',
      dettagli,
      puoPartecipare: false,
      messaggi
    };
  } else {
    return {
      stato: 'ati',
      label: '⚠️ Serve ATI',
      color: 'bg-orange-100 text-orange-800',
      dettagli,
      puoPartecipare: true,
      messaggi: [...messaggi, '💡 Puoi partecipare in ATI (Associazione Temporanea Imprese)']
    };
  }
};
// Crea cantiere da gara vinta
const creaCantiereDaGara = async (gara) => {
  // Verifica che non esista già un cantiere collegato
  const esistente = cantieri.find(c => c.gara_id === gara.id);
  if (esistente) {
    alert(`⚠️ Esiste già un cantiere collegato a questa gara:\n${esistente.nome}`);
    return;
  }

  if (!confirm(`🏗️ Creare un nuovo cantiere dalla gara vinta?\n\n${gara.codice_gara} - ${gara.titolo}`)) {
    return;
  }

  const nuovoCantiere = {
    nome: `${gara.codice_gara} - ${gara.titolo.substring(0, 80)}`,
    cliente_id: gara.cliente_id,
    indirizzo: '',
    comune: '',
    importo_contratto: gara.importo_offerto || gara.importo_appalto,
    data_inizio: gara.data_aggiudicazione || null,
    data_fine_prevista: null,
    stato: 'pianificato',
    gara_id: gara.id,
    cig: gara.cig || null,
    cup: gara.cup || null,
    note: `Cantiere creato automaticamente dalla gara ${gara.codice_gara}\nCIG: ${gara.cig || 'N/D'}\nAggiudicato il ${formatDate(gara.data_aggiudicazione)}`
  };

  const result = await addRecord('cantieri', nuovoCantiere);
  
  if (result.success) {
    const apri = confirm('✅ Cantiere creato con successo!\n\nVuoi aprire la sezione Cantieri?');
    if (apri) {
      setActiveTab('cantieri');
    }
  } else {
    alert('❌ Errore nella creazione del cantiere: ' + result.error);
  }
};

  // Trova cantiere collegato a una gara
  const trovaCantiereCollegato = (garaId) => {
    return cantieri.find(c => c.gara_id === garaId);
  };


  // Calcolo automatico importo aggiudicato
  useEffect(() => {
    const importo = parseFloat(formData.importo_appalto) || 0;
    const oneri = parseFloat(formData.oneri_sicurezza) || 0;
    const ribasso = parseFloat(formData.ribasso_offerto) || 0;

    if (importo > 0 && ribasso > 0) {
      // Base lavorazioni = Importo - Oneri
      const baseLavorazioni = importo - oneri;
      // Ribasso in euro = Base × (Ribasso% / 100)
      const ribassoEuro = baseLavorazioni * (ribasso / 100);
      // Importo ribassato = Base - Ribasso
      const importoRibassato = baseLavorazioni - ribassoEuro;
      // Totale = Importo ribassato + Oneri
      const totale = importoRibassato + oneri;

      setFormData(prev => ({
        ...prev,
        importo_offerto: totale.toFixed(2)
      }));
    } else if (importo > 0 && ribasso === 0) {
      // Se non c'è ribasso, importo offerto = importo appalto
      setFormData(prev => ({
        ...prev,
        importo_offerto: importo.toFixed(2)
      }));
    }
  }, [formData.importo_appalto, formData.oneri_sicurezza, formData.ribasso_offerto]);

  // Filtra gare
const gareFiltrate = useMemo(() => {
  let filtered = [...(gare || [])];

  if (filtroStato) {
    filtered = filtered.filter(g => g.stato === filtroStato);
  }

  if (filtroCliente) {
    filtered = filtered.filter(g => g.cliente_id === filtroCliente);
  }

  // Filtro qualifiche
  if (filtroQualifiche !== 'tutte') {
    filtered = filtered.filter(g => {
      const verifica = verificaQualifiche(g);
      if (filtroQualifiche === 'qualificato' && verifica.stato !== 'qualificato') return false;
      if (filtroQualifiche === 'ati' && verifica.stato !== 'ati') return false;
      if (filtroQualifiche === 'non_qualificato' && verifica.stato !== 'non_qualificato') return false;
      return true;
    });
  }

  return filtered.sort((a, b) => {
      // Prima per stato
      const ordineStato = { 
        'interessato': 0,
        'in_preparazione': 1, 
        'presentata': 2, 
        'in_valutazione': 3, 
        'vinta': 4,
        'aggiudicata': 4,  // Stesso ordine di vinta
        'persa': 5, 
        'rinunciata': 6,
        'annullata': 6  // Stesso ordine di rinunciata
      };
      if (ordineStato[a.stato] !== ordineStato[b.stato]) {
        return ordineStato[a.stato] - ordineStato[b.stato];
      }
      // Poi per data scadenza
      if (a.scadenza_presentazione && b.scadenza_presentazione) {
        return new Date(a.scadenza_presentazione) - new Date(b.scadenza_presentazione);
      }
      return 0;
    });
  }, [gare, filtroStato, filtroCliente, filtroQualifiche, categorieQualificate]);

  // Statistiche
  const statistiche = useMemo(() => {
    const totaleGare = (gare || []).length;
    const interessato = (gare || []).filter(g => g.stato === 'interessato').length;
    const inPreparazione = (gare || []).filter(g => g.stato === 'in_preparazione').length;
    const presentate = (gare || []).filter(g => g.stato === 'presentata' || g.stato === 'in_valutazione').length;
    
    const oggi = new Date();
    const scadenzaImminente = (gare || []).filter(g => {
      if (!['interessato', 'in_preparazione', 'presentata'].includes(g.stato)) return false;
      const giorni = calcolaGiorniScadenza(g.scadenza_presentazione);
      return giorni !== null && giorni >= 0 && giorni <= 7;
    }).length;

    const vinte = (gare || []).filter(g => g.stato === 'vinta' || g.stato === 'aggiudicata').length;
    const importoVinto = (gare || [])
      .filter(g => g.stato === 'vinta' || g.stato === 'aggiudicata')
      .reduce((sum, g) => sum + parseFloat(g.importo_offerto || g.importo_appalto || 0), 0);

    return { totaleGare, interessato, inPreparazione, presentate, scadenzaImminente, vinte, importoVinto };
  }, [gare]);

  // Reset form
  const resetForm = () => {
    setFormData({
      codice_gara: '',
      cig: '',
      cup: '',
      titolo: '',
      cliente_id: '',
      importo_appalto: '',
      oneri_sicurezza: '',
      scadenza_presentazione: '',
      data_presentazione: '',
      stato: 'in_preparazione',
      categorie_richieste: '',
      ribasso_offerto: '',
      importo_offerto: '',
      data_aggiudicazione: '',
      polizza_provvisoria_id: '',
      note: ''
    });
    setCategorieSelezionate([]);
    setMostraCategorie(false);
    setEditingId(null);
    setShowForm(false);
  };

  // Salva gara
  const handleSave = async () => {
    if (!formData.codice_gara || !formData.titolo) {
      return alert('⚠️ Compila i campi obbligatori:\n- Codice Gara\n- Titolo');
    }

    setSaving(true);

    const dataToSave = {
      codice_gara: formData.codice_gara,
      cig: formData.cig || null,
      cup: formData.cup || null,
      titolo: formData.titolo,
      cliente_id: formData.cliente_id || null,
      importo_appalto: formData.importo_appalto ? parseFloat(formData.importo_appalto) : null,
      oneri_sicurezza: formData.oneri_sicurezza ? parseFloat(formData.oneri_sicurezza) : null,
      scadenza_presentazione: formData.scadenza_presentazione || null,
      data_presentazione: formData.data_presentazione || null,
      stato: formData.stato,
      categorie_richieste: categorieSelezionate.length > 0 ? categorieSelezionate.join(', ') : null,
      ribasso_offerto: formData.ribasso_offerto ? parseFloat(formData.ribasso_offerto) : null,
      importo_offerto: formData.importo_offerto ? parseFloat(formData.importo_offerto) : null,
      data_aggiudicazione: formData.data_aggiudicazione || null,
      polizza_provvisoria_id: formData.polizza_provvisoria_id || null,
      modalita_partecipazione: formData.modalita_partecipazione,  
      ati_id: formData.modalita_partecipazione === 'ati' ? (formData.ati_id || null) : null, 
      note: formData.note || null
    };

    let result;
    if (editingId) {
      result = await updateRecord('gare', editingId, dataToSave);
    } else {
      result = await addRecord('gare', dataToSave);
    }

    setSaving(false);

    if (result.success) {
      alert(editingId ? '✅ Gara aggiornata!' : '✅ Gara creata!');
      resetForm();
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Elimina gara
  const handleDelete = async (gara) => {
    if (!confirm(`❌ Eliminare la gara ${gara.codice_gara}?\n\nQuesta azione è irreversibile!`)) {
      return;
    }

    const result = await deleteRecord('gare', gara.id);
    if (result.success) {
      alert('✅ Gara eliminata!');
    } else {
      alert('❌ Errore: ' + result.error);
    }
  };

  // Edit gara
  const handleEdit = (gara) => {
    setFormData({
      codice_gara: gara.codice_gara,
      cig: gara.cig || '',
      cup: gara.cup || '',
      titolo: gara.titolo,
      cliente_id: gara.cliente_id || '',
      importo_appalto: gara.importo_appalto || '',
      oneri_sicurezza: gara.oneri_sicurezza || '',
      scadenza_presentazione: gara.scadenza_presentazione || '',
      data_presentazione: gara.data_presentazione || '',
      stato: gara.stato,
      categorie_richieste: gara.categorie_richieste || '',
      ribasso_offerto: gara.ribasso_offerto || '',
      importo_offerto: gara.importo_offerto || '',
      data_aggiudicazione: gara.data_aggiudicazione || '',
      polizza_provvisoria_id: gara.polizza_provvisoria_id || '',
      modalita_partecipazione: gara.ati_id ? 'ati' : 'singola', 
      ati_id: gara.ati_id || '',     
      note: gara.note || ''
    });
    
    // Carica categorie come array
    if (gara.categorie_richieste) {
      const categorie = gara.categorie_richieste.split(',').map(c => c.trim());
      setCategorieSelezionate(categorie);
    } else {
      setCategorieSelezionate([]);
    }
    
    setEditingId(gara.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle categoria SOA
  const toggleCategoria = (categoriaId) => {
    setCategorieSelezionate(prev => {
      if (prev.includes(categoriaId)) {
        return prev.filter(c => c !== categoriaId);
      } else {
        return [...prev, categoriaId];
      }
    });
  };

  // Conta polizze collegate
  const contaPolizze = (garaId) => {
    return (polizze || []).filter(p => p.gara_id === garaId).length;
  };

  if (loading.critical) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento gare...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-2xl font-bold text-gray-800">📋 Gestione Gare d'Appalto</h2>
    <p className="text-sm text-gray-600 mt-1">
      Gare pubbliche, CIG/CUP, scadenze e aggiudicazioni
    </p>
  </div>
  <button
    onClick={() => setShowForm(!showForm)}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
  >
    {showForm ? '✕ Chiudi' : '+ Nuova Gara'}
  </button>
</div>

        {/* Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Totale Gare</div>
            <div className="text-3xl font-bold text-blue-900">{statistiche.totaleGare}</div>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <div className="text-sm text-cyan-700 mb-1">Interessato</div>
            <div className="text-3xl font-bold text-cyan-900">{statistiche.interessato}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700 mb-1">In Preparazione</div>
            <div className="text-3xl font-bold text-gray-900">{statistiche.inPreparazione}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-700 mb-1">Presentate</div>
            <div className="text-3xl font-bold text-yellow-900">{statistiche.presentate}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Scadenza ≤7gg</div>
            <div className="text-3xl font-bold text-orange-900">{statistiche.scadenzaImminente}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Vinte</div>
            <div className="text-3xl font-bold text-green-900">{statistiche.vinte}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Importo Vinto</div>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(statistiche.importoVinto)}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '✏️ Modifica Gara' : '➕ Nuova Gara'}
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Codice Gara */}
            <div>
              <label className="block text-sm font-medium mb-1">Codice Gara *</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: GARA-2024-001"
                value={formData.codice_gara}
                onChange={(e) => setFormData({...formData, codice_gara: e.target.value})}
              />
            </div>

            {/* CIG */}
            <div>
              <label className="block text-sm font-medium mb-1">CIG</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: 123456789A"
                value={formData.cig}
                onChange={(e) => setFormData({...formData, cig: e.target.value})}
              />
            </div>

            {/* CUP */}
            <div>
              <label className="block text-sm font-medium mb-1">CUP</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: B12C34567890"
                value={formData.cup}
                onChange={(e) => setFormData({...formData, cup: e.target.value})}
              />
            </div>

            {/* Titolo */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Titolo/Oggetto Lavori *</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                rows="2"
                placeholder="Descrizione sintetica dei lavori..."
                value={formData.titolo}
                onChange={(e) => setFormData({...formData, titolo: e.target.value})}
              />
            </div>

            {/* Ente Appaltante */}
            <div>
              <label className="block text-sm font-medium mb-1">Ente Appaltante</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.cliente_id}
                onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
              >
                <option value="">-- Seleziona --</option>
                {clienti.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.ragione_sociale}
                  </option>
                ))}
              </select>
            </div>

            {/* Importo Appalto */}
            <div>
              <label className="block text-sm font-medium mb-1">Importo Appalto</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                placeholder="0.00"
                value={formData.importo_appalto}
                onChange={(e) => setFormData({...formData, importo_appalto: e.target.value})}
              />
            </div>

            {/* Oneri Sicurezza */}
            <div>
              <label className="block text-sm font-medium mb-1">Oneri Sicurezza</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                placeholder="0.00"
                value={formData.oneri_sicurezza}
                onChange={(e) => setFormData({...formData, oneri_sicurezza: e.target.value})}
              />
            </div>

            {/* Scadenza Presentazione */}
            <div>
              <label className="block text-sm font-medium mb-1">Scadenza Presentazione Offerta</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.scadenza_presentazione}
                onChange={(e) => setFormData({...formData, scadenza_presentazione: e.target.value})}
              />
            </div>

            {/* Data Presentazione */}
            <div>
              <label className="block text-sm font-medium mb-1">Data Presentazione Offerta</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={formData.data_presentazione}
                onChange={(e) => setFormData({...formData, data_presentazione: e.target.value})}
              />
            </div>

            {/* Stato */}
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.stato}
                onChange={(e) => setFormData({...formData, stato: e.target.value})}
              >
                {statiGara.map(stato => (
                  <option key={stato.value} value={stato.value}>
                    {stato.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Categorie Richieste */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-2">Categorie SOA Richieste</label>
              
              {/* Badge categorie selezionate */}
              <div className="mb-2 min-h-[40px] p-2 border rounded bg-gray-50">
                {categorieSelezionate.length === 0 ? (
                  <span className="text-gray-400 text-sm">Nessuna categoria selezionata</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categorieSelezionate.map(cat => (
                      <span key={cat} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                        {cat}
                        <button
                          type="button"
                          onClick={() => toggleCategoria(cat)}
                          className="ml-2 text-blue-900 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pulsante per mostrare/nascondere selettore */}
              <button
                type="button"
                onClick={() => setMostraCategorie(!mostraCategorie)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                {mostraCategorie ? '✕ Chiudi Selettore' : '+ Seleziona Categorie'}
              </button>

              {/* Selettore Categorie */}
              {mostraCategorie && (
                <div className="mt-3 p-4 border rounded bg-white max-h-96 overflow-y-auto">
                  {/* Opere Generali */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">🏗️ Opere Generali (OG)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categorieSOA.filter(c => c.tipo === 'OG').map(categoria => (
                        <label key={categoria.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={categorieSelezionate.includes(categoria.id)}
                            onChange={() => toggleCategoria(categoria.id)}
                            className="mt-1"
                          />
                          <span className="text-sm">{categoria.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Opere Specializzate */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">🔧 Opere Specializzate (OS)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categorieSOA.filter(c => c.tipo === 'OS').map(categoria => (
                        <label key={categoria.id} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={categorieSelezionate.includes(categoria.id)}
                            onChange={() => toggleCategoria(categoria.id)}
                            className="mt-1"
                          />
                          <span className="text-sm">{categoria.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ribasso Offerto */}
            <div>
              <label className="block text-sm font-medium mb-1">Ribasso Offerto (%)</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                placeholder="Es: 12.50"
                value={formData.ribasso_offerto}
                onChange={(e) => setFormData({...formData, ribasso_offerto: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Il ribasso che stai calcolando/hai offerto
              </p>
            </div>

            {/* Polizza Provvisoria */}
            <div>
              <label className="block text-sm font-medium mb-1">Polizza Provvisoria</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.polizza_provvisoria_id}
                onChange={(e) => setFormData({...formData, polizza_provvisoria_id: e.target.value})}
              >
                <option value="">-- Nessuna --</option>
                {polizze.filter(p => p.tipo === 'provvisoria').map(polizza => (
                  <option key={polizza.id} value={polizza.id}>
                    {polizza.numero_polizza} - {polizza.compagnia}
                  </option>
                ))}
              </select>
            </div>
            {/* Modalità Partecipazione */}
<div>
  <label className="block text-sm font-medium mb-1">Modalità Partecipazione</label>
  <select
    className="border rounded px-3 py-2 w-full"
    value={formData.modalita_partecipazione}
    onChange={(e) => {
      setFormData({
        ...formData, 
        modalita_partecipazione: e.target.value,
        ati_id: e.target.value === 'singola' ? '' : formData.ati_id
      });
    }}
  >
    <option value="singola">👤 Singola</option>
    <option value="ati">🤝 ATI (Associazione Temporanea Imprese)</option>
  </select>
</div>

{/* ATI (solo se modalità = ATI) */}
{formData.modalita_partecipazione === 'ati' && (
  <div>
    <label className="block text-sm font-medium mb-1">Seleziona ATI</label>
    <select
      className="border rounded px-3 py-2 w-full"
      value={formData.ati_id}
      onChange={(e) => setFormData({...formData, ati_id: e.target.value})}
    >
      <option value="">-- Seleziona ATI --</option>
      {ati.filter(a => a.stato === 'attiva' || a.stato === 'costituenda').map(atiItem => (
        <option key={atiItem.id} value={atiItem.id}>
          {atiItem.codice_ati} - {atiItem.nome}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500 mt-1">
      Solo ATI attive o in costituzione
    </p>
  </div>
)}

            {/* Sezione Aggiudicazione (solo se stato = vinta) */}
            {formData.stato === 'vinta' && (
              <>
                <div className="col-span-3">
                  <hr className="my-4" />
                  <h4 className="font-semibold text-green-700 mb-3">✅ Dati Aggiudicazione</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Data Aggiudicazione</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={formData.data_aggiudicazione}
                    onChange={(e) => setFormData({...formData, data_aggiudicazione: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    💰 Importo Aggiudicato (calcolato automaticamente)
                  </label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 w-full bg-gray-100 font-bold text-green-700"
                    value={formData.importo_offerto ? formatCurrency(formData.importo_offerto) : '€ 0,00'}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formula: (Importo Appalto - Oneri) × (1 - Ribasso%) + Oneri
                  </p>
                </div>
              </>
            )}

            {/* Note */}
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                rows="2"
                placeholder="Note aggiuntive..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : (editingId ? 'Aggiorna' : 'Salva')}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Filtri */}
<div className="bg-white rounded-lg shadow p-4">
  <div className="grid grid-cols-4 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">Stato</label>
      <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
            >
              <option value="">Tutti gli stati</option>
              {statiGara.map(stato => (
                <option key={stato.value} value={stato.value}>{stato.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ente</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="">Tutti gli enti</option>
              {clienti.map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.ragione_sociale}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Qualifiche</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={filtroQualifiche}
              onChange={(e) => setFiltroQualifiche(e.target.value)}
            >
              <option value="tutte">Tutte le gare</option>
              <option value="qualificato">✅ Solo qualificato</option>
              <option value="ati">⚠️ Serve ATI</option>
              <option value="non_qualificato">❌ Non qualificato</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroStato('');
                setFiltroCliente('');
                setFiltroQualifiche('tutte');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 w-full"
            >
              🔄 Reset Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Card Gare */}
      <div className="space-y-4">
        {gareFiltrate.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {filtroStato || filtroCliente || filtroQualifiche !== 'tutte'
              ? 'Nessuna gara trovata con i filtri selezionati'
              : 'Nessuna gara registrata. Clicca "+ Nuova Gara" per iniziare.'}
          </div>
        ) : (
          gareFiltrate.map(gara => {
            const statoInfo = getStatoInfo(gara.stato);
            const ente = clienti.find(c => c.id === gara.cliente_id);
            const giorniScadenza = calcolaGiorniScadenza(gara.scadenza_presentazione);
            const classeScadenza = getClasseScadenza(giorniScadenza);
            const numPolizze = contaPolizze(gara.id);
            const verifica = verificaQualifiche(gara);

            return (
              <div key={gara.id} className="bg-white rounded-lg shadow p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{gara.codice_gara}</h3>
                      <span className={`px-3 py-1 rounded text-sm ${statoInfo.color}`}>
                        {statoInfo.label}
                      </span>
                      {gara.categorie_richieste && (
                        <span className={`px-3 py-1 rounded text-sm font-medium ${verifica.color}`}>
                          {verifica.label}
                        </span>
                      )}
                      {/* ✅ BADGE ATI */}
  {gara.ati_id && (() => {
    const atiGara = ati.find(a => a.id === gara.ati_id);
    return atiGara && (
      <span className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-700 font-medium">
        🤝 ATI: {atiGara.codice_ati}
      </span>
    );
  })()}
                      {(() => {
                        const cantiereCollegato = trovaCantiereCollegato(gara.id);
                        return cantiereCollegato && (
                          <span className="px-3 py-1 rounded text-sm bg-emerald-100 text-emerald-700 font-medium">
                            🏗️ Cantiere: {cantiereCollegato.nome.substring(0, 30)}...
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-gray-700 mb-3">{gara.titolo}</p>
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">CIG:</span>{' '}
                        <span className="font-medium">{gara.cig || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ente:</span>{' '}
                        <span className="font-medium">{ente?.ragione_sociale || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Importo:</span>{' '}
                        <span className="font-medium">{formatCurrency(gara.importo_offerto || gara.importo_appalto)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Scadenza:</span>{' '}
                        <span className="font-medium">{formatDate(gara.scadenza_presentazione)}</span>
                        {giorniScadenza !== null && ['interessato', 'in_preparazione', 'presentata'].includes(gara.stato) && (
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${classeScadenza}`}>
                            {giorniScadenza < 0 
                              ? `⚠️ Scaduta da ${Math.abs(giorniScadenza)}gg`
                              : giorniScadenza <= 7
                                ? `🔥 ${giorniScadenza}gg`
                                : `${giorniScadenza}gg`
                            }
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Ribasso:</span>{' '}
                        {gara.ribasso_offerto ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                            {gara.ribasso_offerto}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
  <button
    onClick={() => exportGaraPDF(
      gara, 
      verificaQualifiche(gara),
      clienti.find(c => c.id === gara.cliente_id),
      polizze,
      categorieQualificate
    )}
    className="text-blue-600 hover:text-blue-800 text-xl"
    title="Esporta PDF"
  >
    📄
  </button>
  {gara.stato === 'vinta' && (
    <button
      onClick={() => creaCantiereDaGara(gara)}
      className="text-green-600 hover:text-green-800 text-xl"
      title="Crea Cantiere"
    >
      🏗️
    </button>
  )}
  <button
    onClick={() => handleEdit(gara)}
    className="text-blue-600 hover:text-blue-800 text-xl"
    title="Modifica"
  >
    ✏️
  </button>
  <button
    onClick={() => handleDelete(gara)}
    className="text-red-600 hover:text-red-800 text-xl"
    title="Elimina"
  >
    🗑️
  </button>
</div>
                </div>

                {/* Verifica Qualifiche */}
                {verifica.dettagli.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold mb-3">📋 Verifica Categorie SOA</h4>
                    <div className="space-y-2">
                      {verifica.dettagli.map((det, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-lg">{det.icon}</span>
                          <span className={
                            det.stato === 'ok' ? 'text-green-700' :
                            det.stato === 'ati' ? 'text-orange-700' :
                            'text-red-700'
                          }>
                            {det.messaggio}
                          </span>
                        </div>
                      ))}
                    </div>
                    {verifica.messaggi.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        {verifica.messaggi.map((msg, idx) => (
                          <p key={idx} className="text-sm text-gray-700 font-medium">{msg}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Gare;