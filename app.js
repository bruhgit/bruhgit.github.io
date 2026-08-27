/**
 * omerdev - Application Logic
 * Manages tab switching, GitHub API repository fetching, one-click zip downloads,
 * language filtering, live profile metrics, and Developer Utilities:
 * - Multi-Language Code Formatter & Beautifier (C, C++, Python, C#, JS, JSON)
 * - Radix & Byte Inspector (Dec, Hex, Bin, ASCII)
 * - C/C++ String Literal Escaper
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
    setupFormatterEvents();
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
   Developer Tools: Code Formatter & Beautifier
   ========================================================================== */

let currentFormatterLang = 'cpp';

function setupFormatterEvents() {
    const input = document.getElementById('formatter-input');
    if (input) {
        input.addEventListener('input', () => {
            formatCode();
        });
    }
}

window.setFormatterLanguage = function(lang) {
    currentFormatterLang = lang;

    document.querySelectorAll('#formatter-lang-presets .chip-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const braceGroup = document.getElementById('group-brace-style');
    if (braceGroup) {
        braceGroup.style.display = (lang === 'python' || lang === 'json') ? 'none' : 'flex';
    }

    formatCode();
    showToast(`> Formatter set to: ${lang.toUpperCase()}`);
};

window.formatCode = function() {
    const inputEl = document.getElementById('formatter-input');
    const outputEl = document.getElementById('formatter-output');
    const statsEl = document.getElementById('formatter-stats');
    if (!inputEl || !outputEl) return;

    let code = inputEl.value;
    if (!code.trim()) {
        outputEl.value = '';
        if (statsEl) statsEl.innerHTML = '<span class="stat-pill">✨ Ready to format code</span>';
        return;
    }

    const indentSizeVal = document.getElementById('opt-indent-size')?.value || '4';
    const indentStr = indentSizeVal === 'tab' ? '\t' : ' '.repeat(parseInt(indentSizeVal, 10) || 4);
    const braceStyle = document.getElementById('opt-brace-style')?.value || 'allman';
    const optOpSpacing = document.getElementById('opt-operator-spacing')?.checked ?? true;
    const optCommaSpacing = document.getElementById('opt-comma-spacing')?.checked ?? true;
    const optStripInvisible = document.getElementById('opt-strip-invisible')?.checked ?? true;
    const optTrimTrailing = document.getElementById('opt-trim-trailing')?.checked ?? true;

    // 1. Strip invisible / zero-width characters if selected
    if (optStripInvisible) {
        code = code.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060-\u2064\uFFF0-\uFFFF]/g, '');
        code = code.replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    }

    let formatted = '';
    const startLines = code.split(/\r?\n/).length;

    try {
        if (currentFormatterLang === 'json') {
            try {
                const parsed = JSON.parse(code);
                formatted = JSON.stringify(parsed, null, indentStr);
            } catch (jsonErr) {
                if (typeof js_beautify !== 'undefined') {
                    formatted = js_beautify(code, {
                        indent_size: indentSizeVal === 'tab' ? 1 : parseInt(indentSizeVal, 10) || 4,
                        indent_with_tabs: indentSizeVal === 'tab'
                    });
                } else {
                    throw jsonErr;
                }
            }
        } else if (currentFormatterLang === 'javascript') {
            if (typeof js_beautify !== 'undefined') {
                formatted = js_beautify(code, {
                    indent_size: indentSizeVal === 'tab' ? 1 : parseInt(indentSizeVal, 10) || 4,
                    indent_with_tabs: indentSizeVal === 'tab',
                    brace_style: braceStyle === 'allman' ? 'expand' : 'collapse',
                    space_in_empty_paren: true,
                    space_after_anon_function: true,
                    end_with_newline: true
                });
            } else {
                formatted = formatCppStyle(code, indentStr, braceStyle, { optOpSpacing, optCommaSpacing, optTrimTrailing });
            }
        } else if (currentFormatterLang === 'python') {
            formatted = formatPython(code, indentStr, { optOpSpacing, optCommaSpacing, optTrimTrailing });
        } else {
            // C, C++, C#
            formatted = formatCppStyle(code, indentStr, braceStyle, { optOpSpacing, optCommaSpacing, optTrimTrailing });
        }
    } catch (err) {
        console.warn('Formatting error:', err);
        // Fallback to basic clean formatting
        formatted = formatGenericCode(code, indentStr, { optTrimTrailing });
    }

    outputEl.value = formatted;

    const endLines = formatted.split(/\r?\n/).length;
    const origBytes = new Blob([code]).size;
    const formattedBytes = new Blob([formatted]).size;

    if (statsEl) {
        statsEl.innerHTML = `
            <span class="stat-pill">📐 Formatted: <strong>${startLines} → ${endLines} lines</strong></span>
            <span class="stat-pill">🔤 Indent: <strong>${indentSizeVal === 'tab' ? 'Tabs' : indentSizeVal + ' Spaces'}</strong></span>
            <span class="stat-pill">📦 Size: <strong>${origBytes}B → ${formattedBytes}B</strong></span>
        `;
    }
};

/* --- C / C++ / C# / JS Code Beautifier Engine --- */
function formatCppStyle(code, indentStr, braceStyle, opts) {
    let lines = code.split(/\r?\n/);
    let rawTokens = [];

    // Pre-clean and split into logical statements while protecting strings and comments
    for (let line of lines) {
        let trimmed = line.trim();
        if (!trimmed) {
            rawTokens.push({ type: 'empty' });
            continue;
        }

        // Direct preprocessor directive
        if (trimmed.startsWith('#')) {
            rawTokens.push({ type: 'preprocessor', content: trimmed });
            continue;
        }

        // Single line comment
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
            rawTokens.push({ type: 'comment', content: trimmed });
            continue;
        }

        rawTokens.push({ type: 'code', content: trimmed });
    }

    let result = [];
    let indentLevel = 0;
    let inBlockComment = false;

    for (let item of rawTokens) {
        if (item.type === 'empty') {
            if (result.length > 0 && result[result.length - 1] !== '') {
                result.push('');
            }
            continue;
        }

        if (item.type === 'preprocessor') {
            result.push(item.content);
            continue;
        }

        if (item.type === 'comment') {
            result.push(indentStr.repeat(indentLevel) + item.content);
            continue;
        }

        let line = item.content;

        // Apply operator and comma spacing
        if (opts.optCommaSpacing) {
            line = line.replace(/,(\S)/g, ', $1');
        }

        if (opts.optOpSpacing) {
            // Space binary operators outside quotes
            line = line.replace(/([^!<>=+\-*/%&|^?:]\s*)(==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=|&=|\|=|\^=|=)(\s*[^!<>=])/g, '$1 $2 $3');
        }

        // Structure braces and statements
        let chars = line.split('');
        let curLine = '';

        for (let i = 0; i < chars.length; i++) {
            let ch = chars[i];

            if (ch === '{') {
                if (curLine.trim()) {
                    if (braceStyle === 'allman') {
                        result.push(indentStr.repeat(indentLevel) + curLine.trim());
                        result.push(indentStr.repeat(indentLevel) + '{');
                    } else {
                        // K&R Style
                        result.push(indentStr.repeat(indentLevel) + curLine.trim() + ' {');
                    }
                } else {
                    result.push(indentStr.repeat(indentLevel) + '{');
                }
                indentLevel++;
                curLine = '';
            } else if (ch === '}') {
                if (curLine.trim()) {
                    result.push(indentStr.repeat(indentLevel) + curLine.trim());
                    curLine = '';
                }
                indentLevel = Math.max(0, indentLevel - 1);
                result.push(indentStr.repeat(indentLevel) + '}');
            } else if (ch === ';') {
                curLine += ch;
                // Check if inside for statement
                if (!curLine.includes('for (') && !curLine.includes('for(')) {
                    result.push(indentStr.repeat(indentLevel) + curLine.trim());
                    curLine = '';
                }
            } else {
                curLine += ch;
            }
        }

        if (curLine.trim()) {
            // Access specifiers (public:, private:, protected:) & case labels
            if (/^(public|private|protected|case\s+[^:]+|default)\s*:/.test(curLine.trim())) {
                let specIndent = Math.max(0, indentLevel - 1);
                result.push(indentStr.repeat(specIndent) + curLine.trim());
            } else {
                result.push(indentStr.repeat(indentLevel) + curLine.trim());
            }
        }
    }

    return result.join('\n');
}

/* --- Python Code Beautifier Engine (PEP 8 Indentation) --- */
function formatPython(code, indentStr, opts) {
    let lines = code.split(/\r?\n/);
    let result = [];
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (!line) {
            if (result.length > 0 && result[result.length - 1] !== '') {
                result.push('');
            }
            continue;
        }

        // Comment
        if (line.startsWith('#')) {
            result.push(indentStr.repeat(indentLevel) + line);
            continue;
        }

        // Check for dedent statements (elif, else, except, finally)
        if (/^(elif\s|else:|except(\s|:)|finally:)/.test(line)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Format spacing around operators and commas
        if (opts.optCommaSpacing) {
            line = line.replace(/,(\S)/g, ', $1');
        }

        if (opts.optOpSpacing) {
            line = line.replace(/([^!<>=+\-*/%&|^:]\s*)(==|!=|<=|>=|\+=|-=|\*=|\/=|%=|=)(\s*[^!<>=])/g, '$1 $2 $3');
        }

        // Add line with current indent level
        result.push(indentStr.repeat(indentLevel) + line);

        // Check if line opens a block (ends with :)
        if (line.endsWith(':')) {
            indentLevel++;
        }
    }

    return result.join('\n');
}

function formatGenericCode(code, indentStr, opts) {
    let lines = code.split(/\r?\n/);
    return lines.map(line => {
        if (opts.optTrimTrailing) return line.trimEnd();
        return line;
    }).join('\n');
}

/* --- Minify Code --- */
window.minifyCurrentCode = function() {
    const inputEl = document.getElementById('formatter-input');
    const outputEl = document.getElementById('formatter-output');
    const statsEl = document.getElementById('formatter-stats');
    if (!inputEl || !outputEl) return;

    let code = inputEl.value;
    if (!code.trim()) return;

    let minified = '';

    if (currentFormatterLang === 'json') {
        try {
            minified = JSON.stringify(JSON.parse(code));
        } catch (e) {
            minified = code.replace(/\s+/g, ' ');
        }
    } else {
        // Strip line comments and collapse whitespace
        minified = code
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{};(),=+\-*\/])\s*/g, '$1')
            .trim();
    }

    outputEl.value = minified;

    if (statsEl) {
        statsEl.innerHTML = `<span class="stat-pill">📦 Minified to 1 line (${new Blob([minified]).size} bytes)</span>`;
    }
    showToast('> Code minified successfully!');
};

window.copyFormattedCode = function() {
    const outputEl = document.getElementById('formatter-output');
    if (!outputEl || !outputEl.value) {
        showToast('> No formatted code to copy!');
        return;
    }
    navigator.clipboard.writeText(outputEl.value).then(() => {
        showToast('> Formatted code copied to clipboard!');
    });
};

window.clearFormatterTool = function() {
    const input = document.getElementById('formatter-input');
    const output = document.getElementById('formatter-output');
    const stats = document.getElementById('formatter-stats');
    if (input) input.value = '';
    if (output) output.value = '';
    if (stats) stats.innerHTML = '<span class="stat-pill">✨ Ready to format code</span>';
    showToast('> Cleared formatter workspace');
};

window.loadMessyCodeSample = function(lang) {
    const input = document.getElementById('formatter-input');
    if (!input) return;

    if (lang === 'cpp') {
        setFormatterLanguage('cpp');
        input.value = `#include <iostream>\n#include <vector>\nclass UraniumVM{public:void Execute(const uint8_t* code,size_t len){if(code==nullptr){return;}for(size_t i=0;i<len;++i){int op=code[i];if(op==0x01){int a=10;int b=20;int c=a+b*2;std::cout<<c<<std::endl;}}}};`;
    } else if (lang === 'python') {
        setFormatterLanguage('python');
        input.value = `def process_dataset(data,threshold=0.5):\nif not data:\nreturn None\nresults=[]\nfor item in data:\nval=item.get("score",0)\nif val>=threshold:\nresults.append(val*100)\nelse:\nresults.append(0)\nreturn results`;
    } else if (lang === 'json') {
        setFormatterLanguage('json');
        input.value = `{"name":"Uranium","type":"Virtual Machine","version":"2.4.0","author":"omerdev","languages":["C++","C","C#"],"stats":{"loc":450000,"stars":1,"active":true}}`;
    }

    formatCode();
    showToast(`> Loaded unformatted ${lang.toUpperCase()} sample!`);
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
