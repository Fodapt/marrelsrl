#!/usr/bin/env python3
"""
JSON to SQL Converter for Marrel S.r.l. Gestionale
Converts JSON data files to SQL INSERT statements for Supabase import
Version 2.0 - With correct column mappings
"""

import json
import sys
from datetime import datetime
from typing import Any, Dict, List
from pathlib import Path


class JSONToSQLConverter:
    """Converts JSON data to SQL INSERT statements with proper column mapping"""
    
    # Mapping delle colonne JSON -> SQL per ogni tabella
    COLUMN_MAPPINGS = {
        'lavoratori': {
            'id': 'id',
            'nome': 'nome',
            'cognome': 'cognome',
            'codiceFiscale': 'codice_fiscale',
            'indirizzo': 'indirizzo',
            'telefono': 'telefono',
            'email': 'email',
            'ibanPrimario': 'iban_primario',
            'ibanSecondario': 'iban_secondario',
            'ruolo': 'ruolo',
            'dataNascita': 'data_nascita',
            'luogoNascita': 'luogo_nascita',
            'nazionalita': 'nazionalita',
            'attivo': 'attivo',
            'note': 'note'
        },
        'cantieri': {
            'id': 'id',
            'nome': 'nome',
            'clienteId': 'cliente_id',
            'clienteNome': 'cliente_nome',
            'indirizzo': 'indirizzo',
            'comune': 'comune',
            'provincia': 'provincia',
            'cap': 'cap',
            'cig': 'cig',
            'cup': 'cup',
            'cassaEdile': 'casse_edile',
            'dataInizio': 'data_inizio',
            'dataFine': 'data_fine',
            'dataFinePrevista': 'data_fine_prevista',
            'importoContratto': 'importo_contratto',
            'importoLavori': 'importo_lavori',
            'codiceCommessa': 'codice_commessa',
            'stato': 'stato',
            'rupNome': 'rup_nome',
            'rupEmail': 'rup_email',
            'rupTelefono': 'rup_telefono',
            'rupCellulare': 'rup_cellulare',
            'rupPec': 'rup_pec',
            'cseNome': 'cse_nome',
            'cseEmail': 'cse_email',
            'cseTelefono': 'cse_telefono',
            'cseCellulare': 'cse_cellulare',
            'csePec': 'cse_pec',
            'dlNome': 'dl_nome',
            'dlEmail': 'dl_email',
            'dlTelefono': 'dl_telefono',
            'dlCellulare': 'dl_cellulare',
            'dlPec': 'dl_pec',
            'collaudatoreNome': 'collaudatore_nome',
            'collaudatoreEmail': 'collaudatore_email',
            'collaudatoreTelefono': 'collaudatore_telefono',
            'collaudatoreCellulare': 'collaudatore_cellulare',
            'dataComunicazioneDNLT': 'data_comunicazione_dnlt',
            'scadenzaDNLT': 'scadenza_dnlt',
            'direttoreLavori': 'direttore_lavori',
            'responsabileSicurezza': 'responsabile_sicurezza',
            'note': 'note',
            'attivo': 'attivo'
        },
        'fornitori': {
            'id': 'id',
            'ragioneSociale': 'ragione_sociale',
            'nome': 'nome',
            'piva': 'partita_iva',
            'codiceFiscale': 'codice_fiscale',
            'indirizzo': 'indirizzo',
            'telefono': 'telefono',
            'email': 'email',
            'pec': 'pec',
            'iban': 'iban',
            'categoria': 'categoria',
            'attivo': 'attivo',
            'note': 'note'
        },
        'subappaltatori': {
            'id': 'id',
            'ragioneSociale': 'ragione_sociale',
            'piva': 'partita_iva',
            'codiceFiscale': 'codice_fiscale',
            'indirizzo': 'indirizzo',
            'telefono': 'telefono',
            'email': 'email',
            'pec': 'pec',
            'iban': 'iban',
            'tipologia': 'tipologia',
            'specializzazione': 'specializzazione',
            'cantieriIds': 'cantieri_ids',
            'attivo': 'attivo',
            'note': 'note'
        },
        'veicoli': {
            'id': 'id',
            'targa': 'targa',
            'tipo': 'tipo',
            'marca': 'marca',
            'modello': 'modello',
            'annoImmatricolazione': 'anno_immatricolazione',
            'anno': 'anno',
            'dataAcquisto': 'data_acquisto',
            'scadenzaAssicurazione': 'scadenza_assicurazione',
            'scadenzaRevisione': 'scadenza_revisione',
            'scadenzaBollo': 'scadenza_bollo',
            'proprietario': 'proprietario',
            'fornitoreNoleggioId': 'fornitore_noleggio_id',
            'stato': 'stato',
            'note': 'note',
            'attivo': 'attivo'
        },
        'unilav': {
            'id': 'id',
            'tipoUnilav': 'tipo_unilav',
            'lavoratoreId': 'lavoratore_id',
            'cantiereId': 'cantiere_id',
            'dataComunicazione': 'data_comunicazione',
            'dataInizio': 'data_inizio',
            'dataFine': 'data_fine',
            'livello': 'livello',
            'tipoContratto': 'tipo_contratto',
            'orario': 'orario',
            'oreSettimanali': 'ore_settimanali',
            'note': 'note'
        },
        'certificazioni': {
            'id': 'id',
            'lavoratoreId': 'lavoratore_id',
            'corsoId': 'corso_id',
            'tipo': 'tipo',
            'nomeCertificazione': 'nome_certificazione',
            'nome': 'nome',
            'numeroAttestato': 'numero_attestato',
            'dataConseguimento': 'data_conseguimento',
            'dataScadenza': 'data_scadenza',
            'enteRilascio': 'ente_rilascio',
            'filePath': 'file_path',
            'note': 'note'
        },
        'sal': {
            'id': 'id',
            'cantiereId': 'cantiere_id',
            'numeroSAL': 'numero_sal',
            'importo': 'importo',
            'percentuale': 'percentuale',
            'stato': 'stato',
            'dataSAL': 'data_sal',
            'dataApprovazione': 'data_approvazione',
            'dataPagamento': 'data_pagamento',
            'note': 'note'
        },
        'fatture_emesse': {
            'id': 'id',
            'numeroFattura': 'numero_fattura',
            'dataEmissione': 'data_emissione',
            'dataScadenza': 'data_scadenza',
            'clienteId': 'cliente_id',
            'cantiereId': 'cantiere_id',
            'contrattoId': 'contratto_id',
            'salId': 'sal_id',
            'oggetto': 'oggetto',
            'imponibile': 'imponibile',
            'iva': 'iva',
            'totale': 'totale',
            'ritenutatoAcconto': 'ritenuta_acconto',
            'nettoAPagare': 'netto_a_pagare',
            'statoPagamento': 'stato_pagamento',
            'dataPagamento': 'data_pagamento',
            'modalitaPagamento': 'modalita_pagamento',
            'note': 'note',
            'filePath': 'file_path'
        },
        'acconti': {
            'id': 'id',
            'tipo': 'tipo',
            'clienteId': 'cliente_id',
            'fornitoreId': 'fornitore_id',
            'subappaltatoreId': 'subappaltatore_id',
            'cantiereId': 'cantiere_id',
            'data': 'data',
            'importo': 'importo',
            'causale': 'causale',
            'fatturaId': 'fattura_id',
            'note': 'note'
        },
        'movimenti_contabili': {
            'id': 'id',
            'tipo': 'tipo',
            'data': 'data',
            'categoria': 'categoria',
            'sottocategoria': 'sottocategoria',
            'importo': 'importo',
            'descrizione': 'descrizione',
            'cantiereId': 'cantiere_id',
            'clienteId': 'cliente_id',
            'fornitoreId': 'fornitore_id',
            'lavoratoreId': 'lavoratore_id',
            'fatturaEmessaId': 'fattura_emessa_id',
            'fatturaRicevutaId': 'fattura_ricevuta_id',
            'modalitaPagamento': 'modalita_pagamento',
            'stato': 'stato',
            'note': 'note'
        },
        'storico_paghe': {
            'id': 'id',
            'lavoratoreId': 'lavoratore_id',
            'mese': 'mese',
            'anno': 'anno',
            'oreLavorate': 'ore_lavorate',
            'oreStraordinario': 'ore_straordinario',
            'importoLordo': 'importo_lordo',
            'importoNetto': 'importo_netto',
            'contributi': 'contributi',
            'ritenute': 'ritenute',
            'dataPagamento': 'data_pagamento',
            'filePath': 'file_path',
            'note': 'note'
        },
        'documenti': {
            'id': 'id',
            'tipo': 'tipo',
            'nome': 'nome',
            'dataEmissione': 'data_emissione',
            'dataScadenza': 'data_scadenza',
            'numeroDocumento': 'numero_documento',
            'enteRilascio': 'ente_rilascio',
            'filePath': 'file_path',
            'note': 'note'
        }
    }
    
    def __init__(self, json_file_path: str):
        self.json_file_path = json_file_path
        self.data = None
        
    def load_json(self) -> Dict:
        """Load JSON data from file"""
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            print(f"✓ JSON file loaded successfully: {self.json_file_path}")
            return self.data
        except FileNotFoundError:
            print(f"✗ Error: File not found - {self.json_file_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"✗ Error: Invalid JSON - {e}")
            sys.exit(1)
    
    def sanitize_value(self, value: Any) -> str:
        """Sanitize values for SQL insertion"""
        if value is None or value == '':
            return 'NULL'
        
        if isinstance(value, bool):
            return 'TRUE' if value else 'FALSE'
        
        if isinstance(value, (int, float)):
            return str(value)
        
        if isinstance(value, list):
            # Convert list to PostgreSQL array format
            if not value:
                return 'NULL'
            sanitized = []
            for v in value:
                if isinstance(v, str):
                    sanitized.append(v.replace("'", "''"))
                else:
                    sanitized.append(str(v))
            array_values = ','.join([f"'{v}'" for v in sanitized])
            return f"ARRAY[{array_values}]"
        
        if isinstance(value, dict):
            # Convert dict to JSONB
            json_str = json.dumps(value, ensure_ascii=False).replace("'", "''")
            return f"'{json_str}'::jsonb"
        
        # String values - escape single quotes
        value = str(value).replace("'", "''")
        return f"'{value}'"
    
    def map_record(self, table_name: str, json_record: Dict) -> Dict:
        """Map JSON record to SQL columns based on table mapping"""
        if table_name not in self.COLUMN_MAPPINGS:
            return json_record
        
        mapping = self.COLUMN_MAPPINGS[table_name]
        sql_record = {}
        
        for json_col, sql_col in mapping.items():
            if json_col in json_record:
                sql_record[sql_col] = json_record[json_col]
        
        # Special handling for veicoli (tipo and marca are swapped in JSON)
        if table_name == 'veicoli':
            sql_record = self.fix_veicoli_fields(sql_record, json_record)
        
        # Handle required fields with defaults if missing
        self.apply_required_field_defaults(table_name, sql_record, json_record)
        
        return sql_record
    
    def fix_veicoli_fields(self, sql_record: Dict, json_record: Dict) -> Dict:
        """Fix veicoli fields where tipo and marca are swapped in JSON"""
        # In JSON: tipo = proprietario (MARREL S.R.L.), marca = tipo veicolo (Autocarro)
        # In SQL: tipo = tipo veicolo, proprietario = proprietario
        
        json_tipo = json_record.get('tipo')  # This is actually proprietario
        json_marca = json_record.get('marca')  # This is actually tipo
        
        # Map marca (which contains tipo) to the correct tipo enum
        tipo_mapping = {
            'autocarro': 'autocarro',
            'auto': 'auto',
            'furgone': 'furgone',
            'camion': 'camion',
            'escavatore': 'escavatore',
            'gru': 'gru',
            'betoniera': 'betoniera',
            'rimorchio': 'rimorchio'
        }
        
        if json_marca:
            marca_lower = json_marca.lower()
            sql_record['tipo'] = tipo_mapping.get(marca_lower, 'altro')
        else:
            sql_record['tipo'] = 'altro'
        
        # Set proprietario from JSON tipo field
        if json_tipo:
            if 'MARREL' in json_tipo.upper():
                sql_record['proprietario'] = 'MARREL S.R.L.'
            elif 'NOLEGGIO' in json_tipo.upper():
                sql_record['proprietario'] = 'noleggio'
            elif 'LEASING' in json_tipo.upper():
                sql_record['proprietario'] = 'leasing'
            else:
                sql_record['proprietario'] = 'azienda'
        
        # Keep original marca as marca (even though it's the tipo in JSON)
        # We'll use modello for the actual vehicle model
        if 'marca' in sql_record:
            del sql_record['marca']  # Remove it since we used it for tipo
        
        return sql_record
    
    def apply_required_field_defaults(self, table_name: str, sql_record: Dict, json_record: Dict):
        """Apply default values for required fields that are missing"""
        required_defaults = {
            'fornitori': {
                'ragione_sociale': lambda r: r.get('nome') or f"Fornitore {r.get('id', 'N/A')}"
            },
            'cantieri': {
                'nome': lambda r: f"Cantiere {r.get('id', 'N/A')}"
            },
            'lavoratori': {
                'nome': lambda r: 'Nome',
                'cognome': lambda r: 'Cognome'
            }
        }
        
        if table_name in required_defaults:
            for field, default_func in required_defaults[table_name].items():
                if field not in sql_record or not sql_record[field]:
                    sql_record[field] = default_func(json_record)
    
    def generate_insert_statement(self, table_name: str, record: Dict) -> str:
        """Generate a single INSERT statement"""
        if not record:
            return ""
        
        # Map columns
        mapped_record = self.map_record(table_name, record)
        
        if not mapped_record:
            return ""
        
        columns = list(mapped_record.keys())
        values = [self.sanitize_value(mapped_record.get(col)) for col in columns]
        
        columns_str = ', '.join(columns)
        values_str = ', '.join(values)
        
        return f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});"
    
    def process_presenze(self, presenze_dict: Dict) -> List[Dict]:
        """Convert presenze from dict format to list of records"""
        records = []
        for key, value in presenze_dict.items():
            # Key format: "lavoratoreId-YYYY-MM-DD"
            parts = key.rsplit('-', 3)  # Split from right to get last 3 parts (YYYY-MM-DD)
            if len(parts) >= 4:
                lavoratore_id = '-'.join(parts[:-3])
                data = '-'.join(parts[-3:])
            else:
                continue
            
            record = {
                'id': key,
                'lavoratore_id': lavoratore_id,
                'data': data,
                'tipo': value.get('tipo'),
                'ore': value.get('ore'),
                'cantiere_id': value.get('cantiere'),
                'note': value.get('note')
            }
            records.append(record)
        
        return records
    
    def process_rateizzi(self, rateizzi_list: List[Dict]) -> tuple:
        """Process rateizzi and extract rate as separate records"""
        rateizzi_records = []
        rate_records = []
        
        for rateizzazione in rateizzi_list:
            # Extract rate
            rate = rateizzazione.get('rate', [])
            
            # Process rateizzazione
            rateizzi_record = {
                'id': rateizzazione.get('id'),
                'nome': rateizzazione.get('nome'),
                'numero_rate': len(rate),
                'importo_totale': rateizzazione.get('importoTotale'),
                'tipo': rateizzazione.get('tipo'),
                'riferimento': rateizzazione.get('riferimento'),
                'note': rateizzazione.get('note')
            }
            rateizzi_records.append(rateizzi_record)
            
            # Process rate
            for rata in rate:
                rate_record = {
                    'id': rata.get('id'),
                    'rateizzazione_id': rateizzazione.get('id'),
                    'numero_rata': rata.get('numeroRata'),
                    'data_scadenza': rata.get('dataScadenza'),
                    'importo': rata.get('importo'),
                    'stato': rata.get('stato'),
                    'data_pagamento': rata.get('dataPagamento') if rata.get('dataPagamento') else None,
                    'note': rata.get('note')
                }
                rate_records.append(rate_record)
        
        return rateizzi_records, rate_records
    
    def generate_inserts_for_table(self, table_name: str, records: List[Dict]) -> List[str]:
        """Generate INSERT statements for all records in a table"""
        if not records:
            return []
        
        statements = []
        statements.append(f"\n-- =====================================================")
        statements.append(f"-- TABLE: {table_name}")
        statements.append(f"-- Records: {len(records)}")
        statements.append(f"-- =====================================================\n")
        
        for record in records:
            stmt = self.generate_insert_statement(table_name, record)
            if stmt:
                statements.append(stmt)
        
        return statements
    
    def convert_all(self) -> str:
        """Convert all JSON data to SQL"""
        if not self.data:
            self.load_json()
        
        all_statements = []
        
        # Header
        all_statements.append("-- =====================================================")
        all_statements.append("-- MARREL S.R.L. - Data Import Script")
        all_statements.append(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        all_statements.append(f"-- Source: {self.json_file_path}")
        all_statements.append("-- =====================================================\n")
        
        all_statements.append("BEGIN;\n")
        
        # Table mapping with order (respect foreign keys)
        table_order = [
            ('lavoratori', 'lavoratori'),
            ('fornitori', 'fornitori'),
            ('subappaltatori', 'subappaltatori'),
            ('cantieri', 'cantieri'),
            ('automezzi', 'veicoli'),  # JSON key -> SQL table name
            ('unilav', 'unilav'),
            ('corsiVisite', 'certificazioni'),
            ('presenze', 'presenze'),  # Special handling
            ('notePresenze', 'note_presenze'),
            ('sal', 'sal'),
            ('fattureEmesse', 'fatture_emesse'),
            ('acconti', 'acconti'),
            ('rateizzi', 'rateizzi'),  # Special handling for nested rate
            ('movimentiContabili', 'movimenti_contabili'),
            ('storicoPaghe', 'storico_paghe'),
            ('documenti', 'documenti')
        ]
        
        # Process each table
        for json_key, table_name in table_order:
            if json_key not in self.data:
                continue
            
            records = self.data[json_key]
            
            # Special handling for presenze (dict -> list)
            if json_key == 'presenze' and isinstance(records, dict):
                records = self.process_presenze(records)
            
            # Special handling for rateizzi (extract nested rate)
            if json_key == 'rateizzi' and isinstance(records, list):
                rateizzi_records, rate_records = self.process_rateizzi(records)
                
                # Insert rateizzi
                statements = self.generate_inserts_for_table('rateizzi', rateizzi_records)
                all_statements.extend(statements)
                all_statements.append("")
                
                # Insert rate
                statements = self.generate_inserts_for_table('rate', rate_records)
                all_statements.extend(statements)
                all_statements.append("")
                continue
            
            if isinstance(records, list) and records:
                statements = self.generate_inserts_for_table(table_name, records)
                all_statements.extend(statements)
                all_statements.append("")
        
        all_statements.append("\nCOMMIT;")
        all_statements.append("\n-- =====================================================")
        all_statements.append("-- Import completed successfully")
        all_statements.append("-- =====================================================")
        
        return '\n'.join(all_statements)
    
    def save_sql_file(self, output_path: str = None):
        """Generate and save SQL file"""
        if output_path is None:
            input_path = Path(self.json_file_path)
            output_path = input_path.parent / f"{input_path.stem}_import.sql"
        
        sql_content = self.convert_all()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"\n✓ SQL file generated successfully: {output_path}")
        
        # Count statements
        insert_count = sql_content.count('INSERT INTO')
        print(f"✓ Total INSERT statements: {insert_count}")
        
        return output_path


def main():
    """Main function"""
    print("=" * 60)
    print("JSON to SQL Converter for Marrel S.r.l. Gestionale")
    print("Version 2.0 - With Column Mappings")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\nUsage: python json_to_sql.py <json_file_path> [output_sql_path]")
        print("\nExample:")
        print("  python json_to_sql.py gestionale-edile-2025-11-14.json")
        print("  python json_to_sql.py data.json import_data.sql")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Convert JSON to SQL
    converter = JSONToSQLConverter(json_file)
    converter.save_sql_file(output_file)
    
    print("\n" + "=" * 60)
    print("Next steps:")
    print("1. Review the generated SQL file")
    print("2. Connect to Supabase SQL Editor")
    print("3. Copy and paste the SQL content")
    print("4. Execute the import script")
    print("=" * 60)


if __name__ == "__main__":
    main()
