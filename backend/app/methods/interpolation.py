"""
Interpolación Numérica - Polinomio de Lagrange
"""
import numpy as np
from typing import Dict, List
import sympy as sp

class InterpolationService:
    
    @staticmethod
    def compilar_funcion(texto_funcion: str):
        """Convierte string a función simbólica."""
        try:
            texto_funcion = texto_funcion.replace('e^', 'exp(')
            x = sp.Symbol('x')
            expr = sp.sympify(texto_funcion)
            return sp.lambdify(x, expr, 'numpy'), expr
        except Exception as e:
            raise ValueError(f"Error compilando: {str(e)}")
    
    @staticmethod
    def lagrange(puntos_x: List[float], x_eval: float = None,
                func_str: str = None, puntos_y: List[float] = None,
                precision: int = 8) -> Dict:
        """
        Interpolación de Lagrange.
        - Si func_str: evalúa la función en puntos_x
        - Si puntos_y: usa datos directos
        """
        
        x_sym = sp.Symbol('x')
        n = len(puntos_x)
        
        # Obtener los valores y
        if func_str:
            f, _ = InterpolationService.compilar_funcion(func_str)
            puntos_y = f(np.array(puntos_x))
        elif puntos_y is None:
            raise ValueError("Proveer func_str o puntos_y")
        
        # Construir polinomio de Lagrange
        P = 0
        for i in range(n):
            L_i = 1
            for j in range(n):
                if i != j:
                    L_i *= (x_sym - puntos_x[j]) / (puntos_x[i] - puntos_x[j])
            P += puntos_y[i] * L_i
        
        P_expanded = sp.expand(P)
        
        # Tabla de puntos
        tabla = []
        for xi, yi in zip(puntos_x, puntos_y):
            tabla.append({
                "x": round(xi, precision),
                "y": round(float(yi), precision)
            })
        
        resultado = {
            "metodo": "Lagrange",
            "puntos": tabla,
            "polinomio": str(P_expanded),
            "grado": int(sp.degree(P_expanded, x_sym))
        }
        
        # Si hay x_eval, evaluar
        if x_eval is not None:
            P_eval = float(P_expanded.subs(x_sym, x_eval).evalf())
            resultado["x_eval"] = x_eval
            resultado["P_eval"] = round(P_eval, precision)
            
            # Error local si tenemos función
            if func_str:
                f, _ = InterpolationService.compilar_funcion(func_str)
                f_eval = float(f(x_eval))
                error_local = abs(f_eval - P_eval)
                resultado["f_eval"] = round(f_eval, precision)
                resultado["error_local"] = round(error_local, 8)
        
        return resultado
