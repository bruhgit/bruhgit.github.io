/**
 * omerdev - Application Logic
 * Manages tab switching, GitHub API repository fetching, one-click zip downloads,
 * language filtering, live profile metrics, and Developer Utilities (Universal Whitespace Cleaner, Radix Inspector, C++ Escaper).
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
    setupWhitespaceLiveEvents();
});

/* ==========================================================================
   Navigation & Routing
   ========================================================================== */

function initNavigation() {
    const validTabs = ['home', 'downloads', 'tools', 'about'];
    const hash = window.location.hash.replace('#', '').toLowerCase();
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
            public_repos: 8,
            followers: 5,
            following: 2,
            created_at: '2026-02-12T14:04:16Z',
            location: 'Türkiye',
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

    // Update Live About Stats Badges
    const followersEl = document.getElementById('about-followers-count');
    if (followersEl) followersEl.textContent = user.followers !== undefined ? user.followers : '5';

    const followingEl = document.getElementById('about-following-count');
    if (followingEl) followingEl.textContent = user.following !== undefined ? user.following : '2';

    const reposEl = document.getElementById('about-repos-count');
    if (reposEl) reposEl.textContent = user.public_repos !== undefined ? user.public_repos : '8';

    const joinedEl = document.getElementById('about-joined-date');
    if (joinedEl) {
        if (user.created_at) {
            const date = new Date(user.created_at);
            joinedEl.textContent = date.getFullYear();
        } else {
            joinedEl.textContent = '2026';
        }
    }
}

async function fetchRepositories() {
    const excluded = (CONFIG.excludedRepos || ['bruhgit', 'omerdev', 'bruhgit.github.io']).map(name => name.toLowerCase());

    try {
        const response = await fetch(`https://api.github.com/users/${CONFIG.githubUsername}/repos?per_page=100&sort=updated`);
        if (!response.ok) throw new Error('Repo fetch failed (Rate Limit or Network)');
        const data = await response.json();
        
        State.repositories = data
            .filter(repo => {
                const name = (repo.name || '').toLowerCase().trim();
                const fullName = (repo.full_name || '').toLowerCase().trim();
                const isExcluded = 
                    excluded.includes(name) || 
                    name.includes('.github.io') || 
                    fullName.includes('.github.io') ||
                    name === CONFIG.githubUsername.toLowerCase() ||
                    name === 'omerdev' ||
                    name === 'bruhgit';
                return !isExcluded;
            })
            .map(repo => {
                if (CONFIG.repoOverrides && CONFIG.repoOverrides[repo.name]) {
                    return { ...repo, ...CONFIG.repoOverrides[repo.name] };
                }
                return repo;
            });
    } catch (err) {
        console.warn('Using fallback repositories:', err);
        State.repositories = CONFIG.fallbackRepos
            .filter(repo => {
                const name = (repo.name || '').toLowerCase().trim();
                return !excluded.includes(name) && !name.includes('.github.io') && name !== 'bruhgit';
            })
            .map(repo => {
                if (CONFIG.repoOverrides && CONFIG.repoOverrides[repo.name]) {
                    return { ...repo, ...CONFIG.repoOverrides[repo.name] };
                }
                return repo;
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

    let distribution = [];

    if (CONFIG.techStackDistribution && CONFIG.techStackDistribution.length > 0) {
        distribution = [...CONFIG.techStackDistribution].sort((a, b) => b.percentage - a.percentage);
    } else {
        const langCounts = {};
        State.repositories.forEach(repo => {
            if (repo.language) {
                langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
            }
        });
        const total = Object.values(langCounts).reduce((a, b) => a + b, 0);
        distribution = Object.entries(langCounts)
            .map(([language, count]) => ({
                language,
                percentage: parseFloat(((count / total) * 100).toFixed(1)),
                note: `${count} projects`
            }))
            .sort((a, b) => b.percentage - a.percentage);
    }

    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <span class="stat-number">${State.repositories.length}</span>
                <span class="stat-label">Public Projects</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${distribution.length}</span>
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

    if (barContainer && legendContainer) {
        barContainer.innerHTML = distribution.map(item => {
            const color = LANGUAGE_COLORS[item.language] || '#6c757d';
            return `<div class="lang-segment" style="width: ${item.percentage}%; background-color: ${color};" title="${item.language}: ${item.percentage}% ${item.note ? `(${item.note})` : ''}"></div>`;
        }).join('');

        legendContainer.innerHTML = distribution.map(item => {
            const color = LANGUAGE_COLORS[item.language] || '#6c757d';
            return `
                <div class="legend-item" title="${item.note || ''}">
                    <span class="legend-dot" style="background-color: ${color};"></span>
                    <span class="legend-name">${item.language}</span>
                    <span class="legend-percent">${item.percentage}%</span>
                </div>
            `;
        }).join('');
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="View Source on GitHub">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
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
   Developer Tools Implementation
   ========================================================================== */

// 1. Universal Whitespace Cleaner
function setupWhitespaceLiveEvents() {
    const input = document.getElementById('whitespace-input');
    if (input) {
        input.addEventListener('input', () => {
            cleanWhitespace();
        });
    }

    const checkboxes = document.querySelectorAll('.tool-options-bar input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            cleanWhitespace();
        });
    });
}

window.cleanWhitespace = function() {
    const inputEl = document.getElementById('whitespace-input');
    const outputEl = document.getElementById('whitespace-output');
    const statsEl = document.getElementById('whitespace-stats');
    if (!inputEl || !outputEl) return;

    let text = inputEl.value;
    if (!text) {
        outputEl.value = '';
        if (statsEl) statsEl.innerHTML = '<span class="stat-pill">✨ Ready to clean</span>';
        return;
    }

    const origBytes = new Blob([text]).size;
    let invisibleRemoved = 0;
    let unicodeNormalized = 0;

    const optUnicodeSpaces = document.getElementById('opt-unicode-spaces')?.checked ?? true;
    const optZeroWidth = document.getElementById('opt-zero-width')?.checked ?? true;
    const optCollapseSpaces = document.getElementById('opt-collapse-spaces')?.checked ?? true;
    const optTrimLines = document.getElementById('opt-trim-lines')?.checked ?? true;
    const optRemoveBlank = document.getElementById('opt-remove-blank-lines')?.checked ?? false;
    const optTabsToSpaces = document.getElementById('opt-tabs-to-spaces')?.checked ?? false;

    // 1. Strip Zero-Width & Invisible Characters
    if (optZeroWidth) {
        const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060-\u2064\uFFF0-\uFFFF]/g;
        const matches = text.match(zeroWidthRegex);
        if (matches) invisibleRemoved = matches.length;
        text = text.replace(zeroWidthRegex, '');
    }

    // 2. Normalize Exotic Unicode Whitespaces to standard space (0x20)
    // Matches: NBSP (\u00A0), En Quad (\u2000), Em Quad (\u2001), En Space (\u2002), Em Space (\u2003),
    // Three-Per-Em (\u2004), Four-Per-Em (\u2005), Six-Per-Em (\u2006), Figure Space (\u2007),
    // Punctuation Space (\u2008), Thin Space (\u2009), Hair Space (\u200A), Narrow NBSP (\u202F),
    // Medium Math Space (\u205F), Ideographic Space (\u3000), Ogham (\u1680), Mongolian (\u180E)
    if (optUnicodeSpaces) {
        const unicodeSpacesRegex = /[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g;
        const matches = text.match(unicodeSpacesRegex);
        if (matches) unicodeNormalized = matches.length;
        text = text.replace(unicodeSpacesRegex, ' ');
    }

    // 3. Convert Tabs to Spaces
    if (optTabsToSpaces) {
        text = text.replace(/\t/g, '    ');
    }

    // 4. Line by line trimming and blank line handling
    let lines = text.split(/\r?\n/);

    if (optTrimLines) {
        lines = lines.map(line => line.trimEnd());
    }

    if (optCollapseSpaces) {
        lines = lines.map(line => line.replace(/[^\S\r\n]{2,}/g, ' '));
    }

    if (optRemoveBlank) {
        lines = lines.filter((line, idx, arr) => {
            if (line.trim() !== '') return true;
            // Allow single blank line between paragraphs if desired, or remove completely
            return false;
        });
    }

    text = lines.join('\n');
    outputEl.value = text;

    const cleanedBytes = new Blob([text]).size;
    const bytesSaved = Math.max(0, origBytes - cleanedBytes);

    if (statsEl) {
        statsEl.innerHTML = `
            <span class="stat-pill">🧹 Invisible Removed: <strong>${invisibleRemoved}</strong></span>
            <span class="stat-pill">🔄 Spaces Normalized: <strong>${unicodeNormalized}</strong></span>
            <span class="stat-pill">📦 Size: <strong>${origBytes}B → ${cleanedBytes}B</strong> (${bytesSaved}B saved)</span>
        `;
    }
};

window.copyCleanedWhitespace = function() {
    const outputEl = document.getElementById('whitespace-output');
    if (!outputEl || !outputEl.value) {
        showToast('> No cleaned text to copy!');
        return;
    }
    navigator.clipboard.writeText(outputEl.value).then(() => {
        showToast('> Cleaned text copied to clipboard!');
    });
};

window.clearWhitespaceTool = function() {
    const input = document.getElementById('whitespace-input');
    const output = document.getElementById('whitespace-output');
    const stats = document.getElementById('whitespace-stats');
    if (input) input.value = '';
    if (output) output.value = '';
    if (stats) stats.innerHTML = '<span class="stat-pill">✨ Ready to clean</span>';
    showToast('> Cleared workspace');
};

window.loadSampleWhitespaceText = function() {
    const input = document.getElementById('whitespace-input');
    if (!input) return;

    // A sample text containing Non-Breaking spaces (\u00A0), Zero-width spaces (\u200B), Ideographic fullwidth spaces (\u3000), multiple spaces, and trailing whitespace
    input.value = `// C++ Kernel\u00A0Module\u00A0Definition\nint\u3000main()  {   \n    // Hidden zero-width\u200B\u200C chars and exotic\u2002spaces\u2003here!\n    void*   ptr   =   nullptr;    \n    \n    \n    return  0;\n}`;
    cleanWhitespace();
    showToast('> Loaded sample with dirty Unicode whitespace!');
};

// 2. Radix Inspector Implementation
window.convertRadix = function(source) {
    const decEl = document.getElementById('radix-dec');
    const hexEl = document.getElementById('radix-hex');
    const binEl = document.getElementById('radix-bin');
    const asciiEl = document.getElementById('radix-ascii');

    let value = 0;

    try {
        if (source === 'dec') {
            const valStr = decEl.value.trim();
            if (!valStr) { clearRadix(); return; }
            value = parseInt(valStr, 10);
        } else if (source === 'hex') {
            let valStr = hexEl.value.trim().replace(/^0x/i, '');
            if (!valStr) { clearRadix(); return; }
            value = parseInt(valStr, 16);
        } else if (source === 'bin') {
            let valStr = binEl.value.trim().replace(/^0b/i, '');
            if (!valStr) { clearRadix(); return; }
            value = parseInt(valStr, 2);
        } else if (source === 'ascii') {
            let valStr = asciiEl.value;
            if (!valStr) { clearRadix(); return; }
            value = valStr.charCodeAt(0);
        }

        if (isNaN(value)) return;

        if (source !== 'dec') decEl.value = value.toString(10);
        if (source !== 'hex') hexEl.value = '0x' + value.toString(16).toUpperCase();
        if (source !== 'bin') binEl.value = value.toString(2).padStart(8, '0');
        if (source !== 'ascii') asciiEl.value = (value >= 32 && value <= 126) ? String.fromCharCode(value) : '(non-printable)';
    } catch (e) {
        console.warn(e);
    }
};

function clearRadix() {
    ['radix-dec', 'radix-hex', 'radix-bin', 'radix-ascii'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 3. C/C++ String Escaper Implementation
window.convertCppString = function() {
    const input = document.getElementById('cpp-escape-input');
    const output = document.getElementById('cpp-escape-output');
    if (!input || !output) return;

    const raw = input.value;
    if (!raw) {
        output.value = '';
        return;
    }

    // Generate C++ Raw string literal R"(...)" and standard escaped string
    if (raw.includes('\n') || raw.includes('"')) {
        output.value = `const char* str = R"(${raw})";\n\n// Or standard escaped:\nconst char* esc = "${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n"\n"')}";`;
    } else {
        output.value = `const char* str = "${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}";`;
    }
};

window.copyCppOutput = function() {
    const output = document.getElementById('cpp-escape-output');
    if (!output || !output.value) return;
    navigator.clipboard.writeText(output.value).then(() => {
        showToast('> C++ String literal copied!');
    });
};

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
