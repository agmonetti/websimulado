import { useState } from 'react'
import { interpolationService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'
import MathKeyboard from '../components/MathKeyboard';


export default function Interpolation() {
  const [modo, setModo] = useState('caso1')
  const [input, setInput] = useState({
    func_str: 'sin(x)',
    puntos_x: '0, pi/2, pi',
    puntos_y: '',
    x_eval: 'pi/4', 
    precision: '8'
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleInsert = (text: string) => {
      setInput({ ...input, func_str: input.func_str + text });
  };

  const handleClear = () => {
      setInput({ ...input, func_str: '' });
  };

  // SÚPER TRADUCTOR MATEMÁTICO (Convierte pi/4 -> 0.785...)
  const parseMathExpr = (expr: string): number => {
    if (!expr || expr.trim() === '') return NaN;
    try {
      let safeExpr = expr
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
      const puntos_x = input.puntos_x.split(',').map(x => parseMathExpr(x.trim()))
      if (puntos_x.some(isNaN)) {
        throw new Error("Puntos X contiene expresiones inválidas (ej. use pi/2 o 1/3).")
      }

      let puntos_y = undefined
      if (modo === 'caso2') {
        puntos_y = input.puntos_y.split(',').map(y => parseMathExpr(y.trim()))
        if (puntos_y.some(isNaN)) {
          throw new Error("Puntos Y contiene expresiones inválidas.")
        }
        if (puntos_x.length !== puntos_y.length) {
          throw new Error("La cantidad de puntos X debe ser igual a la de puntos Y.")
        }
      }
      
      const x_eval_str = input.x_eval.trim()
      const x_eval_val = x_eval_str !== '' ? parseMathExpr(x_eval_str) : undefined
      if (x_eval_val !== undefined && isNaN(x_eval_val)) {
        throw new Error("El valor de evaluar en x es inválido (ej. use pi/4 o 1/3).")
      }

      // Traducir 'sen' a 'sin' para que Python no explote
      const funcSegura = modo === 'caso1' ? input.func_str.replace(/sen/gi, 'sin') : undefined;

      const payload = {
        puntos_x,
        x_eval: x_eval_val,
        func_str: funcSegura,
        puntos_y: modo === 'caso2' ? puntos_y : undefined,
        precision: parseInt(input.precision)
      }

      const response = await interpolationService.lagrange(payload)
      setResult(response.data)
    } catch (error: any) {
      setError(error.message || error.response?.data?.detail || String(error))
    } finally {
      setLoading(false)
    }
  }

  const generateInterpolationPlot = () => {
    try {
      const puntos_x = input.puntos_x.split(',').map(x => parseMathExpr(x.trim()))
      const x_eval_str = input.x_eval.trim()
      const has_eval = x_eval_str !== '' 
      const eval_val = has_eval ? parseMathExpr(x_eval_str) : puntos_x[0]
      const valid_eval = has_eval && !isNaN(eval_val)

      const min_x = valid_eval ? Math.min(...puntos_x, eval_val) : Math.min(...puntos_x)
      const max_x = valid_eval ? Math.max(...puntos_x, eval_val) : Math.max(...puntos_x)
      const range = (max_x - min_x) * 0.2
      const x_plot = Array.from({ length: 200 }, (_, i) => min_x - range + (i / 200) * (2 * range + max_x - min_x))

      const plotData: any[] = []

      if (modo === 'caso1') {
        const jsFuncStr = input.func_str
          .replace(/sen/gi, 'sin') // Limpiar 'sen'
          .replace(/\^/g, '**')
          .replace(/\bsin\(/g, 'Math.sin(')
          .replace(/\bcos\(/g, 'Math.cos(')
          .replace(/\bexp\(/g, 'Math.exp(')
          .replace(/\blog\(/g, 'Math.log(')
          .replace(/\bsqrt\(/g, 'Math.sqrt(')
          .replace(/\bpi\b/g, 'Math.PI')
          .replace(/\be\b/g, 'Math.E');

        const func = new Function('x', `return ${jsFuncStr}`)
        
        const y_func = x_plot.map(xi => { try { return func(xi) } catch { return NaN } })
        const puntos_y = puntos_x.map(xi => { try { return func(xi) } catch { return NaN } })

        plotData.push({ x: x_plot, y: y_func, type: 'scatter', name: 'f(x) original', line: { color: '#0000ff' } })
        plotData.push({ x: puntos_x, y: puntos_y, type: 'scatter', name: 'Puntos conocidos', mode: 'markers', marker: { size: 8, color: '#ff0000' } })
      } 
      else if (modo === 'caso2' && result && result.polinomio) {
        const puntos_y = input.puntos_y.split(',').map(y => parseMathExpr(y.trim()))
        const jsPolyStr = result.polinomio.replace(/\*\*/g, '**')
        const polyFunc = new Function('x', `return ${jsPolyStr}`)
        const y_poly = x_plot.map(xi => { try { return polyFunc(xi) } catch { return NaN } })

        plotData.push({ x: x_plot, y: y_poly, type: 'scatter', name: 'P(x) Lagrange', line: { color: '#ffa500', dash: 'dash' } })
        plotData.push({ x: puntos_x, y: puntos_y, type: 'scatter', name: 'Puntos base', mode: 'markers', marker: { size: 8, color: '#ff0000' } })
      }

      if (result && result.P_eval !== undefined && result.x_eval !== undefined) {
        plotData.push({
          x: [result.x_eval], y: [result.P_eval], type: 'scatter', name: `Eval x=${result.x_eval}`,
          mode: 'markers', marker: { size: 10, color: 'green', symbol: 'x' }
        })
      }

      return plotData
    } catch {
      return []
    }
  }

  const theory = {
    nombre: 'Interpolación de Lagrange',
    descripcion: 'Construye un polinomio de grado n-1 que pasa por n puntos dados.',
    formula: 'P(x) = \\sum_{i=0}^{n} y_i L_i(x), \\quad L_i(x) = \\prod_{\\begin{smallmatrix}  j=0 \\\\  i!=j \\end{smallmatrix}}^{n} \\frac{x - x_j}{x_i - x_j}',
    condiciones: 'Exacta en los puntos conocidos. Error en extrapolación puede ser grande fuera del rango.'
  }

  return (
    <div className="method-page">
      <h1>Interpolacion de Lagrange</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <p><strong>Descripcion:</strong> {theory.descripcion}</p>
        <FormulaDisplay formula={theory.formula} title="Formula:" />
        <p><strong>Condiciones:</strong> {theory.condiciones}</p>
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>

          {/* SELECTOR CORREGIDO EN SU LUGAR CORRECTO */}
          <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#c0c0c0', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#000', fontSize: '12px' }}>
              Seleccione el Caso de Uso:
            </label>
            
            <div style={{ display: 'flex' }}>
              <button 
                type="button" 
                onClick={() => setModo('caso1')} 
                style={{ 
                  flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: '#c0c0c0', color: '#000', fontSize: '13px',
                  border: '2px solid',
                  borderColor: modo === 'caso1' ? '#808080 #dfdfdf #dfdfdf #808080' : '#dfdfdf #808080 #808080 #dfdfdf',
                  fontWeight: modo === 'caso1' ? 'bold' : 'normal'
                }}
              >
                Caso 1: Usar f(x)
              </button>

              <button 
                type="button" 
                onClick={() => setModo('caso2')} 
                style={{ 
                  flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: '#c0c0c0', color: '#000', fontSize: '13px',
                  border: '2px solid',
                  borderColor: modo === 'caso2' ? '#808080 #dfdfdf #dfdfdf #808080' : '#dfdfdf #808080 #808080 #dfdfdf',
                  fontWeight: modo === 'caso2' ? 'bold' : 'normal'
                }}
              >
                Caso 2: Puntos Directos
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            
            {modo === 'caso1' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>f(x) (para generar las imágenes):</label>
                  <button type="button" onClick={() => setShowKeyboard(!showKeyboard)} className="btn-keyboard-toggle">
                    {showKeyboard ? '✖ Cerrar' : '⌨ Teclado'}
                  </button>
                </div>
                <input type="text" value={input.func_str} onChange={(e) => setInput({...input, func_str: e.target.value})} />
                {showKeyboard && <MathKeyboard onInsert={handleInsert} onClear={handleClear} />}
                <small>Ej: sin(x), exp(x), x**2</small>
              </div>
            )}

            <div className="form-group">
              <label>Puntos X (separados por coma):</label>
              <input type="text" value={input.puntos_x} onChange={(e) => setInput({...input, puntos_x: e.target.value})} />
              <small>Ej: 0, pi/2, pi</small>
            </div>

            {modo === 'caso2' && (
              <div className="form-group">
                <label>Puntos Y (separados por coma):</label>
                <input type="text" value={input.puntos_y} onChange={(e) => setInput({...input, puntos_y: e.target.value})} />
                <small>Debe haber la misma cantidad que en Puntos X</small>
              </div>
            )}

            {/* GRILLA UNIFICADA PARA EVALUACIÓN Y PRECISIÓN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Evaluar en x (Opcional):</label>
                <input type="text" value={input.x_eval} onChange={(e) => setInput({...input, x_eval: e.target.value})} />
                <small style={{ color: '#0066cc' }}>Ej: pi/4</small>
              </div>

              <div className="form-group">
                <label>Decimales (Visual):</label>
                <input type="number" min="1" max="15" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '10px' }}>
              {loading ? 'Interpolando...' : 'Calcular Lagrange'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Desarrollo y Resultados</h2>
          {error && <div className="error-box">Error: {error}</div>}

          {result && !error && (
            <>
              <PlotlyGraph data={generateInterpolationPlot()} title={modo === 'caso1' ? `Interpolacion: f(x) = ${input.func_str}` : `Interpolacion por Puntos Directos`} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div className="result-box">
                  <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 1. Puntos Evaluados ---</h3>
                  <table style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace' }}>
                    <tbody>
                      {result.puntos.map((pt: any, i: number) => (
                        <tr key={i}>
                          <td style={{ padding: '2px' }}>x_{i} = {pt.x.toFixed(4)}</td><td style={{ padding: '2px', textAlign: 'center' }}>⇒</td><td style={{ padding: '2px' }}>y_{i} = {pt.y.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.terminos && (
                  <div className="result-box">
                    <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 2. Construcción del Polinomio ---</h3>
                    {result.terminos.map((t: any) => (
                      <div key={t.i} style={{ marginBottom: '6px', fontFamily: 'monospace' }}><code>L_{t.i}(x) * y_{t.i} = {t.l_i_y_i}</code></div>
                    ))}
                    <div style={{ marginTop: '12px', padding: '8px', background: '#c0c0c0', border: '1px solid #808080' }}>
                      <strong>Polinomio final aproximado P(x) =</strong>
                      <div style={{ wordBreak: 'break-all', marginTop: '6px', fontFamily: 'monospace', color: '#000080', fontWeight: 'bold' }}>{result.polinomio}</div>
                      <p style={{ marginTop: '6px' }}>Grado: {result.grado}</p>
                    </div>
                  </div>
                )}

                {result.x_eval !== undefined && (
                  <div className="result-box">
                    <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 3. Error Local en {result.x_eval} ---</h3>
                    {result.f_eval !== undefined ? (
                      <div style={{ fontFamily: 'monospace' }}>
                        <p>f({result.x_eval}) = {result.f_eval}</p><p>P({result.x_eval}) = {result.P_eval}</p><p style={{ marginTop: '8px', fontWeight: 'bold', color: '#800000' }}>Error Local = |f({result.x_eval}) - P({result.x_eval})| = {result.error_local}</p>
                      </div>
                    ) : (<p><strong>P({result.x_eval}) = {result.P_eval}</strong></p>)}
                  </div>
                )}

                {result.x_eval !== undefined && modo === 'caso1' && result.analisis_error && (
                  <>
                    <div className="result-box">
                      <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 4. Cota de Error Global ---</h3>
                      <div style={{ fontFamily: 'monospace', lineHeight: '1.6' }}>
                        <p>Necesito la derivada de orden {result.analisis_error.derivada_orden} porque el polinomio es de grado {result.grado} (hay {result.puntos.length} puntos).</p>
                        <p>Derivada {result.analisis_error.derivada_orden} de f(x) = {result.analisis_error.derivada_expr}</p>
                        <p>Máximo de la derivada en el intervalo ~= {result.analisis_error.max_derivada.toFixed(6)}</p>
                        <p>Máximo de |g(x)| en el intervalo ~= {result.analisis_error.max_g.toFixed(6)}</p>
                        <p style={{ marginTop: '8px' }}>Cota de Error Global → ({result.analisis_error.max_derivada.toFixed(6)} / {result.analisis_error.factorial}) * {result.analisis_error.max_g.toFixed(6)} = <strong style={{ color: '#000080' }}>{result.analisis_error.cota_global.toFixed(6)}</strong></p>
                      </div>
                    </div>

                    <div className="result-box" style={{ background: result.analisis_error.exito ? '#c0c0c0' : '#c0c0c0', border: `2px solid ${result.analisis_error.exito ? '#008000' : '#cc0000'}` }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- 5. Demostración Final ---</h3>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: result.analisis_error.exito ? '#008000' : '#cc0000' }}>
                        {result.analisis_error.exito ? '¡Éxito!' : '¡Fallo!'} Cota global ({result.analisis_error.cota_global.toFixed(6)}) {result.analisis_error.exito ? '≥' : '<'} Error Local ({result.error_local.toFixed(6)})
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}