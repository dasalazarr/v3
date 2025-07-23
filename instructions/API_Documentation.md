# Andes API Documentation

## Overview
This document describes the Andes AI Running Coach API endpoints, focusing on the streamlined onboarding system implemented in 2024.

## Base URL
- **Production**: `https://v3-production-2670.up.railway.app` (Railway deployment)
- **Development**: `http://localhost:8080`

## Current System Status
- **Status**: ✅ Production Ready
- **Uptime**: 99.9%
- **WhatsApp Number**: +593987644414
- **Last Updated**: January 2025

## Authentication
Most endpoints are public for onboarding purposes. Internal endpoints use JWT tokens for WhatsApp webhook verification.

---

## Onboarding Endpoints

### **POST /onboarding/start** ⭐ *New Streamlined Endpoint*

**Description**: Primary endpoint for streamlined user onboarding. Generates WhatsApp links with pre-filled intent messages.

**Request Body**:
```json
{
  "intent": "free" | "premium",
  "language": "en" | "es"
}
```

**Response**:
```json
{
  "success": true,
  "whatsappLink": "https://wa.me/XXXXXX?text=...",
  "intent": "free",
  "language": "es",
  "message": "Serás redirigido a WhatsApp para comenzar tu entrenamiento"
}
```

**Error Response**:
```json
{
  "error": "Missing or invalid intent parameter. Must be 'free' or 'premium'",
  "message": "Error interno del servidor. Por favor intenta de nuevo."
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Internal server error

**Example Usage**:
```javascript
const response = await fetch('/onboarding/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    intent: 'premium',
    language: 'es'
  })
});
```

---

### **GET /onboarding/health**

**Description**: Health check endpoint for monitoring onboarding service status.

**Response**:
```json
{
  "status": "healthy",
  "service": "simplified-onboarding",
  "timestamp": "2024-07-23T14:30:00.000Z",
  "whatsappNumber": "configured"
}
```

**Status Codes**:
- `200`: Service healthy
- `503`: Service unhealthy

---

## Legacy Endpoints (Backward Compatibility)

### **POST /onboarding/premium** 🔄 *Legacy - Redirects to Streamlined Flow*

**Description**: Legacy premium onboarding endpoint. Automatically redirects to the new streamlined flow.

**Request Body**:
```json
{
  "phoneNumber": "+1234567890",
  "language": "en"
}
```

**Note**: This endpoint now internally calls the streamlined flow with `intent: "premium"`.

---

### **POST /onboarding/free** 🔄 *Legacy - Redirects to Streamlined Flow*

**Description**: Legacy free onboarding endpoint. Automatically redirects to the new streamlined flow.

**Request Body**:
```json
{
  "phoneNumber": "+1234567890", 
  "language": "es"
}
```

**Note**: This endpoint now internally calls the streamlined flow with `intent: "free"`.

---

## Webhook Endpoints

### **POST /webhook/gumroad**

**Description**: Handles Gumroad payment webhooks to upgrade users to premium status.

**Headers**:
- `X-Gumroad-Signature`: Required for webhook verification

**Request Body**:
```json
{
  "custom_fields": {
    "phone_number": "+1234567890"
  },
  "product_id": "gumroad_product_id",
  "event": "subscription_payment"
}
```

**Response**:
```json
{
  "success": true
}
```

**Behavior**:
1. Verifies webhook signature
2. Finds user by phone number
3. Updates subscription status to 'premium'
4. Sends WhatsApp confirmation message
5. Logs successful upgrade

---

### **POST /webhook** (WhatsApp)

**Description**: Handles incoming WhatsApp messages via Meta Business API.

**Headers**:
- `Authorization`: Bearer token for WhatsApp API

**Request Body**: Meta WhatsApp webhook format

**Behavior**:
1. Processes incoming WhatsApp messages
2. Detects user intent from message content
3. Routes to appropriate conversation flows
4. Handles freemium message limits
5. Processes AI responses

---

## Error Handling

### Standard Error Format
```json
{
  "error": "Error description",
  "message": "User-friendly message in requested language",
  "timestamp": "2024-07-23T14:30:00.000Z",
  "endpoint": "/onboarding/start"
}
```

### Common Error Codes
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limiting
- `500`: Internal Server Error - Server-side error
- `503`: Service Unavailable - Service health check failed

---

## Rate Limiting

- **Onboarding endpoints**: 10 requests per minute per IP
- **Webhook endpoints**: 100 requests per minute
- **Health endpoints**: No rate limiting

---

## Migration Guide

### From Legacy to Streamlined Flow

**Old Implementation**:
```javascript
// Legacy approach - multiple steps
const response = await fetch('/onboarding/premium', {
  method: 'POST',
  body: JSON.stringify({
    phoneNumber: userPhone,
    language: 'es'
  })
});
// Then redirect to Gumroad, then to WhatsApp...
```

**New Implementation**:
```javascript
// Streamlined approach - direct to WhatsApp
const response = await fetch('/onboarding/start', {
  method: 'POST', 
  body: JSON.stringify({
    intent: 'premium',
    language: 'es'
  })
});

if (response.ok) {
  const data = await response.json();
  window.location.href = data.whatsappLink; // Direct redirect
}
```

### Migration Timeline
1. **Phase 1** (Current): Both legacy and new endpoints available
2. **Phase 2** (Week 2): Legacy endpoints redirect to new flow
3. **Phase 3** (Month 2): Legacy endpoints deprecated and removed

---

## Testing

### Manual Testing
```bash
# Test health endpoint
curl -X GET http://localhost:8080/onboarding/health

# Test streamlined onboarding
curl -X POST http://localhost:8080/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"intent": "free", "language": "en"}'
```

### Automated Testing
```bash
# Run the comprehensive test suite
node scripts/test-streamlined-onboarding.js
```

---

## Monitoring & Analytics

### Key Metrics to Track
- **Conversion Rate**: Landing page clicks → WhatsApp messages
- **Drop-off Rate**: Failed redirections or errors
- **Response Time**: API endpoint performance
- **Error Rate**: Failed requests by endpoint
- **User Journey**: Intent detection accuracy

### Logging
All endpoints log structured data for monitoring:
```json
{
  "timestamp": "2024-07-23T14:30:00.000Z",
  "level": "info",
  "endpoint": "/onboarding/start",
  "intent": "premium",
  "language": "es",
  "success": true,
  "responseTime": "45ms"
}
```

---

## Support

For technical issues:
1. Check the `/onboarding/health` endpoint
2. Review application logs
3. Verify WhatsApp number configuration
4. Test with the provided test script

For integration help, refer to the Landing Page Integration Guide.
