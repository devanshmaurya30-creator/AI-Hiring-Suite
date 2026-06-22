import sys
from PIL import Image, ImageEnhance
import numpy as np

def extract_logo(input_path, output_png_path, output_favicon_path):
    img = Image.open(input_path).convert('RGB')
    
    # 1. Crop out the monogram (assuming it's in the top center/middle)
    # 1254x1254 total. Let's crop to a square around the center.
    # Usually in these generated logos, the monogram is in the middle and text is at the bottom.
    width, height = img.size
    
    # Let's crop a 600x600 square from the middle (x=327, y=200 to 927, 800)
    # We will just do a generous center crop avoiding the bottom 30% where text usually is.
    crop_box = (int(width * 0.15), int(height * 0.1), int(width * 0.85), int(height * 0.7))
    cropped = img.crop(crop_box)
    
    # Convert to numpy array
    arr = np.array(cropped).astype(float)
    
    # Calculate luminance (simple max or weighted)
    # For a glowing logo, taking the max of RGB as alpha works well to preserve glow.
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Use max channel as alpha, but boost it slightly so colors remain solid
    alpha = np.max(arr, axis=2)
    
    # Create an alpha channel based on brightness, using a threshold to ensure pure black is transparent
    # We'll use a curve to make darks darker and brights fully opaque
    alpha_scaled = (alpha / 255.0) ** 1.2
    alpha_scaled = np.clip(alpha_scaled * 255.0 * 1.5, 0, 255)
    
    # Avoid division by zero
    alpha_safe = np.where(alpha == 0, 1, alpha)
    
    # Un-multiply the RGB so the colors stay vibrant when drawn with alpha
    r_unmult = np.clip(r * 255.0 / alpha_safe, 0, 255)
    g_unmult = np.clip(g * 255.0 / alpha_safe, 0, 255)
    b_unmult = np.clip(b * 255.0 / alpha_safe, 0, 255)
    
    # Create RGBA image
    rgba = np.zeros((cropped.height, cropped.width, 4), dtype=np.uint8)
    rgba[:, :, 0] = r_unmult
    rgba[:, :, 1] = g_unmult
    rgba[:, :, 2] = b_unmult
    rgba[:, :, 3] = alpha_scaled
    
    out_img = Image.fromarray(rgba, 'RGBA')
    
    # Enhance colors slightly
    enhancer = ImageEnhance.Color(out_img)
    out_img = enhancer.enhance(1.2)
    
    # Trim empty transparent edges
    bbox = out_img.getbbox()
    if bbox:
        out_img = out_img.crop(bbox)
        
    out_img.save(output_png_path, "PNG")
    
    # Favicon version (square)
    w, h = out_img.size
    sq_size = max(w, h)
    sq_img = Image.new('RGBA', (sq_size, sq_size), (0, 0, 0, 0))
    sq_img.paste(out_img, ((sq_size - w) // 2, (sq_size - h) // 2))
    sq_img.thumbnail((256, 256), Image.Resampling.LANCZOS)
    sq_img.save(output_favicon_path, "ICO")

if __name__ == '__main__':
    extract_logo(
        'C:/Users/devan/OneDrive/Desktop/AI-Hiring-Assistant/ai.png',
        'C:/Users/devan/OneDrive/Desktop/AI-Hiring-Assistant/frontend/public/ai-monogram.png',
        'C:/Users/devan/OneDrive/Desktop/AI-Hiring-Assistant/frontend/app/favicon.ico'
    )
    print("Logo extracted and saved.")
