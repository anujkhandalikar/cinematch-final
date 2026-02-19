# Troubleshooting: 422 Error in Lobby

If you see a `422 Unprocessable Entity` error when entering the Lobby, it means **Anonymous Sign-ins are disabled** in your Supabase project.

### How to Fix
1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Click on your project.
3.  Go to **Authentication** -> **Providers** (left sidebar).
4.  Click **Anonymous**.
5.  Toggle **Enable Anonymous Sign-ins** to **ON**.
6.  Click **Save**.

After saving, **refresh your app** and try again. The error should resolve.
