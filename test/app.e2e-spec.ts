import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'prisma/prisma.service';
import { Server } from 'http';

interface RegisterResponse {
  user: {
    email: string;
    password?: string;
  };
}

interface LoginResponse {
  accessToken: string;
}

interface TaskResponse {
  title: string;
  version: number;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();
    httpServer = app.getHttpServer() as Server;
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
      const response = await request(httpServer)
        .post('/auth/register')
        .send(testUser);

      if (response.status !== 201)
        console.log('DEBUG 400 ERROR:', response.body);

      const body = response.body as RegisterResponse;

      expect(response.status).toBe(201);
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body.user.password).toBeUndefined();
    });

    it('/auth/login (POST) - Get access token', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const body = response.body as LoginResponse;

      expect(response.status).toBe(201);
      expect(body.accessToken).toBeDefined();
      accessToken = body.accessToken;
    });

    it('/tasks (POST) - Create a task (Authenticated)', async () => {
      const response = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Task' });

      const body = response.body as TaskResponse;

      expect(response.status).toBe(201);
      expect(body.title).toBe('E2E Task');
      expect(body.version).toBe(1);
    });

    it('/tasks (POST) - Should fail without Token', () => {
      return request(httpServer)
        .post('/tasks')
        .send({ title: 'Unauthorized Task' })
        .expect(401);
    });
  });
});
