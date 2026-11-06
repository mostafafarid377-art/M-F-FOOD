/** Resolve bundled images under either / or a static hosting subdirectory.
 * External URLs and other paths are left untouched. */
export function imageUrl(path: string | null | undefined): string {
  const value = path || "/images/placeholder.jpg";
  return value.startsWith("/images/")
    ? `${import.meta.env.BASE_URL}${value.slice(1)}`
    : value;
}
