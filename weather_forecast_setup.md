# Weather Forecast Integration Setup

## Quick Start: Get Your Free API Key

### Option 1: WeatherAPI.com (Recommended)
1. Visit: https://www.weatherapi.com/signup.aspx
2. Sign up for a free account (no credit card required)
3. Free tier includes: 1 million calls/month, 14-day forecast
4. Copy your API key from the dashboard

### Option 2: OpenWeatherMap
1. Visit: https://openweathermap.org/api
2. Sign up for free tier
3. Free tier includes: 1000 calls/day, 5-day forecast
4. Copy your API key

## API Key Usage

Once you have your API key, you'll insert it into the HTML file where it says:
```javascript
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE';
```

## What the Feature Does

1. **Fetches 7-day weather forecast** for Adelaide, SA
2. **Predicts solar generation** based on:
   - Cloud cover percentage
   - UV index
   - Daylight hours
   - Historical patterns from your data

3. **Estimates battery performance**:
   - Predicted SOC throughout each day
   - Time to full charge (if applicable)
   - Days that may need Solar Sharer support

4. **Smart recommendations**:
   - Pre-charge suggestions before cloudy days
   - Best days to run high-consumption appliances
   - Solar Sharer usage optimization

## Privacy & Data

- Weather API calls are made directly from your browser
- No data is sent to external servers beyond the weather API
- All calculations happen locally in your browser
- Your historical solar data never leaves your computer
