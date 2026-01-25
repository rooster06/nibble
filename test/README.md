# Test Suite

## test_images.py

Tests the image search functionality for menu dishes.

### What it does:
1. Clears the DynamoDB image cache
2. Calls the `/menu/images` API endpoint
3. Checks that all dishes have images
4. Validates each image URL is accessible (HEAD request)
5. Reports summary with pass/fail

### Usage:

```bash
# Test with a specific run_id
python test_images.py <run_id>

# Test with the most recent run from DynamoDB
python test_images.py
```

### Requirements:
- AWS credentials configured
- `requests` and `boto3` packages installed

### Example output:
```
Clearing image cache...
Cleared 5 cached items

Testing images for run_id: abc123
============================================================
Found 10 dishes
------------------------------------------------------------
[OK]      Tacos al Pastor: 5 images
[OK]      Guacamole: 5 images
[MISSING] Special del Dia: No images found
...

============================================================
Validating image URLs...
------------------------------------------------------------
[BROKEN]  Tacos al Pastor: https://example.com/broken.jpg...
          Error: 404

============================================================
SUMMARY
============================================================
Total dishes:    10
Missing images:  1
Total images:    45
Broken images:   2
Working images:  43

Result: FAIL
```

## Test Menu

Add test menu images to this folder. Use the web app to upload and process them, then use the resulting `run_id` with the test script.
