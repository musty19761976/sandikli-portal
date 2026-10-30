"""Batch updates: CSS version, Twitter meta, navbar.js script, remove inline styles, update SW"""
import glob, re

for f in glob.glob("*.html"):
    if f == "404.html":
        continue
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()

    changed = False

    # 1. CSS version → v=7
    new_content = re.sub(
        r'href="assets/css/style\.css\?v=\d+"',
        'href="assets/css/style.css?v=7"',
        content
    )
    if new_content != content:
        changed = True
        content = new_content

    # 2. Add navbar.js if not present
    if 'assets/js/navbar.js' not in content and 'assets/js/main.js' in content:
        content = content.replace(
            '<script src="assets/js/main.js">',
            '<script src="assets/js/navbar.js"></script>\n  <script src="assets/js/main.js">'
        )
        changed = True

    # 3. Add Twitter Card meta tags after canonical link
    if 'twitter:card' not in content:
        # Find OG title and description for Twitter
        og_title = ""
        og_desc = ""
        m = re.search(r'og:title" content="([^"]+)"', content)
        if m:
            og_title = m.group(1)
        m = re.search(r'og:description" content="([^"]+)"', content)
        if m:
            og_desc = m.group(1)

        tw_meta = f'''    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{og_title}" />
    <meta name="twitter:description" content="{og_desc}" />'''

        content = content.replace(
            '<link rel="canonical"',
            tw_meta + '\n    <link rel="canonical"'
        )
        changed = True

    # 4. Remove inline styles from section-dark fact cards (moved to CSS)
    content = content.replace('style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1)"', '')
    content = content.replace('style="color:var(--gold-300)"', '')
    content = content.replace('style="color:rgba(255,255,255,0.7)"', '')
    content = content.replace('style="color:rgba(255,255,255,0.5)"', '')

    if changed:
        with open(f, "w", encoding="utf-8") as fh:
            fh.write(content)
        print(f"UPDATED: {f}")
    else:
        print(f"SKIP: {f}")

# Update SW
with open("sw.js", "r", encoding="utf-8") as fh:
    sw = fh.read()

sw_updated = sw.replace('"sandikli-v10"', '"sandikli-v12"')

# Add new files to PRECACHE_URLS if not there
additions = [
    './assets/css/base.css',
    './assets/css/components.css',
    './assets/css/aurora.css',
    './assets/js/navbar.js',
    './assets/js/fuse.js',
    './components/navbar.html',
]
for a in additions:
    if a not in sw_updated:
        # Insert before manifest.webmanifest
        sw_updated = sw_updated.replace(
            '"./manifest.webmanifest"',
            f'"{a}",\n  "./manifest.webmanifest"'
        )

if sw_updated != sw:
    with open("sw.js", "w", encoding="utf-8") as fh:
        fh.write(sw_updated)
    print("SW UPDATED: v12 + new files")
else:
    print("SW unchanged")

print("\nDone!")
