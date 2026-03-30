FROM python:3.10-slim

WORKDIR /app

COPY services/core/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/core/ .
COPY shared/ /shared

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
