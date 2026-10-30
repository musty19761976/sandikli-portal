"""Replace inline navbar blocks with navbar-root div, add navbar.js script"""
import glob, re

for f in glob.glob("*.html"):
    if f == "404.html":
        continue
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()

    # Replace navbar header block
    # Match from `<header class="navbar...` to `</header>`
    pattern = r'<header class=\"navbar[^\"]*\">.*?</header>'
    new_content = re.sub(pattern, '    <div id="navbar-root"></div>', content, flags=re.DOTALL)

    if new_content == content:
        print(f"NOCHANGE: {f}")
        continue

    # Add navbar.js before main.js if not already present
    if 'assets/js/navbar.js' not in new_content and 'assets/js/main.js' in new_content:
        new_content = new_content.replace(
            '<script src="assets/js/main.js">',
            '<script src="assets/js/navbar.js"></script>\n  <script src="assets/js/main.js">'
        )

    with open(f, "w", encoding="utf-8") as fh:
        fh.write(new_content)
    print(f"OK: {f}")