// Recrea el índice `crmId_1_sender_1` de Invitation para aplicar la nueva
// unicidad parcial (solo crmIds numéricos). Mongo no actualiza índices ya
// existentes, así que hay que soltar el viejo y dejarlo recrear con su nueva
// definición.
// Uso:  docker compose exec api node src/scripts/reindexInvitations.js
import mongoose from 'mongoose';
import env from '../config/env.js';
import { Invitation } from '../models/Invitation.model.js';

const INDEX_NAME = 'crmId_1_sender_1';

await mongoose.connect(env.mongoUri);

const coll = Invitation.collection;

const indexes = await coll.indexes();
if (indexes.some((i) => i.name === INDEX_NAME)) {
  await coll.dropIndex(INDEX_NAME);
  // eslint-disable-next-line no-console
  console.log(`[reindex] Índice '${INDEX_NAME}' eliminado.`);
} else {
  // eslint-disable-next-line no-console
  console.log(`[reindex] Índice '${INDEX_NAME}' no existe; no hay nada que hacer.`);
}

// `syncIndexes()` aplica la definición declarada en el modelo (crea el faltante).
await Invitation.syncIndexes();
// eslint-disable-next-line no-console
console.log('[reindex] Índices sincronizados. Índice parcial recreado.');

await mongoose.disconnect();