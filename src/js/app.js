import { users, COURSES, filterUsers, sortUsers } from "./teachers.js";

export function setupTeachers(users, courses, filterUsers, sortUsers) {
  const grid = document.querySelector(".teachers-grid");
  const favoritesGrid = document.querySelector(".favorites-grid");
  const filters = document.querySelector(".teachers-filters");
  const searchForm = document.querySelector(".search-form");
  const addForm = document.querySelector(".add-teacher-form");
  const table = document.querySelector(".statistics-table");
  const modal = document.querySelector("#teacher-info-modal");
  const ageFilter = document.querySelector("#filter-age");
  const countryFilter = document.querySelector("#filter-region");
  const genderFilter = document.querySelector("#filter-sex");
  let query = "";
  let selectedUser;
  let sortField = "full_name";
  let sortOrder = "asc";
  let page = 1;
  let favoritePage = 0;
  const pageSize = 10;
  const favoritePageSize = 5;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className || "";
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillSelect(select, values, allLabel) {
    select.textContent = "";
    if (allLabel) select.add(new Option(allLabel, ""));
    for (const value of values) select.add(new Option(value, value));
  }

  const countries = ["Ukraine"];
  for (const user of users) {
    if (user.country && !countries.includes(user.country)) {
      countries.push(user.country);
    }
  }
  countries.sort();
  fillSelect(countryFilter, countries, "All countries");
  ageFilter.insertBefore(new Option("All ages", ""), ageFilter.firstChild);
  ageFilter.value = "";
  fillSelect(genderFilter, ["Male", "Female"], "All genders");
  fillSelect(document.querySelector("#new-country"), countries);
  document.querySelector("#new-country").value = "Ukraine";
  fillSelect(document.querySelector("#new-speciality"), courses);

  const fields = ["full_name", "course", "age", "gender", "country", "b_date"];
  const labels = [
    "Name",
    "Speciality",
    "Age",
    "Gender",
    "Nationality",
    "Date of birth",
  ];
  const headingRow = table.querySelector("thead tr");
  headingRow.textContent = "";
  for (let i = 0; i < fields.length; i += 1) {
    const heading = element("th", "", labels[i]);
    heading.dataset.sort = fields[i];
    heading.tabIndex = 0;
    heading.style.cursor = "pointer";
    headingRow.appendChild(heading);
  }

  function avatar(user) {
    const box = element("div", "teacher-avatar");
    box.style.backgroundColor = user.bg_color;
    const parts = user.full_name.trim().split(/\s+/);
    let initials = parts[0][0];
    if (parts.length > 1) initials += "." + parts[parts.length - 1][0];
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
    container.textContent = "";
    for (const user of list) {
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
    const result = [];
    for (const user of filterUsers(users, options)) {
      const age = ageFilter.value;
      if (age === "18-31" && !(user.age >= 18 && user.age <= 31)) continue;
      if (age === "32-60" && !(user.age >= 32 && user.age <= 60)) continue;
      if (age === "61+" && !(user.age >= 61)) continue;
      if (
        document.querySelector("#filter-with-photo").checked &&
        !user.picture_large &&
        !user.picture_thumbnail
      )
        continue;
      if (
        query &&
        !user.full_name.toLowerCase().includes(query) &&
        !(user.note || "").toLowerCase().includes(query) &&
        String(user.age) !== query
      )
        continue;
      result.push(user);
    }
    return result;
  }

  function renderStatistics(list) {
    const sorted = sortUsers(list, sortField, sortOrder);
    const pageCount = Math.ceil(sorted.length / pageSize);
    page = Math.max(1, Math.min(page, pageCount));
    const body = table.querySelector("tbody");
    body.textContent = "";
    for (const user of sorted.slice((page - 1) * pageSize, page * pageSize)) {
      const row = element("tr");
      for (const field of fields) {
        let value = user[field];
        if (field === "b_date" && value) value = value.slice(0, 10);
        row.appendChild(element("td", "", value === undefined ? "—" : value));
      }
      body.appendChild(row);
    }
    for (let i = 0; i < fields.length; i += 1) {
      const heading = headingRow.children[i];
      const active = fields[i] === sortField;
      heading.textContent =
        labels[i] + (active ? (sortOrder === "asc" ? " ↑" : " ↓") : "");
      heading.setAttribute(
        "aria-sort",
        active ? (sortOrder === "asc" ? "ascending" : "descending") : "none",
      );
    }
    const pagination = document.querySelector(".pagination ul");
    pagination.textContent = "";
    for (let i = 1; i <= pageCount; i += 1) {
      const item = element("li");
      const link = element("a", "", i);
      link.href = "#statistics";
      link.dataset.page = i;
      if (i === page) link.setAttribute("aria-current", "page");
      item.appendChild(link);
      pagination.appendChild(item);
    }
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
      (user.age === undefined ? "Unknown age" : user.age) + ", " + user.gender;
    const email = modal.querySelector(".email-link");
    email.textContent = user.email || "No email";
    if (user.email) email.href = "mailto:" + user.email;
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
  }

  document.addEventListener("click", function (event) {
    const card = event.target.closest("[data-user]");
    if (card) showTeacher(users[Number(card.dataset.user)]);
    if (event.target.closest(".favorite-star-outline") && selectedUser) {
      selectedUser.favorite = !selectedUser.favorite;
      showTeacher(selectedUser);
      render();
    }
    const heading = event.target.closest("[data-sort]");
    if (heading) {
      sortOrder =
        sortField === heading.dataset.sort && sortOrder === "asc"
          ? "desc"
          : "asc";
      sortField = heading.dataset.sort;
      page = 1;
      renderStatistics(matchingUsers());
    }
    const pageLink = event.target.closest("[data-page]");
    if (pageLink) {
      event.preventDefault();
      page = Number(pageLink.dataset.page);
      renderStatistics(matchingUsers());
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

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") window.location.hash = "";
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches("[data-sort], .favorite-star-outline")
    ) {
      event.preventDefault();
      event.target.click();
    }
  });

  filters.addEventListener("change", function () {
    page = 1;
    render();
  });
  filters.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    query = searchForm.querySelector("input").value.trim().toLowerCase();
    page = 1;
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
  for (const id of requiredIds) document.getElementById(id).required = true;
  document.querySelector("#new-name").pattern = ".*\\S.*";
  document.querySelector("#new-city").pattern = ".*\\S.*";
  document.querySelector("#new-phone").pattern = "[+0-9\\(\\) .\\-]{7,25}";
  const today = new Date();
  document.querySelector("#new-dob").max =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  addForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!addForm.reportValidity()) return;
    const data = new FormData(addForm);
    const birth = new Date(data.get("dob") + "T00:00:00");
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    )
      age -= 1;
    const user = {
      id: "teacher-" + Date.now() + "-" + users.length,
      full_name: data.get("name").trim(),
      course: data.get("speciality"),
      country: data.get("country"),
      city: data.get("city").trim(),
      email: data.get("email").trim(),
      phone: data.get("phone").trim(),
      b_date: data.get("dob"),
      age: age,
      gender: data.get("sex") === "male" ? "Male" : "Female",
      bg_color: data.get("color"),
      note: data.get("notes").trim() || "No notes",
      favorite: false,
    };
    users.push(user);
    addForm.reset();
    render();
    showTeacher(user);
    window.location.hash = "teacher-info-modal";
  });

  render();
}

setupTeachers(users, COURSES, filterUsers, sortUsers);
