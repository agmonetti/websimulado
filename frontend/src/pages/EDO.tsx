import React, { useState } from 'react';
import PlotlyGraph from '../components/PlotlyGraph';
import FormulaDisplay from '../components/FormulaDisplay';
import MathKeyboard from '../components/MathKeyboard';
import { edoService } from '../services/api';
import '../styles/Method.css';

export default function EDO() {
  const [method, setMethod] = useState('euler');
  const [input, setInput] = useState({
    func_str: 'x + y',
    x0: '0',
    y0: '1',
    xf: '1',
    h: '0.1',
    precision: '5'
  });

  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);

  const formatToLatex = (str: string) => {
    if (!str) return '';
    let latex = str.toLowerCase();
    latex = latex.replace(/\*\*/g, '^'); 
    latex = latex.replace(/\*/g, ' \\cdot '); 
    latex = latex.replace(/exp\(([^)]+)\)/g, 'e^{$1}'); 
    latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}'); 
    latex = latex.replace(/\bpi\b/g, '\\pi');
    latex = latex.replace(/\be\b/g, 'e');
    latex = latex.replace(/sen\(/g, '\\sin(');
    latex = latex.replace(/sin\(/g, '\\sin(');
    latex = latex.replace(/cos\(/g, '\\cos(');
    latex = latex.replace(/tan\(/g, '\\tan(');
    latex = latex.replace(/log\(/g, '\\ln(');
    latex = latex.replace(/ln\(/g, '\\ln(');
    return latex;
  };

  const parseMathExpr = (expr: string): number => {
    if (!expr || expr.trim() === '') return NaN;
    try {
      const safeExpr = expr
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be\b/gi, 'Math.E')
        .replace(/\^/g, '**');
      const res = new Function(`return ${safeExpr}`)();
      return Number(res);
    } catch {
      return NaN;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const x0_val = parseMathExpr(input.x0);
      const y0_val = parseMathExpr(input.y0);
      const xf_val = parseMathExpr(input.xf);
      const h_val = parseMathExpr(input.h);

      if (isNaN(x0_val) || isNaN(y0_val) || isNaN(xf_val) || isNaN(h_val)) {
        throw new Error("Uno o más parámetros (x0, y0, xf, h) contienen expresiones matemáticas inválidas.");
      }

      const res = await edoService.resolver({
        metodo: method,
        ecuacion: input.func_str,
        x0: x0_val,
        y0: y0_val,
        xf: xf_val,
        h: h_val
      });
      setResultado(res.data);
    } catch (err: any) {
      setError(err.message || err.response?.data?.detail || 'Error de conexión con el motor matemático');
    } finally {
      setLoading(false);
    }
  };

  const theories: Record<string, any> = {
    'euler': {
      nombre: 'Método de Euler',
      descripcion: 'Es el procedimiento numérico más directo. Utiliza la pendiente calculada exactamente al inicio del intervalo para proyectar el siguiente punto en línea recta.',
      limitacion: 'Euler no podía controlar el error, lo podía disminuir (achicando el paso h), pero no era suficiente. Asume que la pendiente es constante a lo largo de todo el pequeño intervalo h.',
      formula: 'y_{n+1} = y_n + h \\cdot f(x_n, y_n)',
      variables: [
        'y_{n+1} : Valor de la función en el siguiente paso.',
        'y_n : Valor de la función en el paso actual.',
        'h : Tamaño del paso.',
        'f(x_n, y_n) : La derivada (pendiente) en el punto actual.'
      ]
    },
    'heun': {
      nombre: 'Euler Mejorado (Heun)',
      descripcion: 'Mejora la aproximación de Euler con una idea ingeniosa: en lugar de usar una sola pendiente, utiliza un promedio de dos. Usa Euler estándar como Predictor para hallar un valor preliminar (y*), y luego calcula la pendiente en ese punto futuro para promediarla como Corrector.',
      formula: '\\begin{aligned} y^*_{n+1} &= y_n + h \\cdot f(x_n, y_n) \\\\ y_{n+1} &= y_n + \\frac{h}{2}[f(x_n, y_n) + f(x_{n+1}, y^*_{n+1})] \\end{aligned}',
      variables: [
        'Predicción inicial: En el método de Euler, se utiliza la pendiente del punto inicial para hacer una predicción de la siguiente posición. Esto se representa como una línea recta que sigue la pendiente inicial.  ',
        'Corrección: En el método de Heun, se calcula una segunda pendiente en el punto predicho. Luego, se toma el promedio de la pendiente inicial y la pendiente predicha para obtener una mejor aproximación de la pendiente real en el intervalo.'
      ]
    },
    'rk4': {
      nombre: 'Runge-Kutta de 4to Orden (RK4)',
      descripcion: 'Lleva la idea de "muestrear" pendientes a un nivel superior. Calcula cuatro pendientes (k1, k2, k3, k4) en ubicaciones estratégicas dentro del intervalo para obtener un promedio ponderado increíblemente preciso.',
      formula: '\\begin{aligned} k_1 &= f(x_n, y_n) \\\\ k_2 &= f(x_n + \\frac{h}{2}, y_n + \\frac{h}{2}k_1) \\\\ k_3 &= f(x_n + \\frac{h}{2}, y_n + \\frac{h}{2}k_2) \\\\ k_4 &= f(x_n + h, y_n + hk_3) \\\\ y_{n+1} &= y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4) \\end{aligned}',
      variables: [
        'Pendiente inicial k1: Se calcula la pendiente en el punto actual.  ',
        'Primera corrección k2: Se estima la pendiente en un punto intermedio, avanzando la mitad del paso.  ',
        'Segunda corrección k3: Se vuelve a estimar la pendiente en otro punto intermedio.  ',
        'Corrección final k4: Se calcula la pendiente en el punto final del paso.'
      ]
    }
  };

  const theory = theories[method];
  const dec = parseInt(input.precision) || 5;

  return (
    <div className="method-page">
      <h1>Ecuaciones Diferenciales Ordinarias (EDO)</h1>

      <div className="theory-section">
        <h3>Teoría: {theory.nombre}</h3>
        <p><strong>Descripción:</strong> {theory.descripcion}</p>
        
        {theory.limitacion && (
          <p><strong>Problema:</strong> {theory.limitacion}</p>
        )}


        <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <FormulaDisplay formula={theory.formula} title="Fórmula del Método:" />
        </div>

        {theory.variables && (
          <ul style={{ marginBottom: '15px', paddingLeft: '20px' }}>
            {theory.variables.map((v: string, i: number) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parámetros</h2>

          <div className="method-selector">
            <label>Método:</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="euler">Método de Euler</option>
              <option value="heun">Euler Mejorado (Heun)</option>
              <option value="rk4">Runge-Kutta 4 (RK4)</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>EDO a integrar ( dy/dx ):</label>
                <button 
                  type="button" 
                  onClick={() => setShowKeyboard(!showKeyboard)} 
                  className="btn-keyboard-toggle"
                  style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {showKeyboard ? '✖ Cerrar' : '⌨ Teclado'}
                </button>
              </div>
              <input
                type="text"
                value={input.func_str}
                onChange={(e) => setInput({...input, func_str: e.target.value})}
                placeholder="Ej: x + y"
              />
              {input.func_str && (
                /* BLINDAJE RESPONSIVO */
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center', overflowX: 'auto', width: '100%' }}>
                  <FormulaDisplay formula={`y' = ${formatToLatex(input.func_str)}`} />
                </div>
              )}
              {showKeyboard && (
                <MathKeyboard 
                  onInsert={(text) => setInput({ ...input, func_str: input.func_str + text })} 
                  onClear={() => setInput({ ...input, func_str: '' })} 
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>x₀ (Inicial):</label>
                <input type="text" value={input.x0} onChange={(e) => setInput({...input, x0: e.target.value})} />
              </div>
              <div className="form-group">
                <label>y₀ (Condición):</label>
                <input type="text" value={input.y0} onChange={(e) => setInput({...input, y0: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>x_f (Final):</label>
                <input type="text" value={input.xf} onChange={(e) => setInput({...input, xf: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Paso (h):</label>
                <input type="text" value={input.h} onChange={(e) => setInput({...input, h: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label>Decimales (precision):</label>
              <input type="number" min="1" max="15" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Calculando...' : 'Ejecutar EDO'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Desarrollo y Resultados</h2>
          
          {error && (
            <div style={{ fontWeight: 'bold', color: 'red', marginBottom: '15px' }}>Error: {error}</div>
          )}

          {resultado && !error && (
            <>
              <PlotlyGraph
                title={`Proyección: ${theory.nombre} (h=${resultado.h})`}
                data={[
                  { x: resultado.x_plot, y: resultado.y_exacta_plot, type: 'scatter', mode: 'lines', name: 'Y_r (Exacta)', line: { color: '#000080', width: 2 } },
                  { x: resultado.x_plot, y: resultado.y_plot, type: 'scatter', mode: 'lines+markers', name: `y_n (${method})`, line: { color: '#d32f2f', dash: 'dash' }, marker: { size: 6 } }
                ]}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                
                <div className="result-box">
                  <h3 style={{ margin: '0 0 8px 0', color: '#000080', fontSize: '15px' }}>--- Solución Exacta Analítica ---</h3>
                  {/* BLINDAJE RESPONSIVO */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', overflowX: 'auto', width: '100%' }}>
                    <FormulaDisplay formula={`Y_r(x) = ${formatToLatex(resultado.solucion_exacta_str)}`} />
                  </div>
                </div>

                <div className="result-box" style={{ overflowX: 'auto' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 1. Tabla de Iteraciones ---</h3>
                  <table style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>n</th>
                        <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>x_n</th>
                        <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>y_n</th>
                        {method === 'heun' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>y*_{'{n+1}'} (Pred)</th>}
                        {method === 'heun' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>y_{'{n+1}'} (Corr)</th>}
                        {method === 'rk4' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>k_1</th>}
                        {method === 'rk4' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>k_2</th>}
                        {method === 'rk4' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>k_3</th>}
                        {method === 'rk4' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>k_4</th>}
                        {method !== 'heun' && <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>y_{'{n+1}'}</th>}
                        <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>Y_r</th>
                        <th style={{ borderBottom: '1px solid #999', padding: '4px', textAlign: 'center' }}>ε (Error)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.tabla.map((fila: any, idx: number) => (
                        <tr key={fila.i}>
                          <td style={{ padding: '4px', textAlign: 'center' }}>{fila.i}</td>
                          <td style={{ padding: '4px', textAlign: 'right' }}>{fila.xn.toFixed(4)}</td>
                          <td style={{ padding: '4px', textAlign: 'right' }}>{fila.yn.toFixed(dec)}</td>
                          {method === 'heun' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.y_pred !== null ? fila.y_pred.toFixed(dec) : '-'}</td>}
                          {method === 'heun' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.y_corr !== null ? fila.y_corr.toFixed(dec) : '-'}</td>}
                          {method === 'rk4' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.k1 !== null ? fila.k1.toFixed(dec) : '-'}</td>}
                          {method === 'rk4' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.k2 !== null ? fila.k2.toFixed(dec) : '-'}</td>}
                          {method === 'rk4' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.k3 !== null ? fila.k3.toFixed(dec) : '-'}</td>}
                          {method === 'rk4' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.k4 !== null ? fila.k4.toFixed(dec) : '-'}</td>}
                          {method !== 'heun' && <td style={{ padding: '4px', textAlign: 'right' }}>{fila.yn1 !== null ? fila.yn1.toFixed(dec) : '-'}</td>}
                          <td style={{ padding: '4px', textAlign: 'right' }}>{fila.yr.toFixed(dec)}</td>
                          <td style={{ padding: '4px', textAlign: 'right', color: fila.error > 0.1 ? '#d32f2f' : 'inherit' }}>
                            {fila.i === 0 ? '-' : (fila.error < 1e-4 ? fila.error.toExponential(2) : fila.error.toFixed(dec))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="result-box">
                  <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 2. Resultados Finales ---</h3>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
                    <p><strong>Valor Final Aproximado (y en x_f):</strong> {resultado.y_plot[resultado.y_plot.length - 1].toFixed(dec)}</p>
                    <p><strong>Paso (h):</strong> {resultado.h}</p>
                    <p style={{ marginTop: '8px', color: '#800000', fontWeight: 'bold' }}>
                      Error Final Acumulado: {resultado.tabla[resultado.tabla.length - 1].error.toExponential(4)}
                    </p>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}