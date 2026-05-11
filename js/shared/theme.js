(function () {
    var body = document.body;
    var desktopToggle = document.getElementById('switch_default');
    var themeStorageKey = 'theme';

    function isDarkTheme() {
        return window.localStorage && window.localStorage.getItem(themeStorageKey) === 'dark';
    }

    function applyTheme(isDark) {
        body.classList.toggle('dark-theme', isDark);

        if (desktopToggle) {
            desktopToggle.checked = isDark;
        }

        if (window.localStorage) {
            window.localStorage.setItem(themeStorageKey, isDark ? 'dark' : 'light');
        }
    }

    if (desktopToggle) {
        desktopToggle.addEventListener('change', function (event) {
            applyTheme(event.target.checked);
        });
    }

    applyTheme(isDarkTheme());
})();
