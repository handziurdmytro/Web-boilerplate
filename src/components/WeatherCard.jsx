import { describeWeather } from "../weather.js";

const COMPASS = ["Пн", "ПнСх", "Сх", "ПдСх", "Пд", "ПдЗх", "Зх", "ПнЗх"];

function compassDirection(degrees) {
  return COMPASS[Math.round(degrees / 45) % COMPASS.length];
}

function formatTime(isoDateTime) {
  return isoDateTime.slice(11, 16);
}

export default function WeatherCard({ title, day }) {
  const weather = describeWeather(day.code);

  return (
    <article className="weather-card">
      <h3 className="weather-card-title">{title}</h3>
      <div className="weather-card-icon" aria-hidden="true">
        {weather.icon}
      </div>
      <p className="weather-card-label">{weather.label}</p>

      <p className="weather-card-temp">
        <span>Макс: {Math.round(day.tempMax)}°C</span>
        <span>Мін: {Math.round(day.tempMin)}°C</span>
      </p>

      <dl className="weather-card-details">
        <dt>Вітер</dt>
        <dd>
          <span
            className="wind-arrow"
            style={{ transform: `rotate(${day.windDirection}deg)` }}
            aria-hidden="true"
          >
            ↓
          </span>{" "}
          {Math.round(day.windSpeed)} км/год, {compassDirection(day.windDirection)}
        </dd>
        <dt>Вологість</dt>
        <dd>{day.humidity}%</dd>
        <dt>Ймовірність опадів</dt>
        <dd>{day.precipitation}%</dd>
        <dt>Схід / захід</dt>
        <dd>
          {formatTime(day.sunrise)} / {formatTime(day.sunset)}
        </dd>
      </dl>
    </article>
  );
}
