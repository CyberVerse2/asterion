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
- [x] Sort novels by rank on home page

**NEW TASK - Rich OnchainKit Wallet Components:**

- [x] Create OnchainKitProvider for proper component configuration
- [x] Update HeaderWallet to use rich OnchainKit components (Wallet, ConnectWallet, Identity, Avatar, Name, Address, WalletDropdown)
- [x] Add OnchainKit styles import to layout
- [x] Update layout.tsx to include OnchainKitProvider wrapper
- [x] Replace profile button with wallet-based profile access
- [x] Test rich wallet components functionality and styling

**NEW TASK - Profile Page Basename Integration:**

- [x] Update profile page to use OnchainKit Identity components for wallet-only users
- [x] Implement conditional display logic: OnchainKit components for wallet users, standard UI for Farcaster users
- [x] Enable automatic Basename and wallet avatar display for wallet-connected users
- [x] Limit tipping history to 5 most recent entries in API and profile display
- [x] Test wallet user profile display with Basename support

# NEW FEATURE: Use ERC-20 Approve for Farcaster Users

## Background and Motivation

Currently, both wallet-only and Farcaster users use an EIP-712 signature-based spend permission flow. For Farcaster users, we want to switch to the standard ERC-20 `approve` function, which is a direct on-chain transaction, for granting USDC spend permissions. Wallet-only users will continue to use the EIP-712 flow.

## Key Challenges and Analysis

- **User Detection:** Must reliably distinguish Farcaster users from wallet-only users in the UI and logic.
- **UI Consistency:** The UI should look the same for both user types, but the underlying logic for the "Approve Spend" button must differ.
- **On-chain Transaction:** Farcaster users must sign an on-chain transaction for `approve`, which may require gas and wallet interaction.
- **Allowance Management:** Need to ensure the app checks and displays the current allowance for USDC for Farcaster users.
- **Error Handling:** Must handle transaction failures, user rejection, and display appropriate feedback.
- **Testing:** Both flows must be tested to ensure no regression for wallet-only users.

## High-level Task Breakdown

1. **Detect Farcaster User in Spend Permission UI**

   - Use the same logic as UserProvider/profile to determine if the user is a Farcaster user.
   - **Success Criteria:** UI logic can reliably distinguish Farcaster vs wallet-only users.

2. **Implement ERC-20 Approve Flow for Farcaster Users**

   - When a Farcaster user clicks "Approve Spend", trigger an on-chain transaction to call `approve(spender, amount)` on the USDC contract.
   - Use wagmi's `useContractWrite` or ethers.js for the transaction.
   - **Success Criteria:** Farcaster users can successfully approve USDC spend via standard ERC-20 approve.

3. **Retain EIP-712 Flow for Wallet-only Users**

   - Keep the existing EIP-712 signature-based spend permission for wallet-only users.
   - **Success Criteria:** Wallet-only users experience no change in their flow.

4. **Unify UI/UX for Both Flows**

   - The "Approve Spend" button and spend limit input should look the same for both user types.
   - Show appropriate loading, success, and error states for each flow.
   - **Success Criteria:** Users cannot tell the difference in UI, only in wallet interaction.

5. **Display Current Allowance for Farcaster Users**

   - Query and display the current USDC allowance for the spender contract for Farcaster users.
   - **Success Criteria:** Farcaster users see their current allowance in the UI.

6. **Testing and Error Handling**
   - Test both flows (Farcaster and wallet-only) for all edge cases: success, rejection, failure, and allowance updates.
   - **Success Criteria:** All flows work as expected, errors are handled gracefully, and no regression for wallet-only users.

# Project Status Board

- [x] Detect Farcaster user in spend permission UI
- [x] Implement ERC-20 approve flow for Farcaster users
- [x] Retain EIP-712 flow for wallet-only users
- [x] Unify UI/UX for both flows
- [x] Display current allowance for Farcaster users
- [x] Test both flows and handle errors
- [x] Add rating field to Novel model and update UI

# Executor's Feedback or Assistance Requests

**Progress Update:**

- ✅ ERC-20 approve flow for Farcaster users is complete and working
- ✅ Database saving works for both user types after spend permission
- ✅ Tipping works for both Farcaster (ERC-20) and wallet-only (EIP-712) users
- ✅ Added rating field to Novel model in Prisma schema
- ✅ Updated Novel interface and UI to display actual rating from database
- ✅ Database schema updated successfully with `npx prisma db push`

**Current Status:**

- The ERC-20 approve feature is fully implemented and tested
- Novel pages now display the actual rating from the database instead of random values
- Ready for any additional features or improvements
