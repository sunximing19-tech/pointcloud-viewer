from pathlib import Path
from PIL import Image, ImageDraw

SIZE = 1024
out_dir = Path(__file__).resolve().parents[1] / "src-tauri" / "icons"
out_dir.mkdir(parents=True, exist_ok=True)

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# Deep-space rounded tile with the same blue/cyan visual language as the viewer.
draw.rounded_rectangle((42, 42, SIZE - 42, SIZE - 42), radius=210, fill=(7, 13, 28, 255), outline=(41, 93, 190, 255), width=18)

cx, cy, radius = SIZE // 2, SIZE // 2, 285
# A stylized point-cloud sphere made from meridians, latitude arcs, and luminous points.
draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=(44, 185, 255, 220), width=12)
for scale in (0.72, 0.44):
    rx = int(radius * scale)
    draw.ellipse((cx - rx, cy - radius, cx + rx, cy + radius), outline=(76, 224, 255, 160), width=7)
for y_scale in (-0.62, -0.28, 0.28, 0.62):
    yy = int(cy + radius * y_scale)
    half = int((radius * (1 - y_scale * y_scale) ** 0.5))
    draw.arc((cx - half, yy - int(radius * 0.18), cx + half, yy + int(radius * 0.18)), 180, 360, fill=(122, 245, 246, 190), width=7)

points = [
    (370, 330, (95, 226, 255, 255)),
    (486, 267, (58, 145, 255, 255)),
    (612, 335, (112, 245, 202, 255)),
    (330, 500, (76, 145, 255, 255)),
    (440, 450, (58, 231, 255, 255)),
    (560, 520, (255, 209, 94, 255)),
    (700, 478, (251, 121, 160, 255)),
    (400, 655, (95, 227, 255, 255)),
    (520, 700, (121, 253, 194, 255)),
    (650, 635, (255, 178, 80, 255)),
]
for x, y, color in points:
    draw.ellipse((x - 19, y - 19, x + 19, y + 19), fill=color)
    draw.ellipse((x - 32, y - 32, x + 32, y + 32), outline=(*color[:3], 80), width=5)

image.save(out_dir / "icon.png")
image.save(out_dir / "icon.ico", sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
