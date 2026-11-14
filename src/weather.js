const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DAYS = 5;

export const KYIV = { latitude: 50.4501, longitude: 30.5234, label: "Київ" };

const WEATHER_CODES = {
  0: { label: "Ясно", icon: "☀️" },
  1: { label: "Переважно ясно", icon: "🌤️" },
  2: { label: "Мінлива хмарність", icon: "⛅" },
  3: { label: "Хмарно", icon: "☁️" },
  45: { label: "Туман", icon: "🌫️" },
  48: { label: "Туман з інеєм", icon: "🌫️" },
  51: { label: "Легка мряка", icon: "🌦️" },
  53: { label: "Мряка", icon: "🌦️" },
  55: { label: "Сильна мряка", icon: "🌧️" },
  56: { label: "Крижана мряка", icon: "🌧️" },
  57: { label: "Сильна крижана мряка", icon: "🌧️" },
  61: { label: "Невеликий дощ", icon: "🌦️" },
  63: { label: "Дощ", icon: "🌧️" },
  65: { label: "Злива", icon: "🌧️" },
  66: { label: "Крижаний дощ", icon: "🌧️" },
  67: { label: "Сильний крижаний дощ", icon: "🌧️" },
  71: { label: "Невеликий сніг", icon: "🌨️" },
  73: { label: "Сніг", icon: "🌨️" },
  75: { label: "Сильний снігопад", icon: "❄️" },
  77: { label: "Снігова крупа", icon: "🌨️" },
  80: { label: "Короткочасний дощ", icon: "🌦️" },
  81: { label: "Зливи", icon: "🌧️" },
  82: { label: "Сильні зливи", icon: "⛈️" },
  85: { label: "Снігові заряди", icon: "🌨️" },
  86: { label: "Сильні снігові заряди", icon: "❄️" },
  95: { label: "Гроза", icon: "⛈️" },
  96: { label: "Гроза з градом", icon: "⛈️" },
  99: { label: "Сильна гроза з градом", icon: "⛈️" },
};

export function describeWeather(code) {
  return WEATHER_CODES[code] || { label: "Невідомо", icon: "❔" };
}

export async function fetchForecast(latitude, longitude, signal) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
      "precipitation_probability_max",
      "relative_humidity_2m_mean",
      "sunrise",
      "sunset",
    ].join(","),
    timezone: "auto",
    forecast_days: DAYS,
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Сервер погоди відповів помилкою ${response.status}`);
  }
  const { daily } = await response.json();

  return daily.time.map((date, i) => ({
    date,
    code: daily.weather_code[i],
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    windSpeed: daily.wind_speed_10m_max[i],
    windDirection: daily.wind_direction_10m_dominant[i],
    precipitation: daily.precipitation_probability_max[i],
    humidity: daily.relative_humidity_2m_mean[i],
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
  }));
}

export function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(KYIV);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: "Ваше місцезнаходження",
        }),
      () => resolve(KYIV),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
}
