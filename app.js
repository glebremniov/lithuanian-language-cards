(async () => {
  "use strict";

  const loadStatus = document.getElementById("load-status");
  let topics;
  try {
    const response = await fetch("words.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    topics = await response.json();
    if (!Array.isArray(topics) || !topics.length || topics.some((topic) =>
      !topic.title || !Array.isArray(topic.cards) || !topic.cards.length ||
      topic.cards.some((card) => !card.lt || !card.ru)
    )) throw new Error("Invalid words.json");
  } catch {
    loadStatus.textContent = location.protocol === "file:"
      ? "Для загрузки слов откройте приложение через локальный сервер. Команда: python3 -m http.server 8000"
      : "Не удалось загрузить слова. Проверьте файл words.json и обновите страницу.";
    return;
  }

  const storageKey = "zodis-known-v1";
  const themeKey = "cards-theme";
  const $ = (id) => document.getElementById(id);

  let known;
  try {
    known = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  } catch {
    known = new Set();
  }

  let topicIndex = 0;
  let mode = "study";
  let view = "cards";
  let position = 0;
  let revealed = false;
  let theme = document.documentElement.dataset.theme;
  if (!["system", "light", "dark"].includes(theme)) theme = "system";
  document.documentElement.dataset.theme = theme;
  const orders = topics.map((topic) => topic.cards.map((_, index) => index));

  const cardId = (index) => `${topicIndex}:${index}`;
  const currentTopic = () => topics[topicIndex];
  const deck = () => orders[topicIndex].filter((index) => known.has(cardId(index)) === (mode === "known"));
  const knownInTopic = (index) => topics[index].cards.reduce((total, _, cardIndex) => total + Number(known.has(`${index}:${cardIndex}`)), 0);

  function saveKnown() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...known]));
    } catch {
      // Cards remain usable when browser storage is unavailable.
    }
  }

  function setTopic(index) {
    topicIndex = index;
    position = 0;
    revealed = false;
    render();
  }

  function setMode(value) {
    mode = value;
    position = 0;
    revealed = false;
    render();
  }

  function setView(value) {
    view = value;
    $("card-pane").hidden = value === "list";
    $("word-list").hidden = value !== "list";
    $("shuffle-button").hidden = value === "list";
    $("card-position").hidden = value === "list";
    for (const option of ["cards", "list"]) {
      const button = $(`view-${option}`);
      button.classList.toggle("active", option === value);
      button.setAttribute("aria-pressed", String(option === value));
    }
  }

  function setTheme(value) {
    theme = value;
    document.documentElement.dataset.theme = value;
    for (const option of ["system", "light", "dark"]) {
      const button = $(`theme-${option}`);
      button.classList.toggle("active", option === value);
      button.setAttribute("aria-pressed", String(option === value));
    }
    try {
      localStorage.setItem(themeKey, value);
    } catch {
      // The current theme still works when browser storage is unavailable.
    }
  }

  function move(direction) {
    const cards = deck();
    if (!cards.length) return;
    position = (position + direction + cards.length) % cards.length;
    revealed = false;
    renderCard();
  }

  function flip() {
    if (!deck().length) return;
    revealed = !revealed;
    renderCard();
  }

  function markKnown(value) {
    const cards = deck();
    if (!cards.length) return;
    const id = cardId(cards[position]);
    if (value) known.add(id);
    else known.delete(id);
    saveKnown();
    revealed = false;
    render();
  }

  function shuffle() {
    const order = orders[topicIndex];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    position = 0;
    revealed = false;
    renderCard();
  }

  function renderTopics() {
    const list = $("topic-list");
    list.replaceChildren();
    topics.forEach((topic, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "topic-button" + (index === topicIndex ? " active" : "");
      if (index === topicIndex) button.setAttribute("aria-current", "true");

      const number = document.createElement("span");
      number.className = "topic-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.textContent = topic.title;

      const count = document.createElement("span");
      count.className = "topic-done";
      count.textContent = `${knownInTopic(index)}/${topic.cards.length}`;

      button.append(number, name, count);
      button.addEventListener("click", () => setTopic(index));
      list.append(button);
    });
  }

  function renderWordList() {
    const rows = document.createDocumentFragment();
    currentTopic().cards.forEach((card) => {
      const row = document.createElement("tr");
      const lithuanian = document.createElement("td");
      const word = document.createElement("strong");
      word.textContent = card.lt;
      lithuanian.append(word);
      if (card.question) {
        const question = document.createElement("small");
        question.textContent = card.question;
        lithuanian.append(question);
      }
      const translation = document.createElement("td");
      translation.textContent = card.ru;
      row.append(lithuanian, translation);
      rows.append(row);
    });
    $("word-list-rows").replaceChildren(rows);
  }

  function renderCard() {
    const cards = deck();
    position = cards.length ? Math.min(position, cards.length - 1) : 0;

    const isEmpty = cards.length === 0;
    $("flashcard").hidden = isEmpty;
    $("empty-state").hidden = !isEmpty;
    $("card-actions").hidden = isEmpty;
    $("card-position").textContent = isEmpty ? "0 из 0" : `${position + 1} из ${cards.length}`;

    if (isEmpty) {
      const finished = mode === "study";
      $("empty-title").textContent = finished ? "Все слова выучены" : "Здесь пока пусто";
      $("empty-action").textContent = finished ? "Повторить" : "Учить слова";
      return;
    }

    const card = currentTopic().cards[cards[position]];
    const flashcard = $("flashcard");
    flashcard.classList.toggle("revealed", revealed);
    $("card-side-label").textContent = revealed ? "Перевод" : "Литовский";
    $("card-word").textContent = revealed ? card.ru : card.lt;
    $("card-question").textContent = revealed ? "" : (card.question || "");
    flashcard.setAttribute("aria-label", revealed ? `${card.ru}. Показать литовское слово` : `${card.lt}${card.question ? `, ${card.question}` : ""}. Показать перевод`);

    $("reveal-button").hidden = revealed;
    $("again-button").hidden = !revealed || mode === "known";
    $("known-button").hidden = !revealed || mode === "known";
    $("return-button").hidden = !revealed || mode === "study";
  }

  function render() {
    const topic = currentTopic();
    const count = knownInTopic(topicIndex);
    const percent = Math.round((count / topic.cards.length) * 100);

    $("current-topic").textContent = topic.title;
    $("topic-select").value = String(topicIndex);
    $("progress-text").textContent = `Выучено ${count} из ${topic.cards.length}`;
    $("progress-fill").style.width = `${percent}%`;
    $("progress-bar").setAttribute("aria-valuenow", String(percent));
    $("study-count").textContent = topic.cards.length - count;
    $("known-count").textContent = count;

    for (const value of ["study", "known"]) {
      const button = $(`mode-${value}`);
      button.classList.toggle("active", mode === value);
      button.setAttribute("aria-pressed", String(mode === value));
    }

    renderTopics();
    renderCard();
    renderWordList();
    setView(view);
  }

  for (const option of ["system", "light", "dark"]) {
    $(`theme-${option}`).addEventListener("click", () => setTheme(option));
  }
  setTheme(theme);
  const topicSelect = $("topic-select");
  topics.forEach((topic, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, "0")} · ${topic.title}`;
    topicSelect.append(option);
  });

  topicSelect.addEventListener("change", (event) => setTopic(Number(event.target.value)));
  $("view-cards").addEventListener("click", () => setView("cards"));
  $("view-list").addEventListener("click", () => setView("list"));
  $("mode-study").addEventListener("click", () => setMode("study"));
  $("mode-known").addEventListener("click", () => setMode("known"));
  $("shuffle-button").addEventListener("click", shuffle);
  $("flashcard").addEventListener("click", flip);
  $("reveal-button").addEventListener("click", flip);
  $("previous-button").addEventListener("click", () => move(-1));
  $("next-button").addEventListener("click", () => move(1));
  $("again-button").addEventListener("click", () => move(1));
  $("known-button").addEventListener("click", () => markKnown(true));
  $("return-button").addEventListener("click", () => markKnown(false));
  $("empty-action").addEventListener("click", () => setMode(mode === "study" ? "known" : "study"));

  document.addEventListener("keydown", (event) => {
    if (view !== "cards" || event.altKey || event.ctrlKey || event.metaKey || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      flip();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  });

  render();
  loadStatus.hidden = true;
  $("app-shell").hidden = false;
})();
