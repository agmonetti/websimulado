import { useState } from 'react'
import { rootFindingService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import IterationsTable from '../components/IterationsTable'
import FormulaDisplay from '../components/FormulaDisplay'
import MathKeyboard from '../components/MathKeyboard'
import '../styles/Method.css'

export default function RootFinding() {
  const [method, setMethod] = useState('biseccion')
  const [input, setInput] = useState({
    func_str: 'exp(x) - x**2 + 3*x - 2',
    g_str: 'x - (exp(x) - x**2 + 3*x - 2) / (exp(x) - 2*x + 3)', 
    a: '0',
    b: '1',
    x0: '1',
    tol: '1e-6',
    max_iter: '100',
    precision: '8'
  })
  
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ¡ACÁ ESTABA EL ERROR! Reemplazamos showKeyboard por activeKeyboard
  const [activeKeyboard, setActiveKeyboard] = useState<string | null>(null)

  const handleInsert = (text: string) => {
    if (method === 'punto-fijo' || method === 'aitken') {
      setInput({ ...input, g_str: input.g_str + text });
    } else {
      setInput({ ...input, func_str: input.func_str + text });
    }
  };

  const handleClear = () => {
    if (method === 'punto-fijo' || method === 'aitken') {
      setInput({ ...input, g_str: '' });
    } else {
      setInput({ ...input, func_str: '' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      let response
      const basePayload = {
        func_str: input.func_str,
        g_str: input.g_str,
        a: input.a ? parseFloat(input.a) : undefined,
        b: input.b ? parseFloat(input.b) : undefined,
        x0: parseFloat(input.x0),
        tol: parseFloat(input.tol),
        max_iter: parseInt(input.max_iter),
        precision: parseInt(input.precision)
      }

      switch(method) {
        case 'biseccion':
          response = await rootFindingService.biseccion(basePayload)
          break
        case 'punto-fijo':
          response = await rootFindingService.puntoFijo(basePayload)
          break
        case 'newton-raphson':
          response = await rootFindingService.newtonRaphson(basePayload)
          break
        case 'aitken':
          response = await rootFindingService.aitken(basePayload)
          break
        default:
          return
      }

      setResult(response.data)
    } catch (error: any) {
      setError(error.response?.data?.detail || String(error))
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

  const generateFunctionPlot = () => {
    try {
      let a = parseFloat(input.a) || -5;
      let b = parseFloat(input.b) || 5;
      const funcStr = input.func_str

      if (a > b) { const temp = a; a = b; b = temp; }

      const func = createJsFunc(funcStr)

      let margin = (b - a) * 0.2;
      if (margin === 0) margin = 1;
      const xStart = a - margin;
      const xEnd = b + margin;

      const x = Array.from({ length: 200 }, (_, i) => xStart + (i / 200) * (xEnd - xStart))
      const y = x.map(xi => { try { return func(xi) } catch { return NaN } })

      const data: any[] = [{ x, y, type: 'scatter', name: 'f(x)', line: { color: '#000080' } }]

      if (result && result.raiz !== undefined) {
        data.push({
          x: [result.raiz],
          y: [0],
          type: 'scatter',
          mode: 'markers',
          name: `Raíz ≈ ${result.raiz.toFixed(4)}`,
          marker: { color: 'red', size: 10 }
        })
      }
      return data;
    } catch { return [] }
  }

  const theories: Record<string, any> = {
    biseccion: {
      nombre: 'Metodo de Biseccion',
      formula_latex: 'x_n = \\frac{a + b}{2}',
      parametros: ['f(x): Funcion continua', 'a, b: Intervalo', 'tolerancia', 'precision']
    },
    'punto-fijo': {
      nombre: 'Metodo de Punto Fijo',
      formula_latex: 'x_{n+1} = g(x_n)',
      parametros: ['g(x): Funcion despejada', 'x0: Inicial', 'tolerancia']
    },
    'newton-raphson': {
      nombre: 'Metodo de Newton-Raphson',
      formula_latex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}',
      parametros: ['f(x): Funcion', 'x0: Inicial', 'tolerancia']
    },
    aitken: {
      nombre: 'Aceleracion de Aitken',
      formula_latex: 'x^*_n = x_0 - \\frac{(x_1 - x_0)^2}{x_2 - 2x_1 + x_0}',
      parametros: ['g(x): Funcion despejada', 'x0: Inicial', 'tolerancia']
    }
  }

  const theory = theories[method]

  return (
    <div className="method-page">
      <h1>Busqueda de Raices</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <FormulaDisplay formula={theory.formula_latex} title="Formula:" />
        <p><strong>Parametros requeridos:</strong></p>
        <ul>{theory.parametros.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>
          <div className="method-selector">
            <label>Metodo:</label>
            {/* También ajustamos acá para que use setActiveKeyboard(null) */}
            <select value={method} onChange={(e) => { setMethod(e.target.value); setResult(null); setActiveKeyboard(null); }}>
              <option value="biseccion">Biseccion</option>
              <option value="punto-fijo">Punto Fijo</option>
              <option value="newton-raphson">Newton-Raphson</option>
              <option value="aitken">Aitken (Acelerado)</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="param-form">
            {(method === 'punto-fijo' || method === 'aitken') && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>g(x) [Función Iterada]:</label>
                    <button type="button" onClick={() => setActiveKeyboard(activeKeyboard === 'g' ? null : 'g')} className="btn-keyboard-toggle" style={{fontSize: '11px', padding: '2px 8px', cursor:'pointer', borderRadius:'4px', border:'1px solid #ccc'}}>
                        {activeKeyboard === 'g' ? '✖ Cerrar' : '⌨ Teclado'}
                    </button>
                </div>
                <input type="text" value={input.g_str} onChange={(e) => setInput({...input, g_str: e.target.value})} />
                
                {input.g_str && (
                  <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center' }}>
                     <FormulaDisplay formula={`g(x) = ${formatToLatex(input.g_str)}`} />
                  </div>
                )}

                {activeKeyboard === 'g' && <MathKeyboard onInsert={(t) => setInput({...input, g_str: input.g_str + t})} onClear={() => setInput({...input, g_str: ''})} />}
              </div>
            )}

            {(method === 'biseccion' || method === 'newton-raphson') && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>f(x):</label>
                    <button type="button" onClick={() => setActiveKeyboard(activeKeyboard === 'f' ? null : 'f')} className="btn-keyboard-toggle" style={{fontSize: '11px', padding: '2px 8px', cursor:'pointer', borderRadius:'4px', border:'1px solid #ccc'}}>
                        {activeKeyboard === 'f' ? '✖ Cerrar' : '⌨ Teclado'}
                    </button>
                </div>
                <input type="text" value={input.func_str} onChange={(e) => setInput({...input, func_str: e.target.value})} />
                
                {input.func_str && (
                  <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px', display: 'flex', justifyContent: 'center', minHeight: '40px', alignItems: 'center' }}>
                     <FormulaDisplay formula={`f(x) = ${formatToLatex(input.func_str)}`} />
                  </div>
                )}

                {activeKeyboard === 'f' && <MathKeyboard onInsert={(t) => setInput({...input, func_str: input.func_str + t})} onClear={() => setInput({...input, func_str: ''})} />}
              </div>
            )}

            {method === 'biseccion' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>a:</label><input type="number" step="any" value={input.a} onChange={(e) => setInput({...input, a: e.target.value})} /></div>
                <div className="form-group"><label>b:</label><input type="number" step="any" value={input.b} onChange={(e) => setInput({...input, b: e.target.value})} /></div>
              </div>
            ) : (
              <div className="form-group"><label>x0 (Valor Inicial):</label><input type="number" step="any" value={input.x0} onChange={(e) => setInput({...input, x0: e.target.value})} /></div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label>Tolerancia:</label><input type="text" value={input.tol} onChange={(e) => setInput({...input, tol: e.target.value})} /></div>
                <div className="form-group"><label>Decimales:</label><input type="number" value={input.precision} onChange={(e) => setInput({...input, precision: e.target.value})} /></div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados</h2>
          {error && <div className="error-box">Error: {error}</div>}
          {result && !error && (
            <>
              <div className="result-box"><strong>Raiz encontrada:</strong> {result.raiz?.toFixed(parseInt(input.precision))}</div>
              {(method === 'biseccion' || method === 'newton-raphson') && <PlotlyGraph data={generateFunctionPlot()} title={`f(x) = ${input.func_str}`} />}
              <IterationsTable iterations={result.iteraciones} precision={parseInt(input.precision)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}