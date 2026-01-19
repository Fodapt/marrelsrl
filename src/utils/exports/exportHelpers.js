// src/utils/exports/exportHelpers.js

/**
 * ================================================================
 * EXPORT HELPERS - Funzioni comuni per tutti gli export PDF/HTML
 * ================================================================
 */

// ============================================
// FORMATTAZIONE
// ============================================

/**
 * Formatta una data in formato italiano
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

/**
 * Formatta una data con ora in formato italiano
 */
export const formatDateTime = (date = new Date()) => {
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatta un importo in euro
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return `€ ${parseFloat(amount).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// ============================================
// CSS COMUNI
// ============================================

/**
 * CSS base comune per tutti gli export
 */
export const getBaseStyles = () => `
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  body {
    font-family: Arial, sans-serif;
    margin: 20px;
    padding: 0;
    color: #1f2937;
    font-size: 11px;
  }
  
  h1 {
    color: #1e40af;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 10px;
    text-align: center;
    margin-bottom: 30px;
    font-size: 24px;
  }
  
  h2 {
    color: #7c3aed;
    margin-top: 30px;
    border-bottom: 2px solid #7c3aed;
    padding-bottom: 5px;
    font-size: 18px;
    page-break-before: always;
  }
  
  h3 {
    color: #1f2937;
    font-size: 16px;
    margin-top: 20px;
    margin-bottom: 15px;
  }
  
  p {
    margin: 5px 0;
    line-height: 1.4;
  }
  
  strong {
    font-weight: 600;
    color: #374151;
  }
  
  @media print {
    .print-button {
      display: none !important;
    }
    
    body {
      margin: 15px;
    }
    
    h2 {
      page-break-before: always;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

/**
 * CSS per pulsante stampa floating
 */
export const getPrintButtonStyles = (color = '#1e40af') => `
  .print-button {
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color};
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    z-index: 1000;
    transition: background 0.3s;
  }
  
  .print-button:hover {
    background: ${color === '#1e40af' ? '#1e3a8a' : '#dc2626'};
  }
`;

/**
 * CSS per tabelle
 */
export const getTableStyles = () => `
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0 30px 0;
    background: white !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  th {
    background: #3b82f6 !important;
    color: white !important;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    border: 1px solid #2563eb;
  }
  
  td {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    font-size: 11px;
  }
  
  tr:nth-child(even) {
    background-color: #f9fafb !important;
  }
  
  tr:hover {
    background-color: #f3f4f6 !important;
  }
  
  @media print {
    table {
      page-break-inside: auto;
    }
    
    tr {
      page-break-inside: avoid;
    }
  }
`;

/**
 * CSS per box informativi
 */
export const getInfoBoxStyles = () => `
  .info-box {
    background: #eff6ff !important;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border: 2px solid #3b82f6;
    page-break-inside: avoid;
  }
  
  .warning-box {
    background: #fef3c7 !important;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    border: 2px solid #f59e0b;
    page-break-inside: avoid;
  }
  
  .success-box {
    background: #f0fdf4 !important;
    padding: 20px;
    border-radius: 8px;
    margin-top: 30px;
    border: 2px solid #16a34a;
    page-break-inside: avoid;
  }
  
  .summary-box {
    background: #faf5ff !important;
    padding: 10px;
    border-radius: 5px;
    margin: 10px 0;
    border-left: 4px solid #7c3aed;
  }
`;

/**
 * CSS completo per export
 */
export const getCompleteStyles = (customColor = '#1e40af') => `
  <style>
    ${getBaseStyles()}
    ${getPrintButtonStyles(customColor)}
    ${getTableStyles()}
    ${getInfoBoxStyles()}
  </style>
`;

// ============================================
// COMPONENTI HTML
// ============================================

/**
 * Pulsante stampa standard
 */
export const getPrintButton = (color = '#1e40af', text = '🖨️ Stampa / Salva PDF') => `
  <button class="print-button" onclick="window.print()" style="background: ${color};">
    ${text}
  </button>
`;

/**
 * Header documento standard
 */
export const getDocumentHeader = (title, subtitle = null) => `
  <h1>${title}</h1>
  ${subtitle ? `<p style="text-align: center; color: #6b7280; margin-top: -20px; margin-bottom: 30px;">${subtitle}</p>` : ''}
  <p style="text-align: center; margin-bottom: 30px;"><strong>Data Stampa:</strong> ${formatDateTime()}</p>
`;

/**
 * Footer standard per tutti gli export
 */
export const getStandardFooter = () => {
  return `
    <div style="margin-top: 40px; padding: 20px; background: #f3f4f6 !important; border-top: 2px solid #1e40af; text-align: center; font-size: 9px; color: #6b7280;">
      <p style="margin: 0;"><strong>{profile?.azienda}</strong></p>
      <p style="margin: 5px 0;">Documento generato automaticamente dal sistema - ${formatDateTime()}</p>
    </div>
  `;
};

/**
 * Box riepilogo totali
 */
export const getTotalsBox = (title, items, highlightColor = '#3b82f6') => {
  const itemsHtml = items.map(item => `
    <p style="margin: 8px 0;">
      <strong>${item.label}:</strong> 
      <span style="${item.highlight ? `font-size: 14px; color: ${highlightColor}; font-weight: bold;` : ''}">${item.value}</span>
    </p>
  `).join('');

  return `
    <div style="background: ${highlightColor === '#dc2626' ? '#fee2e2' : '#eff6ff'} !important; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid ${highlightColor}; page-break-inside: avoid;">
      <h3 style="margin-top: 0; color: ${highlightColor}; border: none;">${title}</h3>
      ${itemsHtml}
    </div>
  `;
};

// ============================================
// UTILITY
// ============================================

/**
 * Apre una finestra di preview con HTML
 */
export const openPrintWindow = (htmlContent, title = 'Report') => {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.document.title = title;
  } else {
    alert('⚠️ Popup bloccato! Abilita i popup per visualizzare il report.');
  }
};

/**
 * Genera HTML completo per export
 */
export const generateCompleteHTML = (config) => {
  const {
    title,
    subtitle,
    customColor = '#1e40af',
    customStyles = '',
    content,
    buttonText
  } = config;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${getCompleteStyles(customColor)}
  ${customStyles ? `<style>${customStyles}</style>` : ''}
</head>
<body>
  ${getPrintButton(customColor, buttonText)}
  ${getDocumentHeader(title, subtitle)}
  ${content}
  ${getStandardFooter()}
</body>
</html>
  `;
};