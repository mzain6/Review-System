(() => {
  const parts = location.pathname.split('/').filter(Boolean);
  const slug = parts[0] === 'r' ? parts[1] : null;

  const starSvg =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.4l-5.9 3.3 1.2-6.6-4.8-4.6 6.6-.9z"/></svg>';

  async function api(endpoint, params) {
    const res = await fetch(`/api/${endpoint}?${new URLSearchParams(params)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  window.RS = { slug, starSvg, api };
})();
