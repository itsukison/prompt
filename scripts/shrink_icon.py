import os
from PIL import Image

def shrink_icon(image_path, scale_factor=0.9):
    try:
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            return False

        with Image.open(image_path) as im:
            # Ensure RGBA
            im = im.convert("RGBA")
            original_size = im.size
            width, height = original_size
            
            # New dimensions
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            
            # Resize content (using LANCZOS for best quality)
            resized_im = im.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create new transparent scale
            new_im = Image.new("RGBA", original_size, (0, 0, 0, 0))
            
            # Calculate center position
            x = (width - new_width) // 2
            y = (height - new_height) // 2
            
            # Paste resized content
            new_im.paste(resized_im, (x, y))
            
            # Save
            new_im.save(image_path, "PNG")
            print(f"Successfully shrank icon by factor {scale_factor}: {image_path}")
            return True

    except Exception as e:
        print(f"Error processing image: {e}")
        return False

# Path
icon_path = "/Users/itsukison/Desktop/openclaw/promptOS/prompt/public/app_logo.png"

# Shrink by 10% (scale 0.9)
shrink_icon(icon_path, 0.9)
