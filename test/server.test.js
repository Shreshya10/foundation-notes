'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../server');

function makePool() {
  const notes = [];
  let nextId = 1;
  return {
    async query(sql, values = []) {
      if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
      if (sql.startsWith('SELECT id, content')) return { rows: [...notes].reverse() };
      if (sql.startsWith('INSERT INTO notes')) {
        const note = { id: nextId++, content: values[0], created_at: new Date().toISOString() };
        notes.push(note);
        return { rows: [note] };
      }
      if (sql.startsWith('DELETE FROM notes')) {
        const index = notes.findIndex((note) => note.id === Number(values[0]));
        if (index < 0) return { rowCount: 0, rows: [] };
        notes.splice(index, 1);
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('health endpoint checks the database', async () => {
  const response = await request(createApp(makePool())).get('/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('notes can be written and read', async () => {
  const app = createApp(makePool());
  const created = await request(app).post('/api/notes').send({ content: 'Ship the stack' });
  assert.equal(created.status, 201);
  const listed = await request(app).get('/api/notes');
  assert.equal(listed.status, 200);
  assert.equal(listed.body[0].content, 'Ship the stack');
});

test('empty notes are rejected', async () => {
  const response = await request(createApp(makePool()))
    .post('/api/notes')
    .send({ content: '   ' });
  assert.equal(response.status, 400);
});
