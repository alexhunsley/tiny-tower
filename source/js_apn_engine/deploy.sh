#!/bin/bash

echo
echo "Packing SPA..."
echo

python pack_single.py

mv tower.html ../../../blog/static/

echo
echo "Deployed tower.html to blog static/"
echo
echo
