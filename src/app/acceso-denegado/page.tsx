import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="page-container py-20 text-center"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Acceso denegado</p><h1 className="mt-3 text-4xl font-black">No tienes permiso para ver esta sección</h1><p className="mx-auto mt-4 max-w-xl text-muted">La autorización se comprobó en el servidor. Si crees que es un error, vuelve a tu perfil.</p><Link className="button button-primary mt-7" href="/perfil">Ir a mi perfil</Link></main>;
}
