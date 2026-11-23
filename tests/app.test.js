process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET='test-access';
process.env.JWT_REFRESH_SECRET='test-refresh';
const request=require('supertest');
const app=require('../src/app');

describe('Campus API',()=>{
  test('health endpoint returns success',async()=>{
    const res=await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
  test('protected endpoint rejects missing token',async()=>{
    const res=await request(app).get('/api/courses');
    expect(res.statusCode).toBe(401);
  });
  test('registration validates payload',async()=>{
    const res=await request(app).post('/api/auth/register').send({name:'',email:'bad',password:'1'});
    expect(res.statusCode).toBe(400);
  });
  test('unknown route returns 404 JSON',async()=>{
    const res=await request(app).get('/api/not-a-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
