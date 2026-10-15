/** Ignore the known public route; still reject absolute developer directories. */
export function developerPathFragment(text) {
  const inspected = text
    .replaceAll("/cheat-sheets/home/", "/cheat-sheets/home-route/")
    .replaceAll("/cheat-sheets/subjects/home/", "/cheat-sheets/subjects/home-route/");
  return ["/home/", "/Users/", "\\home\\", "\\Users\\", "E:\\\\claude-cursor", "E:/claude-cursor"].find(fragment => inspected.includes(fragment));
}
