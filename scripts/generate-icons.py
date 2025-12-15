#!/usr/bin/env python3
"""
Generate app icons with proper format for all platforms.
Creates icons with a gradient background and rounded corners where needed.
"""

import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Installing Pillow...")
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image, ImageDraw, ImageFilter

def create_gradient_background(size, color1=(255, 200, 100), color2=(255, 160, 50)):
    """Create a gradient background from top-left to bottom-right."""
    img = Image.new('RGBA', (size, size))
    pixels = img.load()

    for y in range(size):
        for x in range(size):
            # Diagonal gradient
            ratio = (x + y) / (2 * size)
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            pixels[x, y] = (r, g, b, 255)

    return img

def add_rounded_corners(img, radius):
    """Add rounded corners to an image."""
    size = img.size[0]
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)

    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result

def composite_logo_on_background(logo_path, size, corner_radius=None):
    """
    Create an app icon by compositing the logo on a gradient background.
    The logo is placed on the background without modifying its internal design.
    """
    # Create gradient background - warm cream/orange tones to match Provia brand
    background = create_gradient_background(size, (255, 248, 240), (255, 215, 150))

    # Load and resize the logo
    try:
        logo = Image.open(logo_path).convert('RGBA')
    except Exception as e:
        print(f"Error loading logo: {e}")
        return background

    # Calculate logo size (85% of icon size - larger to fill more space)
    logo_size = int(size * 0.85)
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Calculate position to center the logo
    offset = (size - logo_size) // 2

    # Composite logo onto background (the logo's white background blends with the gradient)
    background.paste(logo, (offset, offset), logo)

    # Add rounded corners if specified
    if corner_radius:
        background = add_rounded_corners(background, corner_radius)

    return background

def generate_all_icons(source_logo_path, output_dir):
    """Generate all required icon sizes for Tauri/macOS/Windows/Android."""

    os.makedirs(output_dir, exist_ok=True)

    # Icon specifications: (filename, size, corner_radius or None for square)
    # macOS applies its own rounded corners, so we provide square icons
    # Windows uses .ico format which is generated separately
    # Android needs rounded corners applied

    icons = [
        # Standard sizes
        ('32x32.png', 32, None),
        ('64x64.png', 64, None),
        ('128x128.png', 128, None),
        ('128x128@2x.png', 256, None),
        ('icon.png', 512, None),  # Main icon

        # Windows Store logos (square)
        ('Square30x30Logo.png', 30, None),
        ('Square44x44Logo.png', 44, None),
        ('Square71x71Logo.png', 71, None),
        ('Square89x89Logo.png', 89, None),
        ('Square107x107Logo.png', 107, None),
        ('Square142x142Logo.png', 142, None),
        ('Square150x150Logo.png', 150, None),
        ('Square284x284Logo.png', 284, None),
        ('Square310x310Logo.png', 310, None),
        ('StoreLogo.png', 50, None),
    ]

    for filename, size, radius in icons:
        print(f"Generating {filename} ({size}x{size})...")
        icon = composite_logo_on_background(source_logo_path, size, radius)
        icon.save(os.path.join(output_dir, filename), 'PNG')

    # Generate .ico for Windows (multiple sizes in one file)
    print("Generating icon.ico...")
    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    ico_images = []
    for size in ico_sizes:
        ico_img = composite_logo_on_background(source_logo_path, size)
        ico_images.append(ico_img)

    # Save as ICO
    ico_images[0].save(
        os.path.join(output_dir, 'icon.ico'),
        format='ICO',
        sizes=[(s, s) for s in ico_sizes],
        append_images=ico_images[1:]
    )

    # Generate .icns for macOS (requires specific sizes)
    # macOS icns needs: 16, 32, 64, 128, 256, 512, 1024
    print("Generating icon.icns (macOS)...")
    icns_sizes = [16, 32, 64, 128, 256, 512, 1024]

    # For icns, we'll create individual PNGs that can be combined
    # The actual icns generation requires iconutil on macOS
    icns_dir = os.path.join(output_dir, 'icon.iconset')
    os.makedirs(icns_dir, exist_ok=True)

    icns_mappings = [
        ('icon_16x16.png', 16),
        ('icon_16x16@2x.png', 32),
        ('icon_32x32.png', 32),
        ('icon_32x32@2x.png', 64),
        ('icon_128x128.png', 128),
        ('icon_128x128@2x.png', 256),
        ('icon_256x256.png', 256),
        ('icon_256x256@2x.png', 512),
        ('icon_512x512.png', 512),
        ('icon_512x512@2x.png', 1024),
    ]

    for filename, size in icns_mappings:
        icon = composite_logo_on_background(source_logo_path, size)
        icon.save(os.path.join(icns_dir, filename), 'PNG')

    # Try to generate icns if on macOS
    icns_path = os.path.join(output_dir, 'icon.icns')
    if sys.platform == 'darwin':
        os.system(f'iconutil -c icns "{icns_dir}" -o "{icns_path}"')
    else:
        # On non-macOS, just copy the largest PNG as a placeholder
        # The CI/CD on macOS will regenerate the proper icns
        print("Note: On non-macOS system, icns generation skipped. Use iconutil on macOS.")
        # Create a simple icns-like file (copy the 512x512)
        icon_512 = composite_logo_on_background(source_logo_path, 512)
        icon_512.save(icns_path, 'PNG')

    print(f"\nAll icons generated in {output_dir}")
    print("Remember to run 'iconutil -c icns icon.iconset' on macOS for proper .icns")

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    # Source logo (the current icon.png)
    source_logo = os.path.join(project_root, 'src-tauri', 'icons', 'icon.png')

    # Output directory
    output_dir = os.path.join(project_root, 'src-tauri', 'icons')

    if not os.path.exists(source_logo):
        print(f"Error: Source logo not found at {source_logo}")
        sys.exit(1)

    generate_all_icons(source_logo, output_dir)
