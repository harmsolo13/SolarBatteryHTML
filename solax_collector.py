#!/usr/bin/env python3
"""
Solax Inverter Data Collector
Polls the local Solax inverter API every 5 minutes and stores readings in SQLite.
Aggregates daily and monthly totals for the Battery ROI dashboard.
"""

import sqlite3
import requests
import time
import logging
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
INVERTER_URL = "http://192.168.68.55/api/realTimeData.htm"
POLL_INTERVAL = 300  # 5 minutes
DB_PATH = Path(__file__).parent / "solar_data.db"
LOG_PATH = Path("/var/log/solax-collector.log")

# Solax AL_SI4 data field mapping
FIELDS = {
    0: 'pv1_current',
    1: 'pv2_current',
    2: 'pv1_voltage',
    3: 'pv2_voltage',
    4: 'grid_current',
    5: 'grid_voltage',
    6: 'grid_power',
    7: 'inverter_temp',
    8: 'today_yield',
    9: 'total_yield',
    10: 'exported_power',
    11: 'pv1_power',
    12: 'pv2_power',
    51: 'grid_frequency',
    58: 'feed_in_power',
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_PATH) if LOG_PATH.parent.exists() else logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

running = True


def signal_handler(sig, frame):
    global running
    log.info("Shutdown signal received")
    running = False


signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


def init_db():
    """Create database tables if they don't exist."""
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS solar_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            pv1_power REAL,
            pv2_power REAL,
            pv1_voltage REAL,
            pv2_voltage REAL,
            pv1_current REAL,
            pv2_current REAL,
            total_pv_power REAL,
            grid_power REAL,
            grid_voltage REAL,
            grid_current REAL,
            grid_frequency REAL,
            exported_power REAL,
            feed_in_power REAL,
            today_yield REAL,
            total_yield REAL,
            inverter_temp REAL,
            status INTEGER
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS solar_daily (
            date TEXT PRIMARY KEY,
            total_yield_kwh REAL,
            peak_power_w REAL,
            avg_power_w REAL,
            max_exported_w REAL,
            first_generation TEXT,
            last_generation TEXT,
            hours_generating REAL,
            readings_count INTEGER,
            updated_at TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS solar_monthly (
            month TEXT PRIMARY KEY,
            total_yield_kwh REAL,
            avg_daily_kwh REAL,
            peak_day_kwh REAL,
            peak_day_date TEXT,
            days_with_data INTEGER,
            avg_peak_power_w REAL,
            updated_at TEXT
        )
    """)
    # Indexes for fast queries
    db.execute("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON solar_readings(timestamp)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_readings_date ON solar_readings(substr(timestamp, 1, 10))")
    db.commit()
    db.close()
    log.info(f"Database initialized at {DB_PATH}")


def poll_inverter():
    """Poll the Solax inverter and return parsed data."""
    try:
        resp = requests.get(INVERTER_URL, timeout=10)
        resp.raise_for_status()
        # Solax API returns empty values as ",," which isn't valid JSON
        import re
        raw = resp.text
        raw = re.sub(r',(?=,)', ',null', raw)
        raw = re.sub(r',(?=\])', ',null', raw)
        import json
        data = json.loads(raw)

        if not data.get('Data'):
            log.warning(f"No Data field in response: {data.get('message', 'unknown')}")
            return None

        raw = data['Data']
        parsed = {}
        for idx, field_name in FIELDS.items():
            if idx < len(raw) and raw[idx] is not None:
                parsed[field_name] = raw[idx]

        # Calculate total PV power
        parsed['total_pv_power'] = (parsed.get('pv1_power', 0) or 0) + (parsed.get('pv2_power', 0) or 0)

        # Total yield is stored as ×10 in the API
        if 'total_yield' in parsed:
            parsed['total_yield'] = parsed['total_yield'] / 10.0

        parsed['status'] = int(data.get('Status', 0))
        parsed['sn'] = data.get('SN', '')
        parsed['type'] = data.get('type', '')

        return parsed

    except requests.exceptions.Timeout:
        log.warning("Inverter request timed out")
        return None
    except requests.exceptions.ConnectionError:
        log.warning("Cannot connect to inverter")
        return None
    except Exception as e:
        log.error(f"Error polling inverter: {e}")
        return None


def store_reading(data):
    """Store a reading in the database."""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        INSERT INTO solar_readings (
            timestamp, pv1_power, pv2_power, pv1_voltage, pv2_voltage,
            pv1_current, pv2_current, total_pv_power, grid_power,
            grid_voltage, grid_current, grid_frequency, exported_power,
            feed_in_power, today_yield, total_yield, inverter_temp, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now,
        data.get('pv1_power'), data.get('pv2_power'),
        data.get('pv1_voltage'), data.get('pv2_voltage'),
        data.get('pv1_current'), data.get('pv2_current'),
        data.get('total_pv_power'),
        data.get('grid_power'), data.get('grid_voltage'),
        data.get('grid_current'), data.get('grid_frequency'),
        data.get('exported_power'), data.get('feed_in_power'),
        data.get('today_yield'), data.get('total_yield'),
        data.get('inverter_temp'), data.get('status')
    ))
    db.commit()
    db.close()


def update_daily_aggregate(date_str=None):
    """Update daily aggregate for a given date (default: today)."""
    if date_str is None:
        date_str = datetime.now().strftime('%Y-%m-%d')

    db = sqlite3.connect(DB_PATH)
    row = db.execute("""
        SELECT
            MAX(today_yield) as total_yield,
            MAX(total_pv_power) as peak_power,
            AVG(CASE WHEN total_pv_power > 0 THEN total_pv_power END) as avg_power,
            MAX(exported_power) as max_exported,
            MIN(CASE WHEN total_pv_power > 50 THEN timestamp END) as first_gen,
            MAX(CASE WHEN total_pv_power > 50 THEN timestamp END) as last_gen,
            COUNT(*) as readings
        FROM solar_readings
        WHERE substr(timestamp, 1, 10) = ?
    """, (date_str,)).fetchone()

    if row and row[0] is not None:
        # Calculate hours generating (readings with > 50W, at 5-min intervals)
        gen_count = db.execute("""
            SELECT COUNT(*) FROM solar_readings
            WHERE substr(timestamp, 1, 10) = ? AND total_pv_power > 50
        """, (date_str,)).fetchone()[0]
        hours_gen = (gen_count * POLL_INTERVAL) / 3600.0

        db.execute("""
            INSERT OR REPLACE INTO solar_daily
            (date, total_yield_kwh, peak_power_w, avg_power_w, max_exported_w,
             first_generation, last_generation, hours_generating, readings_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            date_str, row[0], row[1], row[2], row[3],
            row[4], row[5], round(hours_gen, 1), row[6],
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        db.commit()

    db.close()


def update_monthly_aggregate(month_str=None):
    """Update monthly aggregate for a given month (default: current)."""
    if month_str is None:
        month_str = datetime.now().strftime('%Y-%m')

    db = sqlite3.connect(DB_PATH)
    row = db.execute("""
        SELECT
            SUM(total_yield_kwh) as total,
            AVG(total_yield_kwh) as avg_daily,
            MAX(total_yield_kwh) as peak_day_kwh,
            date as peak_date,
            COUNT(*) as days,
            AVG(peak_power_w) as avg_peak
        FROM solar_daily
        WHERE substr(date, 1, 7) = ?
        GROUP BY substr(date, 1, 7)
    """, (month_str,)).fetchone()

    if row and row[0] is not None:
        # Get actual peak day date
        peak_row = db.execute("""
            SELECT date FROM solar_daily
            WHERE substr(date, 1, 7) = ?
            ORDER BY total_yield_kwh DESC LIMIT 1
        """, (month_str,)).fetchone()

        db.execute("""
            INSERT OR REPLACE INTO solar_monthly
            (month, total_yield_kwh, avg_daily_kwh, peak_day_kwh, peak_day_date,
             days_with_data, avg_peak_power_w, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            month_str, row[0], row[1], row[2],
            peak_row[0] if peak_row else None,
            row[4], row[5],
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        db.commit()

    db.close()


def cleanup_old_readings(days=90):
    """Remove raw readings older than N days to keep DB size manageable."""
    cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    db = sqlite3.connect(DB_PATH)
    deleted = db.execute("DELETE FROM solar_readings WHERE timestamp < ?", (cutoff,)).rowcount
    db.commit()
    db.close()
    if deleted:
        log.info(f"Cleaned up {deleted} readings older than {cutoff}")


def main():
    log.info("Solax Collector starting")
    log.info(f"Inverter: {INVERTER_URL}")
    log.info(f"Database: {DB_PATH}")
    log.info(f"Poll interval: {POLL_INTERVAL}s")

    init_db()

    poll_count = 0
    last_daily_update = None
    last_cleanup = datetime.now()

    while running:
        data = poll_inverter()

        if data:
            store_reading(data)
            poll_count += 1

            total_pv = data.get('total_pv_power', 0)
            today = data.get('today_yield', 0)
            exported = data.get('exported_power', 0)
            temp = data.get('inverter_temp', 0)

            log.info(
                f"PV: {total_pv:.0f}W | Today: {today:.1f}kWh | "
                f"Export: {exported:.0f}W | Temp: {temp}°C | "
                f"Readings: {poll_count}"
            )

            # Update daily aggregate every reading
            today_str = datetime.now().strftime('%Y-%m-%d')
            update_daily_aggregate(today_str)

            # Update monthly aggregate once per hour
            if last_daily_update != datetime.now().strftime('%Y-%m-%d %H'):
                update_monthly_aggregate()
                last_daily_update = datetime.now().strftime('%Y-%m-%d %H')

            # Also update yesterday if we just crossed midnight
            if datetime.now().hour == 0 and datetime.now().minute < 10:
                yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
                update_daily_aggregate(yesterday)
                prev_month = (datetime.now() - timedelta(days=1)).strftime('%Y-%m')
                update_monthly_aggregate(prev_month)

        else:
            log.debug("No data received from inverter")

        # Weekly cleanup of old raw readings
        if (datetime.now() - last_cleanup).days >= 7:
            cleanup_old_readings(90)
            last_cleanup = datetime.now()

        # Sleep in small increments so we can respond to signals
        for _ in range(POLL_INTERVAL):
            if not running:
                break
            time.sleep(1)

    log.info("Solax Collector stopped")


if __name__ == '__main__':
    main()
