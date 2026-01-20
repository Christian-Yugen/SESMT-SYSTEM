import customtkinter as ctk
from data_manager import DataManager
import threading
import os
from tkinter import messagebox

import datetime

class ExamDateDialog(ctk.CTkToplevel):
    def __init__(self, parent, exams):
        super().__init__(parent)
        self.title("Definir Datas dos Exames")
        self.geometry("1000x600") # Mais larga e mais alta
        self.resizable(False, False)
        
        # Forçar foco e modalidade
        self.transient(parent)
        self.grab_set()
        
        self.result = None
        self.entries = []
        
        # Título
        ctk.CTkLabel(self, text="Informe as datas dos exames (DD/MM/AAAA):", 
                     font=ctk.CTkFont(size=26, weight="bold")).pack(pady=25)
        
        # Frame principal em colunas
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.pack(padx=40, pady=5, fill="both", expand=True)
        
        # Configurar colunas do grid
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_columnconfigure(1, weight=1)
        
        today_str = datetime.datetime.now().strftime("%d/%m/%Y")
        
        for i, exam in enumerate(exams):
            col = i % 2
            row = i // 2
            
            frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
            frame.grid(row=row, column=col, padx=20, pady=10, sticky="ew")
            
            # Limitar nome do exame para não quebrar layout
            exam_display = exam[:35] + "..." if len(exam) > 35 else exam
            
            lbl = ctk.CTkLabel(frame, text=f"{exam_display}:", font=ctk.CTkFont(size=18), anchor="w")
            lbl.pack(side="left", padx=(5, 15))
            
            entry = ctk.CTkEntry(frame, width=130, font=ctk.CTkFont(size=18))
            entry.insert(0, today_str)
            entry.pack(side="right", padx=5)
            self.entries.append(entry)
            
        # Botões
        self.btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.btn_frame.pack(pady=30)
        
        self.confirm_btn = ctk.CTkButton(self.btn_frame, text="Confirmar e Gerar ASO", 
                                        command=self._on_confirm,
                                        font=ctk.CTkFont(size=18, weight="bold"),
                                        width=250, height=45,
                                        fg_color="#27ae60", hover_color="#2ecc71")
        self.confirm_btn.pack(side="left", padx=20)
        
        self.cancel_btn = ctk.CTkButton(self.btn_frame, text="Cancelar", 
                                       command=self._on_cancel,
                                       font=ctk.CTkFont(size=18),
                                       width=150, height=45,
                                       fg_color="#c0392b", hover_color="#e74c3c")
        self.cancel_btn.pack(side="left", padx=20)

    def _on_confirm(self):
        self.result = [entry.get().strip() for entry in self.entries]
        self.destroy()

    def _on_cancel(self):
        self.result = None # Reverted to original behavior as 'selection' was undefined
        self.destroy()

    def get_result(self):
        self.master.wait_window(self)
        return self.result

class ManualEntryDialog(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Inclusão Manual de Servidor")
        self.geometry("500x550")
        self.transient(parent)
        self.grab_set()
        
        self.result = None
        
        # Centralizar
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (self.winfo_width() // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (self.winfo_height() // 2)
        self.geometry(f"+{x}+{y}")
        
        # Campos
        ctk.CTkLabel(self, text="Dados do Novo Servidor", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=20)
        
        self.entries = {}
        fields = [
            ("CPF", "Ex: 000.000.000-00"),
            ("Nome Completo", "Nome do Servidor"),
            ("Data de Nascimento", "dd/mm/aaaa"),
            ("Cargo", "Ex: Agente Administrativo")
        ]
        
        for label, placeholder in fields:
            frame = ctk.CTkFrame(self, fg_color="transparent")
            frame.pack(fill="x", padx=40, pady=5)
            ctk.CTkLabel(frame, text=label).pack(anchor="w")
            entry = ctk.CTkEntry(frame, placeholder_text=placeholder, width=400)
            entry.pack(pady=2)
            self.entries[label] = entry

        # Campo Secretaria como Dropdown
        frame_sec = ctk.CTkFrame(self, fg_color="transparent")
        frame_sec.pack(fill="x", padx=40, pady=5)
        ctk.CTkLabel(frame_sec, text="Secretaria").pack(anchor="w")
        
        secretarias = [
            "GABINETE DO PREFEITO",
            "SECRETARIA MUNICIPAL DE ASSISTENCIA SOCIAL",
            "SECRETARIA MUNICIPAL DE DESENVOLVIMENTO",
            "SECRETARIA MUNICIPAL DE EDUCACAO",
            "SECRETARIA MUNICIPAL DE ESPORTE",
            "SECRETARIA MUNICIPAL DE FINANÇAS",
            "SECRETARIA MUNICIPAL DE GESTAO DE PESSOAS",
            "SECRETARIA MUNICIPAL DE GOVERNO",
            "SECRETARIA MUNICIPAL DE INFRAESTRUTURA",
            "SECRETARIA MUNICIPAL DE MEIO AMBIENTE",
            "SECRETARIA MUNICIPAL DE SAUDE"
        ]
        
        self.sec_var = ctk.StringVar(value=secretarias[0])
        self.sec_menu = ctk.CTkOptionMenu(frame_sec, values=secretarias, variable=self.sec_var, width=400)
        self.sec_menu.pack(pady=2)

        # Botões
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=30)
        
        ctk.CTkButton(btn_frame, text="Confirmar", command=self.confirm, fg_color="#27ae60", hover_color="#2ecc71").pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Cancelar", command=self.destroy, fg_color="gray").pack(side="left", padx=10)

    def confirm(self):
        data = {k: v.get().strip() for k, v in self.entries.items()}
        data["Secretaria"] = self.sec_var.get()

        # Validação básica (nome e cpf principalmente)
        if not data["CPF"] or not data["Nome Completo"]:
            messagebox.showwarning("Aviso", "Por favor, preencha o Nome e CPF.")
            return
            
        self.result = data
        self.destroy()

    def get_result(self):
        self.master.wait_window(self)
        return self.result

class EmployeeSelectionDialog(ctk.CTkToplevel):
    def __init__(self, parent, employees):
        super().__init__(parent)
        self.title("Selecionar Vínculo")
        self.geometry("800x500")
        self.resizable(False, False)
        
        self.transient(parent)
        self.grab_set()
        
        self.selected_employee = None
        
        # Título
        ctk.CTkLabel(self, text="Múltiplos registros encontrados para este CPF.\nSelecione o vínculo correto:", 
                     font=ctk.CTkFont(size=22, weight="bold")).pack(pady=20)
        
        # Container de cartões
        self.scroll_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.scroll_frame.pack(padx=20, pady=10, fill="both", expand=True)
        
        for emp in employees:
            self._create_employee_card(emp)

    def _create_employee_card(self, emp):
        card = ctk.CTkFrame(self.scroll_frame, corner_radius=10, border_width=2, border_color="#3498db")
        card.pack(fill="x", pady=10, padx=10)
        
        info_str = f"Nome: {emp['nome']}\nMatrícula: {emp['matricula']}\nCargo: {emp['cargo']}\nSecretaria: {emp['secretaria']}"
        
        lbl = ctk.CTkLabel(card, text=info_str, font=ctk.CTkFont(size=14), justify="left", anchor="w")
        lbl.pack(side="left", padx=20, pady=15)
        
        btn = ctk.CTkButton(card, text="Selecionar", width=120, height=40,
                            font=ctk.CTkFont(size=14, weight="bold"),
                            command=lambda e=emp: self._select(e))
        btn.pack(side="right", padx=20)

    def _select(self, emp):
        self.selected_employee = emp
        self.destroy()

    def get_result(self):
        self.master.wait_window(self)
        return self.selected_employee

class SESMTApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Powered by UXBRAS - SESMT Três Lagoas - Emissão de ASO (v1.7 Layout)")
        self.geometry("1100x850") # Um pouco maior para caber fontes maiores
        
        # Configurar tema
        ctk.set_appearance_mode("System")
        ctk.set_default_color_theme("blue")
        
        self.dm = DataManager()
        self.employee_data = None
        self.current_exams_data = None
        
        self._setup_ui()
        
        # Carregar funções em thread separada para não travar a UI inicial
        threading.Thread(target=self._load_functions_async, daemon=True).start()

    def _setup_ui(self):
        # --- Layout Principal ---
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # --- Header ---
        self.header_frame = ctk.CTkFrame(self)
        self.header_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        
        self.logo_label = ctk.CTkLabel(self.header_frame, text="SESMT Três Lagoas - Saúde Ocupacional", font=ctk.CTkFont(size=28, weight="bold"))
        self.logo_label.pack(side="left", padx=20, pady=10)
        
        # Seletor de Tema
        self.appearance_mode_label = ctk.CTkLabel(self.header_frame, text="Tema:", font=ctk.CTkFont(size=14))
        self.appearance_mode_label.pack(side="left", padx=(20, 5))
        
        self.appearance_mode_optionemenu = ctk.CTkSegmentedButton(self.header_frame, 
                                                                  values=["Modo Claro", "Modo Escuro"],
                                                                  command=self._change_appearance_mode)
        self.appearance_mode_optionemenu.pack(side="left", padx=10)
        self.appearance_mode_optionemenu.set("Modo Claro" if ctk.get_appearance_mode() == "Light" else "Modo Escuro")
        
        # --- Conteúdo Central (Sem rolagem global) ---
        self.main_container = ctk.CTkFrame(self)
        self.main_container.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        
        # 1. Busca CPF (Sempre no topo)
        self.search_frame = ctk.CTkFrame(self.main_container)
        self.search_frame.pack(fill="x", pady=(0, 10), padx=10)
        
        self.search_label = ctk.CTkLabel(self.search_frame, text="Buscar Servidor", font=ctk.CTkFont(size=20, weight="bold"))
        self.search_label.pack(anchor="w", padx=10, pady=(10, 0))
        
        self.cpf_entry = ctk.CTkEntry(self.search_frame, placeholder_text="Digite o CPF", width=300, font=ctk.CTkFont(size=16))
        self.cpf_entry.pack(side="left", padx=10, pady=10)
        
        self.search_btn = ctk.CTkButton(self.search_frame, text="Buscar", command=self.search_employee, font=ctk.CTkFont(size=16, weight="bold"))
        self.search_btn.pack(side="left", padx=10, pady=10)
        
        self.manual_btn = ctk.CTkButton(self.search_frame, text="Inclusão Manual", command=self.open_manual_entry, 
                                        font=ctk.CTkFont(size=16), fg_color="#3498db", hover_color="#2980b9")
        self.manual_btn.pack(side="left", padx=10, pady=10)
        
        # --- Layout de Duas Colunas ---
        self.columns_frame = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.columns_frame.pack(fill="both", expand=True, padx=5)
        
        self.left_column = ctk.CTkFrame(self.columns_frame, fg_color="transparent")
        self.left_column.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        self.right_column = ctk.CTkFrame(self.columns_frame, fg_color="transparent")
        self.right_column.pack(side="left", fill="both", expand=True, padx=(5, 0))

        # 2. Dados do Servidor (Coluna Esquerda)
        self.info_frame = ctk.CTkFrame(self.left_column)
        self.info_frame.pack(fill="x", pady=(0, 10), padx=5)
        
        self.info_title = ctk.CTkLabel(self.info_frame, text="Dados do Servidor", font=ctk.CTkFont(size=20, weight="bold"))
        self.info_title.pack(anchor="w", padx=10, pady=(5, 2))
        
        self.info_grid = ctk.CTkFrame(self.info_frame, fg_color="transparent")
        self.info_grid.pack(fill="x", padx=10, pady=2)
        
        self.lbl_mat = self._create_info_item(self.info_grid, "Matrícula:", "", 0, 0)
        self.lbl_nasc = self._create_info_item(self.info_grid, "Data Nasc.:", "", 1, 0)
        self.lbl_nome = self._create_info_item(self.info_grid, "Nome:", "", 2, 0)
        self.lbl_cargo = self._create_info_item(self.info_grid, "Cargo:", "", 3, 0)
        self.lbl_sec = self._create_info_item(self.info_grid, "Secretaria:", "", 4, 0)

        # 3. Definição de Função e ASO (Coluna Esquerda)
        self.aso_config_frame = ctk.CTkFrame(self.left_column)
        self.aso_config_frame.pack(fill="both", expand=True, pady=0, padx=5)
        
        self.aso_title = ctk.CTkLabel(self.aso_config_frame, text="Definição de GHE", font=ctk.CTkFont(size=20, weight="bold"))
        self.aso_title.pack(anchor="w", padx=10, pady=(5, 2))
        
        ctk.CTkLabel(self.aso_config_frame, text="Função:", font=ctk.CTkFont(size=16)).pack(anchor="w", padx=10)
        
        self.func_search_var = ctk.StringVar()
        self.func_entry = ctk.CTkEntry(self.aso_config_frame, placeholder_text="Digite para buscar...", width=400, textvariable=self.func_search_var, font=ctk.CTkFont(size=16))
        self.func_entry.pack(anchor="w", padx=10, pady=2)
        self.func_entry.bind("<KeyRelease>", self._on_search_key)
        
        self.func_list_frame = ctk.CTkScrollableFrame(self.aso_config_frame, width=380, height=200, fg_color="transparent")
        self.func_btns = [] 
        
        self.lbl_ghe = ctk.CTkLabel(self.aso_config_frame, text="GHE Correspondente: -", font=ctk.CTkFont(size=16, weight="bold"))
        self.lbl_ghe.pack(anchor="w", padx=10, pady=(5, 0))
        
        self.lbl_ghe_conj = ctk.CTkLabel(self.aso_config_frame, text="GHE CONJ: -", font=ctk.CTkFont(size=16, weight="bold"))
        self.lbl_ghe_conj.pack(anchor="w", padx=10, pady=(0, 5))
        
        ctk.CTkLabel(self.aso_config_frame, text="Tipo de Exame:", font=ctk.CTkFont(size=16)).pack(anchor="w", padx=10)
        self.aso_type_var = ctk.StringVar(value="Admissional")
        self.aso_seg = ctk.CTkSegmentedButton(self.aso_config_frame, values=["Admissional", "Demissional"], variable=self.aso_type_var, command=self.update_aso_results, font=ctk.CTkFont(size=14))
        self.aso_seg.pack(anchor="w", padx=10, pady=5)

        # 4. Resultados (Coluna Direita)
        self.results_frame = ctk.CTkFrame(self.right_column)
        self.results_frame.pack(fill="both", expand=True, pady=0, padx=5)
        
        self.res_title = ctk.CTkLabel(self.results_frame, text="Exames e Riscos", font=ctk.CTkFont(size=20, weight="bold"))
        self.res_title.pack(anchor="w", padx=10, pady=(5, 2))
        
        ctk.CTkLabel(self.results_frame, text="Riscos Ocupacionais:", text_color="gray", font=ctk.CTkFont(size=14)).pack(anchor="w", padx=10)
        self.riscos_text = ctk.CTkTextbox(self.results_frame, height=60, font=ctk.CTkFont(size=16))
        self.riscos_text.pack(fill="x", padx=10, pady=2)
        self.riscos_text.insert("0.0", "Aguardando definição de função...")
        self.riscos_text.configure(state="disabled")

        ctk.CTkLabel(self.results_frame, text="Detalhes:", text_color="gray", font=ctk.CTkFont(size=14)).pack(anchor="w", padx=10)
        self.detalhes_text = ctk.CTkTextbox(self.results_frame, height=50, font=ctk.CTkFont(size=16))
        self.detalhes_text.pack(fill="x", padx=10, pady=2)
        self.detalhes_text.configure(state="disabled")
        
        ctk.CTkLabel(self.results_frame, text="Exames Necessários:", text_color="gray").pack(anchor="w", padx=10, pady=(5,0))
        self.exames_box = ctk.CTkTextbox(self.results_frame, font=ctk.CTkFont(size=14))
        self.exames_box.pack(fill="both", expand=True, padx=10, pady=(2, 10))
        self.exames_box.configure(state="disabled")
        
        # Botão Gerar ASO
        self.generate_btn = ctk.CTkButton(self.results_frame, text="Gerar Arquivo ASO", 
                                         command=self.generate_aso_file, 
                                         font=ctk.CTkFont(size=18, weight="bold"),
                                         fg_color="#27ae60", hover_color="#2ecc71",
                                         height=50)
        self.generate_btn.pack(fill="x", padx=10, pady=(0, 10))

    def _change_appearance_mode(self, new_appearance_mode: str):
        if new_appearance_mode == "Modo Claro":
            ctk.set_appearance_mode("Light")
        elif new_appearance_mode == "Modo Escuro":
            ctk.set_appearance_mode("Dark")

    def _create_info_item(self, parent, label_text, value_text, r, c):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.grid(row=r, column=c, sticky="w", padx=20, pady=2)
        ctk.CTkLabel(frame, text=label_text, font=ctk.CTkFont(size=16, weight="bold")).pack(side="left")
        lbl_val = ctk.CTkLabel(frame, text=value_text, font=ctk.CTkFont(size=16))
        lbl_val.pack(side="left", padx=5)
        return lbl_val

    def _load_functions_async(self):
        self.functions = self.dm.load_functions()
        self.func_names = [f['funcao'] for f in self.functions]
        # Atualizar UI na thread principal
        self.after(0, self._update_func_menu)

    def _update_func_menu(self):
        if self.func_names:
            self.func_entry.configure(placeholder_text="Buscar função...")
        else:
            self.func_entry.configure(placeholder_text="Erro ao carregar")
            if self.dm.last_error:
                messagebox.showerror("Erro de Arquivo", f"Falha ao carregar GHE.xlsx:\n{self.dm.last_error}")

    def _on_search_key(self, event):
        search_term = self.func_search_var.get().strip().upper()
        
        if len(search_term) >= 1:
            self.func_list_frame.pack(anchor="w", padx=10, pady=5)
            self._filter_functions(search_term)
        else:
            self.func_list_frame.pack_forget()

    def _filter_functions(self, term):
        # Limpar botões atuais
        for btn in self.func_btns:
            btn.destroy()
        self.func_btns = []

        # Filtrar nomes
        matches = [name for name in self.func_names if term in name.upper()]
        
        # Limitar a 50 resultados para não travar a UI ao renderizar
        for match in matches[:50]:
            btn = ctk.CTkButton(self.func_list_frame, text=match, 
                                anchor="w", fg_color="transparent", 
                                text_color=("gray10", "gray90"),
                                hover_color=("gray70", "gray30"),
                                font=ctk.CTkFont(size=14),
                                command=lambda m=match: self._select_function(m))
            btn.pack(fill="x", pady=1)
            self.func_btns.append(btn)
        
        if not matches:
             lbl = ctk.CTkLabel(self.func_list_frame, text="Nenhuma função encontrada")
             lbl.pack(pady=10)
             self.func_btns.append(lbl)

    def _select_function(self, name):
        self.func_search_var.set(name)
        self.func_list_frame.pack_forget()
        self.on_function_change(name)

    def search_employee(self):
        cpf = self.cpf_entry.get()
        if not cpf:
             messagebox.showwarning("Aviso", "Digite um CPF.")
             return
        
        results = self.dm.load_employee(cpf)
        
        if not results:
            error_msg = self.dm.last_error if self.dm.last_error else "Funcionário não encontrado."
            messagebox.showerror("Erro", error_msg)
            self._clear_info()
            return

        if len(results) == 1:
            data = results[0]
        else:
            # Abrir diálogo de seleção
            dialog = EmployeeSelectionDialog(self, results)
            data = dialog.get_result()
            
            if data is None:
                return # Usuário não selecionou nada

        self.employee_data = data
        self._update_display(data)

    def open_manual_entry(self):
        dialog = ManualEntryDialog(self)
        self.wait_window(dialog)
        
        if dialog.result:
            res = dialog.result
            # Adaptar para o formato interno
            data = {
                'cpf': res['CPF'],
                'nome': res['Nome Completo'],
                'nascimento': res['Data de Nascimento'],
                'nascimento_raw': None,
                'cargo': res['Cargo'],
                'secretaria': res['Secretaria'],
                'matricula': 'NOVO (Manual)'
            }
            
            self.employee_data = data
            self._update_display(data)

    def _update_display(self, data):
        # Preencher UI com dados selecionados
        self.lbl_nome.configure(text=data['nome'])
        self.lbl_nasc.configure(text=data['nascimento'])
        self.lbl_cargo.configure(text=data['cargo'])
        self.lbl_mat.configure(text=data['matricula'])
        self.lbl_sec.configure(text=data['secretaria'])
        
        # Atualizar campo de busca com o CPF formatado
        self.cpf_entry.delete(0, "end")
        self.cpf_entry.insert(0, data['cpf'])

    def _clear_info(self):
        self.lbl_nome.configure(text="")
        self.lbl_nasc.configure(text="")
        self.lbl_cargo.configure(text="")
        self.lbl_mat.configure(text="")
        self.lbl_sec.configure(text="")
        self.employee_data = None

    def on_function_change(self, choice):
        # Achar GHE
        selected = next((f for f in self.functions if f['funcao'] == choice), None)
        if selected:
            self.current_ghe = selected['ghe']
            self.lbl_ghe.configure(text=f"GHE Correspondente: {self.current_ghe}")
            
            self.current_ghe_conj = selected.get('ghe_conj', '-')
            self.lbl_ghe_conj.configure(text=f"GHE CONJ: {self.current_ghe_conj}")
            
            self.update_aso_results()
        else:
            self.current_ghe = None
            self.current_ghe_conj = "-"
            self.lbl_ghe.configure(text="GHE Correspondente: -")
            self.lbl_ghe_conj.configure(text="GHE CONJ: -")

    def update_aso_results(self, _=None):
        if not hasattr(self, 'current_ghe') or not self.current_ghe:
            return
            
        aso_type = self.aso_type_var.get()
        data = self.dm.load_exams(self.current_ghe, aso_type)
        self.current_exams_data = data
        
        # Atualizar Riscos
        self.riscos_text.configure(state="normal")
        self.riscos_text.delete("0.0", "end")
        self.riscos_text.insert("0.0", data['riscos'])
        self.riscos_text.configure(state="disabled")

        # Atualizar Detalhes
        self.detalhes_text.configure(state="normal")
        self.detalhes_text.delete("0.0", "end")
        self.detalhes_text.insert("0.0", data['detalhes'])
        self.detalhes_text.configure(state="disabled")
        
        # Atualizar Exames
        self.exames_box.configure(state="normal")
        self.exames_box.delete("0.0", "end")
        
        if data['exames']:
            for ex in data['exames']:
                self.exames_box.insert("end", f"• {ex}\n")
        else:
            self.exames_box.insert("end", "Nenhum exame específico encontrado ou GHE inválido.")
            
        self.exames_box.configure(state="disabled")

    def generate_aso_file(self):
        if not self.employee_data:
            messagebox.showwarning("Aviso", "Busque um funcionário primeiro.")
            return
        
        if not self.current_exams_data or not self.current_exams_data.get('exames'):
             messagebox.showwarning("Aviso", "Selecione uma função com exames válidos.")
             return
        
        try:
            # 1. Abrir diálogo para escolher datas
            exames = self.current_exams_data.get('exames', [])
            dialog = ExamDateDialog(self, exames)
            exam_dates = dialog.get_result()
            
            if exam_dates is None:
                # Usuário cancelou
                return
            
            # 2. Gerar o arquivo
            aso_type = self.aso_type_var.get()
            ghe_conj = getattr(self, 'current_ghe_conj', '-')
            
            output_path = self.dm.generate_aso(self.employee_data, self.current_exams_data, aso_type, exam_dates, ghe_conj=ghe_conj)
            
            if output_path:
                msg = f"ASO gerado com sucesso!\n\nSalvo em PDF:\n{output_path}\n\nEnviado para a impressora (2 vias)."
                messagebox.showinfo("Sucesso", msg)
                try:
                    os.startfile(output_path)
                except:
                    pass
            else:
                messagebox.showerror("Erro", f"Falha ao gerar o arquivo:\n{self.dm.last_error}")
                
        except Exception as e:
            messagebox.showerror("Erro Fatal", f"Ocorreu um erro inesperado:\n{e}")

if __name__ == "__main__":
    app = SESMTApp()
    app.mainloop()
