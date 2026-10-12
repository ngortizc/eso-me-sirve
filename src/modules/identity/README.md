# Identity

Autenticación, sesiones y roles implementados con Better Auth como adaptador de infraestructura. `domain` contiene correo/roles puros; `application` concentra sesión, retorno seguro y autorización; `infrastructure` integra PostgreSQL, Better Auth y el correo local de pruebas.

El proveedor de correo productivo sigue pendiente. Ningún componente fuera de infraestructura debe depender de Better Auth ni acceder directamente a hashes o tokens.
