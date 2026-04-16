import { useState } from 'react'
import { rootFindingService, integrationService, edoService } from '../services/api' 
import PlotlyGraph from '../components/PlotlyGraph'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'
import MathKeyboard from '../components/MathKeyboard';

export default function Comparator() {
  const [mode, setMode] = useState('raices')
  
  const [input, setInput] = useState({
    func_str: 'x - cos(x)',
    g_str: '(pi/2) * x - 2',
    a: '0',
    b: '1',
    x0: '1.4',
    y0: '1',
    h: '0.1',
    n: '4', 
    tol: '1e-6',
    max_iter: '100',
    precision: '6'
  })
  
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeKeyboard, setActiveKeyboard] = useState<string | null>(null);

  const handleInsert = (text: string) => {
      if (mode === 'raices' && (input.g_str !== undefined)) {
          setInput({ ...input, func_str: input.func_str + text });
      } else {
          setInput({ ...input, func_str: input.func_str + text });
      }
  };

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
  }

  // TRADUCTOR MATEMÁTICO: Convierte "pi/10" a 0.314159...
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

  const handleModeChange = (newMode: string) => {
    setMode(newMode)
    setResult(null)
    setError('')
    if (newMode === 'integracion') {
      setInput({ ...input, func_str: 'exp(0.5*x) * (2+cos(1+x**(1.5))) / sqrt(1+0.5*sin(x))', a: '0', b: '2' })
    } else if (newMode === 'edo') {
      // EDO por defecto ahora será el de tu ejercicio
      setInput({ ...input, func_str: 'y * sin(x)', a: '0', b: 'pi', y0: '2', h: 'pi/10' })
    } else {
      setInput({ ...input, func_str: 'x - cos(x)', a: '0', b: '1' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      if (mode === 'raices') {
        const payload = {
          func_str: input.func_str, g_str: input.g_str,
          a: parseMathExpr(input.a), b: parseMathExpr(input.b), x0: parseMathExpr(input.x0),
          tol: parseMathExpr(input.tol), max_iter: parseInt(input.max_iter), precision: parseInt(input.precision)
        }
        const response = await rootFindingService.comparar(payload) 
        setResult({ type: 'raices', data: response.data })
      
      } else if (mode === 'integracion') {
        const payload = {
          func_str: input.func_str, a: parseMathExpr(input.a), b: parseMathExpr(input.b),
          n: parseInt(input.n), precision: parseInt(input.precision)
        }
        const response = await integrationService.comparar(payload)
        setResult({ type: 'integracion', data: response.data })
      
      } else if (mode === 'edo') {
        const x0_val = parseMathExpr(input.a);
        const y0_val = parseMathExpr(input.y0);
        const xf_val = parseMathExpr(input.b);
        const h_val = parseMathExpr(input.h);

        if (isNaN(x0_val) || isNaN(y0_val) || isNaN(xf_val) || isNaN(h_val)) {
            throw new Error("Los parámetros x0, y0, x_f o h contienen expresiones inválidas (Ej: asegúrese de usar 'pi' o 'pi/10').");
        }

        const payload = {
          metodo: 'comparador',
          ecuacion: input.func_str,
          x0: x0_val,
          y0: y0_val,
          xf: xf_val,
          h: h_val
        };
          const response = await edoService.resolver(payload);
        setResult({ type: 'edo', data: response.data });
      }
    } catch (error: any) {
      setError(error.message || error.response?.data?.detail || String(error))
    } finally {
      setLoading(false)
    }
  }

  const createJsFunc = (funcStr: string) => {
    let jsFuncStr = funcStr.toLowerCase()
      .replace(/sen\(/g, 'sin(').replace(/ln\(/g, 'log(').replace(/\^/g, '**')
      .replace(/-([a-zA-Z0-9_.]+)\*\*/g, '-($1)**')
      .replace(/\b(sin|cos|tan|asin|acos|atan|exp|log|sqrt|abs)\(/g, 'Math.$1(')
      .replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E');
    return new Function('x', `return ${jsFuncStr}`);
  }

  // ... (generateRootsPlot, generateConvergencePlot, generateIntegralPlot se mantienen igual)
  const generateRootsPlot = () => {
    if (!result || result.type !== 'raices') return [];
    try {
      const a = parseMathExpr(input.a); const b = parseMathExpr(input.b);
      const func = createJsFunc(input.func_str);
      const margin = (b - a) * 0.5;
      const xStart = a - margin; const xEnd = b + margin;
      const x = Array.from({ length: 200 }, (_, i) => xStart + (i / 200) * (xEnd - xStart));
      const y = x.map(xi => { try { return func(xi) } catch { return NaN } });
      const data: any[] = [{ x, y, type: 'scatter', name: 'f(x)', line: { color: 'black' } }];
      const comp = result.data.comparativa;
      const config = [
        { key: 'biseccion', name: 'Bisección', color: 'red', symbol: 'circle' },
        { key: 'punto_fijo', name: 'Punto Fijo', color: 'blue', symbol: 'square' },
        { key: 'newton_raphson', name: 'Newton-Raphson', color: 'orange', symbol: 'diamond' },
        { key: 'aitken', name: 'Aitken', color: 'green', symbol: 'triangle-up' }
      ];
      config.forEach(cfg => {
        const m = comp[cfg.key];
        if (m && m.raiz !== null && m.raiz !== undefined && m.convergencia) {
          data.push({ x: [m.raiz], y: [func(m.raiz)], type: 'scatter', mode: 'markers', name: `${cfg.name}`, marker: { color: cfg.color, symbol: cfg.symbol, size: 10 } });
        }
      });
      return data;
    } catch { return []; }
  }

  const generateConvergencePlot = () => {
    if (!result || result.type !== 'raices') return [];
    const comp = result.data.comparativa;
    const config = [
        { key: 'biseccion', name: 'Bisección', color: 'red' }, { key: 'punto_fijo', name: 'Punto Fijo', color: 'blue' },
        { key: 'newton_raphson', name: 'Newton-Raphson', color: 'orange' }, { key: 'aitken', name: 'Aitken', color: 'green' }
    ];
    const data: any[] = [];
    config.forEach(cfg => {
        const m = comp[cfg.key];
        if (m && m.iteraciones && m.iteraciones.length > 0) {
            const errores = m.iteraciones.map((it: any) => it.error).filter((e: any) => e > 0);
            const iterX = Array.from({ length: errores.length }, (_, i) => i + 1);
            if (errores.length > 0) data.push({ x: iterX, y: errores, type: 'scatter', mode: 'lines+markers', name: cfg.name, line: { color: cfg.color } });
        }
    });
    return data;
  }

  const generateIntegralPlot = () => {
    if (!result || result.type !== 'integracion') return [];
    try {
      const a = parseMathExpr(input.a); const b = parseMathExpr(input.b);
      const func = createJsFunc(input.func_str);
      const margin = (b - a) * 0.2 || 1;
      const xPlot = Array.from({ length: 400 }, (_, i) => (a - margin) + (i / 400) * ((b + margin) - (a - margin)));
      const yPlot = xPlot.map(xi => { try { return func(xi) } catch { return NaN } });

      const xFill = Array.from({ length: 200 }, (_, i) => a + (i / 200) * (b - a));
      const yFill = xFill.map(xi => { try { return func(xi) } catch { return 0 } });
      
      return [
        { x: xPlot, y: yPlot, type: 'scatter', mode: 'lines', name: 'f(x)', line: { color: 'black', width: 2 } },
        { x: xFill, y: yFill, type: 'scatter', mode: 'none', fill: 'tozeroy', fillcolor: 'rgba(0, 0, 255, 0.2)', name: `Área [${a}, ${b}]` }
      ];
    } catch { return []; }
  }

  const precisionNumber = parseInt(input.precision) || 8;

  return (
    <div className="method-page">
      <h1>Comparación de Métodos Matemáticos</h1>
      <p style={{marginBottom: '20px', color: '#555'}}>Selecciona la familia de métodos que deseas orquestar en paralelo.</p>

      <div className="method-container">
        <div className="form-section">
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              type="button" 
              onClick={() => handleModeChange('raices')}
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: mode === 'raices' ? '#1a237e' : '#f5f5f5', color: mode === 'raices' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s', fontWeight: mode==='raices'?'bold':'normal' }}
            >
              Búsqueda de Raíces
            </button>
            <button 
              type="button" 
              onClick={() => handleModeChange('integracion')}
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: mode === 'integracion' ? '#1a237e' : '#f5f5f5', color: mode === 'integracion' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s', fontWeight: mode==='integracion'?'bold':'normal' }}
            >
              Integración Numérica
            </button>
            <button 
              type="button" 
              onClick={() => handleModeChange('edo')}
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: mode === 'edo' ? '#1a237e' : '#f5f5f5', color: mode === 'edo' ? 'white' : '#333', cursor: 'pointer', transition: 'all 0.2s', fontWeight: mode==='edo'?'bold':'normal' }}
            >
              Ecuaciones Diferenciales
            </button>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>{mode === 'edo' ? 'EDO a integrar ( dy/dx ):' : 'f(x) [Raíces/Newton]:'}</label>
                <button 
                    type="button" 
                    onClick={() => setActiveKeyboard(activeKeyboard === 'f' ? null : 'f')} 
                    style={{fontSize: '11px', padding: '2px 8px', cursor:'pointer', borderRadius:'4px', border:'1px solid #ccc'}}
                >
                    {activeKeyboard === 'f' ? '✖ Cerrar' : '⌨ Teclado'}
                </button>
                </div>
                <input type="text" value={input.func_str} onChange={(e) => setInput({...input, func_str: e.target.value})} />
                {input.func_str && (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center' }}>
                    <FormulaDisplay formula={mode === 'edo' ? `y' = ${formatToLatex(input.func_str)}` : `f(x) = ${formatToLatex(input.func_str)}`} />
                </div>
                )}
                {activeKeyboard === 'f' && (
                <MathKeyboard 
                    onInsert={(text) => setInput({ ...input, func_str: input.func_str + text })} 
                    onClear={() => setInput({ ...input, func_str: '' })} 
                />
                )}
            </div>

            {mode === 'raices' && (
                <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>g(x) [Punto Fijo/Aitken]:</label>
                    <button 
                    type="button" 
                    onClick={() => setActiveKeyboard(activeKeyboard === 'g' ? null : 'g')} 
                    style={{fontSize: '11px', padding: '2px 8px', cursor:'pointer', borderRadius:'4px', border:'1px solid #ccc'}}
                    >
                    {activeKeyboard === 'g' ? '✖ Cerrar' : '⌨ Teclado'}
                    </button>
                </div>
                <input type="text" value={input.g_str} onChange={(e) => setInput({...input, g_str: e.target.value})} />
                {input.g_str && (
                    <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center' }}>
                    <FormulaDisplay formula={`g(x) = ${formatToLatex(input.g_str)}`} />
                    </div>
                )}
                {activeKeyboard === 'g' && (
                    <MathKeyboard 
                    onInsert={(text) => setInput({ ...input, g_str: input.g_str + text })} 
                    onClear={() => setInput({ ...input, g_str: '' })} 
                    />
                )}
                </div>
            )} 

            {/* SE CAMBIARON TODOS LOS input type="number" a type="text" PARA QUE PERMITAN "pi/10" */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>{mode === 'edo' ? 'x₀ (Inicial):' : 'Límite a (Inf):'}</label><input type="text" value={input.a} onChange={(e) => setInput({...input, a: e.target.value})} /></div>
                <div className="form-group"><label>{mode === 'edo' ? 'x_f (Final):' : 'Límite b (Sup):'}</label><input type="text" value={input.b} onChange={(e) => setInput({...input, b: e.target.value})} /></div>
            </div>

            {mode === 'raices' && (
              <>
                <div className="form-group"><label>x0 (Valor Inicial):</label><input type="text" value={input.x0} onChange={(e) => setInput({...input, x0: e.target.value})} /></div>
                <div className="form-group"><label>Tolerancia:</label><input type="text" value={input.tol} onChange={(e) => setInput({...input, tol: e.target.value})} /></div>
              </>
            )}

            {mode === 'integracion' && (
              <div className="form-group">
                <label>Subintervalos (n):</label>
                <input type="number" min="1" value={input.n} onChange={(e) => setInput({...input, n: e.target.value})} />
                <small>Para Simpson 1/3 n debe ser PAR. Para 3/8 MÚLTIPLO DE 3.</small>
              </div>
            )}

            {mode === 'edo' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>y₀ (Condición):</label><input type="text" value={input.y0} onChange={(e) => setInput({...input, y0: e.target.value})} /></div>
                <div className="form-group"><label>Paso (h):</label><input type="text" value={input.h} onChange={(e) => setInput({...input, h: e.target.value})} /></div>
              </div>
            )}

            <div className="form-group"><label>Decimales (Visual):</label><input type="number" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} /></div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {loading ? 'Orquestando Cálculos...' : 'Iniciar Comparativa'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados del Orquestador</h2>
          {error && <div className="error-box" style={{ backgroundColor: '#ffe6e6', color: '#cc0000', padding: '10px', borderRadius: '4px', border: '1px solid #cc0000' }}>Error: {error}</div>}

          {result && !error && (
            <>
              {/* ... Tablas de Raíces e Integración se mantienen igual ... */}
              {result.type === 'raices' && (
                <div className="result-box" style={{ padding: '0', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#1a237e', color: 'white' }}>
                      <tr><th style={{ padding: '12px' }}>Método</th><th style={{ padding: '12px' }}>Conv.</th><th style={{ padding: '12px' }}>Iteraciones</th><th style={{ padding: '12px' }}>Raíz Hallada</th></tr>
                    </thead>
                    <tbody>
                      {['biseccion', 'punto_fijo', 'newton_raphson', 'aitken'].map((key, idx) => {
                        const res = result.data.comparativa[key];
                        const nombres: any = { biseccion: 'Bisección', punto_fijo: 'Punto Fijo', newton_raphson: 'Newton-Raphson', aitken: 'Aceleración de Aitken' };
                        return (
                          <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? '#f5f5f5' : '#fff', borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{nombres[key]}</td>
                            <td style={{ padding: '12px' }}>{res.convergencia ? <span style={{color:'green', fontWeight:'bold'}}>✓ SI</span> : <span style={{color:'red', fontWeight:'bold'}}>✗ NO</span>}</td>
                            <td style={{ padding: '12px' }}>{res.num_iter || '-'}</td>
                            <td style={{ padding: '12px' }}>{res.raiz !== null && res.raiz !== undefined ? res.raiz.toFixed(precisionNumber) : <span style={{color: '#999', fontSize: '0.85em'}}>{res.error_msg}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {result.type === 'integracion' && (
                <div className="result-box" style={{ padding: '0', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#1a237e', color: 'white' }}>
                      <tr><th style={{ padding: '12px' }}>Método</th><th style={{ padding: '12px' }}>Estado</th><th style={{ padding: '12px' }}>Integral (I)</th><th style={{ padding: '12px' }}>Error Máx (E_t)</th></tr>
                    </thead>
                    <tbody>
                      {['rectangulo', 'trapecio', 'simpson_13', 'simpson_38'].map((key, idx) => {
                        const res = result.data.comparativa[key];
                        const nombres: any = { rectangulo: 'Rectángulo Medio', trapecio: 'Trapecio Compuesto', simpson_13: 'Simpson 1/3', simpson_38: 'Simpson 3/8' };
                        return (
                          <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? '#f5f5f5' : '#fff', borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{nombres[key]}</td>
                            <td style={{ padding: '12px' }}>{res.exito ? <span style={{color:'green', fontWeight:'bold'}}>✓ Éxito</span> : <span style={{color:'red', fontWeight:'bold'}}>✗ Error</span>}</td>
                            <td style={{ padding: '12px', fontFamily: 'monospace' }}>{res.integral !== undefined ? res.integral.toFixed(precisionNumber) : '-'}</td>
                            <td style={{ padding: '12px', color: '#d32f2f', fontFamily: 'monospace' }}>{res.cota_error !== undefined ? `±${res.cota_error}` : <span style={{color: '#999', fontSize: '0.85em', fontFamily: 'sans-serif'}}>{res.error_msg}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* === RESULTADOS EDO === */}
              {result.type === 'edo' && result.data && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '15px', backgroundColor: '#eef', padding: '10px', borderRadius: '4px', border: '1px solid #888' }}>
                    <strong>Solución Exacta Analítica:</strong> 
                    <FormulaDisplay formula={`Y_r(x) = ${formatToLatex(result.data.solucion_exacta_str)}`} />
                  </div>

                  {/* TABLA 1: COMPARACIÓN DE MÉTODOS */}
                  <div style={{ overflowX: 'auto', border: '1px solid #888', borderRadius: '4px', marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace', backgroundColor: '#fff' }}>
                      <thead style={{ backgroundColor: '#1a237e', color: 'white' }}>
                        <tr>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>n</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>x_n</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Sol Exacta</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Euler</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Euler M</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Runge-K4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.x_plot.map((x: number, i: number) => {
                          return (
                            <tr key={`val-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center', backgroundColor: '#f9f9f9' }}>{i}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{x.toFixed(4)}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold' }}>{result.data.y_exacta_plot[i] !== null ? result.data.y_exacta_plot[i].toFixed(precisionNumber) : '-'}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{result.data.euler_plot[i].toFixed(precisionNumber)}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{result.data.heun_plot[i].toFixed(precisionNumber)}</td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>{result.data.rk4_plot[i].toFixed(precisionNumber)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* TABLA 2: ERRORES ABSOLUTOS */}
                  <div style={{ overflowX: 'auto', border: '1px solid #888', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace', backgroundColor: '#fff' }}>
                      <thead style={{ backgroundColor: '#1a237e', color: 'white' }}>
                        <tr>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>n</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>x_n</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Error Euler</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>Error Heun</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Error RK4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.x_plot.map((x: number, i: number) => {
                          const y_exacta = result.data.y_exacta_plot[i];
                          if (y_exacta === null) return null;
                          const errEuler = Math.abs(y_exacta - result.data.euler_plot[i]);
                          const errHeun = Math.abs(y_exacta - result.data.heun_plot[i]);
                          const errRk4 = Math.abs(y_exacta - result.data.rk4_plot[i]);
                          
                          return (
                            <tr key={`err-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'center', backgroundColor: '#f9f9f9' }}>{i}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{x.toFixed(4)}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{i === 0 ? '-' : (errEuler < 1e-5 ? errEuler.toExponential(2) : errEuler.toFixed(precisionNumber))}</td>
                              <td style={{ padding: '6px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{i === 0 ? '-' : (errHeun < 1e-5 ? errHeun.toExponential(2) : errHeun.toFixed(precisionNumber))}</td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>{i === 0 ? '-' : (errRk4 < 1e-5 ? errRk4.toExponential(2) : errRk4.toFixed(precisionNumber))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* GRÁFICO 1: COMPARACIÓN DE MÉTODOS */}
                  <div style={{ marginTop: '20px' }}>
                    <PlotlyGraph
                      title={`Comparación de Métodos: dy/dx = ${input.func_str} (h=${input.h})`}
                      data={[
                        { x: result.data.x_plot, y: result.data.y_exacta_plot, type: 'scatter', mode: 'lines', name: 'Solución Exacta', line: { color: 'black', width: 3 } },
                        { x: result.data.x_plot, y: result.data.euler_plot, type: 'scatter', mode: 'lines+markers', name: 'Euler', line: { color: '#FF6B6B', dash: 'dot' } },
                        { x: result.data.x_plot, y: result.data.heun_plot, type: 'scatter', mode: 'lines+markers', name: 'Euler Mejorado', line: { color: '#4ECDC4', dash: 'dash' } },
                        { x: result.data.x_plot, y: result.data.rk4_plot, type: 'scatter', mode: 'lines+markers', name: 'Runge-Kutta 4', line: { color: '#45B7D1', dash: 'dashdot' } }
                      ]}
                    />
                  </div>

                  {/* GRÁFICO 2: EVOLUCIÓN DEL ERROR ABSOLUTO (LOG) */}
                  <div style={{ marginTop: '20px' }}>
                    <PlotlyGraph
                      title="Evolución del Error Absoluto (escala logarítmica)"
                      data={[
                        { 
                          x: result.data.x_plot.slice(1), 
                          y: result.data.x_plot.slice(1).map((_: any, i: number) => Math.abs(result.data.y_exacta_plot[i+1] - result.data.euler_plot[i+1])), 
                          type: 'scatter', mode: 'lines+markers', name: 'Error Euler', line: { color: '#FF6B6B' } 
                        },
                        { 
                          x: result.data.x_plot.slice(1), 
                          y: result.data.x_plot.slice(1).map((_: any, i: number) => Math.abs(result.data.y_exacta_plot[i+1] - result.data.heun_plot[i+1])), 
                          type: 'scatter', mode: 'lines+markers', name: 'Error Euler M.', line: { color: '#4ECDC4' } 
                        },
                        { 
                          x: result.data.x_plot.slice(1), 
                          y: result.data.x_plot.slice(1).map((_: any, i: number) => Math.abs(result.data.y_exacta_plot[i+1] - result.data.rk4_plot[i+1])), 
                          type: 'scatter', mode: 'lines+markers', name: 'Error RK4', line: { color: '#45B7D1' } 
                        }
                      ]}
                      layout={{
                        yaxis: { type: 'log', title: '|Error|' }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* === GRÁFICOS RESTANTES === */}
              {result.type === 'raices' && (
                <>
                  <div style={{ marginTop: '20px' }}><PlotlyGraph data={generateRootsPlot()} title={`Comparativa de Raíces sobre f(x)`} /></div>
                  <div style={{ marginTop: '20px' }}><PlotlyGraph data={generateConvergencePlot()} title={`Historial de Convergencia: Error vs Iteraciones`} layout={{ yaxis: { type: 'log', title: 'Error Absoluto (Log)' }, xaxis: { title: 'Iteración' } }} /></div>
                </>
              )}
              {result.type === 'integracion' && (
                <div style={{ marginTop: '20px' }}><PlotlyGraph data={generateIntegralPlot()} title={`Área de Integración Evaluada`} /></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}