/**
 * omerdev - Application Logic
 * Manages tab switching, GitHub API repository fetching, one-click zip downloads,
 * language filtering, clone command copying, and profile README.md rendering.
 */

// Language Color Mapping
const LANGUAGE_COLORS = {
    "C++": "#f34b7d",
    "C": "#555555",
    "C#": "#178600",
    "Python": "#3572A5",
    "JavaScript": "#f1e05a",
    "TypeScript": "#3178c6",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "Rust": "#dea584",
    "Go": "#00ADD8",
    "Shell": "#89e051",
    "Assembly": "#6E4C13",
    "CMake": "#DA3434"
};

// Application State
const State = {
    currentTab: 'home',
    repositories: [],
    filteredRepositories: [],
    selectedLanguage: 'ALL',
    searchQuery: '',
    userData: null,
    isLoaded: false,
    aboutLoaded: false
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initData();
    setupSearch();
    setupKeyboardShortcuts();
});

/* ==========================================================================
   Navigation & Routing
   ========================================================================== */

function initNavigation() {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['home', 'downloads', 'about'];
    const initialTab = validTabs.includes(hash) ? hash : 'home';
    
    switchTab(initialTab, false);

    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash.replace('#', '').toLowerCase();
        if (validTabs.includes(currentHash)) {
            switchTab(currentHash, false);
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetTab = link.getAttribute('data-tab');
            if (targetTab) {
                e.preventDefault();
                switchTab(targetTab, true);
            }
        });
    });
}

function switchTab(tabId, updateHash = true) {
    State.currentTab = tabId;

    if (updateHash) {
        window.location.hash = tabId;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'about' && !State.aboutLoaded) {
        loadAboutReadme();
    }
}

/* ==========================================================================
   Data Fetching & Management
   ========================================================================== */

async function initData() {
    renderSkills();
    await Promise.all([
        fetchUserData(),
        fetchRepositories()
    ]);
}

async function fetchUserData() {
    try {
        const response = await fetch(`https://api.github.com/users/${CONFIG.githubUsername}`);
        if (!response.ok) throw new Error('User fetch failed');
        const data = await response.json();
        State.userData = data;
        updateUserUI(data);
    } catch (err) {
        console.warn('Using fallback user info:', err);
        const fallback = {
            login: CONFIG.githubUsername,
            name: CONFIG.displayName,
            bio: CONFIG.bio,
            avatar_url: `https://github.com/${CONFIG.githubUsername}.png`,
            public_repos: CONFIG.fallbackRepos.length,
            html_url: CONFIG.links.github
        };
        updateUserUI(fallback);
    }
}

function updateUserUI(user) {
    const avatarEls = document.querySelectorAll('.user-avatar');
    avatarEls.forEach(el => {
        el.src = user.avatar_url;
        el.alt = user.login;
    });

    const nameEls = document.querySelectorAll('.user-name');
    nameEls.forEach(el => el.textContent = user.name || CONFIG.displayName);

    const bioEls = document.querySelectorAll('.user-bio');
    bioEls.forEach(el => el.textContent = user.bio || CONFIG.bio);

    const handleEls = document.querySelectorAll('.user-handle');
    handleEls.forEach(el => el.textContent = `@${user.login}`);
}

async function fetchRepositories() {
    const excluded = (CONFIG.excludedRepos || ['bruhgit', 'omerdev']).map(name => name.toLowerCase());

    try {
        const response = await fetch(`https://api.github.com/users/${CONFIG.githubUsername}/repos?per_page=100&sort=updated`);
        if (!response.ok) throw new Error('Repo fetch failed (Rate Limit or Network)');
        const data = await response.json();
        
        // Filter out excluded repos, website repo, profile repo
        State.repositories = data.filter(repo => {
            const name = (repo.name || '').toLowerCase();
            const isExcluded = excluded.includes(name) || name.endsWith('.github.io') || name === CONFIG.githubUsername.toLowerCase();
            return !isExcluded;
        });
    } catch (err) {
        console.warn('Using fallback repositories:', err);
        State.repositories = CONFIG.fallbackRepos.filter(repo => {
            const name = (repo.name || '').toLowerCase();
            return !excluded.includes(name) && !name.endsWith('.github.io');
        });
    }

    State.filteredRepositories = [...State.repositories];
    State.isLoaded = true;

    renderLanguageChips();
    renderRepositories();
    renderFeaturedRepos();
    renderStatsAndLanguageBar();
    updateRepoCountBadge();
}

/* ==========================================================================
   Render Functions
   ========================================================================== */

function renderSkills() {
    const container = document.getElementById('hero-skills');
    if (!container) return;

    container.innerHTML = CONFIG.skills.map(skill => `
        <span class="tech-badge" style="border-left: 3px solid ${skill.color}">
            ${skill.name}
        </span>
    `).join('');
}

function renderStatsAndLanguageBar() {
    const statsContainer = document.getElementById('home-stats-grid');
    const barContainer = document.getElementById('home-language-bar');
    const legendContainer = document.getElementById('home-language-legend');

    if (!statsContainer && !barContainer) return;

    // Calculate total stars and language distribution
    let totalStars = 0;
    const langCounts = {};

    State.repositories.forEach(repo => {
        totalStars += repo.stargazers_count || 0;
        if (repo.language) {
            langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
        }
    });

    // Sort languages descending (büyükten küçüğe sırala)
    const sortedLangEntries = Object.entries(langCounts).sort((a, b) => {
        if (b[1] !== a[1]) {
            return b[1] - a[1];
        }
        return a[0].localeCompare(b[0]);
    });

    // Render Stats Cards
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <span class="stat-number">${State.repositories.length}</span>
                <span class="stat-label">Public Projects</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${sortedLangEntries.length}</span>
                <span class="stat-label">Core Languages</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">600K+</span>
                <span class="stat-label">Lines of Code</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">0</span>
                <span class="stat-label">Null Pointers</span>
            </div>
        `;
    }

    // Render Language Bar (Sorted descending)
    if (barContainer && legendContainer) {
        const totalWithLang = sortedLangEntries.reduce((acc, curr) => acc + curr[1], 0);
        
        if (totalWithLang > 0) {
            barContainer.innerHTML = sortedLangEntries.map(([lang, count]) => {
                const percent = ((count / totalWithLang) * 100).toFixed(1);
                const color = LANGUAGE_COLORS[lang] || '#6c757d';
                return `<div class="lang-segment" style="width: ${percent}%; background-color: ${color};" title="${lang}: ${percent}% (${count} projects)"></div>`;
            }).join('');

            legendContainer.innerHTML = sortedLangEntries.map(([lang, count]) => {
                const percent = ((count / totalWithLang) * 100).toFixed(1);
                const color = LANGUAGE_COLORS[lang] || '#6c757d';
                return `
                    <div class="legend-item">
                        <span class="legend-dot" style="background-color: ${color};"></span>
                        <span class="legend-name">${lang}</span>
                        <span class="legend-percent">${percent}%</span>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderLanguageChips() {
    const container = document.getElementById('language-chips-container');
    if (!container) return;

    const languages = new Set();
    State.repositories.forEach(repo => {
        if (repo.language) languages.add(repo.language);
    });

    const langList = ['ALL', ...Array.from(languages)];

    container.innerHTML = langList.map(lang => `
        <button class="chip-btn ${State.selectedLanguage === lang ? 'active' : ''}" onclick="filterByLanguage('${lang}')">
            ${lang === 'ALL' ? `All (${State.repositories.length})` : lang}
        </button>
    `).join('');
}

window.filterByLanguage = function(lang) {
    State.selectedLanguage = lang;
    renderLanguageChips();
    applyFilters();
};

function formatSize(kb) {
    if (!kb) return '0 KB';
    if (kb >= 1024) {
        return (kb / 1024).toFixed(1) + ' MB';
    }
    return kb + ' KB';
}

function getZipDownloadUrl(repo) {
    const branch = repo.default_branch || 'main';
    return `https://github.com/${repo.full_name || `${CONFIG.githubUsername}/${repo.name}`}/archive/refs/heads/${branch}.zip`;
}

function getCloneUrl(repo) {
    return `git clone https://github.com/${repo.full_name || `${CONFIG.githubUsername}/${repo.name}`}.git`;
}

// Render Repositories in Downloads Tab
function renderRepositories() {
    const container = document.getElementById('downloads-list');
    if (!container) return;

    if (State.filteredRepositories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>🔍 No repositories found matching the active filter or query.</p>
                <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="resetFilters()">Reset Filters</button>
            </div>
        `;
        return;
    }

    container.innerHTML = State.filteredRepositories.map(repo => {
        const langColor = LANGUAGE_COLORS[repo.language] || '#888';
        const downloadUrl = getZipDownloadUrl(repo);
        const cloneCommand = getCloneUrl(repo);
        const repoUrl = repo.html_url || `https://github.com/${CONFIG.githubUsername}/${repo.name}`;
        const description = repo.description || 'No description provided for this repository.';
        
        return `
            <div class="card repo-card">
                <div class="card-top">
                    <div class="card-header">
                        <h3 class="card-title">
                            <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
                        </h3>
                    </div>
                    <p class="card-desc">${escapeHtml(description)}</p>
                </div>

                <div>
                    <div class="card-meta">
                        ${repo.language ? `
                            <span class="meta-item">
                                <span class="lang-dot" style="background-color: ${langColor};"></span>
                                ${repo.language}
                            </span>
                        ` : ''}
                        
                        <span class="meta-item">
                            ⭐ ${repo.stargazers_count || 0}
                        </span>

                        <span class="meta-item">
                            🔀 ${repo.forks_count || 0}
                        </span>

                        <span class="meta-item">
                            📦 ${formatSize(repo.size)}
                        </span>
                    </div>

                    <div class="card-actions">
                        <a href="${downloadUrl}" class="btn btn-primary btn-sm btn-block" title="Direct ZIP Download">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download ZIP
                        </a>
                        <button onclick="copyCloneCommand('${cloneCommand}')" class="btn btn-secondary btn-sm" title="Copy git clone command">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="View Source on GitHub">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFeaturedRepos() {
    const container = document.getElementById('home-featured-list');
    if (!container) return;

    const featured = State.repositories.slice(0, 4);

    container.innerHTML = featured.map(repo => {
        const langColor = LANGUAGE_COLORS[repo.language] || '#888';
        const downloadUrl = getZipDownloadUrl(repo);
        const repoUrl = repo.html_url || `https://github.com/${CONFIG.githubUsername}/${repo.name}`;
        
        return `
            <div class="card">
                <div class="card-top">
                    <div class="card-header">
                        <h3 class="card-title">
                            <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
                        </h3>
                    </div>
                    <p class="card-desc">${escapeHtml(repo.description || 'Custom software project.')}</p>
                </div>

                <div>
                    <div class="card-meta">
                        ${repo.language ? `
                            <span class="meta-item">
                                <span class="lang-dot" style="background-color: ${langColor};"></span>
                                ${repo.language}
                            </span>
                        ` : ''}
                        <span class="meta-item">⭐ ${repo.stargazers_count || 0}</span>
                    </div>

                    <div class="card-actions">
                        <a href="${downloadUrl}" class="btn btn-primary btn-sm btn-block">
                            ⬇ Download ZIP
                        </a>
                        <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                            GitHub ↗
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   Search, Filter & Keyboard Shortcuts
   ========================================================================== */

function setupSearch() {
    const searchInput = document.getElementById('repo-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        State.searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });
}

function applyFilters() {
    State.filteredRepositories = State.repositories.filter(repo => {
        const matchesQuery = !State.searchQuery || 
            (repo.name || '').toLowerCase().includes(State.searchQuery) ||
            (repo.description || '').toLowerCase().includes(State.searchQuery) ||
            (repo.language || '').toLowerCase().includes(State.searchQuery);

        const matchesLanguage = State.selectedLanguage === 'ALL' || repo.language === State.selectedLanguage;

        return matchesQuery && matchesLanguage;
    });

    renderRepositories();
    updateRepoCountBadge();
}

window.resetFilters = function() {
    State.selectedLanguage = 'ALL';
    State.searchQuery = '';
    const searchInput = document.getElementById('repo-search');
    if (searchInput) searchInput.value = '';
    renderLanguageChips();
    applyFilters();
};

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            switchTab('downloads', true);
            setTimeout(() => {
                const searchInput = document.getElementById('repo-search');
                if (searchInput) searchInput.focus();
            }, 100);
        }
    });
}

function updateRepoCountBadge() {
    const badge = document.getElementById('repo-count-badge');
    if (badge) {
        badge.textContent = `${State.filteredRepositories.length} projects`;
    }
}

/* ==========================================================================
   Clipboard Copy & Toast Notification
   ========================================================================== */

window.copyCloneCommand = function(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
        showToast(`> Copied: ${cmd}`);
    }).catch(() => {
        showToast(`> Failed to copy to clipboard`);
    });
};

function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

/* ==========================================================================
   About Tab - Markdown Loader & Renderer
   ========================================================================== */

async function loadAboutReadme() {
    const container = document.getElementById('about-readme-content');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Fetching ${CONFIG.githubUsername}/${CONFIG.githubUsername}/README.md ...</p>
        </div>
    `;

    let markdown = '';

    try {
        let res = await fetch(`https://raw.githubusercontent.com/${CONFIG.githubUsername}/${CONFIG.githubUsername}/main/README.md`);
        if (!res.ok) {
            res = await fetch(`https://raw.githubusercontent.com/${CONFIG.githubUsername}/${CONFIG.githubUsername}/master/README.md`);
        }
        
        if (!res.ok) throw new Error('Could not fetch remote README');
        markdown = await res.text();
    } catch (err) {
        console.warn('Loading fallback README:', err);
        markdown = CONFIG.fallbackReadme;
    }

    if (typeof marked !== 'undefined') {
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: false
        });
        
        let html = marked.parse(markdown);
        
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['target', 'align', 'src', 'alt', 'style']
            });
        }
        
        container.innerHTML = html;
    } else {
        container.innerHTML = `<pre><code>${escapeHtml(markdown)}</code></pre>`;
    }

    State.aboutLoaded = true;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
