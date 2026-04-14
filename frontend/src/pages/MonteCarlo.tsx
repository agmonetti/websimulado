import { useState } from 'react'
import { monteCarloService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import IterationsTable from '../components/IterationsTable'
import FormulaDisplay from '../components/FormulaDisplay'
import MathKeyboard from '../components/MathKeyboard'
import '../styles/Method.css'

export default function MonteCarlo() {
  const [dimension, setDimension] = useState('1d')
  const [method, setMethod] = useState('hit-or-miss-1d')
  
  const [input, setInput] = useState({
    func_str: 'exp(-x**2)',
    a: '0', b: '2',
    ya: '0', yb: '2',
    za: '0', zb: '1',
    N: '10000',
    seed: '',
    M: '1000',
    nivel_confianza: '0.95',
    max_error: '', 
    factor_j: '',     
    precision: '6'
  })
  
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeKeyboard, setActiveKeyboard] = useState<string | null>(null)

  const handleDimensionChange = (dim: string) => {
    setDimension(dim)
    setResult(null)
    setActiveKeyboard(null)
    if (dim === '1d') { setMethod('hit-or-miss-1d'); setInput({...input, func_str: 'exp(-x**2)'}); }
    if (dim === '2d') { setMethod('valor-promedio-2d'); setInput({...input, func_str: 'exp(x+y)', a: '0', b: '2', ya: '1', yb: '3'}); }
    if (dim === '3d') { setMethod('valor-promedio-3d'); setInput({...input, func_str: 'exp(x+y+z)', a: '0', b: '1', ya: '0', yb: '1', za: '0', zb: '1'}); }
    if (dim === 'estadistico') { setMethod('estadistico-1d'); setInput({...input, func_str: 'sin(x)', a: '0', b: '3.14159'}); }
  }

  const handleInsert = (text: string) => setInput({ ...input, func_str: input.func_str + text });

  const createJsFunc = (funcStr: string) => {
    let jsFuncStr = funcStr.toLowerCase()
      .replace(/sen\(/g, 'sin(').replace(/ln\(/g, 'log(').replace(/\^/g, '**')
      .replace(/-([a-zA-Z0-9_.]+)\*\*/g, '-($1)**')
      .replace(/\b(sin|cos|tan|asin|acos|atan|exp|log|sqrt|abs)\(/g, 'Math.$1(')
      .replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E');
    return new Function('x', `return ${jsFuncStr}`);
  }

  const formatToLatex = (str: string) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\*\*/g, '^').replace(/\*/g, ' \\cdot ')
      .replace(/exp\(([^)]+)\)/g, 'e^{$1}').replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/\bpi\b/g, '\\pi').replace(/\be\b/g, 'e')
      .replace(/sen\(/g, '\\sin(').replace(/sin\(/g, '\\sin(')
      .replace(/cos\(/g, '\\cos(').replace(/tan\(/g, '\\tan(')
      .replace(/log\(/g, '\\ln(').replace(/ln\(/g, '\\ln(');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      let response
      const basePayload = {
        func_str: input.func_str, a: parseFloat(input.a), b: parseFloat(input.b),
        N: parseInt(input.N), seed: input.seed !== '' ? parseInt(input.seed) : undefined,
        precision: parseInt(input.precision), nivel_confianza: parseFloat(input.nivel_confianza) 
      }

      switch(method) {
        case 'hit-or-miss-1d': response = await monteCarloService.hitOrMiss(basePayload); break;
        case 'valor-promedio-1d': response = await monteCarloService.valorPromedio1d(basePayload); break;
        case 'convergencia-1d': response = await monteCarloService.convergencia1d(basePayload); break;
        case 'valor-promedio-2d': response = await monteCarloService.valorPromedio2d({ ...basePayload, ya: parseFloat(input.ya), yb: parseFloat(input.yb) }); break;
        case 'valor-promedio-3d': response = await monteCarloService.valorPromedio3d({ ...basePayload, ya: parseFloat(input.ya), yb: parseFloat(input.yb), za: parseFloat(input.za), zb: parseFloat(input.zb) }); break;
        case 'estadistico-1d': response = await monteCarloService.estadistico({ ...basePayload, M: parseInt(input.M) }); break;
        default: return;
      }
      setResult(response.data)
    } catch (error: any) {
      setError(error.response?.data?.detail || String(error))
    } finally {
      setLoading(false)
    }
  }

  const generateMonteCarloPlot = () => {
    if (!result) return [];
    try {
      const data: any[] = [];
      if (method === 'hit-or-miss-1d' && result.historial) {
        const x_exito: number[] = []; const y_exito: number[] = [];
        const x_fallo: number[] = []; const y_fallo: number[] = [];
        result.historial.forEach((pt: any) => {
          if (pt.exito === "✓") { x_exito.push(pt.x); y_exito.push(pt.y_rand); } 
          else { x_fallo.push(pt.x); y_fallo.push(pt.y_rand); }
        });
        
        data.push({ x: x_exito, y: y_exito, type: 'scatter', mode: 'markers', name: 'Éxitos', marker: { color: 'green', size: 4, opacity: 0.6 } });
        data.push({ x: x_fallo, y: y_fallo, type: 'scatter', mode: 'markers', name: 'Fallos', marker: { color: 'red', size: 4, opacity: 0.6 } });
        
        // Ahora usamos los puntos exactos que nos manda Python! Chau error de JS.
        if (result.x_line && result.y_line) {
          data.push({ x: result.x_line, y: result.y_line, type: 'scatter', mode: 'lines', name: 'f(x)', line: { color: 'blue', width: 2 } });
        }
      }
      else if (method === 'valor-promedio-1d' && result.historial) {
        const x_pts = result.historial.map((pt:any) => pt.x);
        const y_pts = result.historial.map((pt:any) => pt.f_x);
        data.push({ x: x_pts, y: y_pts, type: 'scatter', mode: 'markers', name: 'f(x_i)', marker: { color: 'orange', size: 4, opacity: 0.5 } });
        data.push({ x: [parseFloat(input.a), parseFloat(input.b)], y: [result.promedio_fx, result.promedio_fx], type: 'scatter', mode: 'lines', name: 'Media f(x)', line: { color: 'purple', width: 3, dash: 'dash' } });
      }
      else if (method === 'convergencia-1d' && result.historial_convergencia) {
        const ns = result.historial_convergencia.map((pt:any) => pt.N);
        const ints = result.historial_convergencia.map((pt:any) => pt.integral);
        data.push({ x: ns, y: ints, type: 'scatter', mode: 'lines', name: 'Aprox. MC', line: { color: 'blue' } });
        data.push({ x: [ns[0], ns[ns.length-1]], y: [result.valor_exacto_gauss, result.valor_exacto_gauss], type: 'scatter', mode: 'lines', name: 'Exacto (Gauss)', line: { color: 'red', width: 2, dash: 'dash' } });
      }
      else if (method === 'valor-promedio-2d' && result.historial) {
        const x_pts = result.historial.map((pt:any) => pt.x);
        const y_pts = result.historial.map((pt:any) => pt.y);
        const z_pts = result.historial.map((pt:any) => pt.f_xy);
        data.push({ x: x_pts, y: y_pts, type: 'scatter', mode: 'markers', marker: { color: z_pts, colorscale: 'Viridis', showscale: true, size: 5, opacity: 0.8 }, name: 'Muestras 2D' });
      }
      else if (method === 'valor-promedio-3d' && result.historial) {
        const x_pts = result.historial.map((pt:any) => pt.x);
        const y_pts = result.historial.map((pt:any) => pt.y);
        const z_pts = result.historial.map((pt:any) => pt.z);
        const val_pts = result.historial.map((pt:any) => pt.f_xyz);
        data.push({ x: x_pts, y: y_pts, z: z_pts, type: 'scatter3d', mode: 'markers', marker: { color: val_pts, colorscale: 'Plasma', showscale: true, size: 3, opacity: 0.8 }, name: 'Volumen 3D' });
      }
      else if (method === 'estadistico-1d' && result.distribucion) {
        data.push({ x: result.distribucion, type: 'histogram', name: 'Frecuencia', marker: { color: 'skyblue', line: {color: 'black', width: 1} } });
      }
      return data;
    } catch { return []; }
  }

  const renderPizarra = () => {
    if (!result) return null;

    let analisis_j = "";
    if (input.factor_j.trim() !== "") {
        const factor = parseFloat(input.factor_j);
        if (!isNaN(factor) && factor > 0) {
            const n_requerido = Math.ceil(parseInt(input.N) * (factor ** 2));
            analisis_j = `\nPara reducir el error ${factor}x, se necesita N = ${n_requerido}`;
        }
    }

    if (method !== 'convergencia-1d') {
      const z_score = result.z_score || 0;
      const error_std = result.error_std || 0;
      const escala = result.escala || 1; 
      const margen_error = z_score * error_std * escala;
      
      let validacion_texto = "";
      if (input.max_error.trim() !== "") {
          const max_err = parseFloat(input.max_error);
          validacion_texto = margen_error <= max_err 
            ? `Validación: ✓ CUMPLE (Error ${margen_error.toFixed(4)} <= ${max_err})\n` 
            : `Validación: ✗ NO CUMPLE (Error ${margen_error.toFixed(4)} > ${max_err})\n`;
      }

      let encabezado_escala = `Muestras por Réplica (N) = ${result.N}\nTotal de Réplicas (M) = ${result.M}\n`;
      if (method === 'hit-or-miss-1d') encabezado_escala = `Área de la Caja = ${result.area_caja}\nAciertos = ${result.n_exitos}\nDardos (N) = ${result.N}\n`;
      if (method === 'valor-promedio-1d') encabezado_escala = `Escala (Largo) = ${result.escala}\n`;
      if (method === 'valor-promedio-2d') encabezado_escala = `Escala (Área) = ${result.escala}\n`;
      if (method === 'valor-promedio-3d') encabezado_escala = `Escala (Volumen) = ${result.escala}\n`;

      return (
        <div style={{ backgroundColor: '#1e1e1e', color: '#00ff00', padding: '15px', fontFamily: 'monospace', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
{`╔═══════════════════════════════════╗
║    RESULTADOS ESTADÍSTICOS MC     ║
╚═══════════════════════════════════╝
${encabezado_escala}
Î (Integral)  = ${result.integral}
G (Desv. Std) = ${result.desv_estandar}
EE (Err. Std) = ${result.error_std}
Z(α/2)        = ${result.z_score}

┌─ INTERVALO DE CONFIANZA ${(parseFloat(input.nivel_confianza)*100).toFixed(0)}% ─┐
│ Inferior: ${result.ic_inf}
│ Superior: ${result.ic_sup}
│ Ancho IC: ${(result.ic_sup - result.ic_inf).toFixed(parseInt(input.precision))}
└──────────────────────────────┘

${validacion_texto}${analisis_j}`}
        </div>
      );
    }
    return null;
  }

  const variables_f = dimension === '2d' ? 'x,y' : dimension === '3d' ? 'x,y,z' : 'x';

  // FÓRMULAS EXACTAS DE LAS IMÁGENES
  const formula_general = dimension === '2d' 
    ? '\\hat{I} = (b - a) * (d - c) * \\frac{1}{n} \\cdot \\sum_{i=1}^{n} f(x_i, y_i)'
    : dimension === '3d'
    ? '\\hat{I} = (b - a) * (d - c) * (f - e) * \\frac{1}{n} \\cdot \\sum_{i=1}^{n} f(x_i, y_i, z_i)'
    : '\\hat{I} = (b - a) \\cdot \\frac{1}{n} \\cdot \\sum_{i=1}^{n} f(x_i)';

  return (
    <div className="method-page">
      <h1>Motor Monte Carlo - UADE</h1>

      <div className="theory-section">
        <h3>Teoría: Simulación Monte Carlo</h3>
        <p>Aproximación de integrales mediante muestreo aleatorio uniforme y análisis estadístico. Los graficos estan limitados a 2000 puntos para no sobrecargar el sistema</p>
        <p>El factor 'j' se utiliza para reducir el error j veces, ejemplo, si quiero reducir el error en 10 veces, uso j=10 </p>
        <FormulaDisplay formula={formula_general} title="Fórmula de Integración:" />
        {dimension === 'estadistico' && (
           <p style={{marginTop: '5px', fontSize: '11px'}}><strong>Nota (M: Réplicas):</strong> M indica cuántas veces se repite el experimento de N muestras para crear una distribución normal de integrales y medir la varianza real.</p>
        )}
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parámetros de Simulación</h2>

          <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#c0c0c0', border: '2px solid', borderColor: '#dfdfdf #808080 #808080 #dfdfdf' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#000', fontSize: '12px' }}>
              Seleccione la Modalidad:
            </label>
            <div style={{ display: 'flex' }}>
              {['1d', '2d', '3d', 'estadistico'].map((dim) => {
                const labels: any = { '1d': 'Integral 1D', '2d': 'Doble (2D)', '3d': 'Triple (3D)', 'estadistico': 'Estadístico' };
                return (
                  <button 
                    key={dim} type="button" onClick={() => handleDimensionChange(dim)} 
                    style={{ 
                      flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: '#c0c0c0', color: '#000', fontSize: '12px',
                      border: '2px solid', borderColor: dimension === dim ? '#808080 #dfdfdf #dfdfdf #808080' : '#dfdfdf #808080 #808080 #dfdfdf',
                      fontWeight: dimension === dim ? 'bold' : 'normal'
                    }}
                  >
                    {labels[dim]}
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            {dimension === '1d' && (
              <div className="form-group">
                <label>Método de Resolución:</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="hit-or-miss-1d">Hit-or-Miss (Tiro al blanco)</option>
                  <option value="valor-promedio-1d">Valor Promedio (Recomendado)</option>
                  <option value="convergencia-1d">Gráfico de Convergencia</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>f({variables_f}):</label>
                  <button type="button" onClick={() => setActiveKeyboard(activeKeyboard === 'f' ? null : 'f')} className="btn-keyboard-toggle" style={{fontSize: '11px', padding: '2px 8px', cursor:'pointer', borderRadius:'4px', border:'1px solid #ccc'}}>
                      {activeKeyboard === 'f' ? '✖ Cerrar' : '⌨ Teclado'}
                  </button>
              </div>
              <input type="text" value={input.func_str} onChange={(e) => setInput({...input, func_str: e.target.value})} />
              {input.func_str && (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center' }}>
                    <FormulaDisplay formula={`f(${variables_f}) = ${formatToLatex(input.func_str)}`} />
                </div>
              )}
              {activeKeyboard === 'f' && <MathKeyboard onInsert={handleInsert} onClear={() => setInput({...input, func_str: ''})} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label>Límite Inferior X (a):</label><input type="number" step="any" value={input.a} onChange={(e) => setInput({...input, a: e.target.value})} /></div>
              <div className="form-group"><label>Límite Superior X (b):</label><input type="number" step="any" value={input.b} onChange={(e) => setInput({...input, b: e.target.value})} /></div>
            </div>

            {(dimension === '2d' || dimension === '3d') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>Límite Inferior Y (c):</label><input type="number" step="any" value={input.ya} onChange={(e) => setInput({...input, ya: e.target.value})} /></div>
                <div className="form-group"><label>Límite Superior Y (d):</label><input type="number" step="any" value={input.yb} onChange={(e) => setInput({...input, yb: e.target.value})} /></div>
              </div>
            )}

            {dimension === '3d' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>Límite Inferior Z (e):</label><input type="number" step="any" value={input.za} onChange={(e) => setInput({...input, za: e.target.value})} /></div>
                <div className="form-group"><label>Límite Superior Z (f):</label><input type="number" step="any" value={input.zb} onChange={(e) => setInput({...input, zb: e.target.value})} /></div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label>Muestras (N):</label><input type="number" min="100" step="100" value={input.N} onChange={(e) => setInput({...input, N: e.target.value})} /></div>
              <div className="form-group"><label>Seed (Opcional):</label><input type="number" value={input.seed} onChange={(e) => setInput({...input, seed: e.target.value})} placeholder="Ej: 42"/></div>
            </div>

            {dimension === 'estadistico' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>Réplicas (M):</label><input type="number" min="5" value={input.M} onChange={(e) => setInput({...input, M: e.target.value})} /></div>
              </div>
            )}

            {method !== 'convergencia-1d' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '10px', backgroundColor: '#e6ffe6', border: '1px solid #008000', borderRadius: '4px', marginTop: '10px' }}>
                 <div className="form-group" style={{margin: 0}}><label>Confianza (ej: 0.95):</label><input type="number" step="0.01" min="0.5" max="0.99" value={input.nivel_confianza} onChange={(e) => setInput({...input, nivel_confianza: e.target.value})} /></div>
                 <div className="form-group" style={{margin: 0}}><label>Err. Máx (Opcional):</label><input type="number" step="0.01" value={input.max_error} onChange={(e) => setInput({...input, max_error: e.target.value})} /></div>
                 <div className="form-group" style={{margin: 0}}><label>Factor 'j' (Opc):</label><input type="number" step="any" value={input.factor_j} onChange={(e) => setInput({...input, factor_j: e.target.value})} placeholder="Ej: 2"/></div>
              </div>
            )}

            <div className="form-group">
              <label>Decimales (Visual):</label>
              <input type="number" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>
              {loading ? 'Simulando...' : 'Lanzar Simulación'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados de Simulación</h2>
          {error && <div className="error-box">Error: {error}</div>}

          {result && !error && (
            <>
              {renderPizarra()}

              <div style={{ marginTop: '20px' }}>
                <PlotlyGraph 
                  data={generateMonteCarloPlot()} 
                  title={`Simulación: ${result.metodo}`} 
                  layout={method === 'estadistico-1d' ? { barmode: 'overlay' } : {}}
                />
              </div>

              {result.historial && method !== 'convergencia-1d' && method !== 'estadistico-1d' && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- Detalle de Muestras (Max 2000) ---</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc' }}>
                    <IterationsTable iterations={result.historial} precision={parseInt(input.precision)} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}