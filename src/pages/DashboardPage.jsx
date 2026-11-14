import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import WeatherCard from "../components/WeatherCard.jsx";
import { clearAuth, getAuthUser } from "../auth.js";
import { fetchForecast, getLocation } from "../weather.js";

function dayTitle(date, index) {
  if (index === 0) return "Сьогодні";
  if (index === 1) return "Завтра";
  return new Date(`${date}T00:00:00`).toLocaleDateString("uk-UA", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [forecast, setForecast] = useState([]);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const place = await getLocation();
        const days = await fetchForecast(
          place.latitude,
          place.longitude,
          controller.signal,
        );
        setLocation(place);
        setForecast(days);
        setStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || "Не вдалося завантажити погоду");
        setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="logo">⛅ Weather App</span>
        <span className="user">
          {getAuthUser()}
          <button type="button" className="link-button" onClick={handleLogout}>
            Вийти
          </button>
        </span>
      </header>

      <main>
        {status === "loading" && <Loader text="Завантаження прогнозу..." />}

        {status === "error" && (
          <div className="error-box" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Спробувати ще раз
            </button>
          </div>
        )}

        {status === "success" && (
          <>
            <h1 className="location">
              {location.label}{" "}
              <small>
                {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
              </small>
            </h1>
            <section className="forecast">
              {forecast.map((day, index) => (
                <WeatherCard key={day.date} title={dayTitle(day.date, index)} day={day} />
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
