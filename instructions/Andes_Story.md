# 🏔️ La Historia de Andes: Tu Compañero de Running Inteligente

## Capítulo 1: El Nacimiento de una Visión (Los Inicios)

En un mundo donde el running se ha convertido en más que un deporte, una forma de vida, Diego, un apasionado corredor y desarrollador, se encontró con un problema recurrente: la falta de un entrenador personal accesible, inteligente y que realmente entendiera las necesidades individuales de cada atleta. Los planes genéricos fallaban, las lesiones acechaban y la motivación fluctuaba. Así nació la chispa de Andes.

La visión era clara: crear un compañero de running que no solo dictara entrenamientos, sino que aprendiera de cada paso, cada sudor y cada triunfo. Un asistente que estuviera siempre disponible, en el bolsillo de cada corredor, a través de la plataforma más usada: WhatsApp.

## Capítulo 2: De Prototipo a Promesa (La Evolución Técnica)

Andes comenzó como un prototipo humilde, un bot de WhatsApp que registraba carreras en Google Sheets. Era funcional, pero Diego sabía que el verdadero potencial residía en la inteligencia y la memoria. La ambición creció, y con ella, la necesidad de una arquitectura robusta.

La migración de Google Sheets a una base de datos PostgreSQL marcó el primer gran salto. Luego, la integración de Redis para la memoria a corto plazo y Qdrant para la memoria semántica transformó a Andes de un bot reactivo a un compañero que "recordaba" y "entendía" el contexto de cada conversación.

El corazón de Andes, el `LLM Orchestrator` impulsado por DeepSeek, se convirtió en el cerebro que no solo respondía, sino que tomaba decisiones, ejecutaba herramientas y aprendía de la interacción. La capacidad de "tool-calling" permitió a Andes registrar carreras, ajustar planes y analizar el progreso de forma autónoma.

## Capítulo 3: Personalización en Cada Paso (El Onboarding Inteligente)

Desde el principio, la personalización fue clave. Andes no podía ser un entrenador genérico. Por eso, se diseñó un proceso de onboarding inteligente. Ahora, cada nuevo corredor que dice "start" o "inicio" es guiado a través de una serie de preguntas clave: edad, objetivos de carrera, nivel de experiencia, historial de lesiones. Esta información no se guarda en vano; se convierte en la base del perfil del corredor, permitiendo a Andes adaptar cada consejo, cada plan y cada palabra de aliento.

Este perfil se integra directamente en el `SystemPrompt` del modelo de IA, asegurando que cada interacción sea única y relevante. Andes no solo sabe cuánto corriste, sino por qué corres y qué te motiva.

## Capítulo 4: El Coach que Aprende y se Adapta (La Inteligencia Continua)

La verdadera magia de Andes reside en su capacidad de aprender. Cada carrera registrada, cada conversación, cada ajuste en el plan, alimenta su memoria. El sistema multi-agente, con su orquestador inteligente, detecta las necesidades complejas del corredor. ¿Quieres analizar tu progreso? Andes no solo te da números, sino que interpreta tendencias y te ofrece insights accionables. ¿Necesitas ajustar tu plan por una molestia? Andes lo hace, considerando tu historial de lesiones y sugiriendo recuperaciones activas.

La mejora continua es el mantra. La extracción de datos se vuelve más precisa, la comprensión del lenguaje natural más profunda y las respuestas más empáticas. Andes no es solo un bot; es un compañero que evoluciona contigo, celebrando tus victorias y apoyándote en los desafíos.

## Capítulo 5: El Futuro en el Horizonte (La Visión de Crecimiento)

Andes sigue creciendo. La integración con Gumroad para un modelo freemium asegura que la personalización y la inteligencia avanzada sean accesibles para todos, mientras se construye un camino hacia la sostenibilidad. El objetivo es claro: democratizar el acceso a un coaching de running de élite, haciendo que cada corredor, sin importar su nivel o ubicación, pueda conquistar su propia montaña.

La historia de Andes es la historia de cada corredor que busca superarse, con un compañero inteligente que lo guía, lo motiva y lo ayuda a alcanzar su máximo potencial. Y esta historia, como cada carrera, apenas comienza.
