const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, server } = require('./index');
const db = require('./db');

jest.mock('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_para_desarrollo';
let token;

beforeAll(() => {
  token = jwt.sign({ id: 1, org_id: 1, name: 'Test', email: 'test@org.com' }, JWT_SECRET);
});

afterAll((done) => {
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /login - debe retornar un token si las credenciales son validas', async () => {
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, org_id: 1, name: 'Admin', email: 'admin@orga.com' }] 
    });

    const res = await request(app).post('/login').send({
      email: 'admin@orga.com',
      password: 'password_valida'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /login - debe retornar error 401 si las credenciales son invalidas', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/login').send({
      email: 'admin@orga.com',
      password: 'wrong_password'
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /conversations - debe fallar si no hay token (401)', async () => {
    const res = await request(app).get('/conversations');
    expect(res.statusCode).toBe(401);
  });

  it('GET /conversations - debe retornar lista de conversaciones con token valido', async () => {
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, org_id: 1, status: 'Abierta', rating: null }] 
    });

    const res = await request(app)
      .get('/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body[0]).toHaveProperty('id', 1);
  });

  it('POST /conversations - debe crear y retornar una conversacion', async () => {
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: 2, org_id: 1, status: 'Abierta' }] 
    });

    const res = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 2);
  });
});