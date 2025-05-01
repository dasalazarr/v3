# Plan de Trabajo: Enfoque “Templates por Dominio"

## 1. Objetivo
Definir e implementar un patrón que permita gestionar múltiples plantillas de prompts (`deepSeek`, `welcome`, `faq`, etc.) organizadas por dominio (dental, dermatología, municipal, educativo, eventos, proyectos) y cargadas dinámicamente en tiempo de ejecución. Esto garantiza escalabilidad, mantenibilidad y coherencia sin ramas de Git para cada negocio.

## 2. Estructura Propuesta de Carpetas
```
assets/prompts/
├─ default/
│   ├─ deepSeek.hbs    ← plantilla genérica de fallback
│   └─ welcome.hbs     ← saludo genérico
├─ dental/
│   └─ deepSeek.hbs
├─ dermatologia/
│   └─ deepSeek.hbs
├─ municipal/
│   └─ deepSeek.hbs
├─ educacion/
│   └─ deepSeek.hbs
├─ eventos/
│   └─ deepSeek.hbs
└─ proyectos/
    └─ deepSeek.hbs
```

## 3. Tareas y Cronograma

| Paso | Descripción                                                               | Responsable | Duración estimada |
|------|---------------------------------------------------------------------------|-------------|-------------------|
| 1    | Refactorizar `templateEngine.ts` para carga dinámica de directorios y cache| Equipo Backend | 1 día            |
| 2    | Crear carpeta `default` y plantilla genérica `deepSeek.hbs`                | Equipo Backend | 0.5 días         |
| 3    | Desarrollar plantillas `deepSeek.hbs` por dominio con información detallada| Equipo Contenido| 2 días           |
| 4    | Integrar llamado a `renderPrompt(domain, key, ctx)` en `ConversacionController.ts` | Equipo Backend | 0.5 días         |
| 5    | Pruebas unitarias y end-to-end de rutas de prompts                        | QA           | 1 día            |
| 6    | Documentación y ejemplo de CLI para scaffolding de nuevos dominios         | Todos        | 0.5 días         |

## 4. Detalles de Implementación

1. **Detección de plantillas**: Recorrer `assets/prompts` usando `fs.readdirSync` para leer carpetas de dominio.
2. **Cacheo**: Por cada archivo `.hbs`, compilar con `Handlebars.compile` y almacenar en un mapa `{ "<dominio>.<key>": template }`.
3. **Fallback**: Si no existe plantillalocal, usar `default.<key>`.
4. **Render**: Exponer `templateEngine.renderPrompt(domain: string, key: string, ctx: object): string`.
5. **Variables en templates**: Usar `{{user}}`, `{{domain}}`, `{{message}}`, `{{date}}` y otras según necesidad.
6. **Scaffolding**: Crear script CLI `init-domain <nombre>` que copie `default/` a `assets/prompts/<nombre>/`.

## 5. Buenas Prácticas y Minuciosidades

- **Naming consistente**: Usar minúsculas y sin espacios en nombres de carpetas y archivos.
- **Variables claras**: Definir en el contexto sólo variables necesarias y sanitizadas.
- **Escape y seguridad**: Asegurar escapes de Handlebars para evitar inyección; usar triples `{{{ }}}` sólo cuando sea seguro.
- **Localización**: Si se requiere multi-idioma, incluir carpeta `i18n/<lang>/` y templateEngine que seleccione por `lang`.
- **Versionamiento**: Etiquetar plantillas con comentario al inicio indicando versión y fecha de creación.
- **Testing**: Añadir tests unitarios que verifiquen que cada dominio retorna un string no vacío y contiene variables renderizadas.
- **Documentación**: Actualizar README con pasos para añadir nuevo dominio y variables soportadas.

---

*Este plan asegura un desarrollo estructurado, escalable y fácil de mantener del enfoque “templates por dominio” en el proyecto V3.*
