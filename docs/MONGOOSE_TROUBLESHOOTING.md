# Mongoose Troubleshooting Guide

## Common Issues and Solutions

This guide addresses common "Mongoose headaches" and provides solutions to keep your MongoDB connection healthy.

## Table of Contents
1. [Connection Issues](#connection-issues)
2. [Performance Problems](#performance-problems)
3. [Deployment Issues](#deployment-issues)
4. [Error Messages](#error-messages)
5. [Best Practices](#best-practices)

---

## Connection Issues

### Issue: "Connection Timeout" or "Server Selection Timeout"

**Symptoms:**
```
MongoServerSelectionError: connect ETIMEDOUT
MongooseServerSelectionError: Server selection timed out after 30000 ms
```

**Solutions:**

1. **Check MongoDB Atlas IP Whitelist:**
   - Go to MongoDB Atlas → Network Access
   - Add your IP address or `0.0.0.0/0` for testing (not production!)
   
2. **Verify Connection String:**
   ```javascript
   // ✅ Correct format
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   
   // ❌ Common mistakes
   MONGODB_URI=mongodb://... (missing +srv for Atlas)
   MONGODB_URI=mongodb+srv://...mongodb.net (missing database name)
   ```

3. **Increase Timeout:**
   ```javascript
   mongoose.connect(uri, {
       serverSelectionTimeoutMS: 10000, // Increase to 10 seconds
       socketTimeoutMS: 45000
   });
   ```

### Issue: "Too Many Connections"

**Symptoms:**
```
MongoError: Too many connections
Connection pool exhausted
```

**Solutions:**

1. **Configure Connection Pooling:**
   ```javascript
   mongoose.connect(uri, {
       maxPoolSize: 10,  // Reduce if hitting limits
       minPoolSize: 2    // Keep minimum connections
   });
   ```

2. **Ensure Connections are Closed:**
   - Implement graceful shutdown (already done in server.js)
   - Don't create multiple Mongoose instances
   
3. **Check for Connection Leaks:**
   ```bash
   # Monitor active connections
   db.serverStatus().connections
   ```

### Issue: "Authentication Failed"

**Symptoms:**
```
MongoServerError: Authentication failed
MongoError: bad auth Authentication failed
```

**Solutions:**

1. **Verify Credentials:**
   - Check username/password in `.env`
   - Ensure password is URL-encoded (e.g., `@` becomes `%40`)
   
2. **Check Database User:**
   - Go to MongoDB Atlas → Database Access
   - Verify user has read/write permissions
   - Check database name matches connection string

---

## Performance Problems

### Issue: "Slow Queries"

**Symptoms:**
- API endpoints take 2+ seconds
- Database queries timeout
- High CPU usage

**Solutions:**

1. **Add Indexes:**
   ```javascript
   // Already added in models:
   productSchema.index({ name: 'text', description: 'text' });
   productSchema.index({ category: 1, isActive: 1 });
   ```

2. **Use Lean Queries:**
   ```javascript
   // ✅ Faster - returns plain JavaScript objects
   const products = await Product.find().lean();
   
   // ❌ Slower - returns Mongoose documents with methods
   const products = await Product.find();
   ```

3. **Implement Pagination:**
   ```javascript
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 20;
   const skip = (page - 1) * limit;
   
   const products = await Product.find()
       .skip(skip)
       .limit(limit);
   ```

### Issue: "Memory Leaks"

**Symptoms:**
- Application memory grows over time
- Eventually crashes with "JavaScript heap out of memory"

**Solutions:**

1. **Use Cursor for Large Datasets:**
   ```javascript
   // ❌ Don't load all documents at once
   const allProducts = await Product.find();
   
   // ✅ Use cursor to stream
   const cursor = Product.find().cursor();
   for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
       // Process one document at a time
   }
   ```

2. **Limit Query Results:**
   ```javascript
   // Always use .limit() for queries
   const products = await Product.find().limit(100);
   ```

---

## Deployment Issues

### Issue: "Works Locally, Fails in Production"

**Symptoms:**
- Local development works fine
- Production deployment fails to connect

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # Verify all required variables are set
   echo $MONGODB_URI
   echo $JWT_KEY
   ```

2. **Cloudflare Workers Specific:**
   ```bash
   # Set secrets (don't commit to git)
   wrangler secret put MONGODB_URI
   wrangler secret put JWT_KEY
   ```

3. **Verify nodejs_compat in wrangler.toml:**
   ```toml
   compatibility_flags = ["nodejs_compat"]
   ```

### Issue: "Mongoose Not Compatible with Cloudflare Workers"

**Symptoms:**
```
Error: Cannot find module 'fs'
Error: process is not defined
```

**Solutions:**

1. **Already Fixed in src/worker.js:**
   ```javascript
   // Pre-emptive fix for Mongoose Node-isms
   globalThis.process = globalThis.process || {};
   globalThis.process.emitWarning = () => {};
   ```

2. **Use Node.js Compatibility Mode:**
   - Ensure `nodejs_compat` is enabled in wrangler.toml
   - This provides Node.js APIs needed by Mongoose

---

## Error Messages

### "VersionError: No matching document found"

**Cause:** Document was modified by another operation before save

**Solution:**
```javascript
// Retry the operation
try {
    await doc.save();
} catch (err) {
    if (err.name === 'VersionError') {
        // Reload and retry
        const freshDoc = await Model.findById(doc._id);
        freshDoc.field = newValue;
        await freshDoc.save();
    }
}
```

### "ValidationError: Field is required"

**Cause:** Missing required field in schema

**Solution:**
```javascript
// Check schema requirements
const product = new Product({
    name: req.body.name,        // ✅ Required
    price: req.body.price,       // ✅ Required
    productImage: req.file.path  // ✅ Required
    // All required fields must be provided
});
```

### "CastError: Cast to ObjectId failed"

**Cause:** Invalid MongoDB ObjectId format

**Solution:**
```javascript
// Validate ObjectId before query
const mongoose = require('mongoose');

if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: { message: 'Invalid ID format' } });
}
```

---

## Best Practices

### 1. Connection Management

✅ **DO:**
- Connect once at application startup
- Reuse the same connection
- Implement graceful shutdown
- Use connection pooling

❌ **DON'T:**
- Create new connections for each request
- Leave connections open indefinitely
- Ignore connection errors

### 2. Query Optimization

✅ **DO:**
- Add indexes for frequently queried fields
- Use `.lean()` when you don't need Mongoose methods
- Implement pagination for large datasets
- Use `.select()` to limit returned fields

❌ **DON'T:**
- Query without indexes
- Load entire collections into memory
- Use `.find({})` without limits

### 3. Schema Design

✅ **DO:**
- Use schema validation
- Add appropriate indexes
- Use embedded documents for 1-to-few relationships
- Use references for 1-to-many relationships

❌ **DON'T:**
- Store large arrays (MongoDB 16MB document limit)
- Create deeply nested documents (>100 levels)
- Ignore validation

### 4. Error Handling

✅ **DO:**
- Wrap database operations in try-catch
- Return appropriate HTTP status codes
- Log errors for debugging
- Implement retry logic for transient errors

❌ **DON'T:**
- Ignore errors silently
- Expose internal errors to users
- Let unhandled promise rejections crash the app

### 5. Security

✅ **DO:**
- Validate user input
- Use parameterized queries (Mongoose does this by default)
- Sanitize input to prevent injection
- Validate ObjectIds before queries

❌ **DON'T:**
- Build queries with string concatenation
- Trust user input
- Store passwords in plain text
- Expose database errors to users

---

## Monitoring and Debugging

### Enable Debug Mode

```javascript
// Add to server.js for debugging
mongoose.set('debug', true);
```

This will log all database operations to console.

### Monitor Connection State

```javascript
console.log('Connection state:', mongoose.connection.readyState);
// 0 = disconnected
// 1 = connected
// 2 = connecting
// 3 = disconnecting
```

### Check MongoDB Atlas Metrics

1. Go to MongoDB Atlas Dashboard
2. Click "Metrics" tab
3. Monitor:
   - Connection count
   - Query performance
   - Storage usage
   - Network I/O

---

## Need More Help?

1. **Check Application Logs:**
   ```bash
   npm start
   # Look for MongoDB connection messages
   ```

2. **Test Connection:**
   ```bash
   # Test MongoDB connection string
   mongosh "mongodb+srv://cluster.mongodb.net/test" --username user
   ```

3. **Review Documentation:**
   - [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
   - [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
   - [Project Documentation](../README.md)

4. **Common Commands:**
   ```bash
   # View environment variables
   cat .env
   
   # Test API health
   curl http://localhost:3001/health
   
   # Check MongoDB Atlas connection
   wrangler tail
   ```

---

## When to Consider Migration

You should consider migrating away from MongoDB/Mongoose **ONLY IF:**

1. ✅ You have complex JOIN operations across many tables
2. ✅ You need ACID transactions for all operations
3. ✅ Your queries are primarily relational
4. ✅ You have strict schema requirements that never change
5. ✅ Performance issues persist after optimization

**Don't migrate if:**
- ❌ You have a configuration problem (fix it first!)
- ❌ The issue is lack of understanding (learn Mongoose)
- ❌ You're impatient with setup (all databases need setup)
- ❌ You heard "MongoDB is bad" (it's not - it's just different)

---

## Summary

Most "Mongoose headaches" come from:
1. ⚠️ Misconfigured connections
2. ⚠️ Missing indexes
3. ⚠️ Poor error handling
4. ⚠️ Lack of understanding

**Solution:** Fix the root cause, don't rewrite the entire application!

The connection configuration in `server.js` now includes:
- ✅ Proper connection pooling
- ✅ Timeout configurations
- ✅ Error handling
- ✅ Graceful shutdown
- ✅ Connection monitoring

This should resolve most common issues. If problems persist, review the specific error message in this guide.
