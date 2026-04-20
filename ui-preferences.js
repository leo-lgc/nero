(function setupPreferences() {
  const THEME_KEY = "nero_theme";
  const LANG_KEY = "nero_lang";
  const DEFAULT_THEME = "dark";
  const DEFAULT_LANG = "pt";

  function getTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
  }

  function getLang() {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === "en" || stored === "pt" ? stored : DEFAULT_LANG;
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    document.querySelectorAll("[data-theme-value]").forEach((button) => {
      const active = button.dataset.themeValue === theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setLang(lang) {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    localStorage.setItem(LANG_KEY, lang);

    document.querySelectorAll("[data-lang-value]").forEach((button) => {
      const active = button.dataset.langValue === lang;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    window.dispatchEvent(new CustomEvent("nero:langchange", { detail: { lang } }));
  }

  function bind() {
    document.querySelectorAll("[data-theme-value]").forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(button.dataset.themeValue);
      });
    });

    document.querySelectorAll("[data-lang-value]").forEach((button) => {
      button.addEventListener("click", () => {
        setLang(button.dataset.langValue);
      });
    });
  }

  window.NeroPrefs = {
    getTheme,
    getLang,
    setTheme,
    setLang
  };

  setTheme(getTheme());
  setLang(getLang());
  bind();
})();
