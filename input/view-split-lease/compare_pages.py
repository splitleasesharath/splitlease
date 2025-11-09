import asyncio
from playwright.async_api import async_playwright
import os

async def compare_pages():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        # Create screenshots directory
        os.makedirs('screenshots', exist_ok=True)

        print("Navigating to LOCAL page...")
        await page.goto('http://localhost:8000/index.html', wait_until='networkidle')
        await page.wait_for_timeout(2000)

        print("Taking LOCAL page screenshot...")
        await page.screenshot(path='screenshots/local_page_full.png', full_page=True)
        await page.screenshot(path='screenshots/local_page_viewport.png', full_page=False)

        print("Navigating to PRODUCTION page...")
        try:
            await page.goto('https://app.split.lease/view-split-lease/1586447992720x748691103167545300?area=&arrival=&duration=13%20weeks%20(3%20months)&nights=&guests=&storage=&type=&days-selected=2%2C%203%2C%204%2C%205%2C%206', wait_until='load', timeout=60000)
            await page.wait_for_timeout(5000)
        except Exception as e:
            print(f"Warning: Navigation had issues: {e}")
            print("Continuing with screenshot capture...")

        print("Taking PRODUCTION page screenshot...")
        await page.screenshot(path='screenshots/production_page_full.png', full_page=True)
        await page.screenshot(path='screenshots/production_page_viewport.png', full_page=False)

        print("\nScreenshots captured successfully!")
        print("- Local full page: screenshots/local_page_full.png")
        print("- Local viewport: screenshots/local_page_viewport.png")
        print("- Production full page: screenshots/production_page_full.png")
        print("- Production viewport: screenshots/production_page_viewport.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(compare_pages())
