# Sales Funnel Professor Image Generator

This tool allows you to generate image variations of the "Sales Funnel Professor" character performing different actions, using the Google Gemini API. It leverages reference images to maintain character consistency.

This project is designed for deployment on [Vercel](https://vercel.com/).

## Features

*   Generates 10 image variations based on a text prompt describing an action.
*   Uses provided reference images (`Mascot-Exclamation-100.png`, `SalesFunnelProfessorLogo.300.png`, etc.) to guide the AI.
*   Utilizes the `gemini-2.0-flash-exp-image-generation` model.
*   Securely handles the Gemini API key using Vercel Environment Variables and a serverless function.
*   Dark mode UI.

## Project Structure

```
.
├── api/
│   └── generate.js   # Vercel Serverless Function (handles API calls)
├── cline_docs/
│   └── memory.md     # Cline's Memory Bank (internal use)
├── .gitignore        # Specifies intentionally untracked files that Git should ignore
├── index.html        # Main HTML structure
├── package.json      # Project metadata (mainly for Vercel build info)
├── README.md         # This file
├── script.js         # Frontend JavaScript logic
├── style.css         # CSS styling
├── BadResultMascot-1794x2048.png  # Reference Image
├── Go-to-Market-Strategy.webp     # Reference Image
├── Horrified-Professor.webp       # Reference Image
├── Mascot-Exclamation-100.png     # Reference Image
├── SalesFunnelProfessorLogo.300.png # Reference Image
└── TravelingProfessor.webp        # Reference Image
```
*(Note: `server.js` is removed as it's only for local testing without Vercel)*

## Deployment to Vercel

1.  **Push to GitHub:** Create a new repository on GitHub and push this project's code to it.
2.  **Import Project on Vercel:**
    *   Go to your Vercel dashboard.
    *   Click "Add New..." -> "Project".
    *   Import the GitHub repository you just created.
3.  **Configure Environment Variable:**
    *   In your Vercel project settings, navigate to "Environment Variables".
    *   Add a **New Environment Variable**:
        *   **Name:** `GEMINI_API_KEY`
        *   **Value:** Paste your actual Google Gemini API key here.
        *   Ensure the variable is available to all environments (Production, Preview, Development).
    *   **Important:** Keep your API key secure. Do **not** commit it directly to your code or GitHub repository.
4.  **Deploy:** Vercel should automatically detect the project structure (static frontend + `/api` directory) and deploy it. If prompted for build settings, the defaults for a static site with Node.js functions should work.
5.  **Access:** Once deployed, Vercel will provide you with a URL to access the live application.

## Local Development & Testing

While the primary deployment method is Vercel, you might want to test locally. Due to browser security restrictions (`file:///` CORS policy), simply opening `index.html` won't allow the reference images to load automatically.

**Recommended Local Testing Method:**

1.  **Install Vercel CLI:** If you haven't already, install the Vercel CLI: `npm install -g vercel`
2.  **Login:** `vercel login`
3.  **Link Project:** Navigate to your project directory in the terminal and run `vercel link` to connect it to your Vercel project.
4.  **Run Development Server:** Run `vercel dev`.
    *   This command starts a local development server that mimics the Vercel environment.
    *   It automatically loads environment variables (like `GEMINI_API_KEY`) from your linked Vercel project (or a local `.env.local` file if you create one - **do not commit `.env.local`**).
    *   It serves the static files and runs the serverless function in `api/generate.js`.
5.  **Access:** Open the `localhost` URL provided by `vercel dev` in your browser. The application should now work locally, including automatic image loading and API calls via the function.

*(Alternative, less accurate local testing: You could temporarily uncomment the `server.js` line in `.gitignore`, run `npm start`, and access via `http://localhost:PORT`. However, this doesn't test the serverless function interaction, only the frontend parts.)*

## How it Works

1.  **Frontend (`index.html`, `script.js`, `style.css`):**
    *   Provides the user interface.
    *   On page load (`DOMContentLoaded`), `script.js` attempts to load the reference images placed in hidden `<img>` tags.
    *   It uses the Canvas API (`toDataURL`) to convert the loaded images to Base64 format.
    *   When the user enters a prompt and clicks "Generate Images", the script sends the prompt and the Base64 image data to the backend serverless function (`/api/generate`).
2.  **Backend (`api/generate.js` - Vercel Serverless Function):**
    *   Receives the request from the frontend.
    *   Retrieves the `GEMINI_API_KEY` securely from Vercel's environment variables.
    *   Constructs the payload for the Google Gemini API, including the prompt and Base64 image data.
    *   Makes 10 parallel calls to the Gemini API's `streamGenerateContent` endpoint.
    *   Processes the streamed responses from Gemini, extracting any generated Base64 image data.
    *   Returns a JSON response to the frontend containing an array of successfully generated images (`{ images: [...] }`).
3.  **Frontend (`script.js`):**
    *   Receives the JSON response from the serverless function.
    *   Displays the received images in the results grid.
    *   Shows status messages to the user.
