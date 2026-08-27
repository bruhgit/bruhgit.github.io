# omerdev.github.io / Portfolio & Downloads Hub

JetBrains Mono fontuna sahip, saf siyah/koyu temalı, kişisel açık kaynak repository indirme ve geliştirici portföy sitesi.

## ✨ Özellikler

- 🖤 **Saf Koyu / Siyah Tema**: Terminal ve modern geliştirici estetiği.
- 🔤 **JetBrains Mono Tipografisi**: Tüm arayüz genelinde optimize edilmiş monospace font.
- 🧭 **Üst Menü Barı**: `Home | Downloads | About`
  - **Home**: Biyografi, sistem programlama dilleri rozetleri (C++, C, C#, Vulkan, CMake, SDL3) ve öne çıkan repolar.
  - **Downloads**: GitHub API üzerinden canlı çekilen tüm public repolar, anlık arama/filtreleme ve her biri için **Tek Tıkla ZIP İndirme Butonu** (`Download ZIP`).
  - **About**: `bruhgit/bruhgit/README.md` dosyanızı dinamik olarak çeken ve GitHub markdown stilleriyle render eden alan.
- ⚡ **Offline & Rate-Limit Güvencesi**: GitHub API limitine takılsa dahi çalışan statik fallback veritabanı (`config.js`).

---

## 🚀 GitHub Pages Üzerinde Yayınlama

Bu projeyi GitHub Pages üzerinde yayına almak için terminalde şu komutları uygulayabilirsiniz:

```bash
git push -u origin main
```

### GitHub Pages Aktif Etme:
1. GitHub'da `omerdev` reponuza gidin.
2. **Settings** > **Pages** menüsüne tıklayın.
3. **Build and deployment** altında **Source** olarak `Deploy from a branch` seçin.
4. **Branch** olarak `main` ve `/ (root)` seçip **Save** butonuna basın.
5. Siteniz birkaç dakika içinde `https://bruhgit.github.io/omerdev/` adresinde canlıya geçecektir!

---

## ⚙️ Yapılandırma (`config.js`)

Kullanıcı adınızı, öne çıkan repolarınızı veya yeteneklerinizi güncellemek için [config.js](config.js) dosyasını düzenleyebilirsiniz.
