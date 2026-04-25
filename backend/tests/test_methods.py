import pytest
import math
from app.methods.root_finding import RootFindingService
from app.methods.integration import IntegrationService
from app.methods.differentiation import DifferentiationService
from app.methods.interpolation import InterpolationService
from app.methods.monte_carlo import MonteCarloService
from app.methods.ode import ODEService

# ==========================================
# 1. PRUEBAS DE INTEGRACIÓN NUMÉRICA
# ==========================================

def test_simpson_13_exactitud():
    func = IntegrationService.compilar_funcion("x**3")
    resultado = IntegrationService.simpson_13_compuesto(func, 0, 2, n=2, precision=6)
    assert resultado["integral"] == pytest.approx(4.0, rel=1e-5)

def test_simpson_13_falla_n_impar():
    func = IntegrationService.compilar_funcion("x**2")
    with pytest.raises(ValueError, match="PAR"):
        IntegrationService.simpson_13_compuesto(func, 0, 2, n=3)

def test_simpson_38_exactitud():
    func = IntegrationService.compilar_funcion("x**3")
    resultado = IntegrationService.simpson_38_compuesto(func, 0, 3, n=3, precision=6)
    assert resultado["integral"] == pytest.approx(20.25, rel=1e-5)

def test_rescate_matematico_integracion():
    func = IntegrationService.compilar_funcion("sin(x)/x")
    resultado = IntegrationService.simpson_13_compuesto(func, 0, 1, n=10, precision=6)
    assert resultado["integral"] == pytest.approx(0.946083, rel=1e-3)
    assert len(resultado["notas"]) > 0

def test_trapecio_et_en_epsilon():
    func = IntegrationService.compilar_funcion("x**2")
    resultado = IntegrationService.trapecio_compuesto(func, 0, 1, n=1, precision=8, epsilon=0.5)

    assert resultado["error_truncamiento"] == pytest.approx(-1/6, rel=1e-6)
    assert resultado["detalle_error_truncamiento"]["orden_derivada"] == 2
    assert resultado["detalle_error_truncamiento"]["derivada_en_epsilon"] == pytest.approx(2.0, rel=1e-8)

def test_simpson_13_et_en_epsilon():
    func = IntegrationService.compilar_funcion("x**6")
    resultado = IntegrationService.simpson_13_compuesto(func, 0, 1, n=2, precision=8, epsilon=0.5)

    assert resultado["error_truncamiento"] == pytest.approx(-0.03125, rel=1e-8)
    assert resultado["detalle_error_truncamiento"]["orden_derivada"] == 4

def test_et_epsilon_fuera_de_intervalo():
    func = IntegrationService.compilar_funcion("x**2")
    resultado = IntegrationService.trapecio_compuesto(func, 0, 1, n=1, precision=8, epsilon=2.0)

    assert "fuera del intervalo" in resultado["error_truncamiento"]
    assert resultado["detalle_error_truncamiento"] is None

# ==========================================
# 2. PRUEBAS DE BÚSQUEDA DE RAÍCES
# ==========================================

def test_biseccion_raiz_conocida():
    func = RootFindingService.compilar_funcion("x**2 - 4")
    resultado = RootFindingService.biseccion(func, 0, 5, tol=1e-5, max_iter=100, precision=6)
    assert resultado["raiz"] == pytest.approx(2.0, rel=1e-4)

def test_biseccion_falla_segura_sin_raiz():
    func = RootFindingService.compilar_funcion("x**2 - 4")
    with pytest.raises(ValueError, match="signos opuestos"):
        RootFindingService.biseccion(func, 3, 5, tol=1e-5, max_iter=100, precision=6)

def test_newton_raphson_convergencia_rapida():
    func = RootFindingService.compilar_funcion("x**2 - 4")
    resultado = RootFindingService.newton_raphson(func, x0=5.0, tol=1e-5, max_iter=100, precision=6)
    assert resultado["raiz"] == pytest.approx(2.0, rel=1e-5)

def test_aitken_vs_punto_fijo():
    g_func = RootFindingService.compilar_funcion("sqrt(x + 2)")
    res_pf = RootFindingService.punto_fijo(g_func, x0=1.0, tol=1e-5, max_iter=100, precision=6)
    res_aitken = RootFindingService.aitken(g_func, x0=1.0, tol=1e-5, max_iter=100, precision=6)
    assert res_aitken["raiz"] == pytest.approx(2.0, rel=1e-5)
    assert res_aitken["num_iter"] <= res_pf["num_iter"]

# ==========================================
# 3. PRUEBAS DE DIFERENCIACIÓN NUMÉRICA
# ==========================================

def test_diferencias_finitas_exactitud():
    """
    Derivada de x^2 en x=3 es exactamente 6.
    La segunda derivada es exactamente 2.
    """
    res = DifferentiationService.calcular_diferencias_completas("x**2", x_val=3.0, h=0.01)
    
    assert res["derivada_exacta"] == pytest.approx(6.0)
    assert res["segunda_derivada_exacta"] == pytest.approx(2.0)
    
    # Buscamos el método central que es el más preciso
    central = next(r for r in res["resultados"] if r["metodo"] == "Diferencia Central")
    assert central["valor"] == pytest.approx(6.0, rel=1e-3)

def test_diferencias_finitas_funciones_trigonometricas():
    """Derivada de sin(x) en pi/2 debe ser cos(pi/2) = 0"""
    res = DifferentiationService.calcular_diferencias_completas("sin(x)", x_val=math.pi/2, h=0.001)
    assert res["derivada_exacta"] == pytest.approx(0.0, abs=1e-7)

# ==========================================
# 4. PRUEBAS DE INTERPOLACIÓN (LAGRANGE)
# ==========================================

def test_lagrange_exactitud_lineal():
    """
    Una línea recta que pasa por (0,0) y (2,4) es y=2x.
    Evaluada en x=1 debe dar 2.
    """
    res = InterpolationService.lagrange(puntos_x=[0, 2], puntos_y=[0, 4], x_eval=1.0)
    assert res["grado"] <= 1
    assert res["P_eval"] == pytest.approx(2.0)

def test_lagrange_con_funcion_exacta():
    """
    Parábola x^2 que pasa por x={0, 1, 2}.
    Evaluada en x=1.5 debe dar 1.5^2 = 2.25
    """
    res = InterpolationService.lagrange(puntos_x=[0, 1, 2], func_str="x**2", x_eval=1.5)
    assert res["P_eval"] == pytest.approx(2.25)
    assert res["error_local"] == pytest.approx(0.0, abs=1e-7)

# ==========================================
# 5. PRUEBAS DE MONTE CARLO
# ==========================================

def test_montecarlo_hit_or_miss_deterministico():
    """
    Calculamos el área de un triángulo (función f(x)=x de 0 a 2). Area exacta = 2.
    Fijamos semilla para que el resultado sea siempre idéntico en los tests.
    """
    func = MonteCarloService.compilar_funcion("x")
    res = MonteCarloService.hit_or_miss_1d(func, 0, 2, N=10000, seed=42)
    
    # Para N=10000 la aproximación debe estar bastante cerca de 2.0
    assert res["integral"] == pytest.approx(2.0, rel=0.05)
    assert res["n_exitos"] > 0

def test_montecarlo_valor_promedio_deterministico():
    """
    Integral de x^2 entre 0 y 2 es 8/3 ≈ 2.6666...
    Usamos Valor Promedio 1D con semilla.
    """
    func = MonteCarloService.compilar_funcion("x**2")
    res = MonteCarloService.valor_promedio_1d(func, 0, 2, N=10000, seed=42)
    
    assert res["integral"] == pytest.approx(2.6666, rel=0.05)
    assert res["ic_inf"] < res["integral"] < res["ic_sup"] # Verifica que la integral esté dentro del IC
    assert "media_muestral" in res
    assert res["media_muestral"] == pytest.approx(res["promedio_fx"], rel=1e-10)


def test_montecarlo_media_muestral_hit_or_miss():
    func = MonteCarloService.compilar_funcion("x")
    res = MonteCarloService.hit_or_miss_1d(func, 0, 2, N=5000, seed=123)

    assert "media_muestral" in res
    assert res["media_muestral"] == pytest.approx(res["n_exitos"] / res["N"], rel=1e-6)


def test_montecarlo_media_muestral_2d_y_3d():
    f2 = MonteCarloService.compilar_funcion("x + y", "x y")
    res2 = MonteCarloService.valor_promedio_2d(f2, (0, 1), (0, 1), N=4000, seed=7)

    f3 = MonteCarloService.compilar_funcion("x + y + z", "x y z")
    res3 = MonteCarloService.valor_promedio_3d(f3, (0, 1), (0, 1), (0, 1), N=4000, seed=7)

    assert "media_muestral" in res2
    assert "media_muestral" in res3
    assert res2["media_muestral"] == pytest.approx(res2["promedio_fxy"], rel=1e-10)
    assert res3["media_muestral"] == pytest.approx(res3["promedio_fxyz"], rel=1e-10)


# ==========================================
# 6. PRUEBAS PARAMETRIZADAS (MÁS COBERTURA)
# ==========================================

@pytest.mark.parametrize(
    "funcion,a,b,n,valor_esperado,rel_tol",
    [
        ("x", 0.0, 1.0, 2, 0.5, 1e-5),
        ("x**2", 0.0, 1.0, 2, 1.0 / 3.0, 1e-5),
        ("x**3", 0.0, 2.0, 2, 4.0, 1e-5),
        ("exp(x)", 0.0, 1.0, 20, math.e - 1.0, 1e-4),
    ],
)
def test_simpson_13_parametrizado(funcion, a, b, n, valor_esperado, rel_tol):
    func = IntegrationService.compilar_funcion(funcion)
    res = IntegrationService.simpson_13_compuesto(func, a, b, n=n, precision=8)
    assert res["integral"] == pytest.approx(valor_esperado, rel=rel_tol)


@pytest.mark.parametrize(
    "funcion,a,b,raiz_esperada",
    [
        ("x**2 - 4", 0.0, 5.0, 2.0),
        ("x**3 - 1", 0.0, 2.0, 1.0),
        ("x - 0.25", 0.0, 1.0, 0.25),
    ],
)
def test_biseccion_parametrizado(funcion, a, b, raiz_esperada):
    f = RootFindingService.compilar_funcion(funcion)
    res = RootFindingService.biseccion(f, a, b, tol=1e-8, max_iter=200, precision=8)
    assert res["convergencia"] is True
    assert res["raiz"] == pytest.approx(raiz_esperada, rel=1e-5)


# ==========================================
# 7. STRINGS INVÁLIDOS / MALICIOSOS
# ==========================================

@pytest.mark.parametrize("expr_invalida", ["x** + 2", "2***x", "", ")("])
def test_compiladores_rechazan_strings_invalidos(expr_invalida):
    compiladores = [
        RootFindingService.compilar_funcion,
        IntegrationService.compilar_funcion,
        DifferentiationService.compilar_funcion,
        InterpolationService.compilar_funcion,
        MonteCarloService.compilar_funcion,
    ]

    for compilar in compiladores:
        with pytest.raises(ValueError):
            compilar(expr_invalida)


@pytest.mark.parametrize(
    "expr_maliciosa",
    [
        "__import__('os').system('echo HACK')",
        "lambda x: x",
        "open('archivo.txt','w')",
    ],
)
def test_compiladores_rechazan_expresiones_maliciosas(expr_maliciosa):
    compiladores = [
        RootFindingService.compilar_funcion,
        IntegrationService.compilar_funcion,
        DifferentiationService.compilar_funcion,
        InterpolationService.compilar_funcion,
        MonteCarloService.compilar_funcion,
    ]

    for compilar in compiladores:
        with pytest.raises(ValueError):
            compilar(expr_maliciosa)


# ==========================================
# 8. DIVERGENCIA Y LÍMITE DE ITERACIONES
# ==========================================

def test_punto_fijo_divergencia_hacia_infinito():
    g = RootFindingService.compilar_funcion("exp(x)")
    res = RootFindingService.punto_fijo(g, x0=100.0, tol=1e-8, max_iter=30, precision=8)

    assert res["convergencia"] is False
    assert res["raiz"] is None
    assert "diverge" in res["error_msg"].lower() or "infinito" in res["error_msg"].lower()


def test_newton_raphson_derivada_cero_controlada():
    f = RootFindingService.compilar_funcion("x**3")
    res = RootFindingService.newton_raphson(f, x0=0.0, tol=1e-10, max_iter=20, precision=8)

    assert res["convergencia"] is False
    assert res["raiz"] is None
    assert "derivada" in res["error_msg"].lower()


def test_newton_raphson_respeta_max_iter():
    f = RootFindingService.compilar_funcion("cos(x) - x")
    res = RootFindingService.newton_raphson(f, x0=10.0, tol=1e-15, max_iter=1, precision=8)

    assert res["convergencia"] is False
    assert res["num_iter"] == 1
    assert "límite de iteraciones" in res["error_msg"].lower()


# ==========================================
# 9. COBERTURA EDO (EULER, HEUN, RK4)
# ==========================================

@pytest.mark.parametrize(
    "metodo,tol_abs",
    [
        ("euler", 0.20),
        ("heun", 0.03),
        ("rk4", 0.001),
    ],
)
def test_edo_metodos_convergen_a_solucion_exacta(metodo, tol_abs):
    # dy/dx = y, y(0)=1 => y(x)=e^x
    res = ODEService.ejecutar_metodo(metodo, "y", x0=0.0, y0=1.0, xf=1.0, h=0.1)

    y_final = res["y_plot"][-1]
    y_exacta_final = res["y_exacta_plot"][-1]

    assert len(res["tabla"]) == len(res["x_plot"])
    assert y_final == pytest.approx(y_exacta_final, abs=tol_abs)


def test_edo_orden_de_precision_esperado():
    # Para el mismo paso, RK4 debe ser al menos tan preciso como Heun,
    # y Heun al menos tan preciso como Euler en este problema suave.
    euler = ODEService.ejecutar_metodo("euler", "y", x0=0.0, y0=1.0, xf=1.0, h=0.1)
    heun = ODEService.ejecutar_metodo("heun", "y", x0=0.0, y0=1.0, xf=1.0, h=0.1)
    rk4 = ODEService.ejecutar_metodo("rk4", "y", x0=0.0, y0=1.0, xf=1.0, h=0.1)

    exacta = euler["y_exacta_plot"][-1]
    err_euler = abs(euler["y_plot"][-1] - exacta)
    err_heun = abs(heun["y_plot"][-1] - exacta)
    err_rk4 = abs(rk4["y_plot"][-1] - exacta)

    assert err_heun <= err_euler
    assert err_rk4 <= err_heun