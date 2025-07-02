# Asterion: Read & Tip Novels on Farcaster

Asterion is a Farcaster mini app that lets users read web novels for free and tip authors directly—on-chain, transparently, and with creator-first economics. Built for the Zora Coinathon, Asterion reimagines the web novel experience by leveraging Zora v4 coins, wallet-based tipping, and deep Farcaster integration.

## Motivation

Current web novel platforms are expensive for readers, restrictive for authors, and lack transparency:

- Reading a full novel can cost $300+
- App stores and platforms take large revenue cuts (up to 80%+)
- Authors are locked into daily publishing contracts, often at the expense of quality

Asterion solves these problems by making every novel a Zora v4 coin, enabling direct, transparent tipping, and giving authors more freedom and a larger share of earnings.

## Key Features

- **Read Novels for Free:** Browse and read novels directly in the app.
- **Zora v4 Coin for Each Novel:** Every novel is a Zora v4 coin, enabling on-chain tipping and ownership.
- **Wallet-Based Tipping:** Users tip authors by sending a "love" reaction to chapters, using their in-app wallet.
- **Supporters Tab:** Each novel displays its top 100 supporters, with perks for major supporters.
- **Clip Sharing:** Capture and share clips from chapters directly to the Farcaster feed.
- **Notifications:** Get notified when new chapters are released for your favorite novels.
- **In-App Reading Tools:** Enhanced reading experience with built-in tools.
- **Farcaster-Native Comments:** Novels are posts, and comments are Farcaster-native.
- **Profile & Tipping History:** Users can view their tipping history and bookmarks in their profile.

## User Flow

1. **Add Asterion to Farcaster:** User opens the app and adds it to their Farcaster account.
2. **Configure Spend Permissions:** User sets up wallet permissions for tipping.
3. **Browse Popular Novels:** Home page displays trending and popular novels.
4. **Read & Tip:** Open a novel, read chapters, and double-click to send a love/tip.
5. **Track Support:** View your tipping history and bookmarks in your profile.
6. **Engage:** Share clips, comment, and interact with the community.

## Data Model

- **User**
  - Farcaster username
  - Novels (array)
  - Tips (array of objects)
    - Novel ID
    - Amount tipped
  - Bookmarks
- **Novel**
  - Title and details
  - Tips:
    - Username
    - Tip amount
    - Date

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI
- **Blockchain:** Zora v4 coin SDK, Minikit
- **Backend/Data:** MongoDB, Prisma (planned)
- **Other:** Farcaster integration, custom hooks, reusable UI components

## Getting Started

1. **Install dependencies:**
   ```sh
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```
2. **Run the development server:**
   ```sh
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```
3. **Open in browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Extending the Project

- Integrate real blockchain and Farcaster APIs
- Add more reading tools and personalization features
- Expand notifications and supporter perks
- Enable real-time comments and social features
