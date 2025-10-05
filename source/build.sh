#!/bin/bash

python pack_single.py

python -m http.server 8000 --bind 127.0.0.1 --directory .

# TODO doesn't work
# open http://127.0.0.1:8000/single.html
