import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'prisma/prisma.service';

describe('Auth System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test-e2e@example.com' } });
    await app.close();
  });

  it('/auth/register (POST)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test-e2e@example.com',
        username: 'E2ETestUser',
        password: 'password123',
      })
      .expect(201)
      .then((response) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const body = response.body;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(body.id).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(body.email).toEqual('test-e2e@example.com');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(body.password).toBeUndefined();
      });
  });
});
