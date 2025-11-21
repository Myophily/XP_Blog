# Windows XP Blog

A nostalgic blog application styled after Windows XP, built with vanilla JavaScript and the classic XP.css framework. Write, read, and manage blog posts in a beautifully retro interface that brings back the charm of early 2000s computing.

## Live Demo

[My Blog page](https://myophily.pages.dev)

## Features

- **Authentic Windows XP Interface** - Complete with classic window styling, buttons, and that unmistakable Start menu aesthetic
- **User Authentication** - Secure sign-in and registration powered by Supabase
- **Guest Browsing** - View posts without creating an account
- **Create & Manage Posts** - Write blog posts with rich content (authenticated users only)
- **Image Upload Support** - Add images to your blog posts with built-in previews
- **Category Organization** - Browse posts by categories like Programming, Tech, Misc, and more
- **Real-time Status Bar** - Shows current user, post count, and live clock
- **Tab-based Navigation** - Switch seamlessly between Login and Blog views
- **Responsive Post Display** - View detailed posts in XP-styled modal windows
- **XSS Protection** - Built-in HTML escaping for secure content display

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **UI Framework**: [XP.css](https://botoxparty.github.io/XP.css/) - Windows XP styling
- **Backend & Auth**: [Supabase](https://supabase.com/) - Authentication and PostgreSQL database
- **Architecture**: Single-page application with tab-based navigation

## Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A [Supabase](https://supabase.com/) account (free tier works great)
- A local web server (Python, Node.js, or any HTTP server)

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/Myophily/XP_Blog.git
   cd YOUR_REPO_NAME
   ```

2. **Set up Supabase**

   a. Create a new project at [supabase.com](https://supabase.com/)

   b. In your Supabase project dashboard, go to **Settings > API**

   c. Copy your **Project URL** and **anon public** key

   d. Create the `posts` table in your Supabase database:

   ```sql
   CREATE TABLE posts (
     id BIGSERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     author_email TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

   -- Allow anyone to read posts
   CREATE POLICY "Posts are viewable by everyone"
     ON posts FOR SELECT
     USING (true);

   -- Allow authenticated users to insert posts
   CREATE POLICY "Authenticated users can create posts"
     ON posts FOR INSERT
     WITH CHECK (auth.role() = 'authenticated');
   ```

3. **Configure your Supabase credentials**

   Open `app.js` and replace the placeholder values on lines 2-3:

   ```javascript
   const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; // Replace with your Project URL
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"; // Replace with your anon public key
   ```

4. **Run the application**

   Choose one of these methods to serve the application:

   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Node.js http-server
   npx http-server

   # Or simply open index.html in your browser
   ```

5. **Access the application**

   Open your browser and navigate to `http://localhost:8000` (or the port shown by your server)

## Usage

### Guest Mode

- Click **"Continue as Guest"** on the login screen to browse posts without authentication
- View all published blog posts
- Filter posts by category using the sidebar tree view
- Guest users cannot create or manage posts

### Creating an Account

1. Click the **"Register"** button on the login screen
2. Enter your email and password
3. Check your email for the confirmation link
4. Click the confirmation link to activate your account
5. Sign in with your credentials
6. If you have created an account, please modify it to `<button type="button" id="register-btn" disable>` to prevent the creation of additional accounts.

### Writing Posts

1. Sign in to your account
2. The post creation form appears automatically after login
3. Enter your post title and content
4. (Optional) Upload images using the image upload button
5. Click **"Publish"** to share your post
6. Click **"Reset"** to clear the form

### Browsing Posts

- Click on any post title to view the full content in a modal window
- Use the category tree in the sidebar to filter posts
- The status bar shows the total number of posts and current time

## Project Structure

```
.
├── index.html          # Main HTML structure with XP-styled UI
├── app.js              # All JavaScript (auth, posts, UI management)
├── style.css           # Custom CSS enhancements to XP.css
├── bg.jpg              # Background bliss wallpaper
├── booting.gif         # Loading animation
├── favicon.ico         # Windows XP favicon
└── icon.png            # Application icon
```

## Security Notes

- The Supabase `anon` key is safe to expose in client-side code (it's designed for public use)
- Row Level Security (RLS) policies protect your database from unauthorized access
- Never commit actual `.env` files or private keys to version control
- XSS protection is implemented via the `escapeHtml()` function for all user-generated content

## Acknowledgments

- [XP.css](https://botoxparty.github.io/XP.css/) by botoxparty - for the amazing Windows XP styling
- [Supabase](https://supabase.com/) - for the backend infrastructure
- The Windows XP design team at Microsoft - for the iconic aesthetic we all miss

---

Made by Myophily, Assisted by Claude sonnet 4.5, 2025
