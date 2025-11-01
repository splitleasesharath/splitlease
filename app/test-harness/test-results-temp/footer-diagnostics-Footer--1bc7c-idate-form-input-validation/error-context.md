# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "🧪 Footer Component Preview" [level=1] [ref=e3]
    - paragraph [ref=e4]:
      - text: "Project:"
      - strong [ref=e5]: split-lease
      - text: "| Global:"
      - code [ref=e6]: window.SplitLeaseComponents.Footer
  - generic [ref=e7]:
    - heading "🎛️ Component Configuration" [level=2] [ref=e8]
    - generic [ref=e10] [cursor=pointer]:
      - checkbox "Show Referral Form" [checked] [ref=e11]
      - generic [ref=e12]: Show Referral Form
    - generic [ref=e14] [cursor=pointer]:
      - checkbox "Show Import Form" [checked] [ref=e15]
      - generic [ref=e16]: Show Import Form
    - heading "📋 Test Status" [level=3] [ref=e17]
    - generic [ref=e19]: Waiting for interactions...
  - generic [ref=e21]:
    - heading "📊 Console Output" [level=3] [ref=e22]
    - generic [ref=e23]:
      - generic [ref=e24]: "[00:00:00] Console initialized. Waiting for events..."
      - generic [ref=e25]: "[16:49:10]Initializing Footer component preview..."
      - generic [ref=e26]: "[16:49:10]✓ SplitLeaseComponents global loaded"
      - generic [ref=e27]: "[16:49:10]❌ Failed to initialize Footer: Footer component not found in SplitLeaseComponents"
      - generic [ref=e28]: "[16:49:10]❌ Error: Footer component not found in SplitLeaseComponents at file:///C:/Users/igor/My%20Drive%20(splitleaseteam@gmail.com)/!Agent%20Context%20and%20Tools/SL1/TAC/trees/431d9cc3/app/test-harness/previews/footer-preview.html:431:15"
    - button "Clear Console" [ref=e29] [cursor=pointer]
```