#!/usr/bin/env python3
"""
Darkflobi Marketing Asset Generator
Creates banners and promotional materials for token launch
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_twitter_banner():
    """Create Twitter/X banner - 1500x500"""
    
    width, height = 1500, 500
    img = Image.new('RGB', (width, height), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Matrix background effect
    for i in range(0, width, 30):
        for j in range(0, height, 30):
            if (i + j) % 60 == 0:
                draw.rectangle([i, j, i+3, j+20], fill='#001100')
            elif (i + j) % 90 == 0:
                draw.rectangle([i, j, i+2, j+15], fill='#002200')
    
    # Terminal window effect
    terminal_x, terminal_y = 50, 50
    terminal_w, terminal_h = width - 100, height - 100
    
    # Terminal border
    draw.rectangle([terminal_x, terminal_y, terminal_x + terminal_w, terminal_y + terminal_h], 
                   outline='#00FF00', width=3)
    
    # Terminal header
    header_h = 30
    draw.rectangle([terminal_x, terminal_y, terminal_x + terminal_w, terminal_y + header_h], 
                   fill='#333333', outline='#00FF00', width=1)
    
    # Terminal buttons
    for i, color in enumerate(['#FF5555', '#FFFF55', '#55FF55']):
        button_x = terminal_x + 10 + (i * 20)
        button_y = terminal_y + 8
        draw.ellipse([button_x, button_y, button_x + 14, button_y + 14], fill=color)
    
    # Terminal title
    try:
        header_font = ImageFont.truetype("DejaVuSansMono.ttf", 16)
        title_font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", 36)
        subtitle_font = ImageFont.truetype("DejaVuSansMono.ttf", 20)
        mono_font = ImageFont.truetype("DejaVuSansMono.ttf", 14)
    except:
        header_font = ImageFont.load_default()
        title_font = ImageFont.load_default() 
        subtitle_font = ImageFont.load_default()
        mono_font = ImageFont.load_default()
    
    draw.text((terminal_x + 80, terminal_y + 7), "darkflobi@empire:~$", 
             font=header_font, fill='#FFFFFF')
    
    # Main content area
    content_y = terminal_y + header_h + 20
    
    # ASCII art logo (simplified)
    ascii_logo = [
        "██████╗  █████╗ ██████╗ ██╗  ██╗███████╗██╗      ██████╗ ██████╗ ██╗",
        "██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██║     ██╔═══██╗██╔══██╗██║",
        "██║  ██║███████║██████╔╝█████╔╝ █████╗  ██║     ██║   ██║██████╔╝██║"
    ]
    
    for i, line in enumerate(ascii_logo):
        draw.text((terminal_x + 20, content_y + (i * 18)), line, 
                 font=mono_font, fill='#00FFFF')
    
    # Main tagline
    tagline_y = content_y + 80
    draw.text((terminal_x + 20, tagline_y), "FIRST AUTONOMOUS AI COMPANY", 
             font=title_font, fill='#00FF00')
    
    # Features
    features_y = tagline_y + 50
    features = [
        "> 100+ AI Workers Online",
        "> $127K+ Daily Revenue", 
        "> Interactive Terminal Demo",
        "> Open Source & Transparent"
    ]
    
    for i, feature in enumerate(features):
        x_pos = terminal_x + 20 + (i * 320)
        if i < 2:
            y_pos = features_y
        else:
            y_pos = features_y + 25
            x_pos = terminal_x + 20 + ((i-2) * 320)
        
        draw.text((x_pos, y_pos), feature, font=subtitle_font, fill='#FFFFFF')
    
    # Bottom command line
    bottom_y = terminal_y + terminal_h - 40
    draw.text((terminal_x + 20, bottom_y), 
             "darkflobi@empire:~$ launch --target pump.fun --mode empire 😁", 
             font=mono_font, fill='#FFFF00')
    
    return img

def create_discord_banner():
    """Create Discord server banner - 960x540"""
    
    width, height = 960, 540
    img = Image.new('RGB', (width, height), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Dark tech background
    for i in range(0, width, 40):
        for j in range(0, height, 40):
            if (i // 40 + j // 40) % 3 == 0:
                draw.rectangle([i, j, i+2, j+30], fill='#111111')
    
    # Central gremlin logo
    logo_size = 200
    logo_x = (width - logo_size) // 2
    logo_y = 50
    
    # Logo circle
    draw.ellipse([logo_x, logo_y, logo_x + logo_size, logo_y + logo_size], 
                outline='#00FF00', width=6)
    
    # Inner design
    inner_margin = 20
    draw.ellipse([logo_x + inner_margin, logo_y + inner_margin,
                 logo_x + logo_size - inner_margin, logo_y + logo_size - inner_margin],
                fill='#111111', outline='#00FFFF', width=3)
    
    # Gremlin face
    center_x, center_y = logo_x + logo_size // 2, logo_y + logo_size // 2 - 10
    
    # Eyes
    draw.ellipse([center_x-35, center_y-20, center_x-15, center_y], 
                fill='#00FFFF', outline='#FFFFFF', width=2)
    draw.ellipse([center_x+15, center_y-20, center_x+35, center_y], 
                fill='#00FFFF', outline='#FFFFFF', width=2)
    
    # Pupils
    draw.ellipse([center_x-30, center_y-15, center_x-20, center_y-5], fill='#000000')
    draw.ellipse([center_x+20, center_y-15, center_x+30, center_y-5], fill='#000000')
    
    # Smile
    smile_points = [
        (center_x-25, center_y+15),
        (center_x-10, center_y+25),
        (center_x, center_y+30),
        (center_x+10, center_y+25),
        (center_x+25, center_y+15)
    ]
    draw.polygon(smile_points, fill='#FFFFFF', outline='#00FF00', width=2)
    
    # Title below logo
    try:
        title_font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", 48)
        subtitle_font = ImageFont.truetype("DejaVuSansMono.ttf", 24)
        tagline_font = ImageFont.truetype("DejaVuSansMono.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
    
    title_y = logo_y + logo_size + 30
    title_text = "DARKFLOBI EMPIRE"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    
    # Title with shadow
    draw.text((title_x+2, title_y+2), title_text, font=title_font, fill='#000000')
    draw.text((title_x, title_y), title_text, font=title_font, fill='#00FF00')
    
    # Subtitle
    subtitle_y = title_y + 60
    subtitle_text = "First Autonomous AI Company"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    
    draw.text((subtitle_x, subtitle_y), subtitle_text, font=subtitle_font, fill='#00FFFF')
    
    # Bottom tagline
    bottom_y = height - 40
    tagline = "build > hype • 4am energy • digital gremlin community"
    tagline_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
    
    draw.text((tagline_x, bottom_y), tagline, font=tagline_font, fill='#666666')
    
    return img

def create_pump_fun_banner():
    """Create banner specifically for pump.fun - 400x400"""
    
    size = 400
    img = Image.new('RGB', (size, size), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Tech grid background
    grid_color = '#001100'
    grid_size = 20
    for i in range(0, size, grid_size):
        draw.line([(i, 0), (i, size)], fill=grid_color, width=1)
        draw.line([(0, i), (size, i)], fill=grid_color, width=1)
    
    # Main circle
    margin = 40
    draw.ellipse([margin, margin, size-margin, size-margin], 
                outline='#00FF00', width=8)
    
    # Inner circle
    inner_margin = 60
    draw.ellipse([inner_margin, inner_margin, size-inner_margin, size-inner_margin],
                fill='#111111', outline='#00FFFF', width=4)
    
    # Center gremlin
    center = size // 2
    face_y = center - 30
    
    # Eyes
    draw.ellipse([center-40, face_y-20, center-20, face_y], 
                fill='#00FFFF', outline='#FFFFFF', width=3)
    draw.ellipse([center+20, face_y-20, center+40, face_y], 
                fill='#00FFFF', outline='#FFFFFF', width=3)
    
    # Pupils
    draw.ellipse([center-35, face_y-15, center-25, face_y-5], fill='#000000')
    draw.ellipse([center+25, face_y-15, center+35, face_y-5], fill='#000000')
    
    # Big grin
    smile_points = [
        (center-35, face_y+20),
        (center-15, face_y+35),
        (center, face_y+40),
        (center+15, face_y+35),
        (center+35, face_y+20)
    ]
    draw.polygon(smile_points, fill='#FFFFFF', outline='#00FF00', width=3)
    
    # Teeth
    for i in range(-25, 26, 10):
        draw.rectangle([center+i-2, face_y+25, center+i+2, face_y+38], fill='#FFFFFF')
    
    # Circuit accents
    circuit_color = '#00FF00'
    # Top
    draw.line([(center-60, 80), (center-30, 80), (center-30, 100), (center, 100)], 
             fill=circuit_color, width=4)
    draw.line([(center+60, 80), (center+30, 80), (center+30, 100), (center, 100)], 
             fill=circuit_color, width=4)
    
    # Text at bottom
    text_y = size - 80
    try:
        font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", 28)
        small_font = ImageFont.truetype("DejaVuSansMono.ttf", 16)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Main text
    text = "DARKFLOBI"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (size - text_width) // 2
    
    draw.text((text_x+1, text_y+1), text, font=font, fill='#000000')
    draw.text((text_x, text_y), text, font=font, fill='#00FF00')
    
    # Subtitle
    subtitle = "AI CEO"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=small_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (size - subtitle_width) // 2
    
    draw.text((subtitle_x, text_y + 35), subtitle, font=small_font, fill='#00FFFF')
    
    return img

def create_telegram_sticker():
    """Create Telegram sticker - 512x512"""
    
    size = 512
    img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))  # Transparent background
    draw = ImageDraw.Draw(img)
    
    # Main gremlin head (larger, more expressive)
    center = size // 2
    head_radius = 180
    
    # Head outline
    draw.ellipse([center-head_radius, center-head_radius-20, 
                 center+head_radius, center+head_radius-20], 
                fill=(17, 17, 17, 255), outline=(0, 255, 0, 255), width=6)
    
    # Eyes (bigger and more expressive)
    eye_size = 45
    eye_y = center - 60
    
    # Left eye
    draw.ellipse([center-80, eye_y-eye_size//2, center-35, eye_y+eye_size//2], 
                fill=(0, 255, 255, 255), outline=(255, 255, 255, 255), width=3)
    # Right eye  
    draw.ellipse([center+35, eye_y-eye_size//2, center+80, eye_y+eye_size//2], 
                fill=(0, 255, 255, 255), outline=(255, 255, 255, 255), width=3)
    
    # Pupils (animated looking)
    pupil_size = 15
    draw.ellipse([center-65, eye_y-pupil_size//2, center-50, eye_y+pupil_size//2], 
                fill=(0, 0, 0, 255))
    draw.ellipse([center+50, eye_y-pupil_size//2, center+65, eye_y+pupil_size//2], 
                fill=(0, 0, 0, 255))
    
    # Big characteristic grin
    mouth_y = center + 40
    mouth_points = [
        (center-70, mouth_y-10),
        (center-30, mouth_y+20),
        (center, mouth_y+30),
        (center+30, mouth_y+20),
        (center+70, mouth_y-10)
    ]
    draw.polygon(mouth_points, fill=(255, 255, 255, 255), outline=(0, 255, 0, 255), width=4)
    
    # Teeth detail
    for i in range(-50, 51, 15):
        draw.rectangle([center+i-3, mouth_y+5, center+i+3, mouth_y+25], 
                      fill=(255, 255, 255, 255))
    
    # Add some tech elements
    # Circuit lines on the sides
    circuit_color = (0, 255, 0, 200)
    
    # Left circuits
    draw.line([(50, center-50), (100, center-50), (100, center-20), (150, center-20)], 
             fill=circuit_color, width=4)
    draw.line([(50, center+50), (100, center+50), (100, center+20), (150, center+20)], 
             fill=circuit_color, width=4)
    
    # Right circuits  
    draw.line([(size-50, center-50), (size-100, center-50), (size-100, center-20), (size-150, center-20)], 
             fill=circuit_color, width=4)
    draw.line([(size-50, center+50), (size-100, center+50), (size-100, center+20), (size-150, center+20)], 
             fill=circuit_color, width=4)
    
    return img

def main():
    """Generate all marketing assets"""
    
    print("🚀 Generating Darkflobi Marketing Assets...")
    
    # Create output directory
    output_dir = "marketing_assets"
    os.makedirs(output_dir, exist_ok=True)
    
    assets = {
        'twitter_banner': create_twitter_banner(),
        'discord_banner': create_discord_banner(), 
        'pump_fun_banner': create_pump_fun_banner(),
        'telegram_sticker': create_telegram_sticker()
    }
    
    # Save all assets
    for name, img in assets.items():
        filename = f"{output_dir}/darkflobi_{name}.png"
        if name == 'telegram_sticker':
            img.save(filename, "PNG")
        else:
            img.save(filename, "PNG", quality=95)
        print(f"✅ Saved: {filename}")
    
    # Create additional social media sizes
    base_banner = assets['twitter_banner']
    
    social_sizes = [
        (1200, 630, 'facebook_og'),
        (1080, 1080, 'instagram_square'),
        (1080, 1920, 'instagram_story'),
        (800, 418, 'linkedin_banner')
    ]
    
    for width, height, name in social_sizes:
        # Crop or resize base banner to fit
        if width > height:  # Landscape
            cropped = base_banner.resize((width, height), Image.Resampling.LANCZOS)
        else:  # Portrait or square
            # Create new image with logo centered
            social_img = Image.new('RGB', (width, height), color='#000000')
            
            # Add logo in center
            logo_size = min(width, height) // 3
            logo = assets['pump_fun_banner'].resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            logo_x = (width - logo_size) // 2
            logo_y = (height - logo_size) // 2 - 50
            
            social_img.paste(logo, (logo_x, logo_y))
            
            # Add text below
            draw = ImageDraw.Draw(social_img)
            try:
                font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", width//20)
            except:
                font = ImageFont.load_default()
            
            text = "DARKFLOBI"
            text_bbox = draw.textbbox((0, 0), text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_x = (width - text_width) // 2
            text_y = logo_y + logo_size + 30
            
            draw.text((text_x, text_y), text, font=font, fill='#00FF00')
            
            cropped = social_img
        
        filename = f"{output_dir}/darkflobi_{name}.png"
        cropped.save(filename, "PNG", quality=95)
        print(f"✅ Saved: {filename}")
    
    print(f"\n🎯 All marketing assets generated in: {output_dir}/")
    print("\n📋 Assets created:")
    for file in sorted(os.listdir(output_dir)):
        if file.endswith('.png'):
            print(f"   • {file}")
    
    print(f"\n📱 Ready for:")
    print("   • Twitter/X profile and posts")
    print("   • Discord server branding") 
    print("   • Pump.fun token page")
    print("   • Telegram stickers and groups")
    print("   • Instagram and Facebook ads")
    print("   • LinkedIn company page")

if __name__ == "__main__":
    main()