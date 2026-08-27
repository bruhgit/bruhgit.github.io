# omerdev // Developer Portfolio & Hub

A sleek, dark-themed developer portfolio and open-source project repository hub built with pure vanilla web technologies and styled with **JetBrains Mono**.

🌐 **Live Site:** [https://bruhgit.github.io/](https://bruhgit.github.io/)

---

## ⚡ Features

- 🖤 **Monochrome & Deep Dark Theme**: Pure black terminal aesthetic with modern subtle glow accents.
- 🔤 **JetBrains Mono Typography**: High-legibility developer font across the entire interface.
- 🧭 **Navigation**:
  - `Home`: Developer profile hero, core systems programming skills (C++, C, C#, Vulkan, CMake, SDL3), project statistics, and language distribution metrics.
  - `Downloads`: Live repository browser fetching directly from the GitHub API with **One-Click ZIP Downloads**, `git clone` command copying, and real-time search & language filter chips.
  - `Tools`: In-browser developer suite featuring Multi-Language Code Beautifier (C, C++, Python, C#, JS, JSON), Radix / Byte Inspector, and String Escaper.
  - `About`: Live rendering of the profile `README.md`, dynamic live GitHub stats, and custom achievement badges.
- 📱 **Progressive Web App (PWA)**: Full offline support with Service Worker (`sw.js`) and installable desktop/mobile experience.
- 🛡️ **Web Standards**: RFC 9116 `security.txt`, `humans.txt`, `ai.txt`, OpenGraph metadata, and W3C webmanifest.
- 🚀 **Zero Dependencies**: Pure HTML5, CSS3, and modern JavaScript with no build step required.
- ⚡ **GitHub Pages Ready**: Optimized for instant static hosting.

---

## 🛠️ Project Structure

```
omerdev/
├── index.html       # Main application layout and tab structure
├── styles.css       # JetBrains Mono styling, dark theme, animations
├── config.js        # Site metadata, skills, and fallback data
├── app.js           # GitHub API integration, tab routing, tools suite
├── sw.js            # PWA Service Worker for offline caching
├── site.webmanifest # PWA application manifest
├── humans.txt       # Authorship and credits
├── ai.txt           # AI agent indexing policy
├── robots.txt       # Search engine crawler configuration
├── sitemap.xml      # SEO sitemap
└── 404.html         # Custom 404 error page
```

---

## ⚙️ Configuration

To customize this portfolio for another GitHub user or repository:

1. Open `config.js`.
2. Update the `githubUsername` and metadata fields.
3. Configure `skills` and `excludedRepos` as desired.

---

## 📄 License

This project is licensed under the terms described in the [LICENSE](LICENSE) file.
