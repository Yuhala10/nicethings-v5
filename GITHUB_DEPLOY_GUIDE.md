# Push NiceThings to GitHub

From PowerShell, inside `C:\Users\PC\Desktop\nicethings-v2`:

```powershell
git status
git add .
git commit -m "Prepare NiceThings world-class release"
git branch -M main
git remote -v
git push -u origin main
```

If no remote exists yet:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Before pushing

Make sure `.env.local` is ignored and never committed. Use your hosting provider's environment-variable settings for:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NICE_THINGS_ADMIN_PIN
NICE_THINGS_ADMIN_SESSION_SECRET
```

Do not put the admin PIN into client-side code or any `NEXT_PUBLIC_` variable.
