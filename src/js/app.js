import "../css/app.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import WebDataRocks from "@webdatarocks/webdatarocks";
import "@webdatarocks/webdatarocks/webdatarocks.css";
import {
  users as teacherUsers,
  COURSES,
  filterUsers as filterTeachers,
  fetchUsers,
  validateUser,
  saveUser,
} from "./teachers.js";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CHART_COLORS = [
  "#fb6a2c",
  "#1f75cb",
  "#2a9d8f",
  "#e76f51",
  "#8ecae6",
  "#dface7",
  "#f4a261",
  "#d44d45",
  "#6a4c93",
  "#43aa8b",
  "#f9844a",
  "#277da1",
];

function daysUntilBirthday(bDate) {
  if (!bDate) return undefined;
  const birth = dayjs(bDate);
  if (!birth.isValid()) return undefined;
  const today = dayjs().startOf("day");
  let next = birth.year(today.year()).startOf("day");
  if (next.isBefore(today)) next = next.add(1, "year");
  return next.diff(today, "day");
}

export default function setupTeachers(users, courses, filterUsers) {
  const grid = document.querySelector(".teachers-grid");
  const favoritesGrid = document.querySelector(".favorites-grid");
  const filters = document.querySelector(".teachers-filters");
  const searchForm = document.querySelector(".search-form");
  const addForm = document.querySelector(".add-teacher-form");
  const chartCanvas = document.querySelector(".statistics-piechart");
  const pivotContainer = document.querySelector(".statistics-pivot");
  const pivotButtons = document.querySelectorAll("[data-pivot-view]");
  const modal = document.querySelector("#teacher-info-modal");
  const ageFilter = document.querySelector("#filter-age");
  const countryFilter = document.querySelector("#filter-region");
  const genderFilter = document.querySelector("#filter-sex");
  let query = "";
  let selectedUser;
  let favoritePage = 0;
  const favoritePageSize = 5;
  let teacherMap;
  let teacherMarker;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className || "";
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillSelect(select, values, allLabel) {
    select.replaceChildren();
    if (allLabel) select.add(new Option(allLabel, ""));
    for (let i = 0; i < values.length; i += 1) {
      select.add(new Option(values[i], values[i]));
    }
  }

  function updateCountries() {
    const selectedCountry = countryFilter.value;
    const newCountry = document.querySelector("#new-country");
    const selectedNewCountry = newCountry.value || "Ukraine";
    const countries = ["Ukraine"];
    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      if (user.country && !countries.includes(user.country)) {
        countries.push(user.country);
      }
    }
    countries.sort();
    fillSelect(countryFilter, countries, "All countries");
    countryFilter.value = selectedCountry;
    fillSelect(newCountry, countries);
    newCountry.value = selectedNewCountry;
  }

  updateCountries();
  ageFilter.insertBefore(new Option("All ages", ""), ageFilter.firstChild);
  ageFilter.value = "";
  fillSelect(genderFilter, ["Male", "Female"], "All genders");
  fillSelect(document.querySelector("#new-speciality"), courses);

  const loadButton = element("button", "btn-add-teacher", "Next");
  loadButton.type = "button";
  const loadStatus = element("p");
  loadStatus.setAttribute("role", "status");
  grid.after(loadStatus, loadButton);
  const statisticsCount = document.querySelector(".statistics-count");
  let loading = false;
  let initialLoaded = false;
  let nextPage = 6;
  const seed = `teachinder-${Date.now()}`;

  const pivotFields = [
    "full_name",
    "course",
    "age",
    "gender",
    "country",
    "city",
    "b_date",
    "email",
    "phone",
  ];
  const pivotLabels = [
    "Name",
    "Speciality",
    "Age",
    "Gender",
    "Nationality",
    "City",
    "Date of birth",
    "Email",
    "Phone",
  ];
  const pivotMeta = {};
  for (let i = 0; i < pivotFields.length; i += 1) {
    pivotMeta[pivotFields[i]] = {
      caption: pivotLabels[i],
      type: pivotFields[i] === "age" ? "number" : "string",
    };
  }

  const pivotReports = {
    country: {
      slice: {
        rows: [{ uniqueName: "country" }],
        columns: [{ uniqueName: "[Measures]" }],
        measures: [
          { uniqueName: "full_name", aggregation: "count", caption: "Teachers" },
        ],
      },
      options: { grid: { type: "compact" } },
    },
    flat: {
      slice: {
        rows: pivotFields.map((name) => ({ uniqueName: name })),
        columns: [],
        measures: [],
        flatOrder: pivotFields,
      },
      options: {
        grid: { type: "flat", showTotals: "off", showGrandTotals: "off" },
      },
    },
  };
  let pivotView = "country";

  function pivotReport() {
    const rows = users.map((user) => ({
      ...user,
      b_date: user.b_date ? user.b_date.slice(0, 10) : undefined,
    }));
    return {
      ...pivotReports[pivotView],
      dataSource: { data: [pivotMeta, ...rows] },
    };
  }

  const pivot = new WebDataRocks({
    container: pivotContainer,
    toolbar: false,
    report: pivotReport(),
  });

  pivotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      pivotButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      pivotView = button.dataset.pivotView;
      pivot.setReport(pivotReport());
    });
  });

  let pieChart;

  function renderChart(list) {
    const counts = {};
    for (let i = 0; i < list.length; i += 1) {
      const key = list[i].course || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    }
    const chartLabels = Object.keys(counts);
    const data = chartLabels.map((key) => counts[key]);
    const colors = chartLabels.map(
      (_, i) => CHART_COLORS[i % CHART_COLORS.length],
    );
    if (!pieChart) {
      pieChart = new Chart(chartCanvas, {
        type: "pie",
        data: {
          labels: chartLabels,
          datasets: [{ data, backgroundColor: colors }],
        },
        options: {
          plugins: {
            legend: { position: "right" },
            title: { display: true, text: "Teachers by speciality" },
          },
        },
      });
    } else {
      pieChart.data.labels = chartLabels;
      pieChart.data.datasets[0].data = data;
      pieChart.data.datasets[0].backgroundColor = colors;
      pieChart.update();
    }
  }

  function avatar(user) {
    const box = element("div", "teacher-avatar");
    box.style.backgroundColor = user.bg_color;
    const parts = user.full_name.trim().split(/\s+/);
    let initials = parts[0][0];
    if (parts.length > 1) initials += `.${parts[parts.length - 1][0]}`;
    const placeholder = element("span", "initials", initials.toUpperCase());
    if (user.picture_large || user.picture_thumbnail) {
      const img = element("img");
      img.src = user.picture_large || user.picture_thumbnail;
      img.alt = user.full_name;
      img.width = 144;
      img.height = 144;
      box.appendChild(img);
    } else {
      box.classList.add("placeholder");
      box.appendChild(placeholder);
    }
    if (user.favorite) box.appendChild(element("span", "favorite-star", "★"));
    return box;
  }

  function renderCards(container, list) {
    container.replaceChildren();
    for (let i = 0; i < list.length; i += 1) {
      const user = list[i];
      const link = element("a");
      link.href = "#teacher-info-modal";
      link.dataset.user = users.indexOf(user);
      const card = element("article", "teacher-card");
      card.appendChild(avatar(user));
      const info = element("div", "teacher-info");
      info.appendChild(element("h3", "name", user.full_name));
      info.appendChild(element("p", "subject", user.course));
      info.appendChild(
        element("p", "country", user.country || "Unknown country"),
      );
      card.appendChild(info);
      link.appendChild(card);
      container.appendChild(link);
    }
    if (!list.length)
      container.appendChild(element("p", "", "No teachers found."));
  }

  function matchingUsers() {
    const options = {};
    if (countryFilter.value) options.country = countryFilter.value;
    if (genderFilter.value) options.gender = genderFilter.value;
    if (document.querySelector("#filter-favourites").checked)
      options.favorite = true;
    return filterUsers(users, options).filter((user) => {
      const age = ageFilter.value;
      if (age === "18-31" && !(user.age >= 18 && user.age <= 31)) return false;
      if (age === "32-60" && !(user.age >= 32 && user.age <= 60)) return false;
      if (age === "61+" && !(user.age >= 61)) return false;
      if (
        document.querySelector("#filter-with-photo").checked &&
        !user.picture_large &&
        !user.picture_thumbnail
      )
        return false;
      if (
        query &&
        !user.full_name.toLowerCase().includes(query) &&
        !(user.note || "").toLowerCase().includes(query) &&
        String(user.age) !== query
      )
        return false;
      return true;
    });
  }

  function renderStatistics(list) {
    statisticsCount.textContent = `Teachers: ${list.length} of ${users.length}`;
    renderChart(list);
    pivot.setReport(pivotReport());
  }

  function renderFavorites() {
    const favorites = filterUsers(users, { favorite: true });
    const lastPage = Math.max(
      0,
      Math.ceil(favorites.length / favoritePageSize) - 1,
    );
    favoritePage = Math.min(favoritePage, lastPage);
    renderCards(
      favoritesGrid,
      favorites.slice(
        favoritePage * favoritePageSize,
        (favoritePage + 1) * favoritePageSize,
      ),
    );
    document.querySelector(".carousel-btn.prev").disabled = favoritePage === 0;
    document.querySelector(".carousel-btn.next").disabled =
      favoritePage === lastPage;
  }

  function render() {
    const list = matchingUsers();
    renderCards(grid, list);
    renderStatistics(list);
    renderFavorites();
  }

  async function loadTeachers() {
    if (loading) return;
    loading = true;
    loadButton.disabled = true;
    loadStatus.textContent = "Loading teachers...";
    try {
      const count = initialLoaded ? 10 : 50;
      const requestPage = initialLoaded ? nextPage : 1;
      const received = await fetchUsers(count, requestPage, seed);
      for (let i = 0; i < received.length; i += 1) {
        const user = received[i];
        if (!users.some((existing) => existing.id === user.id)) {
          users.push(user);
        }
      }
      if (initialLoaded) nextPage += 1;
      initialLoaded = true;
      loadButton.textContent = "Next";
      loadStatus.textContent = "";
      updateCountries();
      render();
    } catch (error) {
      loadStatus.textContent = "Could not load teachers. Please try again.";
      loadButton.textContent = "Retry";
    } finally {
      loading = false;
      loadButton.disabled = false;
    }
  }

  loadButton.addEventListener("click", loadTeachers);

  function showTeacher(user) {
    selectedUser = user;
    const photo = modal.querySelector(".teacher-details-photo");
    photo.textContent = "";
    photo.appendChild(avatar(user));
    modal.querySelector("h3").textContent = user.full_name;
    modal.querySelector(".subject").textContent = user.course;
    modal.querySelector(".location").textContent = [user.city, user.country]
      .filter(Boolean)
      .join(", ");
    modal.querySelector(".demographics").textContent =
      `${user.age === undefined ? "Unknown age" : user.age}, ${user.gender}`;
    const daysLeft = daysUntilBirthday(user.b_date);
    let birthdayText = "";
    if (daysLeft === 0) birthdayText = "🎉 Birthday is today!";
    else if (daysLeft !== undefined)
      birthdayText = `${daysLeft} day(s) until next birthday`;
    modal.querySelector(".birthday-countdown").textContent = birthdayText;
    const email = modal.querySelector(".email-link");
    email.textContent = user.email || "No email";
    if (user.email) email.href = `mailto:${user.email}`;
    else email.removeAttribute("href");
    modal.querySelector(".phone").textContent = user.phone || "No phone";
    modal.querySelector(".teacher-details-notes").textContent = user.note;
    const star = modal.querySelector(".favorite-star-outline");
    star.textContent = user.favorite ? "★" : "☆";
    star.setAttribute("role", "button");
    star.tabIndex = 0;
    star.setAttribute(
      "aria-label",
      user.favorite ? "Remove from favorites" : "Add to favorites",
    );
    star.setAttribute("aria-pressed", String(user.favorite));
    const mapContainer = modal.querySelector(".teacher-map");
    mapContainer.hidden = true;
    if (teacherMap) {
      teacherMap.remove();
      teacherMap = undefined;
      teacherMarker = undefined;
    }
    mapContainer.textContent = "";
  }

  function showTeacherLocation(user) {
    const mapContainer = modal.querySelector(".teacher-map");
    const lat = user.coordinates ? parseFloat(user.coordinates.latitude) : NaN;
    const lng = user.coordinates ? parseFloat(user.coordinates.longitude) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      mapContainer.textContent = "Location is not available for this teacher.";
      return;
    }
    if (!teacherMap) {
      teacherMap = L.map(mapContainer).setView([lat, lng], 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(teacherMap);
      teacherMarker = L.marker([lat, lng]).addTo(teacherMap);
      teacherMarker.bindPopup([user.city, user.country].filter(Boolean).join(", "));
    } else {
      teacherMap.setView([lat, lng], 9);
      teacherMarker.setLatLng([lat, lng]);
    }
    setTimeout(() => teacherMap.invalidateSize(), 0);
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-user]");
    if (card) showTeacher(users[Number(card.dataset.user)]);
    if (event.target.closest(".toggle-map-link") && selectedUser) {
      event.preventDefault();
      const mapContainer = modal.querySelector(".teacher-map");
      mapContainer.hidden = !mapContainer.hidden;
      if (!mapContainer.hidden) showTeacherLocation(selectedUser);
    }
    if (event.target.closest(".favorite-star-outline") && selectedUser) {
      selectedUser.favorite = !selectedUser.favorite;
      showTeacher(selectedUser);
      render();
    }
    if (event.target.closest(".carousel-btn.prev") && favoritePage > 0) {
      favoritePage -= 1;
      renderFavorites();
    }
    if (event.target.closest(".carousel-btn.next")) {
      favoritePage += 1;
      renderFavorites();
    }
    if (event.target.classList.contains("modal-overlay"))
      window.location.hash = "";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") window.location.hash = "";
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches(".favorite-star-outline")
    ) {
      event.preventDefault();
      event.target.click();
    }
  });

  filters.addEventListener("change", () => {
    render();
  });
  filters.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    query = searchForm.querySelector("input").value.trim().toLowerCase();
    render();
  });

  const requiredIds = [
    "new-name",
    "new-city",
    "new-email",
    "new-phone",
    "new-dob",
    "sex-male",
  ];
  for (let i = 0; i < requiredIds.length; i += 1) {
    document.getElementById(requiredIds[i]).required = true;
  }
  document.querySelector("#new-name").pattern = ".*\\S.*";
  document.querySelector("#new-city").pattern = ".*\\S.*";
  document.querySelector("#new-phone").pattern =
    "(?=(?:\\D*\\d){7})[+0-9\\(\\) .\\-]{7,25}";
  document.querySelector("#new-phone").title =
    "Enter a phone number with at least 7 digits.";
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  document.querySelector("#new-dob").max =
    `${today.getFullYear()}-${month}-${day}`;

  const formStatus = element("p");
  formStatus.setAttribute("role", "status");
  addForm.appendChild(formStatus);

  const submitButton = addForm.querySelector('[type="submit"]');
  let saving = false;

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!addForm.reportValidity()) return;
    const data = new FormData(addForm);
    const birth = new Date(`${data.get("dob")}T00:00:00`);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    )
      age -= 1;
    const user = {
      id: `teacher-${Date.now()}-${users.length}`,
      full_name: data.get("name").trim(),
      course: data.get("speciality"),
      country: data.get("country"),
      city: data.get("city").trim(),
      email: data.get("email").trim(),
      phone: data.get("phone").trim(),
      b_date: data.get("dob"),
      age,
      gender: data.get("sex") === "male" ? "Male" : "Female",
      bg_color: data.get("color"),
      note: data.get("notes").trim() || "No notes",
      favorite: false,
    };
    if (!validateUser(user)) {
      formStatus.textContent =
        "Please enter a valid name, location, email, phone and date of birth.";
      return;
    }
    saving = true;
    submitButton.disabled = true;
    formStatus.textContent = "Saving teacher...";
    try {
      const savedUser = await saveUser(user);
      users.push(savedUser);
      addForm.reset();
      formStatus.textContent = "";
      render();
      showTeacher(savedUser);
      window.location.hash = "teacher-info-modal";
    } catch (error) {
      formStatus.textContent =
        "Could not save the teacher. Check that JSON Server is running and try again.";
    } finally {
      saving = false;
      submitButton.disabled = false;
    }
  });

  render();
  loadTeachers();
}

setupTeachers(teacherUsers, COURSES, filterTeachers);
