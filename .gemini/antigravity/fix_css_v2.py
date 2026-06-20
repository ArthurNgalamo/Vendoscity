
import os

path = r'c:\Users\NGALAMO\Desktop\tous\pratiqueHTML\client\style\style.css'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
broken_found = False

for line in lines:
    # Detect broken line: many spaces between letters
    # Example: ". v c - s k e l e t o n"
    if '. v c - s' in line or 'b a c k g r o u n d' in line or 'v c - s k e l e t o n' in line:
        broken_found = True
        continue
    new_lines.append(line)

# Add the correct block once
skeleton_css = """
.vc-skeleton:not(.vc-loaded) {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading-skeleton 1.5s infinite;
    color: transparent;
}
@keyframes loading-skeleton {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Text Skeleton Loaders */
.vc-skeleton-text {
    height: 14px;
    margin-bottom: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading-skeleton 1.5s infinite;
}
.vc-skeleton-text.short { width: 40%; }
.vc-skeleton-text.medium { width: 70%; }
.vc-skeleton-text.long { width: 90%; }
"""

new_lines.append(skeleton_css)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleaned up and fixed CSS.")
