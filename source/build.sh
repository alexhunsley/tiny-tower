#!/bin/bash

python pack_single.py

# bind to all IPs, including LAN one so iPhone can load over same wifi network
python -m http.server 8000 --bind 0.0.0.0 --directory .

# TODO doesn't work
# open http://127.0.0.1:8000/single.html
 