# Background and Motivation

Asterion is a Farcaster mini app for reading and tipping web novels. We have a backend API endpoint (`/api/users`) that checks if a user exists (by Farcaster `fid` or `username`) and creates the user if not. We want to ensure that when a Farcaster user launches the Mini App, the app calls this endpoint to guarantee the user is present in the database, enabling seamless onboarding and data association for tipping, bookmarks, etc.

**Update:**

- Users want to grant spend permissions for USDC (on Base) only. ETH support is not required.
- Spend limit should be a single adjustable value (not daily or monthly).

**NEW FEATURE - Wallet-Username Association:**

The app now needs to support wallet-only users (those who connect via Coinbase Smart Wallet but don't have Farcaster accounts). When a user connects their wallet:

1. Check if the wallet address is already associated with a username in the database
2. If not, generate a random username and save it along with the wallet address
3. Ensure seamless integration with existing user management system
4. Support both Farcaster users (with fid/username) and wallet-only users (with address/generated username)
5. **NEW REQUIREMENT**: For existing users (Farcaster or wallet-based) who don't have a `walletAddress` field populated, detect their current connected wallet and update their user record with the wallet address

**NEW FEATURE - Data Caching & Performance:**

The app needs to implement proper data caching to prevent unnecessary reloads when navigating between pages. Currently, users experience slow loading when returning to the homepage from novel details pages. The solution is to implement SWR (Stale-While-Revalidate) for:

1. Caching novels list data across page navigations
2. Caching individual novel details for faster subsequent loads
3. Caching chapter data to prevent refetching
4. Optimizing user experience with background revalidation
5. Reducing API calls and improving perceived performance

# Key Challenges and Analysis

- **Where to Trigger:** The logic should run as soon as the Farcaster user context is available (from MiniKit/Farcaster context), ideally in a provider or onboarding effect.
- **User Data:** We need to extract the user's `fid` and `username` from the Farcaster context (via `useMiniKit`).
- **API Call:** The frontend should POST to `/api/users` with the `fid` and `username`.
- **Idempotency:** The endpoint is idempotent (find or create), so repeated calls are safe.
- **Error Handling:** Handle errors gracefully and provide debug output if user creation fails.
- **Testing:** Ensure the logic works with both new and existing users.

**Update:**

- **USDC Token Address:** Need to add the USDC token address for Base (0xd9aAC23E6A83242c5d306341aCfD7A71A9C6e7B0).
- **SpendPermission UI:** The UI and logic must grant permission for USDC only (no ETH option).
- **Persistence:** User-selected limits should persist (localStorage, DB, or context).
- **UX:** The UI should clearly show the current limits and that USDC is the only supported token.

**NEW CHALLENGES - Wallet-Username Association:**

- **Database Schema:** Need to add `walletAddress` field to User model to support wallet-only users
- **Dual Authentication:** Support both Farcaster-based authentication (fid/username) and wallet-based authentication (address/generated username)
- **Username Generation:** Implement random username generation algorithm that creates unique, readable usernames
- **Conflict Resolution:** Handle cases where a generated username might already exist
- **User Provider Logic:** Extend UserProvider to detect wallet connections and create/fetch wallet-based users
- **API Endpoint Updates:** Modify `/api/users` to handle wallet address lookup and user creation
- **Uniqueness Constraints:** Ensure wallet addresses are unique in the database while maintaining existing username uniqueness
- **Backward Compatibility:** Ensure existing Farcaster users continue to work without issues
- **Existing User Address Updates:** For existing users without `walletAddress`, detect and update their records when they connect a wallet
- **Address Validation:** Ensure the same wallet address isn't associated with multiple users (handle conflicts gracefully)
- **Migration Logic:** Handle scenarios where existing users connect wallets for the first time

**NEW CHALLENGES - Data Caching & Performance:**

- **SWR Integration:** Implement SWR hooks for all major data fetching operations
- **Cache Configuration:** Configure appropriate cache durations for different data types (novels: 1min, individual novels: 5min, chapters: 3min)
- **Provider Setup:** Set up SWR provider with global configuration for offline handling, retry logic, and deduplication
- **State Migration:** Replace existing useState/useEffect data fetching with SWR hooks
- **Error Handling:** Implement proper error boundaries and fallback states for SWR
- **Background Revalidation:** Configure when and how data should be revalidated in the background
- **Optimistic Updates:** Implement optimistic updates for actions like bookmarking and tipping
- **Performance Monitoring:** Ensure SWR implementation actually improves performance metrics

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

6. **Add USDC Token Address Constant**

   - Add the USDC token address for Base to the codebase.
   - **Success Criteria:** USDC address is available for use in the frontend.

7. **Update SpendPermission Component for USDC Only**

   - Remove ETH option; grant spend permission for USDC only.
   - **Success Criteria:** User can only grant permission for USDC in the UI.

8. **Refactor DB/User model to use a single spendLimit field**

   - Remove daily/monthly fields from the user model.
   - **Success Criteria:** User model is updated to use a single spendLimit field.

9. **Update /api/users PATCH to support spendLimit**

   - Modify the API endpoint to accept a single spendLimit field.
   - **Success Criteria:** API endpoint supports updating the spendLimit field.

10. **Update frontend types and state to use spendLimit**

    - Modify frontend code to use the spendLimit field instead of daily/monthly fields.
    - **Success Criteria:** Frontend code uses spendLimit field.

11. **Update Profile page UI to show and adjust a single spend limit**

    - Modify the profile page to display and allow the user to adjust a single spend limit.
    - **Success Criteria:** Profile page shows and allows adjustment of spend limit.

12. **Update SpendPermission logic to use spendLimit**

    - Modify the spend permission logic to use the spendLimit field.
    - **Success Criteria:** Spend permission logic uses spendLimit field.

13. **Test all flows with new single limit**

    - Test granting spend permission for USDC with a single limit.
    - **Success Criteria:** All flows work as expected, and limits persist.

**NEW TASKS - Wallet-Username Association:**

14. **Update Database Schema for Wallet Support**

    - Add `walletAddress` field to User model in Prisma schema
    - Make `fid` and `username` optional to support wallet-only users
    - Add unique constraint on `walletAddress`
    - **Success Criteria:** Database schema supports both Farcaster and wallet-only users

15. **Create Username Generation Utility**

    - Implement random username generator using adjective + noun + number pattern
    - Ensure generated usernames are unique and user-friendly
    - Handle collision detection and retries
    - **Success Criteria:** Utility generates unique, readable usernames consistently

16. **Update User API Endpoint for Wallet Support**

    - Modify `/api/users` POST to accept `walletAddress` as alternative to `fid/username`
    - Implement wallet address lookup and user creation logic
    - Ensure backward compatibility with existing Farcaster user creation
    - **Success Criteria:** API endpoint supports both Farcaster and wallet-based user creation

17. **Extend UserProvider for Wallet Integration**

    - Add wallet connection detection using wagmi `useAccount` hook
    - Implement wallet-based user creation/lookup flow
    - Maintain existing Farcaster integration without breaking changes
    - **Address Update Logic:** When an existing user (identified by fid/username) connects a wallet for the first time, update their record with the wallet address
    - **Conflict Resolution:** If the connected wallet is already associated with another user, implement conflict resolution strategy
    - **Success Criteria:** UserProvider seamlessly handles both Farcaster and wallet users, and updates existing users with wallet addresses

18. **Update Frontend Types for Wallet Users**

    - Extend User type to include optional `walletAddress` field
    - Update components to handle users with either Farcaster or wallet identity
    - **Success Criteria:** Frontend types and components support both user types

19. **Test Wallet-Username Association Flow**

    - Test new wallet user creation with random username generation
    - Test existing wallet user lookup by address
    - Test mixed scenarios (Farcaster users, wallet users, switching between them)
    - **Test existing user address updates:** Verify that existing users get their wallet addresses populated when they connect
    - **Test address conflict scenarios:** Ensure proper handling when the same wallet is used by multiple users
    - **Success Criteria:** All wallet-related user flows work correctly without breaking existing functionality

**NEW TASKS - Data Caching & Performance:**

20. **Install and Configure SWR**

    - Install SWR package and create global SWR provider
    - Configure cache settings, retry logic, and offline handling
    - **Success Criteria:** SWR is properly installed and configured globally

21. **Create SWR Data Fetching Hooks**

    - Create `useNovels()` hook for homepage novels data
    - Create `useNovel(id)` hook for individual novel details
    - Create `useChapters(novelId)` hook for chapter data
    - Configure appropriate cache durations for each data type
    - **Success Criteria:** Custom hooks provide cached data with proper error handling

22. **Update Homepage to Use SWR**

    - Replace existing useState/useEffect data fetching with SWR hook
    - Remove manual loading states and error handling
    - **Success Criteria:** Homepage loads faster on subsequent visits with cached data

23. **Update Novel Details Page to Use SWR**

    - Replace existing data fetching with SWR hooks
    - Implement optimistic updates for bookmarking and tipping
    - **Success Criteria:** Novel details load instantly from cache, updates work optimistically

24. **Test Performance Improvements**

    - Measure page load times before and after SWR implementation
    - Test navigation between pages to verify caching works
    - Test offline scenarios and error recovery
    - **Success Criteria:** Significant performance improvement, no regressions in functionality

# Project Status Board

- [x] Extract Farcaster user info from MiniKit context
- [x] Call /api/users endpoint with fid and username
- [x] Store/use user data in app state
- [x] Add error handling and debug output
- [x] Bulletproof chapter array access in app/novels/[id]/page.tsx (use Array.isArray everywhere chapters is accessed, including chapter count display)
- [x] Fix linter errors for Button 'variant' prop and lucide-react import in app/novels/[id]/page.tsx
- [ ] Test with new and existing users
- [x] Add USDC token address constant
- [x] Update SpendPermission component for USDC only
- [ ] Refactor DB/User model to use a single spendLimit field
- [ ] Update /api/users PATCH to support spendLimit
- [ ] Update frontend types and state to use spendLimit
- [ ] Update Profile page UI to show and adjust a single spend limit
- [ ] Update SpendPermission logic to use spendLimit
- [ ] Test all flows with new single limit
- [x] Create `lib/spender.ts` for spender wallet client
- [x] Implement `/app/collect/route.ts` API route for spend permission approval and spending
- [ ] Refactor spend permission UI into a dedicated component
- [ ] Integrate spend permission component into profile page
- [ ] Add spender wallet env vars to `.env`
- [ ] Test end-to-end spend permission flow
- [x] Defer loading of novel chapters until 'Read Now' is clicked
- [x] Fix Prisma import errors in API routes

**NEW TASKS - Wallet-Username Association:**

- [x] Update Database Schema for Wallet Support
- [x] Create Username Generation Utility
- [x] Update User API Endpoint for Wallet Support
- [x] Extend UserProvider for Wallet Integration
- [x] Update Frontend Types for Wallet Users
- [ ] Test Wallet-Username Association Flow
- [x] Handle Existing Users Without Addresses - Implement logic to update existing users with wallet addresses when they connect
- [x] Sort novels by rank on home page

**NEW TASKS - Data Caching & Performance:**

- [x] Install and Configure SWR
- [x] Create SWR Data Fetching Hooks
- [x] Update Homepage to Use SWR
- [x] Update Novel Details Page to Use SWR
- [ ] Test Performance Improvements

# Current Status / Progress Tracking

## Most Recent Work: Enhanced Action Bar Implementation

**Status:** ✅ COMPLETED - Action bar successfully enhanced with improved visual hierarchy and user experience

**What was accomplished:**

1. **Enhanced Visual Hierarchy:**

   - **Prominent READ NOW Button:** Transformed into a full-width primary action with gradient background (purple-600 to indigo-600)
   - **Animated Effects:** Added hover animations with scale transforms, gradient overlays, and progress indicators
   - **Smart Button States:** READ NOW button shows chapter count and loading states with contextual messaging
   - **Secondary Actions:** Library and Chapters buttons redesigned with better spacing and visual feedback

2. **Progress Indicators & Smart States:**

   - **Chapter Count Display:** READ NOW button shows available chapters or "Start your journey" message
   - **Library Button States:** Shows "In Library" with checkmark for saved novels, or bookmark count for unsaved
   - **Chapters Button Enhancement:** Displays total chapter count with improved iconography
   - **Loading States:** Proper disabled states and loading messages throughout

3. **Mobile Optimization:**

   - **Touch-Friendly Targets:** Minimum 44px touch targets for all interactive elements
   - **Responsive Sizing:** Larger buttons and text on mobile devices (sm: breakpoints)
   - **Touch Manipulation:** Added `touch-manipulation` CSS for better mobile performance
   - **Improved Spacing:** Better gap management between elements on different screen sizes

4. **Interactive Features:**

   - **Share Functionality:** Native share API with clipboard fallback for unsupported browsers
   - **Toast Notifications:** Success feedback for share actions with smooth animations
   - **Quick Stats Display:** Rating and views prominently displayed in action bar
   - **Glass Morphism Effects:** Enhanced backdrop blur and transparency effects

5. **Advanced User Experience:**
   - **Micro-interactions:** Smooth hover effects, icon scaling, and gradient animations
   - **Contextual Information:** Smart messaging based on user state and available content
   - **Visual Feedback:** Color-coded states for different button types and actions
   - **Accessibility:** Proper contrast ratios and touch target sizes

**Technical Implementation Details:**

- **Gradient Animations:** Complex CSS gradients with hover states and animated backgrounds
- **Responsive Design:** Tailwind CSS breakpoints for mobile-first optimization
- **State Management:** Enhanced React state for toast notifications and user feedback
- **Performance:** Optimized animations using CSS transforms and transitions
- **Error Handling:** Graceful fallbacks for share functionality and clipboard operations

**Benefits Achieved:**

- **Improved User Engagement:** More prominent and attractive action buttons
- **Better Mobile Experience:** Larger touch targets and responsive design
- **Enhanced Feedback:** Clear visual and textual feedback for all actions
- **Modern UI/UX:** Glass morphism effects and smooth animations
- **Accessibility:** Better contrast and touch target compliance

**User Impact:**

- Significantly improved visual appeal of the action bar
- Better mobile usability with larger, more accessible buttons
- Enhanced user feedback with toast notifications and smart states
- More intuitive navigation with prominent READ NOW call-to-action
- Professional, modern appearance that matches current design trends

## Previous Work: SWR Implementation for Data Caching

**Status:** ✅ COMPLETED - SWR integration successfully implemented

**What was accomplished:**

1. **SWR Installation & Configuration:**

   - Installed SWR package
   - Created `SWRProvider` with global configuration for cache settings, retry logic, and offline handling
   - Integrated SWR provider into the app's provider chain in `app/layout.tsx`

2. **Custom SWR Hooks Created:**

   - `useNovels()` - Caches novels list with 1-minute deduplication
   - `useNovel(id)` - Caches individual novel details with 5-minute deduplication
   - `useChapters(novelId)` - Caches chapter data with 3-minute deduplication
   - `useBookmark()` - Utility hook for bookmark management
   - All hooks include proper error handling, retry logic, and TypeScript types

3. **Homepage Migration:**

   - Replaced manual `useState`/`useEffect` data fetching with `useNovels()` hook
   - Removed redundant loading states and error handling
   - Maintained existing UI/UX while gaining caching benefits

4. **Novel Details Page Migration:**
   - Replaced manual data fetching with `useNovel()` and `useChapters()` hooks
   - Implemented optimistic updates for chapter tipping using SWR's `mutate` function
   - Simplified component logic by removing manual state management
   - Fixed TypeScript errors with proper type annotations

**Technical Implementation Details:**

- **Cache Configuration:** Different cache durations for different data types (novels: 1min, individual novels: 5min, chapters: 3min)
- **Offline Handling:** Proper online/offline detection and behavior
- **Error Recovery:** Automatic retry with exponential backoff
- **Deduplication:** Prevents duplicate requests for the same data
- **Background Revalidation:** Data stays fresh without blocking UI

**Benefits Achieved:**

- **Performance:** Eliminates homepage reloads when navigating back from novel details
- **User Experience:** Instant loading of cached data with background updates
- **Reduced API Calls:** Intelligent caching prevents unnecessary requests
- **Better Error Handling:** Centralized error management with retry logic
- **Code Simplification:** Removed boilerplate data fetching code

**Next Steps:**

- Test performance improvements to measure actual impact
- Consider extending SWR to other data types (user profiles, bookmarks, etc.)
- Monitor cache hit rates and adjust cache durations if needed

# Executor's Feedback or Assistance Requests

## Current Status: SWR Implementation Complete

The SWR implementation has been successfully completed and is ready for testing. The system now provides:

1. **Comprehensive Data Caching:** All major data fetching operations (novels, individual novels, chapters) now use SWR with appropriate cache durations
2. **Performance Optimization:** Homepage no longer reloads when navigating back from novel details pages
3. **Better User Experience:** Instant loading of cached data with background revalidation
4. **Simplified Code:** Removed boilerplate data fetching code and manual state management
5. **Robust Error Handling:** Centralized error management with automatic retry logic

**Ready for Testing:**

- Navigate between homepage and novel details to verify caching works
- Test offline scenarios and error recovery
- Measure performance improvements compared to previous implementation
- Verify all existing functionality still works correctly

**Technical Notes:**

- SWR is configured with appropriate cache durations for different data types
- Background revalidation keeps data fresh without blocking UI
- Optimistic updates implemented for actions like tipping
- TypeScript errors resolved with proper type annotations

The implementation follows best practices for SWR usage and maintains backward compatibility with existing functionality.

# Lessons

- Include info useful for debugging in the program output.
- Read the file before you try to edit it.
- If there are vulnerabilities that appear in the terminal, run npm audit before proceeding
- Always ask before using the -force git command
- When implementing SWR, configure different cache durations based on data volatility (novels: 1min, individual novels: 5min, chapters: 3min)
- Use SWR's mutate function for optimistic updates rather than manual state management
- SWR provider should be placed high in the component tree but after other providers that might affect data fetching
- TypeScript errors in SWR mutate callbacks require explicit type annotations for parameters
- SWR's fetcher function should handle HTTP errors explicitly by checking response.ok before parsing JSON
