# Listings

Módulo de publicaciones gratuitas y fotografías.

- `domain`: estados, transiciones y validaciones puras; no importa Next.js, PostgreSQL ni Sharp.
- `application`: casos de uso y puertos de repositorio/almacenamiento.
- `infrastructure`: PostgreSQL y adaptador local de imágenes recodificadas.

El propietario siempre se obtiene de la sesión en el adaptador HTTP. Los DTO públicos no contienen `ownerId`, claves de almacenamiento ni datos privados. `PhotoStorage` permite reemplazar el adaptador local por Object Storage sin cambiar el dominio ni el caso de uso.
