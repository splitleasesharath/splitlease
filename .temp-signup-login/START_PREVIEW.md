# 🚀 Start Your Preview Now!

## Quick Start Commands

### **Windows**
```cmd
cd "C:\Users\Split Lease\My Drive (splitleaseteam@gmail.com)\!Agent Context and Tools\SL16\signup-login"
npm start
```

### **Command Prompt (Alternative)**
```cmd
cd signup-login
npm start
```

### **Git Bash / PowerShell**
```bash
cd signup-login
npm start
```

---

## What Happens Next

1. ⚡ **Vite starts the development server**
2. 🌐 **Browser opens automatically** to http://localhost:3000
3. 🎨 **You see the interactive demo application**
4. ✅ **Hot reload enabled** - Changes update instantly

---

## Preview URL

Once started, access the preview at:

**🔗 http://localhost:3000**

Or if port 3000 is busy:
- http://localhost:3001
- http://localhost:5173 (Vite default)

---

## What You'll See

### 📱 Beautiful Demo Application

**Top Section:**
- Authentication Status Card
- Shows if you're logged in
- User details when authenticated

**Middle Section:**
- Configuration Options
  - Toggle referral code
  - Disable close button
  - Pre-fill email
- Features List
- Info about demo mode

**Action Button:**
- "🚀 Open Authentication Modal" button
- Click to test the component

---

## Testing the Component

### 1. Click "Open Authentication Modal"

### 2. Try Different Flows

**Welcome Screen:**
- Create Account
- Log into my account
- Get Market Report (optional)

**Login:**
- Enter any email/password
- Click "Log In"
- ✅ Success! (mock API)

**Signup:**
- Fill in all fields
- Create password
- Check terms box
- Click "Create Account"
- ✅ Account created!

**Password Reset:**
- Click "Forgot password"
- Enter email
- ✅ Reset email sent!

### 3. See It Work!

After authentication:
- User info displays
- Logout button appears
- Modal closes automatically

---

## 🎮 Interactive Features

### Configuration Options

**Use Referral Code:**
- Check this box
- Open modal again
- See referral banner with cashback points!

**Disable Close Button:**
- Check this box
- Open modal
- Close button is disabled
- Must complete auth to close

**Default Email:**
- Type an email
- Open modal
- Email is pre-filled!

---

## 🔍 Browser Console

Open Developer Tools (F12) to see:

```
🔐 Mock Login API called with: { email: "...", password: "..." }
✅ Mock Login Success: { user: {...}, token: "..." }
```

All API calls are logged for debugging!

---

## 💡 Tips

### Hot Reload
- Save any file
- Browser updates instantly
- No manual refresh needed

### Multiple Tabs
- Open multiple browser tabs
- Test different scenarios
- State persists in localStorage

### Mobile Testing
- Resize browser window
- Test responsive design
- Works on all screen sizes

---

## 🛑 Stop the Server

When done testing:

**Press:** `Ctrl + C` in the terminal

Or close the terminal window.

---

## 🐛 Troubleshooting

### Server Won't Start?

**Check Node.js:**
```bash
node --version
```
Need version 18 or higher.

**Reinstall Dependencies:**
```bash
cd signup-login
rm -rf node_modules
npm install
npm start
```

### Port Already in Use?

**Try different port:**
```bash
npm run dev -- --port 3001
```

### TypeScript Errors?

**Check types:**
```bash
npm run type-check
```

---

## 📚 Documentation

After testing the preview, read:

1. **QUICK_START.md** - Integration guide
2. **README.md** - Full documentation
3. **INTEGRATION_GUIDE.md** - Advanced patterns
4. **PREVIEW_GUIDE.md** - Detailed preview info

---

## ✅ Checklist

Before you start:
- [ ] Node.js installed (v18+)
- [ ] npm installed
- [ ] In signup-login directory
- [ ] Dependencies installed (`npm install`)

Ready to go:
- [ ] Run `npm start`
- [ ] Browser opens
- [ ] Click "Open Authentication Modal"
- [ ] Test all flows
- [ ] Check console logs
- [ ] Try configuration options

---

## 🎉 You're All Set!

Run this command now:

```bash
npm start
```

And enjoy testing your SignUpLoginModal! 🚀

---

## 📞 Need Help?

- **Preview Issues:** See PREVIEW_GUIDE.md
- **Integration Help:** See INTEGRATION_GUIDE.md
- **Component Docs:** See README.md
- **GitHub:** https://github.com/splitleasesharath/signup-login

---

**Happy Testing!** ✨

The preview server will open automatically in your browser at:
**http://localhost:3000**
