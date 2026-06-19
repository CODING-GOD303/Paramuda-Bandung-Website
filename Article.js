    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    const allCards = Array.from(document.querySelectorAll('.acard'));
    let activeCategory = 'all';
    let searchQuery = '';
    let sortOrder = 'newest';
    const INITIAL_SHOW = 6;
    let showCount = INITIAL_SHOW;

    function getTitle(card) { return card.dataset.title.toLowerCase(); }
    function getDate(card)  { return card.dataset.date; }
    function getBodyText(card) {
      return (card.querySelector('h3').textContent + ' ' + card.querySelector('p').textContent).toLowerCase();
    }

    function filterAndRender() {
      let filtered = allCards.filter(card => {
        const catMatch = activeCategory === 'all' || card.dataset.cat === activeCategory;
        const searchMatch = !searchQuery || getBodyText(card).includes(searchQuery);
        return catMatch && searchMatch;
      });

      
      filtered.sort((a, b) => {
        if (sortOrder === 'newest') return getDate(b).localeCompare(getDate(a));
        if (sortOrder === 'oldest') return getDate(a).localeCompare(getDate(b));
        if (sortOrder === 'alpha')  return getTitle(a).localeCompare(getTitle(b));
        return 0;
      });

      allCards.forEach(c => { c.style.display = 'none'; c.classList.remove('reveal', 'visible'); });

      const visible = filtered.slice(0, showCount);
      visible.forEach((card, i) => {
        card.style.display = 'flex';
        setTimeout(() => {
          card.classList.add('reveal');
          requestAnimationFrame(() => card.classList.add('visible'));
        }, i * 60);
      });

      document.getElementById('resultCount').textContent =
        filtered.length + ' artikel ditemukan';

      document.getElementById('emptyState').style.display =
        filtered.length === 0 ? 'flex' : 'none';

      document.getElementById('loadMore').style.display =
        filtered.length > showCount ? 'flex' : 'none';
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.cat;
        showCount = INITIAL_SHOW;
        filterAndRender();
      });
    });

    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.toLowerCase().trim();
      searchClear.style.opacity = searchQuery ? '1' : '0';
      showCount = INITIAL_SHOW;
      filterAndRender();
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClear.style.opacity = '0';
      filterAndRender();
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
      sortOrder = e.target.value;
      filterAndRender();
    });

    document.getElementById('loadMoreBtn').addEventListener('click', () => {
      showCount += 6;
      filterAndRender();
    });

    function resetFilters() {
      activeCategory = 'all';
      searchQuery = '';
      searchInput.value = '';
      searchClear.style.opacity = '0';
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-cat="all"]').classList.add('active');
      showCount = INITIAL_SHOW;
      filterAndRender();
    }

    filterAndRender();