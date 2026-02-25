
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

# Ensure types and handle '0' as NULL
df['cpf'] = df['cpf'].astype(str).str.strip()
df['nome'] = df['nome'].astype(str).str.strip()
df['portaria'] = df['portaria'].astype(str).str.strip().replace('0', None)

# Handle placeholder dates like '0' or '00/01/1900'
# First, convert to numeric to find zeros
for col in ['assomasul_data', 'inicio']:
    # Replace the numeric 0 or string '0' or '00/01/1900' if it appears
    df[col] = df[col].replace(0, pd.NA).replace('0', pd.NA).replace('00/01/1900', pd.NA)
    
    # Convert dates properly
    df[col] = pd.to_datetime(df[col], errors='coerce')
    
    # Filter out extremely old dates that might be placeholders (anything before 1950)
    df.loc[df[col].dt.year < 1950, col] = pd.NA

df['assomasul_data_str'] = df['assomasul_data'].dt.strftime('%Y-%m-%d').where(df['assomasul_data'].notnull(), None)
df['inicio_str'] = df['inicio'].dt.strftime('%Y-%m-%d').where(df['inicio'].notnull(), None)

# Replace original columns with strings
df['assomasul_data'] = df['assomasul_data_str']
df['inicio'] = df['inicio_str']
df = df.drop(columns=['assomasul_data_str', 'inicio_str'])

# quant to int
df['quant'] = pd.to_numeric(df['quant'], errors='coerce').fillna(1).astype(int)

# Export to JSON
# records orientation
data = df.to_dict(orient='records')
with open('c:/Users/Usuário/Desktop/SESMT/web-platform/abono_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(df)} records to abono_data.json")
