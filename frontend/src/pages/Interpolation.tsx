import { useState } from 'react'
import { interpolationService } from '../services/api'
import PlotlyGraph from '../components/PlotlyGraph'
import IterationsTable from '../components/IterationsTable'
import FormulaDisplay from '../components/FormulaDisplay'
import '../styles/Method.css'

export default function Interpolation() {
  const [input, setInput] = useState({
    func_str: 'sin(x)',
    puntos_x: '-1,0,1',
    puntos_y: '',
    x_eval: '0.5',
    precision: '8'
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
      const puntos_x = input.puntos_x.split(',').map(x => parseFloat(x.trim()))
      const puntos_y = input.puntos_y 
        ? input.puntos_y.split(',').map(y => parseFloat(y.trim()))
        : undefined
      
      const payload = {
        puntos_x,
        x_eval: parseFloat(input.x_eval),
        func_str: input.func_str,
        puntos_y,
        precision: parseInt(input.precision)
      }

      const response = await interpolationService.lagrange(payload)
      setResult(response.data)
    } catch (error: any) {
      setError(error.response?.data?.detail || String(error))
    } finally {
      setLoading(false)
    }
  }

  const generateInterpolationPlot = () => {
    try {
      const puntos_x = input.puntos_x.split(',').map(x => parseFloat(x.trim()))
      const func_str = input.func_str
      const func = new Function('x', `return ${func_str.replace(/\^/g, '**')}`)

      // Generar puntos y para interp
      const puntos_y = puntos_x.map(xi => {
        try {
          return func(xi)
        } catch {
          return NaN
        }
      })

      // Rango para gracar
      const min_x = Math.min(...puntos_x)
      const max_x = Math.max(...puntos_x)
      const range = (max_x - min_x) * 0.2

      const x_plot = Array.from({ length: 200 }, (_, i) => min_x - range + (i / 200) * (2 * range + max_x - min_x))
      const y_func = x_plot.map(xi => {
        try {
          return func(xi)
        } catch {
          return NaN
        }
      })

      return [{
        x: x_plot,
        y: y_func,
        type: 'scatter',
        name: 'f(x) original',
        line: { color: '#0000ff' }
      },
      {
        x: puntos_x,
        y: puntos_y,
        type: 'scatter',
        name: 'Puntos conocidos',
        mode: 'markers',
        marker: { size: 8, color: '#ff0000' }
      }]
    } catch {
      return []
    }
  }

  const theory = {
    nombre: 'Interpolación de Lagrange',
    descripcion: 'Construye un polinomio de grado n-1 que pasa por n puntos dados.',
    formula: 'P(x) = \\sum_{i=0}^{n} y_i L_i(x), \\quad L_i(x) = \\prod_{\\substack{j=0 \\\\ j \\neq i}}^{n} \\frac{x - x_j}{x_i - x_j}',
    condiciones: 'Exacta en los puntos conocidos. Error en extrapolación puede ser grande fuera del rango.',
    parametros: ['f(x): Función original (opcional)', 'puntos_x: Abscisas de los puntos', 'puntos_y: Ordenadas (o usa f(x))', 'x_eval: Punto para evaluar']
  }

  return (
    <div className="method-page">
      <h1>Interpolacion de Lagrange</h1>

      <div className="theory-section">
        <h3>Teoria: {theory.nombre}</h3>
        <p><strong>Descripcion:</strong> {theory.descripcion}</p>
        
        <FormulaDisplay formula={theory.formula} title="Formula:" />
        
        <p><strong>Condiciones:</strong> {theory.condiciones}</p>
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
              <label>f(x) (para generar puntos):</label>
              <input
                type="text"
                value={input.func_str}
                onChange={(e) => setInput({...input, func_str: e.target.value})}
              />
              <small>Ej: sin(x), exp(x), x**2 - opcional si usas puntos_y</small>
            </div>

            <div className="form-group">
              <label>Puntos X (separados por coma):</label>
              <input
                type="text"
                value={input.puntos_x}
                onChange={(e) => setInput({...input, puntos_x: e.target.value})}
              />
              <small>Ej: -1, 0, 1, 2</small>
            </div>

            <div className="form-group">
              <label>Puntos Y (separados por coma, opcional):</label>
              <input
                type="text"
                value={input.puntos_y}
                onChange={(e) => setInput({...input, puntos_y: e.target.value})}
              />
              <small>Si no se completa, usa f(x_i) de la funcion</small>
            </div>

            <div className="form-group">
              <label>Evaluar en x:</label>
              <input
                type="number"
                step="0.01"
                value={input.x_eval}
                onChange={(e) => setInput({...input, x_eval: e.target.value})}
              />
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
              {loading ? 'Interpolando...' : 'Calcular Lagrange'}
            </button>
          </form>
        </div>

        <div className="result-section">
          <h2>Resultados</h2>
          {error && <div className="error-box">Error: {error}</div>}

          {result && !error && (
            <>
              <PlotlyGraph 
                data={generateInterpolationPlot()}
                title={`Interpolacion de Lagrange - f(x) = ${input.func_str}`}
              />

              {result.polinomio && (
                <div className="result-box">
                  <h3>Polinomio Interpolante</h3>
                  <p><code>{result.polinomio}</code></p>
                  <p>Grado: {result.grado}</p>
                </div>
              )}

              {result.puntos && (
                <IterationsTable 
                  iterations={result.puntos}
                  title="Puntos de Interpolacion"
                />
              )}

              {result.x_eval !== undefined && (
                <div className="result-box">
                  <h3>Evaluacion en x = {result.x_eval}</h3>
                  <p><strong>P({result.x_eval}) ≈ {result.P_eval}</strong></p>
                  {result.f_eval !== undefined && (
                    <>
                      <p>f({result.x_eval}) = {result.f_eval}</p>
                      <p>Error local: {result.error_local}</p>
                    </>
                  )}
                </div>
              )}

              <div className="result-box">
                <p>Metodo: {result.metodo}</p>
                <p>Numero de puntos: {result.puntos?.length || 0}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}