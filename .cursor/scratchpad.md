# Background and Motivation

Asterion is a Farcaster mini app for reading and tipping web novels. We have a backend API endpoint (`/api/users`) that checks if a user exists (by Farcaster `fid` or `username`) and creates the user if not. We want to ensure that when a Farcaster user launches the Mini App, the app calls this endpoint to guarantee the user is present in the database, enabling seamless onboarding and data association for tipping, bookmarks, etc.

**Update:**

- Users want to grant spend permissions for USDC (on Base) only. ETH support is not required.
- Spend limit should be a single adjustable value (not daily or monthly).

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

# Executor's Feedback or Assistance Requests

- User state is now managed globally via UserProvider and useUser hook.
- Profile page and tip modal now use the real user object from DB, not mock data.
- All user-dependent features (profile, tipping, etc.) are now wired to the real DB-backed user.
- The bulletproofing for chapter array access and chapter count display in app/novels/[id]/page.tsx is complete. All usages of chapters now use Array.isArray(chapters) ? chapters : [].
- All linter errors related to the Button 'variant' prop and lucide-react have been resolved. Only minor unescaped quote warnings remain in tip-modal.tsx, which do not affect functionality.
- The code is now bulletproof for chapters and tips array access, and all dependencies are installed.
- Please verify in the UI and confirm if everything works as expected.
- USDC token address constant (0xd9aAC23E6A83242c5d306341aCfD7A71A9C6e7B0) has been added to lib/abi/SpendPermissionManager.ts as USDC_ADDRESS.
- SpendPermission component in app/profile/page.tsx now uses only USDC (with correct decimals) for spend permissions. ETH is no longer referenced.
- The spend limit is now a single adjustable value in the user model and passed as a prop to SpendPermission.
- User spend limits are now persisted to and loaded from the database via PATCH /api/users.
- Created `lib/spender.ts` with `getPublicClient` and `getSpenderWalletClient` functions, following the OnchainKit/Viem pattern. This enables backend contract calls using the spender wallet for Spend Permissions.
- Implemented `/api/collect` API route. This route accepts a POST with spendPermission and signature, uses the spender wallet to call approveWithSignature and spend, and returns the transaction hash and status. Next: Add spender wallet env vars to `.env` and test the end-to-end flow.
- Chapter loading is now deferred until the user clicks 'Read Now'. The linter error regarding the 'coin' prop on ChapterReader was fixed. Please verify in the UI that chapters only load after clicking 'Read Now'.

**CRITICAL INVALIDSSIGNATURE BUG ANALYSIS AND FIXES APPLIED:**

I analyzed the persistent `InvalidSignature()` error from 7 different angles and implemented multiple fixes:

1. **UNIQUE SALT GENERATION**: Fixed the primary issue where all spend permissions used `salt: BigInt(0)`, causing hash collisions. Now generates unique salts using timestamp + user address.

2. **CONTRACT ARGUMENT FORMAT**: Fixed Viem passing objects instead of tuples. Changed from passing `contractSpendPermission` object to `spendPermissionTuple` array with proper element ordering.

3. **ADDRESS CHECKSUMMING**: Added `getAddress()` normalization in both frontend and backend to ensure consistent address formatting between signature creation and contract verification.

4. **TYPE CONSISTENCY**: Ensured BigInt values are preserved through the entire flow: Frontend (BigInt) → JSON (string) → Backend (BigInt) → Contract (tuple with BigInt).

5. **ENHANCED LOGGING**: Added comprehensive logging to track types at each step and verify tuple structure sent to contract.

The main changes:

- Frontend: Generate unique salt, normalize addresses with `getAddress()`
- Backend: Convert object to tuple array for contract calls, normalize addresses
- Both: Enhanced logging to track the exact values and types being processed

The user should test the spend permission approval flow again to see if the `InvalidSignature()` error is resolved with these multi-faceted fixes.

**LATEST FIX - SIGNATURE VERIFICATION ADDED:**

Added local signature verification using `verifyTypedData` before sending to contract. This will help us determine if the signature is actually valid for the spend permission structure. If the signature fails local verification, we'll get a clear error message instead of the cryptic `InvalidSignature()` from the contract.

This debugging step will show us whether:

1. The signature is invalid due to wrong message structure
2. The signature is valid locally but the contract rejects it for other reasons (like gas, nonce, or spender permissions)

The enhanced logging will show the verification result, helping us pinpoint the exact cause of the signature failure.

**CRITICAL FIX - EIP-712 MESSAGE FORMAT:**

Fixed the "field type mismatch" error from Coinbase Smart Wallet by ensuring proper EIP-712 message format:

**The Issue**: Coinbase wallet expects string values for uint160/uint48/uint256 types in EIP-712 messages, but we were passing BigInt values directly.

**The Fix**:

- Frontend: Create separate `messageForSigning` with string values for wallet
- Backend: Use string values in `messageForVerification` to match what was signed
- Contract: Still receives proper BigInt values for execution

This ensures the signature is created correctly by the wallet and verified correctly by our backend, while the contract still gets the proper typed values it expects.

**LATEST CHAINID VALIDATION FIX:**

Added chainId validation to ensure user is on Base mainnet (8453) before attempting EIP-712 signing. The "field type mismatch" error from Coinbase Smart Wallet could be caused by:

1. **ChainId Mismatch**: Frontend using dynamic chainId from wagmi but backend verification hardcoded to 8453
2. **Network Issues**: User might not be on the correct network

**The Fix**:

- Added explicit chainId validation in frontend before signing
- Ensures both frontend signing and backend verification use chainId 8453
- Provides clear error message if user is on wrong network

This should resolve the EIP-712 domain mismatch that was causing the "field type mismatch" error from Coinbase Smart Wallet.

**MAJOR FIX - CORRECTED MESSAGE FORMAT:**

Based on a working example, discovered that Coinbase Smart Wallet expects **mixed types in the message**, not string conversions!

**The Issue**: We were converting all BigInt values to strings for EIP-712 signing, but the working example shows:

- `allowance`: BigInt (from parseUnits)
- `period/start/end`: Regular numbers (not BigInt, not strings)
- `salt`: BigInt
- Addresses: Proper address format

**The Fix**:

- **Frontend**: Pass raw `spendPermission` object directly to `signTypedDataAsync`
- **Backend**: Handle mixed types in verification (BigInt for allowance/salt, numbers for period/start/end)
- **Contract**: Convert all numeric values to BigInt for contract calls

**Key Changes**:

1. Removed `messageForSigning` string conversion logic
2. Changed period/start/end from BigInt to regular numbers
3. Used realistic time values (current timestamp + 7 days) instead of max values
4. Updated backend verification to match the signed message format

This aligns with the working example and should resolve the "field type mismatch" error from Coinbase Smart Wallet.

**DATABASE SAVE ISSUE RESOLVED:**

The "Unknown argument `spendPermission`" error was caused by **multiple conflicting Next.js development servers** running simultaneously, not by the Prisma schema or code.

**The Issue**: Multiple `next dev` processes were running, causing API routing conflicts and stale Prisma client instances.

**The Solution**:

1. Killed all running Next.js development servers with `pkill -f "next dev"`
2. Cleared Next.js build cache with `rm -rf .next`
3. Regenerated Prisma client with `npx prisma generate`
4. Started a fresh development server

**Test Results**:

- ✅ Prisma schema is correct (`spendPermission Json?` and `spendPermissionSignature String?`)
- ✅ Database accepts the fields correctly (tested with standalone script)
- ✅ API endpoint now saves `spendPermission` and `spendPermissionSignature` successfully
- ✅ The exact data structure from the original error now works perfectly

The spend permission approval flow should now work correctly from the frontend through to database storage.

**PRISMA IMPORT ERROR FIXED:**

Fixed the PrismaClient import error in `app/api/users/route.ts`:

**The Issue**: `Module '"@prisma/client/index-browser"' has no exported member 'PrismaClient'` error was occurring due to multiple Prisma client instances and browser/server module conflicts.

**The Solution**:

- Replaced custom Prisma client creation with the existing centralized client from `lib/prisma.ts`
- Used proper import: `import { prisma } from '@/lib/prisma';`
- This follows the established pattern used throughout the codebase

**NEW ISSUE DISCOVERED - WebAuthn/Passkey Signatures:**

From the logs, discovered that Coinbase Smart Wallet is returning **WebAuthn/Passkey signatures** (1282 characters) instead of standard EIP-712 signatures (132 characters). This suggests the wallet is using passkey authentication rather than traditional ECDSA signatures.

**Next Steps Needed**:

1. Research how to handle WebAuthn/Passkey signatures with Coinbase Smart Wallet
2. May need to use different verification methods for passkey-based signatures
3. Check Coinbase Smart Wallet documentation for proper signature handling

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
