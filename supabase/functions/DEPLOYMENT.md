# Edge Function Deployment Guide

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your Supabase project:
   ```bash
   supabase link --project-ref rryjcqcxhpccgzkhgdqr
   ```

## Deploy the create-employee-account Edge Function

1. Deploy the function:
   ```bash
   supabase functions deploy create-employee-account
   ```

2. Verify the deployment:
   ```bash
   supabase functions list
   ```

## Environment Variables

The edge function requires the following environment variables, which are automatically available in Supabase Edge Functions:

- `SUPABASE_URL` - Your Supabase project URL (automatically provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (automatically provided)

No manual configuration needed - these are injected automatically by Supabase.

## Testing the Edge Function

After deployment, test the function by creating a new team member in the Équipe page:

1. Navigate to `/equipe` in the CRM
2. Click "Inviter un employé"
3. Fill in the member details
4. Click "Inviter"
5. A modal should appear with the temporary password

### Expected Behavior

- For **Employé terrain** role: User should login at `/employee/login`
- For **Admin/Owner/Manager/Backoffice** roles: User should login at `/auth/login` (CRM)

## Troubleshooting

### Function not found error
Run deployment command again to ensure function is deployed.

### Authentication errors
Check browser console (F12) for detailed error messages. The UI logs:
- 📝 Creating account for: [email]
- 🔑 Generated password: [password]
- 👤 Role: [role]
- 📡 Edge function response status: [status]
- ✅ Account created successfully (if successful)
- ❌ Edge function error (if failed)

### Login fails with "identifiants incorrects"

1. **Check you're using the correct login page:**
   - Employé terrain → `/employee/login`
   - Other roles → `/auth/login`

2. **Verify the account was created:**
   - Go to Supabase Dashboard → Authentication → Users
   - Check if the user exists with the correct email
   - Verify the email is confirmed

3. **Check the user_roles table:**
   - Go to Supabase Dashboard → Table Editor → user_roles
   - Verify the user has the correct role assigned

4. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for error messages during login attempt

## Manual Deployment via Supabase Dashboard

If CLI deployment fails, you can deploy manually:

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name it `create-employee-account`
4. Copy the contents of `supabase/functions/create-employee-account/index.ts`
5. Paste into the editor
6. Click "Deploy"

## Important Notes

- The edge function uses `admin.createUser()` which bypasses the normal signup triggers
- Accounts are created with `email_confirm: true` so they don't need email verification
- The function enforces that only owner, admin, and manager roles can create new members
- All new members are created with the same company_id as the creator
