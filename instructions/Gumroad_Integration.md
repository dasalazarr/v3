# Gumroad Integration and Monetization Plan

## 1. Landing Page Copy

### Hero
**Title:** "Entrena al máximo con Andes"
**Subtitle:** "Planes inteligentes de running y seguimiento por WhatsApp"

CTA Buttons:
- **"Empieza Gratis"** (dirige a `/start?flow=free`)
- **"Empieza tu entrenamiento premium por USD 9,99/mes"** (dirige a `/start?flow=premium`)

### Beneficios
- Planes adaptados a tu ritmo y objetivos
- Soporte personalizado por WhatsApp
- Registro automático de tus avances
- Acceso a tips y ajustes basados en tu progreso

### Precio
**Andes Premium** – USD 9,99 al mes. Cancela cuando quieras.

### Preguntas Frecuentes
1. **¿Cómo funciona Andes?**
   Respondes un breve onboarding en WhatsApp y recibes un plan semanal personalizado.
2. **¿Necesito experiencia previa?**
   No, ajustamos cada plan a tu nivel actual.
3. **¿Qué incluye Andes Premium?**
   Planes ilimitados, seguimiento de métricas y soporte prioritario.
4. **¿Cómo se realiza el pago?**
   A través de Gumroad de forma segura con tu tarjeta.

### Testimonial
> "Gracias a Andes corrí mi mejor 10K en solo 8 semanas" – Ana R.

---

## 2. Mensajes de Upsell en WhatsApp

- **Al 80 % del límite (120/150 mensajes):**
  "🚀 ¡Estás cerca de alcanzar tu cuota gratuita! Para seguir recibiendo tu plan sin interrupciones, activa Andes Premium aquí: ${GUMROAD_LINK}"

- **Al 100 % del límite (150/150 mensajes):**
  "⚠️ Has agotado tus mensajes gratuitos este mes. Desbloquea todo el potencial con Andes Premium 👉 ${GUMROAD_LINK}"

Ambos mensajes deben ir acompañados de un botón "Volver a WhatsApp" para facilitar la navegación desde Gumroad.

---

## 3. Especificación Técnica

### Producto en Gumroad
- Crear producto **"Andes Premium"** (membership de USD 9,99/mes).
- La URL de checkout se generará dinámicamente por el backend (`v3`) incluyendo el `user_id` del usuario, y la landing page redirigirá al usuario a esta URL.

### Webhook Endpoint
- **Route:** `POST /gumroad/webhook`
- **Auth:** Validar header `X-Gumroad-Signature` con `${GUMROAD_SECRET}`.
- **Payload (ejemplo):**
```json
{
  "email": "user@example.com",
  "purchase_id": "abc123",
  "price": 9.99,
  "product_name": "Andes Premium",
  "recurrence": "monthly",
  "event": "subscription_payment"
}
```

### TypeScript Handler (Express)
```ts
app.post('/gumroad/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.header('X-Gumroad-Signature');
  if (signature !== process.env.GUMROAD_SECRET) return res.status(401).end();
  const data = JSON.parse(req.body.toString());
  await db.insert(payments).values({
    purchaseId: data.purchase_id,
    email: data.email,
    amount: data.price,
    event: data.event,
  });
  await db.update(users).set({billingStatus: 'ACTIVE'}).where(eq(users.email, data.email));
  res.status(200).end();
});
```

### SQL Schema `payments`
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  email TEXT NOT NULL REFERENCES users(email),
  amount NUMERIC NOT NULL,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Middleware `checkBillingStatus`
```ts
export async function checkBillingStatus(req, res, next) {
  const status = await getUserBillingStatus(req.user.id);
  const count = await getMonthlyMessageCount(req.user.id);
  if (count >= 150 && status !== 'ACTIVE') {
    return res.json({text: `Para seguir, activa Andes Premium: ${process.env.GUMROAD_LINK}`});
  }
  next();
}
```

### Cron de Validación
- Job diario que llama a la API de Gumroad para confirmar suscripciones activas.
- Si una subscripción se marca como cancelada o con pago fallido, actualizar `billing_status` a `PAST_DUE` o `CANCELLED`.

---

## 4. Priorización
1. Verificar cuenta en Gumroad y crear el producto **(MUST)**.
2. Añadir el enlace de checkout en la landing y en los mensajes de upsell **(MUST)**.
3. Implementar el webhook `/gumroad/webhook` y actualizar `billing_status` **(MUST)**.
4. Integrar el middleware `checkBillingStatus` en el bot **(MUST)**.
5. Personalizar checkout con logo y cupones de prueba **(SHOULD)**.
6. Cron diario para validar suscripciones con la API de Gumroad **(SHOULD)**.
7. Portal de gestión de suscripción y paquete prepago de 200 mensajes **(COULD)**.

