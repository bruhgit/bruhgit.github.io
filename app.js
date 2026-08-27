/**
 * omerdev - Application Logic
 * Manages tab switching, GitHub API repository fetching, one-click zip downloads,
 * and profile README.md rendering.
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
    userData: null,
    isLoaded: false
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initData();
    setupSearch();
});

/* ==========================================================================
   Navigation & Routing
   ========================================================================== */

function initNavigation() {
    // Check initial hash or default to home
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['home', 'downloads', 'about'];
    const initialTab = validTabs.includes(hash) ? hash : 'home';
    
    switchTab(initialTab, false);

    // Hash change event listener
    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash.replace('#', '').toLowerCase();
        if (validTabs.includes(currentHash)) {
            switchTab(currentHash, false);
        }
    });

    // Nav link click events
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

    // Update Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update Tab containers
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Tab specific load actions
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

// Fetch GitHub User Info
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
    // Update user avatars and handle tags
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

// Fetch Repositories
async function fetchRepositories() {
    const downloadsContainer = document.getElementById('downloads-list');
    const homeFeaturedContainer = document.getElementById('home-featured-list');
    
    try {
        const response = await fetch(`https://api.github.com/users/${CONFIG.githubUsername}/repos?per_page=100&sort=updated`);
        if (!response.ok) throw new Error('Repo fetch failed (Rate Limit or Network)');
        const data = await response.json();
        
        // Exclude profile README repository itself from downloads list if wanted, or keep it
        State.repositories = data.filter(repo => !repo.fork || repo.name === 'lively');
        if (State.repositories.length === 0) {
            State.repositories = data;
        }
    } catch (err) {
        console.warn('Using fallback repositories:', err);
        State.repositories = CONFIG.fallbackRepos;
    }

    State.filteredRepositories = [...State.repositories];
    State.isLoaded = true;

    renderRepositories();
    renderFeaturedRepos();
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

// Format Repo Size
function formatSize(kb) {
    if (!kb) return '0 KB';
    if (kb >= 1024) {
        return (kb / 1024).toFixed(1) + ' MB';
    }
    return kb + ' KB';
}

// Build ZIP Download URL
function getZipDownloadUrl(repo) {
    const branch = repo.default_branch || 'main';
    return `https://github.com/${repo.full_name || `${CONFIG.githubUsername}/${repo.name}`}/archive/refs/heads/${branch}.zip`;
}

// Render Repositories in Downloads Tab
function renderRepositories() {
    const container = document.getElementById('downloads-list');
    if (!container) return;

    if (State.filteredRepositories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>🔍 No repositories found matching your search query.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = State.filteredRepositories.map(repo => {
        const langColor = LANGUAGE_COLORS[repo.language] || '#888';
        const downloadUrl = getZipDownloadUrl(repo);
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

// Render Featured Projects on Home Tab
function renderFeaturedRepos() {
    const container = document.getElementById('home-featured-list');
    if (!container) return;

    // Pick top 4 repositories
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
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   Search & Filter
   ========================================================================== */

function setupSearch() {
    const searchInput = document.getElementById('repo-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            State.filteredRepositories = [...State.repositories];
        } else {
            State.filteredRepositories = State.repositories.filter(repo => {
                const name = (repo.name || '').toLowerCase();
                const desc = (repo.description || '').toLowerCase();
                const lang = (repo.language || '').toLowerCase();
                return name.includes(query) || desc.includes(query) || lang.includes(query);
            });
        }

        renderRepositories();
        updateRepoCountBadge();
    });
}

function updateRepoCountBadge() {
    const badge = document.getElementById('repo-count-badge');
    if (badge) {
        badge.textContent = `${State.filteredRepositories.length} repositories`;
    }
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
        // Try fetching main branch first, then master branch
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

    // Render using marked.js if available, otherwise fallback to safe text rendering
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: false
        });
        
        let html = marked.parse(markdown);
        
        // Sanitize if DOMPurify is available
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

/* ==========================================================================
   Utility Helpers
   ========================================================================== */

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
