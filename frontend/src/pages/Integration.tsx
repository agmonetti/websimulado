import { useState } from 'react'
import { integrationService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'
import MathKeyboard from '../components/MathKeyboard';


export default function Integration() {
  const [method, setMethod] = useState('trapecio-compuesto')
  const [input, setInput] = useState({
    func_str: 'sin(x)',
    a: '0',
    b: 'pi',
    n: '4',
    precision: '8'
  })

const [showKeyboard, setShowKeyboard] = useState(false);

const handleInsert = (text: string) => {
  setInput({ ...input, func_str: input.func_str + text });
};

const handleClear = () => {
  setInput({ ...input, func_str: '' });
};
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // TRADUCTOR MATEMÁTICO (Convierte pi/2 -> 1.57...)
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
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const a_val = parseMathExpr(input.a)
      const b_val = parseMathExpr(input.b)

      if (isNaN(a_val) || isNaN(b_val)) {
        throw new Error("Los límites 'a' y 'b' contienen expresiones inválidas (Ej: use pi/2).")
      }

      // LÓGICA DE MÉTODOS SIMPLES vs COMPUESTOS
      let n_final = parseInt(input.n)
      if (method === 'trapecio-simple') n_final = 1;
      else if (method === 'simpson13-simple') n_final = 2;
      else if (method === 'simpson38-simple') n_final = 3;

      // VALIDACIÓN MATEMÁTICA ESTRICTA PARA COMPUESTOS
      if (method === 'simpson13-compuesto' && n_final % 2 !== 0) {
        throw new Error("Para Simpson 1/3 Compuesto, el número de subintervalos (n) DEBE ser PAR.");
      }
      if (method === 'simpson38-compuesto' && n_final % 3 !== 0) {
        throw new Error("Para Simpson 3/8 Compuesto, el número de subintervalos (n) DEBE ser MÚLTIPLO DE 3.");
      }

      const payload = {
        func_str: input.func_str.replace(/sen/gi, 'sin'),
        a: a_val,
        b: b_val,
        n: n_final,
        precision: parseInt(input.precision)
      }

      let response;
      // Llamamos al servicio correspondiente (Asegúrate que en api.ts o api.js se llamen así)
      if (method.includes('rectangulo')) {
        response = await integrationService.rectangulo(payload)
      } else if (method.includes('trapecio')) {
        response = await integrationService.trapecio(payload)
      } else if (method.includes('simpson13')) {
        response = await integrationService.simpson13(payload)
      } else if (method.includes('simpson38')) {
        response = await integrationService.simpson38(payload)
      } else {
        throw new Error("Método no mapeado.")
      }

      setResult(response.data)
    } catch (error: any) {
      setError(error.message || error.response?.data?.detail || String(error))
    } finally {
      setLoading(false)
    }
  }

  const generateIntegralPlot = () => {
    try {
      const a_val = parseMathExpr(input.a)
      const b_val = parseMathExpr(input.b)
      if (isNaN(a_val) || isNaN(b_val)) return [];

      const jsFuncStr = input.func_str.replace(/sen/gi, 'sin')
        .replace(/\^/g, '**')
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\bexp\(/g, 'Math.exp(')
        .replace(/\blog\(/g, 'Math.log(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E');

      const func = new Function('x', `return ${jsFuncStr}`)

      // Lógica de márgenes
      const range = b_val - a_val;
      const margin = range * 0.2 || 1;
      const xStart = a_val - margin;
      const xEnd = b_val + margin;

      // Línea de la función completa
      const x_plot = Array.from({ length: 200 }, (_, i) => xStart + (i / 200) * (xEnd - xStart))
      const y_plot = x_plot.map(xi => { try { return func(xi) } catch { return NaN } })

      // Área sombreada bajo la curva (Solo desde 'a' hasta 'b')
      const x_fill = Array.from({ length: 100 }, (_, i) => a_val + (i / 100) * (b_val - a_val))
      const y_fill = x_fill.map(xi => { try { return func(xi) } catch { return NaN } })

      return [
        { x: x_plot, y: y_plot, type: 'scatter', name: 'f(x)', line: { color: '#000080', width: 2 } },
        { 
          x: x_fill, y: y_fill, type: 'scatter', name: 'Área', fill: 'tozeroy', 
          mode: 'none', fillcolor: 'rgba(0, 0, 255, 0.15)' 
        },
        { x: [a_val, a_val], y: [0, func(a_val)], type: 'scatter', mode: 'lines', line: { color: 'red', dash: 'dash' }, name: 'Límite A' },
        { x: [b_val, b_val], y: [0, func(b_val)], type: 'scatter', mode: 'lines', line: { color: 'red', dash: 'dash' }, name: 'Límite B' }
      ]
    } catch {
      return []
    }
  }

const theories: Record<string, any> = {
    'rectangulo-compuesto': {
      nombre: 'Rectángulo Medio (Compuesto)',
      descripcion: 'Aproxima el área usando rectángulos cuya altura es el punto medio del subintervalo.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx h \\sum_{i=0}^{n-1} f\\left( a + \\left(i + \\frac{1}{2}\\right)h \\right) \\\\ h &= \\frac{b-a}{n} \\\\ E_T &= \\frac{(b-a)^3}{24n^2} f^{\\prime\\prime}(\\xi) \\end{aligned}',
    },
    'trapecio-simple': {
      nombre: 'Regla del Trapecio (Simple)',
      descripcion: 'Aproxima el área con un solo trapecio uniendo f(a) y f(b). Equivalente a n=1.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{b-a}{2} [f(a) + f(b)] \\\\ E_T &= -\\frac{(b-a)^3}{12} f^{\\prime\\prime}(\\xi) \\end{aligned}',
    },
    'trapecio-compuesto': {
      nombre: 'Regla del Trapecio (Compuesto)',
      descripcion: 'Aproxima el área dividiendo el rango en n trapecios.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{h}{2} \\left( f(a) + 2\\sum_{i=1}^{n-1}f(a+ih) + f(b) \\right) \\\\ h &= \\frac{b-a}{n} \\\\ E_T &= -\\frac{(b-a)^3}{12n^2} f^{\\prime\\prime}(\\xi) \\end{aligned}',
    },
    'simpson13-simple': {
      nombre: 'Simpson 1/3 (Simple)',
      descripcion: 'Aproxima el área usando una parábola de interpolación. Usa n=2.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{h}{3} [f(x_0) + 4f(x_1) + f(x_2)] \\\\ h &= \\frac{b-a}{2} \\\\ E_T &= -\\frac{(b-a)^5}{2880} f^{(4)}(\\xi) \\end{aligned}',
    },
    'simpson13-compuesto': {
      nombre: 'Simpson 1/3 (Compuesto)',
      descripcion: 'Aproxima el área sumando múltiples parábolas consecutivas. Requiere n PAR.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{h}{3} \\left( f(a) + 4\\sum_{impares} f(a+ih) + 2\\sum_{pares} f(a+ih) + f(b) \\right) \\\\ h &= \\frac{b-a}{n} \\\\ E_T &= -\\frac{(b-a)^5}{180n^4} f^{(4)}(\\xi) \\end{aligned}',
    },
    'simpson38-simple': {
      nombre: 'Simpson 3/8 (Simple)',
      descripcion: 'IMPORTANTE: Solo funciona de 3 en 3 (n=3). Aproxima el área usando un polinomio cúbico de interpolación.',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{3h}{8} [f(a) + 3f(x_1) + 3f(x_2) + f(b)] \\\\ h &= \\frac{b-a}{3} \\\\ E_T &= -\\frac{3h^5}{80} f^{(4)}(\\xi) \\end{aligned}',
    },
    'simpson38-compuesto': {
      nombre: 'Simpson 3/8 (Compuesto)',
      descripcion: 'Extensión compuesta de la regla 3/8. Requiere n MÚLTIPLO DE 3. (Nota: Se omiten los subíndices en las sumatorias por ser ambiguos en la literatura general).',
      formula: '\\begin{aligned} \\int_a^b f(x)dx &\\approx \\frac{3h}{8} \\left( f(x_0) + 3\\sum f(x_i) + 3\\sum f(x_i) + 2\\sum f(x_i) + f(x_n) \\right) \\\\ h &= \\frac{b-a}{n} \\\\ E_T &= -\\frac{(b-a)^5}{80n^4} f^{(4)}(\\xi) \\end{aligned}',
    }
  }
  const theory = theories[method]
  const isSimple = method.includes('-simple')

  return (
    <div className="method-page">
      <h1>Integracion Numerica (Newton-Cotes)</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <p><strong>Descripcion:</strong> {theory.descripcion}</p>
        <FormulaDisplay formula={theory.formula} title="Formula de Cuadratura:" />
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>

          <div className="method-selector">
            <label>Metodo:</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="rectangulo-compuesto">Rectángulo Medio</option>
              <option value="trapecio-simple">Trapecio (Simple)</option>
              <option value="trapecio-compuesto">Trapecio (Compuesto)</option>
              <option value="simpson13-simple">Simpson 1/3 (Simple)</option>
              <option value="simpson13-compuesto">Simpson 1/3 (Compuesto)</option>
              <option value="simpson38-simple">Simpson 3/8 (Simple)</option>
              <option value="simpson38-compuesto">Simpson 3/8 (Compuesto)</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>f(x) a integrar:</label>
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
                placeholder="Ej: sin(x) + exp(x)"
              />
              {showKeyboard && (
                <MathKeyboard 
                  onInsert={(text) => setInput({ ...input, func_str: input.func_str + text })} 
                  onClear={() => setInput({ ...input, func_str: '' })} 
                />
              )}
            </div>

            {/* Layout de grilla para los límites y n */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label>Límite a:</label><input type="number" step="any" value={input.a} onChange={(e) => setInput({...input, a: e.target.value})} /></div>
              <div className="form-group"><label>Límite b:</label><input type="number" step="any" value={input.b} onChange={(e) => setInput({...input, b: e.target.value})} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label>Subintervalos (n):</label><input type="number" value={input.n} onChange={(e) => setInput({...input, n: e.target.value})} /></div>
              <div className="form-group"><label>Decimales:</label><input type="number" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} /></div>
            </div>

            <div className="form-group">
              <label>Límite inferior (a):</label>
              <input type="text" value={input.a} onChange={(e) => setInput({...input, a: e.target.value})} />
              <small>Ej: 0, pi/2</small>
            </div>

            <div className="form-group">
              <label>Límite superior (b):</label>
              <input type="text" value={input.b} onChange={(e) => setInput({...input, b: e.target.value})} />
              <small>Ej: pi, 1</small>
            </div>

            {/* OCULTAMOS EL INPUT SI ES UN MÉTODO SIMPLE */}
            {!isSimple && (
              <div className="form-group">
                <label>Subintervalos (n):</label>
                <input type="number" min="1" value={input.n} onChange={(e) => setInput({...input, n: e.target.value})} />
                {method === 'simpson13-compuesto' && <small style={{ color: '#000080', fontWeight: 'bold' }}>n debe ser PAR</small>}
                {method === 'simpson38-compuesto' && <small style={{ color: '#000080', fontWeight: 'bold' }}>n debe ser MÚLTIPLO DE 3</small>}
              </div>
            )}

            <div className="form-group">
              <label>Decimales (precision):</label>
              <input type="number" min="1" max="15" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Calculando...' : 'Aproximar Integral'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Desarrollo y Resultados</h2>
          
          {/* RENDERIZADO ESPECIAL PARA INTEGRALES IMPROPIAS */}
          {error && (
            <div style={{
              background: error.includes('IMPROPIA') ? '#fff3cd' : '#ffe6e6',
              color: error.includes('IMPROPIA') ? '#856404' : '#cc0000',
              border: `2px solid ${error.includes('IMPROPIA') ? '#ffeeba' : '#cc0000'}`,
              padding: '16px',
              margin: '15px 0',
              borderRadius: '6px',
              fontFamily: 'sans-serif'
            }}>
              {error.includes('IMPROPIA') ? (
                <>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}></span> ALERTA DE INTEGRAL IMPROPIA
                  </div>
                  <div style={{ fontSize: '15px', marginBottom: '10px' }}>
                    <strong>Motivo:</strong> {error.replace('IMPROPIA:', '')}
                  </div>
                  <div style={{ fontSize: '14px', background: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #856404' }}>
                  <strong>Teoría:</strong> Las fórmulas cerradas de Newton-Cotes requieren funciones continuas y acotadas en todo el intervalo {'$[a, b]$'}. Esta integral debe resolverse analíticamente aplicando límites (ej: {'$\\lim_{t \\to a^+}$'}).
                  </div>
                </>
              ) : (
                <div style={{ fontWeight: 'bold' }}>Error: {error}</div>
              )}
            </div>
          )}

          {result && !error && (
            <>
              <PlotlyGraph 
                data={generateIntegralPlot()}
                title={`Integral de f(x) = ${input.func_str} entre ${input.a} y ${input.b}`}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {/* NOTAS Y RESCATES MATEMÁTICOS */}
                {result.notas && result.notas.length > 0 && (
                  <div className="result-box" style={{ background: '#e0f7fa', borderLeft: '4px solid #00acc1', marginBottom: '15px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#006064', fontSize: '15px' }}>
                      <span style={{ fontSize: '18px', marginRight: '5px' }}>ℹ</span> 
                      Rescate Matemático
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '25px', fontSize: '13.5px', color: '#004d40', fontFamily: 'sans-serif' }}>
                      {result.notas.map((nota: string, idx: number) => <li key={idx} style={{ marginBottom: '4px' }}>{nota}</li>)}
                    </ul>
                  </div>
                )}
                {/* TABLA DE VALORES */}
                {result.tabla && (
                  <div className="result-box">
                    <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 1. Tabla de Valores ---</h3>
                    <table style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1px solid #999', padding: '4px' }}>i</th>
                          <th style={{ borderBottom: '1px solid #999', padding: '4px' }}>x_i</th>
                          {'x_medio' in result.tabla[0] && (
                            <th style={{ borderBottom: '1px solid #999', padding: '4px' }}>x_medio</th>
                          )}
                          <th style={{ borderBottom: '1px solid #999', padding: '4px' }}>
                            {'x_medio' in result.tabla[0] ? 'f(x_medio)' : 'f(x_i)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.tabla.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px' }}>{row.i}</td>
                            <td style={{ padding: '4px' }}>{row.x_n?.toFixed(parseInt(input.precision))}</td>
                            {'x_medio' in row && (
                              <td style={{ padding: '4px' }}>
                                {row.x_medio === null ? '-' : row.x_medio.toFixed(parseInt(input.precision))}
                              </td>
                            )}
                            <td style={{ padding: '4px' }}>
                              {'x_medio' in row
                                ? (row.f_x_medio === null ? '-' : row.f_x_medio.toFixed(parseInt(input.precision)))
                                : row.f_x_n?.toFixed(parseInt(input.precision))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DESARROLLO DE LA FÓRMULA */}
                {result.desarrollo && (
                  <div className="result-box">
                    <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 2. Desarrollo de la Fórmula ---</h3>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', padding: '8px', backgroundColor: '#fff', border: '1px solid #999' }}>
                      {result.desarrollo}
                    </div>
                  </div>
                )}

                {/* RESULTADOS FINALES */}
                <div className="result-box">
                  <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 3. Resultados Finales ---</h3>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
                    <p><strong>Aproximación (I):</strong> {result.integral ?? result.resultado}</p>
                    {result.h !== undefined && <p><strong>Paso (h):</strong> {result.h}</p>}
                    
                    {(result.cota_error !== undefined || result.error_truncamiento !== undefined) && (
                      <p style={{ marginTop: '8px', color: '#800000', fontWeight: 'bold' }}>
                        Cota de Error de Truncamiento Maximo (E_t) ≤ {result.cota_error ?? result.error_truncamiento}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}