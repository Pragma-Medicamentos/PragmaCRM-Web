// Evita flash claro→oscuro: aplica `dark` antes del bundle.
(function () {
  try {
    if (localStorage.getItem('pragma-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
