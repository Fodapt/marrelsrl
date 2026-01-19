// src/config/appConfig.js
// Configurazione centralizzata dell'applicazione

export const APP_CONFIG = {
  // Nome applicazione e azienda
  appName: "🏗️ Gestionale",
  companyName: "Marrel S.r.l.",
  
  // Versione applicazione
  version: "4.6",
  
  // Informazioni sviluppatore
  developer: "Andri Prydryk",
  
  // Altri parametri configurabili (opzionali)
  logo: null, // Percorso al logo, se disponibile
  primaryColor: "#1e40af", // Colore primario aziendale
  
  // Testi calcolati dinamicamente
  get appFullName() {
    return `${this.appName} ${this.companyName}`;
  },
  
  get copyrightYear() {
    return new Date().getFullYear();
  },
  
  get footerText() {
    return `${this.appFullName} by ${this.developer} © ${this.copyrightYear}`;
  },
  
  get versionText() {
    return `versione ${this.version}`;
  }
};

// Export anche come default per flessibilità
export default APP_CONFIG;