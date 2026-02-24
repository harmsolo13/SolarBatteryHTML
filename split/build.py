#!/usr/bin/env python3
"""Build script: Combines split source files into a single HTML file.

Usage: python3 build.py
Output: ../BatteryROI_split.html (ready to open in browser)

Edit the individual .js/.css files, then run this script to rebuild.
"""
import os

DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, '..', 'BatteryROI_split.html')

def read(name):
    with open(os.path.join(DIR, name), 'r') as f:
        return f.read()

# Read all source files
css = read('styles.css')
config_js = read('config.js')
tab_finance = read('tab-finance.js')
tab_setup = read('tab-setup.js')
tab_forecast = read('tab-forecast.js')
tab_analysis = read('tab-analysis.js')
tab_solar = read('tab-solar.js')
tab_grid = read('tab-grid.js')
app_js = read('app.js')

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>⚡ Battery ROI Calculator</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prop-types/15.8.1/prop-types.min.js"></script>
<script src="https://unpkg.com/recharts@2.12.7/umd/Recharts.js"></script>
<style>
{css}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
{config_js}

{tab_finance}

{tab_setup}

{tab_forecast}

{tab_analysis}

{tab_solar}

{tab_grid}

{app_js}
</script>
</body>
</html>'''

with open(OUT, 'w') as f:
    f.write(html)

size_kb = os.path.getsize(OUT) / 1024
print(f"Built: {OUT} ({size_kb:.0f} KB)")
