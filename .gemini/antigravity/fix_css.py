
import os

path = r'c:\Users\NGALAMO\Desktop\tous\pratiqueHTML\client\style\style.css'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_broken_zone = False

for line in lines:
    if '. v c - s k e l e t o n' in line:
        in_broken_zone = True
    
    if in_broken_zone:
        # Remove spaces between characters
        # But wait, some spaces are intentional (like between properties and values)
        # However, in this specific broken block, it seems EVERY char is spaced.
        # Let's just manually replace the whole block since we know what it should be.
        continue
    else:
        new_lines.append(line)

# Add the correct block at the end
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

# Find where the broken zone started and insert the fix
# Actually, since I skipped lines in the loop, I just need to append it.
new_lines.append(skeleton_css)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed CSS skeleton block.")
