// Site Configuration
const CONFIG = {
    // GitHub username
    githubUsername: "bruhgit",
    // Site & Display Name
    displayName: "omerdev",
    realName: "Omer",
    tagline: "Systems Programmer & Full-Stack Developer",
    bio: "Living inside 600,000+ line C++/C/C# codebases, getting excited whenever something says 'no null'.",
    
    // Repositories to hide from Downloads and Featured list
    excludedRepos: ["bruhgit", "omerdev", "bruhgit.github.io"],

    // Custom language / metadata overrides (Fixes GitHub Linguist mistakes)
    repoOverrides: {
        "Uranium-Programming-Language": {
            language: "C++",
            description: "450,000+ lines of C++ programming language running on a Uranium Virtual Machine with JIT Engine and GC."
        }
    },

    // Custom Tech Stack LOC / Experience Distribution (Sorted automatically)
    techStackDistribution: [
        { language: "C++", percentage: 55.0, note: "450K+ LOC (Uranium VM, JIT, DevNotes)" },
        { language: "C", percentage: 25.0, note: "Bolt GUI, OMake Build System" },
        { language: "C#", percentage: 20.0, note: "OpenDock WinUI, Lively" }
    ],

    // Social / Contact Links
    links: {
        github: "https://github.com/bruhgit"
    },

    // Skills & Badges for Home tab
    skills: [
        { name: "C++", color: "#00599C" },
        { name: "C", color: "#A8B9CC" },
        { name: "C#", color: "#239120" },
        { name: "Vulkan", color: "#AC162C" },
        { name: "CMake", color: "#064F8C" },
        { name: "SDL3", color: "#1774A5" }
    ],

    // Fallback data in case GitHub API rate limit is reached
    fallbackRepos: [
        {
            id: 1231297510,
            name: "Uranium-Programming-Language",
            full_name: "bruhgit/Uranium-Programming-Language",
            description: "450,000+ lines of C++ programming language running on a Uranium Virtual Machine with JIT Engine and GC.",
            html_url: "https://github.com/bruhgit/Uranium-Programming-Language",
            language: "C++",
            stargazers_count: 1,
            forks_count: 0,
            default_branch: "main",
            updated_at: "2026-07-23T16:00:16Z",
            size: 3659
        },
        {
            id: 1234054637,
            name: "Bolt",
            full_name: "bruhgit/Bolt",
            description: "SDL3-based Graphical Interface Library",
            html_url: "https://github.com/bruhgit/Bolt",
            language: "C",
            stargazers_count: 0,
            forks_count: 0,
            default_branch: "main",
            updated_at: "2026-08-25T08:40:58Z",
            size: 1285
        },
        {
            id: 1330718068,
            name: "OpenDock",
            full_name: "bruhgit/OpenDock",
            description: "MacOS dock for Windows built with C# and WinUI",
            html_url: "https://github.com/bruhgit/OpenDock",
            language: "C#",
            stargazers_count: 0,
            forks_count: 0,
            default_branch: "master",
            updated_at: "2026-08-13T14:30:23Z",
            size: 522
        },
        {
            id: 1160766278,
            name: "OMake",
            full_name: "bruhgit/OMake",
            description: "Official OMake Build System Repo",
            html_url: "https://github.com/bruhgit/OMake",
            language: "C",
            stargazers_count: 0,
            forks_count: 0,
            default_branch: "main",
            updated_at: "2026-07-05T17:53:09Z",
            size: 4190
        },
        {
            id: 1230255551,
            name: "DevNotes",
            full_name: "bruhgit/DevNotes",
            description: "Developers dictionary & documentation tools",
            html_url: "https://github.com/bruhgit/DevNotes",
            language: "C++",
            stargazers_count: 0,
            forks_count: 0,
            default_branch: "main",
            updated_at: "2026-07-05T17:50:06Z",
            size: 42
        },
        {
            id: 1328720104,
            name: "lively",
            full_name: "bruhgit/lively",
            description: "Free and open-source software that allows users to set animated desktop wallpapers and screensavers powered by WinUI 3.",
            html_url: "https://github.com/bruhgit/lively",
            language: "C#",
            stargazers_count: 0,
            forks_count: 0,
            default_branch: "core-separation",
            updated_at: "2026-08-09T11:14:11Z",
            size: 314151
        }
    ],

    // Fallback profile README markdown
    fallbackReadme: `<h1 align="center">Hey, I'm Omer 👋</h1>

<p align="center">Full-stack developer at heart, systems programmer at soul 🖤 — living inside 600,000+ line C++/C/C# codebases, getting excited whenever something says "no null".</p>

<p align="center">
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++" />
  <img src="https://img.shields.io/badge/C-A8B9CC?style=for-the-badge&logo=c&logoColor=white" alt="C" />
  <img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/Vulkan-AC162C?style=for-the-badge&logo=vulkan&logoColor=white" alt="Vulkan" />
  <img src="https://img.shields.io/badge/CMake-064F8C?style=for-the-badge&logo=cmake&logoColor=white" alt="CMake" />
</p>

---

### 💻 Core Projects & Research
- **Uranium Programming Language**: Custom virtual machine, bytecode compiler, JIT engine & Garbage Collection.
- **Bolt**: SDL3-accelerated modern cross-platform GUI framework.
- **OpenDock**: Native, customizable macOS-style desktop dock for Windows.
- **OMake**: High-speed, lightweight build automation system.
`
};
