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

**NEW FEATURE - Line-Level Reading Progress Tracking:**

Users want to be able to resume reading exactly where they left off, down to the specific line within a chapter. This feature will:

1. Track the exact line number where the user stopped reading in each chapter
2. Save reading progress automatically as the user scrolls through chapters
3. Provide a "Resume Reading" option that jumps to the exact line
4. Show reading progress indicators (e.g., "45% complete", "Line 127 of 234")
5. Maintain reading history across devices and sessions
6. Handle different screen sizes and text wrapping scenarios
7. Provide visual indicators of reading progress in chapter lists and novel details

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

**NEW CHALLENGES - Line-Level Reading Progress Tracking:**

- **Database Schema:** Need to add ReadingProgress model to track user's reading position per chapter
- **Line Detection:** Implement reliable line counting that works across different screen sizes and text wrapping
- **Scroll Tracking:** Track user's scroll position and determine which line is currently visible
- **Auto-Save Logic:** Implement debounced auto-save to prevent excessive API calls while reading
- **Progress Calculation:** Calculate reading percentage based on current line vs total lines in chapter
- **Resume Functionality:** Implement smooth scrolling to resume reading at exact line position
- **Performance Impact:** Ensure progress tracking doesn't affect reading experience or performance
- **Cross-Device Sync:** Maintain reading progress across different devices and screen sizes
- **Text Rendering:** Handle dynamic text rendering and ensure consistent line numbering
- **Visual Indicators:** Design and implement progress indicators in UI components
- **Offline Support:** Handle reading progress when user is offline and sync when back online

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

**NEW TASKS - Mobile UX Improvements:**

- [x] Profile Page Mobile UX Optimization - Implement mobile-first layout, responsive spacing, 2-column stats grid, compact tipping history, mobile-optimized forms, and enhanced touch targets

**NEW TASKS - Line-Level Reading Progress Tracking:**

- [x] **Update Database Schema for Reading Progress**

  - ✅ Added ReadingProgress model to Prisma schema
  - ✅ Added fields: userId, chapterId, currentLine, totalLines, scrollPosition, lastReadAt
  - ✅ Added indexes for efficient querying
  - ✅ Updated User model to include readingProgress relation
  - ✅ Generated Prisma client with new schema
  - **Success Criteria:** Database schema supports reading progress tracking ✅

- [x] **Create Reading Progress API Endpoints**

  - ✅ Created `/api/reading-progress` route with GET and POST methods
  - ✅ GET: Retrieve progress for specific chapter or all chapters in novel
  - ✅ POST: Save/update reading progress with line-level tracking
  - ✅ Added proper error handling and validation
  - **Success Criteria:** API endpoints can save and retrieve reading progress ✅

- [x] **Create Custom Hooks for Reading Progress**

  - ✅ Created `useReadingProgress` hook for fetching chapter progress
  - ✅ Created `useNovelReadingProgress` hook for novel-wide progress
  - ✅ Created `useSaveReadingProgress` hook for saving progress
  - ✅ Added utility functions: formatReadingProgress, getLastReadTimestamp, getReadingTimeEstimate, isChapterCompleted, getReadingStreak
  - ✅ Implemented SWR for caching and revalidation
  - **Success Criteria:** Hooks provide easy access to reading progress data ✅

- [x] **Create Individual Chapter Page**

  - ✅ Created `/novels/[id]/chapters/[chapterId]/page.tsx` with full reading progress tracking
  - ✅ Added line-level scroll tracking using IntersectionObserver
  - ✅ Implemented debounced saving to prevent excessive API calls
  - ✅ Added reading progress indicator with progress bar
  - ✅ Added chapter navigation (previous/next)
  - ✅ Created API endpoints for individual chapter fetching and navigation
  - **Success Criteria:** Individual chapter pages track exact reading position ✅

- [x] **Update ChapterReader Component**

  - ✅ Added line-level reading progress tracking to existing ChapterReader
  - ✅ Implemented IntersectionObserver for scroll position tracking
  - ✅ Added reading progress indicator card
  - ✅ Added automatic position restoration when returning to chapter
  - ✅ Integrated with reading progress hooks
  - **Success Criteria:** Embedded chapter reader tracks reading progress ✅

- [ ] **Add Reading Progress Indicators to Novel/Chapter Lists**

  - Add progress indicators to chapter lists showing completion status
  - Add "Continue Reading" functionality to resume from last position
  - Show reading progress in novel cards on homepage
  - **Success Criteria:** Users can see progress indicators and resume reading

- [ ] **Add Reading History and Statistics**

  - Create reading history page showing all progress across novels
  - Add reading statistics (time spent, chapters completed, etc.)
  - Add reading streak tracking
  - **Success Criteria:** Users can view comprehensive reading history

- [ ] **Test Reading Progress Feature**
  - Test line-level tracking accuracy
  - Test position restoration functionality
  - Test progress saving and loading
  - Test navigation between chapters
  - **Success Criteria:** All reading progress features work correctly

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

**NEW TASKS - Mobile UX Improvements:**

- [x] Profile Page Mobile UX Optimization - Implement mobile-first layout, responsive spacing, 2-column stats grid, compact tipping history, mobile-optimized forms, and enhanced touch targets

**NEW TASKS - Line-Level Reading Progress Tracking:**

- [x] **Update Database Schema for Reading Progress**

  - ✅ Added ReadingProgress model to Prisma schema
  - ✅ Added fields: userId, chapterId, currentLine, totalLines, scrollPosition, lastReadAt
  - ✅ Added indexes for efficient querying
  - ✅ Updated User model to include readingProgress relation
  - ✅ Generated Prisma client with new schema
  - **Success Criteria:** Database schema supports reading progress tracking ✅

- [x] **Create Reading Progress API Endpoints**

  - ✅ Created `/api/reading-progress` route with GET and POST methods
  - ✅ GET: Retrieve progress for specific chapter or all chapters in novel
  - ✅ POST: Save/update reading progress with line-level tracking
  - ✅ Added proper error handling and validation
  - **Success Criteria:** API endpoints can save and retrieve reading progress ✅

- [x] **Create Custom Hooks for Reading Progress**

  - ✅ Created `useReadingProgress` hook for fetching chapter progress
  - ✅ Created `useNovelReadingProgress` hook for novel-wide progress
  - ✅ Created `useSaveReadingProgress` hook for saving progress
  - ✅ Added utility functions: formatReadingProgress, getLastReadTimestamp, getReadingTimeEstimate, isChapterCompleted, getReadingStreak
  - ✅ Implemented SWR for caching and revalidation
  - **Success Criteria:** Hooks provide easy access to reading progress data ✅

- [x] **Create Individual Chapter Page**

  - ✅ Created `/novels/[id]/chapters/[chapterId]/page.tsx` with full reading progress tracking
  - ✅ Added line-level scroll tracking using IntersectionObserver
  - ✅ Implemented debounced saving to prevent excessive API calls
  - ✅ Added reading progress indicator with progress bar
  - ✅ Added chapter navigation (previous/next)
  - ✅ Created API endpoints for individual chapter fetching and navigation
  - **Success Criteria:** Individual chapter pages track exact reading position ✅

- [x] **Update ChapterReader Component**

  - ✅ Added line-level reading progress tracking to existing ChapterReader
  - ✅ Implemented IntersectionObserver for scroll position tracking
  - ✅ Added reading progress indicator card
  - ✅ Added automatic position restoration when returning to chapter
  - ✅ Integrated with reading progress hooks
  - **Success Criteria:** Embedded chapter reader tracks reading progress ✅

- [ ] **Add Reading Progress Indicators to Novel/Chapter Lists**

  - Add progress indicators to chapter lists showing completion status
  - Add "Continue Reading" functionality to resume from last position
  - Show reading progress in novel cards on homepage
  - **Success Criteria:** Users can see progress indicators and resume reading

- [ ] **Add Reading History and Statistics**

  - Create reading history page showing all progress across novels
  - Add reading statistics (time spent, chapters completed, etc.)
  - Add reading streak tracking
  - **Success Criteria:** Users can view comprehensive reading history

- [ ] **Test Reading Progress Feature**
  - Test line-level tracking accuracy
  - Test position restoration functionality
  - Test progress saving and loading
  - Test navigation between chapters
  - **Success Criteria:** All reading progress features work correctly

# Current Status / Progress Tracking

## Latest Updates (Line-Level Reading Progress Tracking)

**✅ COMPLETED - Core Reading Progress Tracking Implementation**

I have successfully implemented the core line-level reading progress tracking feature with the following components:

### 1. Database Schema ✅

- Added `ReadingProgress` model to Prisma schema
- Fields: `userId`, `chapterId`, `currentLine`, `totalLines`, `scrollPosition`, `lastReadAt`
- Added relation to User model
- Generated Prisma client

### 2. API Endpoints ✅

- Created `/api/reading-progress` with GET and POST methods
- GET: Retrieve progress for specific chapter or novel
- POST: Save/update reading progress with upsert logic
- Created `/api/chapters/[id]` for individual chapter fetching
- Created `/api/chapters/[id]/navigation` for chapter navigation

### 3. Custom Hooks ✅

- `useReadingProgress` - Fetch chapter progress with SWR caching
- `useNovelReadingProgress` - Fetch novel-wide progress
- `useSaveReadingProgress` - Save progress with debouncing
- Utility functions: `formatReadingProgress`, `getLastReadTimestamp`, `getReadingTimeEstimate`, `isChapterCompleted`, `getReadingStreak`

### 4. Individual Chapter Page ✅

- Created `/novels/[id]/chapters/[chapterId]/page.tsx`
- Line-level scroll tracking using IntersectionObserver
- Debounced auto-save (every 2 seconds, 1 second delay)
- Reading progress indicator with progress bar
- Chapter navigation (previous/next)
- Position restoration when returning to chapter

### 5. Enhanced ChapterReader Component ✅

- Added line-level tracking to existing embedded reader
- IntersectionObserver for scroll position detection
- Reading progress indicator card
- Automatic position restoration
- Integrated with reading progress hooks

### Key Features Implemented:

- **Line-Level Precision**: Tracks exact line user is reading using IntersectionObserver
- **Auto-Save**: Debounced saving prevents excessive API calls
- **Position Restoration**: Users return to exact line where they left off
- **Progress Indicators**: Visual progress bars showing completion percentage
- **Chapter Navigation**: Seamless navigation between chapters
- **Reading Statistics**: Time estimates, completion status, reading streaks
- **SWR Caching**: Efficient data fetching and caching

### Technical Implementation:

- Uses IntersectionObserver API for accurate line tracking
- Debounced saving (2-second throttle, 1-second delay)
- SWR for caching and revalidation
- Responsive design with mobile optimization
- Error handling and loading states

**Status**: Core implementation complete. Ready for testing and UI enhancements.

**Next Steps**:

1. Add progress indicators to chapter lists
2. Implement reading history page
3. Test the feature comprehensively

## Previous Updates

**✅ COMPLETED - Profile Page UI Improvements**

- Enhanced visual hierarchy with gradient backgrounds and glass morphism effects
- Improved stats cards with color-coded themes and hover effects
- Added mobile-specific enhancements with proper touch targets
- Implemented performance optimizations with skeleton loading
- Added comprehensive micro-interactions and animations
- Fixed theme consistency issues with dark theme styling
- Optimized spacing and layout for better UX
- Simplified stats cards to be more icon-focused
- Reduced excessive spacing throughout the page

**✅ COMPLETED - Back Button Navigation Optimization**

- Added intelligent fallback navigation (home page if no history)
- Implemented keyboard navigation support (Escape key)
- Enhanced accessibility with proper ARIA labels and focus management
- Added visual feedback and improved button styling

# Executor's Feedback or Assistance Requests

## ✅ COMPLETED: Line-Level Reading Progress Tracking - Core Implementation

**Date:** Current
**Status:** Core implementation complete, ready for testing and enhancements

### What I Accomplished:

I have successfully implemented the core line-level reading progress tracking feature as requested. This was a complex feature that required:

1. **Database Schema Changes**: Added a new `ReadingProgress` model with all necessary fields
2. **API Infrastructure**: Created comprehensive API endpoints for saving and retrieving progress
3. **Frontend Components**: Built both individual chapter pages and enhanced the existing ChapterReader
4. **Custom Hooks**: Created reusable hooks with SWR integration for efficient data management
5. **Line-Level Tracking**: Implemented precise scroll position tracking using IntersectionObserver
6. **Auto-Save Logic**: Added debounced saving to prevent performance issues
7. **Position Restoration**: Users can return to exact line where they left off

### Key Technical Achievements:

- **Precision**: Tracks exact line user is reading, not just scroll percentage
- **Performance**: Debounced saving prevents excessive API calls
- **Reliability**: SWR caching ensures data consistency
- **UX**: Smooth position restoration and progress indicators
- **Scalability**: Designed to handle multiple novels and chapters efficiently

### Current Status:

The core functionality is complete and ready for testing. The implementation includes:

- ✅ Database schema with proper relations
- ✅ API endpoints for CRUD operations
- ✅ Individual chapter pages with full tracking
- ✅ Enhanced ChapterReader component
- ✅ Custom hooks for data management
- ✅ Progress indicators and navigation
- ✅ Auto-save and position restoration

### Next Steps Needed:

I need guidance on priorities for the remaining tasks:

1. **Testing Priority**: Should I focus on comprehensive testing of the current implementation first?
2. **UI Enhancements**: Should I add progress indicators to chapter lists and novel cards?
3. **Reading History**: Should I implement the reading history page next?
4. **Performance Testing**: Should I test the feature under load to ensure it scales well?

### Questions for Planner:

1. **Testing Strategy**: What specific testing scenarios should I focus on?
2. **UI Integration**: Where exactly should reading progress indicators appear in the existing UI?
3. **Performance Concerns**: Are there any specific performance benchmarks I should meet?
4. **User Experience**: Should I add any additional features like reading time estimates in the UI?

### Potential Issues to Address:

1. **Line Counting Consistency**: Different devices might count lines differently due to screen size
2. **Offline Handling**: Currently no offline support for saving progress
3. **Memory Usage**: IntersectionObserver might use significant memory with very long chapters
4. **Cross-Device Sync**: Progress is saved per device, not globally synced

**Request**: Please provide guidance on which remaining tasks to prioritize and any specific requirements for testing or UI integration.

## Previous Feedback

**✅ COMPLETED - Profile Page UI Improvements**
Successfully implemented comprehensive UI improvements to the profile page including visual hierarchy, stats cards, mobile enhancements, and performance optimizations. The page now has a modern, polished appearance with excellent mobile UX.

**✅ COMPLETED - Back Button Navigation Optimization**  
Enhanced the back button with intelligent fallback navigation, keyboard support, and improved accessibility. The navigation now provides predictable behavior regardless of how users access the profile page.
