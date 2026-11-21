import os
from PIL import Image, ImageDraw

os.makedirs('icons', exist_ok=True)

def create_icon(size):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor
    scale = size / 128.0
    
    # Background rounded rect or circle with gradient-like look
    # Main rounded background
    pad = int(4 * scale)
    radius = int(24 * scale)
    
    # Cyan-to-blue background
    # Let's draw a rounded rectangle
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(14, 165, 233, 255), # Sky 500
        outline=(2, 132, 199, 255), # Sky 600
        width=max(1, int(2 * scale))
    )
    
    # Inner dark contrast plate
    inner_pad = int(14 * scale)
    inner_radius = int(16 * scale)
    draw.rounded_rectangle(
        [inner_pad, inner_pad, size - inner_pad, size - inner_pad],
        radius=inner_radius,
        fill=(15, 23, 42, 240) # Slate 900
    )
    
    # Draw a stylized "T" or "Cube" + Lightning Bolt
    # Lightning bolt polygon (normalized to 128x128)
    coords = [
        (68, 22),
        (40, 64),
        (62, 64),
        (56, 106),
        (88, 54),
        (66, 54)
    ]
    scaled_coords = [(int(x * scale), int(y * scale)) for (x, y) in coords]
    
    # Draw lightning bolt in electric cyan/yellow-orange
    draw.polygon(scaled_coords, fill=(250, 204, 21, 255)) # Amber/Gold
    
    # Draw a small 3D cube accent at bottom left or right if size >= 48
    if size >= 48:
        # Accent dot
        dot_r = int(5 * scale)
        dot_x = int(32 * scale)
        dot_y = int(32 * scale)
        draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(56, 189, 248, 255))

    img.save(f'icons/icon{size}.png')
    print(f'Saved icons/icon{size}.png')

for s in [16, 32, 48, 128]:
    create_icon(s)

