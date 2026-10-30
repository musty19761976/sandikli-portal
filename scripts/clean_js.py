"""Clean up AI-looking features from main.js: remove aurora blob injection"""
import re

with open("assets/js/main.js", "r", encoding="utf-8") as f:
    c = f.read()

# Remove aurora injection function
c = re.sub(
    r"\(function injectAurora\(\) \{[^}]+\}\)\(\);\n",
    "",
    c,
    flags=re.DOTALL,
)

# Remove the comment header
c = c.replace(
    "  // ── Aurora Background ─────────────────────────────────────────────────────\n  // Vanilla port of aurora-background.tsx: fixed animated blobs behind content\n",
    "",
)

c = c.replace(
    "  // ─────────────────────────────────────────────────────────────────────────\n\n",
    "",
)

with open("assets/js/main.js", "w", encoding="utf-8") as f:
    f.write(c)

print("OK")