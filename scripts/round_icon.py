import os
from PIL import Image, ImageDraw

def round_image(image_path, output_path, radius_percent=0.22):
    try:
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            return False

        with Image.open(image_path) as im:
            # Create a mask
            mask = Image.new('L', im.size, 0)
            draw = ImageDraw.Draw(mask)
            
            # Standard macOS app icon corner radius is roughly 22% of the total width
            w, h = im.size
            radius = min(w, h) * radius_percent
            
            # Draw rounded rectangle on mask
            draw.rounded_rectangle([(0, 0), (w, h)], radius=radius, fill=255)
            
            # Apply mask to image
            # Ensure image has alpha channel
            if im.mode != 'RGBA':
                im = im.convert('RGBA')
            
            output = Image.new('RGBA', im.size, (0, 0, 0, 0))
            output.paste(im, (0, 0), mask=mask)
            
            # Save
            output.save(output_path, "PNG")
            print(f"Successfully rounded {image_path} -> {output_path}")
            return True

    except Exception as e:
        print(f"Error processing image: {e}")
        return False

# Paths
icon_path = "/Users/itsukison/Desktop/openclaw/promptOS/prompt/public/app_logo.png"

# Round the icon in place (or backup first if you prefer, but here we overwrite for simplicity as requested 'fix it')
# Actually, let's keep a backup just in case.
backup_path = "/Users/itsukison/Desktop/openclaw/promptOS/prompt/public/app_logo_bak.png"

if os.path.exists(icon_path):
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(icon_path, backup_path)
    
    round_image(icon_path, icon_path)
else:
    print("Icon file not found.")
