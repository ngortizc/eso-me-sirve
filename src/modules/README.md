# Módulos de negocio

Cada carpeta representa un límite futuro del monolito modular. Dentro de un módulo se separarán `domain`, `application` e `infrastructure`; `domain` no podrá importar Next.js, PostgreSQL ni proveedores externos. EMS-000 no implementa reglas ni entidades de estos módulos.

Dependencias entre módulos deberán cruzar puertos explícitos de aplicación. `shared` se reserva para capacidades realmente transversales, no para reglas de negocio.
