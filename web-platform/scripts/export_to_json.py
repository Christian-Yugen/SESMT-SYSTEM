import pandas as pd
import json
import os

# Caminhos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS_DIR = os.path.join(os.path.dirname(BASE_DIR), "dados")
OUTPUT_DIR = os.path.join(BASE_DIR, "src", "data")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def export_servidores():
    print("Exportando servidores...")
    path = os.path.join(DADOS_DIR, "BancoDados16012026.xlsx")
    df = pd.read_excel(path, dtype=str).fillna("")
    # Limpar e formatar
    data = df.to_dict(orient='records')
    with open(os.path.join(OUTPUT_DIR, "servidores.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def export_funcoes():
    print("Exportando funções...")
    path = os.path.join(DADOS_DIR, "GHE.xlsx")
    df = pd.read_excel(path, dtype=str).fillna("")
    data = df.to_dict(orient='records')
    with open(os.path.join(OUTPUT_DIR, "funcoes.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def export_exames():
    print("Exportando exames...")
    # Admissional
    path_adm = os.path.join(DADOS_DIR, "EXAMES ADMISSIONAL.xlsx")
    df_adm = pd.read_excel(path_adm, sheet_name='Exames Admissionais', header=None, dtype=str)
    # Demissional
    path_dem = os.path.join(DADOS_DIR, "EXAMES DEMISSIONAL.xlsx")
    df_dem = pd.read_excel(path_dem, sheet_name='Exames Demissionais', header=None, dtype=str)
    
    def process_exams(df):
        exams_map = {}
        for _, row in df.iterrows():
            ghe = str(row[0]).strip()
            if not ghe or ghe == 'nan': continue
            
            exames = []
            for i in range(1, 12):
                if i < len(row):
                    ex = str(row[i]).strip()
                    if ex and ex != 'nan':
                        exames.append(ex)
            
            riscos = str(row[12]).strip() if 12 < len(row) else ""
            detalhes = str(row[13]).strip() if 13 < len(row) else ""
            
            exams_map[ghe] = {
                "exames": exames,
                "riscos": riscos,
                "detalhes": detalhes
            }
        return exams_map

    data = {
        "admissional": process_exams(df_adm),
        "demissional": process_exams(df_dem)
    }
    
    with open(os.path.join(OUTPUT_DIR, "exames.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    export_servidores()
    export_funcoes()
    export_exames()
    print("Exportação concluída!")
