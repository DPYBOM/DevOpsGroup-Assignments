# Canvas Notes project - Dockerized Flask App

---

This project is a minimalistic web-based note-taking application built with Flask (backend) and JavaScript (frontend).
Application was containerized using Docker and orchestrated with Docker Compose.

---

## How to Run the Application

```bash
#Build and start container
docker compose up --build
```

```bash
#Access the application
http://localhost:5000
```

```bash
#Run in detached mode after build
docker compose up -d
```

```bash
#Stop container
docker compose down
```

---

## Features

- Create and manage notes on the canvas

- Customize note appearance (color, font size)

- Resize notes

- Control note layering (bring to front, send to back)

- Copy, paste, and delete notes

- Persist notes between sessions (PostgreSQL)

- Toggle theme between light and dark modes

---

## Tech Stack

- Backend: Flask, Python
- Frontend: HTML, CSS, JavaScript (Canvas API)
- Database: PostgreSQL
- Containerization: Docker & Docker Compose
- WSGI Server: Gunicorn

---

## Dockerization briefly explained

### 1. Dockerfile

The Flask application is packaged into a Docker image.

- Uses a lightweight Python base image (3.14.3-slim)

- Installs dependencies from requirements.txt

- Copies application source code.

- Runs the app using Gunicorn.

- Exposes port 5000.

The container runs the Flask application on:

```bash
http://localhost:5000
```

### 2. docker-compose.yml

Docker Compose is used to orchestrate:

- flask-app (Flask + Gunicorn container)

- db (PostgreSQL container)

Features:

- Port mapping: 5000:5000

- Environment variable for database connection (DATABASE_URL)

- Persistent volume for PostgreSQL data

- Service dependency configuration
