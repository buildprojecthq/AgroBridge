# AgroBridge 🌱

AgroBridge is a comprehensive mobile platform built with React Native and Supabase, designed to directly connect farmers with buyers. By eliminating middlemen, AgroBridge empowers farmers with better margins and provides buyers with guaranteed fresh, IoT-monitored produce through a secure escrow marketplace.

## 🌟 Key Features

### 1. Dual-Sided Marketplace (B2C & B2B)
- **Role-Based Workflows:** Distinct dashboards for Farmers (Sellers) and Buyers.
- **Farmer-to-Farmer (B2B):** Unique architecture allowing farmers to also act as buyers, enabling them to purchase bulk supplies from other farmers.
- **Live Inventory Engine:** Real-time quantity tracking with secure, server-side deduction via Postgres RPC to prevent over-selling.

### 2. Secure Escrow Payments
- **Buyer Protection:** Funds are held securely in a mock escrow state when an order is placed.
- **Delivery Confirmation:** Only the buyer who placed the order has the authorization to release the funds to the seller upon successful delivery.
- **Dynamic UIs:** Real-time status badges (Pending, Escrow Locked, Completed) update instantly across devices.

### 3. Real-Time Chat & Negotiation
- **Live Messaging:** Powered by Supabase Realtime, users can chat instantly regarding specific orders.
- **Interactive Price Negotiation:** Buyers and sellers can send, accept, or reject new price offers directly within the chat UI.
- **Push Notifications:** Local notifications alert users to new messages and order status changes.

### 4. IoT Hardware Integration
- **Telemetry Dashboard:** Farmers can link their hardware gateways (ESP32) by entering their Device ID.
- **Live Environmental Data:** Monitors crop storage conditions (Temperature, Humidity, Gas Levels) via `public.storage_telemetry`.
- **Trust Badges:** Crops from farmers with linked IoT devices display a "Verified Fresh" badge in the marketplace.

### 5. Smart Multilingual Support
- **Dynamic Edge Translation:** User-inputted crop names (e.g., entering "Tomato" in English) are dynamically translated into local languages (e.g., Hindi) using a Supabase Edge Function (`translate-crop`).
- **UI Localization:** Standard app navigation and static text are fully localized using `react-i18next`.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo), TailwindCSS (NativeWind), React Navigation.
- **Backend as a Service:** Supabase.
- **Database:** PostgreSQL (with Row Level Security & Stored Procedures).
- **Realtime:** Supabase Channels (WebSockets) for Chat and Order status.
- **Serverless:** Supabase Edge Functions (Deno/TypeScript) for external API integrations.
- **Charts:** `react-native-chart-kit` for rendering dynamic market price trends.

---

## 📂 Project Structure

```text
AgroBridge/
├── agrobridge-app/                 # React Native Mobile Application
│   ├── src/
│   │   ├── config/                 # Supabase client initialization
│   │   ├── context/                # Auth context and global state
│   │   ├── navigation/             # MainTabNavigator and Stack configs
│   │   ├── screens/                # UI Screens (Auth, Buyer, Farmer, Chat, etc.)
│   │   └── utils/                  # Translation, Notifications, and helpers
├── agrobridge-backend/             # Backend configurations
│   └── supabase/
│       └── functions/              # Deno Edge Functions (translate-crop)
└── supabase_schema.sql             # Complete PostgreSQL schema, RLS policies, and RPCs
```

---

## 🔒 Security & Architecture (RLS)

AgroBridge relies heavily on **Supabase Row Level Security (RLS)** to ensure data privacy and prevent unauthorized actions:
- **Hardware Isolation:** Farmers can only view and link their own IoT hardware.
- **Order Visibility:** Buyers can only view their own purchases; Farmers can view orders placed on their specific crops.
- **Escrow Authorization:** The UI and DB enforce that sellers cannot manipulate their own escrow payouts.
- **Secure Inventory Deduction:** Inventory deduction bypasses client-side restrictions via a `SECURITY DEFINER` Postgres Stored Procedure, preventing unauthorized direct updates to the crops table.

---

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Expo CLI (`npm install -g expo-cli`)
- A Supabase Project

### 1. Database Setup
Copy the entire contents of `supabase_schema.sql` and run it in your Supabase SQL Editor. This will generate all required tables, triggers, RPCs, and RLS policies.

### 2. Environment Variables
In the `agrobridge-app` folder, ensure your `supabase.js` is configured with your project's URL and Anon Key.

### 3. Run the App
```bash
cd agrobridge-app
npm install
npm start
```
Use the Expo Go app on your physical device or run it on an iOS/Android emulator.
