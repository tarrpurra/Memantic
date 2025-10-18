# Mementic Project Overview
![Mementic Overview](./images/1.jpg)
![Intro](./images/2.jpg)
## Index
- [Mementic Project Overview](#mementic-project-overview)
  - [Index](#index)
  - [Introduction - Built for creators. Powered by culture. Minted on-chain.](#introduction---built-for-creators-powered-by-culture-minted-on-chain)
  - [How It Works](#how-it-works)
  - [Tech Stack](#tech-stack)
  - [On-Chain Architecture](#on-chain-architecture)
  - [Features](#features)
  - [Monetization](#monetization)
  - [Roadmap](#roadmap)
  - [Team](#team)
  - [Submission Summary](#submission-summary)
  - [Prerequisites](#prerequisites)
  - [Running the project locally](#running-the-project-locally)
    - [Quick Setup (Recommended)](#quick-setup-recommended)
    - [Manual Setup](#manual-setup)
    - [Environment Variables](#environment-variables)
    - [Note on frontend environment variables](#note-on-frontend-environment-variables)
  - [Contributing](#contributing)
- [Mementic](#mementic)


## Introduction - <u>Built for creators. Powered by culture. Minted on-chain.</u>

![Introduction](./images/3.jpg)

Mementic is a Web3-native platform that uses AI to generate memes and mints top-rated content as NFTs.

## How It Works
![How It Works](./images/4.jpg)
Users submit prompts, generate memes via AI, vote or stake ICP on the best ones, and earn when memes go viral.

## Tech Stack
![Tech Stack](./images/5.jpg)
Built on Internet Computer (ICP) using React for frontend, Rust/Motoko Canisters for backend, and t-ECDSA for secure NFT minting.

## On-Chain Architecture
All content and voting logic is fully on-chain. AI integration is handled via HTTP outcalls to external APIs.

## Features
![Tech Stack](./images/6.jpg)
- AI meme generation
- MemeStaking
- Community voting
- NFT minting with royalties
- On-chain meme gallery

## Monetization
![Tech Stack](./images/7.jpg)
- Meme generation fees
- NFT minting
- Sponsored meme contests
- Meme licensing

## Roadmap
Future roadmap includes:
- MemeDAO for curation
- Trending prompt engine
- Meme agents that adapt to culture
- Cross-platform meme analytics

## Team
Team consists of fullstack developers, AI specialists, Web3 designers, and growth leads with strong ICP knowledge.

## Submission Summary
The product demonstrates full-stack Web3 development, smart contract complexity, and innovative use of AI and decentralized storage.

Submitted to WCHL25 with full GitHub repo, documentation.

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- [Internet Computer SDK (dfx)](https://internetcomputer.org/docs/current/developer-docs/setup/install)
- [Git](https://git-scm.com/)

## Running the project locally

### Quick Setup (Recommended)

### Manual Setup

If you prefer to set up manually or are on a different platform, follow these steps:

```bash
# Starts the replica, running in the background
dfx start --background --clean

# Deploys your canisters to the replica and generates your candid interface
# Before make sure env file is created with the all the necessary enviroment
dfx deploy
```

!!IMPORTANT please make sure you have created an env file in the ```src\Mementic_frontend``` folder

### Environment Variables

Create a `.env` file in the `src/Mementic_frontend` directory with the following optional variables:

```env
VITE_AGENT_HOST=http://localhost:4943
VITE_INTERNET_IDENTITY_HOST=https://id.ai/ # override if you run your own Internet Identity instance
VITE_II_ORIGIN=http://127.0.0.1:4943
VITE_CANISTER_ID_MEMENTIC_BACKEND=uxrrr-q7777-77774-qaaaq-cai or use <Your-backend-Canister-ID>
DEV = true for local else false
```

#### Google Sign-In via Internet Identity 2.0

Mementic now delegates Google authentication to [Internet Identity 2.0](https://id.ai/). No additional OAuth client configuration is required—when the login popup opens, choose the Google option inside the Internet Identity 2.0 flow. If you self-host Internet Identity or want to target a staging environment, set `VITE_INTERNET_IDENTITY_HOST` to the appropriate URL.


Once the job completes, your application will be available at `http://localhost:4943?canisterId={asset_canister_id}`.

If you have made changes to your backend canister, you can generate a new candid interface with

```bash
generate-did Mementic_backend
```

at any time. This is recommended before starting the frontend development server, and will be run automatically any time you run `dfx deploy`.

If you are making frontend changes, you can start a development server with

```bash
npm start
```

Which will start a server at `http://localhost:8080`, proxying API requests to the replica at port 4943.

### Note on frontend environment variables

If you are hosting frontend code somewhere without using DFX, you may need to make one of the following adjustments to ensure your project does not fetch the root key in production:

- set`DFX_NETWORK` to `ic` if you are using Webpack
- use your own preferred method to replace `process.env.DFX_NETWORK` in the autogenerated declarations
  - Setting `canisters -> {asset_canister_id} -> declarations -> env_override to a string` in `dfx.json` will replace `process.env.DFX_NETWORK` with the string in the autogenerated declarations
- Write your own `createActor` constructor
![Tech Stack](./images/9.jpg)

## Weekly Rollover Operations

### Week boundary logic
Mementic groups memes into calendar weeks using UTC boundaries. The backend exposes helper functions that compute a `week_id = floor(timestamp_secs / 604800)` and stores the value with every meme. An optional signed offset (default `0`) can be applied to support alternative boundaries such as IST; the offset is persisted in stable memory and can be updated with the `admin_set_week_offset` canister method.

### Automatic timers
During `init` and `post_upgrade` the backend arms an hourly `ic_cdk_timers::set_timer_interval` callback. The timer runs an immediate catch-up check and then continues to invoke the rollover logic every hour which:

1. Detects when the calendar week has changed.
2. Finalizes the previous week’s memes (marks them `Finalized`, stamps `finalized_at`, and sets `week_ended = true`).
3. Snapshots the top votes into a stable `FINALIZED_LEADERBOARDS` map and resets live vote tallies.
4. Advances the active week id so that the pre-marketplace only exposes fresh memes.

Because the operation is idempotent it is safe to leave the timer running even if no new memes were posted.

### Manual rollover
For operational recovery or demo purposes you can force a rollover with `dfx canister call Mementic_backend admin_rollover_now`. The call performs the same steps as the timer based workflow and is guarded only by the canister allowlist.

### Legacy meme migration
Existing meme records created before this change remain in stable memory. When a new meme is published through `publish_meme` it is automatically registered with the weekly index so the new queries return the same objects. For older deployments you may run a one-off migration that reads previous entries, computes the week from `created_at`, and inserts them via the same registration routine—this keeps `NEXT_MEME_ID` in sync and ensures portfolios can reference historical weeks.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.


# Mementic

