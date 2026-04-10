import { useState } from 'react'
import { differentiationService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'
import MathKeyboard from '../components/MathKeyboard';


// COMPONENTE AUXILIAR PARA RENDERIZAR EL ERROR EN DOS FORMATOS
const ErrorCell = ({ errorRaw, precision }: { errorRaw: number, precision: number }) => {
    if (errorRaw === undefined || errorRaw === null) return <span>N/D</span>;
    return (
        <td style={{ padding: '8px', color: '#d32f2f', verticalAlign: 'middle' }}>
            <div style={{ fontSize: '13px', marginBottom: '2px' }}>
                <span style={{ color: '#666' }}>Dec: </span>{errorRaw.toFixed(precision)}
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                <span style={{ color: '#666' }}>Exp: </span>{errorRaw.toExponential(6)}
            </div>
        </td>
    );
}

export default function Differentiation() {
  const [input, setInput] = useState({
    func_str: 'ln(x+1)',
    x_val: 'pi/4',
    h: '0.1',
    precision: '6'
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
      const x_val_parsed = parseMathExpr(input.x_val);
      const h_parsed = parseMathExpr(input.h);

      if (isNaN(x_val_parsed) || isNaN(h_parsed)) {
        throw new Error("El punto x o el paso h contienen expresiones inválidas (ej. use pi/4 o 1/3)");
      }

      const payload = {
        func_str: input.func_str,
        x_val: x_val_parsed,
        h: h_parsed,
        precision: parseInt(input.precision)
      }

      const response = await differentiationService.diferenciasFinitas(payload)
      setResult(response.data)
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || String(error))
    } finally {
      setLoading(false)
    }
  }

const generateDerivativePlot = () => {
    try {
      const x_val = parseMathExpr(input.x_val)
      if (isNaN(x_val)) return [];

      // 1. Normalizamos la función cruda (pasamos sen->sin y ln->log)
      let jsFuncStr = input.func_str.toLowerCase()
        .replace(/sen\(/g, 'sin(')
        .replace(/ln\(/g, 'log(')
        .replace(/\^/g, '**');

      // 2. Ahora sí, le agregamos el prefijo 'Math.' a todas de una sola vez sin pisarnos
      jsFuncStr = jsFuncStr
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\btan\(/g, 'Math.tan(')
        .replace(/\blog\(/g, 'Math.log(')
        .replace(/\bexp\(/g, 'Math.exp(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E');

      const func = new Function('x', `return ${jsFuncStr}`)

      const range = 2
      const x = Array.from({ length: 200 }, (_, i) => x_val - range + (i / 200) * (2 * range))
      const y = x.map(xi => {
        try {
          return func(xi)
        } catch {
          return NaN
        }
      })

      let tangenteData = {};
      if (result && result.derivada_exacta !== undefined) {
         const m = result.derivada_exacta;
         const b = func(x_val) - m * x_val;
         
         const x_tangente = [x_val - 1, x_val + 1];
         const y_tangente = [m * x_tangente[0] + b, m * x_tangente[1] + b];
         
         tangenteData = {
           x: x_tangente,
           y: y_tangente,
           type: 'scatter',
           name: "Recta Tangente Exacta (f')",
           line: { color: '#ff8c00', dash: 'dash' }
         };
      }

      const plotData = [
        {
          x,
          y,
          type: 'scatter',
          name: 'f(x)',
          line: { color: '#000080' }
        },
        {
          x: [x_val],
          y: [func(x_val)],
          type: 'scatter',
          name: `Punto (x=${x_val.toFixed(3)})`,
          mode: 'markers',
          marker: { size: 10, color: '#ff0000' }
        }
      ];

      if (tangenteData && Object.keys(tangenteData).length !== 0) {
          plotData.push(tangenteData as any);
      }

      return plotData;
    } catch {
      return []
    }
  }

  const theory = {
    nombre: 'Diferencias Finitas',
    descripcion: 'Aproxima derivadas numéricamente evaluando la función en puntos cercanos. El método central suele tener menor error que los laterales al cancelar términos impares del polinomio de Taylor.',
    formula_1: "f'(x) \\approx \\frac{f(x+h) - f(x)}{h} \\quad \\text{(Hacia adelante - Progresiva)}",
    formula_2: "f'(x) \\approx \\frac{f(x+h) - f(x-h)}{2h} \\quad \\text{(Central)}",
    parametros: ['f(x): Función a evaluar (ej: sin(x), ln(x+1))', 'Punto x: El valor donde calcular la pendiente', 'Paso h: La distancia entre nodos (ej. 0.1, 0.01)']
  }

  const precisionNumber = parseInt(input.precision) || 8;

  return (
    <div className="method-page">
      <h1>Derivacion Numerica (Diferencias Finitas)</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <p><strong>Descripcion:</strong> {theory.descripcion}</p>
        
        <FormulaDisplay formula={theory.formula_1} title="Ejemplo (Derivada Progresiva):" />
        <FormulaDisplay formula={theory.formula_2} title="Ejemplo (Derivada Central):" />
        
        <p><strong>Parametros:</strong></p>
        <ul>
          {theory.parametros.map((p: string, i: number) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>

          <form onSubmit={handleSubmit} className="param-form">
<div className="form-group">
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <label>f(x):</label>
    <button type="button" onClick={() => setShowKeyboard(!showKeyboard)} className="btn-keyboard-toggle">
      {showKeyboard ? '✖ Cerrar' : '⌨ Teclado'}
    </button>
  </div>
  <input
    type="text"
    value={input.func_str}
    onChange={(e) => setInput({...input, func_str: e.target.value})}
  />
  {showKeyboard && (
    <MathKeyboard 
      onInsert={(text) => setInput({ ...input, func_str: input.func_str + text })} 
      onClear={() => setInput({ ...input, func_str: '' })} 
    />
  )}
</div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
  <div className="form-group"><label>Punto a evaluar (x):</label><input type="text" value={input.x_val} onChange={(e) => setInput({...input, x_val: e.target.value})} /></div>
  <div className="form-group"><label>Paso (h):</label><input type="text" value={input.h} onChange={(e) => setInput({...input, h: e.target.value})} /></div>
</div>



            <div className="form-group">
              <label>Decimales (precision):</label>
              <input
                type="number"
                min="1"
                max="15"
                value={input.precision}
                onChange={(e) => setInput({...input, precision: e.target.value})}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Calculando...' : 'Calcular Derivadas'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados</h2>
          {error && <div className="error-box">Error: {error}</div>}

          {result && !error && (
            <>
              <PlotlyGraph 
                data={generateDerivativePlot()}
                title={`Derivada de f(x) = ${input.func_str} en x = ${input.x_val}`}
              />

              <div className="result-box" style={{ background: '#e8eaf6', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>Valores de Referencia Exactos (Analíticos)</h3>
                <div style={{ display: 'flex', gap: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
                  <div><strong>f(x):</strong> {result.f_x?.toFixed(precisionNumber)}</div>
                  <div><strong>Primera Derivada f'(x):</strong> {result.derivada_exacta?.toFixed(precisionNumber)}</div>
                  <div><strong>Segunda Derivada f''(x):</strong> {result.segunda_derivada_exacta?.toFixed(precisionNumber)}</div>
                </div>
              </div>

              <div className="result-box">
                <h3 style={{ margin: '0 0 10px 0', color: '#000080' }}>--- Resumen de Aproximaciones Numéricas ---</h3>
                
                <table style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ borderBottom: '2px solid #999', padding: '8px' }}>Método</th>
                      <th style={{ borderBottom: '2px solid #999', padding: '8px' }}>Valor Aproximado</th>
                      <th style={{ borderBottom: '2px solid #999', padding: '8px', color: '#d32f2f' }}>Error Absoluto (vs Exacto)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.resultados?.map((res: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>
                          <strong>{res.metodo}</strong><br/>
                          <span style={{ fontSize: '11px', color: '#666' }}>{res.formula}</span>
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'middle' }}>{res.valor?.toFixed(precisionNumber)}</td>
                        {/* CONEXIÓN: Usamos el componente auxiliar que muestra los dos formatos */}
                        <ErrorCell errorRaw={res.error_raw} precision={precisionNumber} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="result-box" style={{ marginTop: '10px' }}>
                <p><strong>Configuración:</strong> Punto numérico evaluado x = {result.x_evaluado} | Paso h = {result.h_usado}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}