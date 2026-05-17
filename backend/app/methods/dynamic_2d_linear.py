import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


class Dynamic2DLinearService:
    @staticmethod
    def _num(value: float, precision: int = 4) -> str:
        if abs(value) < 1e-12:
            value = 0.0
        text = f"{value:.{precision}f}"
        return text.rstrip('0').rstrip('.') if '.' in text else text

    @staticmethod
    def _vector_latex(vec: np.ndarray) -> str:
        return f"\\begin{{bmatrix}}{Dynamic2DLinearService._num(vec[0])}\\\\{Dynamic2DLinearService._num(vec[1])}\\end{{bmatrix}}"

    @staticmethod
    def _eigenvalues_payload(eigvals: np.ndarray) -> List[Dict[str, float]]:
        values = []
        for val in eigvals:
            values.append({
                'real': float(np.real(val)),
                'imag': float(np.imag(val)),
            })
        return values

    @staticmethod
    def _classification(A: np.ndarray, tol: float = 1e-10) -> Tuple[str, Dict[str, float]]:
        traza = float(np.trace(A))
        determinante = float(np.linalg.det(A))
        discriminante = traza * traza - 4.0 * determinante

        if abs(determinante) < tol:
            return "Caso degenerado (det=0)", {
                'trace': traza,
                'det': determinante,
                'disc': discriminante,
            }

        if determinante < 0:
            return "Silla", {
                'trace': traza,
                'det': determinante,
                'disc': discriminante,
            }

        if discriminante > tol:
            if traza > 0:
                label = "Nodo inestable"
            elif traza < 0:
                label = "Nodo estable"
            else:
                label = "Nodo con traza cero"
            return label, {'trace': traza, 'det': determinante, 'disc': discriminante}

        if abs(discriminante) <= tol:
            if traza > 0:
                label = "Nodo degenerado inestable"
            elif traza < 0:
                label = "Nodo degenerado estable"
            else:
                label = "Nodo degenerado (traza cero)"
            return label, {'trace': traza, 'det': determinante, 'disc': discriminante}

        # discriminante < 0
        if abs(traza) < tol:
            label = "Centro"
        elif traza > 0:
            label = "Foco inestable"
        else:
            label = "Foco estable"
        return label, {'trace': traza, 'det': determinante, 'disc': discriminante}

    @staticmethod
    def _equilibrium(A: np.ndarray, B: np.ndarray, tol: float = 1e-10) -> Tuple[Optional[np.ndarray], str]:
        det_a = float(np.linalg.det(A))
        if abs(det_a) < tol:
            return None, "No hay equilibrio unico (det=0)"
        eq = -np.linalg.solve(A, B)
        return eq, "Equilibrio unico"

    @staticmethod
    def _nullcline_line(a: float, b: float, e: float, x_min: float, x_max: float,
                        y_min: float, y_max: float) -> Dict[str, Any]:
        tol = 1e-10
        if abs(a) < tol and abs(b) < tol:
            if abs(e) < tol:
                return {'type': 'all', 'equation': '0 = 0'}
            return {'type': 'none', 'equation': '0 = cte'}

        if abs(b) > tol:
            m = -a / b
            b0 = -e / b
            xs = np.linspace(x_min, x_max, 200)
            ys = m * xs + b0
            return {
                'type': 'line',
                'equation': f"y = ({Dynamic2DLinearService._num(m)}) x + ({Dynamic2DLinearService._num(b0)})",
                'm': float(m),
                'b': float(b0),
                'points': {
                    'x': xs.tolist(),
                    'y': ys.tolist(),
                }
            }

        # b == 0
        x0 = -e / a
        ys = np.linspace(y_min, y_max, 200)
        xs = np.full_like(ys, x0)
        return {
            'type': 'vertical',
            'equation': f"x = {Dynamic2DLinearService._num(x0)}",
            'x': float(x0),
            'points': {
                'x': xs.tolist(),
                'y': ys.tolist(),
            }
        }

    @staticmethod
    def _build_solution(A: np.ndarray, eigvals: np.ndarray, eigvecs: np.ndarray,
                        tol: float = 1e-8) -> Dict[str, Any]:
        eigenvalues = Dynamic2DLinearService._eigenvalues_payload(eigvals)
        solution: Dict[str, Any] = {
            'type': 'unknown',
            'eigenvalues': eigenvalues,
            'eigenvectors': [],
            'generalized': None,
            'formula_latex': '',
        }

        # Detect complex case
        has_complex = any(abs(ev['imag']) > tol for ev in eigenvalues)
        if has_complex:
            idx = 0
            for i, ev in enumerate(eigenvalues):
                if ev['imag'] > 0:
                    idx = i
                    break
            lam = eigvals[idx]
            vec = eigvecs[:, idx]
            a = np.real(vec)
            b = np.imag(vec)
            alpha = float(np.real(lam))
            beta = float(np.imag(lam))

            solution['type'] = 'complex'
            solution['eigenvectors'] = [{
                'real': a.tolist(),
                'imag': b.tolist(),
                'eigenvalue': {'real': alpha, 'imag': beta},
            }]

            a_l = Dynamic2DLinearService._vector_latex(a)
            b_l = Dynamic2DLinearService._vector_latex(b)
            alpha_l = Dynamic2DLinearService._num(alpha)
            beta_l = Dynamic2DLinearService._num(beta)

            solution['formula_latex'] = (
                "X(t) = e^{" + alpha_l + " t} \\left["
                " c_1(" + a_l + "\\cos(" + beta_l + " t) - " + b_l + "\\sin(" + beta_l + " t))"
                " + c_2(" + a_l + "\\sin(" + beta_l + " t) + " + b_l + "\\cos(" + beta_l + " t))"
                "\\right]"
            )
            return solution

        # Real eigenvalues
        real_vals = np.real(eigvals)
        if abs(real_vals[0] - real_vals[1]) > tol:
            idxs = np.argsort(real_vals)
            lam1 = float(real_vals[idxs[0]])
            lam2 = float(real_vals[idxs[1]])
            v1 = np.real(eigvecs[:, idxs[0]])
            v2 = np.real(eigvecs[:, idxs[1]])

            solution['type'] = 'real_distinct'
            solution['eigenvectors'] = [
                {'real': v1.tolist(), 'imag': [0.0, 0.0], 'eigenvalue': {'real': lam1, 'imag': 0.0}},
                {'real': v2.tolist(), 'imag': [0.0, 0.0], 'eigenvalue': {'real': lam2, 'imag': 0.0}},
            ]

            v1_l = Dynamic2DLinearService._vector_latex(v1)
            v2_l = Dynamic2DLinearService._vector_latex(v2)
            lam1_l = Dynamic2DLinearService._num(lam1)
            lam2_l = Dynamic2DLinearService._num(lam2)

            solution['formula_latex'] = (
                "X(t) = c_1 e^{" + lam1_l + " t}" + v1_l
                " + c_2 e^{" + lam2_l + " t}" + v2_l
            )
            return solution

        # Repeated eigenvalue
        lam = float(real_vals[0])
        v = np.real(eigvecs[:, 0])
        rank = int(np.linalg.matrix_rank(np.real(eigvecs), tol=tol))

        if rank >= 2:
            v2 = np.real(eigvecs[:, 1])
            solution['type'] = 'real_repeated'
            solution['eigenvectors'] = [
                {'real': v.tolist(), 'imag': [0.0, 0.0], 'eigenvalue': {'real': lam, 'imag': 0.0}},
                {'real': v2.tolist(), 'imag': [0.0, 0.0], 'eigenvalue': {'real': lam, 'imag': 0.0}},
            ]
            v1_l = Dynamic2DLinearService._vector_latex(v)
            v2_l = Dynamic2DLinearService._vector_latex(v2)
            lam_l = Dynamic2DLinearService._num(lam)
            solution['formula_latex'] = (
                "X(t) = e^{" + lam_l + " t}(c_1" + v1_l + " + c_2" + v2_l + ")"
            )
            return solution

        mat = A - lam * np.eye(2)
        try:
            w = np.linalg.solve(mat, v)
        except np.linalg.LinAlgError:
            w, _, _, _ = np.linalg.lstsq(mat, v, rcond=None)

        solution['type'] = 'real_repeated_defective'
        solution['eigenvectors'] = [
            {'real': v.tolist(), 'imag': [0.0, 0.0], 'eigenvalue': {'real': lam, 'imag': 0.0}},
        ]
        solution['generalized'] = w.tolist()

        v_l = Dynamic2DLinearService._vector_latex(v)
        w_l = Dynamic2DLinearService._vector_latex(w)
        lam_l = Dynamic2DLinearService._num(lam)
        solution['formula_latex'] = (
            "X(t) = e^{" + lam_l + " t}(c_1" + v_l + " + c_2(t" + v_l + " + " + w_l + "))"
        )
        return solution

    @staticmethod
    def _rk4_system(A: np.ndarray, B: np.ndarray, X0: np.ndarray, t0: float, t_fin: float, h: float) -> Tuple[np.ndarray, np.ndarray]:
        t_vals = np.arange(t0, t_fin + h, h, dtype=float)
        X_vals = np.zeros((len(t_vals), 2), dtype=float)
        X_vals[0] = X0

        for i in range(len(t_vals) - 1):
            Xi = X_vals[i]
            h_loc = t_vals[i + 1] - t_vals[i]
            k1 = A @ Xi + B
            k2 = A @ (Xi + h_loc * k1 / 2.0) + B
            k3 = A @ (Xi + h_loc * k2 / 2.0) + B
            k4 = A @ (Xi + h_loc * k3) + B
            X_vals[i + 1] = Xi + (h_loc / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)

        return t_vals, X_vals

    @staticmethod
    def _parse_initials(initials: Optional[List[Any]]) -> List[Tuple[float, float]]:
        results: List[Tuple[float, float]] = []
        if not initials:
            return results
        for item in initials:
            if isinstance(item, dict):
                if 'x' in item and 'y' in item:
                    results.append((float(item['x']), float(item['y'])))
            elif isinstance(item, (list, tuple)) and len(item) >= 2:
                results.append((float(item[0]), float(item[1])))
        return results

    @staticmethod
    def solve(payload: Dict[str, Any]) -> Dict[str, Any]:
        a = float(payload.get('a'))
        b = float(payload.get('b'))
        c = float(payload.get('c'))
        d = float(payload.get('d'))
        e = float(payload.get('e', 0.0))
        f = float(payload.get('f', 0.0))

        A = np.array([[a, b], [c, d]], dtype=float)
        B = np.array([e, f], dtype=float)

        x_min = float(payload.get('x_min', -5))
        x_max = float(payload.get('x_max', 5))
        y_min = float(payload.get('y_min', -5))
        y_max = float(payload.get('y_max', 5))

        t0 = float(payload.get('t0', 0.0))
        t_fin = float(payload.get('t_fin', 10.0))
        h = float(payload.get('h', 0.01))

        grid_n = int(payload.get('grid_n', 25))
        auto_trajectories = bool(payload.get('auto_trajectories', True))
        auto_count = int(payload.get('auto_count', 16))

        eigvals, eigvecs = np.linalg.eig(A)
        classification, inv = Dynamic2DLinearService._classification(A)

        equilibrium, eq_note = Dynamic2DLinearService._equilibrium(A, B)
        eq_payload = {
            'exists': equilibrium is not None,
            'note': eq_note,
        }
        if equilibrium is not None:
            eq_payload['x'] = float(equilibrium[0])
            eq_payload['y'] = float(equilibrium[1])

        solution = Dynamic2DLinearService._build_solution(A, eigvals, eigvecs)

        null_dx = Dynamic2DLinearService._nullcline_line(a, b, e, x_min, x_max, y_min, y_max)
        null_dy = Dynamic2DLinearService._nullcline_line(c, d, f, x_min, x_max, y_min, y_max)

        analysis_steps = [
            f"Matriz A = [[{a}, {b}], [{c}, {d}]]",
            f"Traza = {Dynamic2DLinearService._num(inv['trace'])}",
            f"Determinante = {Dynamic2DLinearService._num(inv['det'])}",
            f"Discriminante = {Dynamic2DLinearService._num(inv['disc'])}",
            f"Clasificacion: {classification}",
        ]

        eigenvalues_payload = Dynamic2DLinearService._eigenvalues_payload(eigvals)

        eigenvectors_payload: List[Dict[str, Any]] = []
        for i in range(2):
            vec = eigvecs[:, i]
            eigenvectors_payload.append({
                'eigenvalue': eigenvalues_payload[i],
                'real': np.real(vec).tolist(),
                'imag': np.imag(vec).tolist(),
            })

        x_vals = np.linspace(x_min, x_max, grid_n)
        y_vals = np.linspace(y_min, y_max, grid_n)
        X_grid, Y_grid = np.meshgrid(x_vals, y_vals)
        U = a * X_grid + b * Y_grid + e
        V = c * X_grid + d * Y_grid + f
        norma = np.sqrt(U * U + V * V)
        norma[norma == 0] = 1.0
        U = U / norma
        V = V / norma

        field = {
            'x': X_grid.flatten().tolist(),
            'y': Y_grid.flatten().tolist(),
            'u': U.flatten().tolist(),
            'v': V.flatten().tolist(),
        }

        initials = Dynamic2DLinearService._parse_initials(payload.get('initial_conditions'))
        if not initials and auto_trajectories:
            count = max(4, auto_count)
            side = int(math.sqrt(count))
            xs = np.linspace(x_min, x_max, side)
            ys = np.linspace(y_min, y_max, side)
            for xi in xs:
                for yi in ys:
                    initials.append((float(xi), float(yi)))

        trajectories = []
        time_series = []
        for x0, y0 in initials:
            t_vals, X_vals = Dynamic2DLinearService._rk4_system(A, B, np.array([x0, y0], dtype=float), t0, t_fin, h)
            trajectories.append({
                'x0': float(x0),
                'y0': float(y0),
                'x': X_vals[:, 0].tolist(),
                'y': X_vals[:, 1].tolist(),
                'source': 'auto' if auto_trajectories else 'manual',
            })
            time_series.append({
                'x0': float(x0),
                'y0': float(y0),
                'x': X_vals[:, 0].tolist(),
                'y': X_vals[:, 1].tolist(),
            })

        eigen_lines = []
        if equilibrium is None:
            eq_center = np.array([0.0, 0.0])
        else:
            eq_center = equilibrium

        for vec_info in eigenvectors_payload:
            if abs(vec_info['eigenvalue']['imag']) < 1e-8:
                vec = np.array(vec_info['real'], dtype=float)
                if np.linalg.norm(vec) > 0:
                    vec = vec / np.linalg.norm(vec)
                scale = min(x_max - x_min, y_max - y_min) * 0.4
                start = eq_center - vec * scale
                end = eq_center + vec * scale
                eigen_lines.append({
                    'x': [float(start[0]), float(end[0])],
                    'y': [float(start[1]), float(end[1])],
                    'label': 'autovector',
                })

        return {
            'system': {
                'a': a, 'b': b, 'c': c, 'd': d,
                'e': e, 'f': f,
                'matrix': [[a, b], [c, d]],
                'vector': [e, f],
            },
            'equilibrium': eq_payload,
            'classification': classification,
            'trace': inv['trace'],
            'determinant': inv['det'],
            'discriminant': inv['disc'],
            'eigen': {
                'values': eigenvalues_payload,
                'vectors': eigenvectors_payload,
            },
            'solution': solution,
            'nullclines': {
                'dx': null_dx,
                'dy': null_dy,
            },
            'analysis': analysis_steps,
            'phase': {
                'field': field,
                'trajectories': trajectories,
                'eigenvectors': eigen_lines,
            },
            'time': {
                't': t_vals.tolist() if initials else [],
                'series': time_series,
            }
        }
