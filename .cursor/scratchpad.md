# Background and Motivation

Asterion is a Farcaster mini app for reading and tipping web novels. We have a backend API endpoint (`/api/users`) that checks if a user exists (by Farcaster `fid` or `username`) and creates the user if not. We want to ensure that when a Farcaster user launches the Mini App, the app calls this endpoint to guarantee the user is present in the database, enabling seamless onboarding and data association for tipping, bookmarks, etc.

# Key Challenges and Analysis

- **Where to Trigger:** The logic should run as soon as the Farcaster user context is available (from MiniKit/Farcaster context), ideally on app launch or first render after authentication.
- **User Data:** We need to extract the user's `fid` and `username` from the Farcaster context (via `useMiniKit`).
- **API Call:** The frontend should POST to `/api/users` with the `fid` and `username`.
- **Idempotency:** The endpoint is idempotent (find or create), so repeated calls are safe.
- **Error Handling:** Handle errors gracefully and provide debug output if user creation fails.
- **Testing:** Ensure the logic works with both new and existing users.

# High-level Task Breakdown

1. **Extract Farcaster User Info**

   - Use `useMiniKit` to get the current user's `fid` and `username` as soon as available.
   - **Success Criteria:** Able to log or display the user's `fid` and `username` in the app.

2. **Call /api/users Endpoint**

   - On initial app load (or when user info is available), POST to `/api/users` with `fid` and `username`.
   - **Success Criteria:** User is created in DB if new, or fetched if existing; no duplicate users.

3. **Store/Use User Data in App State**

   - Store the returned user object in React state or context for use throughout the app.
   - **Success Criteria:** User data is accessible in components that need it (e.g., tipping, profile).

4. **Error Handling and Debug Output**

   - Log errors and show debug info if user creation fails.
   - **Success Criteria:** Errors are visible in the console or UI for debugging.

5. **Testing**
   - Test with both new and existing Farcaster users.
   - **Success Criteria:** Both cases work without errors; user is present in DB.

# Project Status Board

- [x] Extract Farcaster user info from MiniKit context
- [x] Call /api/users endpoint with fid and username
- [x] Store/use user data in app state
- [x] Add error handling and debug output
- [ ] Test with new and existing users

# Executor's Feedback or Assistance Requests

- User state is now managed globally via UserProvider and useUser hook.
- Profile page and tip modal now use the real user object from DB, not mock data.
- All user-dependent features (profile, tipping, etc.) are now wired to the real DB-backed user.
- Please test with new and existing Farcaster users to confirm everything works as expected. Let me know if you see any issues or want further integration.

# Lessons

- Always read the file before editing.
- Include debug info in program output.
- Use TDD where possible.
- If you find any bugs, fix them before moving to the next task.
