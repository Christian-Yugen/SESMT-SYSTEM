
import json

def generate_sql():
    with open('abono_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    with open('seed_abono.sql', 'w', encoding='utf-8') as f:
        f.write("INSERT INTO abono_salarial (cpf, nome, portaria, assomasul_data, inicio, quant)\nVALUES\n")
        
        values = []
        for r in data:
            nome = r['nome'].replace("'", "''")
            
            p_val = r.get('portaria')
            if p_val and p_val != 'None' and p_val != '0':
                p_safe = p_val.replace("'", "''")
                portaria = f"'{p_safe}'"
            else:
                portaria = "NULL"
            
            assomasul = f"'{r['assomasul_data']}'" if r.get('assomasul_data') and r['assomasul_data'] != 'None' else "NULL"
            inicio = f"'{r['inicio']}'" if r.get('inicio') and r['inicio'] != 'None' else "NULL"
            
            values.append(f"('{r['cpf']}', '{nome}', {portaria}, {assomasul}, {inicio}, {r['quant']})")
        
        f.write(",\n".join(values) + ";")
    print("seed_abono.sql generated successfully with 175 records.")

if __name__ == "__main__":
    generate_sql()
