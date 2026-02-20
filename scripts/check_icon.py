from PIL import Image

def check_bounds(image_path):
    try:
        with Image.open(image_path) as im:
            bbox = im.getbbox()
            width, height = im.size
            if bbox:
                print(f"Image Size: {width}x{height}")
                print(f"Content BBox: {bbox}")
                
                # Calculate padding
                left, top, right, bottom = bbox
                h_padding = (left + (width - right)) / width * 100
                v_padding = (top + (height - bottom)) / height * 100
                print(f"Horizontal Padding: {h_padding:.2f}%")
                print(f"Vertical Padding: {v_padding:.2f}%")
            else:
                print("Image is empty")
    except Exception as e:
        print(f"Error: {e}")

check_bounds("/Users/itsukison/Desktop/openclaw/promptOS/prompt/public/app_logo.png")
