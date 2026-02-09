# Admin Interface Documentation

This directory contains the admin interface for the Rest Shop e-commerce platform.

## Pages

### 1. AdminLayout.tsx
The main layout component for admin pages with:
- Top navigation bar with logo and logout button
- Sidebar navigation with links to all admin pages
- Protected route that checks for admin role
- Responsive design

### 2. AdminDashboard.tsx
Overview dashboard displaying:
- Total products count
- Total orders count
- Total users count
- Recent orders table with:
  - Order ID
  - Customer email
  - Order amount
  - Order status
  - Order date

### 3. ManageProducts.tsx
Product management interface with:
- Table view of all products showing:
  - Product image
  - Name
  - Price
  - Stock level (color-coded)
  - Description
- Add new product (modal form)
- Edit existing products (modal form)
- Delete products (with confirmation)
- Loading and error states

### 4. ManageOrders.tsx
Order management interface with:
- Table view of all orders showing:
  - Order ID
  - Customer email
  - Total amount
  - Status (editable dropdown)
  - Order date
- Filter orders by status
- View detailed order information (modal)
- Update order status inline
- Status options:
  - pending
  - processing
  - shipped
  - delivered
  - cancelled

### 5. ManageUsers.tsx
User management interface with:
- Table view of all users showing:
  - User ID
  - Email
  - Role (admin/user)
  - Registration date
- Delete users (with confirmation)
- Admin users are protected from deletion
- Statistics cards showing:
  - Total users
  - Admin users count
  - Regular users count

## Features

### Authentication & Authorization
- Admin routes are protected and check for admin role
- Non-admin users are redirected to the home page
- Admin link appears in main navigation only for admin users

### Styling
- Uses Tailwind CSS with custom theme colors:
  - Saffron: #FF9933 (primary action color)
  - Navy Blue: #002366 (main text and backgrounds)
- Solid colors only, no gradients
- Dark mode support
- Responsive design for all screen sizes

### API Integration
- Uses axios instance from `../api/axios`
- Proper error handling with user-friendly messages
- Loading states for all async operations
- Automatic token management via axios interceptors

### User Experience
- Confirmation dialogs for destructive actions (delete)
- Success feedback after operations
- Error messages displayed prominently
- Loading spinners during data fetches
- Modal dialogs for forms and detailed views
- Color-coded status indicators
- Responsive tables with proper overflow handling

## Routes

All admin routes are prefixed with `/admin`:

- `/admin` - Dashboard
- `/admin/products` - Manage Products
- `/admin/orders` - Manage Orders
- `/admin/users` - Manage Users

## TypeScript Interfaces

### Product
```typescript
interface Product {
  _id: string;
  name: string;
  price: number;
  productImage?: string;
  stock?: number;
  description?: string;
}
```

### Order
```typescript
interface Order {
  _id: string;
  user: {
    _id: string;
    email: string;
  };
  products: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
}
```

### User
```typescript
interface User {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
}
```

## Usage

To access the admin interface:
1. Log in with an admin account
2. Click "Admin Panel" in the navigation header
3. Use the sidebar to navigate between admin pages

## API Endpoints Used

- `GET /products` - Fetch all products
- `POST /products` - Create new product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /orders` - Fetch all orders
- `PATCH /orders/:id` - Update order status
- `GET /user/all` - Fetch all users
- `DELETE /user/:id` - Delete user

## Future Enhancements

Potential improvements:
- Product image upload functionality
- Bulk operations (delete multiple items)
- Advanced filtering and search
- Export data to CSV/Excel
- Order fulfillment tracking
- User role management
- Analytics and charts
- Email notifications
