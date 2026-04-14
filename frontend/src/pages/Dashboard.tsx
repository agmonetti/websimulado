import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <h1>Metodos Numericos - Agustin Monetti - UADE</h1>
      
      <div className="intro-section">
        <p>Selecciona un metodo para comenzar</p>
      </div>

      <div className="grid-methods">
        <div className="method-card" onClick={() => navigate('/root-finding')}>
          <h3>Busqueda de Raices</h3>
          <p>Biseccion, Newton-Raphson, Punto Fijo, Aitken</p>
          <small>Encuentra donde f(x) = 0</small>
        </div>

        <div className="method-card" onClick={() => navigate('/differentiation')}>
          <h3>Diferencias Finitas</h3>
          <p>Calcula f'(x) y f''(x) numericamente</p>
        </div>

        <div className="method-card" onClick={() => navigate('/integration')}>
          <h3>Integracion Numerica</h3>
          <p>Trapecio, Simpson 1/3, Simpson 3/8, Rectangulo Medio</p>
          <small>Aproxima el area bajo la curva</small>
        </div>

        <div className="method-card" onClick={() => navigate('/interpolation')}>
          <h3>Interpolacion</h3>
          <p>Polinomio de Lagrange</p>
          <small>Reconstruye funciones desde puntos</small>
        </div>

        <div className="method-card" onClick={() => navigate('/monte-carlo')}>
          <h3>Monte Carlo</h3>
          <p>Hit-or-Miss, Valor Promedio, Integrales Dobles y Triples</p>
          <small>Resoluciones estocasticas con IC, seed, factor j (reduccion)</small>
        </div>

        <div className="method-card" onClick={() => navigate('/comparator')}>
          <h3>Comparador</h3>
          <p>Analisis comparativo</p>
          <small>Compara metodos lado a lado</small>
        </div>
      </div>
    </div>
  )
}
