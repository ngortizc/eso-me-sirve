export type DemoArticle = {
  slug: string;
  title: string;
  description: string;
  category: "Hogar" | "Infantil" | "Libros" | "Plantas";
  condition: string;
  commune: string;
  area: string;
  image: string;
  imageAlt: string;
  photos: readonly { src: string; alt: string }[];
  featured: boolean;
  publishedLabel: string;
};

export const demoArticles = [
  {
    slug: "sillon-verde",
    title: "Sillón verde de un cuerpo",
    description:
      "Sillón cómodo y firme, con señales leves de uso. Ideal para un rincón de lectura. Se entrega en un punto a coordinar dentro de la comuna.",
    category: "Hogar",
    condition: "Buen estado",
    commune: "Ñuñoa",
    area: "Sector Plaza Ñuñoa",
    image: "/demo/articles/sillon-verde.png",
    imageAlt: "Sillón verde en un ambiente interior luminoso",
    photos: [
      { src: "/demo/articles/sillon-verde.png", alt: "Sillón verde visto de frente en un living luminoso" },
      { src: "/demo/articles/sillon-verde-lateral.png", alt: "Sillón verde visto desde un costado" },
      { src: "/demo/articles/sillon-verde-detalle.png", alt: "Detalle del tapiz, asiento y pata de madera del sillón" },
      { src: "/demo/articles/sillon-verde-ambiente.png", alt: "Vista amplia del sillón verde en el living" }
    ],
    featured: true,
    publishedLabel: "Hoy"
  },
  {
    slug: "bicicleta-infantil",
    title: "Bicicleta infantil",
    description:
      "Bicicleta pequeña con ruedas de apoyo. Funciona bien y necesita una limpieza sencilla antes de volver a salir.",
    category: "Infantil",
    condition: "Usado, funcional",
    commune: "Providencia",
    area: "Sector Inés de Suárez",
    image: "/demo/articles/bicicleta-infantil.png",
    imageAlt: "Bicicleta infantil color coral en un patio",
    photos: [{ src: "/demo/articles/bicicleta-infantil.png", alt: "Bicicleta infantil color coral en un patio" }],
    featured: true,
    publishedLabel: "Ayer"
  },
  {
    slug: "libros-lampara",
    title: "Novelas y lámpara de mesa",
    description:
      "Lote de novelas en buen estado y una lámpara cálida. Se regalan en conjunto para facilitar la entrega.",
    category: "Libros",
    condition: "Buen estado",
    commune: "Santiago",
    area: "Sector Parque Almagro",
    image: "/demo/articles/libros-lampara.png",
    imageAlt: "Libros apilados junto a una lámpara color ámbar",
    photos: [{ src: "/demo/articles/libros-lampara.png", alt: "Libros apilados junto a una lámpara color ámbar" }],
    featured: false,
    publishedLabel: "Hace 2 días"
  },
  {
    slug: "monstera",
    title: "Monstera con macetero",
    description:
      "Planta adulta y sana con su canasto. Busca un hogar con luz indirecta y espacio para seguir creciendo.",
    category: "Plantas",
    condition: "Muy buen estado",
    commune: "La Florida",
    area: "Sector Walker Martínez",
    image: "/demo/articles/monstera.png",
    imageAlt: "Planta monstera en un canasto tejido",
    photos: [{ src: "/demo/articles/monstera.png", alt: "Planta monstera en un canasto tejido" }],
    featured: true,
    publishedLabel: "Hace 3 días"
  }
] as const satisfies readonly DemoArticle[];

export const demoCategories = ["Todas", "Hogar", "Infantil", "Libros", "Plantas"] as const;
export const demoCommunes = ["Todas", "Ñuñoa", "Providencia", "Santiago", "La Florida"] as const;

export function filterDemoArticles(
  articles: readonly DemoArticle[],
  filters: { query: string; category: string; commune: string }
) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("es-CL");

  return articles.filter((article) => {
    const searchable = `${article.title} ${article.description} ${article.category} ${article.commune}`.toLocaleLowerCase("es-CL");
    const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);
    const matchesCategory = filters.category === "Todas" || article.category === filters.category;
    const matchesCommune = filters.commune === "Todas" || article.commune === filters.commune;

    return matchesQuery && matchesCategory && matchesCommune;
  });
}
