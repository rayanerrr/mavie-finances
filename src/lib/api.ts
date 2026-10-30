export type IdContext = {params:Promise<{id:string}>};
export async function routeId(context:IdContext) {
  const id=Number((await context.params).id);
  if (!Number.isInteger(id) || id<=0) throw new Error("Identifiant invalide");
  return id;
}
export function apiError(error:unknown) {
  const message=error instanceof Error ? error.message : "Erreur inattendue";
  const safe=/SQLITE|constraint|syntax|JSON/i.test(message) ? "Données invalides ou référence inconnue" : message;
  return Response.json({error:safe},{status:message.includes("introuvable") ? 404 : 400});
}
export function pickFields(body:Record<string,unknown>, keys:string[]) {
  return Object.fromEntries(keys.filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));
}
