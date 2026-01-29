from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import FileResponse
import os
import sys
from data_manager import DataManager

app = FastAPI(title="SESMT PDF Backend")

# Habilitar CORS para permitir chamadas do Next.js (geralmente na porta 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instanciar o Gerenciador de Dados
# O base_path deve ser o diretório 'sistema' onde os templates e dados estão próximos
base_path = os.path.dirname(os.path.abspath(__file__))
dm = DataManager(base_path=base_path)

class EmployeeData(BaseModel):
    nome: str
    cpf: str
    nascimento: str
    cargo: str
    matricula: str
    secretaria: str

class ExamsData(BaseModel):
    exames: List[str]
    riscos: str
    detalhes: str

class GenerateRequest(BaseModel):
    employee_data: EmployeeData
    exams_data: ExamsData
    aso_type: str
    exam_dates: Optional[List[str]] = None
    ghe_conj: str = "-"

@app.post("/generate-aso")
async def generate_aso(req: GenerateRequest):
    try:
        # Converter modelos Pydantic para dicts
        employee_dict = req.employee_data.model_dump() if hasattr(req.employee_data, 'model_dump') else req.employee_data.dict()
        exams_dict = req.exams_data.model_dump() if hasattr(req.exams_data, 'model_dump') else req.exams_data.dict()
        
        output_path = dm.generate_aso(
            employee_dict, 
            exams_dict, 
            req.aso_type, 
            req.exam_dates, 
            ghe_conj=req.ghe_conj
        )
        
        if output_path and os.path.exists(output_path):
            return FileResponse(
                output_path, 
                media_type='application/pdf',
                filename=os.path.basename(output_path)
            )
        else:
            raise HTTPException(status_code=500, detail=f"Falha ao gerar ASO: {dm.last_error}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-referral")
async def generate_referral(req: GenerateRequest):
    try:
        employee_dict = req.employee_data.model_dump() if hasattr(req.employee_data, 'model_dump') else req.employee_data.dict()
        exams_dict = req.exams_data.model_dump() if hasattr(req.exams_data, 'model_dump') else req.exams_data.dict()
        
        output_path = dm.generate_exam_referral(
            employee_dict, 
            exams_dict, 
            req.aso_type, 
            req.exam_dates, 
            ghe_conj=req.ghe_conj
        )
        
        if output_path and os.path.exists(output_path):
            return FileResponse(
                output_path, 
                media_type='application/pdf',
                filename=os.path.basename(output_path)
            )
        else:
            raise HTTPException(status_code=500, detail=f"Falha ao gerar Encaminhamento: {dm.last_error}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
