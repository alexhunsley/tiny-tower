#!/bin/bash

echo
echo "Packing SPA..."
echo

python pack_single.py

mv tower.html ../../../blog/playing_and_noticing/static/

echo
echo "Deployed tower.html to blog static/"
echo
echo
