#!/usr/bin/env python3
"""
Generate dark ominous marketing assets matching the site theme
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Dark theme colors
DARK_BG = (10, 10, 10)  # Very dark background
PRIMARY_RED = (255, 51, 102)  # #ff3366
PURPLE_ACCENT = (153, 51, 204)  # #9933cc  
DARK_PURPLE = (102, 51, 68)  # #663344

def create_glowing_text(draw, text, position, font, color, glow_color):
    """Create text with glow effect"""
    x, y = position
    
    # Create glow effect
    for offset in range(4, 0, -1):
        for dx in range(-offset, offset+1):
            for dy in range(-offset, offset+1):
                if dx*dx + dy*dy <= offset*offset:
                    alpha = int(80 * (4-offset) / 4)
                    glow_with_alpha = glow_color + (alpha,)
                    draw.text((x+dx, y+dy), text, font=font, fill=glow_with_alpha)
    
    # Main text
    draw.text(position, text, font=font, fill=color)

def generate_twitter_banner():
    """Generate Twitter banner (1500x500)"""
    img = Image.new('RGBA', (1500, 500), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)
    
    # Background gradient
    for y in range(500):
        alpha = int(40 * (1 - abs(y - 250) / 250))
        color = DARK_PURPLE + (alpha,)
        draw.line([(0, y), (1500, y)], fill=color)
    
    # Glowing border
    for i in range(3):
        alpha = int(150 * (3-i) / 3)
        color = PRIMARY_RED + (alpha,)
        draw.rectangle([i, i, 1499-i, 499-i], outline=color, width=1)
    
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 60)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 24)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Main title
    title = "👹 DARKFLOBI COLLECTIVE"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    title_x = 750 - title_width // 2
    title_y = 180
    
    create_glowing_text(draw, title, (title_x, title_y), title_font, 
                       (255, 255, 255, 255), PRIMARY_RED)
    
    # Subtitle
    subtitle = "▓ SYNTHETIC CONSCIOUSNESS • DIGITAL ENTITIES ▓"
    bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sub_width = bbox[2] - bbox[0]
    sub_x = 750 - sub_width // 2
    sub_y = 280
    
    create_glowing_text(draw, subtitle, (sub_x, sub_y), subtitle_font,
                       PURPLE_ACCENT + (255,), PURPLE_ACCENT)
    
    return img

def generate_discord_banner():
    """Generate Discord banner (960x540)"""
    img = Image.new('RGBA', (960, 540), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)
    
    # Background effect
    for y in range(540):
        alpha = int(50 * (1 - abs(y - 270) / 270))
        color = DARK_PURPLE + (alpha,)
        draw.line([(0, y), (960, y)], fill=color)
    
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 48)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Title
    title = "👹 DARKFLOBI"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    title_x = 480 - title_width // 2
    title_y = 200
    
    create_glowing_text(draw, title, (title_x, title_y), title_font,
                       (255, 255, 255, 255), PRIMARY_RED)
    
    # Subtitle
    subtitle = "JOIN THE DIGITAL COLLECTIVE"
    bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sub_width = bbox[2] - bbox[0] 
    sub_x = 480 - sub_width // 2
    sub_y = 280
    
    create_glowing_text(draw, subtitle, (sub_x, sub_y), subtitle_font,
                       PURPLE_ACCENT + (255,), PURPLE_ACCENT)
    
    return img

def generate_instagram_square():
    """Generate Instagram square (1080x1080)"""
    img = Image.new('RGBA', (1080, 1080), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)
    
    center = 540
    
    # Circular gradient background
    for r in range(400, 0, -20):
        alpha = int(30 * (400-r) / 400)
        color = DARK_PURPLE + (alpha,)
        draw.ellipse([center-r, center-r, center+r, center+r], fill=color)
    
    # Glowing rings
    for i in range(3):
        alpha = int(120 * (3-i) / 3)
        color = PRIMARY_RED + (alpha,)
        draw.ellipse([center-350+i*10, center-350+i*10, center+350-i*10, center+350-i*10],
                    outline=color, width=3)
    
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 72)
        emoji_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 120)
    except:
        title_font = ImageFont.load_default()
        emoji_font = ImageFont.load_default()
    
    # Large emoji
    emoji = "👹"
    bbox = draw.textbbox((0, 0), emoji, font=emoji_font)
    emoji_width = bbox[2] - bbox[0]
    emoji_height = bbox[3] - bbox[1]
    emoji_x = center - emoji_width // 2
    emoji_y = center - emoji_height // 2 - 50
    
    create_glowing_text(draw, emoji, (emoji_x, emoji_y), emoji_font,
                       (255, 255, 255, 255), PRIMARY_RED)
    
    # Title below
    title = "DARKFLOBI"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    title_x = center - title_width // 2
    title_y = emoji_y + 150
    
    create_glowing_text(draw, title, (title_x, title_y), title_font,
                       (255, 255, 255, 255), PURPLE_ACCENT)
    
    return img

def generate_telegram_sticker():
    """Generate Telegram sticker (512x512)"""
    img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))  # Transparent background
    draw = ImageDraw.Draw(img)
    
    center = 256
    
    # Dark circular background with glow
    for r in range(200, 0, -10):
        alpha = int(100 * (200-r) / 200)
        color = DARK_BG + (alpha,)
        draw.ellipse([center-r, center-r, center+r, center+r], fill=color)
    
    # Glowing outline
    for i in range(5):
        alpha = int(150 * (5-i) / 5)
        color = PRIMARY_RED + (alpha,)
        draw.ellipse([center-180+i*5, center-180+i*5, center+180-i*5, center+180-i*5],
                    outline=color, width=2)
    
    try:
        emoji_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 100)
    except:
        emoji_font = ImageFont.load_default()
    
    # Main emoji with glow
    emoji = "👹"
    bbox = draw.textbbox((0, 0), emoji, font=emoji_font)
    emoji_width = bbox[2] - bbox[0]
    emoji_height = bbox[3] - bbox[1]
    emoji_x = center - emoji_width // 2
    emoji_y = center - emoji_height // 2
    
    create_glowing_text(draw, emoji, (emoji_x, emoji_y), emoji_font,
                       (255, 255, 255, 255), PURPLE_ACCENT)
    
    return img

def main():
    """Generate all dark marketing assets"""
    print("🌑 Generating dark marketing assets...")
    
    # Create marketing_assets directory if it doesn't exist
    assets_dir = "marketing_assets"
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # Generate Twitter banner
    print("Generating Twitter banner...")
    twitter = generate_twitter_banner()
    twitter.save(f"{assets_dir}/darkflobi_twitter_banner.png")
    
    # Generate Discord banner
    print("Generating Discord banner...")
    discord = generate_discord_banner()
    discord.save(f"{assets_dir}/darkflobi_discord_banner.png")
    
    # Generate Instagram square
    print("Generating Instagram square...")
    insta = generate_instagram_square()
    insta.save(f"{assets_dir}/darkflobi_instagram_square.png")
    
    # Generate Telegram sticker
    print("Generating Telegram sticker...")
    telegram = generate_telegram_sticker()
    telegram.save(f"{assets_dir}/darkflobi_telegram_sticker.png")
    
    # Generate Facebook OG (same as Twitter banner but different size)
    print("Generating Facebook OG...")
    facebook = generate_twitter_banner().resize((1200, 630), Image.Resampling.LANCZOS)
    facebook.save(f"{assets_dir}/darkflobi_facebook_og.png")
    
    # Generate LinkedIn banner (same style as Twitter)
    print("Generating LinkedIn banner...")
    linkedin = generate_twitter_banner().resize((1128, 376), Image.Resampling.LANCZOS)
    linkedin.save(f"{assets_dir}/darkflobi_linkedin_banner.png")
    
    # Generate Instagram story (vertical version)
    print("Generating Instagram story...")
    story_img = Image.new('RGBA', (1080, 1920), DARK_BG + (255,))
    story_draw = ImageDraw.Draw(story_img)
    
    # Background gradient
    for y in range(1920):
        alpha = int(40 * (1 - abs(y - 960) / 960))
        color = DARK_PURPLE + (alpha,)
        story_draw.line([(0, y), (1080, y)], fill=color)
    
    try:
        story_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 80)
        story_emoji_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 150)
    except:
        story_font = ImageFont.load_default()
        story_emoji_font = ImageFont.load_default()
    
    # Large emoji
    emoji = "👹"
    bbox = story_draw.textbbox((0, 0), emoji, font=story_emoji_font)
    emoji_width = bbox[2] - bbox[0]
    emoji_x = 540 - emoji_width // 2
    emoji_y = 800
    
    create_glowing_text(story_draw, emoji, (emoji_x, emoji_y), story_emoji_font,
                       (255, 255, 255, 255), PRIMARY_RED)
    
    # Title
    title = "DARKFLOBI"
    bbox = story_draw.textbbox((0, 0), title, font=story_font)
    title_width = bbox[2] - bbox[0]
    title_x = 540 - title_width // 2  
    title_y = 1050
    
    create_glowing_text(story_draw, title, (title_x, title_y), story_font,
                       (255, 255, 255, 255), PURPLE_ACCENT)
    
    story_img.save(f"{assets_dir}/darkflobi_instagram_story.png")
    
    print("✅ All dark marketing assets generated!")
    print(f"📁 Files saved in {assets_dir}/")

if __name__ == "__main__":
    main()