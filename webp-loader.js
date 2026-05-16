(function () {
  const toWebp = (src) => src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    const src = img.getAttribute('src') || '';
    if (/^https?:\/\//i.test(src)) return;
    if (!/\.(jpg|jpeg|png)$/i.test(src)) return;
    const webp = toWebp(src);
    const tester = new Image();
    tester.onload = () => { img.src = webp; };
    tester.onerror = () => {};
    tester.src = webp;
  });
})();
