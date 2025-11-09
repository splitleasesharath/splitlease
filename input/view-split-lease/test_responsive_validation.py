"""
Responsive Design Validation Script
Validates 1280x720 fixes (Cycle 6) and tests mobile resolution 1080x2160 (Cycle 8)
"""

from playwright.sync_api import sync_playwright
import time
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def ensure_screenshots_dir():
    """Ensure screenshots directory exists"""
    os.makedirs('screenshots', exist_ok=True)

def test_1280x720_validation(page):
    """CYCLE 6: Validate 1280x720 fixes"""
    print("\n=== CYCLE 6: Validating 1280x720 Fixes ===")

    # Resize to 1280x720
    page.set_viewport_size({"width": 1280, "height": 720})
    print("Resized browser to 1280x720")

    # Navigate to local
    page.goto("http://localhost:8000/index.html")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    print("Navigated to localhost:8000")

    # Capture viewport screenshot
    page.screenshot(path="screenshots/cycle6_local_1280x720_after_fix_viewport.png")
    print("✓ Captured viewport screenshot")

    # Capture full page screenshot
    page.screenshot(path="screenshots/cycle6_local_1280x720_after_fix_full.png", full_page=True)
    print("✓ Captured full page screenshot")

    # Check for overflow issues
    overflow_check = page.evaluate("""() => {
        const body = document.body;
        const html = document.documentElement;

        const hasHorizontalOverflow = body.scrollWidth > window.innerWidth ||
                                      html.scrollWidth > window.innerWidth;

        // Check specific containers
        const containers = document.querySelectorAll('.container, .booking-card, .gallery-grid, .amenities-grid');
        const overflowingElements = [];

        containers.forEach(el => {
            if (el.scrollWidth > el.clientWidth) {
                overflowingElements.push({
                    class: el.className,
                    scrollWidth: el.scrollWidth,
                    clientWidth: el.clientWidth
                });
            }
        });

        return {
            hasHorizontalOverflow,
            bodyScrollWidth: body.scrollWidth,
            windowInnerWidth: window.innerWidth,
            overflowingElements
        };
    }""")

    print("\n--- Overflow Check Results ---")
    print(f"Has Horizontal Overflow: {overflow_check['hasHorizontalOverflow']}")
    print(f"Body Scroll Width: {overflow_check['bodyScrollWidth']}px")
    print(f"Window Inner Width: {overflow_check['windowInnerWidth']}px")

    if overflow_check['overflowingElements']:
        print("\nOverflowing Elements Found:")
        for elem in overflow_check['overflowingElements']:
            print(f"  - {elem['class']}: {elem['scrollWidth']}px (container: {elem['clientWidth']}px)")
    else:
        print("✓ No overflowing elements detected")

    # Check responsive adjustments
    responsive_check = page.evaluate("""() => {
        const amenitiesGrid = document.querySelector('.amenities-grid');
        const galleryGrid = document.querySelector('.gallery-grid');
        const bookingCard = document.querySelector('.booking-card');

        const getComputedStyle = (el) => {
            const style = window.getComputedStyle(el);
            return {
                gridTemplateColumns: style.gridTemplateColumns,
                width: el.offsetWidth + 'px',
                padding: style.padding
            };
        };

        return {
            amenitiesGrid: amenitiesGrid ? getComputedStyle(amenitiesGrid) : null,
            galleryGrid: galleryGrid ? getComputedStyle(galleryGrid) : null,
            bookingCard: bookingCard ? {
                width: bookingCard.offsetWidth + 'px',
                position: window.getComputedStyle(bookingCard).position
            } : null,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }""")

    print("\n--- Responsive Adjustments Check ---")
    print(f"Viewport: {responsive_check['viewport']['width']}x{responsive_check['viewport']['height']}")
    if responsive_check['amenitiesGrid']:
        print(f"Amenities Grid Columns: {responsive_check['amenitiesGrid']['gridTemplateColumns']}")
    if responsive_check['galleryGrid']:
        print(f"Gallery Grid Columns: {responsive_check['galleryGrid']['gridTemplateColumns']}")
    if responsive_check['bookingCard']:
        print(f"Booking Card Width: {responsive_check['bookingCard']['width']}")

    return overflow_check['hasHorizontalOverflow'] == False

def test_mobile_1080x2160(page):
    """CYCLE 8: Test mobile resolution 1080x2160"""
    print("\n\n=== CYCLE 8: Mobile Testing (1080x2160) ===")

    # Resize to mobile (portrait high-res)
    page.set_viewport_size({"width": 1080, "height": 2160})
    print("Resized browser to 1080x2160 (portrait mobile)")

    # Test LOCAL
    print("\n--- Testing Local ---")
    page.goto("http://localhost:8000/index.html")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    print("Navigated to localhost:8000")

    # Capture local screenshots
    page.screenshot(path="screenshots/cycle8_local_mobile_1080x2160_viewport.png")
    print("✓ Captured local viewport screenshot")

    page.screenshot(path="screenshots/cycle8_local_mobile_1080x2160_full.png", full_page=True)
    print("✓ Captured local full page screenshot")

    # Analyze local mobile issues
    local_analysis = analyze_mobile_issues(page, "LOCAL")

    # Test PRODUCTION
    print("\n--- Testing Production ---")
    page.goto("https://splitlease-listings.vercel.app/12345")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    print("Navigated to production")

    # Capture production screenshots
    page.screenshot(path="screenshots/cycle8_production_mobile_1080x2160_viewport.png")
    print("✓ Captured production viewport screenshot")

    page.screenshot(path="screenshots/cycle8_production_mobile_1080x2160_full.png", full_page=True)
    print("✓ Captured production full page screenshot")

    # Analyze production mobile issues
    prod_analysis = analyze_mobile_issues(page, "PRODUCTION")

    return local_analysis, prod_analysis

def analyze_mobile_issues(page, environment):
    """Comprehensive mobile analysis"""
    print(f"\n--- Analyzing Mobile Issues ({environment}) ---")

    analysis = page.evaluate("""() => {
        const results = {
            touchTargets: [],
            textReadability: [],
            images: [],
            layout: {},
            overflow: {},
            grids: {}
        };

        // 1. Touch Target Sizes (minimum 44x44px)
        const interactiveElements = document.querySelectorAll('button, a, input, .amenity-item');
        interactiveElements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            const isTouchFriendly = rect.width >= 44 && rect.height >= 44;
            if (!isTouchFriendly && rect.width > 0) {
                results.touchTargets.push({
                    element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    isTouchFriendly
                });
            }
        });

        // 2. Text Readability
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, span, a, button');
        textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize);
            if (fontSize < 14 && el.textContent.trim().length > 0) {
                results.textReadability.push({
                    element: el.tagName,
                    fontSize: fontSize + 'px',
                    text: el.textContent.substring(0, 30)
                });
            }
        });

        // 3. Image Scaling
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            results.images.push({
                src: img.src.substring(img.src.lastIndexOf('/') + 1, img.src.lastIndexOf('/') + 20),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                aspectRatio: (rect.width / rect.height).toFixed(2)
            });
        });

        // 4. Booking Card Layout
        const bookingCard = document.querySelector('.booking-card');
        if (bookingCard) {
            const style = window.getComputedStyle(bookingCard);
            results.layout.bookingCard = {
                position: style.position,
                width: bookingCard.offsetWidth + 'px',
                top: style.top,
                right: style.right
            };
        }

        // 5. Navigation/Header
        const nav = document.querySelector('.navbar, nav, header');
        if (nav) {
            const style = window.getComputedStyle(nav);
            results.layout.navigation = {
                display: style.display,
                height: nav.offsetHeight + 'px',
                hasHamburger: !!nav.querySelector('.hamburger, .menu-toggle')
            };
        }

        // 6. Footer Layout
        const footer = document.querySelector('footer');
        if (footer) {
            const style = window.getComputedStyle(footer);
            results.layout.footer = {
                display: style.display,
                flexDirection: style.flexDirection,
                height: footer.offsetHeight + 'px'
            };
        }

        // 7. Overflow Check
        const body = document.body;
        const html = document.documentElement;
        results.overflow = {
            hasHorizontalOverflow: body.scrollWidth > window.innerWidth,
            bodyScrollWidth: body.scrollWidth,
            windowWidth: window.innerWidth,
            difference: body.scrollWidth - window.innerWidth
        };

        // 8. Gallery Grid
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid) {
            const style = window.getComputedStyle(galleryGrid);
            results.grids.gallery = {
                gridTemplateColumns: style.gridTemplateColumns,
                gap: style.gap,
                width: galleryGrid.offsetWidth + 'px'
            };
        }

        // 9. Amenities Grid (should be 2 columns on mobile)
        const amenitiesGrid = document.querySelector('.amenities-grid');
        if (amenitiesGrid) {
            const style = window.getComputedStyle(amenitiesGrid);
            const columnCount = style.gridTemplateColumns.split(' ').length;
            results.grids.amenities = {
                gridTemplateColumns: style.gridTemplateColumns,
                columnCount: columnCount,
                gap: style.gap,
                width: amenitiesGrid.offsetWidth + 'px',
                isCorrect: columnCount === 2
            };
        }

        // 10. Form Inputs
        const inputs = document.querySelectorAll('input, select, textarea');
        results.layout.formInputs = [];
        inputs.forEach(input => {
            const rect = input.getBoundingClientRect();
            if (rect.height > 0) {
                results.layout.formInputs.push({
                    type: input.type || input.tagName,
                    height: Math.round(rect.height),
                    width: Math.round(rect.width)
                });
            }
        });

        return results;
    }""")

    # Print Analysis Results
    print("\n📱 TOUCH TARGETS:")
    if analysis['touchTargets']:
        print(f"  ⚠️ {len(analysis['touchTargets'])} elements below 44x44px:")
        for target in analysis['touchTargets'][:5]:  # Show first 5
            print(f"    - {target['element']}: {target['width']}x{target['height']}px")
    else:
        print("  ✓ All interactive elements are touch-friendly (≥44x44px)")

    print("\n📝 TEXT READABILITY:")
    if analysis['textReadability']:
        print(f"  ⚠️ {len(analysis['textReadability'])} text elements below 14px:")
        for text in analysis['textReadability'][:3]:
            print(f"    - {text['element']}: {text['fontSize']}")
    else:
        print("  ✓ All text is readable (≥14px)")

    print("\n🖼️  IMAGES:")
    print(f"  Found {len(analysis['images'])} images")
    for img in analysis['images'][:3]:
        print(f"    - {img['src']}: {img['width']}x{img['height']}px (ratio: {img['aspectRatio']})")

    print("\n📊 LAYOUT:")
    if 'bookingCard' in analysis['layout']:
        print(f"  Booking Card: {analysis['layout']['bookingCard']['position']}, width: {analysis['layout']['bookingCard']['width']}")
    if 'navigation' in analysis['layout']:
        print(f"  Navigation: {analysis['layout']['navigation']['display']}, height: {analysis['layout']['navigation']['height']}")
        print(f"  Has Hamburger Menu: {analysis['layout']['navigation']['hasHamburger']}")
    if 'footer' in analysis['layout']:
        print(f"  Footer: {analysis['layout']['footer']['flexDirection']}, height: {analysis['layout']['footer']['height']}")

    print("\n↔️  OVERFLOW:")
    if analysis['overflow']['hasHorizontalOverflow']:
        print(f"  ⚠️ Horizontal overflow detected!")
        print(f"  Body: {analysis['overflow']['bodyScrollWidth']}px, Window: {analysis['overflow']['windowWidth']}px")
        print(f"  Overflow: +{analysis['overflow']['difference']}px")
    else:
        print("  ✓ No horizontal overflow")

    print("\n🎨 GRIDS:")
    if 'gallery' in analysis['grids']:
        print(f"  Gallery: {analysis['grids']['gallery']['gridTemplateColumns']}")
    if 'amenities' in analysis['grids']:
        is_correct = "✓" if analysis['grids']['amenities']['isCorrect'] else "⚠️"
        print(f"  {is_correct} Amenities: {analysis['grids']['amenities']['columnCount']} columns")
        print(f"     Columns: {analysis['grids']['amenities']['gridTemplateColumns']}")

    print("\n📋 FORM INPUTS:")
    if analysis['layout']['formInputs']:
        for input_elem in analysis['layout']['formInputs'][:3]:
            print(f"  {input_elem['type']}: {input_elem['width']}x{input_elem['height']}px")

    return analysis

def generate_mobile_report(local_analysis, prod_analysis):
    """Generate comprehensive mobile report"""
    print("\n\n" + "="*80)
    print("📱 COMPREHENSIVE MOBILE REPORT (1080x2160)")
    print("="*80)

    # Mobile-specific CSS fixes needed
    print("\n🔧 MOBILE-SPECIFIC CSS FIXES NEEDED:\n")

    fixes = []

    # Check touch targets
    if local_analysis['touchTargets']:
        fixes.append("""
1. TOUCH TARGET SIZES:
   Problem: {count} interactive elements below 44x44px minimum
   Fix: Add to CSS:
   ```css
   @media (max-width: 1080px) {{
       button, a.btn, .amenity-item {{
           min-width: 44px;
           min-height: 44px;
           padding: 12px 16px;
       }}
   }}
   ```
""".format(count=len(local_analysis['touchTargets'])))

    # Check text readability
    if local_analysis['textReadability']:
        fixes.append("""
2. TEXT READABILITY:
   Problem: {count} text elements below 14px
   Fix: Increase base font size for mobile:
   ```css
   @media (max-width: 1080px) {{
       body {{
           font-size: 16px;
       }}
       p {{
           font-size: 14px;
           line-height: 1.6;
       }}
   }}
   ```
""".format(count=len(local_analysis['textReadability'])))

    # Check amenities grid
    if 'amenities' in local_analysis['grids'] and not local_analysis['grids']['amenities']['isCorrect']:
        fixes.append("""
3. AMENITIES GRID:
   Problem: Should be 2 columns on mobile, currently {cols} columns
   Fix: Add media query:
   ```css
   @media (max-width: 1080px) {{
       .amenities-grid {{
           grid-template-columns: repeat(2, 1fr);
           gap: 12px;
       }}
   }}
   ```
""".format(cols=local_analysis['grids']['amenities']['columnCount']))

    # Check overflow
    if local_analysis['overflow']['hasHorizontalOverflow']:
        fixes.append("""
4. HORIZONTAL OVERFLOW:
   Problem: Content overflowing by {diff}px
   Fix: Add container constraints:
   ```css
   @media (max-width: 1080px) {{
       .container {{
           max-width: 100%;
           padding: 0 16px;
           overflow-x: hidden;
       }}
       * {{
           max-width: 100%;
       }}
   }}
   ```
""".format(diff=local_analysis['overflow']['difference']))

    # Check booking card
    if 'bookingCard' in local_analysis['layout'] and local_analysis['layout']['bookingCard']['position'] == 'sticky':
        fixes.append("""
5. BOOKING CARD MOBILE LAYOUT:
   Problem: Sticky positioning may not work well on mobile
   Fix: Make it static or bottom-fixed:
   ```css
   @media (max-width: 1080px) {{
       .booking-card {{
           position: static;
           margin-top: 24px;
           width: 100%;
           max-width: 100%;
       }}
       /* OR make it bottom-fixed */
       .booking-card {{
           position: fixed;
           bottom: 0;
           left: 0;
           right: 0;
           z-index: 100;
       }}
   }}
   ```
""")

    if fixes:
        for fix in fixes:
            print(fix)
    else:
        print("✓ No critical mobile CSS fixes needed!")

    # Touch interaction considerations
    print("\n\n👆 TOUCH INTERACTION CONSIDERATIONS:\n")
    print("1. Ensure adequate spacing between clickable elements (min 8px)")
    print("2. Use hover alternatives for mobile (tap states)")
    print("3. Consider swipe gestures for image gallery")
    print("4. Add touch feedback (active states) for buttons")
    print("5. Ensure form inputs have proper zoom behavior")
    print("""
   ```css
   @media (max-width: 1080px) {{
       /* Prevent zoom on input focus */
       input, select, textarea {{
           font-size: 16px;
       }}

       /* Touch feedback */
       button:active, .btn:active {{
           transform: scale(0.98);
           opacity: 0.8;
       }}
   }}
   ```
""")

    # Performance observations
    print("\n\n⚡ PERFORMANCE OBSERVATIONS:\n")
    print(f"Local Images: {len(local_analysis['images'])} images loaded")
    print(f"Production Images: {len(prod_analysis['images'])} images loaded")
    print("\nRecommendations:")
    print("1. Optimize images for mobile (use srcset for responsive images)")
    print("2. Consider lazy loading for below-fold images")
    print("3. Use WebP format for better compression")
    print("4. Implement progressive image loading")

    # Comparison
    print("\n\n🔄 LOCAL vs PRODUCTION COMPARISON:\n")

    print("Touch Targets:")
    print(f"  Local: {len(local_analysis['touchTargets'])} issues")
    print(f"  Production: {len(prod_analysis['touchTargets'])} issues")

    print("\nText Readability:")
    print(f"  Local: {len(local_analysis['textReadability'])} small text elements")
    print(f"  Production: {len(prod_analysis['textReadability'])} small text elements")

    print("\nOverflow:")
    print(f"  Local: {'⚠️ Yes' if local_analysis['overflow']['hasHorizontalOverflow'] else '✓ No'}")
    print(f"  Production: {'⚠️ Yes' if prod_analysis['overflow']['hasHorizontalOverflow'] else '✓ No'}")

    if 'amenities' in local_analysis['grids'] and 'amenities' in prod_analysis['grids']:
        print("\nAmenities Grid:")
        print(f"  Local: {local_analysis['grids']['amenities']['columnCount']} columns")
        print(f"  Production: {prod_analysis['grids']['amenities']['columnCount']} columns")

    print("\n" + "="*80)

def main():
    """Main execution"""
    print("="*80)
    print("RESPONSIVE DESIGN VALIDATION")
    print("Cycle 6: 1280x720 Validation | Cycle 8: Mobile 1080x2160 Testing")
    print("="*80)

    ensure_screenshots_dir()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            # PART 1: Cycle 6 - Validate 1280x720
            cycle6_passed = test_1280x720_validation(page)

            if cycle6_passed:
                print("\n✅ CYCLE 6: 1280x720 fixes validated successfully!")
            else:
                print("\n⚠️ CYCLE 6: Some issues remain at 1280x720")

            # PART 2: Cycle 8 - Mobile Testing
            local_analysis, prod_analysis = test_mobile_1080x2160(page)

            # Generate comprehensive report
            generate_mobile_report(local_analysis, prod_analysis)

            print("\n\n✅ ALL TESTING COMPLETE!")
            print(f"\n📸 Screenshots saved in: C:\\Users\\Split Lease\\splitleaseteam\\!Agent Context and Tools\\SL18\\view-split-lease-1\\screenshots\\")

        except Exception as e:
            print(f"\n❌ Error during testing: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
