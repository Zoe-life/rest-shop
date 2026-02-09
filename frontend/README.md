# Rest Shop Frontend

A modern, responsive e-commerce frontend built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Beautiful UI** with saffron and navy blue theme colors
- 🌓 **Day/Night Mode** toggle for comfortable viewing
- 📱 **Fully Responsive** design for all screen sizes
- 🔐 **Authentication** with JWT tokens
- 🛍️ **Product Browsing** with clean card layouts
- 📦 **Order Management** for authenticated users
- ⚡ **Fast Performance** optimized for Cloudflare Pages

## Tech Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Backend API running (see main README)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your API URL:
   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   
   The app will open at [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Deployment to Cloudflare Pages

### Option 1: Using Wrangler CLI

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Build the app:
   ```bash
   npm run build
   ```

4. Deploy to Cloudflare Pages:
   ```bash
   wrangler pages deploy build --project-name=rest-shop-frontend
   ```

### Option 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `frontend`
   - **Environment variables**: 
     - `REACT_APP_API_URL`: Your backend API URL
5. Click **Save and Deploy**

### Environment Variables for Production

In Cloudflare Pages settings, add:

```
REACT_APP_API_URL=https://your-api-domain.com
```

Replace with your actual backend API URL (e.g., Railway, Render, or Cloudflare Worker URL).

## Theme Customization

The app uses a custom color palette:
- **Saffron** (#FF9933) - Primary action color
- **Navy Blue** (#002366) - Text and accents
- **Dark Mode** - Automatic with system preference + manual toggle

Colors are configured in `tailwind.config.js` and can be customized there.

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API configuration
│   │   └── axios.ts    # Axios instance
│   ├── components/     # Reusable components
│   │   └── Header.tsx  # Navigation header
│   ├── contexts/       # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx  # Theme (dark/light) state
│   ├── pages/          # Page components
│   │   ├── Products.tsx   # Product listing
│   │   ├── Login.tsx      # Login page
│   │   ├── Signup.tsx     # Registration page
│   │   └── Orders.tsx     # Order history
│   ├── App.tsx         # Main app component
│   ├── index.tsx       # Entry point
│   └── index.css       # Global styles
├── .env.example        # Environment template
├── tailwind.config.js  # Tailwind configuration
└── package.json        # Dependencies
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (not recommended)

## Features in Detail

### Authentication
- Login and signup with email/password
- JWT token stored in localStorage
- Automatic token refresh on page reload
- Protected routes for authenticated users

### Product Browsing
- Grid layout with responsive columns
- Product images and details
- Price display
- Stock status
- Add to cart functionality (placeholder)

### Order Management
- View order history
- Order status tracking
- Total price calculation
- Order date display

### Dark Mode
- Manual toggle button in header
- Persists preference in localStorage
- Smooth transitions between themes
- System preference detection

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

ISC License - See main repository LICENSE file

## Support

For issues or questions:
- Check the main repository README
- Open an issue on GitHub
- Contact the development team
