import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Task Flow', () => {
    let accessToken: string;
    const testUser = {
      email: 'e2e-finale-test@example.com',
      password: 'StrongPassword123!',
      username: 'e2eUser',
    };

    it('/auth/register (POST) - Register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      if (response.status !== 201)
        console.log('DEBUG 400 ERROR:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
      expect(response.body.user.password).toBeUndefined();
    });

    it('/auth/login (POST) - Get access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      accessToken = response.body.accessToken;
    });

    it('/tasks (POST) - Create a task (Authenticated)', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Task' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('E2E Task');
      expect(response.body.version).toBe(1);
    });

    it('/tasks (POST) - Should fail without Token', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Unauthorized Task' })
        .expect(401);
    });
  });
});
