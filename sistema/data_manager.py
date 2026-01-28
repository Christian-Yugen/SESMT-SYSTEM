import pandas as pd
import os
import sys
import datetime
import openpyxl
from openpyxl.styles import Font
import win32com.client
import win32api
import time

class DataManager:
    def __init__(self, base_path=None):
        # Se base_path não for fornecido, usa o diretório atual ou onde o executável está
        if base_path:
             self.base_path = base_path
        elif getattr(sys, 'frozen', False):
            self.base_path = os.path.dirname(sys.executable)
        else:
            self.base_path = os.path.dirname(os.path.abspath(__file__))

        self.last_error = "" # Store last error for GUI debugging

        self.files = {
            'banco': 'BancoDados16012026.xlsx',
            'ghe': 'GHE.xlsx',
            'adm': 'EXAMES ADMISSIONAL.xlsx',
            'dem': 'EXAMES DEMISSIONAL.xlsx',
            'referral': 'Solicitação de Exames.xlsx'
        }
    
    def _get_path(self, filename):
        # 1. Tentar na subpasta 'dados' (Organização solicitada)
        path_dados = os.path.join(self.base_path, "dados", filename)
        if os.path.exists(path_dados):
            return path_dados

        # 2. Se não achar, tenta subir um nível e procurar em 'dados' (útil se rodar de /sistema)
        parent_dados = os.path.join(os.path.dirname(self.base_path), "dados", filename)
        if os.path.exists(parent_dados):
            return parent_dados

        # 3. Tentar no diretório base
        path1 = os.path.join(self.base_path, filename)
        if os.path.exists(path1):
            return path1
            
        # Retorna o path_dados por padrão para fins de erro
        return path_dados

    def _mask_cpf(self, cpf_str):
        """Aplica máscara 000.000.000-00 em string de números"""
        clean = "".join(filter(str.isdigit, str(cpf_str))).zfill(11)
        if len(clean) == 11:
            return f"{clean[:3]}.{clean[3:6]}.{clean[6:9]}-{clean[9:]}"
        return cpf_str

    def load_employee(self, cpf_input):
        """
        Busca funcionário pelo CPF (com ou sem formatação).
        Retorna uma lista de dicionários com os dados de todos os encontrados.
        """
        try:
            path = self._get_path(self.files['banco'])
            if not os.path.exists(path):
                 self.last_error = f"Arquivo do Banco não encontrado:\n{path}"
                 return []

            df = pd.read_excel(path, dtype=str)

            # Limpar CPF para comparação
            cpf_clean = str(cpf_input).replace('.', '').replace('-', '').strip().zfill(11)

            # Tentar encontrar na coluna 'CPF.' ou 'CPF'
            target_col = None
            if 'CPF.' in df.columns:
                target_col = 'CPF.'
            elif 'CPF' in df.columns:
                target_col = 'CPF'
            
            if not target_col:
                 self.last_error = f"Colunas de CPF não encontradas no arquivo.\nCols: {list(df.columns)}"
                 return []

            # Normalizar coluna alvo para busca
            df['cpf_match'] = df[target_col].astype(str).str.replace(r'\D', '', regex=True).str.zfill(11)
            
            results = df[df['cpf_match'] == cpf_clean]
            
            found_employees = []
            
            for _, row in results.iterrows():
                # Definir CPF para retorno (Priorizar coluna com máscara do Excel)
                if 'CPF com mascara' in df.columns:
                    cpf_display = str(row['CPF com mascara']).strip()
                else:
                    cpf_display = self._mask_cpf(row[target_col])

                # Formatar data de nascimento
                nasc_raw = row.get('Dt.Nascimento', '')
                try:
                    dt = pd.to_datetime(nasc_raw, errors='coerce')
                    nasc = dt.strftime('%d-%m-%Y') if pd.notna(dt) else str(nasc_raw)
                except Exception as e:
                    print(f"Erro ao formatar data: {e}")
                    nasc = str(nasc_raw)

                found_employees.append({
                    'nome': row.get('Nome', ''),
                    'cpf': cpf_display,
                    'nascimento': nasc,
                    'nascimento_raw': pd.to_datetime(nasc_raw, errors='coerce'),
                    'cargo': row.get('Cargo', ''),
                    'matricula': row.get('Matrícula', ''),
                    'secretaria': row.get('Secretaria', '')
                })
                
            return found_employees
            
        except Exception as e:
            self.last_error = f"Erro ao carregar funcionários:\n{e}\nPath: {path}"
            print(f"Erro ao carregar funcionários: {e}")
            return []

    def load_functions(self):
        """
        Carrega a lista de Funções e seus GHEs.
        Retorna uma lista de tuplas ou dicts.
        """
        try:
            path = self._get_path(self.files['ghe'])
            if not os.path.exists(path):
                 self.last_error = f"Arquivo não encontrado:\n{path}"
                 return []
            
            df = pd.read_excel(path, dtype=str)
            
            functions = []
            # Assume colunas 'FUNÇÃO' e 'GHE' (verificado na análise)
            # Adaptação: Verifica se existe 'FUNÇÃO' ou 'Nome'
            col_funcao = 'FUNÇÃO' if 'FUNÇÃO' in df.columns else 'Nome'
            
            if col_funcao in df.columns and 'GHE' in df.columns:
                # Filtrar linhas com GHE válido
                df = df.dropna(subset=['GHE'])
                for _, row in df.iterrows():
                    cod = str(row['Cod']).strip() if 'Cod' in row and pd.notna(row['Cod']) else ""
                    nome_func = str(row[col_funcao]).strip()
                    
                    # Se tiver código, concatena: "COD - NOME"
                    funcao_display = f"{cod} - {nome_func}" if cod else nome_func
                    
                    functions.append({
                        'funcao': funcao_display,
                        'ghe': row['GHE'],
                        'ghe_conj': row.get('GHE CONJ', '')
                    })
            else:
                 self.last_error = f"Colunas esperadas não encontradas. Tem: {list(df.columns)}"
            functions.sort(key=lambda x: str(x['funcao']))
            return functions
        except Exception as e:
            self.last_error = f"Erro Lendo GHE:\n{e}\nPath: {path}"
            print(f"Erro ao ler GHE: {e}")
            return []

    def load_exams(self, ghe_code, aso_type='Admissional'):
        """
        Carrega exames baseados no GHE e tipo de ASO.
        aso_type: 'Admissional', 'Periódico' ou 'Demissional'
        """
        filename = self.files['dem'] if aso_type == 'Demissional' else self.files['adm']
        
        try:
            path = self._get_path(filename)
            xl = pd.ExcelFile(path)
            
            # Tentar achar a aba correta
            target_sheet = None
            if aso_type != 'Demissional':
                 for s in xl.sheet_names:
                     if 'Exames Admissionais' in s:
                         target_sheet = s
                         break
            else: # Demissional
                 for s in xl.sheet_names:
                     if 'Exames Demissionais' in s: # hipotético
                         target_sheet = s
                         break
            
            if not target_sheet:
                target_sheet = xl.sheet_names[1] if len(xl.sheet_names) > 1 else xl.sheet_names[0] # Fallback para 2ª aba (comum ter capa) ou 1ª
            
            # Ler o arquivo. Pular cabeçalho que pode estar deslocado, 
            # mas na análise vimos que a linha com GHE code é dados cru.
            # Vamos ler sem header e procurar o GHE na coluna 0
            df = pd.read_excel(path, sheet_name=target_sheet, header=None, dtype=str)
            
            # Encontrar a linha onde coluna 0 == ghe_code
            row = df[df[0] == str(ghe_code)]
            
            if not row.empty:
                data = row.iloc[0]
                # Coluna 0: GHE
                # Coluna 1 a 11 (Indices 1 a 11): Exames (B a L)
                # Coluna 12 (M): Riscos
                # Coluna 13 (N): Detalhes
                
                exames = []
                if aso_type == 'Periódico':
                    exames = ["Exame Clínico"]
                else:
                    for i in range(1, 12):
                        exame = data[i]
                        if pd.notna(exame) and str(exame).strip().lower() != 'nan':
                            exames.append(str(exame).strip())
                
                riscos = str(data[12]) if pd.notna(data[12]) and str(data[12]).lower() != 'nan' else "Não informado"
                detalhes = str(data[13]) if 13 in data and pd.notna(data[13]) and str(data[13]).lower() != 'nan' else ""
                
                return {
                    'exames': exames,
                    'riscos': riscos,
                    'detalhes': detalhes
                }
            
            return {'exames': [], 'riscos': 'GHE não encontrado', 'detalhes': ''}
            
        except Exception as e:
            print(f"Erro ao ler exames ({aso_type}): {e}")
            return {'exames': [], 'riscos': f'Erro: {e}', 'detalhes': ''}

    def _safe_write(self, ws, coord, value):
        """Escreve em uma célula apenas se ela não for uma MergedCell (read-only)"""
        cell = ws[coord]
        if type(cell).__name__ != 'MergedCell':
            cell.value = value

    def _excel_to_pdf(self, excel_path, pdf_path, print_area="A1:AZ63"):
        """Converte um arquivo Excel para PDF usando Excel COM"""
        excel = None
        try:
            # Necessário usar caminhos absolutos para o Excel COM
            abs_excel = os.path.abspath(excel_path)
            abs_pdf = os.path.abspath(pdf_path)
            
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            
            wb = excel.Workbooks.Open(abs_excel)
            ws = wb.ActiveSheet
            
            # Define a área de impressão
            if print_area:
                ws.PageSetup.PrintArea = print_area
            
            # Configura para caber em 1 página
            ws.PageSetup.Zoom = False
            ws.PageSetup.FitToPagesWide = 1
            ws.PageSetup.FitToPagesTall = 1
            
            # Adiciona rodapé: hora, data e usuário
            # &D = Data, &T = Hora, &P = Página (opcional)
            # Tenta obter o usuário logado de várias formas
            username = os.environ.get('USERNAME') or os.environ.get('USER')
            if not username:
                try:
                    username = win32api.GetUserName()
                except:
                    username = "Usuario"
                
            footer_text = f"Emitido em: &D &T - Usuário: {username}"
            ws.PageSetup.RightFooter = footer_text
            
            # 0 = xlTypePDF
            # Exporta apenas a planilha ativa (ws) respeitando a PrintArea definida
            ws.ExportAsFixedFormat(0, abs_pdf)
            
            wb.Close(False)
            return True
        except Exception as e:
            self.last_error = f"Erro na conversão PDF:\n{e}"
            print(f"Erro PDF: {e}")
            return False
        finally:
            if excel:
                excel.Quit()

    def _print_file(self, file_path, copies=2):
        """Envia o arquivo para a impressora padrão 2 vezes"""
        try:
            abs_path = os.path.abspath(file_path)
            for _ in range(copies):
                win32api.ShellExecute(0, "print", abs_path, None, ".", 0)
                time.sleep(2) # Pequena pausa entre vias
            return True
        except Exception as e:
            self.last_error = f"Erro ao imprimir:\n{e}"
            return False

    def generate_aso(self, employee_data, exams_data, aso_type, exam_dates=None, ghe_conj="-"):
        """
        Preenche o template ASO.xlsx, converte para PDF e imprime 2 vias.
        """
        try:
            template_path = self._get_path('ASO.xlsx')
            if not os.path.exists(template_path):
                self.last_error = f"Template ASO.xlsx não encontrado em:\n{template_path}"
                return None
                
            wb = openpyxl.load_workbook(template_path)
            ws = wb.active
            
            # GHE CONJ (AU1)
            self._safe_write(ws, 'AU1', ghe_conj)
            
            # 1. Dados Básicos do Servidor
            self._safe_write(ws, 'E9', employee_data.get('nome', '').upper())
            
            # Garantir máscara no CPF ao salvar
            raw_cpf = str(employee_data.get('cpf', '')).upper()
            masked_cpf = self._mask_cpf(raw_cpf)
            self._safe_write(ws, 'E10', masked_cpf)
            
            # Data de Nascimento formatada como string para garantir visibilidade (U10)
            nasc_raw = employee_data.get('nascimento_raw')
            if pd.notnull(nasc_raw):
                self._safe_write(ws, 'U10', nasc_raw.strftime('%d/%m/%Y'))
            else:
                self._safe_write(ws, 'U10', employee_data.get('nascimento', ''))
            
            self._safe_write(ws, 'E11', employee_data.get('cargo', '').upper())
            self._safe_write(ws, 'E12', employee_data.get('secretaria', '').upper())
            
            # 3. Tipo de Exame (A6)
            self._safe_write(ws, 'A6', f"Exame {aso_type}")
            
            # 3. Datas de Emissão
            today = datetime.datetime.now()
            today_str = today.strftime('%d/%m/%Y')
            self._safe_write(ws, 'AT2', today_str)
            
            # Data por extenso em Português (AK60)
            months_pt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
            full_date_pt = f"{today.day} de {months_pt[today.month-1]} de {today.year}"
            self._safe_write(ws, 'AK60', full_date_pt)
            
            # 4. Detalhes dos Riscos Ocupacionais (A30)
            detalhes_raw = exams_data.get('detalhes', '')
            self._safe_write(ws, 'A30', detalhes_raw.strip())
            
            # 5. Exames e Datas (Layout de 2 Colunas)
            # Limpar áreas de exames (linhas 36 a 41)
            for r in range(36, 42):
                self._safe_write(ws, f'B{r}', "")
                self._safe_write(ws, f'L{r}', "")
                self._safe_write(ws, f'V{r}', "")
                self._safe_write(ws, f'AF{r}', "")
            
            exames = exams_data.get('exames', [])
            for i, exame in enumerate(exames):
                # Lógica de capitalização personalizada
                exam_upper = exame.upper().strip()
                
                # Casos Específicos
                special_cases = {
                    "HBSAG": "HBsAG",
                    "ANTI-HCV": "Anti-HCV",
                    "ANTI HCV": "Anti-HCV"
                }
                
                # Siglas de 3 letras que devem ser maiúsculas
                acronyms = ["ECG", "EEG", "TGO", "EPF", "TSH", "VDRL"]
                
                if exam_upper in special_cases:
                    exame_final = special_cases[exam_upper]
                elif exam_upper in acronyms or len(exam_upper) == 3:
                    exame_final = exam_upper
                else:
                    # Regra geral: Primeira maiúscula, resto minúscula
                    exame_final = exame.capitalize()
                
                # Determinar data (manual ou hoje)
                exame_date = today_str
                if exam_dates and i < len(exam_dates):
                    if exam_dates[i]: # Só substitui se não estiver vazio
                        exame_date = exam_dates[i]
                
                if i < 6: # Primeira coluna (linhas 36-41)
                    target_row = 36 + i
                    self._safe_write(ws, f'B{target_row}', exame_final)
                    self._safe_write(ws, f'L{target_row}', exame_date)
                elif i < 12: # Segunda coluna (linhas 36-41)
                    target_row = 36 + (i - 6)
                    self._safe_write(ws, f'V{target_row}', exame_final)
                    self._safe_write(ws, f'AF{target_row}', exame_date)
            
            # 6. Salvar Arquivos
            nome_original = employee_data.get('nome', 'Servidor')
            safe_name = "".join([c for c in nome_original if c.isalnum() or c==' ']).strip().replace(' ', '_')
            base_filename = f"ASO_{safe_name}_{today.strftime('%Y%m%d_%H%M%S')}"
            
            # Define o diretório de destino para o PDF (Raiz do projeto)
            aso_folder = os.path.join(self.base_path, "ASO")
            if not os.path.exists(aso_folder):
                os.makedirs(aso_folder)
            
            # Excel temporário continua na pasta do template (dados) para ser convertido
            excel_path = os.path.join(os.path.dirname(template_path), base_filename + ".xlsx")
            pdf_path = os.path.join(aso_folder, base_filename + ".pdf")
            
            # Salva Excel temporário
            wb.save(excel_path)
            
            # Converte para PDF
            if self._excel_to_pdf(excel_path, pdf_path, print_area="A1:AZ63"):
                # Imprime PDF (2 vias)
                self._print_file(pdf_path, copies=2)
                
                # Deleta o Excel temporário para não entulhar
                try:
                    wb.close() # Garante que o openpyxl soltou o arquivo
                    os.remove(excel_path)
                except:
                    pass
                
                return pdf_path
            else:
                return excel_path # Fallback para excel se PDF falhar
            
        except Exception as e:
            self.last_error = f"Erro ao gerar ASO:\n{e}"
            print(f"Erro ao gerar ASO: {e}")
            return None

    def generate_exam_referral(self, employee_data, exams_data, aso_type, exam_dates=None, ghe_conj="-"):
        """
        Preenche o template Solicitação de Exames.xlsx, converte para PDF e imprime 2 vias.
        """
        try:
            template_path = self._get_path(self.files['referral'])
            if not os.path.exists(template_path):
                self.last_error = f"Template Solicitação de Exames.xlsx não encontrado em:\n{template_path}"
                return None
                
            wb = openpyxl.load_workbook(template_path)
            ws = wb.active
            
            # 1. Tipo de Exame (A5)
            self._safe_write(ws, 'A5', f"Exame {aso_type}")
            
            # 2. Dados Básicos do Servidor
            self._safe_write(ws, 'D6', employee_data.get('nome', '').upper())
            
            # CPF (D7)
            raw_cpf = str(employee_data.get('cpf', '')).upper()
            masked_cpf = self._mask_cpf(raw_cpf)
            self._safe_write(ws, 'D7', masked_cpf)
            
            # Data de Nascimento (P7)
            nasc_raw = employee_data.get('nascimento_raw')
            if pd.notnull(nasc_raw):
                self._safe_write(ws, 'P7', nasc_raw.strftime('%d/%m/%Y'))
            else:
                self._safe_write(ws, 'P7', employee_data.get('nascimento', ''))
            
            # Cargo (D8)
            self._safe_write(ws, 'D8', employee_data.get('cargo', '').upper())
            
            # Lotação (Secretaria) (D9)
            self._safe_write(ws, 'D9', employee_data.get('secretaria', '').upper())
            
            # 2. Exames (E13-E18 e O13-O18)
            # Limpar áreas de exames
            for r in range(13, 19):
                self._safe_write(ws, f'E{r}', "")
                self._safe_write(ws, f'O{r}', "")
            
            exames = exams_data.get('exames', [])
            for i, exame in enumerate(exames):
                # Lógica de capitalização (mesma do ASO)
                exam_upper = exame.upper().strip()
                special_cases = {"HBSAG": "HBsAG", "ANTI-HCV": "Anti-HCV", "ANTI HCV": "Anti-HCV"}
                acronyms = ["ECG", "EEG", "TGO", "EPF", "TSH", "VDRL"]
                
                if exam_upper in special_cases:
                    exame_final = special_cases[exam_upper]
                elif exam_upper in acronyms or len(exam_upper) == 3:
                    exame_final = exam_upper
                else:
                    exame_final = exame.capitalize()
                
                if i < 6: # E13 a E18
                    self._safe_write(ws, f'E{13+i}', exame_final)
                elif i < 12: # O13 a O18
                    self._safe_write(ws, f'O{13+(i-6)}', exame_final)
            
            # 3. GHE CONJ (AA24)
            self._safe_write(ws, 'AA24', ghe_conj)

            # 4. Nota sobre testes rápidos (D22)
            # Verifica se ambos HBsAg e Anti-HCV estão na lista de exames
            exames_upper = [ex.upper().strip() for ex in exames]
            has_hbsag = any("HBSAG" in ex for ex in exames_upper)
            has_hcv = any("ANTI-HCV" in ex or "ANTI HCV" in ex or "HCV" in ex for ex in exames_upper)
            
            if has_hbsag and has_hcv:
                note = "O servidor poderá optar pelos testes rápidos de HBsAg e Anti-HCV em substituição aos exames laboratoriais convencionais"
                self._safe_write(ws, 'B22', note)
                ws['B22'].font = Font(size=8)
            
            # 5. Salvar e Processar
            today = datetime.datetime.now()
            nome_original = employee_data.get('nome', 'Servidor')
            safe_name = "".join([c for c in nome_original if c.isalnum() or c==' ']).strip().replace(' ', '_')
            base_filename = f"Encaminhamento_{safe_name}_{today.strftime('%Y%m%d_%H%M%S')}"
            
            aso_folder = os.path.join(self.base_path, "ASO")
            if not os.path.exists(aso_folder):
                os.makedirs(aso_folder)
            
            # Excel temporário continua na pasta do template (dados) para ser convertido
            excel_path = os.path.join(os.path.dirname(template_path), base_filename + ".xlsx")
            pdf_path = os.path.join(aso_folder, base_filename + ".pdf")
            
            wb.save(excel_path)
            
            # Para o encaminhamento, a área de impressão é definida entre A1 e AB25
            if self._excel_to_pdf(excel_path, pdf_path, print_area="A1:AB25"):
                self._print_file(pdf_path, copies=2)
                try:
                    wb.close()
                    os.remove(excel_path)
                except:
                    pass
                return pdf_path
            else:
                return excel_path
                
        except Exception as e:
            self.last_error = f"Erro ao gerar Encaminhamento:\n{e}"
            print(f"Erro ao gerar Encaminhamento: {e}")
            return None

# Teste rápido se rodar direto
if __name__ == "__main__":
    dm = DataManager()
    print("Testando leitura de funções...")
    funcs = dm.load_functions()
    print(f"Encontradas {len(funcs)} funções.")
    if funcs:
        print(f"Exemplo: {funcs[0]}")

