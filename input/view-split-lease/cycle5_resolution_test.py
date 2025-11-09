"""
Cycle 5 - Resolution Testing (1280x720)
Split Lease Listing Page Comparison
"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
from pathlib import Path
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
LOCAL_URL = "http://localhost:8000/index.html"
PRODUCTION_URL = "https://app.split.lease/view-split-lease/1586447992720x748691103167545300?area=&arrival=&duration=13%20weeks%20(3%20months)&nights=&guests=&storage=&type=&days-selected=2%2C%203%2C%204%2C%205%2C%206"
VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 720
SCREENSHOTS_DIR = Path("screenshots")

async def analyze_page_at_resolution(page, name):
    """Analyze page at 1280x720 resolution and collect metrics"""

    print(f"\n{'='*60}")
    print(f"Analyzing {name} at {VIEWPORT_WIDTH}x{VIEWPORT_HEIGHT}")
    print(f"{'='*60}")

    analysis = {
        "page_name": name,
        "resolution": f"{VIEWPORT_WIDTH}x{VIEWPORT_HEIGHT}",
        "timestamp": datetime.now().isoformat(),
        "viewport": {"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT}
    }

    # Wait for page to stabilize
    await asyncio.sleep(2)

    # Collect comprehensive metrics
    metrics = await page.evaluate("""
        () => {
            const analysis = {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollHeight: document.documentElement.scrollHeight
                },
                contentWrapper: {},
                bookingCard: {},
                imageGallery: {},
                gridLayouts: [],
                header: {},
                footer: {},
                textElements: {},
                buttons: [],
                spacing: {},
                overflow: [],
                visibility: []
            };

            // Content Wrapper Analysis
            const contentWrapper = document.querySelector('.container, .max-w-7xl, [class*="container"]');
            if (contentWrapper) {
                const styles = window.getComputedStyle(contentWrapper);
                const rect = contentWrapper.getBoundingClientRect();
                analysis.contentWrapper = {
                    element: contentWrapper.className,
                    maxWidth: styles.maxWidth,
                    width: rect.width,
                    padding: styles.padding,
                    margin: styles.margin,
                    isConstrained: rect.width < window.innerWidth,
                    constraintRatio: (rect.width / window.innerWidth * 100).toFixed(2) + '%'
                };
            }

            // Booking Card Analysis
            const bookingCard = document.querySelector('[class*="booking"], [class*="reserve"], .sticky');
            if (bookingCard) {
                const styles = window.getComputedStyle(bookingCard);
                const rect = bookingCard.getBoundingClientRect();
                analysis.bookingCard = {
                    element: bookingCard.className,
                    position: styles.position,
                    top: styles.top,
                    width: rect.width,
                    height: rect.height,
                    isSticky: styles.position === 'sticky' || styles.position === 'fixed',
                    isVisible: rect.top >= 0 && rect.top <= window.innerHeight,
                    overflowY: styles.overflowY
                };
            }

            // Image Gallery Analysis
            const gallery = document.querySelector('[class*="gallery"], [class*="image-grid"]');
            if (gallery) {
                const styles = window.getComputedStyle(gallery);
                const images = gallery.querySelectorAll('img');
                const imageData = Array.from(images).slice(0, 5).map(img => {
                    const rect = img.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        aspectRatio: (rect.width / rect.height).toFixed(2),
                        isVisible: rect.top < window.innerHeight && rect.bottom > 0
                    };
                });

                analysis.imageGallery = {
                    element: gallery.className,
                    display: styles.display,
                    gridTemplateColumns: styles.gridTemplateColumns,
                    gap: styles.gap,
                    imageCount: images.length,
                    images: imageData
                };
            }

            // Grid Layout Analysis
            const grids = document.querySelectorAll('[class*="grid"], [style*="display: grid"]');
            grids.forEach((grid, idx) => {
                const styles = window.getComputedStyle(grid);
                const rect = grid.getBoundingClientRect();
                analysis.gridLayouts.push({
                    index: idx,
                    element: grid.className,
                    gridTemplateColumns: styles.gridTemplateColumns,
                    gridTemplateRows: styles.gridTemplateRows,
                    gap: styles.gap,
                    width: rect.width,
                    columnCount: styles.gridTemplateColumns.split(' ').length
                });
            });

            // Header Analysis
            const header = document.querySelector('header, [class*="header"], nav');
            if (header) {
                const styles = window.getComputedStyle(header);
                const rect = header.getBoundingClientRect();
                const navItems = header.querySelectorAll('a, button');
                analysis.header = {
                    element: header.tagName + '.' + header.className,
                    position: styles.position,
                    width: rect.width,
                    height: rect.height,
                    display: styles.display,
                    flexWrap: styles.flexWrap,
                    navItemCount: navItems.length,
                    isWrapping: rect.height > 100,
                    overflowX: styles.overflowX
                };
            }

            // Footer Analysis
            const footer = document.querySelector('footer, [class*="footer"]');
            if (footer) {
                const styles = window.getComputedStyle(footer);
                const columns = footer.querySelectorAll('[class*="col"], [class*="column"]');
                analysis.footer = {
                    element: footer.className,
                    display: styles.display,
                    gridTemplateColumns: styles.gridTemplateColumns,
                    flexDirection: styles.flexDirection,
                    columnCount: columns.length,
                    gap: styles.gap
                };
            }

            // Text Elements Analysis
            const headings = {
                h1: document.querySelectorAll('h1'),
                h2: document.querySelectorAll('h2'),
                h3: document.querySelectorAll('h3'),
                body: document.querySelectorAll('p, span, div')
            };

            analysis.textElements = {
                h1: Array.from(headings.h1).slice(0, 3).map(el => {
                    const styles = window.getComputedStyle(el);
                    return {
                        text: el.textContent.substring(0, 50),
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        isReadable: parseFloat(styles.fontSize) >= 24
                    };
                }),
                h2: Array.from(headings.h2).slice(0, 3).map(el => {
                    const styles = window.getComputedStyle(el);
                    return {
                        text: el.textContent.substring(0, 50),
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        isReadable: parseFloat(styles.fontSize) >= 20
                    };
                }),
                bodyText: Array.from(headings.body).slice(0, 5).map(el => {
                    const styles = window.getComputedStyle(el);
                    const fontSize = parseFloat(styles.fontSize);
                    return {
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        isReadable: fontSize >= 14 && fontSize <= 18
                    };
                })
            };

            // Button Analysis
            const buttons = document.querySelectorAll('button, [class*="btn"], input[type="submit"]');
            analysis.buttons = Array.from(buttons).slice(0, 10).map(btn => {
                const styles = window.getComputedStyle(btn);
                const rect = btn.getBoundingClientRect();
                return {
                    text: btn.textContent.substring(0, 30),
                    width: rect.width,
                    height: rect.height,
                    fontSize: styles.fontSize,
                    padding: styles.padding,
                    isTappable: rect.height >= 44 && rect.width >= 44,
                    isVisible: rect.top >= 0 && rect.top <= window.innerHeight
                };
            });

            // Spacing Analysis
            const main = document.querySelector('main, [role="main"], .main-content');
            if (main) {
                const styles = window.getComputedStyle(main);
                analysis.spacing = {
                    padding: styles.padding,
                    margin: styles.margin,
                    paddingLeft: styles.paddingLeft,
                    paddingRight: styles.paddingRight
                };
            }

            // Overflow Detection
            const allElements = document.querySelectorAll('*');
            allElements.forEach((el, idx) => {
                const styles = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                if (rect.right > window.innerWidth) {
                    analysis.overflow.push({
                        element: el.tagName + '.' + el.className,
                        overflowAmount: rect.right - window.innerWidth,
                        width: rect.width
                    });
                }
            });

            // Limit overflow results
            analysis.overflow = analysis.overflow.slice(0, 10);

            // Visibility Issues
            const importantElements = document.querySelectorAll('button, a, input, [class*="card"], [class*="item"]');
            importantElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    analysis.visibility.push({
                        element: el.tagName + '.' + el.className,
                        reason: 'Zero dimensions',
                        width: rect.width,
                        height: rect.height
                    });
                }
            });

            analysis.visibility = analysis.visibility.slice(0, 10);

            return analysis;
        }
    """)

    analysis["metrics"] = metrics

    # Print summary
    print(f"\nViewport: {metrics['viewport']['width']}x{metrics['viewport']['height']}")
    print(f"Scroll Height: {metrics['viewport']['scrollHeight']}px")

    if metrics.get('contentWrapper'):
        cw = metrics['contentWrapper']
        print(f"\nContent Wrapper:")
        print(f"  Max Width: {cw.get('maxWidth', 'none')}")
        print(f"  Actual Width: {cw.get('width', 0):.0f}px ({cw.get('constraintRatio', 'N/A')} of viewport)")
        print(f"  Constrained: {cw.get('isConstrained', False)}")

    if metrics.get('bookingCard'):
        bc = metrics['bookingCard']
        print(f"\nBooking Card:")
        print(f"  Position: {bc.get('position', 'N/A')}")
        print(f"  Is Sticky: {bc.get('isSticky', False)}")
        print(f"  Size: {bc.get('width', 0):.0f}x{bc.get('height', 0):.0f}px")

    if metrics.get('imageGallery'):
        ig = metrics['imageGallery']
        print(f"\nImage Gallery:")
        print(f"  Display: {ig.get('display', 'N/A')}")
        print(f"  Grid Columns: {ig.get('gridTemplateColumns', 'N/A')}")
        print(f"  Image Count: {ig.get('imageCount', 0)}")

    if metrics.get('gridLayouts'):
        print(f"\nGrid Layouts Found: {len(metrics['gridLayouts'])}")
        for grid in metrics['gridLayouts'][:3]:
            print(f"  Grid {grid['index']}: {grid['gridTemplateColumns']}")

    if metrics.get('header'):
        header = metrics['header']
        print(f"\nHeader:")
        print(f"  Height: {header.get('height', 0):.0f}px")
        print(f"  Is Wrapping: {header.get('isWrapping', False)}")
        print(f"  Flex Wrap: {header.get('flexWrap', 'N/A')}")

    if metrics.get('overflow') and len(metrics['overflow']) > 0:
        print(f"\n⚠️ Overflow Issues: {len(metrics['overflow'])} elements")
        for overflow in metrics['overflow'][:3]:
            print(f"  {overflow['element']}: +{overflow['overflowAmount']:.0f}px")

    if metrics.get('visibility') and len(metrics['visibility']) > 0:
        print(f"\n⚠️ Visibility Issues: {len(metrics['visibility'])} elements")

    return analysis

async def capture_screenshots(page, prefix, name):
    """Capture full page and viewport screenshots"""

    print(f"\nCapturing screenshots for {name}...")

    # Full page screenshot
    full_path = SCREENSHOTS_DIR / f"{prefix}_1280x720.png"
    await page.screenshot(path=str(full_path), full_page=True)
    print(f"  ✓ Full page: {full_path}")

    # Viewport screenshot
    viewport_path = SCREENSHOTS_DIR / f"{prefix}_viewport_1280x720.png"
    await page.screenshot(path=str(viewport_path), full_page=False)
    print(f"  ✓ Viewport: {viewport_path}")

    return {
        "full_page": str(full_path),
        "viewport": str(viewport_path)
    }

async def compare_pages():
    """Main comparison function"""

    # Create screenshots directory
    SCREENSHOTS_DIR.mkdir(exist_ok=True)

    print(f"\n{'='*60}")
    print(f"CYCLE 5 - RESOLUTION TESTING")
    print(f"Resolution: {VIEWPORT_WIDTH}x{VIEWPORT_HEIGHT}")
    print(f"{'='*60}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
            device_scale_factor=1
        )

        results = {
            "test_name": "Cycle 5 - Resolution Testing (1280x720)",
            "resolution": f"{VIEWPORT_WIDTH}x{VIEWPORT_HEIGHT}",
            "timestamp": datetime.now().isoformat(),
            "local": {},
            "production": {},
            "comparison": {}
        }

        # Test Local Page
        print(f"\n{'='*60}")
        print("TESTING LOCAL PAGE")
        print(f"{'='*60}")
        page = await context.new_page()

        try:
            await page.goto(LOCAL_URL, wait_until="networkidle", timeout=30000)
            results["local"]["analysis"] = await analyze_page_at_resolution(page, "Local")
            results["local"]["screenshots"] = await capture_screenshots(page, "cycle5_local", "Local")
            results["local"]["success"] = True
        except Exception as e:
            print(f"\n❌ Error testing local page: {e}")
            results["local"]["error"] = str(e)
            results["local"]["success"] = False
        finally:
            await page.close()

        # Test Production Page
        print(f"\n{'='*60}")
        print("TESTING PRODUCTION PAGE")
        print(f"{'='*60}")
        page = await context.new_page()

        try:
            await page.goto(PRODUCTION_URL, wait_until="domcontentloaded", timeout=60000)
            results["production"]["analysis"] = await analyze_page_at_resolution(page, "Production")
            results["production"]["screenshots"] = await capture_screenshots(page, "cycle5_production", "Production")
            results["production"]["success"] = True
        except Exception as e:
            print(f"\n❌ Error testing production page: {e}")
            results["production"]["error"] = str(e)
            results["production"]["success"] = False
        finally:
            await page.close()

        await browser.close()

        # Generate Comparison
        if results["local"]["success"] and results["production"]["success"]:
            results["comparison"] = generate_comparison(
                results["local"]["analysis"],
                results["production"]["analysis"]
            )

        # Save results
        results_file = SCREENSHOTS_DIR / "cycle5_analysis_1280x720.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Analysis saved to: {results_file}")

        # Generate Report
        generate_report(results)

        return results

def generate_comparison(local, production):
    """Generate detailed comparison between local and production"""

    comparison = {
        "content_wrapper": {},
        "booking_card": {},
        "image_gallery": {},
        "grid_layouts": {},
        "header": {},
        "footer": {},
        "text_elements": {},
        "buttons": {},
        "overflow": {},
        "visibility": {}
    }

    # Content Wrapper Comparison
    if local["metrics"].get("contentWrapper") and production["metrics"].get("contentWrapper"):
        lcw = local["metrics"]["contentWrapper"]
        pcw = production["metrics"]["contentWrapper"]
        comparison["content_wrapper"] = {
            "local_max_width": lcw.get("maxWidth"),
            "production_max_width": pcw.get("maxWidth"),
            "local_constraint_ratio": lcw.get("constraintRatio"),
            "production_constraint_ratio": pcw.get("constraintRatio"),
            "matches": lcw.get("maxWidth") == pcw.get("maxWidth")
        }

    # Booking Card Comparison
    if local["metrics"].get("bookingCard") and production["metrics"].get("bookingCard"):
        lbc = local["metrics"]["bookingCard"]
        pbc = production["metrics"]["bookingCard"]
        comparison["booking_card"] = {
            "local_position": lbc.get("position"),
            "production_position": pbc.get("position"),
            "local_sticky": lbc.get("isSticky"),
            "production_sticky": pbc.get("isSticky"),
            "matches": lbc.get("position") == pbc.get("position")
        }

    # Image Gallery Comparison
    if local["metrics"].get("imageGallery") and production["metrics"].get("imageGallery"):
        lig = local["metrics"]["imageGallery"]
        pig = production["metrics"]["imageGallery"]
        comparison["image_gallery"] = {
            "local_columns": lig.get("gridTemplateColumns"),
            "production_columns": pig.get("gridTemplateColumns"),
            "local_image_count": lig.get("imageCount"),
            "production_image_count": pig.get("imageCount"),
            "matches": lig.get("gridTemplateColumns") == pig.get("gridTemplateColumns")
        }

    # Overflow Comparison
    comparison["overflow"] = {
        "local_count": len(local["metrics"].get("overflow", [])),
        "production_count": len(production["metrics"].get("overflow", [])),
        "local_has_overflow": len(local["metrics"].get("overflow", [])) > 0,
        "production_has_overflow": len(production["metrics"].get("overflow", [])) > 0
    }

    # Visibility Comparison
    comparison["visibility"] = {
        "local_issues": len(local["metrics"].get("visibility", [])),
        "production_issues": len(production["metrics"].get("visibility", [])),
        "local_has_issues": len(local["metrics"].get("visibility", [])) > 0,
        "production_has_issues": len(production["metrics"].get("visibility", [])) > 0
    }

    return comparison

def generate_report(results):
    """Generate comprehensive markdown report"""

    report_path = SCREENSHOTS_DIR / "cycle5_report_1280x720.md"

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Cycle 5 - Resolution Testing Report (1280x720)\n\n")
        f.write(f"**Test Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Resolution**: {VIEWPORT_WIDTH}x{VIEWPORT_HEIGHT}\n\n")
        f.write("---\n\n")

        # Executive Summary
        f.write("## Executive Summary\n\n")
        f.write("This report analyzes the Split Lease listing page at 1280x720 resolution, ")
        f.write("a common laptop and small desktop resolution. The analysis focuses on responsive ")
        f.write("design behavior, layout adjustments, and usability at this mid-range viewport size.\n\n")

        # Screenshots
        f.write("## Screenshots\n\n")
        if results["local"]["success"]:
            f.write("### Local Page\n")
            f.write(f"- Full Page: `{results['local']['screenshots']['full_page']}`\n")
            f.write(f"- Viewport: `{results['local']['screenshots']['viewport']}`\n\n")

        if results["production"]["success"]:
            f.write("### Production Page\n")
            f.write(f"- Full Page: `{results['production']['screenshots']['full_page']}`\n")
            f.write(f"- Viewport: `{results['production']['screenshots']['viewport']}`\n\n")

        # What's Working Well
        f.write("## ✅ What's Working Well\n\n")

        working_well = []

        # Analyze local page
        if results["local"]["success"]:
            metrics = results["local"]["analysis"]["metrics"]

            # Content wrapper behavior
            if metrics.get("contentWrapper") and metrics["contentWrapper"].get("isConstrained"):
                ratio = float(metrics["contentWrapper"]["constraintRatio"].replace('%', ''))
                if ratio > 85:
                    working_well.append("**Content Wrapper**: Utilizing most of viewport width effectively")

            # Booking card
            if metrics.get("bookingCard") and metrics["bookingCard"].get("isSticky"):
                working_well.append("**Booking Card**: Sticky positioning maintained at this resolution")

            # No overflow
            if len(metrics.get("overflow", [])) == 0:
                working_well.append("**Horizontal Scroll**: No horizontal overflow detected")

            # Text readability
            if metrics.get("textElements"):
                h1_readable = all(h.get("isReadable", False) for h in metrics["textElements"].get("h1", []))
                if h1_readable:
                    working_well.append("**Typography**: Heading sizes remain readable")

            # Buttons
            if metrics.get("buttons"):
                tappable = sum(1 for b in metrics["buttons"] if b.get("isTappable", False))
                if tappable / len(metrics["buttons"]) > 0.8:
                    working_well.append("**Interactive Elements**: Buttons maintain adequate tap target sizes")

        if working_well:
            for item in working_well:
                f.write(f"- {item}\n")
        else:
            f.write("- Analysis in progress...\n")

        f.write("\n")

        # What Needs Adjustment
        f.write("## ⚠️ What Needs Adjustment\n\n")

        needs_adjustment = []

        if results["local"]["success"]:
            metrics = results["local"]["analysis"]["metrics"]

            # Overflow issues
            if len(metrics.get("overflow", [])) > 0:
                needs_adjustment.append({
                    "issue": "**Horizontal Overflow**",
                    "description": f"{len(metrics['overflow'])} elements extending beyond viewport",
                    "priority": "HIGH",
                    "elements": [o["element"] for o in metrics["overflow"][:3]]
                })

            # Content wrapper too narrow
            if metrics.get("contentWrapper"):
                ratio = float(metrics["contentWrapper"]["constraintRatio"].replace('%', ''))
                if ratio < 75:
                    needs_adjustment.append({
                        "issue": "**Content Wrapper**",
                        "description": f"Only using {ratio:.0f}% of available width",
                        "priority": "MEDIUM",
                        "recommendation": "Increase max-width or remove constraints for this resolution"
                    })

            # Header wrapping
            if metrics.get("header") and metrics["header"].get("isWrapping"):
                needs_adjustment.append({
                    "issue": "**Header Navigation**",
                    "description": "Navigation items wrapping to multiple lines",
                    "priority": "MEDIUM",
                    "recommendation": "Implement hamburger menu or reduce item padding"
                })

            # Grid layouts
            if metrics.get("gridLayouts"):
                for grid in metrics["gridLayouts"]:
                    if "1fr" in grid.get("gridTemplateColumns", "") and grid.get("columnCount", 0) > 3:
                        needs_adjustment.append({
                            "issue": f"**Grid Layout** (Index {grid['index']})",
                            "description": f"Using {grid['columnCount']} columns may be too many",
                            "priority": "LOW",
                            "recommendation": "Consider 2-3 columns max at this resolution"
                        })

            # Image gallery
            if metrics.get("imageGallery"):
                ig = metrics["imageGallery"]
                if ig.get("imageCount", 0) > 4 and "1fr" in ig.get("gridTemplateColumns", ""):
                    needs_adjustment.append({
                        "issue": "**Image Gallery**",
                        "description": "May need column reduction for better image size",
                        "priority": "MEDIUM",
                        "recommendation": "Use 2 columns instead of 3+ for larger images"
                    })

            # Text size
            if metrics.get("textElements"):
                body_small = [b for b in metrics["textElements"].get("bodyText", [])
                             if not b.get("isReadable", True)]
                if len(body_small) > 2:
                    needs_adjustment.append({
                        "issue": "**Body Text Size**",
                        "description": "Some text elements may be too small",
                        "priority": "LOW",
                        "recommendation": "Ensure minimum 14px for body text"
                    })

            # Visibility issues
            if len(metrics.get("visibility", [])) > 0:
                needs_adjustment.append({
                    "issue": "**Element Visibility**",
                    "description": f"{len(metrics['visibility'])} elements with zero dimensions",
                    "priority": "HIGH",
                    "elements": [v["element"] for v in metrics["visibility"][:3]]
                })

        if needs_adjustment:
            for item in needs_adjustment:
                f.write(f"### {item['issue']} (Priority: {item['priority']})\n\n")
                f.write(f"{item['description']}\n\n")
                if "elements" in item:
                    f.write("**Affected Elements:**\n")
                    for el in item["elements"]:
                        f.write(f"- `{el}`\n")
                    f.write("\n")
                if "recommendation" in item:
                    f.write(f"**Recommendation:** {item['recommendation']}\n\n")
        else:
            f.write("- No major issues detected at this resolution\n\n")

        # Recommended CSS Fixes
        f.write("## 🔧 Recommended CSS Media Query Fixes\n\n")
        f.write("```css\n")
        f.write("/* 1280x720 Resolution Optimizations */\n")
        f.write("@media (max-width: 1280px) {\n\n")

        if results["local"]["success"]:
            metrics = results["local"]["analysis"]["metrics"]

            # Content wrapper
            if metrics.get("contentWrapper"):
                ratio = float(metrics["contentWrapper"]["constraintRatio"].replace('%', ''))
                if ratio < 75:
                    f.write("  /* Expand content wrapper for better space utilization */\n")
                    f.write("  .container, .max-w-7xl {\n")
                    f.write("    max-width: 1200px;\n")
                    f.write("    padding: 0 2rem;\n")
                    f.write("  }\n\n")

            # Image gallery
            if metrics.get("imageGallery"):
                f.write("  /* Optimize image gallery for 2-column layout */\n")
                f.write("  .image-gallery, [class*='gallery'] {\n")
                f.write("    grid-template-columns: repeat(2, 1fr);\n")
                f.write("    gap: 1rem;\n")
                f.write("  }\n\n")

            # Header
            if metrics.get("header") and metrics["header"].get("isWrapping"):
                f.write("  /* Adjust header navigation spacing */\n")
                f.write("  header nav {\n")
                f.write("    gap: 1rem;\n")
                f.write("  }\n")
                f.write("  header nav a, header nav button {\n")
                f.write("    padding: 0.5rem 1rem;\n")
                f.write("    font-size: 0.9rem;\n")
                f.write("  }\n\n")

            # Grid layouts
            if metrics.get("gridLayouts"):
                f.write("  /* Reduce grid columns for better content display */\n")
                f.write("  [class*='grid'] {\n")
                f.write("    grid-template-columns: repeat(2, 1fr);\n")
                f.write("  }\n\n")

            # Booking card
            if metrics.get("bookingCard"):
                f.write("  /* Ensure booking card doesn't overflow */\n")
                f.write("  .booking-card, [class*='reserve'] {\n")
                f.write("    max-width: 350px;\n")
                f.write("    padding: 1.5rem;\n")
                f.write("  }\n\n")

            # Footer
            f.write("  /* Stack footer columns for narrow viewports */\n")
            f.write("  footer {\n")
            f.write("    grid-template-columns: repeat(2, 1fr);\n")
            f.write("  }\n\n")

        f.write("}\n")
        f.write("```\n\n")

        # Priority Ranking
        f.write("## 📊 Priority Ranking of Issues\n\n")

        if needs_adjustment:
            high = [i for i in needs_adjustment if i["priority"] == "HIGH"]
            medium = [i for i in needs_adjustment if i["priority"] == "MEDIUM"]
            low = [i for i in needs_adjustment if i["priority"] == "LOW"]

            if high:
                f.write("### 🔴 HIGH Priority\n\n")
                for item in high:
                    f.write(f"1. {item['issue']}: {item['description']}\n")
                f.write("\n")

            if medium:
                f.write("### 🟡 MEDIUM Priority\n\n")
                for item in medium:
                    f.write(f"1. {item['issue']}: {item['description']}\n")
                f.write("\n")

            if low:
                f.write("### 🟢 LOW Priority\n\n")
                for item in low:
                    f.write(f"1. {item['issue']}: {item['description']}\n")
                f.write("\n")
        else:
            f.write("No issues detected - page is well-optimized for this resolution.\n\n")

        # Detailed Metrics
        f.write("## 📈 Detailed Metrics\n\n")

        if results["local"]["success"]:
            f.write("### Local Page Metrics\n\n")
            metrics = results["local"]["analysis"]["metrics"]

            f.write(f"**Viewport**: {metrics['viewport']['width']}x{metrics['viewport']['height']}\n")
            f.write(f"**Scroll Height**: {metrics['viewport']['scrollHeight']}px\n\n")

            if metrics.get("contentWrapper"):
                cw = metrics["contentWrapper"]
                f.write("**Content Wrapper**:\n")
                f.write(f"- Max Width: {cw.get('maxWidth', 'none')}\n")
                f.write(f"- Actual Width: {cw.get('width', 0):.0f}px\n")
                f.write(f"- Constraint Ratio: {cw.get('constraintRatio', 'N/A')}\n\n")

            if metrics.get("bookingCard"):
                bc = metrics["bookingCard"]
                f.write("**Booking Card**:\n")
                f.write(f"- Position: {bc.get('position', 'N/A')}\n")
                f.write(f"- Sticky: {bc.get('isSticky', False)}\n")
                f.write(f"- Dimensions: {bc.get('width', 0):.0f}x{bc.get('height', 0):.0f}px\n\n")

            if metrics.get("gridLayouts"):
                f.write(f"**Grid Layouts**: {len(metrics['gridLayouts'])} found\n\n")

            if metrics.get("overflow"):
                f.write(f"**Overflow Issues**: {len(metrics['overflow'])} elements\n\n")

        # Comparison Section
        if results.get("comparison"):
            f.write("## 🔄 Local vs Production Comparison\n\n")
            comp = results["comparison"]

            if comp.get("content_wrapper"):
                cw = comp["content_wrapper"]
                f.write("**Content Wrapper**:\n")
                f.write(f"- Match: {'✅' if cw.get('matches') else '❌'}\n")
                f.write(f"- Local: {cw.get('local_max_width', 'N/A')}\n")
                f.write(f"- Production: {cw.get('production_max_width', 'N/A')}\n\n")

            if comp.get("overflow"):
                ov = comp["overflow"]
                f.write("**Overflow Issues**:\n")
                f.write(f"- Local: {ov.get('local_count', 0)} elements\n")
                f.write(f"- Production: {ov.get('production_count', 0)} elements\n\n")

        # Conclusion
        f.write("## 🎯 Conclusion\n\n")
        f.write("At 1280x720 resolution, the Split Lease listing page represents a critical ")
        f.write("breakpoint between desktop and tablet layouts. This resolution is commonly used on:\n\n")
        f.write("- 13-inch laptops\n")
        f.write("- Small desktop monitors\n")
        f.write("- Windowed browsers on larger screens\n\n")
        f.write("The page should maintain full desktop functionality while beginning to ")
        f.write("optimize spacing and layout for the narrower viewport. Key focus areas include:\n\n")
        f.write("1. Maintaining two-column layouts where possible\n")
        f.write("2. Ensuring sticky elements don't overflow\n")
        f.write("3. Optimizing navigation for reduced horizontal space\n")
        f.write("4. Keeping all interactive elements accessible and properly sized\n\n")

        f.write("---\n\n")
        f.write("*Report generated by Cycle 5 Resolution Testing Script*\n")

    print(f"\n✓ Report saved to: {report_path}")
    print(f"\n{'='*60}")
    print("CYCLE 5 TESTING COMPLETE")
    print(f"{'='*60}")
    print(f"\nFiles generated:")
    print(f"  - Analysis: {SCREENSHOTS_DIR / 'cycle5_analysis_1280x720.json'}")
    print(f"  - Report: {report_path}")
    if results["local"]["success"]:
        print(f"  - Local Screenshots: 2 files")
    if results["production"]["success"]:
        print(f"  - Production Screenshots: 2 files")

if __name__ == "__main__":
    asyncio.run(compare_pages())
