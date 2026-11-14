import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthUser, saveAuth, validateCredentials } from "../auth.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});

  if (getAuthUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateCredentials(login, password);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    saveAuth(login.trim().toLowerCase(), remember);
    navigate("/dashboard", { replace: true });
  }

  function handleLoginChange(event) {
    setLogin(event.target.value);
    setErrors((prev) => ({ ...prev, login: undefined, form: undefined }));
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value);
    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
  }

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <h1>Вхід у Weather App</h1>

        {errors.form && (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        )}

        <label htmlFor="login">Логін</label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          placeholder="mark5"
          value={login}
          onChange={handleLoginChange}
          aria-invalid={Boolean(errors.login)}
          aria-describedby={errors.login ? "login-error" : undefined}
        />
        {errors.login && (
          <p id="login-error" className="field-error">
            {errors.login}
          </p>
        )}

        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={handlePasswordChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p id="password-error" className="field-error">
            {errors.password}
          </p>
        )}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          Запам'ятати мене
        </label>

        <button type="submit">Увійти</button>
      </form>
    </main>
  );
}
