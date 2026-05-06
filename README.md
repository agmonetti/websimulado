# Modelado y Simulacion - Metodos Numericos Web

Plataforma Full-Stack diseñada para la resolución, análisis estadístico y visualización de métodos numéricos. Desarrollada como proyecto académico para la Universidad Argentina de la Empresa (UADE).

## Inicio

### Opcion 1: Backend Python (Terminal 1)

Crear y activar virtual environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # En Linux/Mac
# o en Windows:
#py -m venv venv
# venv\Scripts\activate

pip install -r requirements.txt
python run.py
```

### Opcion 2: Frontend React (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend corre en: http://localhost:3000

### Opcion 3: Docker

```bash
# Primera vez (construye las imágenes)
docker-compose up --build

# Próximas veces
docker-compose up
```

---

## Metodos Disponibles

- Búsqueda de Raíces: Bisección, Newton-Raphson, Punto Fijo, Aceleración de Aitken.

- Diferenciación Numérica: Diferencias Finitas (Progresiva, Regresiva, Central y Segunda Derivada).

- Integración Numérica: Rectángulo Medio, Trapecio (Simple/Compuesto), Simpson 1/3 y 3/8 (Simples/Compuestos) + Comparador de exactitud.

- Interpolación: Polinomio de Lagrange (con análisis de error global y local).

- Ecuaciones Diferenciales Ordinarias (EDO): Método de Euler, Euler Mejorado (Heun) y Runge-Kutta de 4to Orden (RK4), con comparación contra solución exacta y error por paso.

- Simulación Monte Carlo: Hit-or-Miss (1D), Valor Promedio (1D, 2D, 3D), Análisis Estadístico con Intervalos de Confianza y Factor de Reducción de Varianza.
---

## tests

```bash
cd backend
source venv/bin/activate
pytest

```

## To DO

- ~mejorar el apartado de 'Analisis de estabilidad'~
- ~el analisis avanzado de geogebra deberia mostrar justamente debajo de dicho boton como fluctua el grafico para una mejor comprension.~

- ~agregar calculo de ET de los metodos que lo tienen, pero para calcularlo necesitan el simbolo raro de e/E. ~ agregado, validar cuando tenga foto del parcial!

- ~agregar calculo de media muestral a la seccion de resultados de montecarlo~
- ~probar montecarlo a full~
- ~revisar si se contempla indirecta o directamente la escala (b-a) en el calculo de los errores~
- ~metodo comparador de integraciones, no muestra si se tuvo que aplciar un rescate matematico~
- ~mobile display iniciada:~
    ~imporante tratar:~
    * ~Sidebar~
    * ~los graficos y tablas~
    * ~grillas de parametros~
- ~metodos de integracion tienen duplicados los parametros de limites y n.~
- ~barra lateral izquierda, agrandar letra~
- ~agregar comparacion de misma funcion de montecarlo en busca de reducir el error en un valor 'j'~ - reprecated
- ~dejar diferencias finitas funcional al 100%.~
- ~tratar la 'tolerancia' y 'precision' de las tablas iterativas.~
- ~metodos comparativos.~
- ~teclado matematico.~
- ~mostrar en el mismo modo 'formula' que mostramos la formula de teoria de cada metodo, la funcion, ya sea f(x) o g(x) para corroborar que la estamos tipeando correctamente, es decir, es la misma que la planteada en el ejercicio. mostrarla justo debajo de dicha funcion.~
- ~mejorar la visual de la barra izquierda lateral, esta muy fea.~
- ~montecarlo.~

## Futuro

- Desarrollo de Servidor MCP (Model Context Protocol): Extracción del core matemático para exponerlo directamente como herramientas nativas para LLMs (Large Language Models), eliminando la dependencia del entorno web completo.
