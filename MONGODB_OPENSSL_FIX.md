# MongoDB Memory Server OpenSSL 3.x Fix

## Problem

When running tests on Ubuntu 22.04+ (including Ubuntu 24.04), MongoDB Memory Server fails with the following error:

```
Starting the MongoMemoryServer Instance failed, enable debug log for more information. Error:
 StdoutInstanceError: Instance failed to start because a library is missing or cannot be opened: "libcrypto.so.1.1"
```

### Root Cause

- **Ubuntu 22.04+** uses OpenSSL 3.x (`libcrypto.so.3`)
- **MongoDB binaries < 7.0** require OpenSSL 1.1 (`libcrypto.so.1.1`)
- By default, `mongodb-memory-server` downloads MongoDB 6.x which is incompatible with OpenSSL 3.x
- OpenSSL 1.1 libraries are no longer available in Ubuntu 24.04 repositories

## Solution

Configure `mongodb-memory-server` to use MongoDB 7.0+ which supports OpenSSL 3.x.

### Changes Made

#### 1. Package Configuration (`package.json`)

Added MongoDB version configuration:

```json
{
  "config": {
    "mongodbMemoryServer": {
      "version": "7.0.14"
    }
  }
}
```

This tells `mongodb-memory-server` to download MongoDB 7.0.14 which is compatible with OpenSSL 3.x.

#### 2. CI/CD Configuration (`.github/workflows/ci-cd.yml`)

Added environment variable to the test job:

```yaml
- name: Run tests
  run: npm test
  env:
    JWT_KEY: ${{ secrets.JWT_KEY || 'test_jwt_key' }}
    NODE_ENV: test
    MONGOMS_VERSION: 7.0.14  # Added this line
```

This ensures the correct MongoDB version is used in CI environments.

#### 3. Documentation Updates

- Updated `README.md` with prerequisites and troubleshooting notes
- Enhanced `docs/TESTING_GUIDE.md` with detailed troubleshooting section for this issue

## How It Works

When `mongodb-memory-server` starts:
1. It checks for the `MONGOMS_VERSION` environment variable
2. If not set, it checks `package.json` under `config.mongodbMemoryServer.version`
3. It downloads the specified MongoDB version (7.0.14 in this case)
4. MongoDB 7.0.14 is built with OpenSSL 3.x support
5. Tests run successfully with the compatible binary

## Verification

### Before Fix
```bash
$ npm test
# Error: Instance failed to start because a library is missing: "libcrypto.so.1.1"
# Tests fail with database connection errors
```

### After Fix
```bash
$ npm test
# MongoDB Memory Server downloads MongoDB 7.0.14
# All tests pass successfully
```

## Alternative Solutions Considered

1. **Install OpenSSL 1.1**: Not available in Ubuntu 24.04 repositories
2. **Downgrade Ubuntu**: Not feasible, GitHub Actions uses latest Ubuntu
3. **Use system MongoDB**: Would require additional CI setup and maintenance
4. **Mock all database operations**: Would reduce test coverage significantly

## Technical Details

### MongoDB Compatibility Matrix

| MongoDB Version | OpenSSL 1.1 | OpenSSL 3.x |
|-----------------|-------------|-------------|
| 4.x - 6.x       | ✅          | ❌          |
| 7.0+            | ✅          | ✅          |

### Ubuntu OpenSSL Versions

| Ubuntu Version | OpenSSL Version |
|----------------|-----------------|
| 20.04 LTS      | 1.1.1           |
| 22.04 LTS      | 3.0.x           |
| 24.04 LTS      | 3.0.x           |

## References

- [MongoDB Memory Server Documentation](https://github.com/nodkz/mongodb-memory-server)
- [MongoDB 7.0 Release Notes](https://www.mongodb.com/docs/manual/release-notes/7.0/)
- [OpenSSL 3.0 Migration Guide](https://www.openssl.org/docs/man3.0/man7/migration_guide.html)

## Summary

This fix ensures that tests run successfully on modern Ubuntu systems by configuring MongoDB Memory Server to use MongoDB 7.0.14, which is compatible with OpenSSL 3.x. The solution is:

- ✅ **Minimal**: Only 4 files changed
- ✅ **Non-breaking**: Works on both old and new systems
- ✅ **Well-documented**: Clear instructions and troubleshooting
- ✅ **Future-proof**: Compatible with latest Ubuntu LTS releases
