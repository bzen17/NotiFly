import { Db } from 'mongodb';
import Handlebars from 'handlebars';

export async function renderTemplate(db: Db, templateId: string, payload: any) {
  const templates = db.collection('templates');
  const t = await templates.findOne({ _id: templateId });
  if (!t || !t.body) return payload;
  try {
    const compiled = Handlebars.compile(t.body);
    const merged = compiled(payload || {});
    // try parse JSON result if it looks like JSON, otherwise return as text under `body`
    try {
      return JSON.parse(merged);
    } catch (e) {
      return { ...payload, body: merged };
    }
  } catch (err) {
    return payload;
  }
}
