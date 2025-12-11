# 🚀 Project Setup Guide

## Quick Answer: What Should Each Developer Do?

**Each developer sets up their own environment locally. We commit configuration files to GitHub, but NOT secrets or virtual environments.**


## 📝 Setup Workflow

### For Team Lead (First Time)

1. Create the repository on GitHub
2. Commit all code files
3. Commit `requirements.txt` and `requirements-dev.txt`
4. Commit `.env.example` (template)
5. **DO NOT commit `.env`** (it's in `.gitignore`)

### For Each Team Member (First Time)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd graduation-project/backend
   ```

2. **Create your own virtual environment:**
   ```bash
   py -m venv venv
   venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create your own `.env` file:**
   ```bash
   copy .env.example .env
   # Then edit .env with your credentials
   ```

5. **Get credentials from team lead** (Supabase keys, API keys, etc.)

### Daily Workflow

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Activate your venv:**
   ```bash
   venv\Scripts\Activate.ps1
   ```

3. **Update dependencies if needed:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Work on your tasks**

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

## 🔐 Security Best Practices

1. **Never share `.env` files** - Each developer has their own
2. **Use `.env.example`** - Template that shows what variables are needed
3. **Rotate secrets regularly** - Change API keys if compromised
4. **Use different keys for dev/staging/production** - Never use production keys in development

## 📦 Dependency Management

### Adding a New Package

```bash
# 1. Install it
pip install <package-name>

# 2. Update requirements.txt
pip freeze > requirements.txt

# 3. Commit the change
git add requirements.txt
git commit -m "Add <package-name> dependency"
git push
```

### Updating Dependencies

```bash
# 1. Pull latest requirements
git pull

# 2. Install/update packages
pip install -r requirements.txt
```

## ✅ Verification Checklist

Before pushing to GitHub, verify:

- [ ] `.env` is NOT in your commit (check `git status`)
- [ ] `venv/` is NOT in your commit
- [ ] `requirements.txt` is up to date if you added packages
- [ ] `.env.example` is committed (template for others)
- [ ] No API keys or passwords in any committed files

## 🆘 Common Issues

### "Module not found" error
- Make sure your virtual environment is activated
- Run: `pip install -r requirements.txt`

### "Environment variable not found" error
- Make sure you created `.env` from `.env.example`
- Check that `.env` has all required variables

### "Can't connect to Supabase" error
- Verify your `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Make sure you're using the correct project credentials

