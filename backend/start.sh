#!/bin/sh
# Run pending DB migrations, then start the API server.
# Using a script file (instead of a "sh -c '...&&...'" command typed into a
# host's dashboard) avoids quoting/parsing issues some platforms have with
# shell operators in a single command-line field.
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
