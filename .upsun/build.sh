#!/usr/bin/env bash
set -eu

composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
npm ci --no-audit --no-fund
npm run build

python3 -m venv python/.venv
python/.venv/bin/python -m pip install --only-binary=:all: --no-cache-dir -r python/requirements.txt
python/.venv/bin/python -m pip check
if command -v gcc >/dev/null 2>&1; then
    export LD_LIBRARY_PATH="$(dirname "$(gcc -print-file-name=libstdc++.so.6)")${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
python/.venv/bin/python -m unittest discover -s python/tests -v
