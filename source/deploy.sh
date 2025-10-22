#!/bin/bash

echo
echo "Packing SPA...\n"

python pack_single.py

mv tower.html ../../../blog/playing_and_noticing/static/

echo "Deployed tower.html to blog static/"
echo
