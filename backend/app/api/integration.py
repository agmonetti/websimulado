"""
Endpoints para integración numérica
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.methods.integration import IntegrationService

router = APIRouter(prefix="/api/integration", tags=["Integration"])

class IntegrationRequest(BaseModel):
    func_str: Optional[str] = None
    a: Optional[float] = None
    b: Optional[float] = None
    n: Optional[int] = None
    epsilon: Optional[float] = None
    precision: Optional[int] = 8
    
    class Config:
        extra = 'allow'  # Permitir campos adicionales

@router.post("/rectangulo")
def rectangulo_compuesto(req: IntegrationRequest):
    """Regla del Rectángulo (punto medio) compuesta"""
    try:
        if not req.func_str or req.a is None or req.b is None or req.n is None:
            raise ValueError("Requiere: func_str, a, b, n")
        f = IntegrationService.compilar_funcion(req.func_str)
        precision = req.precision or 8
        resultado = IntegrationService.rectangulo_compuesto(
            f, req.a, req.b, req.n, precision, req.epsilon
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/trapecio")
def trapecio_compuesto(req: IntegrationRequest):
    """Regla del Trapecio compuesta"""
    try:
        if not req.func_str or req.a is None or req.b is None or req.n is None:
            raise ValueError("Requiere: func_str, a, b, n")
        f = IntegrationService.compilar_funcion(req.func_str)
        precision = req.precision or 8
        resultado = IntegrationService.trapecio_compuesto(
            f, req.a, req.b, req.n, precision, req.epsilon
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simpson-13")
def simpson_13_compuesto(req: IntegrationRequest):
    """Simpson 1/3 compuesto"""
    try:
        if not req.func_str or req.a is None or req.b is None or req.n is None:
            raise ValueError("Requiere: func_str, a, b, n")
        if req.n % 2 != 0:
            raise ValueError("n debe ser PAR para Simpson 1/3")
        f = IntegrationService.compilar_funcion(req.func_str)
        precision = req.precision or 8
        resultado = IntegrationService.simpson_13_compuesto(
            f, req.a, req.b, req.n, precision, req.epsilon
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simpson-38")
def simpson_38_compuesto(req: IntegrationRequest):
    """Simpson 3/8 compuesto"""
    try:
        if not req.func_str or req.a is None or req.b is None or req.n is None:
            raise ValueError("Requiere: func_str, a, b, n")
        if req.n % 3 != 0:
            raise ValueError("n debe ser múltiplo de 3 para Simpson 3/8")
        f = IntegrationService.compilar_funcion(req.func_str)
        precision = req.precision or 8
        resultado = IntegrationService.simpson_38_compuesto(
            f, req.a, req.b, req.n, precision, req.epsilon
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/comparar")
def comparar_integraciones(req: IntegrationRequest):
    """Endpoint para el comparador de integraciones numéricas"""
    try:
        if not req.func_str or req.a is None or req.b is None or req.n is None:
            raise ValueError("Faltan parámetros: func_str, a, b, n")
            
        precision = req.precision or 8
        resultado = IntegrationService.comparar_metodos(
            func_str=req.func_str,
            a=req.a,
            b=req.b,
            n=req.n,
            precision=precision,
            epsilon=req.epsilon
        )
        
        if "error_global" in resultado:
            raise ValueError(resultado["error_global"])
            
        return resultado
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))