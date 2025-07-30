# Gumroad Webhook Phone Number Extraction Fix

## Problem Description

The Gumroad webhook was failing to process premium payments because it couldn't extract the phone number from the webhook payload. The error logs showed:

```
🔥 [GUMROAD] Extracted phone number: undefined
🔥 [GUMROAD] Missing phone_number in custom_fields
```

## Root Cause Analysis

### Original Issue
The webhook handler was looking for the phone number in `custom_fields.phone_number`, but Gumroad was actually sending it in a different format:

```json
{
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389"
  }
}
```

The `%5B` and `%5D` are URL-encoded square brackets (`[` and `]`), indicating that Gumroad sends custom fields as `custom_fields[phone_number]` but URL-encoded.

### Data Format Variations
Gumroad can send webhook data in multiple formats:
1. **Form-encoded with custom_fields as JSON string**
2. **JSON with url_params containing encoded custom fields**
3. **Mixed formats depending on Gumroad's internal processing**

## Solution Implemented

### 1. Enhanced Phone Number Extraction Function

Created a robust extraction function in `apps/api-gateway/src/flows/payment-flow.ts`:

```typescript
const extractPhoneNumber = (data: any): string | undefined => {
  if (!data) return undefined;
  
  // Direct access patterns
  const patterns = [
    'phone_number',
    'custom_fields[phone_number]',
    'custom_fields%5Bphone_number%5D',
    'custom_fields.phone_number'
  ];
  
  for (const pattern of patterns) {
    if (data[pattern]) {
      console.log(`🔥 [GUMROAD] Found phone number with pattern "${pattern}":`, data[pattern]);
      return data[pattern];
    }
  }
  
  // Check nested objects for any key containing 'phone_number' or 'phone'
  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key.includes('phone_number') || key.includes('phone')) {
        console.log(`🔥 [GUMROAD] Found phone number in key "${key}":`, value);
        return value as string;
      }
    }
  }
  
  return undefined;
};
```

### 2. Multi-Location Search Strategy

The webhook now searches for phone numbers in multiple locations:

1. **custom_fields** (parsed if JSON string)
2. **url_params** (parsed if JSON string)
3. **Main request body** (direct access)

### 3. Enhanced Middleware Configuration

Updated Express middleware to handle both JSON and form-encoded data:

```typescript
app.use('/webhook/gumroad', express.urlencoded({ extended: true }));
app.use('/webhook/gumroad', express.json());
```

### 4. Comprehensive Debug Logging

Added detailed logging to help troubleshoot future issues:
- Phone number extraction attempts
- Data structure logging
- Pattern matching results

## Testing and Validation

### Test Scripts Created

1. **validate-gumroad-fix.cjs** - Comprehensive validation of both formats
2. **test-deployment-status.cjs** - Check if new logging is active
3. **debug-phone-extraction.js** - Local testing of extraction logic

### Expected Behavior

After the fix:
- ✅ Original format (`custom_fields` as JSON string) continues to work
- ✅ Real Gumroad format (`url_params` with encoded keys) now works
- ✅ Enhanced logging provides better debugging information

## Deployment Status

The fix has been implemented in the codebase and is pending deployment to Railway. Once deployed, the webhook should correctly process all Gumroad payment formats.

## Monitoring and Verification

### Railway Logs to Watch For

After deployment, successful phone number extraction will show:
```
🔥 [GUMROAD] Found phone number with pattern "custom_fields%5Bphone_number%5D": 593984074389
🔥 [GUMROAD] URL params structure: {"custom_fields%5Bphone_number%5D":"593984074389"}
🎉 [GUMROAD] Successfully upgraded user to premium!
```

### Validation Commands

```bash
# Test original format (should work)
node test-webhook-with-valid-id.cjs

# Test real Gumroad format (should work after fix)
node validate-gumroad-fix.cjs

# Check deployment status
node test-deployment-status.cjs
```

## Future Considerations

1. **Webhook Security**: Consider adding signature validation for Gumroad webhooks
2. **Error Handling**: Add retry logic for failed phone number extractions
3. **Monitoring**: Set up alerts for webhook processing failures
4. **Documentation**: Update Gumroad integration docs with new phone number handling

## Related Files Modified

- `apps/api-gateway/src/flows/payment-flow.ts` - Main webhook handler
- `apps/api-gateway/src/app.ts` - Middleware configuration
- Various test scripts for validation and debugging
