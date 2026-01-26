import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'prisma/prisma.service';
import { Server } from 'http';

describe('Auth System (e2e)', () => {
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
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - Register with valid data', () => {
    return request(httpServer)
      .post('/auth/register')
      .send({
        email: 'unique-auth-test@example.com',
        username: 'AuthTester',
        password: 'StrongPassword123!',
      })
      .expect(201);
  });
});
