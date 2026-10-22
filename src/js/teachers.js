export const COURSES = [
  "Mathematics",
  "Physics",
  "English",
  "Computer Science",
  "Dancing",
  "Chess",
  "Biology",
  "Chemistry",
  "Law",
  "Art",
  "Medicine",
  "Statistics",
];

function randomCourse() {
  const index = Math.floor(Math.random() * COURSES.length);
  return COURSES[index];
}

const COLORS = [
  "#1f75cb",
  "#dface7",
  "#f4a261",
  "#2a9d8f",
  "#e76f51",
  "#8ecae6",
];

function randomColor() {
  const index = Math.floor(Math.random() * COLORS.length);
  return COLORS[index];
}

function calcAge(dateString) {
  const birth = new Date(dateString);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthday) {
    age -= 1;
  }
  return age;
}

function convertMockUser(user) {
  return {
    gender: user.gender,
    title: user.name.title,
    full_name: `${user.name.first} ${user.name.last}`,
    city: user.location.city,
    state: user.location.state,
    country: user.location.country,
    postcode: user.location.postcode,
    coordinates: user.location.coordinates,
    timezone: user.location.timezone,
    email: user.email,
    b_date: user.dob.date,
    age: user.dob.age,
    phone: user.phone,
    picture_large: user.picture.large,
    picture_thumbnail: user.picture.thumbnail,
    id: user.login.uuid,
  };
}

function convertExtraUser(user) {
  const result = { ...user };
  if (result.b_day !== undefined) {
    result.b_date = result.b_day;
    delete result.b_day;
  }
  if (result.age === undefined && result.b_date) {
    result.age = calcAge(result.b_date);
  }
  return result;
}

export function formatUsers(mockUsers, extraUsers) {
  const result = [];

  for (const mockUser of mockUsers) {
    const user = convertMockUser(mockUser);
    const exists = result.find((u) => u.full_name === user.full_name);
    if (!exists) {
      result.push(user);
    }
  }

  for (const extraUser of extraUsers) {
    const user = convertExtraUser(extraUser);
    const exists = result.find((u) => u.full_name === user.full_name);
    if (exists) {
      for (const key in user) {
        if (user[key] !== null && user[key] !== undefined) {
          exists[key] = user[key];
        }
      }
    } else {
      result.push(user);
    }
  }

  for (const user of result) {
    user.favorite = user.favorite === true;
    user.course = user.course ? user.course : randomCourse();
    user.bg_color = user.bg_color ? user.bg_color : randomColor();
    user.note = user.note ? user.note : "No notes";
    user.gender = user.gender[0].toUpperCase() + user.gender.slice(1);
  }

  return result;
}

export function validateUser(user) {
  const fields = ["full_name", "gender", "city", "country"];
  for (const field of fields) {
    if (typeof user[field] !== "string" || !user[field].trim()) return false;
  }
  if (!Number.isInteger(user.age) || user.age < 0) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return false;
  if (
    typeof user.phone !== "string" ||
    !/^[+0-9() .-]{7,25}$/.test(user.phone)
  ) {
    return false;
  }
  const phoneDigits = user.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7) return false;
  const birth = new Date(user.b_date);
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return false;
  return true;
}

export async function fetchUsers(count, page, seed) {
  const url = `https://randomuser.me/api/?results=${count}&page=${page}&seed=${encodeURIComponent(seed)}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("Could not load teachers. Please try again.");
  const data = await response.json();
  if (data.error || !Array.isArray(data.results) || !data.results.length) {
    throw new Error("No teachers received. Please try again.");
  }
  return formatUsers(data.results, []);
}

export async function saveUser(user) {
  const response = await fetch("http://localhost:3002/teachers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    throw new Error("Could not save the teacher. Please try again.");
  }
  return response.json();
}

export function filterUsers(users, filters) {
  const result = [];

  for (const user of users) {
    let ok = true;
    if (filters.country !== undefined && user.country !== filters.country) {
      ok = false;
    }
    if (filters.age !== undefined && user.age !== filters.age) {
      ok = false;
    }
    if (filters.gender !== undefined && user.gender !== filters.gender) {
      ok = false;
    }
    if (filters.favorite !== undefined && user.favorite !== filters.favorite) {
      ok = false;
    }
    if (ok) {
      result.push(user);
    }
  }

  return result;
}

export function sortUsers(users, field, order) {
  const copy = users.slice();

  copy.sort((a, b) => {
    const first = a[field];
    const second = b[field];

    if (first === undefined && second === undefined) return 0;
    if (first === undefined) return 1;
    if (second === undefined) return -1;

    let diff;
    if (typeof first === "string") {
      diff = first.localeCompare(second);
    } else {
      diff = first - second;
    }

    return order === "desc" ? -diff : diff;
  });

  return copy;
}

export function findUser(users, field, query) {
  if (field === "name") {
    field = "full_name";
  }

  for (const user of users) {
    const value = user[field];
    if (typeof query === "number") {
      if (value === query) {
        return user;
      }
    } else if (typeof value === "string") {
      if (value.toLowerCase().includes(query.toLowerCase())) {
        return user;
      }
    }
  }

  return undefined;
}

export function matchPercentage(users, predicate) {
  if (users.length === 0) {
    return 0;
  }
  const count = users.filter(predicate).length;
  return (count / users.length) * 100;
}

export const users = [];
