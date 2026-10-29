const TMDB_API_KEY = '13d8c9a45382a1c96f94ff665d60c60b';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const WATCHLIST_KEY = 'reelspace-watchlist';
const THEME_KEY = 'reelspace-theme';

const state = {
  latestMovies: [],
  popularMovies: [],
  searchMovies: [],
  watchlist: [],
  genres: [],
  view: 'explore',
  collection: 'popular',
  searchTerm: '',
  isLoading: false,
};

const elements = {
  catalog: document.querySelector('#movie-results'),
  latest: document.querySelector('#latest-movies'),
  latestSection: document.querySelector('#latest-section'),
  catalogSection: document.querySelector('#catalog-section'),
  catalogHeading: document.querySelector('#catalog-heading'),
  catalogKicker: document.querySelector('#catalog-kicker'),
  resultCount: document.querySelector('#result-count'),
  genreFilter: document.querySelector('#genre-filter'),
  ratingFilter: document.querySelector('#rating-filter'),
  ratingValue: document.querySelector('#rating-value'),
  searchForm: document.querySelector('#search-form'),
  searchInput: document.querySelector('#search-input'),
  exploreTab: document.querySelector('#explore-tab'),
  watchlistTab: document.querySelector('#watchlist-tab'),
  watchlistCount: document.querySelector('#watchlist-count'),
  themeToggle: document.querySelector('#theme-toggle'),
  emptyState: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyMessage: document.querySelector('#empty-message'),
  apiNotice: document.querySelector('#api-notice'),
  errorMessage: document.querySelector('#error-message'),
  retryButton: document.querySelector('#retry-button'),
};

// Mengambil data TMDB dan mengubah respons HTTP/API yang gagal menjadi error yang jelas.
async function fetchTMDB(endpoint, parameters = {}) {
  const url = new URL(`${TMDB_API_URL}/${endpoint}`);
  url.search = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'id-ID',
    ...parameters,
  });

  const response = await fetch(url);
  if (!response.ok) {
    let detail = `Permintaan gagal (${response.status}).`;
    try {
      const payload = await response.json();
      if (payload.status_message) detail = payload.status_message;
    } catch {
      // Tetap tampilkan status HTTP jika server tidak mengirim JSON yang valid.
    }
    throw new Error(detail);
  }

  const data = await response.json();
  if (data.success === false) {
    throw new Error(data.status_message || 'TMDB tidak dapat memproses permintaan ini.');
  }
  return data;
}

// Menyediakan skeleton saat koleksi sedang dimuat.
function showSkeletons(container, count = 5) {
  container.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML = '<div class="skeleton-poster"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
    container.append(skeleton);
  }
}

function getMovieTitle(movie) {
  return movie.title || movie.original_title || 'Judul tidak tersedia';
}

function getMovieYear(movie) {
  const date = movie.release_date || movie.first_air_date || '';
  return date ? date.slice(0, 4) : 'Tahun tidak diketahui';
}

function getGenreIds(movie) {
  if (Array.isArray(movie.genre_ids)) return movie.genre_ids;
  return Array.isArray(movie.genres) ? movie.genres.map((genre) => genre.id) : [];
}

function getFilteredMovies(movies) {
  const selectedGenre = elements.genreFilter.value;
  const minimumRating = Number(elements.ratingFilter.value);

  return movies.filter((movie) => {
    const matchesGenre = selectedGenre === 'all' || getGenreIds(movie).includes(Number(selectedGenre));
    const matchesRating = Number(movie.vote_average || 0) >= minimumRating;
    return matchesGenre && matchesRating;
  });
}

// Membuat kartu film dan tombol bookmark tanpa menyisipkan teks API sebagai HTML.
function createMovieCard(movie) {
  const card = document.createElement('article');
  card.className = 'movie-card';

  const posterWrap = document.createElement('div');
  posterWrap.className = 'poster-wrap';
  const posterLink = document.createElement('a');
  posterLink.className = 'poster-link';
  posterLink.href = `movie-details.html?id=${encodeURIComponent(movie.id)}`;
  posterLink.setAttribute('aria-label', `Lihat detail ${getMovieTitle(movie)}`);

  if (movie.poster_path) {
    const image = document.createElement('img');
    image.src = `${TMDB_IMAGE_URL}${movie.poster_path}`;
    image.alt = `Poster film ${getMovieTitle(movie)}`;
    image.loading = 'lazy';
    image.onerror = () => {
      image.remove();
      const placeholder = document.createElement('span');
      placeholder.className = 'poster-placeholder';
      placeholder.textContent = '✳';
      posterLink.replaceChildren(placeholder);
    };
    posterLink.append(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'poster-placeholder';
    placeholder.textContent = '✳';
    posterLink.append(placeholder);
  }

  const bookmark = document.createElement('button');
  const isSaved = state.watchlist.some((item) => item.id === movie.id);
  bookmark.className = `bookmark-button${isSaved ? ' is-saved' : ''}`;
  bookmark.type = 'button';
  bookmark.dataset.bookmarkId = String(movie.id);
  bookmark.setAttribute('aria-label', isSaved ? 'Hapus dari watchlist' : 'Simpan ke watchlist');
  bookmark.setAttribute('aria-pressed', String(isSaved));
  bookmark.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z"></path></svg>';
  posterWrap.append(posterLink, bookmark);

  const content = document.createElement('div');
  content.className = 'card-content';
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = getMovieTitle(movie);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const year = document.createElement('span');
  year.textContent = getMovieYear(movie);
  const rating = document.createElement('span');
  rating.className = 'card-rating';
  rating.innerHTML = '<span class="rating-star" aria-hidden="true">★</span>';
  const ratingValue = document.createElement('span');
  ratingValue.textContent = Number(movie.vote_average || 0).toFixed(1);
  rating.append(ratingValue);

  meta.append(year, rating);
  content.append(title, meta);
  card.append(posterWrap, content);
  return card;
}

function renderMovies(container, movies) {
  container.replaceChildren(...movies.map(createMovieCard));
}

function renderLatest() {
  renderMovies(elements.latest, getFilteredMovies(state.latestMovies));
}

function renderCatalog() {
  let movies = [];
  if (state.view === 'watchlist') {
    movies = state.watchlist;
  } else if (state.collection === 'search') {
    movies = state.searchMovies;
  } else {
    movies = state.popularMovies;
  }

  const filteredMovies = getFilteredMovies(movies);
  renderMovies(elements.catalog, filteredMovies);
  elements.resultCount.textContent = `${filteredMovies.length} film`;
  elements.emptyState.classList.toggle('hidden', filteredMovies.length > 0 || state.isLoading);

  if (state.view === 'watchlist') {
    elements.catalogKicker.textContent = 'KOLEKSI PRIBADI';
    elements.catalogHeading.textContent = 'Watchlist saya';
    elements.emptyTitle.textContent = 'Watchlist masih kosong';
    elements.emptyMessage.textContent = 'Simpan film favoritmu dengan menekan ikon bookmark.';
  } else if (state.collection === 'search') {
    elements.catalogKicker.textContent = 'HASIL PENCARIAN';
    elements.catalogHeading.textContent = `Hasil untuk “${state.searchTerm}”`;
    elements.emptyTitle.textContent = 'Film tidak ditemukan';
    elements.emptyMessage.textContent = 'Coba judul lain atau sesuaikan filter yang dipilih.';
  } else {
    elements.catalogKicker.textContent = 'PILIHAN KOMUNITAS';
    elements.catalogHeading.textContent = 'Film populer';
    elements.emptyTitle.textContent = 'Belum ada film di sini';
    elements.emptyMessage.textContent = 'Coba ubah filter atau cari judul yang lain.';
  }
}

function setActiveTab(tab) {
  const isWatchlist = tab === 'watchlist';
  elements.exploreTab.classList.toggle('is-active', !isWatchlist);
  elements.watchlistTab.classList.toggle('is-active', isWatchlist);
  if (isWatchlist) {
    elements.watchlistTab.setAttribute('aria-current', 'page');
    elements.exploreTab.removeAttribute('aria-current');
  } else {
    elements.exploreTab.setAttribute('aria-current', 'page');
    elements.watchlistTab.removeAttribute('aria-current');
  }
}

function updateWatchlistCount() {
  elements.watchlistCount.textContent = String(state.watchlist.length);
}

// Menyimpan film beserta ID-nya agar watchlist tetap tersedia setelah halaman dimuat ulang.
function saveWatchlist() {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchlist));
  } catch (error) {
    showError(`Watchlist tidak dapat disimpan di browser ini: ${error.message}`);
    throw error;
  }
}

function loadWatchlist() {
  try {
    const savedItems = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
    if (!Array.isArray(savedItems)) throw new Error('Format data watchlist tidak valid.');
    state.watchlist = savedItems.filter((item) => item && Number.isInteger(item.id));
  } catch (error) {
    state.watchlist = [];
    showError(`Watchlist tidak dapat dibaca: ${error.message}`);
  }
  updateWatchlistCount();
}

function toggleWatchlist(movieId) {
  const existingIndex = state.watchlist.findIndex((movie) => movie.id === movieId);
  if (existingIndex >= 0) {
    state.watchlist.splice(existingIndex, 1);
  } else {
    const movie = [...state.latestMovies, ...state.popularMovies, ...state.searchMovies]
      .find((item) => item.id === movieId);
    if (movie) state.watchlist.push(movie);
  }

  try {
    saveWatchlist();
  } catch {
    return;
  }

  updateWatchlistCount();
  renderLatest();
  renderCatalog();
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.apiNotice.classList.remove('hidden');
}

function clearError() {
  elements.apiNotice.classList.add('hidden');
}

function showExplore() {
  state.view = 'explore';
  elements.latestSection.classList.toggle('hidden', state.collection === 'search');
  elements.catalogSection.classList.remove('hidden');
  setActiveTab('explore');
  renderCatalog();
}

function showWatchlist() {
  state.view = 'watchlist';
  elements.latestSection.classList.add('hidden');
  elements.catalogSection.classList.remove('hidden');
  setActiveTab('watchlist');
  renderCatalog();
}

// Lataa uutuudet, suosituimmat elokuvat sekä genrevalinnat TMDB:stä.
async function loadMovieCollections() {
  state.isLoading = true;
  clearError();
  showSkeletons(elements.latest);
  showSkeletons(elements.catalog);

  const requests = await Promise.allSettled([
    fetchTMDB('movie/now_playing'),
    fetchTMDB('movie/popular'),
    fetchTMDB('genre/movie/list'),
  ]);
  const errors = [];

  if (requests[0].status === 'fulfilled') {
    state.latestMovies = requests[0].value.results || [];
  } else {
    state.latestMovies = [];
    errors.push(`Film terbaru: ${requests[0].reason.message}`);
  }

  if (requests[1].status === 'fulfilled') {
    state.popularMovies = requests[1].value.results || [];
  } else {
    state.popularMovies = [];
    errors.push(`Film populer: ${requests[1].reason.message}`);
  }

  if (requests[2].status === 'fulfilled') {
    state.genres = requests[2].value.genres || [];
    populateGenres();
  } else {
    errors.push(`Daftar genre: ${requests[2].reason.message}`);
  }

  state.isLoading = false;
  renderLatest();
  renderCatalog();
  if (errors.length > 0) showError(errors.join(' '));
}

function populateGenres() {
  const selectedGenre = elements.genreFilter.value;
  const options = state.genres.map((genre) => {
    const option = document.createElement('option');
    option.value = String(genre.id);
    option.textContent = genre.name;
    return option;
  });
  elements.genreFilter.replaceChildren(new Option('Semua genre', 'all'), ...options);
  if ([...elements.genreFilter.options].some((option) => option.value === selectedGenre)) {
    elements.genreFilter.value = selectedGenre;
  }
}

// Mencari film melalui TMDB, lalu menerapkan filter aktif pada hasil pencarian.
async function searchMovies(query) {
  const term = query.trim();
  if (!term) {
    state.collection = 'popular';
    state.searchTerm = '';
    elements.latestSection.classList.remove('hidden');
    renderCatalog();
    return;
  }

  state.view = 'explore';
  state.collection = 'search';
  state.searchTerm = term;
  elements.latestSection.classList.add('hidden');
  elements.catalogSection.classList.remove('hidden');
  setActiveTab('explore');
  elements.catalogHeading.textContent = `Mencari “${term}”`;
  showSkeletons(elements.catalog, 10);
  elements.emptyState.classList.add('hidden');
  clearError();

  try {
    const data = await fetchTMDB('search/movie', { query: term, include_adult: 'false' });
    state.searchMovies = data.results || [];
    renderCatalog();
  } catch (error) {
    state.searchMovies = [];
    renderCatalog();
    showError(`Pencarian gagal: ${error.message}`);
  }
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  elements.themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#0f172a' : '#f6f7fb';
}

function initializeTheme() {
  let savedTheme = 'dark';
  try {
    savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  } catch (error) {
    showError(`Preferensi tema tidak dapat dibaca: ${error.message}`);
  }
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
}

function bindEvents() {
  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchMovies(elements.searchInput.value);
  });

  elements.genreFilter.addEventListener('change', () => {
    renderLatest();
    renderCatalog();
  });

  elements.ratingFilter.addEventListener('input', () => {
    elements.ratingValue.textContent = Number(elements.ratingFilter.value).toFixed(1);
    renderLatest();
    renderCatalog();
  });

  elements.exploreTab.addEventListener('click', () => {
    state.collection = 'popular';
    state.searchTerm = '';
    elements.searchInput.value = '';
    elements.latestSection.classList.remove('hidden');
    showExplore();
  });

  elements.watchlistTab.addEventListener('click', showWatchlist);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('[data-bookmark-id]');
    if (!button) return;
    event.preventDefault();
    toggleWatchlist(Number(button.dataset.bookmarkId));
  });

  elements.themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      showError(`Preferensi tema tidak dapat disimpan: ${error.message}`);
    }
  });

  elements.retryButton.addEventListener('click', loadMovieCollections);
}

async function initializeApp() {
  document.querySelector('#current-year').textContent = String(new Date().getFullYear());
  initializeTheme();
  loadWatchlist();
  bindEvents();
  await loadMovieCollections();
}

document.addEventListener('DOMContentLoaded', initializeApp);
