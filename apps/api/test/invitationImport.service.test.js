import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { importInvitationsFromExcel } from '../src/services/invitationImport.service.js';
import { Invitation } from '../src/models/Invitation.model.js';

async function buildWorkbookBuffer() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['REGIÓN', 'ID CRM', 'NOMBRE COMPLETO', 'SEDE', 'ASISTE', 'CORREO 1', 'CORREO 2']);
  const row = ws.addRow(['EFV', 3540, 'Salvador Velázquez Neri', 'Tijuana', 'PRESENCIAL', 'test@example.com', 'cc@example.com']);
  // Excel autoconvierte celdas de correo en hipervínculos: ExcelJS los devuelve
  // como { text, hyperlink } en vez de un string plano.
  row.getCell(6).value = { text: 'test@example.com', hyperlink: 'mailto:test@example.com' };
  row.getCell(7).value = { text: 'cc@example.com', hyperlink: 'mailto:cc@example.com' };
  return wb.xlsx.writeBuffer();
}

test('importa correctamente filas donde Excel convirtió el correo en hipervínculo', async () => {
  const buffer = await buildWorkbookBuffer();
  const original = Invitation.bulkWrite;
  Invitation.bulkWrite = async (ops) => ({ upsertedCount: ops.length, insertedCount: 0 });
  try {
    const result = await importInvitationsFromExcel({ buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', senderId: 'sender-1' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.inserted, 1);
    assert.equal(result.total, 1);
  } finally {
    Invitation.bulkWrite = original;
  }
});

test('una fila con error conserva los valores crudos en `row` para poder exportarla', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['REGIÓN', 'ID CRM', 'NOMBRE COMPLETO', 'SEDE', 'ASISTE', 'CORREO 1', 'CORREO 2']);
  ws.addRow(['EFV', '123', 'Sin correo válido', 'Tijuana', 'PRESENCIAL', 'mal', 'tambien-mal']);
  const buffer = await wb.xlsx.writeBuffer();

  const result = await importInvitationsFromExcel({ buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', senderId: 'sender-1' });
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].fila, 2);
  assert.deepEqual(result.errors[0].row, {
    region: 'EFV',
    crmId: '123',
    nombre: 'Sin correo válido',
    sede: 'Tijuana',
    asiste: 'PRESENCIAL',
    email: 'mal',
    emailCc: 'tambien-mal',
  });
});

test('una fila con CORREO 1 inválido pero CORREO 2 válido se importa usando CORREO 2', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['REGIÓN', 'ID CRM', 'NOMBRE COMPLETO', 'SEDE', 'ASISTE', 'CORREO 1', 'CORREO 2']);
  ws.addRow(['EFV', '4242', 'Solo correo 2', 'Tijuana', 'PRESENCIAL', 'no-es-correo', 'valido@example.com']);
  const buffer = await wb.xlsx.writeBuffer();

  const original = Invitation.bulkWrite;
  let inserted;
  Invitation.bulkWrite = async (ops) => {
    inserted = ops;
    return { upsertedCount: ops.length, insertedCount: 0 };
  };
  try {
    const result = await importInvitationsFromExcel({ buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', senderId: 'sender-1' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.inserted, 1);
    assert.equal(inserted[0].updateOne.update.$setOnInsert.guest.email, 'valido@example.com');
    assert.equal(inserted[0].updateOne.update.$setOnInsert.ccEmail, null);
  } finally {
    Invitation.bulkWrite = original;
  }
});

test('un crmId numérico duplicado dentro del archivo se rechaza', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['REGIÓN', 'ID CRM', 'NOMBRE COMPLETO', 'SEDE', 'ASISTE', 'CORREO 1', 'CORREO 2']);
  ws.addRow(['EFV', '3540', 'Uno', 'Tijuana', 'PRESENCIAL', 'uno@example.com', '']);
  ws.addRow(['EFV', '3540', 'Dos', 'Tijuana', 'PRESENCIAL', 'dos@example.com', '']);
  const buffer = await wb.xlsx.writeBuffer();

  const original = Invitation.bulkWrite;
  Invitation.bulkWrite = async (ops) => ({ upsertedCount: ops.length, insertedCount: 0 });
  try {
    const result = await importInvitationsFromExcel({ buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', senderId: 'sender-1' });
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].errores[0], /duplicado/);
    assert.equal(result.inserted, 1);
  } finally {
    Invitation.bulkWrite = original;
  }
});

test('un crmId de texto duplicado dentro del archivo se importa (no se rechaza)', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['REGIÓN', 'ID CRM', 'NOMBRE COMPLETO', 'SEDE', 'ASISTE', 'CORREO 1', 'CORREO 2']);
  ws.addRow(['EFV', 'inv-A', 'Uno', 'Tijuana', 'PRESENCIAL', 'uno@example.com', '']);
  ws.addRow(['EFV', 'inv-A', 'Dos', 'Tijuana', 'PRESENCIAL', 'dos@example.com', '']);
  const buffer = await wb.xlsx.writeBuffer();

  const original = Invitation.bulkWrite;
  let inserted;
  Invitation.bulkWrite = async (ops) => {
    inserted = ops;
    return { upsertedCount: 0, insertedCount: ops.length };
  };
  try {
    const result = await importInvitationsFromExcel({ buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', senderId: 'sender-1' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.inserted, 2);
    assert.equal(inserted.length, 2);
    assert.ok(inserted.every((op) => op.insertOne));
  } finally {
    Invitation.bulkWrite = original;
  }
});
