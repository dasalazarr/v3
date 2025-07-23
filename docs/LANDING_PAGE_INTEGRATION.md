# Landing Page Integration Guide

## Overview
This guide explains how to update the Andes landing page (andesrc.com) to use the new streamlined onboarding flow that redirects directly to WhatsApp.

## New Simplified Flow

### Before (Complex)
```
Landing Page → /start page → Backend API → Database → Gumroad/WhatsApp → WhatsApp Bot
```

### After (Streamlined)
```
Landing Page → Backend API → WhatsApp (with pre-filled intent message)
```

## Implementation

### 1. Update Landing Page Buttons

Replace the existing button implementations with these new ones:

#### Free Plan Button
```html
<button id="start-free-btn" class="btn btn-primary">
  Empieza Gratis
</button>
```

#### Premium Plan Button
```html
<button id="start-premium-btn" class="btn btn-premium">
  Empieza Premium - $9.99/mes
</button>
```

### 2. JavaScript Implementation

```javascript
// Configuration
const API_BASE_URL = 'https://your-api-domain.com'; // Replace with your actual API URL
const DEFAULT_LANGUAGE = 'es'; // or 'en' based on your landing page

// Free plan handler
document.getElementById('start-free-btn').addEventListener('click', async function() {
  try {
    showLoading('Preparando tu entrenamiento gratuito...');
    
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'free',
        language: DEFAULT_LANGUAGE
      })
    });

    const data = await response.json();
    
    if (data.success && data.whatsappLink) {
      // Redirect to WhatsApp
      window.location.href = data.whatsappLink;
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error al iniciar. Por favor intenta de nuevo.');
  } finally {
    hideLoading();
  }
});

// Premium plan handler
document.getElementById('start-premium-btn').addEventListener('click', async function() {
  try {
    showLoading('Preparando tu entrenamiento premium...');
    
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'premium',
        language: DEFAULT_LANGUAGE
      })
    });

    const data = await response.json();
    
    if (data.success && data.whatsappLink) {
      // Redirect to WhatsApp
      window.location.href = data.whatsappLink;
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error al iniciar. Por favor intenta de nuevo.');
  } finally {
    hideLoading();
  }
});

// Utility functions
function showLoading(message) {
  // Implement your loading UI
  console.log('Loading:', message);
}

function hideLoading() {
  // Hide your loading UI
  console.log('Loading complete');
}

function showError(message) {
  // Implement your error UI
  alert(message); // Replace with better error handling
}
```

### 3. Enhanced User Experience

#### Loading States
Add loading indicators when users click the buttons:

```css
.btn.loading {
  opacity: 0.7;
  pointer-events: none;
}

.btn.loading::after {
  content: "...";
  animation: dots 1s infinite;
}

@keyframes dots {
  0%, 20% { content: ""; }
  40% { content: "."; }
  60% { content: ".."; }
  80%, 100% { content: "..."; }
}
```

#### Error Handling
Implement proper error handling for network issues:

```javascript
function handleApiError(error, intent) {
  const fallbackMessages = {
    free: {
      es: 'Error de conexión. Puedes escribir directamente a WhatsApp: "Quiero comenzar entrenamiento gratuito"',
      en: 'Connection error. You can write directly to WhatsApp: "I want to start free training"'
    },
    premium: {
      es: 'Error de conexión. Puedes escribir directamente a WhatsApp: "Quiero Andes Premium"',
      en: 'Connection error. You can write directly to WhatsApp: "I want Andes Premium"'
    }
  };
  
  const message = fallbackMessages[intent][DEFAULT_LANGUAGE];
  showError(message);
}
```

## API Endpoints

### New Simplified Endpoint
- **URL**: `POST /onboarding/start`
- **Body**: 
  ```json
  {
    "intent": "free" | "premium",
    "language": "en" | "es"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "whatsappLink": "https://wa.me/XXXXXX?text=...",
    "intent": "free",
    "language": "es",
    "message": "Serás redirigido a WhatsApp..."
  }
  ```

### Health Check
- **URL**: `GET /onboarding/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "simplified-onboarding",
    "timestamp": "2024-07-23T...",
    "whatsappNumber": "configured"
  }
  ```

## Migration Strategy

### Phase 1: Parallel Implementation
1. Deploy new endpoints alongside existing ones
2. Update landing page to use new flow
3. Monitor both flows for 1 week

### Phase 2: Full Migration
1. Redirect legacy endpoints to new flow
2. Remove old /start page
3. Clean up unused code

### Phase 3: Cleanup
1. Remove legacy endpoints after 30 days
2. Update documentation
3. Monitor metrics for improvements

## Benefits

### User Experience
- **Reduced friction**: 1 click instead of multiple steps
- **Faster onboarding**: Direct WhatsApp integration
- **Clear intent**: Pre-filled messages indicate user's choice

### Technical Benefits
- **Simplified architecture**: Fewer moving parts
- **Better error handling**: Single point of failure
- **Easier maintenance**: Less code to maintain

### Business Benefits
- **Higher conversion**: Fewer drop-off points
- **Better tracking**: Clear intent from the start
- **Improved support**: Users start with clear context

## Testing

### Manual Testing
1. Test both free and premium buttons
2. Verify WhatsApp links work correctly
3. Test error scenarios (network issues)
4. Verify language handling

### Automated Testing
```javascript
// Example test
describe('Landing Page Integration', () => {
  test('Free button generates correct WhatsApp link', async () => {
    const response = await fetch('/onboarding/start', {
      method: 'POST',
      body: JSON.stringify({ intent: 'free', language: 'es' })
    });
    
    const data = await response.json();
    expect(data.whatsappLink).toContain('wa.me');
    expect(data.whatsappLink).toContain('entrenamiento%20gratuito');
  });
});
```

## Monitoring

Track these metrics to measure success:
- **Conversion rate**: Landing page clicks → WhatsApp messages
- **Drop-off rate**: Clicks that don't result in WhatsApp messages
- **Error rate**: API failures or user errors
- **User satisfaction**: Feedback from new users

## Support

If you encounter issues:
1. Check the health endpoint: `GET /onboarding/health`
2. Verify WhatsApp number configuration
3. Test with different browsers/devices
4. Check network connectivity

For technical support, contact the development team with:
- Error messages
- Browser/device information
- Steps to reproduce the issue
