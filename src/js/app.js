import { randomUserMock, additionalUsers } from "./FE4U-Lab2-mock.js";

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

const PHONE_FORMATS = {
  Germany: /^\d{4}-\d{7}$/,
  Ireland: /^\d{3}-\d{3}-\d{4}$/,
  Australia: /^\d{2}-\d{4}-\d{4}$/,
  "United States": /^\(\d{3}\)-\d{3}-\d{4}$/,
  Finland: /^\d{2}-\d{3}-\d{3}$/,
  Turkey: /^\(\d{3}\)-\d{3}-\d{4}$/,
  Switzerland: /^\d{3} \d{3} \d{2} \d{2}$/,
  "New Zealand": /^\(\d{3}\)-\d{3}-\d{4}$/,
  Spain: /^\d{3}-\d{3}-\d{3}$/,
  Norway: /^\d{8}$/,
  Iran: /^\d{3}-\d{8}$/,
  Canada: /^\d{3}-\d{3}-\d{4}$/,
  France: /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/,
  Denmark: /^\d{8}$/,
  Netherlands: /^\(\d{3}\)-\d{3}-\d{4}$/,
};

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
    age = age - 1;
  }
  return age;
}

function convertMockUser(user) {
  return {
    gender: user.gender,
    title: user.name.title,
    full_name: user.name.first + " " + user.name.last,
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
  const result = Object.assign({}, user);
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

function startsWithCapital(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  return value[0] === value[0].toUpperCase();
}

export function validateUser(user) {
  const stringFields = [
    "full_name",
    "gender",
    "note",
    "state",
    "city",
    "country",
  ];
  for (const field of stringFields) {
    if (!startsWithCapital(user[field])) {
      return false;
    }
  }

  if (typeof user.age !== "number") {
    return false;
  }

  if (typeof user.email !== "string" || !user.email.includes("@")) {
    return false;
  }

  const phoneFormat = PHONE_FORMATS[user.country];
  if (
    typeof user.phone !== "string" ||
    !phoneFormat ||
    !phoneFormat.test(user.phone)
  ) {
    return false;
  }

  return true;
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

const users = formatUsers(randomUserMock, additionalUsers);
console.log("Total users:", users.length);
console.log("Valid users:", users.filter(validateUser).length);
console.log(
  "Male users from Germany:",
  filterUsers(users, { country: "Germany", gender: "Male" }).length,
);
console.log(
  "Top 3 by age (desc):",
  sortUsers(users, "age", "desc")
    .slice(0, 3)
    .map((u) => u.full_name),
);
const found = findUser(users, "name", "claude");
console.log("Search 'claude':", found ? found.full_name : "not found");
console.log(
  "Percentage with age > 30:",
  matchPercentage(users, (u) => u.age > 30),
);
