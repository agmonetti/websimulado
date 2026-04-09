"""
Endpoint para métodos de búsqueda de raíces
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.methods.root_finding import RootFindingService

router = APIRouter(prefix="/api/root-finding", tags=["Root Finding"])

class RootFindingRequest(BaseModel):
    method: Optional[str] = None
    func_str: Optional[str] = None
    g_str: Optional[str] = None
    a: Optional[float] = None
    b: Optional[float] = None
    x0: Optional[float] = None
    tol: Optional[float] = None
    max_iter: Optional[int] = None
    precision: Optional[int] = 8
    
    class Config:
        extra = 'allow'  # Permitir campos adicionales

@router.post("/biseccion")
def biseccion(req: RootFindingRequest):
    """Método de Bisección"""
    try:
        if not req.func_str:
            raise ValueError("Requiere: func_str, a, b, x0")
        if req.a is None or req.b is None:
            raise ValueError("Requiere limites: a, b")
        
        f = RootFindingService.compilar_funcion(req.func_str)
        tol = req.tol or 1e-6
        max_iter = req.max_iter or 100
        precision = req.precision or 8
        resultado = RootFindingService.biseccion(
            f, req.a, req.b, tol, max_iter, precision
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/punto-fijo")
def punto_fijo(req: RootFindingRequest):
    """Método de Punto Fijo"""
    try:
        if not req.g_str or req.x0 is None:
            raise ValueError("Requiere: g_str (x = g(x)), x0")
        
        g = RootFindingService.compilar_funcion(req.g_str)
        tol = req.tol or 1e-6
        max_iter = req.max_iter or 100
        precision = req.precision or 8
        resultado = RootFindingService.punto_fijo(
            g, req.x0, tol, max_iter, precision
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/newton-raphson")
def newton_raphson(req: RootFindingRequest):
    """Método de Newton-Raphson"""
    try:
        if not req.func_str or req.x0 is None:
            raise ValueError("Requiere: func_str, x0")
        
        f = RootFindingService.compilar_funcion(req.func_str)
        tol = req.tol or 1e-6
        max_iter = req.max_iter or 100
        precision = req.precision or 8
        resultado = RootFindingService.newton_raphson(
            f, req.x0, tol, max_iter, precision
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/aitken")
def aitken(req: RootFindingRequest):
    """Aceleración de Aitken"""
    try:
        if not req.g_str or req.x0 is None:
            raise ValueError("Requiere: g_str (x = g(x)), x0")
        
        g = RootFindingService.compilar_funcion(req.g_str)
        tol = req.tol or 1e-6
        max_iter = req.max_iter or 100
        precision = req.precision or 8
        resultado = RootFindingService.aitken(
            g, req.x0, tol, max_iter, precision
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/comparar")
def comparar_raices(req: RootFindingRequest):
    """Endpoint para el comparador de búsqueda de raíces"""
    try:
        # Validaciones básicas
        if not req.func_str or not req.g_str:
            raise ValueError("Se requiere f(x) y g(x) para comparar todos los métodos.")
        if req.a is None or req.b is None or req.x0 is None:
            raise ValueError("Se requieren los parámetros a, b y x0.")
            
        tol = req.tol or 1e-6
        max_iter = req.max_iter or 100
        precision = req.precision or 8
        
        resultado = RootFindingService.comparar_metodos(
            func_str=req.func_str,
            g_str=req.g_str,
            a=req.a,
            b=req.b,
            x0=req.x0,
            tol=tol,
            max_iter=max_iter,
            precision=precision
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))