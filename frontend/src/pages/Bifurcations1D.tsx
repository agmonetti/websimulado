import React, { useEffect, useMemo, useRef, useState } from 'react'
import PlotlyGraph from '../components/PlotlyGraph'
import FormulaDisplay from '../components/FormulaDisplay'
import MathKeyboard from '../components/MathKeyboard'
import { dynamic1DService } from '../services/api'
import '../styles/Method.css'

type Equilibrium = {
  x: number
  fprime: number | null
  stability: string
  stability_reason?: string
}

type PhaseResponse = {
  x: number[]
  fx: number[]
  flow: { x: number; dir: number }[]
}

type BifurcationEquilibrium = {
  param: number
  x: number
  fprime: number | null
  stability: string
  stability_reason?: string
}

type BifurcationResponse = {
  model: string
  equation: string
  bif_param: string
  bifurcation: {
    param_values: number[]
    equilibria: BifurcationEquilibrium[]
  }
  phase_slices: { param: number; equilibria: Equilibrium[]; phase: PhaseResponse }[]
  exact_analysis?: {
    existence?: string | null
    roots?: { root: string; existence?: string | null }[]
    stability?: { root: string; derivative: string; stable_when?: string | null; unstable_when?: string | null }[]
    derivative?: string
    model_hint?: string
  } | null
}

const bifurcationDefaults: Record<string, {
  func_str: string
  param: string
  min: number
  max: number
  steps: number
  phase: string
  x_min: number
  x_max: number
}> = {
  saddle_node_pos: {
    func_str: 'r + x^2',
    param: 'r',
    min: -2,
    max: 2,
    steps: 80,
    phase: '-1, 0, 1',
    x_min: -2,
    x_max: 2
  },
  saddle_node_neg: {
    func_str: 'r - x^2',
    param: 'r',
    min: -2,
    max: 2,
    steps: 80,
    phase: '-1, 0, 1',
    x_min: -2,
    x_max: 2
  },
  pitchfork: {
    func_str: 'r*x - x^3',
    param: 'r',
    min: -2,
    max: 2,
    steps: 80,
    phase: '-1, 0, 1',
    x_min: -2,
    x_max: 2
  },
  transcritical: {
    func_str: 'r*x - x^2',
    param: 'r',
    min: -2,
    max: 2,
    steps: 80,
    phase: '-1, 0, 1',
    x_min: -2,
    x_max: 2
  },
  transcritical_shift: {
    func_str: '(r-2)*x - x^2',
    param: 'r',
    min: -1,
    max: 4,
    steps: 80,
    phase: '0, 2, 3',
    x_min: -2,
    x_max: 3
  },
  custom: {
    func_str: 'r*x - x^3',
    param: 'r',
    min: -2,
    max: 2,
    steps: 80,
    phase: '-1, 0, 1',
    x_min: -2,
    x_max: 2
  }
}

const parseMathExpr = (expr: string): number => {
  if (!expr || expr.trim() === '') return NaN
  try {
    const safeExpr = expr
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/gi, 'Math.E')
      .replace(/\^/g, '**')
    const res = new Function(`return ${safeExpr}`)()
    return Number(res)
  } catch {
    return NaN
  }
}

const parseNumberList = (raw: string): number[] => {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const values = parts.map(parseMathExpr)
  if (values.some((v) => !Number.isFinite(v))) {
    return []
  }
  return values
}

const formatToLatex = (str: string) => {
  if (!str) return ''
  return str.toLowerCase()
    .replace(/<=/g, '\\le')
    .replace(/>=/g, '\\ge')
    .replace(/\*\*/g, '^')
    .replace(/\*/g, ' \\cdot ')
    .replace(/exp\(([^)]+)\)/g, 'e^{$1}')
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/\bpi\b/g, '\\pi')
    .replace(/\be\b/g, 'e')
    .replace(/\bmu\b/g, '\\mu')
    .replace(/\bta\b/g, 'T_a')
    .replace(/sen\(/g, '\\sin(')
    .replace(/sin\(/g, '\\sin(')
    .replace(/cos\(/g, '\\cos(')
    .replace(/tan\(/g, '\\tan(')
    .replace(/log\(/g, '\\ln(')
    .replace(/ln\(/g, '\\ln(')
}

const simplifyCondition = (raw?: string | null) => {
  if (!raw) return ''
  const normalized = raw
    .replace(/true/gi, 'siempre')
    .replace(/false/gi, 'nunca')
    .replace(/-oo/gi, '-inf')
    .replace(/\boo\b/gi, 'inf')

  const compact = normalized
    .replace(/\(-inf < ([a-zA-Z_][\w]*)\)\s*&\s*\(\1 < inf\)/g, 'siempre')
    .replace(/\(-inf < ([a-zA-Z_][\w]*)\)\s*&\s*\(\1 <= 0\)/g, '$1 <= 0')
    .replace(/\(-inf < ([a-zA-Z_][\w]*)\)\s*&\s*\(\1 < 0\)/g, '$1 < 0')
    .replace(/\(0 <= ([a-zA-Z_][\w]*)\)\s*&\s*\(\1 < inf\)/g, '$1 >= 0')
    .replace(/\(0 < ([a-zA-Z_][\w]*)\)\s*&\s*\(\1 < inf\)/g, '$1 > 0')

  return compact
}

export default function Bifurcations1D() {
  const [bifModel, setBifModel] = useState('saddle_node_pos')
  const [bifFuncStr, setBifFuncStr] = useState('r + x^2')
  const [bifXMin, setBifXMin] = useState('-2')
  const [bifXMax, setBifXMax] = useState('2')
  const [showBifKeyboard, setShowBifKeyboard] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [liveParam, setLiveParam] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const [bifParam, setBifParam] = useState('r')
  const [bifMin, setBifMin] = useState('-2')
  const [bifMax, setBifMax] = useState('2')
  const [bifSteps, setBifSteps] = useState('80')
  const [phaseParams, setPhaseParams] = useState('-1, 0, 1')

  const [bifResult, setBifResult] = useState<BifurcationResponse | null>(null)
  const [bifError, setBifError] = useState('')
  const [bifLoading, setBifLoading] = useState(false)
  const [livePhase, setLivePhase] = useState<{ param: number; phase: PhaseResponse; equilibria: Equilibrium[] } | null>(null)
  const [livePhaseLoading, setLivePhaseLoading] = useState(false)
  const [livePhaseError, setLivePhaseError] = useState('')
  const playRef = useRef<number | null>(null)
  const livePhaseRef = useRef<number | null>(null)
  const livePhaseTimerRef = useRef<number | null>(null)
  const lastLivePhaseAtRef = useRef(0)

  const formatNumber = (value: number | null | undefined, digits = 6) => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'n/a'
    return value.toFixed(digits)
  }

  const applyBifurcationDefaults = (selected: string) => {
    const defaults = bifurcationDefaults[selected]
    if (!defaults) return
    setBifFuncStr(defaults.func_str)
    setBifParam(defaults.param)
    setBifMin(String(defaults.min))
    setBifMax(String(defaults.max))
    setBifSteps(String(defaults.steps))
    setPhaseParams(defaults.phase)
    setBifXMin(String(defaults.x_min))
    setBifXMax(String(defaults.x_max))
    setLiveParam(defaults.min)
  }

  const getParamRange = () => {
    const min = parseMathExpr(bifMin)
    const max = parseMathExpr(bifMax)
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1 }
    }
    return { min, max }
  }

  const getParamStep = () => {
    const { min, max } = getParamRange()
    const steps = parseInt(bifSteps, 10)
    if (!Number.isFinite(steps) || steps < 2) return Math.max(0.01, (max - min) / 100)
    return (max - min) / (steps - 1)
  }

  useEffect(() => {
    const { min, max } = getParamRange()
    setLiveParam((prev) => Math.min(max, Math.max(min, prev)))
  }, [bifMin, bifMax])

  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) {
        window.clearInterval(playRef.current)
        playRef.current = null
      }
      return
    }
    const { min, max } = getParamRange()
    const step = getParamStep()
    if (!Number.isFinite(step) || step <= 0) return
    playRef.current = window.setInterval(() => {
      setLiveParam((prev) => {
        const next = prev + step
        if (next > max) return min
        return next
      })
    }, 200)
    return () => {
      if (playRef.current) {
        window.clearInterval(playRef.current)
        playRef.current = null
      }
    }
  }, [isPlaying, bifMin, bifMax, bifSteps])

  const buildBifurcationPayload = () => {
    if (!bifFuncStr || bifFuncStr.trim() === '') {
      throw new Error('La ecuacion de bifurcacion es obligatoria.')
    }
    const xMinVal = parseMathExpr(bifXMin)
    const xMaxVal = parseMathExpr(bifXMax)
    const bifMinVal = parseMathExpr(bifMin)
    const bifMaxVal = parseMathExpr(bifMax)
    const bifStepsVal = parseInt(bifSteps, 10)
    const phaseList = parseNumberList(phaseParams)

    if (!Number.isFinite(xMinVal) || !Number.isFinite(xMaxVal)) {
      throw new Error('Rangos invalidos en x_min o x_max.')
    }
    if (!Number.isFinite(bifMinVal) || !Number.isFinite(bifMaxVal) || !Number.isFinite(bifStepsVal)) {
      throw new Error('Rangos invalidos para el parametro de bifurcacion.')
    }
    if (bifStepsVal < 2) {
      throw new Error('El numero de pasos debe ser mayor o igual a 2.')
    }
    if (!bifParam || bifParam.trim() === '') {
      throw new Error('El nombre del parametro de bifurcacion es obligatorio.')
    }

    return {
      model: 'custom',
      func_str: bifFuncStr,
      params: {},
      control_enabled: false,
      x_min: xMinVal,
      x_max: xMaxVal,
      n_phase: 400,
      bif_param: bifParam.trim(),
      bif_model: bifModel,
      bif_min: bifMinVal,
      bif_max: bifMaxVal,
      bif_steps: bifStepsVal,
      phase_params: phaseList
    }
  }

  const handleBifurcation = async () => {
    if (bifLoading) return
    setBifError('')
    setBifResult(null)

    try {
      const payload = buildBifurcationPayload()
      setBifLoading(true)
      const res = await dynamic1DService.bifurcation(payload)
      setBifResult(res.data)
    } catch (err: any) {
      setBifError(err.message || err.response?.data?.detail || 'Error al calcular bifurcaciones')
    } finally {
      setBifLoading(false)
    }
  }

  const buildPhasePlot = (phase: PhaseResponse, eqPoints: Equilibrium[]) => {
    const eqStable = eqPoints.filter((p) => p.stability === 'estable')
    const eqUnstable = eqPoints.filter((p) => p.stability === 'inestable')
    const eqSemi = eqPoints.filter((p) => p.stability === 'semiestable')

    const flowRight = phase.flow.filter((f) => f.dir > 0)
    const flowLeft = phase.flow.filter((f) => f.dir < 0)

    return {
      data: [
        {
          x: phase.x,
          y: phase.fx,
          type: 'scatter',
          mode: 'lines',
          name: 'f(x)'
        },
        {
          x: eqStable.map((p) => p.x),
          y: eqStable.map(() => 0),
          type: 'scatter',
          mode: 'markers',
          name: 'Estable',
          marker: { color: 'green', size: 10 }
        },
        {
          x: eqUnstable.map((p) => p.x),
          y: eqUnstable.map(() => 0),
          type: 'scatter',
          mode: 'markers',
          name: 'Inestable',
          marker: { color: 'red', size: 10, symbol: 'circle-open' }
        },
        {
          x: eqSemi.map((p) => p.x),
          y: eqSemi.map(() => 0),
          type: 'scatter',
          mode: 'markers',
          name: 'Semiestable',
          marker: { color: 'orange', size: 10 }
        },
        {
          x: flowRight.map((p) => p.x),
          y: flowRight.map(() => 0),
          type: 'scatter',
          mode: 'markers',
          name: 'Flujo +',
          marker: { color: '#2b6cb0', size: 8, symbol: 'triangle-right' },
          hoverinfo: 'skip'
        },
        {
          x: flowLeft.map((p) => p.x),
          y: flowLeft.map(() => 0),
          type: 'scatter',
          mode: 'markers',
          name: 'Flujo -',
          marker: { color: '#2b6cb0', size: 8, symbol: 'triangle-left' },
          hoverinfo: 'skip'
        }
      ]
    }
  }

  const bifPlot = useMemo(() => {
    if (!bifResult) return null
    const points = bifResult.bifurcation.equilibria || []

    const stable = points.filter((p) => p.stability === 'estable')
    const unstable = points.filter((p) => p.stability === 'inestable')
    const semi = points.filter((p) => p.stability === 'semiestable')

    const sortByParam = (items: BifurcationEquilibrium[]) => (
      [...items].sort((a, b) => (a.param - b.param) || (a.x - b.x))
    )

    const stableSorted = sortByParam(stable)
    const unstableSorted = sortByParam(unstable)
    const semiSorted = sortByParam(semi)

    const buildHover = (p: BifurcationEquilibrium) => (
      `param=${p.param}<br>x*=${p.x.toFixed(6)}<br>${p.stability}<br>${p.stability_reason || ''}`
    )

    return {
      data: [
        {
          x: stableSorted.map((p) => p.param),
          y: stableSorted.map((p) => p.x),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Estable',
          marker: { color: 'green', size: 6 },
          line: { color: 'green', width: 2 },
          hovertext: stableSorted.map(buildHover),
          hoverinfo: 'text'
        },
        {
          x: unstableSorted.map((p) => p.param),
          y: unstableSorted.map((p) => p.x),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Inestable',
          marker: { color: 'red', size: 6, symbol: 'circle-open' },
          line: { color: 'red', width: 2, dash: 'dash' },
          hovertext: unstableSorted.map(buildHover),
          hoverinfo: 'text'
        },
        {
          x: semiSorted.map((p) => p.param),
          y: semiSorted.map((p) => p.x),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Semiestable',
          marker: { color: 'orange', size: 6 },
          line: { color: 'orange', width: 2, dash: 'dot' },
          hovertext: semiSorted.map(buildHover),
          hoverinfo: 'text'
        }
      ]
    }
  }, [bifResult])

  const advancedSummary = useMemo(() => {
    if (!bifResult) return null

    const paramKey = (value: number) => value.toFixed(12)
    const byParam = new Map<string, BifurcationEquilibrium[]>()
    for (const eq of bifResult.bifurcation.equilibria || []) {
      const key = paramKey(eq.param)
      const list = byParam.get(key) || []
      list.push(eq)
      byParam.set(key, list)
    }

    const params = [...(bifResult.bifurcation.param_values || [])].sort((a, b) => a - b)
    const counts = params.map((p) => ({
      param: p,
      count: (byParam.get(paramKey(p)) || []).length
    }))

    const firstWithRoots = counts.find((c) => c.count > 0)
    const lastWithRoots = [...counts].reverse().find((c) => c.count > 0)

    const bifPoints: { at: number; fromCount: number; toCount: number }[] = []
    for (let i = 1; i < counts.length; i += 1) {
      const prev = counts[i - 1]
      const curr = counts[i]
      if (prev.count !== curr.count) {
        bifPoints.push({ at: curr.param, fromCount: prev.count, toCount: curr.count })
      }
    }

    return {
      params,
      byParam,
      bifPoints,
      existenceStart: firstWithRoots?.param ?? null,
      existenceEnd: lastWithRoots?.param ?? null
    }
  }, [bifResult])

  const liveSnapshot = useMemo(() => {
    if (!bifResult || !advancedSummary) return null
    const params = advancedSummary.params
    if (params.length === 0) return null
    const target = liveParam
    let closest = params[0]
    let bestDist = Math.abs(params[0] - target)
    for (let i = 1; i < params.length; i += 1) {
      const dist = Math.abs(params[i] - target)
      if (dist < bestDist) {
        bestDist = dist
        closest = params[i]
      }
    }
    const list = advancedSummary.byParam.get(closest.toFixed(12)) || []
    return {
      param: closest,
      equilibria: list
    }
  }, [advancedSummary, bifResult, liveParam])

  const fetchLivePhase = async (paramValue: number) => {
    const xMinVal = parseMathExpr(bifXMin)
    const xMaxVal = parseMathExpr(bifXMax)
    if (!Number.isFinite(xMinVal) || !Number.isFinite(xMaxVal)) return
    try {
      setLivePhaseError('')
      setLivePhaseLoading(true)
      const payload = {
        model: 'custom',
        func_str: bifFuncStr,
        params: { [bifParam.trim()]: paramValue },
        control_enabled: false,
        x_min: xMinVal,
        x_max: xMaxVal,
        n_phase: 400,
        n_time: 200,
        initial_conditions: [0.5]
      }
      const res = await dynamic1DService.equilibria(payload)
      setLivePhase({
        param: paramValue,
        phase: res.data.phase,
        equilibria: res.data.equilibria
      })
    } catch (err: any) {
      setLivePhaseError(err.message || err.response?.data?.detail || 'Error al actualizar fase en vivo')
    } finally {
      setLivePhaseLoading(false)
    }
  }

  useEffect(() => {
    if (!showAdvanced || !bifResult) return

    const clearTimers = () => {
      if (livePhaseRef.current) {
        window.clearTimeout(livePhaseRef.current)
        livePhaseRef.current = null
      }
      if (livePhaseTimerRef.current) {
        window.clearTimeout(livePhaseTimerRef.current)
        livePhaseTimerRef.current = null
      }
    }

    clearTimers()

    if (!isPlaying) {
      livePhaseRef.current = window.setTimeout(() => {
        fetchLivePhase(liveParam)
      }, 120)
      return clearTimers
    }

    const now = Date.now()
    const throttleMs = 200
    const elapsed = now - lastLivePhaseAtRef.current
    if (elapsed >= throttleMs) {
      lastLivePhaseAtRef.current = now
      fetchLivePhase(liveParam)
      return clearTimers
    }

    livePhaseTimerRef.current = window.setTimeout(() => {
      lastLivePhaseAtRef.current = Date.now()
      fetchLivePhase(liveParam)
    }, throttleMs - elapsed)

    return clearTimers
  }, [showAdvanced, bifResult, isPlaying, bifFuncStr, bifParam, bifXMin, bifXMax, liveParam])

  return (
    <div className="method-page">
      <h1>Bifurcaciones 1D</h1>

      <div className="theory-section">
        <h3>Forma general</h3>
        <p><strong>Autonomo 1D:</strong> dx/dt = f(x, r). Selecciona un modelo o ingresa tu propia funcion.</p>
        <div className="result-box" style={{ marginTop: '8px' }}>
          <div className="validation-title">Guia de pasos</div>
          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
            <li>Buscar puntos de equilibrio: resolver f(x, r) = 0.</li>
            <li>Definir condicion de existencia: cuando esas raices son reales.</li>
            <li>Analizar estabilidad: evaluar f'(x*) para cada equilibrio.</li>
            <li>Armar diagrama de bifurcacion: x* vs parametro r, detectar cambios.</li>
            <li>Hacer diagramas de fase con r &lt; 0, r = 0 y r &gt; 0.</li>
          </ol>
        </div>
      </div>

      <div className="method-container">
        <div className="form-section">
          <h2>Parametros</h2>

          <div className="method-selector">
            <label>Modelos de bifurcacion:</label>
            <select
              value={bifModel}
              onChange={(e) => {
                const selected = e.target.value
                setBifModel(selected)
                setBifResult(null)
                setBifError('')
              }}
            >
              <option value="saddle_node_pos">Silla nodo (+): x' = r + x^2</option>
              <option value="saddle_node_neg">Silla nodo (-): x' = r - x^2</option>
              <option value="pitchfork">Pitchfork (tridente): x' = r x - x^3</option>
              <option value="transcritical">Transcrita: x' = r x - x^2</option>
              <option value="transcritical_shift">Transcrita desplazada: x' = (r-2)x - x^2</option>
              <option value="custom">Personalizado</option>
            </select>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '6px' }}
              onClick={() => applyBifurcationDefaults(bifModel)}
            >
              Cargar modelo
            </button>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Ecuacion (dx/dt = f(x)):</label>
              <button
                type="button"
                onClick={() => setShowBifKeyboard(!showBifKeyboard)}
                className="btn-keyboard-toggle"
                style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {showBifKeyboard ? '✖ Cerrar' : '⌨ Teclado'}
              </button>
            </div>
            <input
              type="text"
              value={bifFuncStr}
              onChange={(e) => setBifFuncStr(e.target.value)}
              placeholder="Ej: r + x^2"
            />
            {showBifKeyboard && (
              <MathKeyboard
                onInsert={(text) => setBifFuncStr(bifFuncStr + text)}
                onClear={() => setBifFuncStr('')}
              />
            )}
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f1f8ff', border: '1px dashed #b6d4fe', borderRadius: '4px' }}>
              <FormulaDisplay formula={`x' = ${formatToLatex(bifFuncStr || 'f(x)')}`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>Parametro:</label>
              <input type="text" value={bifParam} onChange={(e) => setBifParam(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Puntos de muestreo:</label>
              <input type="text" value={bifSteps} onChange={(e) => setBifSteps(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <div className="form-group">
              <label>Dominio x (min):</label>
              <input type="text" value={bifXMin} onChange={(e) => setBifXMin(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Dominio x (max):</label>
              <input type="text" value={bifXMax} onChange={(e) => setBifXMax(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <div className="form-group">
              <label>Rango del parametro (min):</label>
              <input type="text" value={bifMin} onChange={(e) => setBifMin(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Rango del parametro (max):</label>
              <input type="text" value={bifMax} onChange={(e) => setBifMax(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label>Valores para diagrama de fase:</label>
            <input
              type="text"
              value={phaseParams}
              onChange={(e) => setPhaseParams(e.target.value)}
              placeholder="Ej: -1, 0, 1"
            />
            <small>Valores separados por coma para evaluar fase.</small>
          </div>

          <button type="button" className="btn-primary" onClick={handleBifurcation} disabled={bifLoading}>
            {bifLoading ? 'Calculando...' : 'Calcular bifurcacion'}
          </button>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '8px', background: showAdvanced ? '#e0e0e0' : undefined, color: showAdvanced ? '#000' : undefined }}
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Ocultar analisis avanzado' : 'Mostrar analisis avanzado'}
          </button>

          {showAdvanced && (
            <div className="result-box" style={{ marginTop: '10px' }}>
              <div className="validation-title">Barrido en vivo (modo GeoGebra)</div>
              {!bifResult && (
                <div style={{ fontSize: '13px' }}>
                  Ejecuta una bifurcacion para habilitar el barrido en vivo.
                </div>
              )}
              {bifResult && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong>{bifParam} = {formatNumber(liveParam, 4)}</strong>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '2px 8px' }}
                      onClick={() => setIsPlaying((prev) => !prev)}
                    >
                      {isPlaying ? 'Pausar' : 'Reproducir'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={getParamRange().min}
                    max={getParamRange().max}
                    step={getParamStep()}
                    value={liveParam}
                    onChange={(e) => setLiveParam(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <FormulaDisplay formula={`f(x) = ${formatToLatex(bifFuncStr || 'f(x)')}`} />
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {livePhase ? (
                      <PlotlyGraph
                        data={buildPhasePlot(livePhase.phase, livePhase.equilibria).data}
                        title={`Fase en vivo (${bifParam} = ${formatNumber(livePhase.param, 4)})`}
                        layout={{ xaxis: { title: 'x' }, yaxis: { title: 'f(x)' }, height: 400 }}
                      />
                    ) : (
                      <div style={{ fontSize: '13px' }}>
                        {livePhaseLoading ? 'Actualizando fase en vivo...' : 'No hay datos de fase disponibles.'}
                      </div>
                    )}
                    {livePhaseError && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#b00020' }}>
                        {livePhaseError}
                      </div>
                    )}
                  </div>
                  <div className="result-box" style={{ marginTop: '12px' }}>
                    <div className="validation-title">Analisis avanzado</div>
                    {!bifResult && (
                      <div style={{ fontSize: '13px' }}>
                        Ejecuta una bifurcacion para ver el resumen numerico.
                      </div>
                    )}
                    {bifResult && advancedSummary && (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div className="result-box">
                          <div className="validation-title">Condicion de existencia (aprox.)</div>
                          {advancedSummary.existenceStart === null ? (
                            <div style={{ fontSize: '13px' }}>No hay raices reales en el rango seleccionado.</div>
                          ) : (
                            <div style={{ fontSize: '13px' }}>
                              {bifParam} {'>='} {formatNumber(advancedSummary.existenceStart, 6)}
                              {advancedSummary.existenceEnd !== null ? (
                                <> y {bifParam} {'<='} {formatNumber(advancedSummary.existenceEnd, 6)}</>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="result-box">
                          <div className="validation-title">Puntos de bifurcacion (aprox.)</div>
                          {advancedSummary.bifPoints.length === 0 ? (
                            <div style={{ fontSize: '13px' }}>No se detectaron cambios de cantidad de raices.</div>
                          ) : (
                            <div style={{ fontSize: '13px' }}>
                              {advancedSummary.bifPoints.map((bp, idx) => (
                                <div key={`${bp.at}-${idx}`}>
                                  {bifParam} ~= {formatNumber(bp.at, 6)} ({bp.fromCount} a {bp.toCount} raices)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="result-box">
                          <div className="validation-title">Raices y estabilidad (r actual)</div>
                          {!liveSnapshot || liveSnapshot.equilibria.length === 0 ? (
                            <div style={{ fontSize: '13px' }}>No hay raices reales para este valor.</div>
                          ) : (
                            <div style={{ fontSize: '13px' }}>
                              {liveSnapshot.equilibria.map((eq, idx) => (
                                <div key={`${liveSnapshot.param}-${idx}`}>
                                  x* = {formatNumber(eq.x, 6)} | f'(x*) = {formatNumber(eq.fprime, 6)} | {eq.stability}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="result-section">
          <h2>Resultados</h2>

          {bifError && <div className="error-box">Error: {bifError}</div>}

          {bifResult && (
            <div className="result-box" style={{ marginTop: '12px' }}>
              <div className="validation-title">Bifurcacion</div>
              <div style={{ marginBottom: '6px' }}>
                <FormulaDisplay formula={`x' = ${formatToLatex(bifResult.equation || 'f(x)')}`} />
              </div>
              <div style={{ fontSize: '13px' }}>
                Parametro: <strong>{bifResult.bif_param}</strong>
              </div>
            </div>
          )}

          {bifResult && (
            <div className="result-box" style={{ marginTop: '10px' }}>
              <div className="validation-title">Resultados del ejercicio</div>
              <div style={{ fontSize: '13px', display: 'grid', gap: '6px' }}>
                {bifResult.exact_analysis?.roots && bifResult.exact_analysis.roots.length > 0 ? (
                  <div>
                    <strong>Puntos de equilibrio:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {bifResult.exact_analysis.roots.map((item, idx) => (
                        <div key={`root-${idx}`}>
                          <span>x* = </span>
                          <FormulaDisplay inline formula={formatToLatex(item.root)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : liveSnapshot?.equilibria?.length ? (
                  <div>
                    <strong>Puntos de equilibrio (numerico):</strong>
                    <div style={{ marginTop: '4px' }}>
                      {liveSnapshot.equilibria.map((eq, idx) => (
                        <div key={`root-num-${idx}`}>
                          x* = {formatNumber(eq.x, 6)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>No se detectaron puntos de equilibrio en el rango.</div>
                )}

                {bifResult.exact_analysis?.roots && bifResult.exact_analysis.roots.length > 0 && (
                  <div>
                    <strong>Condicion de existencia (por raiz):</strong>
                    <div style={{ marginTop: '4px' }}>
                      {bifResult.exact_analysis.roots.map((item, idx) => (
                        <div key={`exist-${idx}`}>
                          <span>x* = </span>
                          <FormulaDisplay inline formula={formatToLatex(item.root)} />
                          {item.existence ? (
                            <>
                              <span> | </span>
                              {item.existence === 'siempre' ? (
                                <span>siempre existe</span>
                              ) : (
                                <>
                                  <span>existe si </span>
                                  <FormulaDisplay inline formula={formatToLatex(item.existence)} />
                                </>
                              )}
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bifResult.exact_analysis?.existence ? (
                  (() => {
                    const roots = bifResult.exact_analysis?.roots || []
                    const hasConditional = roots.some((item) => item.existence && item.existence !== 'siempre')
                    return (
                      <div>
                        <strong>Condicion de existencia (global):</strong>
                        <div style={{ marginTop: '4px' }}>
                          {bifResult.exact_analysis.existence === 'siempre' ? (
                            <span>{hasConditional ? 'al menos un equilibrio siempre existe' : 'siempre existe'}</span>
                          ) : (
                            <FormulaDisplay inline formula={formatToLatex(bifResult.exact_analysis.existence)} />
                          )}
                        </div>
                      </div>
                    )
                  })()
                ) : advancedSummary?.existenceStart !== null ? (
                  <div>
                    <strong>Condicion de existencia (aprox.):</strong>
                    <div style={{ marginTop: '4px' }}>
                      {bifParam} {'>='} {formatNumber(advancedSummary.existenceStart, 6)}
                      {advancedSummary.existenceEnd !== null ? (
                        <> y {bifParam} {'<='} {formatNumber(advancedSummary.existenceEnd, 6)}</>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {bifResult.exact_analysis?.stability && bifResult.exact_analysis.stability.length > 0 ? (
                  <div>
                    <strong>Analisis de estabilidad:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {bifResult.exact_analysis.stability.map((item, idx) => (
                        <div key={`stab-${idx}`}>
                          <div>
                            <span>Para x* = </span>
                            <FormulaDisplay inline formula={formatToLatex(item.root)} />
                          </div>
                          <div>
                            <span>f'(x*) = </span>
                            <FormulaDisplay inline formula={formatToLatex(item.derivative)} />
                          </div>
                          {item.stable_when ? (() => {
                            const condition = simplifyCondition(item.stable_when)
                            if (condition === 'nunca' || condition === 'siempre') return null
                            return (
                              <div>
                                <span style={{ color: '#1b8f3a' }}>Estable: </span>
                                <FormulaDisplay inline formula={formatToLatex(condition)} />
                              </div>
                            )
                          })() : null}
                          {item.unstable_when ? (() => {
                            const condition = simplifyCondition(item.unstable_when)
                            if (condition === 'nunca' || condition === 'siempre') return null
                            return (
                              <div>
                                <span style={{ color: '#c62828' }}>Inestable: </span>
                                <FormulaDisplay inline formula={formatToLatex(condition)} />
                              </div>
                            )
                          })() : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : liveSnapshot?.equilibria?.length ? (
                  <div>
                    <strong>Analisis de estabilidad (numerico):</strong>
                    <div style={{ marginTop: '4px' }}>
                      {liveSnapshot.equilibria.map((eq, idx) => (
                        <div key={`stab-num-${idx}`}>
                          x* = {formatNumber(eq.x, 6)} | f'(x*) = {formatNumber(eq.fprime, 6)} | {eq.stability}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {bifPlot && (
            <div style={{ marginBottom: '10px' }}>
              <PlotlyGraph
                data={bifPlot.data}
                title="Diagrama de bifurcacion"
                layout={{ xaxis: { title: bifResult?.bif_param || 'parametro' }, yaxis: { title: 'x*' } }}
              />
            </div>
          )}


          {bifResult && bifResult.phase_slices && bifResult.phase_slices.length > 0 && (
            <div>
              {bifResult.phase_slices.map((slice, idx) => {
                const plot = buildPhasePlot(slice.phase, slice.equilibria)
                return (
                  <div key={`${slice.param}-${idx}`} style={{ marginBottom: '10px' }}>
                    <PlotlyGraph
                      data={plot.data}
                      title={`Diagrama de fase (${bifResult.bif_param} = ${slice.param})`}
                      layout={{ xaxis: { title: 'x' }, yaxis: { title: 'f(x)' } }}
                    />
                    {slice.equilibria.length > 0 && (
                      <div className="result-box" style={{ marginTop: '6px' }}>
                        <div className="validation-title">Justificacion de estabilidad</div>
                        <div className="validation-box">
                          {slice.equilibria.map((eq, eidx) => (
                            <div key={`${slice.param}-${eidx}`} className="validation-row">
                              <span className="validation-label">x* = {eq.x.toFixed(4)}</span>
                              <span>{eq.stability}</span>
                              <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                                {eq.stability_reason || 'sin justificacion'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
