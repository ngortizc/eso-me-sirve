# Backlog inicial

| ID | Trabajo | Dependencias | Estado |
|---|---|---|---|
| EMS-000 | Bootstrap Next.js / PostgreSQL / Docker / PWA / CI / pruebas | Arquitectura aprobada | COMPLETADO 2026-10-12 |
| EMS-001 | Diseño UX y navegación mobile-first | EMS-000 | COMPLETADO 2026-10-12 |
| EMS-001.1 | Fotografías locales y mejoras del catálogo | EMS-001 | COMPLETADO 2026-10-12 |
| EMS-002 | Identidad, roles y autorizaciones | EMS-000 + auth decidida | COMPLETADO 2026-10-12 |
| EMS-003 | Publicaciones y fotografías | EMS-002 + storage | COMPLETADO 2026-10-12 |
| EMS-004 | Solicitud/aceptación/reserva con concurrencia y plazo de 24 horas | EMS-002/003 + EMS-NEG-012 | COMPLETADO 2026-10-13 |
| EMS-004.1 | Corrección de edición, fotografías y retiro de publicaciones | EMS-003/004 | COMPLETADO 2026-10-13 |
| EMS-004.2 | UX de Mis cosas, comunicación de reserva y usuarios sintéticos locales | EMS-004/004.1 | COMPLETADO 2026-10-13 |
| EMS-004.3 | Autorización, aislamiento de sesiones y cierre funcional de reservas | EMS-004/004.1/004.2 | COMPLETADO 2026-10-13 |
| EMS-004.4 | Separación de experiencia del publicador y del receptor | EMS-004/004.3 | COMPLETADO 2026-10-13 |
| EMS-005A | Contacto privado por publicación, cifrado, consentimiento y gestión exclusiva del propietario | EMS-004 + ADR-018/019 | COMPLETADO 2026-10-13 |
| EMS-005A.1 | Provisión segura de clave en Docker y congelación de contacto durante reserva activa | EMS-005A + ADR-020 | COMPLETADO 2026-10-13 |
| EMS-005B | Órdenes de pago, pasarela, conciliación y desbloqueo autorizado mediante `ContactGrant` | EMS-005A + proveedor + revisión legal | PENDIENTE |
| EMS-006 | Entrega, reclamos y devoluciones | EMS-005 + política final | PENDIENTE |
| EMS-007 | Administración y moderación operativa | anteriores | PENDIENTE |
| EMS-008 | Exploración ampliada, pruebas integrales, hardening y piloto | anteriores | PENDIENTE |
