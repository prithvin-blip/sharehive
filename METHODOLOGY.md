# Share Hive — System Architecture & Development Methodology Document

This document outlines the end-to-end engineered design, codebase architecture, Firestore database schema, and standard step-by-step methodology for the **Share Hive** Peer-to-Peer (P2P) campus/neighborhood sharing marketplace. 

---

## 1. Executive Summary & Core Concept
**Share Hive** is a modern, high-trust, localized peer-to-peer rental and sharing platform. Built to alleviate the economic burden of single-use goods (specifically for students on university campuses or residents in tight-knit neighborhoods), it enables seamless sharing of micro-assets like textbooks, cameras, scientific calculators, sports gear, and tools. 

### Core Value Offerings:
*   **Hyper-local exchange:** Leverage built-in coordinate visualization to identify items within reach.
*   **Frictionless Negotiation:** Integrated horizontal real-time message rooms tied to asset leases.
*   **Decentralized Demand ("Broadcast Requests"):** A local bulletin board system where users can broadcast what they need if it is currently unavailable on the marketplace.
*   **Safety Safeguards:** Double-handshake confirmation loops, lender claim confirmations, and active-to-unlisted item toggle safety prompts to avoid accidental listings or unlistings.

---

## 2. Product & Feature Architecture

The system is compiled using a modular single-page React architecture. It segregates logic into distinct, manageable functional boundaries:

```
  ┌────────────────────────────────────────────────────────┐
  │                        USER ID                         │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                      APP LAYOUT                        │
  └─────┬──────────────┬──────────────┬─────────────┬──────┘
        │              │              │             │
        ▼              ▼              ▼             ▼
  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
  │ Dashboard │  │Marketplace│  │   Sell    │  │  Profile  │
  │   View    │  │   Feed    │  │   Flow    │  │& Listings │
  └───────────┘  └─────┬─────┘  └───────────┘  └─────┬─────┘
                       │                             │
                       ▼                             ▼
                 Interactive Map              Unlist Dialog
```

1.  **Authentication Guard (`AuthScreen`):** Secures entry using email/password authentication via Firebase, building a global reactive secure user hook (`useAuth`).
2.  **The Home Dashboard (`Dashboard`):** Centralizes current transactional activity, displays active leases (borrowed/lent), and coordinates active "Broadcast Boards" to match supply with real-time demands.
3.  **The Market Grid (`Marketplace`):** Implements fluid asset searching, active category filtration, interactive geographic pickup location visualization on full Maps (using `leaflet` / `react-leaflet`), and a direct-to-owner conversation portal.
4.  **Registering Inventory (`SellFlow`):** A custom creation wizard checking pricing models (flat hourly vs. daily pricing structures), asset categorization (Electronics, Academics, Outing, Household), and expectations.
5.  **Activity & Operations Ledger (`Profile`):** Manages registered assets with an "available", "rented", and "unlisted" status controller. Implements double-action safety overlays (confirmation prompts) before items are removed from search results.

---

## 3. Comprehensive Step-by-Step Methodology

Executing the concept into a production-grade container application follows this detailed structural methodology:

---

### Phase 1: Research, Discovery, & Competitor Analysis
*   **Target Market Research:** Campus-wide sharing environments encounter significant high-friction setups. Students need immediate items for short durations but struggle with storage space and high purchase costs.
*   **Competitor Benchmarking (The "Boro" App Model):**
    *   *Competitor Limitation:* Traditional apps rely on delayed email responses, lack maps, and have no centralized bulletin board to register immediate gaps in local supply.
    *   *Share Hive Improvement:* Introduce **Real-time instant messaging**, **Interactive dynamic pickup maps**, and a live decentralized **Broadcast Bulletin** for custom on-demand requests.

---

### Phase 2: System Architecture & Data Schema
Our backend uses lightweight, reactive document structures in **Firebase FireStore** mapped via distinct types:

#### Colections Layout:
```typescript
interface User {
  id: string;
  displayName: string;
  photoURL: string;
  lenderRating: number;
  borrowerRating: number;
  email: string;
  phoneNumber?: string;
}

interface Item {
  id: string;
  title: string;
  category: string;
  images: string[];
  description: string;
  price: number;
  priceType: 'hour' | 'day';
  expectations: string;
  ownerId: string;
  status: 'available' | 'rented' | 'unlisted';
  createdAt: number;
}

interface BroadcastRequest {
  id: string;
  title: string;
  requesterId: string;
  createdAt: number;
  status: 'open' | 'fulfilled';
}

interface Transaction {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  status: 'pending' | 'approved' | 'handover_pending' | 'active' | 'returned' | 'rejected' | 'cancelled';
  price: number;
  pickupLocation?: string;
  lenderClaimsConfirmed?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  itemId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: any;
  unread: boolean;
}
```

---

### Phase 3: UI/UX & Flow Design

Using Tailwind CSS and the modern spacing framework, the application utilizes a gorgeous **Cosmic Slate Theme** (light mode with crisp borders, elegant graphite gray cards, and high-trust amber indicators) that avoids the "AI Template" look:

*   **Fluid Spatial Rhythm:** Focuses on generous padding (`p-6` to `p-8`) alongside comfortable, rounded bounds (`rounded-3xl`).
*   **Interactive Handover Loop Flow:**
    1.  *Inquiry:* Borrower triggers chat directly from Item Modal.
    2.  *Rental Request:* Borrower specifies parameters (Pricing + Location coordinate confirmation).
    3.  *Acceptance:* Lender receives request, reviews the Borrower's score, and approves.
    4.  *Handover Confirmed:* Borrower and Lender physically meet. The Lender taps "Mark Handed Over" to active the lease safety protocol.
    5.  *Return Code:* Borrower returns the asset, Lender marks the item "Returned," instantly restoring the item status to `'available'`.

---

### Phase 4: Full Stack React Implementation
*   **Client Core Engine:** Built upon Vite and React 19 to enable native ESM loading speeds.
*   **Style Foundations:** Powered by `@tailwindcss/vite` and `@tailwindcss/post-css` for a zero-configuration, supercharging style loader.
*   **Interactive Visualizations:** `react-leaflet` loads geo-coordinate nodes directly into DOM canvases dynamically observing container resizes to re-center markers gracefully.
*   **Icon Styling:** Handled via `lucide-react` using unified size bounds (`w-5 h-5` and `w-12 h-12` states) to secure visual weight consistencies.

---

### Phase 5: Verification, Quality Assurance, & Testing
We apply a strict multi-layered validation routine to ensure the system does not crash or exhibit regressions:

1.  **Static Logic Validation:**
    *   Command: `npm run lint` (`tsc --noEmit`)
    *   Schedules code analyzer passes to catch broken typings or mismatching JSX tag terminations.
2.  **App Assembly Check:**
    *   Command: `npm run build`
    *   Secures production packager compatibility and file minification parameters.
3.  **UI Core Experience Checks:**
    *   Manual and programmatic verification of modal state management.
    *   Verifying that toggling items to unlisted state pops up a warning modal explaining that active leases and past items remain intact, before processing the Firestore update.

---

### Phase 6: Production Launch & Deployment Blueprint
The application is deployed as a fully scalable container:

*   **Runtime:** Deployed to Google Cloud Run to provide scalable runtime parameters.
*   **Production Build Output:** Bundles source maps and code split configurations into `/dist` via production transpilation.
*   **API Security Configuration:** All environment credentials (including the Firebase project parameters) are mapped in `.env.example` and locked safely behind environment system configs - never exposing API secrets to public codebases.

---

### Phase 7: Planned Enhancements, Optimizations, & Iteration
Following the high-fidelity launch, incremental iteration focuses on:

1.  **Reputation Scoring Matrix:** Automated updates to `lenderRating` and `borrowerRating` upon lease completions.
2.  **Instant Notifications:** Realtime Service Workers listening for updates to active `Transaction` nodes inside FireStore.
3.  **Advanced Geofencing:** Integration of Google Maps Platform to establish radius constraints, ensuring users only match with other hyper-local neighborhood members.

---
*Document formulated and synchronized to active codebase repository. Last Modified: June 2026.*
