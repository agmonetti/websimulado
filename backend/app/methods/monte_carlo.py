"""
Simulacion de Monte Carlo
- Hit-or-Miss (1D)
- Valor Promedio (1D, 2D, 3D)
- Analisis estadistico y convergencia
"""
import numpy as np
import sympy as sp
from typing import Dict, Callable, Tuple, List
from scipy.stats import norm
import warnings

class MonteCarloService:
    
    @staticmethod
    def compilar_funcion(texto_funcion: str, variables: str = 'x') -> Callable:
        """Convierte string a funcion vectorizada."""
        try:
            # Reemplazar notacion de potencia
            texto_funcion = texto_funcion.replace('^', '**')
            
            vars_list = variables.split()
            syms = [sp.Symbol(v) for v in vars_list]
            
            # Le pasamos un diccionario local para que reconozca constantes matematicas
            diccionario_local = {'e': sp.E, 'pi': sp.pi}
            expr = sp.sympify(texto_funcion, locals=diccionario_local)
            
            if len(syms) == 1:
                return sp.lambdify(syms[0], expr, 'numpy')
            else:
                return sp.lambdify(syms, expr, 'numpy')
        except Exception as e:
            raise ValueError(f"Error compilando funcion: {str(e)}")
    
    @staticmethod
    def z_score(nivel_confianza: float = 0.95) -> float:
        """Calcula Z(alfa/2) para nivel de confianza."""
        alfa = 1.0 - nivel_confianza
        return norm.ppf(1.0 - (alfa / 2.0))
    
    # ========== METODOS 1D ==========
    
    @staticmethod
    def hit_or_miss_1d(f: Callable, a: float, b: float, N: int,
                      seed: int = None, precision: int = 8) -> Dict:
        """Metodo Hit-or-Miss en 1D."""
        if seed is not None:
            np.random.seed(seed)
        
        # Evaluar funcion en puntos de prueba para hallar limites
        x_test = np.linspace(a, b, 500)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_test = f(x_test)
        
        # Determinar limites de la caja
        y_min, y_max = float(np.nanmin(f_test)), float(np.nanmax(f_test))
        y_base = min(0, y_min) * 1.1
        y_techo = max(0, y_max) * 1.1
        
        # Generar puntos aleatorios
        x_rand = np.random.uniform(a, b, N)
        y_rand = np.random.uniform(y_base, y_techo, N)
        
        # Evaluar
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_eval = f(x_rand)
        
        # Contar aciertos (puntos dentro de la curva)
        exitos_pos = (y_rand >= 0) & (y_rand <= f_eval)
        exitos_neg = (y_rand <= 0) & (y_rand >= f_eval)
        exitos = exitos_pos | exitos_neg
        n_aciertos = np.sum(exitos)
        
        # Calcular integral
        area_caja = (b - a) * (y_techo - y_base)
        integral = area_caja * (n_aciertos / N)
        
        return {
            "metodo": "Hit-or-Miss 1D",
            "N": N,
            "a": a,
            "b": b,
            "integral": round(float(integral), precision),
            "aciertos": int(n_aciertos),
            "tasa_acierto": round(float(n_aciertos / N), precision),
            "area_caja": round(float(area_caja), precision),
            "rango_y": [round(y_base, precision), round(y_techo, precision)]
        }
    
    @staticmethod
    def valor_promedio_1d(f: Callable, a: float, b: float, N: int,
                         seed: int = None, precision: int = 8) -> Dict:
        """Metodo del Valor Promedio en 1D."""
        if seed is not None:
            np.random.seed(seed)
        
        # Generar puntos aleatorios
        x_rand = np.random.uniform(a, b, N)
        
        # Evaluar funcion
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_eval = f(x_rand)
        
        # Filtrar valores validos (descartar NaN/Inf)
        f_valido = f_eval[~(np.isnan(f_eval) | np.isinf(f_eval))]
        
        if len(f_valido) == 0:
            raise ValueError("La funcion no genera valores validos en el intervalo")
        
        # Calcular promedio e integral
        promedio = float(np.mean(f_valido))
        integral = (b - a) * promedio
        
        # Estadisticas
        std_dev = float(np.std(f_valido))
        error_std = std_dev / np.sqrt(len(f_valido))
        
        return {
            "metodo": "Valor Promedio 1D",
            "N": N,
            "a": a,
            "b": b,
            "integral": round(integral, precision),
            "promedio": round(promedio, precision),
            "desv_estandar": round(std_dev, precision),
            "error_std": round(error_std, precision),
            "puntos_validos": len(f_valido)
        }
    
    @staticmethod
    def convergencia_1d(f: Callable, a: float, b: float, N: int,
                       seed: int = None) -> Dict:
        """Analiza convergencia del metodo Valor Promedio acumulando iteraciones."""
        if seed is not None:
            np.random.seed(seed)
        
        x_rand = np.random.uniform(a, b, N)
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_eval = f(x_rand)
        
        # Promedio acumulado
        promedios_acum = np.cumsum(f_eval) / np.arange(1, N + 1)
        integrales = (b - a) * promedios_acum
        
        # Retornar muestras (cada 10% del total)
        step = max(1, N // 10)
        indices = np.arange(0, N, step)
        
        historial = []
        for idx in indices:
            historial.append({
                "iter": int(idx),
                "integral": round(float(integrales[idx]), 8)
            })
        
        return {
            "metodo": "Convergencia 1D",
            "a": a,
            "b": b,
            "N_total": N,
            "historial": historial,
            "integral_final": round(float(integrales[-1]), 8)
        }
    
    # ========== METODOS MULTIDIMENSIONALES ==========
    
    @staticmethod
    def valor_promedio_2d(f: Callable, x_range: Tuple[float, float],
                         y_range: Tuple[float, float], N: int,
                         seed: int = None, precision: int = 8) -> Dict:
        """Integral doble usando Valor Promedio."""
        if seed is not None:
            np.random.seed(seed)
        
        a, b = x_range
        c, d = y_range
        
        # Generar puntos aleatorios
        x_rand = np.random.uniform(a, b, N)
        y_rand = np.random.uniform(c, d, N)
        
        # Evaluar funcion bivariada
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_eval = f(x_rand, y_rand)
        
        # Filtrar validos
        f_valido = f_eval[~(np.isnan(f_eval) | np.isinf(f_eval))]
        
        if len(f_valido) == 0:
            raise ValueError("No hay valores validos")
        
        promedio = float(np.mean(f_valido))
        area_base = (b - a) * (d - c)
        integral = area_base * promedio
        
        return {
            "metodo": "Valor Promedio 2D",
            "N": N,
            "x_range": [a, b],
            "y_range": [c, d],
            "area_base": round(area_base, precision),
            "integral": round(integral, precision),
            "promedio": round(promedio, precision),
            "puntos_validos": len(f_valido)
        }
    
    @staticmethod
    def valor_promedio_3d(f: Callable, x_range: Tuple[float, float],
                         y_range: Tuple[float, float], z_range: Tuple[float, float],
                         N: int, seed: int = None, precision: int = 8) -> Dict:
        """Integral triple usando Valor Promedio."""
        if seed is not None:
            np.random.seed(seed)
        
        a, b = x_range
        c, d = y_range
        e, f_lim = z_range
        
        # Generar puntos aleatorios
        x_rand = np.random.uniform(a, b, N)
        y_rand = np.random.uniform(c, d, N)
        z_rand = np.random.uniform(e, f_lim, N)
        
        # Evaluar funcion trivariada
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            f_eval = f(x_rand, y_rand, z_rand)
        
        # Filtrar validos
        f_valido = f_eval[~(np.isnan(f_eval) | np.isinf(f_eval))]
        
        if len(f_valido) == 0:
            raise ValueError("No hay valores validos")
        
        promedio = float(np.mean(f_valido))
        volumen_base = (b - a) * (d - c) * (f_lim - e)
        integral = volumen_base * promedio
        
        return {
            "metodo": "Valor Promedio 3D",
            "N": N,
            "x_range": [a, b],
            "y_range": [c, d],
            "z_range": [e, f_lim],
            "volumen_base": round(volumen_base, precision),
            "integral": round(integral, precision),
            "promedio": round(promedio, precision),
            "puntos_validos": len(f_valido)
        }
    
    # ========== ANALISIS ESTADISTICO ==========
    
    @staticmethod
    def analisis_estadistico_1d(f: Callable, a: float, b: float, N: int,
                               M: int = 30, nivel_confianza: float = 0.95,
                               seed: int = None, precision: int = 8) -> Dict:
        """Analisis estadistico: replicas independientes con intervalos de confianza."""
        if seed is not None:
            np.random.seed(seed)
        
        replicas = []
        
        for _ in range(M):
            x_rand = np.random.uniform(a, b, N)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                f_eval = f(x_rand)
            
            f_valido = f_eval[~(np.isnan(f_eval) | np.isinf(f_eval))]
            if len(f_valido) > 0:
                promedio = float(np.mean(f_valido))
                integral = (b - a) * promedio
                replicas.append(integral)
        
        replicas = np.array(replicas)
        
        # Estadisticas
        media_replicas = float(np.mean(replicas))
        desv_replicas = float(np.std(replicas))
        
        # Intervalo de confianza
        z = MonteCarloService.z_score(nivel_confianza)
        margen = z * desv_replicas / np.sqrt(M)
        ic_inf = media_replicas - margen
        ic_sup = media_replicas + margen
        
        return {
            "metodo": "Analisis Estadistico 1D",
            "a": a,
            "b": b,
            "N": N,
            "M": M,
            "nivel_confianza": nivel_confianza,
            "media": round(media_replicas, precision),
            "desv_estandar": round(desv_replicas, precision),
            "ic_inferior": round(ic_inf, precision),
            "ic_superior": round(ic_sup, precision),
            "margen_error": round(margen, precision),
            "num_replicas": len(replicas)
        }