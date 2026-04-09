import { useState } from 'react'
import { rootFindingService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import IterationsTable from '../components/IterationsTable'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'

export default function RootFinding() {
  const [method, setMethod] = useState('biseccion')
  const [input, setInput] = useState({
    func_str: 'exp(x) - x**2 + 3*x - 2',
    g_str: 'sqrt(2)',
    a: '0',
    b: '1',
    x0: '1',
    tol: '1e-6',
    max_iter: '100',
    precision: '8' // <-- Se agregó el estado de precisión
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        precision: parseInt(input.precision) // <-- Se manda al backend
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

  const generateFunctionPlot = () => {
    try {
      let a = parseFloat(input.a)
      let b = parseFloat(input.b)
      const funcStr = input.func_str

      // Si b y a están invertidos, acomodarlos para el gráfico
      if (a > b) {
        const temp = a; a = b; b = temp;
      }

      // Traductor para que JavaScript entienda las funciones matemáticas
      let jsFuncStr = funcStr
        .replace(/\^/g, '**')
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\btan\(/g, 'Math.tan(')
        .replace(/\bexp\(/g, 'Math.exp(')
        .replace(/\blog\(/g, 'Math.log(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E');

      const func = new Function('x', `return ${jsFuncStr}`)

      // Margen visual para no graficar exactamente de A a B
      let margin = (b - a) * 0.2;
      if (margin === 0) margin = 1;
      const xStart = a - margin;
      const xEnd = b + margin;

      const x = Array.from({ length: 200 }, (_, i) => xStart + (i / 200) * (xEnd - xStart))
      const y = x.map(xi => {
        try {
          return func(xi)
        } catch {
          return NaN
        }
      })

      const data: any[] = [{
        x,
        y,
        type: 'scatter',
        name: 'f(x)',
        line: { color: '#000080' }
      }]

      // Si hay resultado, agregar el punto de la raíz encontrada
      if (result && result.raiz !== undefined) {
        data.push({
          x: [result.raiz],
          y: [0], // f(raíz) es aprox 0
          type: 'scatter',
          mode: 'markers',
          name: `Raíz ≈ ${result.raiz.toFixed(4)}`,
          marker: { color: 'red', size: 10 }
        })
      }

      return data;
    } catch {
      return []
    }
  }

  const theories: Record<string, any> = {
    biseccion: {
      nombre: 'Metodo de Biseccion',
      descripcion: 'Encuentra una raiz dividiendo el intervalo a la mitad iterativamente.',
      formula_latex: 'x_n = \\frac{a + b}{2}',
      condiciones: 'Requiere f(a) * f(b) < 0 (signos opuestos)',
      parametros: ['f(x): Funcion continua', 'a, b: Intervalo [a,b]', 'tolerancia: Precision requerida', 'max_iter: Iteraciones maximas', 'precision: Decimales del reporte']
    },
    'punto-fijo': {
      nombre: 'Metodo de Punto Fijo',
      descripcion: 'Resuelve x = g(x) iterativamente: x_n+1 = g(x_n)',
      formula_latex: 'x_{n+1} = g(x_n)',
      condiciones: '|g\'(x0)| < 1 en el intervalo de convergencia',
      parametros: ['g(x): Funcion iterada - Se calcula despejando la x ó alguna x si hay mas de una', 'x0: Valor inicial', 'tolerancia', 'max_iter']
    },
    'newton-raphson': {
      nombre: 'Metodo de Newton-Raphson',
      descripcion: 'Metodo de segundo orden usando derivada: x_n+1 = x_n - f(x_n)/f\'(x_n)',
      formula_latex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}',
      condiciones: 'f\'(x) != 0 en la vecindad de la raiz',
      parametros: ['f(x): Funcion - El script calcula la segunda derivada' , 'x0: Valor inicial', 'tolerancia', 'max_iter']
    },
aitken: {
      nombre: 'Aceleracion de Aitken (Delta-squared)',
      descripcion: 'Acelera la convergencia del punto fijo evaluando 3 puntos sucesivos (x0, x1, x2).',
      formula_latex: 'x^*_n = x_0 - \\frac{(x_1 - x_0)^2}{x_2 - 2x_1 + x_0}',
      condiciones: 'Aplicable sobre punto fijo convergente',
      parametros: ['g(x): Funcion iterada - Se calcula despejando la x ó alguna x si hay mas de una', 'x0: Valor inicial', 'tolerancia', 'max_iter']
    }
  }

  const theory = theories[method]

  return (
    <div className="method-page">
      <h1>Busqueda de Raices</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <p><strong>Descripcion:</strong> {theory.descripcion}</p>
        
        <FormulaDisplay formula={theory.formula_latex} title="Formula:" />
        
        <p><strong>Condiciones:</strong> {theory.condiciones}</p>
        <p><strong>Parametros requeridos:</strong></p>
        <ul>
          {theory.parametros.map((p: string, i: number) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>

          <div className="method-selector">
            <label>Metodo:</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="biseccion">Biseccion</option>
              <option value="punto-fijo">Punto Fijo</option>
              <option value="newton-raphson">Newton-Raphson</option>
              <option value="aitken">Aitken (Acelerado)</option>
            </select>
          </div>

            <form onSubmit={handleSubmit} className="param-form">
            {(method === 'punto-fijo' || method === 'aitken') && (
              <div className="form-group">
                <label>g(x) [Función Iterada]:</label>
                <input
                  type="text"
                  value={input.g_str}
                  onChange={(e) => setInput({...input, g_str: e.target.value})}
                />
                <small style={{ color: '#000080', display: 'block', marginTop: '4px' }}>
                  <strong>Nota:</strong> Debes despejar 'x' de tu f(x)=0 manualmente. 
                  Asegúrate de que |g'(x)| &lt; 1 para no divergir.
                </small>
              </div>
            )}

            {(method === 'biseccion' || method === 'newton-raphson') && (
              <div className="form-group">
                <label>f(x):</label>
                <input
                  type="text"
                  value={input.func_str}
                  onChange={(e) => setInput({...input, func_str: e.target.value})}
                />
                <small>Ej: x**2 - 2 o exp(x) - x</small>
              </div>
            )}

            {method === 'biseccion' && (
              <>
                <div className="form-group">
                  <label>a (limite inferior):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.a}
                    onChange={(e) => setInput({...input, a: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>b (limite superior):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.b}
                    onChange={(e) => setInput({...input, b: e.target.value})}
                  />
                </div>
              </>
            )}

            {(method !== 'biseccion') && (
              <div className="form-group">
                <label>x0 (valor inicial):</label>
                <input
                  type="number"
                  step="0.01"
                  value={input.x0}
                  onChange={(e) => setInput({...input, x0: e.target.value})}
                />
              </div>
            )}

            <div className="form-group">
              <label>Tolerancia (epsilon):</label>
              <input
                type="text"
                value={input.tol}
                onChange={(e) => setInput({...input, tol: e.target.value})}
              />
              <small>Ej: 1e-6 o 0.0001</small>
            </div>

            <div className="form-group">
              <label>Max iteraciones:</label>
              <input
                type="number"
                value={input.max_iter}
                onChange={(e) => setInput({...input, max_iter: e.target.value})}
              />
            </div>
            
            {/* NUEVO INPUT DE PRECISIÓN */}
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
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados</h2>
          {error && <div className="error-box">Error: {error}</div>}

          {result && !error && (
            <>
              <div className="result-box">
                <strong>Raiz encontrada:</strong> {(result.raiz || result.root)?.toFixed(input.precision as any)}
              </div>

              {/* El gráfico ahora se muestra para todos los métodos que tienen f(x) */}
              {(method === 'biseccion' || method === 'newton-raphson') && (
                <PlotlyGraph 
                  data={generateFunctionPlot()}
                  title={`f(x) = ${input.func_str}`}
                />
              )}

{(result.iteraciones || result.iterations) && (
                <IterationsTable 
                  iterations={result.iteraciones || result.iterations}
                  title="Historial de Iteraciones"
                  precision={parseInt(input.precision) || 8} // <-- PASAMOS LA VARIABLE ACÁ
                />
              )}

              <div className="result-box">
                <p>Iter. totales: {result.num_iter}</p>
                <p>Convergencia: {result.convergencia ? 'SI' : 'NO'}</p>
                {result.error_msg && (
                  <p style={{ color: '#cc0000', fontWeight: 'bold', marginTop: '8px' }}>
                    {result.error_msg}
                  </p>
                )}
              </div>
            </>
            
          )}
        </div>
      </div>
    </div>
  )
}