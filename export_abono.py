
import pandas as pd
import json

df = pd.read_excel('c:/Users/Usuário/Desktop/SESMT/dados/ABONO RELATORIO 2026 FEV.xlsx')

# Clean column names
df.columns = [c.strip() for c in df.columns]

# Rename to match database
column_mapping = {
    'CPF': 'cpf',
    'NOME': 'nome',
    'PORTARIA': 'portaria',
    'ASSOMASUL Data': 'assomasul_data',
    'INICIO': 'inicio',
    'QUANT': 'quant'
}
df = df.rename(columns=column_mapping)

# Ensure types
df['cpf'] = df['cpf'].astype(str).str.strip()
df['nome'] = df['nome'].astype(str).str.strip()
df['portaria'] = df['portaria'].astype(str).str.strip()

# Convert dates properly
df['assomasul_data'] = pd.to_datetime(df['assomasul_data'], errors='coerce')
df['inicio'] = pd.to_datetime(df['inicio'], errors='coerce')

df['assomasul_data_str'] = df['assomasul_data'].dt.strftime('%Y-%m-%d').where(df['assomasul_data'].notnull(), None)
df['inicio_str'] = df['inicio'].dt.strftime('%Y-%m-%d').where(df['inicio'].notnull(), None)

# Replace original columns with strings
df['assomasul_data'] = df['assomasul_data_str']
df['inicio'] = df['inicio_str']
df = df.drop(columns=['assomasul_data_str', 'inicio_str'])

# quant to int
df['quant'] = pd.to_numeric(df['quant'], errors='coerce').fillna(0).astype(int)

# Export to JSON
# records orientation
data = df.to_dict(orient='records')
with open('c:/Users/Usuário/Desktop/SESMT/web-platform/abono_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(df)} records to abono_data.json")
