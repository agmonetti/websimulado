# Usa una imagen oficial de Python optimizada y ligera
FROM python:3.11-slim

# Establece el directorio de trabajo adentro del contenedor
WORKDIR /app

# Copia los requerimientos primero para aprovechar la caché de Docker
COPY requirements.txt .

# Instala las dependencias sin guardar basura en caché
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto de tu código
COPY . .

# Expone el puerto de FastAPI
EXPOSE 8000

# Comando para iniciar el servidor
CMD ["python", "run.py"]