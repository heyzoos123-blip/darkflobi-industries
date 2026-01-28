#!/usr/bin/env python3
"""
Darkflobi Token Asset Generator
Creates professional token images and banners with digital gremlin aesthetic
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_token_logo():
    """Create main token logo - 512x512 for exchanges"""
    
    # Create base image with dark background
    size = 512
    img = Image.new('RGB', (size, size), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Draw outer ring (terminal green)
    ring_color = '#00FF00'
    ring_width = 8
    draw.ellipse([ring_width, ring_width, size-ring_width, size-ring_width], 
                outline=ring_color, width=ring_width)
    
    # Draw inner background circle
    inner_radius = size//2 - 40
    center = size//2
    draw.ellipse([center-inner_radius, center-inner_radius, 
                 center+inner_radius, center+inner_radius], 
                fill='#111111', outline='#00FF00', width=3)
    
    # Add grid pattern background (subtle)
    grid_color = '#222222'
    grid_spacing = 20
    for i in range(0, size, grid_spacing):
        draw.line([(i, 0), (i, size)], fill=grid_color, width=1)
        draw.line([(0, i), (size, i)], fill=grid_color, width=1)
    
    # Add gremlin face (stylized)
    face_center_y = center - 30
    
    # Eyes
    eye_color = '#00FFFF'
    eye_size = 25
    left_eye = [center-50, face_center_y-20, center-25, face_center_y+5]
    right_eye = [center+25, face_center_y-20, center+50, face_center_y+5]
    draw.ellipse(left_eye, fill=eye_color, outline='#FFFFFF', width=2)
    draw.ellipse(right_eye, fill=eye_color, outline='#FFFFFF', width=2)
    
    # Pupils
    pupil_color = '#000000'
    draw.ellipse([center-42, face_center_y-10, center-33, face_center_y-1], fill=pupil_color)
    draw.ellipse([center+33, face_center_y-10, center+42, face_center_y-1], fill=pupil_color)
    
    # Grin (characteristic smile)
    mouth_y = face_center_y + 40
    mouth_points = [
        (center-40, mouth_y),
        (center-20, mouth_y+15),
        (center, mouth_y+20),
        (center+20, mouth_y+15),
        (center+40, mouth_y)
    ]
    draw.polygon(mouth_points, fill='#FFFFFF', outline='#00FF00', width=2)
    
    # Add "teeth" pattern
    teeth_color = '#FFFFFF'
    for i in range(-30, 31, 10):
        draw.rectangle([center+i-2, mouth_y+5, center+i+2, mouth_y+18], fill=teeth_color)
    
    # Add circuit pattern accents
    circuit_color = '#00FF00'
    # Top circuits
    draw.line([(center-80, 60), (center-40, 60), (center-40, 80), (center, 80)], 
             fill=circuit_color, width=3)
    draw.line([(center+80, 60), (center+40, 60), (center+40, 80), (center, 80)], 
             fill=circuit_color, width=3)
    
    # Bottom text area
    text_y = size - 80
    font_size = 32
    
    # Try to load a monospace font, fallback to default
    try:
        font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("Courier New Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    # Draw main text
    text = "DARKFLOBI"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (size - text_width) // 2
    
    # Text shadow
    draw.text((text_x+2, text_y+2), text, font=font, fill='#000000')
    # Main text
    draw.text((text_x, text_y), text, font=font, fill='#00FF00')
    
    # Subtitle
    subtitle = "AI CEO TOKEN"
    subtitle_font_size = 18
    try:
        subtitle_font = ImageFont.truetype("DejaVuSansMono.ttf", subtitle_font_size)
    except:
        subtitle_font = ImageFont.load_default()
    
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (size - subtitle_width) // 2
    subtitle_y = text_y + 45
    
    draw.text((subtitle_x, subtitle_y), subtitle, font=subtitle_font, fill='#00FFFF')
    
    return img

def create_banner_image():
    """Create banner for social media and marketing - 1200x400"""
    
    width, height = 1200, 400
    img = Image.new('RGB', (width, height), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Add matrix-style background pattern
    grid_color = '#001100'
    for i in range(0, width, 20):
        for j in range(0, height, 20):
            if (i + j) % 40 == 0:
                draw.rectangle([i, j, i+10, j+10], fill=grid_color)
    
    # Left side - Logo area
    logo_size = 300
    logo_x = 50
    logo_y = (height - logo_size) // 2
    
    # Create simplified logo for banner
    logo_center_x = logo_x + logo_size // 2
    logo_center_y = logo_y + logo_size // 2
    
    # Outer ring
    draw.ellipse([logo_x, logo_y, logo_x + logo_size, logo_y + logo_size], 
                outline='#00FF00', width=6)
    
    # Inner circle
    inner_margin = 30
    draw.ellipse([logo_x + inner_margin, logo_y + inner_margin, 
                 logo_x + logo_size - inner_margin, logo_y + logo_size - inner_margin], 
                fill='#111111', outline='#00FFFF', width=3)
    
    # Gremlin face
    face_y = logo_center_y - 20
    
    # Eyes
    draw.ellipse([logo_center_x-40, face_y-15, logo_center_x-20, face_y+5], 
                fill='#00FFFF', outline='#FFFFFF', width=2)
    draw.ellipse([logo_center_x+20, face_y-15, logo_center_x+40, face_y+5], 
                fill='#00FFFF', outline='#FFFFFF', width=2)
    
    # Pupils
    draw.ellipse([logo_center_x-35, face_y-5, logo_center_x-25, face_y+5], fill='#000000')
    draw.ellipse([logo_center_x+25, face_y-5, logo_center_x+35, face_y+5], fill='#000000')
    
    # Smile
    smile_points = [
        (logo_center_x-30, face_y+25),
        (logo_center_x-15, face_y+35),
        (logo_center_x, face_y+40),
        (logo_center_x+15, face_y+35),
        (logo_center_x+30, face_y+25)
    ]
    draw.polygon(smile_points, fill='#FFFFFF', outline='#00FF00', width=2)
    
    # Right side - Text content
    text_start_x = logo_x + logo_size + 80
    
    # Main title
    try:
        title_font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", 48)
        subtitle_font = ImageFont.truetype("DejaVuSansMono.ttf", 24)
        tagline_font = ImageFont.truetype("DejaVuSansMono.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
    
    # Title
    title_y = 60
    draw.text((text_start_x+2, title_y+2), "DARKFLOBI", font=title_font, fill='#000000')
    draw.text((text_start_x, title_y), "DARKFLOBI", font=title_font, fill='#00FF00')
    
    # Subtitle
    subtitle_y = title_y + 60
    draw.text((text_start_x, subtitle_y), "First Autonomous AI Company", 
             font=subtitle_font, fill='#00FFFF')
    
    # Features
    features_y = subtitle_y + 50
    features = [
        "🤖 100+ AI Workers",
        "💰 $127K+ Daily Revenue", 
        "🛡️ Enterprise Security",
        "🚀 Interactive Terminal"
    ]
    
    for i, feature in enumerate(features):
        y_pos = features_y + (i * 30)
        draw.text((text_start_x, y_pos), feature, font=tagline_font, fill='#FFFFFF')
    
    # Bottom tagline
    bottom_y = height - 40
    tagline = "build > hype • 4am energy • digital gremlin 😁"
    draw.text((text_start_x, bottom_y), tagline, font=tagline_font, fill='#666666')
    
    return img

def create_token_variants():
    """Create different token logo variants"""
    
    variants = {
        'standard': create_token_logo(),
        'banner': create_banner_image()
    }
    
    # Create circular variant (for some platforms)
    circular = variants['standard'].copy()
    
    # Create square variant with rounded corners
    rounded = variants['standard'].copy()
    
    # Create minimal variant (just the gremlin face)
    minimal = Image.new('RGB', (512, 512), color='#000000')
    minimal_draw = ImageDraw.Draw(minimal)
    
    # Copy just the face elements from main logo
    face_region = variants['standard'].crop((150, 150, 362, 300))
    minimal.paste(face_region, (126, 126))
    
    # Add border
    minimal_draw.ellipse([10, 10, 502, 502], outline='#00FF00', width=8)
    
    variants['minimal'] = minimal
    variants['circular'] = circular
    variants['rounded'] = rounded
    
    return variants

def main():
    """Generate all token assets"""
    
    print("🤖 Generating Darkflobi Token Assets...")
    
    # Create output directory
    output_dir = "token_assets"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate variants
    variants = create_token_variants()
    
    # Save all variants
    for name, img in variants.items():
        filename = f"{output_dir}/darkflobi_token_{name}.png"
        img.save(filename, "PNG", quality=95)
        print(f"✅ Saved: {filename}")
    
    # Create different sizes for various platforms
    sizes = [
        (32, 32),    # Favicon
        (64, 64),    # Small icon
        (128, 128),  # Medium icon
        (256, 256),  # Large icon
        (512, 512),  # Exchange standard
        (1024, 1024) # High resolution
    ]
    
    base_logo = variants['standard']
    
    for size in sizes:
        resized = base_logo.resize(size, Image.Resampling.LANCZOS)
        filename = f"{output_dir}/darkflobi_token_{size[0]}x{size[1]}.png"
        resized.save(filename, "PNG", quality=95)
        print(f"✅ Saved: {filename}")
    
    print(f"\n🚀 All token assets generated in: {output_dir}/")
    print("\n📋 Files created:")
    for file in os.listdir(output_dir):
        if file.endswith('.png'):
            print(f"   • {file}")
    
    print(f"\n🎯 Ready for:")
    print("   • Pump.fun token launch")
    print("   • Exchange listings") 
    print("   • Social media campaigns")
    print("   • Marketing materials")

if __name__ == "__main__":
    main()