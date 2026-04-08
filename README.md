# Modelado y Simulacion - Metodos Numericos Web

Plataforma interactiva para resolver problemas con metodos numericos: raices, integracion, derivacion, interpolacion y Monte Carlo.

## Inicio Rapido

### Opcion 1: Backend Python (Terminal 1)

Crear y activar virtual environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # En Linux/Mac
# o en Windows:
# venv\Scripts\activate

pip install -r requirements.txt
python run.py
```

Backend corre en: http://localhost:8000
Documentacion API: http://localhost:8000/docs

### Opcion 2: Frontend React (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend corre en: http://localhost:3000

---

## Metodos Disponibles

Busqueda de Raices
- Biseccion, Punto Fijo, Newton-Raphson, Aitken

Integracion Numerica  
- Trapecio, Simpson 1/3, Simpson 3/8, Rectangulo

Derivacion
- Diferencias finitas (1ra y 2da derivada)

Interpolacion
- Polinomio de Lagrange

Monte Carlo
- Hit-or-Miss, Valor Promedio

---

## To DO
- probar metodo a metodo
- montecarlo: 2d: no muestra resultados completos. falta:
	* tabla de iteracion (max 1000 valores)
	* desviacion estandar
	* IC
	* integracion estimada
	* grafico de los puntos
- cada metodo debe mostrar la funcion que se quiere calcular o utilizar para el metodo, antes de ejecutarlo, para revisar que es la que se quiere trabajar, como funciona la visual de la formula.