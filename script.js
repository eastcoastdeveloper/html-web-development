(function () {
  // Get JSON: SERVER REQUIRED!
  async function fetchEvents() {
    try {
      const response = await fetch("events.json"); // Adjust path if needed
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const events = await response.json();
      return events;
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return [];
    }
  }

  fetchEvents().then((data) => {
    renderEventsUI(data);
  });
})();

function renderEventsUI(events) {
  // Variables
  const eventList = document.getElementById("eventList");
  const eventImage = document.getElementById("eventImage");
  const eventDescription = document.getElementById("eventDescription");
  const eventTagsContainer = document.getElementById("eventTags");
  const countdownEl = document.getElementById("countdown");
  const tooltip = document.getElementById("tooltip");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalTags = document.getElementById("modalTags");
  const rsvpBtn = document.getElementById("rsvpBtn");
  const addCalendarBtn = document.getElementById("addCalendarBtn");
  const likeBtn = document.getElementById("likeBtn");
  const searchInput = document.getElementById("searchInput");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const shareFacebook = document.getElementById("shareFacebook");
  const shareX = document.getElementById("shareX");
  const emailForm = document.getElementById("emailForm");
  const emailInput = document.getElementById("emailInput");

  let currentEventKey = null;
  let likedEvents = JSON.parse(localStorage.getItem("likedEvents") || "{}");
  let darkMode = localStorage.getItem("darkMode") === "true";
  darkModeToggle.innerText = "Darken";

  // Initialize Dark Mode
  function applyDarkMode(on) {
    if (on) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("darkMode", on);
  }

  applyDarkMode(darkMode);
  darkModeToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    darkMode ? (darkModeToggle.innerText = "Brighten") : (darkModeToggle.innerText = "Darken");
    console.log(darkModeToggle);
    applyDarkMode(darkMode);
  });

  // Process Data & Render Event List Column
  function renderEventList(filterText = "") {
    eventList.innerHTML = "";
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const month of events) {
      const monthLi = document.createElement("li");
      monthLi.textContent = new Date(month.dateTime).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      const targetMonth = monthLi.innerText.split(" ")[0];

      monthLi.classList.add("month-divider");
      eventList.appendChild(monthLi);

      const sortedDates = events.sort((a, b) => {
        return new Date(a.dateTime) - new Date(b.dateTime);
      });

      let tabIndex = 0;

      for (const dateStr of sortedDates) {
        const ev = events[tabIndex];
        tabIndex++;
        if (filterText) {
          const textToSearch = [ev.title, ev.description, ev.tags.join(" "), dateStr].join(" ").toLowerCase();
          if (!textToSearch.includes(filterText.toLowerCase())) continue;
        }

        const li = document.createElement("li");
        li.tabIndex = tabIndex;
        li.dataset.date = dateStr.dateTime.slice(0, 10);
        li.dataset.title = ev.title;

        // Highlight Today
        if (dateStr.dateTime.slice(0, 10) === todayStr) {
          li.classList.add("today");
        }

        // If Item Date Equals the Header
        // prettier-ignore
        if (new Date(dateStr.dateTime).toLocaleString("en-US", {month: "long"}) === targetMonth) {
          const circle = document.createElement("span");
          circle.className = "circle-indicator";
          li.appendChild(circle);

          // Date Text
          const dateDisplay = new Date(dateStr.dateTime).toLocaleDateString(undefined, {month: "short", day: "numeric"});

          const dateSpan = document.createElement("span");
          dateSpan.textContent = dateDisplay + ": ";
          li.appendChild(dateSpan);

          // Title Text
          const titleSpan = document.createElement("span");
          titleSpan.textContent = ev.title;
          li.appendChild(titleSpan);

          // Like Sidebar Event
          const uniqueKey = `${ev.dateTime}_${ev.title}`;
          const likeHeart = document.createElement("span");
          likeHeart.className = "like-btn";
          likeHeart.innerHTML = "&#10084;";

          if (likedEvents[uniqueKey]) likeHeart.classList.add("liked");
          likeHeart.title = likedEvents[uniqueKey] ? "Unlike event" : "Like event";
          likeHeart.style.marginLeft = "auto";
          likeHeart.style.fontSize = "1rem";
          likeHeart.style.userSelect = "none";
          li.appendChild(likeHeart);

          // Tags
          if (ev.tags && ev.tags.length) {
            const tagContainer = document.createElement("div");
            tagContainer.className = "event-tags";
            ev.tags.forEach((t) => {
              const tSpan = document.createElement("span");
              tSpan.className = "event-tag";
              tSpan.textContent = t;
              tagContainer.appendChild(tSpan);
            });

            li.appendChild(tagContainer);
          }

          likeHeart.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(uniqueKey, likeHeart);
          });

          // Hover Preview Tooltip Toggle
          li.addEventListener("mouseenter", (e) => {
            showTooltip(e, ev);
          });

          li.addEventListener("mousemove", (e) => {
            moveTooltip(e);
          });

          li.addEventListener("mouseleave", hideTooltip);

          // Open Modal
          li.addEventListener("click", () => {
            openModal(ev);
          });

          li.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal(ev);
            }
          });

          eventList.appendChild(li);
        }
      }
    }

    // Scan All Month Event Groups, Delete Duplicates & Children
    const allDividers = document.querySelectorAll(".month-divider");
    const seen = new Set();

    allDividers.forEach((divider) => {
      const monthText = divider.textContent.trim();

      if (seen.has(monthText)) {
        // Remove Duplicate Divider
        let current = divider;

        // Continue Removing Until Next .month-divider or End
        while ((current && !current.classList.contains("month-divider")) || current === divider) {
          const next = current.nextElementSibling;
          current.remove();
          current = next;
        }
      } else {
        seen.add(monthText);
      }
    });
  }

  // Tooltip
  function showTooltip(e, ev) {
    tooltip.innerHTML = `
     <img src="${ev.img}" alt="${ev.title} preview" />
     <strong>${ev.title}</strong><br/>
     <small>${ev.description.slice(0, 80)}...</small>
   `;
    tooltip.style.opacity = "1";
    tooltip.setAttribute("aria-hidden", "false");
    moveTooltip(e);
  }

  // Move Tool Tip
  function moveTooltip(e) {
    const padding = 20;
    let x = e.clientX + padding;
    let y = e.clientY + padding;

    if (x + tooltip.offsetWidth > window.innerWidth) {
      x = e.clientX - tooltip.offsetWidth - padding;
    }
    if (y + tooltip.offsetHeight > window.innerHeight) {
      y = e.clientY - tooltip.offsetHeight - padding;
    }
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hide Tool Tip
  function hideTooltip() {
    tooltip.style.opacity = "0";
    tooltip.setAttribute("aria-hidden", "true");
  }

  // Convert 24 hr Time To 12 hr Time
  function convertTo12Hour(time24) {
    const [hourStr, minuteStr] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr || "00";

    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }

  // Modal
  function openModal(ev) {
    const time = document.querySelector(".time");
    if (!ev) return;
    currentEventKey = `${ev.dateTime}_${ev.title}`;
    modalImage.src = ev.img;
    modalImage.alt = ev.title + " image";
    modalTitle.textContent = ev.title;
    modalDesc.textContent = ev.description;
    const militaryTime = convertTo12Hour(ev.dateTime.split("T")[1].replace(/:00$/, ""));
    time.innerText = militaryTime;

    // Tags
    modalTags.innerHTML = "";
    ev.tags.forEach((t) => {
      const tSpan = document.createElement("span");
      tSpan.className = "tag";
      tSpan.textContent = t;
      modalTags.appendChild(tSpan);
    });

    // Shows Modal via Flex, Otherwise display: none
    modalOverlay.style.display = "flex";
    updateLikeBtn();

    // Trap Focus Inside Modal
    modalOverlay.querySelector(".close-btn").focus();
  }

  // Close Modal
  function closeModal() {
    modalOverlay.style.display = "none";
    currentEventKey = null;
  }

  // Close Modal Button Listener
  document.querySelector("#modalOverlay .close-btn").addEventListener("click", closeModal);
  window.addEventListener("resize", closeModal);

  // Close Modal on Background Click
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Close Modal on Escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.style.display === "flex") {
      closeModal();
    }
  });

  // Like Toggle & Store Value
  function toggleLike(key, element) {
    const backgroundLikeBtn = document.querySelector('[data-title="' + key.split("_")[1] + '"] .like-btn');

    if (element.classList.contains("liked")) {
      element.classList.remove("liked");
      likedEvents[key] = false;

      if (modalOverlay.style.display === "flex") {
        backgroundLikeBtn.classList.remove("liked");
      }
    } else {
      element.classList.add("liked");
      likedEvents[key] = true;

      if (modalOverlay.style.display === "flex") {
        backgroundLikeBtn.classList.add("liked");
      }
    }

    localStorage.setItem("likedEvents", JSON.stringify(likedEvents));
  }

  // Like Button Listener
  likeBtn.addEventListener("click", () => {
    if (!currentEventKey) return;
    toggleLike(currentEventKey, likeBtn);
  });

  // Called When Modal is Open
  function updateLikeBtn() {
    let likedEvents = JSON.parse(localStorage.getItem("likedEvents") || "{}");

    if (likedEvents[currentEventKey]) {
      likeBtn.classList.add("liked");
      likeBtn.title = "Unlike event";
    } else {
      likeBtn.classList.remove("liked");
      likeBtn.title = "Like event";
    }
  }

  // RSVP
  rsvpBtn.addEventListener("click", () => {
    if (!currentEventKey) return;
    alert(`Thanks for RSVPing to ${currentEventKey.split("_")[1]}!`);
    // Integrate w/ Backend Here — POST RSVP
  });

  // Get Current Data Object w/ Key
  // Returns the Desired Object in an Array of 1 ([0])
  function getDataObject() {
    const result = events.filter((val) => {
      return val.dateTime === currentEventKey.split("_")[0];
    });
    return result;
  }

  // Add to Google Calendar
  // Date Formatting is Required to Feed the Calendar a Different Date Format
  addCalendarBtn.addEventListener("click", () => {
    if (!currentEventKey) return;
    const startTime = formatForGoogleCalendar(new Date(currentEventKey.split("_")[0]));
    const endTime = addEventDuration(startTime);
    const eventTitle = currentEventKey.split("_")[1];
    const currentEventObject = getDataObject();

    // currentEventObject[0] Because currentEventObject returns an Array w/ One Value
    const calendarUrl =
      `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}` +
      `&dates=${startTime}/${endTime}` +
      `&details=${encodeURIComponent(currentEventObject[0].description + "\n" + currentEventObject[0].url)}` +
      `&location=${encodeURIComponent(currentEventObject[0].location)}` +
      `&sf=true&output=xml`;

    window.open(calendarUrl, "_blank");
  });

  // Add One Hour to the startTime Timestamp
  // Parse the Date, Format the Date, then Create New Timestamp
  function addEventDuration(startTime) {
    const year = parseInt(startTime.slice(0, 4));
    const month = parseInt(startTime.slice(4, 6)) - 1;
    const day = parseInt(startTime.slice(6, 8));
    const hour = parseInt(startTime.slice(9, 11));
    const minute = parseInt(startTime.slice(11, 13));
    const second = parseInt(startTime.slice(13, 15));

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));

    // Add one hour
    date.setUTCHours(date.getUTCHours() + 1);

    // Format back to YYYYMMDDTHHmmssZ
    const pad = (num) => num.toString().padStart(2, "0");

    const newTimestamp =
      date.getUTCFullYear().toString() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      "Z";

    return newTimestamp;
  }

  // Convert to Google Calendar Format
  function formatForGoogleCalendar(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    return (
      date.getUTCFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours() - 1) +
      pad(date.getMinutes()) +
      pad(date.getSeconds()) +
      "Z"
    );
  }

  // Search/Filter Events
  // prettier-ignore
  searchInput.addEventListener("input", () => renderEventList(searchInput.value));

  // --- Update main featured event when selecting from list ---
  function updateFeaturedEvent(obj) {
    const ev = obj;
    if (!ev) return;

    // Fade out image and description before update
    eventImage.style.opacity = 0;
    eventDescription.style.opacity = 0;
    eventTagsContainer.style.opacity = 0;

    setTimeout(() => {
      eventImage.src = ev.img;
      eventImage.alt = ev.title + " image";
      eventDescription.textContent = ev.description;

      // Update tags
      eventTagsContainer.innerHTML = "";
      ev.tags.forEach((t) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = t;
        eventTagsContainer.appendChild(tag);
      });

      eventImage.style.opacity = 1;
      eventDescription.style.opacity = 1;
      eventTagsContainer.style.opacity = 1;

      // Update countdown timer
      updateCountdown(ev.dateTime);
    }, 500);
  }

  // Countdown Timer for Next Event
  function updateCountdown(targetDateTime) {
    function update() {
      const now = new Date();
      const target = new Date(targetDateTime);
      let diff = target - now;

      if (diff <= 0) {
        countdownEl.textContent = "Event is happening now or already passed!";
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);
      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * (1000 * 60);
      const seconds = Math.floor(diff / 1000);

      if (days > 0) {
        countdownEl.textContent = `Next event starts in ${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        countdownEl.textContent = `Next event starts in ${hours}h ${minutes}m ${seconds}s`;
      } else {
        countdownEl.textContent = `Next event starts in ${minutes}m ${seconds}s`;
      }
    }
    update();
    const interval = setInterval(update, 1000);
  }

  // Find Next Upcoming Event
  function getNextEvent() {
    const now = new Date();
    const upcoming = events
      .map((ev) => ({
        ...ev,
        datetime: new Date(ev.dateTime),
      }))
      .filter((ev) => ev.datetime >= now)
      .sort((a, b) => a.datetime - b.datetime);

    return upcoming.length > 0 ? upcoming[0] : null;
  }

  // Share via FB
  shareFacebook.addEventListener("click", () => {
    const currentObject = getDataObject();
    const result = currentObject[0].description;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(result.url)}`;
    window.open(fbUrl, "_blank");
  });

  // Share via X
  shareX.addEventListener("click", () => {
    const currentObject = getDataObject();
    const result = currentObject[0].description;
    const tweet = `${result.title} - ${result.url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(twitterUrl, "_blank");
  });

  // Email Form Submission
  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      alert("Please enter a valid email address.");
      return;
    }
    alert(`Thanks for subscribing with ${email}!`);
    emailInput.value = "";
    // This Would Most Commonly Be Connected to a Mail Service Such as Constant Contact, MailChimp, etc
    // But You Could Also Connect to a Mail Service API Here
  });

  // Initial Render
  renderEventList();

  // Show next upcoming event in featured area
  const nextEvent = getNextEvent();
  if (nextEvent) {
    updateFeaturedEvent(nextEvent);
  } else {
    eventDescription.textContent = "No upcoming events.";
    countdownEl.textContent = "";
  }
}
