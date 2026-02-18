
/* ═══════════════════════════════════════════════════════════════════════
   HOME ASSISTANT BOM WEATHER INTEGRATION
   Fetches BOM weather data from Home Assistant's weather-au integration
   ═══════════════════════════════════════════════════════════════════════ */

// Home Assistant Configuration
const HA_CONFIG = {
  url: 'http://192.168.68.60:8123',
  weatherEntity: 'weather.forecast_home', // Your BOM weather entity
  // Access token will be requested from user at runtime
  token: null
};

// Weather condition to solar multiplier mapping (from BOM data)
const BOM_CONDITION_TO_SOLAR = {
  // Clear conditions (90-100% solar)
  'clear': 1.0,
  'sunny': 1.0,
  'clear-night': 1.0,

  // Mostly clear (80-90% solar)
  'partlycloudy': 0.85,
  'partly-cloudy': 0.85,

  // Partly cloudy (65-75% solar)
  'cloudy': 0.7,
  'mostlycloudy': 0.65,
  'mostly-cloudy': 0.65,

  // Overcast (40-55% solar)
  'overcast': 0.5,

  // Light rain/showers (25-35% solar)
  'rainy': 0.3,
  'light-rain': 0.35,
  'shower': 0.3,
  'showers': 0.3,

  // Heavy rain/storms (10-20% solar)
  'pouring': 0.15,
  'heavy-rain': 0.15,
  'lightning': 0.1,
  'lightning-rainy': 0.1,
  'thunderstorm': 0.1,

  // Other conditions
  'fog': 0.4,
  'hail': 0.2,
  'snowy': 0.2,
  'snowy-rainy': 0.2,
  'windy': 0.85,
  'windy-variant': 0.8,
  'exceptional': 0.5,
};

async function fetchHAWeatherForecast() {
  // Check if token is set
  if (!HA_CONFIG.token) {
    const token = prompt(
      'Enter your Home Assistant Long-Lived Access Token:\n\n' +
      '(You only need to do this once per session)\n\n' +
      'Get it from: Settings → People → [Your Name] → Security → Long-Lived Access Tokens'
    );

    if (!token) {
      throw new Error('Home Assistant access token required');
    }

    HA_CONFIG.token = token;
  }

  const url = `${HA_CONFIG.url}/api/states/${HA_CONFIG.weatherEntity}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HA_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        HA_CONFIG.token = null; // Clear invalid token
        throw new Error('Invalid Home Assistant token. Please check your token and try again.');
      }
      throw new Error(`Home Assistant API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract forecast from attributes
    const forecast = data.attributes?.forecast || [];

    if (forecast.length === 0) {
      throw new Error('No forecast data available from Home Assistant');
    }

    return {
      location: data.attributes?.friendly_name || 'Unknown',
      current: {
        temp: data.attributes?.temperature,
        condition: data.state,
        humidity: data.attributes?.humidity,
        pressure: data.attributes?.pressure
      },
      forecast: forecast.map(day => ({
        datetime: day.datetime,
        date: day.datetime.split('T')[0],
        condition: day.condition,
        temperature: day.temperature,
        templow: day.templow,
        precipitation: day.precipitation,
        precipitation_probability: day.precipitation_probability,
        wind_speed: day.wind_speed,
        // Calculate solar multiplier based on condition
        solar_multiplier: BOM_CONDITION_TO_SOLAR[day.condition] || 0.5
      }))
    };

  } catch (error) {
    console.error('Home Assistant fetch error:', error);
    throw error;
  }
}

// Convert HA forecast to battery prediction format
function convertHAForecastToBatteryPrediction(haForecast, avgSolarPerDay) {
  const predictions = [];

  for (let i = 0; i < Math.min(haForecast.forecast.length, 7); i++) {
    const day = haForecast.forecast[i];
    const dateObj = new Date(day.datetime);

    // Predict solar generation based on condition
    const predictedSolarKwh = (avgSolarPerDay * day.solar_multiplier).toFixed(1);

    // Estimate battery SOC (simplified model)
    // Assumes battery starts at 50% and charges with predicted solar
    const batteryCapacity = 27.36; // kWh usable
    const startingSOC = batteryCapacity * 0.5;
    const solarToBattery = Math.min(predictedSolarKwh * 0.8, batteryCapacity - startingSOC); // 80% goes to battery
    const maxSOC = Math.min(startingSOC + solarToBattery, batteryCapacity);
    const fillPct = (maxSOC / batteryCapacity) * 100;

    predictions.push({
      date: day.date,
      dateObj: dateObj,
      dayName: dateObj.toLocaleDateString('en-AU', { weekday: 'short' }),
      condition: day.condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      conditionIcon: getConditionIcon(day.condition),
      tempMax: day.temperature,
      tempMin: day.templow,
      rainChance: day.precipitation_probability || 0,
      precipitation: day.precipitation || 0,
      solarMultiplier: day.solar_multiplier,
      predictedSolarKwh: predictedSolarKwh,
      maxSOC: maxSOC.toFixed(1),
      fillPct: fillPct.toFixed(0)
    });
  }

  return predictions;
}

// Get icon for condition
function getConditionIcon(condition) {
  const iconMap = {
    'clear': '☀️',
    'sunny': '☀️',
    'partlycloudy': '⛅',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'rainy': '🌧️',
    'pouring': '🌧️',
    'lightning': '⛈️',
    'thunderstorm': '⛈️',
    'fog': '🌫️',
    'windy': '💨',
    'snowy': '🌨️',
  };

  return iconMap[condition] || '🌤️';
}

// Main function to load forecast from Home Assistant
async function loadForecastFromHA(avgSolarPerDay) {
  try {
    setForecastLoading(true);
    setForecastError(null);

    console.log('Fetching BOM weather from Home Assistant...');
    const haForecast = await fetchHAWeatherForecast();

    console.log('Home Assistant forecast:', haForecast);

    const predictions = convertHAForecastToBatteryPrediction(haForecast, avgSolarPerDay);

    setForecastData(predictions);
    setForecastLoading(false);

    return predictions;

  } catch (error) {
    console.error('Error loading HA forecast:', error);
    setForecastError(error.message);
    setForecastLoading(false);
    throw error;
  }
}
