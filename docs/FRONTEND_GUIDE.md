# Rest Shop Frontend

A modern, responsive e-commerce frontend built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Beautiful UI** with saffron (#FF9933) and navy blue (#002366) theme colors (solid colors only)
- **Day/Night Mode** toggle for comfortable viewing
- **Fully Responsive** design for all screen sizes
- **Authentication** with JWT tokens
- **Product Browsing** with clean card layouts
- **Order Management** for authenticated users
- **Admin Interface** for managing products, orders, and users
- **Fast Performance** with Vite and optimized builds

## Tech Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe code
- **Vite** - Next generation frontend tooling (super fast!)
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
   VITE_API_URL=http://localhost:3001
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The app will open at [http://localhost:5173](http://localhost:5173)

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

## Deployment to Cloudflare Pages

The frontend includes a `wrangler.toml` configuration file for seamless Cloudflare Pages deployment.

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
   wrangler pages deploy dist
   ```
   
   The project name and configuration are automatically read from `wrangler.toml`.
   The project will be created automatically on first deployment if it doesn't exist.

### Option 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
   - **Environment variables**: 
     - `VITE_API_URL`: Your backend API URL
5. Click **Save and Deploy**

### Environment Variables for Production

In Cloudflare Pages settings, add:

```
VITE_API_URL=https://your-api-domain.com
```

Replace with your actual backend API URL (e.g., Render, or Cloudflare Worker URL).

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API configuration
│   │   └── axios.ts    # Axios instance
│   ├── components/     # Reusable components
│   │   ├── Header.tsx         # Navigation header
│   │   └── ProtectedRoute.tsx # Route protection
│   ├── contexts/       # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx  # Theme (dark/light) state
│   ├── pages/          # Page components
│   │   ├── Products.tsx   # Product listing
│   │   ├── Login.tsx      # Login page
│   │   ├── Signup.tsx     # Registration page
│   │   ├── Orders.tsx     # Order history
│   │   └── admin/         # Admin interface
│   │       ├── AdminLayout.tsx      # Admin layout with sidebar
│   │       ├── AdminDashboard.tsx   # Dashboard overview
│   │       ├── ManageProducts.tsx   # Product management
│   │       ├── ManageOrders.tsx     # Order management
│   │       └── ManageUsers.tsx      # User management
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── .env.example        # Environment template
├── tailwind.config.js  # Tailwind configuration
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server (with HMR)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Features in Detail

### Authentication
- Login and signup with email/password
- JWT token stored in localStorage
- Automatic token refresh on page reload
- Protected routes for authenticated users
- Role-based access control (admin/user)

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

### Admin Interface
- **Dashboard**: Overview with statistics and recent orders
- **Manage Products**: Full CRUD operations on products
- **Manage Orders**: Update order status, filter by status
- **Manage Users**: View all users, delete users
- **Protected Routes**: Only accessible to admin users
- **Sidebar Navigation**: Easy navigation between admin sections

### Dark Mode
- Manual toggle button in header
- Persists preference in localStorage
- Smooth transitions between themes
- System preference detection

## Theme Customization

The app uses a custom color palette:
- **Saffron** (#FF9933) - Primary action color (solid only, no gradients)
- **Navy Blue** (#002366) - Text and accents
- **Dark Mode** - Automatic with system preference + manual toggle

Colors are configured in `tailwind.config.js` and can be customized there.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- **Vite**: Lightning-fast hot module replacement (HMR)
- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Removes unused code
- **Minification**: Optimized production bundles
- **Bundle Size**: ~315 KB (gzipped: ~96 KB)

## Why Vite?

Vite provides several advantages over Create React App:
- **Instant Server Start**: No bundling in development
- **Lightning Fast HMR**: Updates reflect instantly
- **Optimized Build**: Rollup-based production builds
- **Better DX**: Faster development experience
- **Modern**: Native ESM support

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
