import {
  users as teacherUsers,
  COURSES,
  filterUsers as filterTeachers,
  sortUsers as sortTeachers,
  fetchUsers,
  validateUser,
  saveUser,
} from "./teachers.js";

export default function setupTeachers(users, courses, filterUsers, sortUsers) {
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
  const statisticsCount = element("p");
  table.before(statisticsCount);
  let loading = false;
  let initialLoaded = false;
  let nextPage = 6;
  const seed = `teachinder-${Date.now()}`;

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
    const sorted = sortUsers(list, sortField, sortOrder);
    const pageCount = Math.ceil(sorted.length / pageSize);
    page = Math.max(1, Math.min(page, pageCount));
    const body = table.querySelector("tbody");
    body.textContent = "";
    const pageUsers = sorted.slice((page - 1) * pageSize, page * pageSize);
    for (let i = 0; i < pageUsers.length; i += 1) {
      const user = pageUsers[i];
      const row = element("tr");
      for (let j = 0; j < fields.length; j += 1) {
        const field = fields[j];
        let value = user[field];
        if (field === "b_date" && value) value = value.slice(0, 10);
        row.appendChild(element("td", "", value === undefined ? "—" : value));
      }
      body.appendChild(row);
    }
    for (let i = 0; i < fields.length; i += 1) {
      const heading = headingRow.children[i];
      const active = fields[i] === sortField;
      let arrow = "";
      let direction = "none";
      if (active) {
        arrow = sortOrder === "asc" ? " ↑" : " ↓";
        direction = sortOrder === "asc" ? "ascending" : "descending";
      }
      heading.textContent = labels[i] + arrow;
      heading.setAttribute("aria-sort", direction);
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
  }

  document.addEventListener("click", (event) => {
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") window.location.hash = "";
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches("[data-sort], .favorite-star-outline")
    ) {
      event.preventDefault();
      event.target.click();
    }
  });

  filters.addEventListener("change", () => {
    page = 1;
    render();
  });
  filters.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  searchForm.addEventListener("submit", (event) => {
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

setupTeachers(teacherUsers, COURSES, filterTeachers, sortTeachers);
