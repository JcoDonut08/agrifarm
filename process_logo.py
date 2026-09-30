from PIL import Image, ImageDraw
import numpy as np

img = Image.open('public/images/logo_raw.jpg').convert('RGBA')
data = np.array(img)

# Checkerboard is grayscale. Let's find pixels where R, G, B are significantly different from each other.
# Gray means R = G = B. So max(R,G,B) - min(R,G,B) > some threshold means it's colorful.
r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
color_diff = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
mask = color_diff > 20

# Get bounding box of colored pixels
y_indices, x_indices = np.where(mask)
if len(x_indices) > 0 and len(y_indices) > 0:
    min_x, max_x = np.min(x_indices), np.max(x_indices)
    min_y, max_y = np.min(y_indices), np.max(y_indices)
else:
    # fallback to center square based on height
    h = img.size[1]
    w = img.size[0]
    min_x = (w - h) // 2
    max_x = min_x + h
    min_y = 0
    max_y = h

# Crop to the bounding box
# Make it a perfect square
size = max(max_x - min_x, max_y - min_y)
center_x = (min_x + max_x) // 2
center_y = (min_y + max_y) // 2

crop_min_x = center_x - size // 2
crop_max_x = crop_min_x + size
crop_min_y = center_y - size // 2
crop_max_y = crop_min_y + size

cropped = img.crop((crop_min_x, crop_min_y, crop_max_x, crop_max_y))

# Create circular mask
mask_im = Image.new("L", cropped.size, 0)
draw = ImageDraw.Draw(mask_im)
draw.ellipse((0, 0, size, size), fill=255)

# Apply mask
cropped.putalpha(mask_im)
cropped.save('public/images/logo.png', 'PNG')
print("Saved logo.png with size:", cropped.size)
