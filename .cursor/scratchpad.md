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

# Executor's Feedback or Assistance Requests

**WALLET-USERNAME ASSOCIATION IMPLEMENTATION COMPLETED:**

I have successfully implemented the wallet-username association feature as the **Executor**. Here's what was accomplished:

**1. Database Schema Updates (✅ Complete):**

- Updated Prisma schema to add optional `walletAddress` field with unique constraint
- Made `fid` and `username` optional to support wallet-only users
- Generated new Prisma client to reflect schema changes

**2. Username Generation Utility (✅ Complete):**

- Created `lib/username-generator.ts` with adjective + noun + number pattern
- Implemented collision detection with retry logic (max 5 attempts)
- Added prefixed username option for potential future use

**3. User API Endpoint Updates (✅ Complete):**

- Extended `/api/users` POST to accept optional `walletAddress` parameter
- Implemented dual lookup logic: find by `fid/username` OR `walletAddress`
- Added automatic username generation for wallet-only users
- **Existing user address updates:** When existing users connect wallets, their records are updated
- **Conflict detection:** Prevents duplicate wallet address associations with proper error handling
- Updated PATCH method to support wallet address updates with conflict resolution

**4. UserProvider Integration (✅ Complete):**

- Extended UserProvider to detect wallet connections via `useAccount` hook
- Implemented dual-path logic: Farcaster context takes priority, wallet as fallback
- Added wallet-only user creation when no Farcaster context is available
- **Address update logic:** Existing Farcaster users automatically get wallet addresses when they connect
- Maintained full backward compatibility with existing Farcaster flow

**5. Frontend Types Update (✅ Complete):**

- Updated User interface in `lib/types.ts` to include optional `walletAddress` field
- Made `fid` and `username` optional to support wallet-only users
- All existing components will continue to work due to optional fields

**6. Existing User Address Handling (✅ Complete):**

- Implemented automatic wallet address population for existing users
- Added conflict resolution for duplicate wallet addresses
- Both API and UserProvider handle existing user updates seamlessly

**NEXT STEP:**
The final task is comprehensive testing of the wallet-username association flow. This should include:

- Testing new wallet user creation with generated usernames
- Testing existing user wallet address updates
- Testing conflict scenarios
- Verifying all flows work without breaking existing functionality

The implementation is ready for testing. Would you like me to proceed with the testing phase, or would you prefer to manually test the implementation first?

# Lessons

- Always read the file before editing.
- Include debug info in program output.
- Use TDD where possible.
- If you find any bugs, fix them before moving to the next task.
- Use centralized Prisma client instances instead of creating multiple instances to avoid import conflicts.
- Coinbase Smart Wallet may use WebAuthn/Passkey signatures which require different handling than standard EIP-712 signatures.
- **Don't overcomplicate signature verification** - Coinbase Smart Wallet handles signature verification internally in `approveWithSignature`. Skip local verification and pass signatures directly to the contract.

**FINAL FIX - SIMPLIFIED SIGNATURE HANDLING:**

**The Issue**: Was trying to verify WebAuthn/Passkey signatures locally using standard EIP-712 verification methods, which caused "invalid signature length" errors.

**The Solution**: Follow the official Coinbase documentation approach:

1. **Skip local signature verification** - Coinbase Smart Wallet handles this internally
2. **Pass signatures directly** to `approveWithSignature` contract method
3. **Simplify the backend** - just convert JSON string values to BigInt and call contract

**Key Changes**:

- Removed `verifyTypedData` call and all complex verification logic
- Removed excessive logging and debugging code
- Simplified `/api/collect` route to match official documentation example
- Trust Coinbase Smart Wallet to handle signature verification in the contract

This follows the principle: "Don't overcomplicate things" - the official documentation shows the simple way that actually works.

## Implementation Strategy for Wallet-Username Association

### Technical Approach

**1. Database Schema Strategy:**

- Add optional `walletAddress` field to User model with unique constraint
- Keep `fid` and `username` optional to support wallet-only users
- Use compound lookup logic: find user by `fid` OR `walletAddress`
- Maintain existing uniqueness constraints for backward compatibility

**2. Username Generation Strategy:**

- Use adjective + noun + number pattern (e.g., "QuickPanda42", "BraveRaven123")
- Implement collision detection with retry logic (max 5 attempts)
- Use simple in-memory word lists to avoid external dependencies
- Generate 3-digit random numbers for uniqueness

**3. User Provider Integration Strategy:**

- Extend existing UserProvider to detect wallet connections via `useAccount` hook
- Implement dual-path logic: Farcaster context takes priority, wallet as fallback
- Use effect hook to trigger wallet-based user creation when address changes
- Maintain backward compatibility with existing Farcaster flow
- **Address Update Logic:** When an existing user (identified by fid/username) connects a wallet for the first time, update their record with the wallet address
- **Conflict Resolution:** If the connected wallet is already associated with another user, implement conflict resolution strategy

**4. API Endpoint Strategy:**

- Extend `/api/users` POST to accept optional `walletAddress` parameter
- Implement lookup logic: find by `fid/username` OR `walletAddress`
- Generate username only for new wallet-only users
- Return consistent user object format regardless of authentication method
- **Address Update Endpoint:** Add logic to PATCH existing users with wallet address when they connect for the first time
- **Conflict Detection:** Check for existing wallet address associations before updates

### Success Criteria

**Phase 1 - Schema & Username Generation:**

- [ ] Prisma schema updated with optional `walletAddress` field
- [ ] Database migration runs successfully
- [ ] Username generator creates unique, readable usernames
- [ ] Username collision detection works correctly

**Phase 2 - API Integration:**

- [ ] `/api/users` endpoint supports wallet address lookup
- [ ] New wallet users get created with generated usernames
- [ ] Existing users can be found by wallet address
- [ ] Farcaster users continue to work without changes
- [ ] **Address update logic:** Existing users without wallet addresses get updated when they connect a wallet
- [ ] **Conflict detection:** API prevents duplicate wallet address associations

**Phase 3 - Frontend Integration:**

- [ ] UserProvider detects wallet connections
- [ ] Wallet-only users get created automatically on connection
- [ ] User state management works for both user types
- [ ] UI components handle both Farcaster and wallet users correctly
- [ ] **Existing user updates:** When existing users connect wallets, their records are updated seamlessly
- [ ] **Conflict handling:** UI gracefully handles wallet address conflicts

**Phase 4 - Testing & Validation:**

- [ ] New wallet connection creates user with generated username
- [ ] Existing wallet user lookup works correctly
- [ ] Farcaster users unaffected by changes
- [ ] Edge cases handled (disconnection, account switching, etc.)
- [ ] **Existing user address population:** Verify existing users get wallet addresses when connecting
- [ ] **Address conflict scenarios:** Test and validate conflict resolution behavior

### Risk Mitigation

**Backward Compatibility:**

- All existing Farcaster functionality must continue working
- Existing users must not be affected by schema changes
- API endpoints must handle both old and new request formats

**Username Uniqueness:**

- Implement robust collision detection
- Have fallback strategy if generation fails
- Consider prefixing generated usernames (e.g., "wallet_QuickPanda42")

**User Experience:**

- Seamless transition between Farcaster and wallet authentication
- Clear indication of username source (generated vs. Farcaster)
- Handle wallet disconnection gracefully
