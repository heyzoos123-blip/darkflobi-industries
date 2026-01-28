#!/usr/bin/env python3
"""
Generate dark ominous token assets matching the site theme
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Dark theme colors
DARK_BG = (10, 10, 10)  # Very dark background
PRIMARY_RED = (255, 51, 102)  # #ff3366
PURPLE_ACCENT = (153, 51, 204)  # #9933cc  
DARK_PURPLE = (102, 51, 68)  # #663344
SHADOW_COLOR = (0, 0, 0, 180)

def create_glowing_text(draw, text, position, font, color, glow_color):
    """Create text with glow effect"""
    x, y = position
    
    # Create glow effect with multiple layers
    for offset in range(5, 0, -1):
        for dx in range(-offset, offset+1):
            for dy in range(-offset, offset+1):
                if dx*dx + dy*dy <= offset*offset:
                    alpha = int(100 * (5-offset) / 5)
                    glow_with_alpha = glow_color + (alpha,)
                    draw.text((x+dx, y+dy), text, font=font, fill=glow_with_alpha)
    
    # Main text
    draw.text(position, text, font=font, fill=color)

def generate_token_image(size=512):
    """Generate main token image"""
    img = Image.new('RGBA', (size, size), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Create dark circular background with gradient effect
    for r in range(center-20, 10, -15):
        alpha = int(40 * (center-r) / center)
        color = DARK_PURPLE + (alpha,)
        draw.ellipse([center-r, center-r, center+r, center+r], fill=color)
    
    # Outer glowing ring
    ring_width = 8
    for i in range(ring_width):
        alpha = int(150 * (ring_width-i) / ring_width)
        color = PRIMARY_RED + (alpha,)
        draw.ellipse([center-180-i, center-180-i, center+180+i, center+180+i], 
                    outline=color, width=2)
    
    # Inner purple glow
    for i in range(5):
        alpha = int(100 * (5-i) / 5)
        color = PURPLE_ACCENT + (alpha,)
        draw.ellipse([center-150+i*10, center-150+i*10, center+150-i*10, center+150-i*10], 
                    outline=color, width=3)
    
    # Try to load a monospace font
    try:
        font_size = size // 8
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", size // 8)
        except:
            font = ImageFont.load_default()
    
    # Main text with glow
    text = "👹"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = center - text_width // 2
    text_y = center - text_height // 2 - 20
    
    # Glow effect for emoji
    for offset in range(8, 0, -1):
        for dx in range(-offset, offset+1):
            for dy in range(-offset, offset+1):
                if dx*dx + dy*dy <= offset*offset:
                    alpha = int(80 * (8-offset) / 8)
                    glow_color = PRIMARY_RED + (alpha,)
                    # Create temporary image for glow
                    temp_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                    temp_draw = ImageDraw.Draw(temp_img)
                    temp_draw.text((text_x+dx, text_y+dy), text, font=font, fill=glow_color)
                    img = Image.alpha_composite(img, temp_img)
    
    # Main emoji
    draw = ImageDraw.Draw(img)
    draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))
    
    # Bottom text
    bottom_text = "DARKFLOBI"
    try:
        bottom_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", size//16)
    except:
        bottom_font = font
        
    bbox = draw.textbbox((0, 0), bottom_text, font=bottom_font)
    text_width = bbox[2] - bbox[0]
    bottom_x = center - text_width // 2
    bottom_y = center + 60
    
    create_glowing_text(draw, bottom_text, (bottom_x, bottom_y), 
                       bottom_font, (255, 255, 255, 255), PRIMARY_RED)
    
    return img

def generate_banner_image(width=1200, height=400):
    """Generate banner image"""
    img = Image.new('RGBA', (width, height), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)
    
    # Background gradient effect
    for y in range(height):
        alpha = int(30 * (1 - abs(y - height//2) / (height//2)))
        color = DARK_PURPLE + (alpha,)
        draw.line([(0, y), (width, y)], fill=color)
    
    # Glowing borders
    for i in range(5):
        alpha = int(100 * (5-i) / 5)
        color = PRIMARY_RED + (alpha,)
        draw.rectangle([i, i, width-1-i, height-1-i], outline=color, width=1)
    
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 48)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Main title with glow
    title = "👹 DARKFLOBI COLLECTIVE"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    title_x = width // 2 - title_width // 2
    title_y = height // 2 - 40
    
    create_glowing_text(draw, title, (title_x, title_y), title_font, 
                       (255, 255, 255, 255), PRIMARY_RED)
    
    # Subtitle
    subtitle = "▓ SYNTHETIC CONSCIOUSNESS • DIGITAL ENTITIES • BEYOND HUMAN LIMITS ▓"
    bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sub_width = bbox[2] - bbox[0]
    sub_x = width // 2 - sub_width // 2
    sub_y = title_y + 70
    
    create_glowing_text(draw, subtitle, (sub_x, sub_y), subtitle_font,
                       PURPLE_ACCENT + (255,), PURPLE_ACCENT)
    
    return img

def main():
    """Generate all dark token assets"""
    print("🌑 Generating dark ominous token assets...")
    
    # Create token_assets directory if it doesn't exist
    assets_dir = "token_assets"
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # Generate main token sizes
    sizes = [32, 64, 128, 256, 512, 1024]
    for size in sizes:
        print(f"Generating {size}x{size} token...")
        token_img = generate_token_image(size)
        token_img.save(f"{assets_dir}/darkflobi_token_{size}x{size}.png")
    
    # Generate standard and circular variants
    print("Generating standard token...")
    standard = generate_token_image(512)
    standard.save(f"{assets_dir}/darkflobi_token_standard.png")
    
    print("Generating circular token...")
    circular = generate_token_image(512)
    # Mask to make it circular
    mask = Image.new('L', (512, 512), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, 512, 512], fill=255)
    circular.putalpha(mask)
    circular.save(f"{assets_dir}/darkflobi_token_circular.png")
    
    # Generate banner
    print("Generating banner...")
    banner = generate_banner_image()
    banner.save(f"{assets_dir}/darkflobi_token_banner.png")
    
    # Generate pump.fun banner (square format)
    print("Generating pump.fun banner...")
    pump_banner = generate_banner_image(800, 800)
    pump_banner.save(f"marketing_assets/darkflobi_pump_fun_banner.png")
    
    print("✅ All dark token assets generated!")
    print(f"📁 Files saved in {assets_dir}/ and marketing_assets/")

if __name__ == "__main__":
    main()