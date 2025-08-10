# Animaid Setup Guide

This guide will walk you through the necessary steps to configure Animaid to use the AniList API for authentication and data fetching.

The most common issue during setup is an incorrect **Redirect URL**, which can lead to errors like `unsupported_grant_type` or `redirect_uri mismatch`. Following these steps carefully will help you avoid this.

## Configuration Steps

### 1. Create an AniList API Client

*   First, you need an AniList account. If you don't have one, create it.
*   Navigate to the API settings page: [https://anilist.co/settings/api](https://anilist.co/settings/api)
*   Click the **"Create New Client"** button.

### 2. Client Details

*   **Client Name**: Give your client a descriptive name, for example: `Animaid App`.
*   **Client Type**: Leave this as `Web`.

### 3. Redirect URL (Most Important Step!)

This is the most critical step for the login flow to work correctly.

The **Redirect URL** is the exact URL where AniList will send you back after you authorize the application. The application code is designed to automatically handle the login when you are redirected.

The URL you enter here **must exactly match** the URL where you are running the Animaid application in your browser.

#### For Production (animaid.vercel.app)

The official production instance of this application is hosted at `https://animaid.vercel.app`.

*   When configuring your AniList API Client, you **must** use `https://animaid.vercel.app` as the Redirect URL for the login to work on the live site.

#### For Local Development:

If you are running the app on your local machine for development, the URL in your browser is likely `http://localhost:PORT` or `http://127.0.0.1:PORT`. The port can vary (e.g., 3000, 5173, 8080).

*   Check the address bar of your browser when running the app.
*   Copy that URL (e.g., `http://localhost:3000`) and paste it into the "Redirect URL" field on the AniList client settings page.

**Tip:** You can add multiple redirect URLs by separating them with a new line. It's a good practice to add both your production URL (`https://animaid.vercel.app`) and your local development URL.

### 4. Save and Get Client ID

*   Click "Save" to create the client.
*   AniList will now show you a `Client ID` and a `Client Secret`.
*   **This application only needs the `Client ID`**. The `Client Secret` is not used directly in the client-side code; it is handled by the backend proxy for security.
*   The application's default Client ID is `14401`. This ID is already configured for the official production URL. If you create your own client, you will need to update the ID in `context/AuthContext.tsx`.

Once these steps are completed, the "Conectar con AniList" button in the app's settings should work correctly on both your local machine and the live `animaid.vercel.app` site.
