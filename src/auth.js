const VALID_LOGIN = "dmytro3";
const VALID_PASSWORD = "dmytro3";

const COOKIE_NAME = "auth_user";
const REMEMBER_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_PATTERN = /^[a-z]+\d$/i;

export function validateCredentials(login, password) {
  const errors = {};
  const trimmedLogin = login.trim();

  if (!trimmedLogin) {
    errors.login = "Введіть логін";
  } else if (!LOGIN_PATTERN.test(trimmedLogin)) {
    errors.login = "Логін має складатися з імені та номера курсу, наприклад mark5";
  }

  if (!password) {
    errors.password = "Введіть пароль";
  }

  if (Object.keys(errors).length === 0) {
    const isValid =
      trimmedLogin.toLowerCase() === VALID_LOGIN && password === VALID_PASSWORD;
    if (!isValid) errors.form = "Невірний логін або пароль";
  }

  return errors;
}

export function getAuthUser() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

export function saveAuth(login, remember) {
  const maxAge = remember ? `; max-age=${REMEMBER_SECONDS}` : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(login)}; path=/; SameSite=Lax${maxAge}`;
}

export function clearAuth() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
