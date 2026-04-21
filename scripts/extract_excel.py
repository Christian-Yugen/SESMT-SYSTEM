#!/usr/bin/env python3
"""
extract_excel.py

Lê um arquivo .xlsx e exporta cada planilha para CSV e opcionalmente um JSON combinado.
Uso:
  python scripts/extract_excel.py dados/janAmar26.xlsx --out-dir dados/out --json

Dependências: pandas, openpyxl
Instalar: pip install pandas openpyxl
"""

import argparse
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Extrai .xlsx para CSV/JSON")
    parser.add_argument("input", help="Caminho para o arquivo .xlsx")
    parser.add_argument("--out-dir", default="dados/out", help="Diretório de saída")
    parser.add_argument("--json", action="store_true", help="Gerar JSON combinado")
    parser.add_argument("--rows", type=int, default=10, help="Número de linhas de preview a imprimir")
    args = parser.parse_args()

    try:
        import pandas as pd
    except Exception as e:
        print("ERROR: biblioteca 'pandas' não encontrada. Instale com: pip install pandas openpyxl")
        print("DETAIL:", e)
        sys.exit(2)

    infile = args.input
    outdir = args.out_dir
    os.makedirs(outdir, exist_ok=True)

    print(f"Lendo '{infile}' ...")
    try:
        xls = pd.read_excel(infile, sheet_name=None, engine="openpyxl")
    except Exception as e:
        print("ERROR ao ler o Excel:", e)
        sys.exit(3)

    sheets = list(xls.keys())
    print("Planilhas encontradas:", sheets)

    for name, df in xls.items():
        safe_name = "".join(c if (c.isalnum() or c in (' ', '-', '_')) else '_' for c in name).strip()
        base = os.path.splitext(os.path.basename(infile))[0]
        csv_path = os.path.join(outdir, f"{base}__{safe_name}.csv")
        try:
            df.to_csv(csv_path, index=False, encoding='utf-8-sig')
            print(f"Escreveu CSV: {csv_path} ({len(df)} linhas, {len(df.columns)} colunas)")
        except Exception as e:
            print(f"Falha ao escrever CSV para planilha '{name}':", e)

    if args.json:
        try:
            import json
            # Converter valores não serializáveis (ex: Timestamps) usando default=str
            combined = {name: df.where(pd.notnull(df), None).to_dict(orient='records') for name, df in xls.items()}
            json_path = os.path.join(outdir, f"{base}.json")
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(combined, f, ensure_ascii=False, indent=2, default=str)
            print("Escreveu JSON combinado:", json_path)
        except Exception as e:
            print("Falha ao gerar JSON combinado:", e)

    # Preview da primeira planilha
    if sheets:
        first_name = sheets[0]
        df = xls[first_name]
        print(f"\nPreview (primeira planilha: '{first_name}') - {min(len(df), args.rows)} linhas:")
        try:
            print(df.head(args.rows).to_string(index=False))
        except Exception:
            # Fallback simples
            print(df.head(args.rows).to_csv(index=False))


if __name__ == '__main__':
    main()
