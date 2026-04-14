from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.methods.monte_carlo import MonteCarloService

router = APIRouter(prefix="/api/monte-carlo", tags=["Monte Carlo"])

class MonteCarloRequest(BaseModel):
    method: Optional[str] = None
    func_str: Optional[str] = None
    a: Optional[float] = None
    b: Optional[float] = None
    N: Optional[int] = None
    seed: Optional[int] = None
    precision: Optional[int] = 8
    # Para 2D
    ya: Optional[float] = None
    yb: Optional[float] = None
    # Para 3D
    za: Optional[float] = None
    zb: Optional[float] = None
    # Para estadístico
    M: Optional[int] = 1000
    nivel_confianza: Optional[float] = 0.95
    max_error: Optional[float] = None
    
    class Config:
        extra = 'allow'

@router.post("/hit-or-miss-1d")
def hit_or_miss_1d(req: MonteCarloRequest):
    try:
        f = MonteCarloService.compilar_funcion(req.func_str, 'x')
        return MonteCarloService.hit_or_miss_1d(f, req.a, req.b, req.N, req.seed, req.precision or 8, req.nivel_confianza or 0.95)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/valor-promedio-1d")
def valor_promedio_1d(req: MonteCarloRequest):
    try:
        f = MonteCarloService.compilar_funcion(req.func_str, 'x')
        return MonteCarloService.valor_promedio_1d(f, req.a, req.b, req.N, req.seed, req.precision or 8, req.nivel_confianza or 0.95)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/convergencia-1d")
def convergencia_1d(req: MonteCarloRequest):
    try:
        f = MonteCarloService.compilar_funcion(req.func_str, 'x')
        return MonteCarloService.convergencia_1d(f, req.a, req.b, req.N, req.seed)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/valor-promedio-2d")
def valor_promedio_2d(req: MonteCarloRequest):
    try:
        f = MonteCarloService.compilar_funcion(req.func_str, 'x y')
        return MonteCarloService.valor_promedio_2d(f, (req.a, req.b), (req.ya, req.yb), req.N, req.seed, req.precision or 8,req.nivel_confianza or 0.95)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/valor-promedio-3d")
def valor_promedio_3d(req: MonteCarloRequest):
    try:
        if req.za is None or req.zb is None:
            raise ValueError("Las integrales triples requieren límites za y zb")
        f = MonteCarloService.compilar_funcion(req.func_str, 'x y z')
        return MonteCarloService.valor_promedio_3d(f, (req.a, req.b), (req.ya, req.yb), (req.za, req.zb), req.N, req.seed, req.precision or 8, req.nivel_confianza or 0.95)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/estadistico-1d")
def estadistico_1d(req: MonteCarloRequest):
    try:
        f = MonteCarloService.compilar_funcion(req.func_str, 'x')
        return MonteCarloService.analisis_estadistico_1d(f, req.a, req.b, req.N, req.M or 1000, req.nivel_confianza or 0.95, req.seed, req.precision or 8)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))